:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/http_json)).
:- use_module(library(http/http_client)).

:- consult('bom.pl').
:- consult('planning.pl').

:- http_handler('/api/v1/plan', handle_plan, [method(post)]).
:- http_handler('/health', handle_health, [method(get)]).

handle_health(_Request) :-
    reply_json_dict(json{status: "ok", service: "prolog"}).

:- initialization(main, main).

main :-
    http_server(http_dispatch, [port(8080)]),
    format(user_error, "Prolog BOM/Planning server listening on http://0.0.0.0:8080~n", []),
    thread_get_message(_).

handle_plan(Request) :-
    catch(do_handle_plan(Request), Error, reply_error(Error)).

do_handle_plan(Request) :-
    http_read_data(Request, Body, [to(string)]),
    atom_json_dict(Body, Dict, [value_string_as(atom)]),
    
    ( Dict.executionType == 'BOM' ->
        reset_bom_kb,
        load_bom_products(Dict.products, _),
        load_bom_definitions(Dict.boms),
        load_bom_configs(Dict.componentSizeConfigurations),
        load_bom_orders(Dict.orders, OrderList),
        bom_execution(OrderList, result(Requirements, UnmetNeeds)),
        format_requirements(Requirements, ReqJSON),
        format_unmet(UnmetNeeds, UnmetJSON),
        reply_json_dict(json{requirements: ReqJSON, unmetNeeds: UnmetJSON})
    ; Dict.executionType == 'REQUIREMENTS_PLANNING' ->
        planning_forecast(Dict, Forecast),
        run_planning(Dict.referenceDate, Forecast, Dict.scenario, Result),
        reply_json_dict(Result)
    ;
        reply_json_dict(json{error: "Unknown executionType"}, [status(400)])
    ).

planning_forecast(Dict, json{
    name: Dict.forecast.name,
    entries: Dict.forecast.entries,
    startDate: Dict.forecast.startDate,
    endDate: Dict.forecast.endDate,
    pendingDeliveries: PendingDeliveries,
    products: Dict.products,
    boms: Dict.boms,
    componentSizeConfigurations: Dict.componentSizeConfigurations
}) :-
    ( get_dict(pendingDeliveries, Dict, PendingDeliveries) -> true ; PendingDeliveries = [] ).

reset_bom_kb :-
    retractall(bom_recipe_line(_, _, _)),
    retractall(bom_component_config(_, _, _)),
    retractall(bom_component_stock(_, _)),
    retractall(bom_stock_units_per_sale(_, _)).

load_bom_products(Products, DirectProducts) :-
    findall(product(Sku, UnitsPerSale),
            ( member(P, Products),
              Sku = P.sku,
              ( get_dict(currentStock, P, Stock) -> true ; Stock = 0 ),
              assertz(bom_component_stock(Sku, Stock)),
              get_dict(stockUnitsPerSale, P, UnitsPerSale),
              UnitsPerSale \== null,
              assertz(bom_stock_units_per_sale(Sku, UnitsPerSale))
            ),
            DirectProducts).

load_bom_definitions(Boms) :-
    forall(member(B, Boms),
        ( PizzaSku = B.pizzaSku,
          forall(member(Line, B.lines),
              ( CompSku = Line.componentSku,
                DefQty = Line.defaultQuantity,
                assertz(bom_recipe_line(PizzaSku, CompSku, DefQty))
              ))
        )).

load_bom_configs(Configs) :-
    forall(member(C, Configs),
        ( CompSku = C.componentSku,
          Size = C.pizzaSize,
          Units = C.stockUnitsConsumed,
          assertz(bom_component_config(CompSku, Size, Units))
        )).

load_bom_orders(Orders, OrderList) :-
    findall(order(Sku, Size, Qty),
            ( member(O, Orders),
              Sku = O.productSku,
              ( get_dict(pizzaSize, O, Size) -> true ; Size = none ),
              Qty = O.quantity
            ),
            OrderList).

format_requirements(Reqs, JSON) :-
    maplist(format_req, Reqs, JSON).

format_req(req(Sku, Req, Avail, HypRem, Repl), json{
    productSku: Sku,
    requiredUnits: Req,
    availableUnits: Avail,
    hypotheticalRemainingUnits: HypRem,
    replenishmentUnits: Repl
}).

format_unmet(Unmet, JSON) :-
    maplist(format_unmet_one, Unmet, JSON).

format_unmet_one(unmet(Sku, Reason, Detail), json{
    productSku: Sku,
    reason: Reason,
    detail: Detail
}).

reply_error(Error) :-
    ( catch(message_to_string(Error, Msg), _, Msg = 'Erro desconhecido') -> true ; Msg = 'Erro ao formatar mensagem' ),
    format(user_error, "PROLOG ERROR FATAL: ~w~n", [Msg]),
    catch(reply_json_dict(json{error: Msg}, [status(500)]), _, true).