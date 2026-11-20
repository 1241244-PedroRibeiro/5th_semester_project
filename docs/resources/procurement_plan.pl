
:-dynamic stock_supplier/4.

stock_supplier(ham,10,5000,75).
stock_supplier(ham,20,2000,31).
stock_supplier(ham,50,1000,16).
stock_supplier(ham,70,500,8.5).
stock_supplier(ham,200,250,5).


buy(Prod,W,LB,LSS1,WMiss):-
findall((Prod,N,WS1,Price),stock_supplier(Prod,N,WS1,Price),LSS),
buy1(Prod,W,LB,LSS,LSS1,WMiss).


buy1(Prod,W,[(Prod,NEnc,WS1,Price)|L],[(Prod,N,WS1,Price)|L1],L2,WMiss):-
    WS is N*WS1,
    W>=WS,!,NEnc is N, W1 is W-N*WS1,
    buy1(Prod,W1,L,L1,L2,WMiss).


buy1(Prod,W,[(Prod,NEnc,WS1,Price)],[(Prod,N,WS1,Price)|L1],[(Prod,N2,WS1,Price)|L1],0):-

    N1 is W//WS1,R is W mod WS1,((R==0,!,NEnc is N1);NEnc is N1+1),
    N2 is N-NEnc.

buy1(_,W,[],[],[],W).




