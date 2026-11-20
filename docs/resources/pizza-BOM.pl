% AI01 practical demonstration: pizza Bill of Materials and stock.
% Based on the IARTI Sprint B teaching material (parts, setp, stock,
% manage_stock/4). This is an isolated teaching model. The LaPrizza HTTP
% service in prolog/bom.pl intentionally retains its one-level pizza BOM.

:- use_module(library(error)).
:- dynamic stock/2.

% Twenty elementary ingredients (stock is counted in abstract units).
part(flour).
part(water).
part(yeast).
part(olive_oil).
part(salt).
part(sugar).
part(tomato_sauce).
part(mozzarella).
part(parmesan).
part(gorgonzola).
part(pecorino).
part(ham).
part(pepperoni).
part(chicken).
part(shrimp).
part(mushroom).
part(pineapple).
part(onion).
part(bell_pepper).
part(basil).

% Each size scales the base recipe in abstract units. Repeated terms in a
% setp/2 list are intentional: they encode the quantity of each ingredient.
size_factor(small, 1).
size_factor(medium, 2).
size_factor(large, 3).

% Two dough aggregates; their composition is scaled by pizza size.
dough_composition(pan,  [flour, flour, water, yeast, olive_oil, salt, sugar]).
dough_composition(crust, [flour, water, yeast, olive_oil, salt]).

setp(dough(Style, Size), Ingredients) :-
    dough_composition(Style, BaseIngredients),
    size_factor(Size, Factor),
    repeat_items(Factor, BaseIngredients, Ingredients).

% Eight pizza types. Each has a base style and elementary toppings.
pizza_recipe(margherita,       pan,  [tomato_sauce, mozzarella, basil]).
pizza_recipe(quattro_formaggi,  crust, [tomato_sauce, mozzarella, parmesan, gorgonzola, pecorino]).
pizza_recipe(tropical,          pan,  [tomato_sauce, mozzarella, ham, pineapple]).
pizza_recipe(vegetarian,        crust, [tomato_sauce, mozzarella, mushroom, onion, bell_pepper]).
pizza_recipe(pepperoni,         pan,  [tomato_sauce, mozzarella, pepperoni]).
pizza_recipe(ham_mushroom,      crust, [tomato_sauce, mozzarella, ham, mushroom]).
pizza_recipe(chicken_bbq,       pan,  [tomato_sauce, mozzarella, chicken, onion]).
pizza_recipe(shrimp_delight,    crust, [tomato_sauce, mozzarella, shrimp, bell_pepper]).

% A pizza is itself an assembly: first its size-specific dough aggregate,
% then its size-scaled toppings. manage_stock/4 traverses this tree.
setp(pizza(Pizza, Size), [dough(Style, Size)|ScaledToppings]) :-
    pizza_recipe(Pizza, Style, Toppings),
    size_factor(Size, Factor),
    repeat_items(Factor, Toppings, ScaledToppings).

repeat_items(_, [], []).
repeat_items(Factor, [Item|Items], Repeated) :-
    repeat_item(Factor, Item, Copies),
    repeat_items(Factor, Items, Rest),
    append(Copies, Rest, Repeated).

repeat_item(0, _, []) :- !.
repeat_item(N, Item, [Item|Rest]) :-
    N > 0,
    Next is N - 1,
    repeat_item(Next, Item, Rest).

% Fixed starting stock for reproducible demonstrations. As required by the
% LaPrizza clarifications, predefined pizzas have no stock of their own;
% stock is held by components and ready dough aggregates. Calls to
% manage_stock/4 update stock/2 just like the teaching example; use
% reset_demo_stock/0 between independent scenarios.
initial_stock(flour, 24).
initial_stock(water, 24).
initial_stock(yeast, 12).
initial_stock(olive_oil, 12).
initial_stock(salt, 12).
initial_stock(sugar, 12).
initial_stock(tomato_sauce, 8).
initial_stock(mozzarella, 10).
initial_stock(parmesan, 4).
initial_stock(gorgonzola, 4).
initial_stock(pecorino, 4).
initial_stock(ham, 6).
initial_stock(pepperoni, 6).
initial_stock(chicken, 6).
initial_stock(shrimp, 4).
initial_stock(mushroom, 6).
initial_stock(pineapple, 4).
initial_stock(onion, 6).
initial_stock(bell_pepper, 6).
initial_stock(basil, 4).
initial_stock(dough(pan, small), 3).
initial_stock(dough(pan, medium), 2).
initial_stock(dough(pan, large), 1).
initial_stock(dough(crust, small), 3).
initial_stock(dough(crust, medium), 2).
initial_stock(dough(crust, large), 1).

:- initialization(reset_demo_stock).

reset_demo_stock :-
    retractall(stock(_, _)),
    forall(initial_stock(Item, Quantity), assertz(stock(Item, Quantity))).

% manage_stock(+Quantity, +Product, -ListWithdrawStock, -ListOrderStock)
% Product is pizza(PizzaType, Size). Existing stock is consumed at the
% highest assembly level first. A shortage in an assembly is expanded into
% its children; only shortages of elementary parts are placed in LOS.
% The calculation is planned against a private stock snapshot, so invalid
% or cyclic BOMs cannot partially mutate the dynamic stock facts.
manage_stock(Quantity, Product, ListWithdrawStock, ListOrderStock) :-
    must_be(integer, Quantity),
    ( Quantity > 0 -> true ; domain_error(positive_quantity, Quantity) ),
    must_be(ground, Product),
    validate_bom(Product, []),
    current_stock_state(InitialState),
    process_request(Quantity, Product, InitialState, FinalState, Withdrawals, Orders),
    group_quantities(Withdrawals, ListWithdrawStock),
    group_quantities(Orders, ListOrderStock),
    persist_stock_state(FinalState).

% Validate the whole reachable BOM before doing any work. This catches
% unknown parts and cycles instead of returning a misleading partial result.
validate_bom(Item, Visited) :-
    ( memberchk(Item, Visited) ->
        throw(error(domain_error(acyclic_bom, Item), context(manage_stock/4, 'Cyclic setp/2 definition')))
    ; true
    ),
    ( setp(Item, Children) ->
        maplist(validate_child([Item|Visited]), Children)
    ; part(Item) ->
        true
    ;
        throw(error(existence_error(bom_item, Item), context(manage_stock/4, 'Item is neither a setp/2 nor a part/1')))
    ).

validate_child(Visited, Child) :-
    validate_bom(Child, Visited).

current_stock_state(State) :-
    findall(Item-Quantity, stock(Item, Quantity), Facts),
    validate_stock_facts(Facts),
    State = Facts.

validate_stock_facts([]).
validate_stock_facts([Item-Quantity|Rest]) :-
    must_be(integer, Quantity),
    ( Quantity >= 0 -> true ; domain_error(not_less_than_zero, Quantity) ),
    ( memberchk(Item-_, Rest) ->
        throw(error(permission_error(define, duplicate_stock, Item), context(manage_stock/4, 'Use one stock/2 fact per item')))
    ; true
    ),
    validate_stock_facts(Rest).

process_request(Required, Item, StateIn, StateOut, Withdrawals, Orders) :-
    stock_in_state(Item, StateIn, Available),
    Used is min(Required, Available),
    Remaining is Required - Used,
    Balance is Available - Used,
    put_stock(Item, Balance, StateIn, StateAfterUse),
    ( Used > 0 -> Withdrawals0 = [(Used, Item)] ; Withdrawals0 = [] ),
    ( Remaining =:= 0 ->
        StateOut = StateAfterUse,
        Withdrawals = Withdrawals0,
        Orders = []
    ; setp(Item, Children) ->
        process_children(Children, Remaining, StateAfterUse, StateOut, ChildWithdrawals, Orders),
        append(Withdrawals0, ChildWithdrawals, Withdrawals)
    ; part(Item) ->
        StateOut = StateAfterUse,
        Withdrawals = Withdrawals0,
        Orders = [(Remaining, Item)]
    ).

process_children([], _, State, State, [], []).
process_children([Child|Children], Quantity, StateIn, StateOut, Withdrawals, Orders) :-
    process_request(Quantity, Child, StateIn, StateAfterChild, ChildWithdrawals, ChildOrders),
    process_children(Children, Quantity, StateAfterChild, StateOut, RestWithdrawals, RestOrders),
    append(ChildWithdrawals, RestWithdrawals, Withdrawals),
    append(ChildOrders, RestOrders, Orders).

stock_in_state(Item, State, Quantity) :-
    ( memberchk(Item-Found, State) -> Quantity = Found ; Quantity = 0 ).

put_stock(Item, Quantity, [], [Item-Quantity]).
put_stock(Item, Quantity, [Item-_|Rest], [Item-Quantity|Rest]) :- !.
put_stock(Item, Quantity, [Other-Value|Rest], [Other-Value|UpdatedRest]) :-
    put_stock(Item, Quantity, Rest, UpdatedRest).

% Combine repeated requirements while preserving the first-seen BOM order.
group_quantities([], []).
group_quantities([(Quantity, Item)|Rest], [(Total, Item)|Grouped]) :-
    collect_item_quantity(Rest, Item, Quantity, Total, Remaining),
    group_quantities(Remaining, Grouped).

collect_item_quantity([], _, Total, Total, []).
collect_item_quantity([(Quantity, Item)|Rest], Wanted, Acc, Total, Remaining) :-
    ( Item == Wanted ->
        Next is Acc + Quantity,
        collect_item_quantity(Rest, Wanted, Next, Total, Remaining)
    ;
        Remaining = [(Quantity, Item)|Tail],
        collect_item_quantity(Rest, Wanted, Acc, Total, Tail)
    ).

persist_stock_state([]).
persist_stock_state([Item-Quantity|Rest]) :-
    retractall(stock(Item, _)),
    assertz(stock(Item, Quantity)),
    persist_stock_state(Rest).

% Reproducible, resettable demonstrations for the three requested cases.
demo_sufficient_stock(Withdrawals, Orders) :-
    reset_demo_stock,
    manage_stock(2, pizza(margherita, medium), Withdrawals, Orders).

demo_insufficient_stock(Withdrawals, Orders) :-
    reset_demo_stock,
    set_all_stock_to_zero,
    manage_stock(2, pizza(quattro_formaggi, large), Withdrawals, Orders).

demo_partial_aggregate_stock(Withdrawals, Orders) :-
    reset_demo_stock,
    set_all_stock_to_zero,
    set_demo_stock(dough(pan, medium), 1),
    set_demo_stock(tomato_sauce, 1),
    set_demo_stock(mozzarella, 1),
    set_demo_stock(basil, 1),
    manage_stock(3, pizza(margherita, medium), Withdrawals, Orders).

set_all_stock_to_zero :-
    findall(Item, stock(Item, _), Items),
    maplist(set_stock_to_zero, Items).

set_stock_to_zero(Item) :-
    set_demo_stock(Item, 0).

set_demo_stock(Item, Quantity) :-
    must_be(ground, Item),
    must_be(integer, Quantity),
    ( Quantity >= 0 -> true ; domain_error(not_less_than_zero, Quantity) ),
    ( part(Item) ; setp(Item, _) ),
    !,
    retractall(stock(Item, _)),
    assertz(stock(Item, Quantity)).
