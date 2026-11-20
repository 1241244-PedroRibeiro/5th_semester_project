:- use_module(library(date)).
:- use_module(library(lists)).

% ---------------------------------------------------------
% AI02 — Requirements Planning & Supplier Selection
% ---------------------------------------------------------

:- dynamic recipe_line/3.
:- dynamic component_config/3.
:- dynamic component_stock/2.
:- dynamic stock_units_per_sale/2.
:- dynamic forecast_entry/4.
:- dynamic offer/6.
:- dynamic delivery/3.
:- dynamic limit_used/4.
:- dynamic unmet_on_time/5. % DueDate, SKU, Reason, OriginalQuantity, RemainingQuantity
:- dynamic late_fulfilled/5. % DueDate, FulfilledDate, SKU, Quantity, LateByDays

reset_planning_kb :-
    retractall(recipe_line(_,_,_)),
    retractall(component_config(_,_,_)),
    retractall(component_stock(_,_)),
    retractall(stock_units_per_sale(_,_)),
    retractall(forecast_entry(_,_,_,_)),
    retractall(offer(_,_,_,_,_,_)),
    retractall(delivery(_,_,_)),
    retractall(limit_used(_,_,_,_)),
    retractall(unmet_on_time(_,_,_,_,_)),
    retractall(late_fulfilled(_,_,_,_,_)).

% Entry point
run_planning(RefDateStr, ForecastDict, ScenarioDict, Result) :-
    reset_planning_kb,
    load_data(ForecastDict, ScenarioDict, ForecastDict.pendingDeliveries),
    parse_date(RefDateStr, RefDate),
    forecast_days(ForecastDict, Days),
    sort(Days, SortedDays),
    process_days(SortedDays, RefDate, Reqs, Props, Unmets),
    flatten(Props, FlatProps),
    flatten(Unmets, FlatUnmets),
    format_output(Reqs, FlatProps, FlatUnmets, Result).

% ---------------------------------------------------------
% Data Loading
% ---------------------------------------------------------
load_data(Forecast, Scenario, PendingDeliveries) :-
    % Products
    forall(member(P, Forecast.products),
        ( Sku = P.sku,
          ( get_dict(stockUnitsPerSale, P, S) -> assertz(stock_units_per_sale(Sku, S)) ; true ),
          ( get_dict(currentStock, P, Stock) -> assertz(component_stock(Sku, Stock)) ; assertz(component_stock(Sku, 0)) )
        )),
    % BOMs
    forall(member(B, Forecast.boms),
        ( PizzaSku = B.pizzaSku,
          forall(member(Line, B.lines),
              ( assertz(recipe_line(PizzaSku, Line.componentSku, Line.defaultQuantity)) ))
        )),
    % CSC
    forall(member(C, Forecast.componentSizeConfigurations),
        ( assertz(component_config(C.componentSku, C.pizzaSize, C.stockUnitsConsumed)) )),
    % Forecast Entries
    forall(member(E, Forecast.entries),
        ( parse_date(E.date, D),
          assertz(forecast_entry(D, E.productSku, E.pizzaSize, E.quantity)) )),
    % Scenario Offers
    forall(member(O, Scenario.offers),
        ( assertz(offer(O.supplierCode, O.productSku, O.priceEur, O.stockUnitQuantity, O.leadTimeDays, O.dailySupplyLimit)) )),
    forall(member(D, PendingDeliveries),
        ( parse_date(D.expectedDeliveryDate, DeliveryDate),
          assertz(delivery(DeliveryDate, D.productSku, D.quantity)) )).

forecast_days(Forecast, Days) :-
    parse_date(Forecast.startDate, Start),
    parse_date(Forecast.endDate, End),
    date_range(Start, End, Days).

date_range(Start, End, [Start|Rest]) :-
    Start @< End,
    next_date(Start, Next),
    date_range(Next, End, Rest).
date_range(Date, Date, [Date]).

% ---------------------------------------------------------
% Simulation Loop
% ---------------------------------------------------------
process_days([], _, [], [], []).
process_days([Day|Rest], RefDate, Reqs, Props, Unmets) :-
    findall(entry(Sku, Qty), compute_daily_requirement(Day, Sku, Qty), AllReqs),
    % Visit overdue SKUs even on days with no forecast demand so arrivals can
    % be assigned promptly after reserving future on-time requirements.
    findall(entry(Sku, 0),
        (unmet_on_time(Due, Sku, _, _, Remaining), Due @< Day, Remaining > 0), LateEntries),
    append(AllReqs, LateEntries, AllEntries),
    sum_by_sku(AllEntries, DailyReqs),
    process_skus(DailyReqs, Day, RefDate, DayReqs, DayProps, DayUnmets),
    process_days(Rest, RefDate, RestReqs, RestProps, RestUnmets),
    append(DayReqs, RestReqs, Reqs),
    append(DayProps, RestProps, Props),
    append(DayUnmets, RestUnmets, Unmets).

compute_daily_requirement(Day, Sku, Qty) :-
    forecast_entry(Day, PizzaSku, Size, FQty),
    ( is_pizza(PizzaSku) ->
        setp(pizza(PizzaSku, Size), Components),
        member(comp(Sku, PerPizza), Components),
        Qty is PerPizza * FQty
    ;
        stock_units_per_sale(PizzaSku, UnitsPerSale),
        Sku = PizzaSku,
        Qty is UnitsPerSale * FQty
    ).

is_pizza(Sku) :- recipe_line(Sku, _, _), !.

setp(pizza(Sku, Size), Components) :-
    findall(comp(CompSku, Qty),
            ( recipe_line(Sku, CompSku, DefQty),
              component_config(CompSku, Size, UnitsPerDef),
              Qty is DefQty * UnitsPerDef,
              Qty > 0
            ),
            Components).

sum_by_sku(Reqs, Summed) :-
    findall(Sku, member(entry(Sku, _), Reqs), Skus),
    sort(Skus, UniqueSkus),
    maplist(sum_one(Reqs), UniqueSkus, Summed).

sum_one(Reqs, Sku, comp(Sku, Total)) :-
    findall(Q, member(entry(Sku, Q), Reqs), Qs),
    sumlist(Qs, Total).

process_skus([], _, _, [], [], []).
process_skus([comp(Sku, ReqQty)|Rest], Day, RefDate, Reqs, Props, Unmets) :-
    component_stock(Sku, InitialStock),
    take_available_deliveries(Day, Sku, DelQty),
    Available is InitialStock + DelQty,
    
    ( ReqQty > Available ->
        Deficit is ReqQty - Available,
        HypoRem = 0,
        Replenishment = Deficit,
        ( propose_supplier(Sku, Deficit, Day, RefDate, PropSKU, UnmetSKU) ->
            DayPropsSKU = [PropSKU],
            ( UnmetSKU = none -> DayUnmetsSKU = [] ; record_unmet(Day, UnmetSKU), DayUnmetsSKU = [UnmetSKU] )
        ;
            DayPropsSKU = [],
            format(atom(Reason), "No supplier can fulfill ~w", [Deficit]),
            UnmetSKU = unmet(Sku, Reason, Deficit),
            record_unmet(Day, UnmetSKU),
            DayUnmetsSKU = [UnmetSKU]
        )
    ;
        HypoRem is Available - ReqQty,
        Replenishment = 0,
        DayPropsSKU = [],
        DayUnmetsSKU = []
    ),
    
    retractall(component_stock(Sku, _)),
    assertz(component_stock(Sku, HypoRem)),

    % Current demand is satisfied first. Keep enough for future on-time demand,
    % then use only the remaining surplus against overdue needs.
    allocate_late_surplus(Day, Sku),
    
    ReqEntry = req(Day, Sku, ReqQty, Available, HypoRem, Replenishment),
    
    process_skus(Rest, Day, RefDate, RestReqs, RestProps, RestUnmets),
    Reqs = [ReqEntry|RestReqs],
    Props = [DayPropsSKU|RestProps],
    Unmets = [DayUnmetsSKU|RestUnmets].

record_unmet(Day, unmet(Sku, Reason, Quantity)) :-
    assertz(unmet_on_time(Day, Sku, Reason, Quantity, Quantity)).

allocate_late_surplus(Day, Sku) :-
    component_stock(Sku, Stock),
    future_on_time_reserve(Day, Sku, Reserve),
    Surplus is max(0, Stock - Reserve),
    ( Surplus > 0 ->
        allocate_overdue(Day, Sku, Surplus, Allocated),
        Remaining is Stock - Allocated,
        retractall(component_stock(Sku, _)), assertz(component_stock(Sku, Remaining))
    ; true
    ).

% Reserve the maximum cumulative deficit of future forecast needs after
% accounting for receipts expected before each due date.
future_on_time_reserve(Day, Sku, Reserve) :-
    findall(Date, (forecast_entry(Date, _, _, _), Date @> Day), Dates0),
    sort(Dates0, Dates),
    reserve_over_dates(Dates, Day, Sku, 0, 0, 0, Reserve).

reserve_over_dates([], _, _, _, _, Max, Max).
reserve_over_dates([Date|Rest], Current, Sku, CumNeed0, CumReceipt0, Max0, Reserve) :-
    findall(Qty, (compute_daily_requirement(Date, Sku, Qty)), Needs), sumlist(Needs, Need),
    findall(Qty, (delivery(DeliveryDate, Sku, Qty), DeliveryDate @< Date, DeliveryDate @> Current), Receipts), sumlist(Receipts, Receipt),
    CumNeed is CumNeed0 + Need, CumReceipt is Receipt,
    Deficit is max(0, CumNeed - CumReceipt), Max is max(Max0, Deficit),
    reserve_over_dates(Rest, Current, Sku, CumNeed, CumReceipt, Max, Reserve).

% Newest overdue needs are paid first, minimizing total late days.
allocate_overdue(Day, Sku, Available, Allocated) :-
    findall(Due, (unmet_on_time(Due, Sku, _, _, Remaining), Remaining > 0, Due @< Day), Dates0),
    sort(Dates0, Dates), reverse(Dates, NewestFirst),
    allocate_overdue_dates(NewestFirst, Day, Sku, Available, 0, Allocated).

allocate_overdue_dates([], _, _, _, Total, Total).
allocate_overdue_dates([Due|Rest], Day, Sku, Available, Total0, Total) :-
    unmet_on_time(Due, Sku, Reason, Original, Remaining),
    Qty is min(Available, Remaining),
    ( Qty > 0 ->
        NewRemaining is Remaining - Qty,
        retract(unmet_on_time(Due, Sku, Reason, Original, Remaining)),
        assertz(unmet_on_time(Due, Sku, Reason, Original, NewRemaining)),
        days_between(Due, Day, LateBy),
        assertz(late_fulfilled(Due, Day, Sku, Qty, LateBy))
    ; true ),
    Available1 is Available - Qty, Total1 is Total0 + Qty,
    allocate_overdue_dates(Rest, Day, Sku, Available1, Total1, Total).

take_available_deliveries(Day, Sku, Quantity) :-
    findall(delivery(DeliveryDay, Sku, DeliveryQty),
            ( delivery(DeliveryDay, Sku, DeliveryQty), DeliveryDay @< Day ),
            Deliveries),
    sum_delivery_quantities(Deliveries, Quantity),
    remove_deliveries(Deliveries).

sum_delivery_quantities([], 0).
sum_delivery_quantities([delivery(_, _, Quantity)|Rest], Total) :-
    sum_delivery_quantities(Rest, Remaining),
    Total is Quantity + Remaining.

remove_deliveries([]).
remove_deliveries([delivery(Day, Sku, Quantity)|Rest]) :-
    retract(delivery(Day, Sku, Quantity)),
    remove_deliveries(Rest).

% ---------------------------------------------------------
% Supplier Selection
% ---------------------------------------------------------
propose_supplier(Sku, Deficit, DueDate, RefDate, Proposal, Unmet) :-
    previous_date(DueDate, LatestDelivery),
    findall(Offer, (
        offer(Offer, Sku, _Price, Lot, Lead, Limit),
        calc_order_date(LatestDelivery, Lead, RefDate, OrderDate, _),
        ( Limit == null -> true ; 
          ( limit_used(Offer, Sku, OrderDate, Used) -> true ; Used = 0 ),
          Qty is ceiling(Deficit / Lot) * Lot,
          Used + Qty =< Limit
        )
    ), ValidOffers),
    ( ValidOffers = [] -> fail ;
        findall(o(IsOnTime, TotalPrice, Lead, Offer, OrderDate, ExpectedDelivery),
            ( member(Offer, ValidOffers),
              offer(Offer, _, Price, Lot, Lead, _),
              calc_order_date(LatestDelivery, Lead, RefDate, OrderDate, ExpectedDelivery),
              ( ExpectedDelivery @=< LatestDelivery -> IsOnTime = 1 ; IsOnTime = 0 ),
              Qty is ceiling(Deficit / Lot) * Lot,
              TotalPrice is (Qty / Lot) * Price
            ), ScoredOffers),
        
        predsort(sort_offer, ScoredOffers, [o(IsOnTime, _, _, BestOffer, BestOrderDate, BestDelivery)|_]),
        
        offer(BestOffer, _, Price, Lot, _, _),
        Qty is ceiling(Deficit / Lot) * Lot,
        PriceEur is (Qty / Lot) * Price,
        ( IsOnTime =:= 1 -> MeetsOnTime = true ; MeetsOnTime = false ),
        ( MeetsOnTime -> LateDays = 0 ; days_between(LatestDelivery, BestDelivery, LateDays) ),
        
        assertz(delivery(BestDelivery, Sku, Qty)),
        ( limit_used(BestOffer, Sku, BestOrderDate, Used) -> 
          NewUsed is Used + Qty, 
          retract(limit_used(BestOffer, Sku, BestOrderDate, Used)), 
          assertz(limit_used(BestOffer, Sku, BestOrderDate, NewUsed))
        ; assertz(limit_used(BestOffer, Sku, BestOrderDate, Qty))
        ),
        
        Proposal = proposal(BestOffer, Sku, Qty, BestOrderDate, BestDelivery, PriceEur, MeetsOnTime, LateDays),
        
        ( MeetsOnTime -> Unmet = none ;
          Unmet = unmet(Sku, "late", Deficit)
        )
    ).

calc_order_date(DueDate, LeadTime, RefDate, OrderDate, ExpectedDelivery) :-
    DaysBefore is -LeadTime,
    shift_date(DueDate, DaysBefore, CalcOrderDate),
    ( CalcOrderDate @>= RefDate -> OrderDate = CalcOrderDate ; OrderDate = RefDate ),
    shift_date(OrderDate, LeadTime, ExpectedDelivery).

shift_date(Date, 0, Date).
shift_date(Date, Days, Result) :-
    Days > 0,
    next_date(Date, Next),
    Remaining is Days - 1,
    shift_date(Next, Remaining, Result).
shift_date(Date, Days, Result) :-
    Days < 0,
    previous_date(Date, Previous),
    Remaining is Days + 1,
    shift_date(Previous, Remaining, Result).

next_date(date(Year, Month, Day), date(NextYear, NextMonth, NextDay)) :-
    days_in_month(Year, Month, MonthDays),
    ( Day < MonthDays ->
        NextYear = Year, NextMonth = Month, NextDay is Day + 1
    ; Month < 12 ->
        NextYear = Year, NextMonth is Month + 1, NextDay = 1
    ;   NextYear is Year + 1, NextMonth = 1, NextDay = 1
    ).

previous_date(date(Year, Month, Day), date(PreviousYear, PreviousMonth, PreviousDay)) :-
    ( Day > 1 ->
        PreviousYear = Year, PreviousMonth = Month, PreviousDay is Day - 1
    ; Month > 1 ->
        PreviousYear = Year, PreviousMonth is Month - 1,
        days_in_month(Year, PreviousMonth, PreviousDay)
    ;   PreviousYear is Year - 1, PreviousMonth = 12, PreviousDay = 31
    ).

days_in_month(Year, Month, Days) :-
    ( memberchk(Month, [4, 6, 9, 11]) ->
        Days = 30
    ; Month =:= 2 ->
        ( leap_year(Year) -> Days = 29 ; Days = 28 )
    ;   Days = 31
    ).

leap_year(Year) :-
    0 is Year mod 400
    ;
    0 is Year mod 4,
    Year mod 100 =\= 0.

days_between(Date, Date, 0).
days_between(Start, End, Days) :-
    Start @< End,
    next_date(Start, Next),
    days_between(Next, End, Remaining),
    Days is Remaining + 1.

sort_offer(Delta, o(On1, P1, L1, S1, _, _), o(On2, P2, L2, S2, _, _)) :-
    ( On1 > On2 -> Delta = (<)
    ; On1 < On2 -> Delta = (>)
    ; P1 < P2 -> Delta = (<)
    ; P1 > P2 -> Delta = (>)
    ; L1 < L2 -> Delta = (<)
    ; L1 > L2 -> Delta = (>)
    ; S1 @< S2 -> Delta = (<)
    ; S1 @> S2 -> Delta = (>)
    ; Delta = (=)
    ).

% ---------------------------------------------------------
% Date Helpers
% ---------------------------------------------------------
parse_date(Str, Date) :- atom_string(Atom, Str), parse_date_atom(Atom, Date).
parse_date_atom(Atom, date(Y,M,D)) :-
    atomic_list_concat([Ys,Ms,Ds], '-', Atom),
    atom_number(Ys, Y), atom_number(Ms, M), atom_number(Ds, D).

format_date(date(Y,M,D), Str) :- format(atom(Str), '~|~`0t~d-~`0t~d-~`0t~d', [Y,M,D]).

% ---------------------------------------------------------
% Output Formatting
% ---------------------------------------------------------
format_output(Reqs, Props, Unmets, json{
    requirements: ReqJSONs,
    proposals: PropJSONs,
    unmetNeeds: UnmetJSONs,
    unmetOnTime: UnmetOnTimeJSONs,
    lateFulfilled: LateFulfilledJSONs
}) :-
    findall(ReqJSON, (member(req(Day, Sku, Req, Avail, Hypo, Repl), Reqs), 
        format_date(Day, DayStr), 
        ReqJSON = json{
            date: DayStr,
            productSku: Sku,
            requiredUnits: Req,
            availableUnits: Avail,
            hypotheticalRemainingUnits: Hypo,
            replenishmentUnits: Repl
        }), ReqJSONs),
    findall(PropJSON, (member(proposal(Supplier, Sku, Qty, ODate, DDate, Price, Meets, Late), Props), 
        format_date(ODate, ODateStr),
        format_date(DDate, DDateStr),
        PropJSON = json{
            supplierCode: Supplier,
            productSku: Sku,
            quantity: Qty,
            orderDate: ODateStr,
            expectedDelivery: DDateStr,
            priceEur: Price,
            meetsRequiredDate: Meets,
            lateByDays: Late
        }), PropJSONs),
    findall(UnmetJSON, (unmet_on_time(Due, Sku, Reason, Original, Remaining),
        format_date(Due, DueStr), FulfilledQty is Original - Remaining,
        findall(json{fulfilledDate: FulfilledStr, quantity: Qty, lateByDays: LateBy},
            (late_fulfilled(Due, FulfilledDate, Sku, Qty, LateBy), format_date(FulfilledDate, FulfilledStr)), LateRows),
        findall(LateBy, late_fulfilled(Due, _, Sku, _, LateBy), LateDays),
        ( LateDays = [] -> MaxLateBy = 0 ; max_list(LateDays, MaxLateBy) ),
        UnmetJSON = json{date: DueStr, productSku: Sku, reason: Reason,
            quantity: Original, shortfallUnits: Original, lateByDays: MaxLateBy,
            lateFulfilledQuantity: FulfilledQty,
            stillUnmetQuantity: Remaining, lateFulfillments: LateRows}), UnmetJSONs),
    findall(json{dueDate: DueStr, fulfilledDate: FulfilledStr, productSku: Sku,
        quantity: Qty, lateByDays: LateBy},
        (late_fulfilled(Due, Fulfilled, Sku, Qty, LateBy), format_date(Due, DueStr), format_date(Fulfilled, FulfilledStr)),
        LateFulfilledJSONs),
    % Both arrays use the same enriched per-due-date entries for compatibility.
    UnmetOnTimeJSONs = UnmetJSONs.
