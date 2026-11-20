:- dynamic bom_recipe_line/3.
:- dynamic bom_component_config/3.
:- dynamic bom_component_stock/2.
:- dynamic bom_stock_units_per_sale/2.

bom_part(Sku) :-
    bom_component_stock(Sku, _).

bom_stock(Sku, Units) :-
    bom_component_stock(Sku, Units).

bom_setp(Sku, Size, Components) :-
    findall(comp(ComponentSku, Units),
            ( bom_recipe_line(Sku, ComponentSku, DefaultUnits),
              bom_component_config(ComponentSku, Size, UnitsPerDefault),
              Units is DefaultUnits * UnitsPerDefault,
              Units > 0
            ),
            Components).

bom_required_orders([], _, []).
bom_required_orders([order(Sku, Size, Quantity)|Rest], Products, Required) :-
    ( bom_recipe_line(Sku, _, _),
      bom_setp(Sku, Size, Components) ->
        scale_components(Quantity, Components, OwnRequired)
    ; direct_requirement(Sku, Quantity, Products, OwnRequired)
    ),
    bom_required_orders(Rest, Products, RestRequired),
    append(OwnRequired, RestRequired, AllRequired),
    bom_sum_by_sku(AllRequired, Required).

scale_components(_, [], []).
scale_components(Multiplier, [comp(Sku, Units)|Rest], [comp(Sku, Total)|Scaled]) :-
    Total is Multiplier * Units,
    scale_components(Multiplier, Rest, Scaled).

direct_requirement(Sku, Quantity, Products, [comp(Sku, Required)]) :-
    member(product(Sku, UnitsPerSale), Products),
    Required is Quantity * UnitsPerSale.

bom_sum_by_sku(Components, Summed) :-
    bom_unique_skus(Components, Skus),
    bom_sum_skus(Skus, Components, Summed).

bom_unique_skus([], []).
bom_unique_skus([comp(Sku, _)|Rest], Unique) :-
    bom_unique_skus(Rest, Tail),
    ( memberchk(Sku, Tail) -> Unique = Tail ; Unique = [Sku|Tail] ).

bom_sum_skus([], _, []).
bom_sum_skus([Sku|Skus], Components, [comp(Sku, Total)|Summed]) :-
    bom_sum_for_sku(Components, Sku, Total),
    bom_sum_skus(Skus, Components, Summed).

bom_sum_for_sku([], _, 0).
bom_sum_for_sku([comp(Sku, Units)|Rest], Sku, Total) :-
    bom_sum_for_sku(Rest, Sku, RestTotal),
    Total is Units + RestTotal.
bom_sum_for_sku([comp(OtherSku, _)|Rest], Sku, Total) :-
    OtherSku \= Sku,
    bom_sum_for_sku(Rest, Sku, Total).

bom_requirement(comp(Sku, Required), req(Sku, Required, Available, Remaining, Replenishment)) :-
    bom_stock(Sku, Available),
    ( Required =< Available ->
        Remaining is Available - Required,
        Replenishment = 0
    ;   Remaining = 0,
        Replenishment is Required - Available
    ).

bom_reaches(Sku, Target, Visited) :-
    bom_recipe_line(Sku, Next, _),
    ( Next == Target
    ; \+ memberchk(Next, Visited),
      bom_reaches(Next, Target, [Next|Visited])
    ).

bom_cyclic_recipe(Sku) :-
    bom_reaches(Sku, Sku, [Sku]).

bom_execution(Orders, Result) :-
    findall(product(Sku, UnitsPerSale),
            bom_stock_units_per_sale(Sku, UnitsPerSale),
            Products),
    bom_execution(Orders, Products, Result).

bom_execution(Orders, Products, result(Requirements, UnmetNeeds)) :-
    findall(Sku, (member(order(Sku, _, _), Orders), bom_cyclic_recipe(Sku)), CyclicSkus),
    ( CyclicSkus = [] ->
        bom_required_orders(Orders, Products, Required),
        maplist(bom_requirement, Required, Requirements),
        UnmetNeeds = []
    ;   findall(unmet(Sku, cyclic_recipe, 'Cyclic recipe detected'),
                member(Sku, CyclicSkus),
                UnmetNeeds),
        Requirements = []
    ).
