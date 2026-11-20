# Client Clarifications and Q&A Log: LaPrizza

> **Provenance:** Only the sections titled **Question** and **Answer** (with
> their identified origins) record what was asked or answered. Sections titled
> **Notas e Ilações para o Projeto** are team analysis, not client/instructor
> decisions. If they conflict, the recorded answer and later explicit
> clarifications take precedence.

Este documento centraliza, organiza e rastreia todas as questões colocadas ao cliente/Product Owner (docência de LAPR5/ARQSI) e aos regentes das áreas curriculares integradas (SGRAI, IARTI, ASIST), servindo de base para validação de regras de negócio, modelação de domínio, critérios de aceitação e arquitetura integrativa.

---

## Clarification #01: Customer Data, Kiosk Mode, Pricing, Stock Availability & Personalization

* **Question Origin:** Aluno
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Boa tarde Professor(es),
> Após a reunião com o cliente e a revisão do modelo de domínio, ficaram algumas questões que gostaríamos de esclarecer antes de avançar com certas decisões de implementação:
> 1. **Customer — dados obrigatórios:** Foi referido que os dados mínimos incluem Nome, N.º de Telefone e um terceiro mencionado o que não conseguimos identificar claramente. Qual é esse terceiro campo?
> 2. **Customer e User:** Foi confirmado que um Customer pode existir sem User associado, por exemplo num cenário de quiosque. Caso esse Customer crie posteriormente uma conta, devemos associar o novo User ao Customer já existente? Se sim, através de que informação deve ser feita essa identificação?
> 3. **Preço de Predefined Pizza:** Foi referido que pizzas personalizadas/customizáveis têm o preço calculado através dos seus componentes. Como deve ser calculado o preço de uma Predefined Pizza? Deve existir um preço base/fixo, ser calculado pelos componentes, ou considerar também algum custo de produção?
> 4. **Alterações a uma Predefined Pizza:** Quando um cliente adiciona, remove ou substitui componentes de uma Predefined Pizza, o preço final deve ser recalculado totalmente pelos componentes finais ou deve partir do preço base da Predefined Pizza e aplicar apenas diferenças/extras?
> 5. **Disponibilidade por tamanho e Stock:** Foi indicado que uma Predefined Pizza só está disponível num tamanho quando os componentes existem para esse tamanho e estão em stock. Neste contexto, “estar em stock” significa apenas quantidade > 0 ou deve existir stock suficiente para cobrir o stock consumption configurado para esse tamanho?
> 6. **Componentes sem controlo de Stock:** Um Pizza Component que não seja stock-controlled deve ser considerado sempre disponível para efeitos de determinação dos tamanhos disponíveis?
> 7. **Comportamento no catálogo:** Se um tamanho deixar temporariamente de estar disponível por falta de stock de um componente, deve deixar de aparecer no catálogo ou continuar visível como indisponível?
> 8. **Pesquisa por ingredientes:** Quando é referida pesquisa por Ingredientes, pretende-se pesquisar pizzas que contêm determinado ingrediente, pesquisar diretamente Products que sejam Pizza Components, ou ambos?
> 9. **Pesquisa futura por Allergens/Diet:** No caso dos Allergens, pretende-se procurar produtos que contêm determinado allergen, excluir produtos que o contêm, ou suportar ambos? E relativamente a “Diet”, que categorias devem ser consideradas (por exemplo Vegetarian, Vegan, Gluten-Free, Lactose-Free)?
> 10. **Personalized Pizza:** Uma pizza personalizada pode ser criada completamente de raiz ou tem sempre de partir de uma Predefined Pizza?
> 
> Obrigado.

### Answer
> Boa noite,
> Relativamente às questões colocadas:
> * **Customer — dados obrigatórios:** Os dados mínimos de um Customer são Nome, N.º de Telefone e Email.
> * **Customer e User:** O Customer referido no cenário de quiosque é um Customer anónimo, pelo que não existe qualquer registo persistente desse Customer que posteriormente tenha de ser associado a um User. Caso o cliente crie uma conta, será criado o respetivo registo, não existindo necessidade de identificar ou associar o Customer anónimo anterior.
> * **Preço de Predefined Pizza:** Para simplificar, deve considerar-se que os preços dos Pizza Components já incluem os custos de produção/mão de obra. Assim, o preço da pizza é determinado pelos seus componentes.
> * **Alterações a uma Predefined Pizza:** Quando são adicionados, removidos ou substituídos componentes, o preço deve ser recalculado com base no conjunto final de componentes da pizza.
> * **Disponibilidade por tamanho e Stock:** Deve existir stock suficiente para cobrir o stock consumption definido para esse tamanho. Por exemplo, se existirem 2 unidades de massa em stock e uma pizza Small consumir 1 unidade, Medium 2 unidades e Large 4 unidades, então Small e Medium estão disponíveis, enquanto Large não está.
> * **Componentes sem controlo de Stock:** Sim. Um Pizza Component que não seja stock-controlled deve ser considerado disponível para este efeito.
> * **Comportamento no catálogo:** A pizza deve continuar a aparecer no catálogo, mas deve ser apresentada como indisponível, total ou parcialmente, consoante nenhum ou apenas alguns dos tamanhos estejam disponíveis.
> * **Pesquisa por ingredientes:** Devem ser suportadas ambas as situações. A pesquisa é uma pesquisa por Product e, no caso das pizzas, deve também permitir pesquisar através dos respetivos Pizza Components.
> * **Pesquisa por Allergens/Diet:** O objetivo principal é permitir excluir produtos que contenham determinados allergens/componentes, por exemplo gluten, amendoins ou lactose. Para restrições como Vegetarian, podem considerar uma abordagem equivalente: por exemplo, identificar/excluir componentes que contenham carne ou, de forma mais geral, componentes de origem animal, conforme a restrição considerada.
> * **Personalized Pizza:** Uma Personalized Pizza pode ser construída completamente de raiz. Não é obrigatório partir de uma Predefined Pizza. Naturalmente, a pizza criada deve respeitar as restrições definidas nos requisitos.
> 
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Customer (`BCK02`):** Validar obrigatoriedade de `Name`, `PhoneNumber` e `Email` na criação/atualização de instâncias. O quiosque não gera registos na tabela/coleção de clientes; encomendas anónimas mantêm `customerId` como nulo/opcional.
* **Pricing Engine (`BCK08`, `BCK10`, `BCK11`):** Não há preço base fixo de pizzas predefinidas nem taxas de mão-de-obra adicionais. O preço é pura e dinamicamente calculado pela soma dos preços dos componentes no tamanho selecionado. Alterar ingredientes implica recalcular o somatório total a partir do zero com os novos componentes.
* **Stock Invariant (`BCK09`, `BCK10`):** A condição de disponibilidade para um tamanho $S$ exige que para todo o componente $C$ com controlo ativo: $\text{stockAtual}(C) \ge \text{consumo}(C, S)$.
* **Catálogo & DTOs (`BCK11`):** A representação da pizza devolve todos os tamanhos suportados, mas associa a cada tamanho uma flag de disponibilidade (`isAvailable: true/false`).
* **Personalized Pizza (`CustomizedPizza`):** Na personalização, a referência à pizza de partida (`sourcePredefinedPizzaId`) é opcional, permitindo a instanciação direta a partir de uma base em branco, desde que cumpridos os limites de cardinalidade (`CardinalityBounds` do `BCK07`).

---

## Clarification #02: Customer vs. User Entity Separation & Scope

* **Question Origin:** Aluno
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> O enunciado diz que os clientes podem registar-se a si próprios. Por outro lado, a gestão de clientes é feita pelo gestor do LaPrizza, que regista e atualiza as fichas dos clientes. Existem ainda utilizadores com credenciais para entrar no sistema. Na primeira versão do sistema, o cliente precisa de ter uma conta para entrar no sistema (por exemplo, com email e palavra-passe). "Cliente" e "utilizador" são o mesmo registo ou dois registos ligados?

### Answer
> Boa noite,  
> Customer e User devem ser considerados conceitos distintos, embora possam estar relacionados. Um Customer representa a informação de negócio associada a um cliente, tendo como dados mínimos Nome, N.º de Telefone e Email. Um User representa alguém que utiliza o sistema e poderá corresponder, por exemplo, a um Customer, Manager ou Employee. Podem existir Customers sem User associado, nomeadamente no cenário de um cliente anónimo num quiosque, não sendo nesse caso criado um registo persistente que posteriormente tenha de ser associado a uma conta.  
> Nesta primeira fase, devem modelar estes conceitos e as relações que considerem adequadas ao domínio, incluindo os diferentes tipos/roles de utilizadores. No entanto, relativamente à implementação, o foco deste Sprint é o back-end/API: não é necessário implementar uma aplicação de utilizador, como um ecrã de login, mas devem implementar através da API a gestão de Users/Roles e os mecanismos de autenticação necessários para identificar os utilizadores nas operações protegidas.  
> Assim, não assumam Customer e User como sendo simplesmente o mesmo registo. O modelo de domínio deve permitir representar uma visão mais abrangente do sistema e suportar a sua evolução futura, enquanto a implementação neste Sprint deve limitar-se às funcionalidades de back-end previstas para esta fase.  
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Arquitetura de Agregados:** Confirmada a separação dos agregados `Customer` (dados de negócio/perfil) e `User` (autenticação, credenciais, segurança).
* **Multiplicidade & Relação:** A raiz de `Customer` pode armazenar opcionalmente um `UserId` (`0..1`).
* **Sprint 1 Focus:** Foco exclusivo nas APIs REST do backend para gestão e autenticação com JWT (`BCK01`), sem necessidade de desenvolvimento de interfaces gráficas de login neste momento.

---

## Clarification #03: User Roles & Multi-Role Support

* **Question Origin:** Aluno
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> O enunciado pede que o sistema distinga o que cada tipo de utilizador pode fazer, mas não indica quais são esses tipos. As descrições referem o gestor (Manager) e o cliente (Customer). Que papéis devem existir na primeira fase? Pode um utilizador ter mais do que um papel?

### Answer
> Boa noite,  
> Nesta primeira fase, devem considerar pelo menos os papéis Manager, Customer e Employee. Um User poderá ter mais do que um papel, caso seja necessário representar diferentes responsabilidades no sistema.  
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **RBAC Taxonomy (`BCK01`):** A enumeração `UserRole` deve conter obrigatoriamente os valores: `MANAGER`, `EMPLOYEE`, `CUSTOMER`.
* **Modelação da Entidade User:** A classe `User` não deve possuir um atributo de papel singular, mas antes uma coleção de papéis: `Set<UserRole> roles`.

---

## Clarification #04: Administrative Hierarchy & Online Payments Scope

* **Question Origin:** Aluno
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> 1. **Administrador:** Faz sentido existir um perfil de administrador, com todas as funcionalidades do gestor e que, além disso, possa gerir as permissões dos gestores? Ou a gestão de utilizadores deve ficar a cargo do gestor?
> 2. **Pagamentos:** O sistema deve incluir pagamento online das encomendas, através de um serviço externo? Ou o pagamento fica fora do âmbito do protótipo?

### Answer
> Boa noite,  
> **Administrador:** Para esta fase, não é necessário introduzir um perfil adicional de Administrator. A gestão de Users e Roles pode ficar a cargo do Manager. A arquitetura poderá, naturalmente, ser concebida de forma a permitir a introdução futura de outros papéis e diferentes níveis de permissões.  
> **Pagamentos:** O pagamento online não faz parte do âmbito atual do protótipo. Não é, portanto, necessário implementar nesta fase a integração com qualquer serviço externo de pagamentos.  
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Sem Perfil de Admin:** Simplificação do controlo de acessos no Sprint 1: o perfil `MANAGER` é o responsável integral pelas rotas de criação e atribuição de papéis a utilizadores.
* **Sem Integrações Externas de Pagamento:** O agregado de encomendas (`CustomerOrder`) não precisa de integrar gateways (ex: Stripe, PayPal, SIBS) neste protótipo, focando apenas no ciclo de vida e estado da encomenda (`SIMULATED`, `PLACED`, `CONFIRMED`, etc.).

---

## Clarification #05: Predefined Pizza Pricing Mechanics

* **Question Origin:** Aluno (Rodrigo Guerra)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Good afternoon,  
> The System Specification (II.3.1.2) states that the price of a pizza may depend on its size and configuration, and that the specific pricing rules are established by the User Stories. BCK11 requires the catalogue to show pricing information for sellable products and the sizes in which each predefined pizza is available. However, the Sprint 1 User Stories do not specify how a predefined pizza's price is determined.  
> I was wondering if a pre-defined pizza (like a Margherita for example) has its price defined by either: a) A fixed price defined by LaPrizza for each available size (for example: Small 8.00€, Medium 10.00€, Large 12.00€) or b) A price calculated from the size-dependent prices of its components (for example: Large = Large dough 3.00€ + Large sauce 1.00€ + Large mozzarella 2.00€ = 6.00€), and if so is there a base price added on top of this value for labor pricing or other reasons.  
> Thank you in advance,  
> Rodrigo Guerra

### Answer
> Boa tarde,  
> Deve ser considerada a opção b): o preço de uma Predefined Pizza é calculado a partir dos preços dos seus componentes para o respetivo tamanho.  
> Para simplificar, considerem que os preços definidos para os Pizza Components já incluem os custos de produção/mão de obra, pelo que não deve ser acrescentado qualquer preço base ou custo adicional à soma dos componentes.  
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Confirmação Formal de Pricing:** Consolida e reforça a resposta dada no Ponto 3 da Clarification #01. O motor de cálculo para qualquer pizza (predefinida ou configurada) consiste na soma direta das instâncias de `ComponentSizeConfiguration.price` dos ingredientes participantes no tamanho pretendido.

---

## Clarification #06: Product Role Combinations and Business Invariants

* **Question Origin:** Aluno (Catarina Oliveira)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Good evening,  
> According to User Story BCK05, a product may adopt "any applicable combination" of characteristics (sellable, stock-controlled, or pizza component) based on business rules.  
> Could you clarify if the system should block invalid combinations, like a product with no assigned roles or one that is exclusively stock-controlled, or if it should remain flexible, leaving this responsibility to the Manager?  
> If the system has to enforce these restrictions, could you also specify which exact combinations should be considered invalid?  
> Thank you in advance,  
> Catarina Oliveira

### Answer
> Boa noite,  
> O sistema deve validar as combinações. Sellable e Pizza Component devem ser considerados tipos de Product, enquanto stock-controlled é uma característica independente.  
> Assim, todos os Products devem ter pelo menos um tipo: Sellable, Pizza Component, ou ambos. Um Product não pode, portanto, ser exclusivamente stock-controlled nem existir sem qualquer um destes dois tipos. Por outro lado, qualquer Product, independentemente do seu tipo, pode ou não estar sujeito a controlo de stock.  
> Cumprimentos.  
> Paulo Matos
> 
> *(Segunda resposta consolidada)*  
> Boa tarde,  
> O sistema deve validar as combinações de características, não deixando essa responsabilidade exclusivamente ao Manager.  
> Um Product deve ser obrigatoriamente Sellable, Pizza Component ou ambos. A característica StockControlled é opcional e pode ser combinada com qualquer uma das anteriores.  
> Assim, são inválidos os Products sem características e os exclusivamente StockControlled.  
> Cumprimentos,  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Taxonomia e Invariante de Domínio de Produto (`BCK05`):**
  * `isSellable` e `isPizzaComponent` são tratados como tipologias centrais de `Product`.
  * `isStockControlled` é uma característica ortogonal.
  * **Regra de Validação Invariante:** No construtor e métodos de mutação de `Product`, aplicar a regra:
    $$\text{isSellable} \lor \text{isPizzaComponent} \equiv \text{true}$$
    Se ambas forem `false`, a entidade deve lançar uma exceção de validação de negócio (ex: `InvalidProductTypeException`), impedindo a criação de produtos órfãos ou exclusivamente associados a stock.

---

## Clarification #07: SGRAI 3D Visualization Framework, Integration & Scope

* **Question Origin:** Aluno
* **Answer Origin:** Regente de SGRAI (Prof. João Paulo Pereira)
* **Date / Reference:** Fórum de Dúvidas de SGRAI / LAPR5

### Question 1 (Framework & Integration)
> Hello,  
> The system specifications document mentions Three.js and WebGL as web-based modules without requiring a specific JavaScript framework, whereas the Moodle materials provide an "Angular ThreeJS project setup" guide document.  
> Is Angular mandatory, or are groups free to choose another framework such as React, Vue or Svelte?

### Answer 1
> Depende de o grupo incluir ou não membros inscritos em LAPR5.  
> Se houver elementos inscritos em LAPR5, o módulo de visualização 3D terá de estar integrado numa Single-Page Application (SPA). A framework a adoptar — Angular, React, Svelte, Vue, etc. — ficará ao critério do grupo, a menos que o Project Manager decida de outra forma impondo uma determinada tecnologia.  
> Se não houver elementos inscritos em LAPR5, da perspectiva de SGRAI não será obrigatória a integração do módulo de visualização 3D numa SPA.  
> Cumprimentos,  
> João Paulo Pereira

### Question 2 (Theme, Mandatory Scope & Calendar)
> Hello,  
> Since SGRAI isn't integrated with LAPR5 for LETI students, we have two questions about the project:  
> Theme: Should we implement one of the LaPrizza 3D scenarios from the System Specification (Section II.3.3: "Build Your Pizza" or "Kitchen and Food Preparation Visualization") using mock data, or are we free to choose our own theme?  
> Delivery scope: What is expected at the first delivery compared with the final delivery? Is there a minimum set of features for the first iteration?  
> Thank you.

### Answer 2
> O tema a desenvolver será obrigatoriamente o descrito na secção II.3.3.2 da Especificação do Sistema: Kitchen and Food Preparation Visualization. A implementação do tema descrito na secção II.3.3.1 — Build Your Pizza — é opcional.  
> Em breve serão publicadas as user stories relativas aos sprints 2 e 3 do desenvolvimento do módulo de visualização 3D.  
> Faço notar que a realização do trabalho de SGRAI só irá iniciar-se na sétima semana lectiva (26 de Outubro). Até lá, pretende-se que os estudantes adquiram as competências necessárias através da frequência das aulas e da implementação dos projectos das aulas práticas laboratoriais.  
> Cumprimentos,  
> João Paulo Pereira

### Notas e Ilações para o Projeto
* **Obrigatoriedade de SPA Integrada (LEI / LAPR5):** Uma vez que o grupo é constituído por estudantes de LEI inscritos em LAPR5, o módulo 3D não pode ser entregue como uma página isolada ou sandbox estática; terá de estar encapsulado na Single-Page Application (SPA).
* **Liberdade de Framework:** Confirmação formal de que Angular não é mandatório. A decisão da equipa em adotar **React com TypeScript** para a SPA é 100% válida e compatível.
* **Hierarquia de Cenários 3D (Sprints 2 e 3):**
  * **Obrigatório:** Secção II.3.3.2 (*Kitchen and Food Preparation Visualization*) — focado no layout 3D da cozinha, alocação de bancadas e fornos, e animação das tarefas coordenadas com o agendamento de Inteligência Artificial em Prolog.
  * **Opcional:** Secção II.3.3.1 (*Build Your Pizza*) — configurador 3D de pizzas para clientes.
* **Impacto no Sprint 1:** Zero linhas de código de Three.js ou WebGL são exigidas no Sprint 1. O trabalho de SGRAI arranca formalmente a 26 de Outubro (Semana 7 / Sprint 2), mantendo o Sprint 1 focado no back-end REST, modelo de domínio DDD e arquitetura relacional (`ARQSI`/`LAPR5`).

---

## Clarification #08: Product Categories, Sellable Rules, StockControlled Transition & Allergen Catalog

* **Question Origin:** Grupo 3NB-01 (Isabel Jesus, 1200361)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Estimado Cliente,  
> Gostaríamos de esclarecer algumas regras de negócio, para darmos seguimento à análise.  
> 1. **Associação a categorias de produtos (Product Category):**  
>    Um produto pode pertencer a várias categorias ou deve estar associado a apenas uma? A associação a uma categoria é obrigatória no momento da criação do produto?  
> 2. **Informação comercial de produtos vendáveis (Sellable):**  
>    Quais são os atributos comerciais obrigatórios para um produto classificado como Sellable? O preço de venda tem de ser definido no momento da criação do produto ou pode ser indicado posteriormente, antes de o produto ficar disponível para venda?  
> 3. **Alteração dos tipos de produto:**  
>    É permitido alterar os tipos Sellable e PizzaComponent após a criação de um produto? Por exemplo, se um produto classificado como PizzaComponent já estiver associado a uma Predefined Pizza ou a uma Component Size Configuration, o sistema deve impedir que essa classificação seja removida?  
> 4. **Alteração do controlo de stock (StockControlled):**  
>    Se um produto deixar de estar sujeito a controlo de stock, o que deverá acontecer à informação de stock já existente? O sistema deve impedir essa alteração ou permitir a remoção da característica StockControlled, preservando a informação histórica de stock?  
> 5. **Desativação e reativação de produtos:**  
>    Quando um produto é desativado, deverá ficar disponível apenas para consulta histórica ou poderá continuar a ser atualizado? O sistema deverá permitir a reativação de produtos anteriormente desativados?  
> 6. **Lista de Alergénios:**  
>    Vamos assumir a lista de alergénios, conforme diretiva europeia (14 alergénios: Cereais com glúten, Crustáceos, Ovos, Peixe, Amendoins, Soja, Leite, Frutos de casca rija, Aipo, Mostarda, Sementes de sésamo, Dióxido de enxofre/sulfitos, Tremoço, Moluscos). Estamos a assumir corretamente?  
> 7. **Product Category:**  
>    A classificação comercial do produto, vamos assumir (Pizzas, Bebidas, Entradas, Sobremesas, Acompanhamentos, Outros). Estamos a assumir corretamente?

### Answer
> Bom dia,  
> Relativamente às questões colocadas:  
> * **Product Categories:** Cada Product deve pertencer a uma única categoria, obrigatória na sua criação.  
> * **Sellable:** Deve possuir informação comercial, incluindo preço, antes de ficar disponível para venda. Nas Predefined Pizzas, o preço resulta da soma dos componentes para o tamanho selecionado.  
> * **Tipos de Product:** Podem ser alterados, desde que não comprometam relações existentes. Cada Product deve manter pelo menos um tipo (Sellable ou Pizza Component).  
> * **StockControlled:** Pode ser alterado, preservando a informação histórica de stock e a consistência dos dados.  
> * **Desativação:** Products desativados podem ser consultados e atualizados administrativamente, mas não utilizados em novas operações. A reativação é permitida.  
> * **Alergénios:** Sim, podem utilizar inicialmente os 14 alergénios da legislação europeia. A lista deve ser configurável.  
> * **Product Categories:** A classificação proposta é adequada como configuração inicial, mas as categorias devem ser configuráveis pelo Manager.  
> 
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Unicidade e Obrigatoriedade de Categoria (`BCK03`, `BCK05`):** Relação estrita $1..1$ entre `Product` e `ProductCategory`. Todo o produto exige categoria no payload de criação.
* **Preço do Produto Sellable:** Para produtos comuns, o preço é obrigatório antes da disponibilização para venda. Para Predefined Pizzas, o preço não é fixo no produto, derivando das `ComponentSizeConfiguration`.
* **Transição de Tipos com Integridade Referencial:** É proibido remover a flag `isPizzaComponent` se existirem receitas (`BCK10`) ou configurações de tamanho (`BCK08`) ativas associadas.
* **Desativação / Soft Delete (`BCK05`):** Produtos desativados continuam acessíveis para gestão e mutação administrativa via Manager, mas são excluídos de novos fluxos de venda e de novas receitas. Deve existir suporte explícito a endpoint de reativação (`activate`).
* **Configurabilidade:** Alergénios (`BCK04`) e Categorias (`BCK03`) não são enums estáticos; são agregados/tabelas dinâmicas geridas pelo Manager, tendo os 14 alergénios europeus e as 6 categorias sugeridas como seed inicial.

---

## Clarification #09: User Registration Flow, Customer Creation & Endpoint Security

* **Question Origin:** Aluno
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Bom dia.  
> Relativamente à gestão de Customers e Users:  
> 1. **Registo de clientes (User vs Customer):** Quando um cliente final faz o próprio registo (criando um User com o role Customer), devemos exigir logo os campos obrigatórios (Nome, N.º de Telefone e Email) e gerar automaticamente a entidade Customer associada na base de dados?  
> 2. **Endpoints de registo:** A criação de contas com as roles MANAGER e EMPLOYEE deve ser estritamente feita num endpoint protegido (acessível apenas por um Manager), enquanto a criação de um User com o role CUSTOMER fica num endpoint público distinto?  
> Obrigada.

### Answer
> Bom dia,  
> Relativamente às questões colocadas:  
> * **Registo de clientes:** Sim. Quando um cliente se regista, deve fornecer os dados obrigatórios (Nome, N.º de Telefone e Email), ficando associado a uma conta de utilizador com o papel Customer.  
> * **Registo de utilizadores:** Os clientes podem registar-se autonomamente. A criação de utilizadores com os papéis Manager ou Employee deve ficar reservada a utilizadores com as permissões adequadas, nomeadamente Manager.  
> 
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Registo Público / Self-Registration (`BCK01`, `BCK02`):** Endpoint público `POST /api/v1/auth/register-customer` que aceita credenciais + dados pessoais (`name`, `phoneNumber`, `email`) e orquestra a criação transacional de um `User` (com `UserRole.CUSTOMER`) e do respetivo perfil `Customer` interligado.
* **Backoffice Provisioning:** Endpoints administrativos dedicados (ex.: `POST /api/v1/users` ou `/api/v1/backoffice/users`) protegidos por guardas `@Roles(UserRole.MANAGER)` para criação de colaboradores e outros gestores.

---

## Clarification #10: Product Activation State vs. Stock Availability

* **Question Origin:** Aluno (Rodrigo Guerra)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Boa tarde.  
> No enunciado é possível depreender que existem produtos que possam estar ativos ou inativos (BCK10 - "active products currently designated as Pizza Components"). Sendo assim quais seriam os critérios para definir o estado de um produto? Um produto ativo é aquele que tem stock e portanto pode ser requisitado? Ou podemos até mesmo ter um produto sem stock que continua classificado como ativo?  
> Melhores Cumprimentos,  
> Rodrigo Guerra

### Answer
> Bom dia,  
> O estado ativo/inativo de um Product é independente da sua disponibilidade em stock.  
> Um Product ativo é aquele que continua a fazer parte da oferta ou operação do restaurante, mesmo que esteja temporariamente sem stock. Um Product inativo é aquele que deixou de ser utilizado ou comercializado, por decisão do Manager, mantendo-se a sua informação para efeitos históricos.  
> Assim, um produto pode estar ativo e ter stock igual a zero, ficando temporariamente indisponível, sem necessidade de ser desativado.  
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Desacoplamento de Estado (`BCK05`, `BCK09`):** O atributo booleano `isActive` de `Product` reflete o ciclo de vida comercial/administrativo atribuído pelo Manager. A disponibilidade operacional depende da verificação de saldo em `StockItem`.
* **Stock Zero $\neq$ Inativo:** Um produto sem stock continua `isActive = true`, passando apenas a figurar como indisponível para confeção/venda.

---

## Clarification #11: Name Uniqueness, Zero Price & Component Deactivation Cascading

* **Question Origin:** Aluno (Bruno Pinto, 1250652)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Boa noite,  
> Temos as seguintes dúvidas:  
> 1. O nome de um produto tem de ser único?  
> 2. O preço de venda de um produto vendável pode ser zero?  
> 3. O produto que representa uma pizza predefinida pode também ser designado como componente de pizza?  
> 4. Quando um componente de pizza é desativado, o que deve acontecer às pizzas predefinidas que o incluem:  
>    (a) a desativação é recusada enquanto o componente for usado;  
>    (b) essas pizzas ficam indisponíveis até a sua configuração ser alterada;  
>    (c) o componente é retirado dessas pizzas?  
> Muito obrigado.  
> Com os melhores cumprimentos,  
> Bruno Pinto, 1250652

### Answer
> Bom dia,  
> Relativamente às questões colocadas:  
> * **Nome do Product:** Não é obrigatório que seja único, uma vez que cada Product possui um identificador único.  
> * **Preço de venda:** Sim, o preço pode ser zero, mas não pode ser negativo.  
> * **Predefined Pizza:** Não. O Product que representa uma Predefined Pizza deve ser Sellable, mas não deve ser simultaneamente um Pizza Component.  
> * **Desativação de Pizza Components:** Considerem a opção (b). As Predefined Pizzas que utilizem um componente desativado ficam indisponíveis até que a sua configuração seja alterada ou o componente reativado. A desativação não deve remover automaticamente componentes das configurações existentes.  
> 
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Unicidade de Nomes (`BCK05`):** A unicidade de `Product` é garantida exclusivamente pelo seu identificador técnico (`id` / `code`). O atributo descritivo `name` não requer índice único absoluto (embora seja uma boa prática validar no contexto de categorias).
* **Preço Zero Permitido:** Invariante de `Money`: $\text{amount} \ge 0.00$. Preços promocionais ou ofertas (0.00 €) são válidos; valores negativos continuam terminantemente proibidos.
* **Exclusão Mútua Predefined Pizza vs. Pizza Component (`BCK05`, `BCK10`):** Uma pizza predefinida tem `isSellable = true` e **obrigatoriamente** `isPizzaComponent = false`. Não pode ser usada como ingrediente de outra pizza.
* **Efeito Cascata de Desativação de Ingredientes:** A desativação de um componente não altera nem quebra a receita da pizza predefinida na BD; em vez disso, a consulta do catálogo / motor de disponibilidade marca as pizzas que utilizam esse componente como indisponíveis (`isAvailable: false`).

---

## Clarification #12: Stock Deduction Timing, Subcategories & Commercial Scope

* **Question Origin:** Aluno (Tiago Sá)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Bom dia,  
> Temos as seguintes dúvidas:  
> - Em que momento se regista o consumo de stock: na confirmação, no início da preparação ou quando o item é servido?  
> - Um produto tem exatamente uma Product Category, ou pode ter várias? São necessárias subcategorias?  
> - Um produto pode deixar de estar sujeito a controlo de stock quando ainda tem unidades em stock? Se sim, o que acontece a essa informação de stock?  
> - Todos os produtos têm de ter categoria? Por exemplo, Massa Original, que só é usada como Pizza Component e nunca é vendida sozinha, também precisa de categoria?  
> - Para um produto Sellable, a informação comercial é só o preço, ou necessita de mais alguma informação?  
> Obrigado.

### Answer
> Bom dia,  
> Relativamente às questões colocadas:  
> * **Consumo de stock:** O stock deve ser descontado quando a encomenda é confirmada, evitando que as mesmas unidades sejam utilizadas em encomendas diferentes.  
> * **Product Categories:** Cada Product deve pertencer a uma única categoria. Não é necessário implementar subcategorias.  
> * **Alteração de StockControlled:** Sim, a característica pode ser removida mesmo existindo stock. A informação anterior deve ser preservada para efeitos históricos.  
> * **Categoria dos Pizza Components:** Sim, todos os Products devem ter uma Product Category, incluindo os que são utilizados exclusivamente como Pizza Components.  
> * **Informação comercial:** Para esta fase, o preço de venda é suficiente como informação comercial específica de um Product Sellable, além dos restantes atributos gerais do produto.  
> 
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Transação de Stock (`BCK09`):** O decremento atómico de stock ocorre no evento `CONFIRM_ORDER` e não em estados posteriores da cozinha.
* **Modelo Simples de Categorias (`BCK03`):** Sem suporte a estruturas hierárquicas de categorias (subcategorias); FK direta $1..1$.
* **Ingredientes Requerem Categoria:** Produtos de uso interno exclusivo (ex.: farinhas, massas cruas, molhos de base) pertencem obrigatoriamente a uma categoria (ex.: "Ingredientes", "Bases").

---

## Clarification #13: Explicit Component Sizing Prices and Discrete Consumption

* **Question Origin:** Aluno (Carlos Bernardino)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Good morning,  
> In BCK08, a Component Size Configuration "must define the price applicable to the component when used in a pizza of the corresponding size", with at most one configuration per Pizza Component and Pizza Size.  
> We would like to confirm how this price per size should be obtained:  
> a) The Manager sets the price of each component for each size explicitly (for example, Mozzarella: Small 1.00 €, Medium 1.50 €, Large 2.20 €);  
> b) Each component has a base price and each Pizza Size has a whole-number factor (for example, Small 1, Medium 2, Large 4), and the price per size is calculated from the base price and the factor.  
> In both cases, a pizza's price would still be the sum of its components' prices for the chosen size.  
> Regarding stock, we assume the number of units each component consumes in each size is always set explicitly, as whole units, as in the dough example (1, 2 and 4 units). Is that correct?  
> Thank you,  
> Carlos Bernardino

### Answer
> Bom dia,  
> Relativamente às questões colocadas:  
> * **Preço dos Pizza Components:** Devem considerar a opção (a). O Manager define explicitamente o preço de cada Pizza Component para cada Pizza Size. Não é necessário utilizar preços base ou fatores multiplicativos. O preço final da pizza corresponde à soma dos preços dos seus componentes para o tamanho selecionado.  
> * **Consumo de stock:** Sim. O número de unidades de stock consumidas por cada Pizza Component deve ser definido explicitamente para cada Pizza Size, utilizando valores inteiros não negativos.  
> 
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Sem Fórmulas Paramétricas em `BCK08`:** Não existem multiplicadores por tamanho. A entidade `ComponentSizeConfiguration` armazena pares explícitos de `(price, stockUnitsConsumed)` para cada tuplo `(productId, sizeId)`.
* **Consumo Discreto:** Unidades inteiras não negativas ($u \in \mathbb{N}_0$).

---

## Clarification #14: Updatable Product Fields & Type Downgrade Restrictions

* **Question Origin:** Aluno (Rodrigo Guerra)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Boa tarde,  
> Relativamente ao primeiro acceptance criteria de BCK05 que diz que um produto deverá poder ser updated. Que informações podem ser editadas em relação a um produto existente? Um produto que representa um pizza component pode por exemplo ser updated para deixar de ser um pizza component?  
> Melhores Cumprimentos,  
> Rodrigo Guerra

### Answer
> Bom dia,  
> Um Product pode ser atualizado, incluindo os seus dados gerais, categoria, informação comercial, alergénios, estado e características (Sellable, Pizza Component e StockControlled), desde que sejam respeitadas as regras de negócio e a consistência da informação existente.  
> Em particular, um Product pode deixar de ser um Pizza Component, desde que não esteja a ser utilizado em configurações de Predefined Pizzas ou Component Size Configurations. Essas dependências devem ser previamente resolvidas.  
> Recorda-se ainda que cada Product deve manter pelo menos um dos tipos Sellable ou Pizza Component.  
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Validação Pré-Update:** O serviço `ProductService.update(...)` deve verificar se o produto está a remover o papel `isPizzaComponent` enquanto possui dependências em `ComponentSizeConfiguration` ou `PredefinedPizzaRecipeLine`. Se existirem, rejeitar com erro de conflito (`409 Conflict`).

---

## Clarification #15: Initial Stock Quantity & Movement Logging Scope (Sprint 1)

* **Question Origin:** Aluno
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Boa tarde, Professor.  
> Complementando as questões já colocadas sobre produtos e controlo de stock, gostaríamos de esclarecer dois pontos da BCK09 — Stock Information Management:  
> 1. Quando um produto passa a estar sujeito a controlo de stock, a quantidade inicial deve ser zero ou indicada pelo Manager?  
> 2. Neste sprint, é obrigatório guardar um histórico dos aumentos e reduções de stock? Se sim, que informação deve ser registada em cada movimento?  
> Obrigado.

### Answer
> Bom dia,  
> Relativamente às questões colocadas:  
> * **Quantidade inicial de stock:** Quando um Product passa a estar sujeito a controlo de stock, a quantidade inicial pode ser indicada pelo Manager. Caso não seja indicada, deve ser considerada zero. Em qualquer situação, a quantidade não pode ser negativa.  
> * **Histórico de movimentos:** A BCK09 não exige, neste sprint, a implementação de um histórico de movimentos de stock. É obrigatório manter a quantidade atual e permitir aumentos e reduções, respeitando as regras de negócio.  
> 
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Registo de Stock Simplificado (`BCK09`):** A entidade `StockItem` apenas necessita do campo `currentStock: number`. Não é obrigatório expor ou persistir uma tabela de auditoria de movimentos de stock neste Sprint 1 (embora manter o modelo simples seja perfeitamente válido).

---

## Clarification #16: Customer Authentication Identifiers, NIF, Dietary Warnings & Pricing Independence

* **Question Origin:** Aluno (Tiago Sá)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Boa tarde,  
> - No caso de um Customer com conta, o email de autenticação do User e o email de contacto do Customer são o mesmo dado, ou podem ser diferentes?  
> - O NIF faz parte dos dados do Customer? Se sim, é opcional?  
> - Ao fazer uma encomenda como cliente anónimo, que dados são obrigatórios fornecer? O email só é guardado no registo do cliente como user?  
> - Todos os Products têm de ter uma Product Category, ou a categoria é opcional? Um Product pode pertencer a mais do que uma categoria?  
> - Quando um item da encomenda contém um alergénio incompatível com as restrições do Customer, o sistema deve bloquear a encomenda ou apenas avisar?  
> - Quando um Product é Sellable e Pizza Component ao mesmo tempo (por exemplo, mozzarella - 2€), o preço de venda isolado é definido de forma independente dos preços por tamanho da Component Size Configuration ou pode ser o mesmo preço?  
> Muito obrigado.

### Answer
> Boa tarde,  
> Relativamente às questões colocadas:  
> * **Email do User e do Customer:** Para um Customer com conta, considerem o mesmo endereço de email para autenticação e contacto. Não é necessário suportar dois endereços distintos.  
> * **NIF:** O NIF não faz parte dos dados obrigatórios do Customer. Poderá ser considerado um dado opcional, nomeadamente para efeitos de faturação.  
> * **Clientes anónimos:** Neste momento, ainda não está definido como funcionará o processo de encomenda anónima, incluindo os dados que deverão ser fornecidos. Esse funcionamento dependerá dos requisitos apresentados nos próximos sprints.  
> * **Product Category:** Todos os Products devem pertencer a exatamente uma Product Category, incluindo os utilizados exclusivamente como Pizza Components.  
> * **Alergénios e restrições alimentares:** O sistema deve informar o Customer sobre os alergénios presentes nos produtos e alertar para eventuais incompatibilidades com as suas restrições alimentares. No entanto, estas incompatibilidades não deverão bloquear a realização da encomenda.  
> * **Preços de Sellable e Pizza Component:** O preço de venda isolado é independente dos preços definidos nas Component Size Configurations, embora possam coincidir. O preço de um componente numa pizza é o valor explicitamente definido para o tamanho escolhido, não sendo calculado automaticamente através da multiplicação do preço de venda isolado pelas unidades consumidas.  
> 
> Cumprimentos.  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Email Unificado:** Em contas registadas, o email de `User` e `Customer` é o mesmo.
* **Avisos Não Bloqueantes:** Incompatibilidades com dietas (`BCK02`, `BCK04`) originam mensagens de aviso / *warnings*, mas não geram HTTP 400/409 na submissão de pedidos.
* **Independência de Preços:** Um produto com duplo papel (ex.: Queijo Mozzarella vendido em pacote ou usado na pizza) mantém um preço isolado em `Product.basePrice` desvinculado dos valores presentes em `ComponentSizeConfiguration`.

---

## Clarification #17: Category & Allergen Deletion and Absence of Deactivation Mechanics

* **Question Origin:** Aluno / Henri Fontes
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Todos os produtos devem ter exatamente uma categoria desde o momento da sua criação, ou é permitido criar um produto sem categoria e classificá-lo posteriormente?  
> Quando uma categoria ou alergénio está associada a produtos existentes (incluindo inativos), o sistema deve impedir a sua remoção ou desativá-los? É esperada reativação?

### Answer
> Boa tarde,  
> **Categoria obrigatória:** Todos os Products devem ter exatamente uma Product Category desde a sua criação.  
> **Remoção de categorias e alergénios:** Uma categoria ou alergénio pode ser removido permanentemente, desde que não esteja associado a nenhum Product, ativo ou inativo. Caso existam produtos associados, a remoção deve ser impedida.  
> **Reativação:** Não é necessário implementar mecanismos de desativação ou reativação de Product Categories e Allergens.  
> Cumprimentos,  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Sem Soft Delete em Categorias e Alergénios (`BCK03`, `BCK04`):** Ao contrário dos produtos (que suportam inativação/bloqueio), categorias e alergénios são entidades de catálogo simples: só existem os estados "criado" e "apagado". A integridade referencial com produtos (`ON DELETE RESTRICT`) bloqueia a eliminação caso haja vínculos.

---

## Clarification #18: Immutability of Base Component Types & Cardinality Evolution

* **Question Origin:** Aluno / Grupo 3DJ-02
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> 1. Se o Manager alterar as regras de um Pizza Component Type já em uso (ex.: baixar o máximo de Queijo de 2 para 1), o que acontece a pizzas predefinidas já existentes?  
> 2. Os quatro tipos iniciais (Base Dough, Base Sauce, Cheese, Topping) podem ser renomeados, alterados ou desativados?  
> 3. Se um tipo for desativado, outro pode ocupar a sua ordem de montagem?  
> 4. Os limites aplicam-se a todos os tamanhos e tipos de pizzas?

### Answer
> Boa tarde,  
> Relativamente às questões:  
> * **Alteração de regras:** As alterações são permitidas, mantendo-se as configurações existentes. As novas regras aplicam-se apenas a novas composições ou alterações das existentes.  
> * **Tipos iniciais:** Os quatro Pizza Component Types básicos (Base Dough, Base Sauce, Cheese e Topping) são obrigatórios e devem permanecer disponíveis, não podendo ser desativados ou removidos. Devem respeitar as regras mínimas estabelecidas no enunciado.  
> * **Ordem de montagem:** Não é necessário implementar a desativação de Pizza Component Types. Cada tipo deve ter uma ordem de montagem única.  
> * **Limites:** Sim, os limites de cada tipo aplicam-se a todos os tamanhos e tanto a pizzas predefinidas como personalizadas.  
> 
> Cumprimentos,  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Tipos Base Protegidos (`BCK07`):** Bloquear pedidos de `DELETE` contra os quatro códigos/nomes nucleares (`Base Dough`, `Base Sauce`, `Cheese`, `Topping`).
* **Unicidade de Assembly Order:** A ordem de montagem no agregado `PizzaComponentType` deve ter restrição de unicidade na base de dados (`UNIQUE(assembly_order)`).
* **Retroatividade Zero:** Atualizar cardinalidades de um tipo de componente não invalida pizzas predefinidas já guardadas.

---

## Clarification #19: Stock Operations on Inactive Products

* **Question Origin:** Aluno (João Ferreira - Team 3DK-01)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> We are analysing BCK09 (Stock Information Management) together with BCK05 (Product Management), and we would like to clarify how stock should behave for products that are no longer actively used (inactive/blocked).  
> Should it be possible to increase the stock of an inactive product? Should it be possible to decrease it? Should inactive products appear in stock searches by default?

### Answer
> Boa tarde,  
> Relativamente aos produtos inativos sujeitos a controlo de stock:  
> * **Consulta:** O stock deve continuar disponível para consulta.  
> * **Alterações:** Deve ser possível aumentar ou diminuir o stock, mesmo quando o produto está inativo. A inatividade impede a utilização do produto em novas vendas, mas não a sua gestão administrativa.  
> * **Pesquisa:** Os produtos inativos devem poder ser pesquisados, sendo possível filtrá-los pelo estado. Não é obrigatório excluí-los por defeito.  
> 
> Cumprimentos,  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Operações de Stock Desbloqueadas (`BCK09`):** Os endpoints de aumento e redução de stock (`POST /stock/:id/increase`, `POST /stock/:id/decrease`) **não devem** rejeitar a operação caso o produto associado esteja marcado como inativo. A inativação restringe apenas o catálogo de compras/vendas públicas.

---

## Clarification #20: Entity Identifiers & Format Decisions

* **Question Origin:** Aluno
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos

### Question
> Could you please confirm the official format to be used for unique identifiers across entities (UserId, CustomerId, CategoryId, AllergenId, ProductId, PizzaSizeId)? Should they be UUIDs, sequential numbers, or business codes?

### Answer
> Boa tarde,  
> Não temos preferência por um formato específico para os identificadores (UUID, numérico ou alfanumérico), ficando essa decisão ao critério das equipas de desenvolvimento.  
> Os identificadores devem ser únicos, imutáveis e, preferencialmente, gerados automaticamente pelo sistema.  
> Tenham apenas em consideração que os Allergens e Pizza Sizes são configuráveis, não estando limitados a conjuntos predefinidos.  
> Cumprimentos,  
> Paulo Matos

### Notas e Ilações para o Projeto
* **Decisão Arquitetural Mantida (`ADR-003`, `ARC04`):** A equipa mantém o padrão canónico de **UUIDv4** para chaves primárias técnicas internas de todas as entidades, combinado com **Business Codes** alfanuméricos legíveis (ex.: `CAT-PIZZA`, `AL-GLU`, `PRD-MOZZ`, `SIZE-MED`) para consultas e operações de negócio.

---

## Clarification #21: BCK10/BCK11 — Disponibilidade de pizzas predefinidas e acesso ao catálogo

* **Question Origin:** Aluno (Rodrigo Sousa, 1241065)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (24/10/2026 → 27/10/2026)

### Question
> Boa tarde,
> o meu grupo tem algumas questões sobre pizzas predefinidas e o catálogo:
>
> 1. **Acesso ao catálogo (BCK11).** O catálogo pode ser consultado por qualquer pessoa, sem autenticação, ou só por Customers com conta?
> 2. **Tamanhos e configurações por tamanho (BCK06/BCK08).** Se um Pizza Size for desativado, ou se for removida uma Component Size Configuration de um componente usado numa Predefined Pizza, o sistema deve recusar a alteração, ou a pizza deixa simplesmente de estar disponível nesse tamanho (e fica totalmente indisponível se não sobrar nenhum)?
> 3. **Mudança de tipo de um componente (BCK05).** Responderam que um Product só pode deixar de ser Pizza Component se não for usado em Predefined Pizzas. A mesma regra aplica-se à mudança de Pizza Component Type de um componente usado? Por exemplo, se uma pizza tiver Molho de tomate (Base Sauce, mínimo 0) e o Molho de tomate passar a Topping, a pizza fica sem nenhum Base Sauce, e a regra do tipo deixa de estar cumprida.
> 4. **Reativação de uma Predefined Pizza (BCK10).** Quando o Manager reativa uma Predefined Pizza que tinha desativado, a configuração tem de cumprir as regras atuais (por exemplo, um mínimo ou máximo alterado entretanto), ou basta que os componentes estejam ativos e que haja pelo menos um tamanho possível?

### Answer
> Boa tarde,
> Relativamente às questões:
>
> - **Acesso ao catálogo:** O catálogo é público e pode ser consultado sem autenticação.
> - **Tamanhos e configurações:** A remoção ou desativação de um tamanho, ou a remoção de uma Component Size Configuration, pode tornar a Predefined Pizza indisponível nesse tamanho. Se não restarem tamanhos válidos, a pizza fica indisponível.
> - **Mudança de Pizza Component Type:** A alteração é permitida desde que não comprometa a validade das configurações existentes. Caso contrário, estas devem ser previamente ajustadas.
> - **Reativação:** Uma Predefined Pizza só pode voltar a estar disponível quando cumprir as regras atuais de composição, utilizar componentes ativos e tiver pelo menos um tamanho válido.

### Notas e Ilações para o Projeto
* **Catálogo Público (`BCK11`):** O endpoint de consulta do catálogo (`GET /catalogue` ou equivalente) não deve exigir autenticação. A Guest role (Tabela 1 do Sprint 2) confirma isto.
* **Degradação de Disponibilidade (`BCK06`, `BCK08`, `BCK10`):** Nem a desativação de um `PizzaSize` nem a remoção de uma `ComponentSizeConfiguration` devem ser bloqueadas por si; o efeito é a redução dos tamanhos em que a `PredefinedPizza` está disponível. Se o conjunto ficar vazio, a pizza fica `unavailable`. Isto **complementa #11** (efeito cascata de desativação de componentes): a mesma lógica de "não quebrar, apenas marcar indisponível" aplica-se a tamanhos.
* **Validação de `Pizza Component Type` em uso (`BCK05`, `BCK07`):** Alterar o `type` de um componente usado em pizzas predefinidas só é aceite se a configuração resultante continuar a respeitar os `CardinalityBounds` de todos os tipos. Isto estende a regra de #14 (não remover `isPizzaComponent` com dependências) — também não se pode "trocar de type" se tal violar uma Predefined Pizza existente. A validação deve ser feita no `ProductService.update(...)` e devolver `409 Conflict` se inválida.
* **Reativação de Predefined Pizza (`BCK10`):** O endpoint de `activate` (ou de update que reponha `isActive=true`) deve revalidar: (a) composição contra regras atuais; (b) todos os componentes `isActive=true`; (c) existência de ≥1 tamanho válido. Se falhar, rejeitar com erro explicativo. Isto complementa #18 (alterações de cardinalidade não são retroativas às configurações guardadas, mas ao reativar a pizza passa a aplicar-se o estado atual).

---

## Clarification #22: WEB02 — Identidade visual, navegação, tradução PT/EN e persistência de língua

* **Question Origin:** Aluna (Isabel Fonseca, 1200361 — Grupo 3NB-01)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (31/10/2026 → 02/11/2026)

### Question
> Estimado Cliente,
> De forma a ir ao encontro das necessidades de forma mais assertiva, gostaria que nos esclarecesse:
>
> 1. Existe um logótipo oficial da LaPizza, e/ou palete de cores a utilizar?
> 2. Sobre navegação "sempre visível e acessível", deve entender-se manter o nome/logótipo e botões de navegação sempre visíveis?
> 3. Referente à tradução PT/EN abrange apenas menus, botões, etiquetas e mensagens, ou também os dados de negócio, como nomes e descrições de produtos, categorias e alergénios?
> 4. Qual é a língua por defeito, que deve ser ativa PT ou EN? A escolha deve manter-se apenas durante a navegação ou também após atualizar a página, fechar o navegador e voltar a entrar?
> 5. Ao mudar a língua durante o preenchimento de um formulário, confirma que devemos manter a página e todos os dados já introduzidos?

### Answer
> Boa tarde,
> Relativamente às questões apresentadas:
>
> - **Logótipo e identidade visual:** Não existe um logótipo nem uma paleta de cores definidos para a LaPrizza. A definição da identidade visual fica ao critério de cada equipa.
> - **Navegação sempre visível e acessível:** Os principais mecanismos de navegação devem permanecer facilmente acessíveis durante a utilização da aplicação.
> - **Tradução PT/EN:** A tradução deve abranger os elementos da interface. Os dados de negócio, como nomes e descrições de produtos e categorias, não necessitam de tradução. Os nomes dos alergénios devem ser apresentados na língua selecionada.
> - **Língua por defeito e persistência:** A língua apresentada por defeito é indiferente. O importante é que, após a seleção de uma língua, essa preferência se mantenha durante a navegação, após atualizar a página e em visitas posteriores à aplicação.
> - **Mudança de língua durante o preenchimento de formulários:** A alteração da língua não deve provocar a perda dos dados já introduzidos nem obrigar o utilizador a reiniciar o preenchimento do formulário.

### Notas e Ilações para o Projeto
* **Sem requisitos de branding (`WEB02`):** Não há imposição de logótipo ou palete; a equipa tem liberdade para definir identidade visual. O critério "restaurant name and logo" da US continua a exigir *algum* logótipo/nome no layout.
* **Navegação (`WEB02`):** O critério é de acessibilidade/facilidade de acesso, não de "fixed/sticky" obrigatório. A equipa pode implementar de forma razoável (e.g., header sticky, menu de acesso rápido).
* **i18n (`WEB02`):** Separar claramente *UI strings* (traduzir) de *business data* (não traduzir: nome/descrição de `Product`, `ProductCategory`, etc.). **Exceção:** nomes de `Allergen` **devem** ser localizados — logo, `Allergen.name` não deve ser usado diretamente na UI; deve existir tradução (i18n key ou campo multi-idioma).
* **Persistência de língua (`WEB02`):** A preferência de idioma deve sobreviver a refresh e a novas visitas — implica persistência (localStorage, cookie ou perfil de utilizador). Não é aceitável manter apenas em memória.
* **Mudança de língua com formulário em curso (`WEB02`):** O formulário não pode perder o estado ao trocar de idioma. Na prática, isto significa que o "estado do formulário" não pode viver no `key` do componente que muda com o idioma, e que a troca de idioma deve ser reativa sem desmontar o formulário.

---

## Clarification #23: WEB05 — Comportamento das páginas de gestão (clientes, produtos, categorias, tipos, stock, catálogo, conflitos)

* **Question Origin:** Aluna (Isabel Fonseca, 1200361 — Grupo 3NB-01)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (31/10/2026 → 02/11/2026)

### Question
> Estimado Cliente,
>
> 1) Para a gestão das funcionalidades Clientes, categorias e alergénios:
> 1.1 Na gestão de clientes, que informação deve aparecer na listagem e qual deve ficar apenas na ficha individual? As restrições alimentares devem ser apresentadas apenas quando o gestor abre essa ficha?
> 1.2 Quando uma categoria ou alergénio não pode ser removido por estar associado a produtos, basta explicar o impedimento ou pretende-se também apresentar os produtos associados e permitir navegar para eles?
>
> 2) Sobre a gestão da funcionalidade Produtos:
> 2.1 Ao alterar características ou o tipo de um componente utilizado em pizzas, basta indicar as configurações que impedem a alteração ou pretende-se um percurso guiado para as ajustar previamente?
> 2.2 Na consulta de um produto, que informação deve estar imediatamente visível e qual pode ficar no detalhe: categoria, características, alergénios, preço de venda isolado e configurações por tamanho?
>
> 3) Referente à gestão de Tamanhos e tipos:
> 3.1 Ao alterar limites de um Pizza Component Type, pretende-se mostrar um aviso de que as configurações existentes são preservadas, mas novas composições e alterações passam a cumprir os novos limites?
>
> 4) Em Configurações e pizzas:
> 4.1 Para configurar uma pizza predefinida, prefere selecionar componentes e consultar os tamanhos possíveis numa única página, ou seguir um processo por etapas? Podemos apresentar um esboço para validação?
> 4.2 Durante a configuração, pretende visualizar imediatamente o preço calculado e os alergénios resultantes por tamanho, antes de guardar?
>
> 5) Na funcionalidade de Stock e catálogo:
> 5.1 Quando uma pizza está indisponível num tamanho, pretende que a interface apresente apenas esse estado ou também uma explicação? Essa explicação deve ser diferente no catálogo público e na gestão interna, sem revelar stock ao público?
> 5.2 No catálogo, ao selecionar vários ingredientes de pesquisa, pretende encontrar produtos que contenham todos ou qualquer um deles? Como deve essa seleção combinar com as exclusões por alergénios/componentes?
>
> 6) Gestão de Permissões, privacidade e atualização:
> 6.1 Quando dois gestores editam o mesmo registo e o segundo tenta guardar uma versão desatualizada, que comportamento espera: informar e pedir nova consulta, ou permitir rever as diferenças antes de repetir a alteração?

### Answer
> Boa tarde,
> Relativamente às questões apresentadas:
>
> **1. Gestão de clientes, categorias e alergénios**
> 1.1. A listagem deve apresentar os dados essenciais do cliente. As restrições alimentares podem ficar na ficha individual.
> 1.2. Deve ser informado o motivo que impede a remoção e existir um mecanismo para consultar os produtos associados ao elemento que se pretende eliminar.
>
> **2. Gestão de produtos**
> 2.1. Basta identificar as configurações que impedem a alteração. Não é necessário um processo guiado.
> 2.2. A organização fica ao critério da equipa, devendo permitir consultar facilmente categoria, tipo, características, estado, alergénios, preços, stock e configurações por tamanho, quando aplicável.
>
> **3. Gestão de tamanhos e tipos**
> 3.1. Sim. Deve ser indicado que as configurações existentes são preservadas e que os novos limites se aplicam a novas composições ou alterações.
>
> **4. Configurações e pizzas**
> 4.1. Fica ao critério da equipa, desde que a experiência de utilização seja coerente e intuitiva.
> 4.2. É desejável apresentar o preço e os alergénios durante a configuração, considerando o tamanho selecionado.
>
> **5. Stock e catálogo**
> 5.1. A indisponibilidade deve ser indicada. A gestão interna pode apresentar os motivos, mas o catálogo público não deve revelar informação interna de stock.
> 5.2. A pesquisa deve considerar todos os ingredientes selecionados e excluir produtos que contenham qualquer alergénio ou componente excluído.
>
> **6. Permissões, privacidade e atualização**
> 6.1. Basta informar que o registo foi alterado por outro utilizador e exigir uma nova consulta antes de guardar, evitando a substituição de alterações.

### Notas e Ilações para o Projeto
* **Listagem de clientes (`WEB05`, `BCK02`):** Listagem mostra apenas campos essenciais (nome, contacto). `dietaryRestrictions` só na ficha de detalhe. Reforça o critério "customer information and dietary restrictions must only be displayed to users who need them".
* **Erro de remoção com produtos associados (`WEB05`, `BCK03`, `BCK04`):** A UI deve explicar o motivo **e** listar/navegar para os produtos associados (não é só "não é possível"). Isto é consistente com a existência de um mecanismo de consulta de produtos por categoria/alergénio.
* **Alterações bloqueadas em `Product` (`WEB05`, `BCK05`):** Basta indicar as dependências (ids/links de `ComponentSizeConfiguration` e `PredefinedPizzaRecipeLine`) que impedem a alteração — **não** é obrigatório um wizard guiado de resolução. O backend devolve `409` com identificação das dependências; a UI mostra-as.
* **Informação de produto (`WEB05`, `BCK05`, `BCK08`):** A ordem/estrutura é livre, mas **categoria, tipo, características, estado, alergénios, preços, stock e configurações por tamanho** devem estar acessíveis. Cuidado: stock e preço só quando aplicáveis (product stock-controlled / sellable).
* **Alteração de `CardinalityBounds` (`WEB05`, `BCK07`):** Aviso explícito na UI: "configurações existentes preservadas; novos limites aplicam-se a novas composições/edições". Coerente com #18.
* **Configurador de Predefined Pizza (`WEB05`, `BCK10`):** Layout livre (single page ou wizard). Deve expor preview de preço e alergénios por tamanho **antes de guardar** — isto requer cálculo client-side ou endpoint de simulação por tamanho. Dado #01/#05 (preço = soma de `ComponentSizeConfiguration.price` por tamanho), o preview é determinístico.
* **Indisponibilidade por tamanho (`WEB05`, `BCK11`):** UI pública mostra apenas estado (disponível/indisponível), **nunca** detalhes internos de stock. UI interna (Manager) pode mostrar o motivo (e.g., "componente X sem stock para tamanho L"). DTOs distintos entre endpoints públicos e internos.
* **Pesquisa por ingredientes e exclusão (`WEB05`, `BCK11`):** Semântica: **AND** entre ingredientes selecionados (todos os incluídos), **OR/exclusão estrita** entre exclusões ("excluir produtos que contenham qualquer"). Isto é: `contains_all(included) AND NOT contains_any(excluded)`. Implementar ao nível de query/use case, não só de UI.
* **Conflito de edição concorrente (`WEB05`):** Não é obrigatório diff visual. Basta detetar que o registo mudou desde a última leitura (ex.: `updatedAt`/`version`/`ETag`) e: (a) recusar com `409 Conflict`; (b) informar "alterado por outro utilizador"; (c) exigir reload antes de repetir a alteração. Isto implica que os DTOs de update incluam versão/`updatedAt` e que o backend faça check.

---

## Clarification #24: AA06 — Papéis, auditoria, convites, revogação e primeiro Administrator

* **Question Origin:** Aluna (Isabel Fonseca, 1200361 — Grupo 3NB-01)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (31/10/2026 → 02/11/2026)

### Question
> Estimado Cliente,
> Referente a Papéis e auditoria, gostaríamos de esclarecer:
>
> **Papéis e auditoria**
> 1. Como deve ser disponibilizada a primeira conta Administrator: previamente configurada na instalação e ativada pelo respetivo titular através de convite?
> 2. Um Administrator pode retirar o seu próprio papel ou desativar a própria conta? Deve ser impedida qualquer operação que deixe o sistema sem pelo menos um Administrator ativo?
> 3. Os papéis e permissões da Tabela 1 são fixos neste sprint, cabendo ao Administrator apenas atribuir e remover esses papéis, ou pretende também configurar permissões individuais?
> 4. Além de registar o responsável e a data da alteração, pretende uma página de consulta do histórico? Deve mostrar o utilizador afetado, os papéis anteriores e os novos?
>
> **Convites**
> 5. Qual deve ser o prazo de validade de um convite de ativação? Deve ser configurável pela entidade que instala o sistema?
> 6. Ao emitir um convite de substituição, confirma que o anterior deve ficar imediatamente inválido, mesmo que ainda não tenha expirado?
> 7. Se o email já corresponder a uma conta existente, pretende que o Administrator seja encaminhado para gerir essa conta, sem criar outra? Como deve proceder se a conta estiver inativa ou tiver um convite pendente?
> 8. Se o envio do email falhar, pretende manter a conta inativa e permitir ao Administrator repetir o envio, com indicação clara da falha?
>
> **Revogação e papéis adicionais**
> 9. Quando uma conta anteriormente ativa é desativada e mais tarde recuperada, basta uma reativação pelo Administrator ou é necessário um novo convite com confirmação do titular?
> 10. Quando um utilizador perde um papel durante uma sessão, pretende que continue autenticado com os restantes papéis e seja encaminhado para uma página permitida?

### Answer
> Boa tarde,
> Relativamente às questões apresentadas:
>
> **1. Papéis e auditoria**
> 1.1. A primeira conta Administrator deve ser criada durante a instalação ou inicialização do sistema, garantindo um processo seguro de definição das credenciais. Não é obrigatório utilizar um convite.
> 1.2. Deve ser impedida qualquer operação que deixe o sistema sem pelo menos um Administrator ativo, incluindo a remoção do próprio papel ou a desativação da conta.
> 1.3. Os papéis e permissões da Tabela 1 são fixos. O Administrator pode atribuir e remover papéis, não sendo necessária a configuração de permissões individuais.
> 1.4. Deve existir um registo das alterações aos papéis, incluindo o responsável, a data, o utilizador afetado e os papéis anteriores e novos.
>
> **2. Convites**
> 2.1. Os convites devem ter um prazo de validade limitado. Pode ser definido um valor por omissão no código, mas deve existir um parâmetro de configuração (por exemplo, uma variável de ambiente) que permita substituir esse valor.
> 2.2. Sim. A emissão de um novo convite deve invalidar imediatamente o anterior.
> 2.3. Não devem ser criadas contas duplicadas para o mesmo email. Se a conta estiver inativa ou tiver um convite pendente, deve ser possível gerir a situação a partir da conta existente, por um Administrator ou outro utilizador com permissões para tal.
> 2.4. Sim. A conta deve permanecer inativa e deve ser possível repetir o envio, apresentando informação sobre a falha.
>
> **3. Revogação e papéis adicionais**
> 3.1. A reativação pelo Administrator é suficiente, não sendo obrigatório emitir um novo convite.
> 3.2. A alteração dos papéis deve produzir efeitos imediatamente. O utilizador pode continuar autenticado com os restantes papéis, mas deve deixar de ter acesso às funcionalidades associadas ao papel removido.

### Notas e Ilações para o Projeto
* **Bootstrap do primeiro Administrator (`AA06`):** Criar via migração/seed ou endpoint de inicialização com credenciais definidas por env var. **Não** é necessário fluxo de convite para o primeiro Admin. Deve ser impossível arrancar o sistema em produção sem nenhum Admin ativo.
* **Invariante "pelo menos um Admin ativo" (`AA06`):** Validar em `RoleService`/`UserService`: não permitir `removeRole(user, ADMIN)` nem `deactivate(user)` se o utilizador for o último Admin ativo. Devolver `409 Conflict`.
* **RBAC fixo (`AA06`, Tabela 1):** Sem "permission editor" — apenas atribuição/remoção dos roles da Tabela 1. Simplifica o modelo (não há tabela `permission` individual por user).
* **Auditoria de roles (`AA06`, Tabela 1):** Persistir `role_changes` (ou equivalente) com `actorId`, `targetUserId`, `previousRoles`, `newRoles`, `timestamp`. Endpoint de consulta de histórico (página ou lista no detalhe do user) é requerido.
* **Validade de convites (`AA06`, `AA07`):** Valor por omissão no código + override por env var. Documentar a env var (e.g., `INVITATION_TTL_HOURS`). Não é preciso UI de configuração nesta fase.
* **Invalidação de convite anterior (`AA06`, `AA07`):** Emitir novo convite → marcar `invitation.usedAt = now()` ou `revokedAt = now()` do anterior. Chamada única.
* **Email duplicado (`AA06`):** Unicidade de `email` no `User` (ou no `Customer`+`User` conjunto, com a relação definida em #16). Se email já existe → não criar; UI do Admin encaminha para gerir a conta existente. Isto liga-se com o critério "Login must not recreate an existing account" do AA03.
* **Falha no envio de email (`AA06`, `AA07`):** Estado da conta mantém-se `PENDING_REGISTRATION`/inativa; permitir retry de envio; mostrar falha. Envolve separação entre "criar convite" e "enviar convite".
* **Reativação de conta previamente ativa (`AA06`):** Admin reativa diretamente (sem novo convite). Não confundir com o fluxo de "convite inicial" para contas novas.
* **Efeito imediato de revogação (`AA06`, `AA04`):** O guard/authorization check **não pode** confiar apenas no JWT claims para roles — deve ler roles atuais da base de dados a cada pedido protegido (isto já está documentado no glossary: `auth.guard.ts` lê current user from repository). Comportamento esperado: sessão continua válida, mas acesso à funcionalidade removida falha (`403`). Não é obrigatório forçar logout; a UI pode ajustar-se na próxima chamada.

---

## Clarification #25: AA02 / Tabela 1 — Restaurant Staff vs Employee e escolha do IdP externo

* **Question Origin:** Aluno (Mota, 1241246)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (31/10/2026 → 02/11/2026)

### Question
> Boa tarde,
> o meu grupo tem duas questões sobre papéis e autenticação:
>
> 1. **Restaurant Staff e Employee (Tabela 1).** No Sprint 1 confirmaram os papéis Manager, Customer e Employee. A Parte IV fala em Restaurant Staff. Podemos considerar que o Restaurant Staff corresponde ao Employee do Sprint 1, passando a ter as permissões indicadas na Tabela 1?
> 2. **Fornecedor de identidade externo (AA02).** Há algum fornecedor de identidade que o LaPrizza prefira para a autenticação externa (por exemplo Google ou Microsoft), ou a escolha fica a cargo da equipa?

### Answer
> Boa tarde,
> Relativamente às questões apresentadas:
>
> - **Restaurant Staff e Employee:** Sim. O papel Restaurant Staff corresponde ao papel Employee definido no Sprint 1, devendo ter as permissões indicadas na Tabela 1.
> - **Fornecedor de identidade externo (AA02):** Não existe preferência por um fornecedor de identidade específico. A escolha fica ao critério da equipa, desde que sejam cumpridos os requisitos de autenticação e segurança definidos.

### Notas e Ilações para o Projeto
* **Unificação de papéis (`AA03`, `AA06`, Tabela 1):** `UserRole.EMPLOYEE` no domínio == "Restaurant Staff" na Tabela 1. Não criar um novo enum; documentar o mapeamento e usar as permissões da Tabela 1 no `RolesGuard`. Isto fecha a ambiguidade deixada por #03.
* **Escolha do IdP (`AA02`):** Sem preferência → livre. Deve ser um IdP **compatível com OpenID Connect / OAuth 2.0** (critério da US). A escolha deve ser documentada num ADR (e.g., `ADR-00xx-external-idp.md`) para justificar e cobrir requisitos de segurança. Opções típicas: Google, Microsoft, Auth0, Keycloak. A equipa assume a responsabilidade de cumprir os critérios de AA02 (verified identity, no password storage, logout, etc.).

---

## Clarification #26: AI02/AI06 — Âmbito da confirmação de encomendas de compra neste sprint

* **Question Origin:** Aluno (José Moreira, 1160810)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (01/11/2026 → 02/11/2026)

### Question
> Good afternoon,
> Regarding purchase planning (AI02/AI06), the specification states that calculations never create supplier orders and that any real order requires an explicit confirmation by the Manager.
>
> In this sprint, after the system suggests which suppliers to buy from and in what quantities, should the Manager be able to confirm that purchase in the system, or is it enough for the plan to be available for consultation?
> If confirmation is part of this sprint, what should happen when the Manager confirms: is it only recorded that the order was placed with the supplier (quantities, price, expected delivery date), or should the stock be updated at that moment? Or does the stock only increase when the goods arrive at the restaurant and the entry is registered?
> Can a confirmed order be cancelled or changed before delivery, or is it final?

### Answer
> Boa tarde,
> Relativamente às questões apresentadas:
>
> - **Confirmação de encomendas:** Neste sprint, é suficiente que o plano de compras seja disponibilizado para consulta.
> - **Atualização de stock:** Neste sprint, as alterações de stock ocorrem apenas através das vendas ou de operações manuais de gestão de stock, como a adição de unidades. Os planos de compras não alteram o stock.
> - **Alteração ou cancelamento:** A gestão de encomendas confirmadas, incluindo alterações e cancelamentos, não faz parte do âmbito deste sprint.

### Notas e Ilações para o Projeto
* **Sem confirmação de encomendas no Sprint 2 (`AI02`, `AI06`):** Não é necessário implementar endpoint de `confirm purchase order`, nem tabela de `purchase_orders`, nem máquina de estados. **Apenas** endpoint de execução/consulta do plano (read-only, resultado efémero ou persistido como resultado de simulação).
* **Sem alteração de stock pelo plano (`AI02`, `AI06`, `BCK09`):** Reforça o critério "Calculations must never apply predicted stock changes". O único caminho de mudança de stock no Sprint 2 é `POST /stock/:id/increase` e `POST /stock/:id/decrease` (e eventualmente venda, se implementada). Os resultados de planos são **artefactos de consulta**.
* **Escopo negativo explícito (`AI02`, `AI06`):** Não implementar: `cancel`, `modify`, `receive goods`, `update stock on delivery`. Tudo isto fica para sprints futuros ou fora do MVP. Isto simplifica drasticamente o agregado de encomendas.
* **Impacto no modelo:** A "encomenda" sugerida pelo plano é **output de simulação** apenas — não deve ser persistida como `PurchaseOrder` com estado. Se for persistida, deve ser como `PlanningResult` read-only ligado à execução.

---

## Clarification #27: AA01/AA02/AA03 — Registo público, primeiro login externo e conta de funcionário com ficha de cliente

* **Question Origin:** Aluno (Paulo Brito, 1120835)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (02/11/2026 → 02/11/2026)

### Question
> Temos umas dúvidas por favor poderia ajudar com as respostas?
>
> 1. **Registo público:** no Sprint 1, o registo público cria uma conta Customer ativa. No Sprint 2 este registo deve manter-se? Se sim, a conta deve continuar a ficar ativa logo após o registo, ou deve ficar inativa até o utilizador confirmar o email através de uma ativação (AA06/AA07)?
> 2. **Primeiro login com fornecedor externo (AA02/AA03):** quando alguém se autentica pela primeira vez através do fornecedor externo, sem ter recebido convite, deve ser criada automaticamente uma conta com o papel Customer? Nesse caso, a conta fica ativa, por a identidade já ter sido verificada pelo fornecedor, ou só pode ser ativada através de um convite?
> 3. **Uma conta de funcionário criada pelo Administrator, que recebe automaticamente o papel Customer (AA03), deve ter também uma ficha de cliente?**

### Answer
> Boa tarde,
> Relativamente às questões apresentadas:
>
> - **Registo público:** Sim, o registo público mantém-se. Conforme explicitamente indicado nos critérios de aceitação das User Stories do Sprint 2 (AA06/AA07), a conta deve permanecer inativa até à confirmação do endereço de email pelo utilizador.
> - **Primeiro login com fornecedor externo:** Sim. No primeiro acesso através de um fornecedor externo, deve ser criada automaticamente uma conta com o papel Customer, ficando ativa após a autenticação bem-sucedida. Não é necessário um convite.
> - **Conta de funcionário:** Sim. Uma conta de funcionário que tenha também o papel Customer deve possuir uma ficha de cliente associada, permitindo utilizar as funcionalidades destinadas aos clientes.

### Notas e Ilações para o Projeto
* **Registo público alterado (`AA01`, `AA06`, `AA07`, `BCK01`):** Esta resposta **reverte parcialmente** o comportamento de #09 (que dizia "criação transacional de um User ativo + Customer"). Agora:
  - `POST /auth/register-customer` cria `User` em estado `PENDING_REGISTRATION` (inativo) + `Customer` associado.
  - É enviado email com convite/ativação.
  - Só após confirmação de email é que a conta fica `ACTIVE`.
  - **Impacto no domínio:** `UserStatus` deve incluir `PENDING_REGISTRATION` como já previsto no glossary. O endpoint de ativação (`AA07`) tem de suportar este caso.
* **Primeiro login via IdP externo (`AA02`, `AA03`):** Just-in-time provisioning:
  - Autenticação bem-sucedida no IdP → se não existe `User` com aquele `sub`/`email`, criar `User` com `ACTIVE` (sem convite) e role `CUSTOMER` + `Customer` associado.
  - A verificação da identidade é feita pelo IdP (verified identity); não é preciso email de confirmação.
  - Isto **não** é o mesmo fluxo que registo local (#27 acima); documentar bem a diferença no ADR de autenticação.
* **Conta de funcionário com Customer role (`AA03`, `BCK02`, Tabela 1):** Se um `User` tem role `CUSTOMER` (mesmo que adicionalmente `EMPLOYEE`/`MANAGER`), deve ter um `Customer` associado. Isto liga-se com #16 (email unificado) e #02 (Customer e User distintos mas relacionados 1:0..1). Aqui é 1:1 quando `CUSTOMER` está presente.
  - **Efeito no modelo:** ao atribuir `CUSTOMER` a um `User` sem `Customer`, o serviço deve criar a ficha de cliente (com dados mínimos: `name`, `phoneNumber`, `email` — ver #01). Se faltar algum, devolver erro de validação.
  - **Remoção de `CUSTOMER`:** Não está especificado se a ficha de cliente é apagada. Assumir que **não** — fica para histórico; apenas o acesso é revogado.

---

## Clarification #28: WEB07/AI06 — BOM de pizzas, consumo, inativos, prazos e limites de fornecimento

* **Question Origin:** Aluno (Lucílio Cardoso, 1200367 — Grupo 3NB-01)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (31/10/2026 → 02/11/2026, seguido de follow-up em 02/11/2026)

### Question
> Hello,
> While analyzing both WEB07 and AI06, in coordination with AI01 and AI02, we identified several questions we would like to clarify to ensure a consistent interpretation of the requirements.
>
> 1. **Aggregate composition and classification.** For the Prolog calculations, the back end must provide aggregate compositions and classify aggregates as either produced internally or purchased. For this sprint, is it sufficient to provide this information through a documented initial configuration accessible through the API, or is a workflow allowing the Manager to manage these recipes and classifications also expected? Could you confirm an example recipe, including the output quantity per batch and the quantities of ingredients consumed?
> 2. **Stock consumption for directly sold products.** Should this consumption be explicitly configurable for each product? If this information is missing for a stock-controlled product, should the calculation be rejected with an explanation of the missing data? Our proposal is to avoid automatically assuming that each item sold consumes one stock unit.
> 3. **Inactive products and sizes in forecasts.** What should happen when a forecast is created or executed using a product or size that has been deactivated? Should new entries and executions using these references be rejected while preserving previously generated results? To support repeating a historical simulation, may we use the input dataset identified and saved for the original execution?
> 4. **Fractional delivery lead times.** WEB07 allows delivery lead times to be non-negative numbers, while AI02 defines planning in calendar days. If an offer specifies a fractional lead time, such as 1.5 days, which convention should determine the delivery date and whether the requirement can be met on time? When no reference time is available, we propose conservatively rounding the lead time up to the next whole day.
> 5. **Optional supply limits.** When a supplier offer includes a supply limit, should that limit apply: to each order; to each day; or to the entire scenario period? When this attribute is absent, we will follow the statement by documenting the lack of capacity information without presenting it as confirmed unlimited availability.
>
> *(Follow-up)*
> O limite diário aplica-se separadamente a cada oferta/produto ou é partilhado por todos os produtos do fornecedor?
> Uma previsão guardada com referências ativas deve ser impedida de executar pela primeira vez se o produto/tamanho entretanto ficar inativo?

### Answer
> Boa tarde,
> Relativamente às questões apresentadas, importa esclarecer que as pizzas são os únicos produtos com uma composição (BOM). Os restantes produtos são tratados como produtos individuais, sem receitas ou decomposição em ingredientes.
>
> **1. Composição e classificação de agregados**
> 1.1. Para este sprint, é suficiente utilizar as configurações das pizzas e dos respetivos componentes, disponibilizadas através da API. Não é necessário implementar um mecanismo adicional de gestão de receitas ou agregados.
> 1.2. A composição de uma pizza é determinada pelos seus componentes e respetivas quantidades de consumo, de acordo com o tamanho. Por exemplo, se uma pizza consumir 2 unidades de queijo e 3 de tomate, uma previsão de 5 pizzas corresponde a 10 unidades de queijo e 15 de tomate. O stock disponível deve ser considerado no cálculo das necessidades.
>
> **2. Consumo de stock de produtos vendidos diretamente**
> 2.1. Sim. O consumo de stock por unidade vendida deve ser explicitamente configurável.
> 2.2. Na ausência dessa informação, o cálculo deve identificar o problema. Não deve ser assumido automaticamente o consumo de uma unidade de stock.
>
> **3. Produtos e tamanhos inativos nas previsões**
> 3.1. Novas previsões não devem utilizar produtos ou tamanhos inativos. Os resultados de execuções anteriores devem ser preservados.
> 3.2. É aceitável repetir uma simulação com os dados originais guardados, desde que seja identificada como uma reprodução histórica.
>
> **4. Prazos de entrega**
> 4.1. Os prazos de entrega serão sempre expressos em dias inteiros, não sendo necessário considerar valores fracionários.
>
> **5. Limites opcionais de fornecimento**
> 5.1. O limite de fornecimento corresponde à quantidade máxima que um fornecedor pode disponibilizar por dia.
> 5.2. Por exemplo, se um fornecedor tiver um limite de 100 unidades por dia e forem necessárias 300 unidades, poderão ser realizadas três encomendas de 100 unidades em dias consecutivos, desde que os prazos de entrega e as restantes condições o permitam.
> 5.3. Na ausência de um limite definido, deve ser assumida capacidade ilimitada de fornecimento.
>
> *(Follow-up)*
> - **Limite diário de fornecimento:** O limite aplica-se individualmente a cada oferta/produto, não sendo partilhado entre os diferentes produtos do mesmo fornecedor.
> - **Execução de previsões guardadas:** Sim. Se um produto ou tamanho estiver inativo no momento da primeira execução, esta deve ser impedida, mesmo que estivesse ativo quando a previsão foi criada. As reproduções de execuções históricas podem utilizar os dados originais guardados.

### Notas e Ilações para o Projeto
* **BOM é só de pizzas (`AI01`, `AI06`, `BCK10`):** Não há "receitas de agregados" genéricas nem decomposição de outros produtos. A BOM de uma `PredefinedPizza` = os seus componentes × consumo por tamanho (`ComponentSizeConfiguration.stockUnitsConsumed`). Isto simplifica drasticamente o modelo: `BOM = PredefinedPizza.recipe` (já existente para `BCK10`).
* **Sem gestão de agregados (`WEB07`, `AI01`, `AI06`):** Nenhuma UI/endpoint novo para "gerir receitas de agregados" ou "classificar agregados como produzido/comprado". Se a implementação interna tiver esse conceito para cálculo, é opcional; **não é requisito de Sprint 2**.
* **Exemplo concreto de cálculo (referência para testes) (`AI01`):** 5 pizzas (size S) com BOM `cheese=2, tomato=3` → `cheese=10, tomato=15`. Subtrai stock disponível para obter necessidades; reportar `required`, `available`, `hypotheticalRemaining`, `replenishmentNeed`. Útil para *fixtures* de teste do módulo Prolog.
* **Consumo de produtos vendidos diretamente (`WEB07`, `AI02`, `BCK09`):** Requer um campo configurável em `Product` (ou similar): `stockUnitsPerSale` (integer ≥ 0). Se `isStockControlled=true` e `isSellable=true` e `stockUnitsPerSale` ausente → **erro explícito** no cálculo (não assumir 1). **Impacto no modelo Sprint 1:** pode exigir migração adicional em `products` (`stock_units_per_sale` nullable) — ou campo separado. Só aplicável a produtos sellable+stock-controlled.
* **Produtos/tamanhos inativos em previsões (`WEB07`, `AI02`):**
  - Criação de forecast: rejeitar referências inativas (`422`/`400`).
  - Primeira execução: se referência ficou inativa desde a criação do forecast, **rejeitar** (não é retroativo).
  - Replay histórico: permitido **apenas** com o dataset de input original (não re-resolve refs atuais). Marcar como `isReplay=true` no resultado.
  - Preservar resultados anteriores mesmo que as referências fiquem inativas.
* **Prazos de entrega (`WEB07`, `AI02`):** Aceitar apenas **inteiros** ≥ 0. Ignorar/limitar decimais. Validação no import de supplier JSON: rejeitar ou truncar? Recomendado: **rejeitar** (não adivinhar). Isto simplifica o cálculo Prolog (nada de arredondamentos). Validação no DTO: `leadTimeDays: integer >= 0`.
* **Limite de fornecimento (`AI02`):** Limite **por oferta/produto**, não por fornecedor. Estrutura implícita: `SupplierOffer { supplierId, productId, price, stockUnitQuantity, leadTimeDays, dailySupplyLimit?: integer }`. Ausente → ilimitado. Aplicar por **dia** no plano: em cada dia, a soma das quantidades encomendadas dessa `SupplierOffer` ≤ `dailySupplyLimit`. Multi-day splitting é permitido (ex.: 3×100 em 3 dias).
* **Referência a AI01 (expansão de agregados):** A resposta do cliente ("pizzas são os únicos produtos com BOM") sugere que a diferenciação `produced internally` vs `purchased` para agregados pode não ser necessária neste sprint — se a implementação precisar, é decisão interna, não requisito. **Confirmar com o cliente** se a equipa quiser simplificar o módulo Prolog ao ponto de eliminar a expansão de agregados. A resposta 1.1 é permissiva ("é suficiente... não é necessário").


---

## Clarification #29: AA04 — Duração das sessões e alcance do logout

* **Question Origin:** Aluno (Bruno Fernandes, 1191264)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (03/11/2026 → 05/11/2026)

### Question
> Bom dia, Professor.
>
> Relativamente à AA04 - Secure Session Handling, gostaríamos de esclarecer dois pontos:
>
> Existe algum tempo de inatividade ou duração máxima pretendida para uma sessão? Enquanto o utilizador estiver ativo, a sessão pode ser renovada automaticamente ou deve ser exigido um novo login após determinado período?
>
> Quando o utilizador termina sessão num dispositivo, deve ser invalidada apenas essa sessão ou também todas as outras sessões da mesma conta?
>
> Obrigado pelos esclarecimentos.

### Answer
> Bom dia,
>
> Relativamente às questões apresentadas:
>
> **Duração e renovação da sessão:** A sessão deve expirar após um período de inatividade configurável, cujo valor deve poder ser facilmente alterado sem necessidade de modificar o código da aplicação (por exemplo, através de uma variável de ambiente ou de um ficheiro de configuração). Enquanto o utilizador estiver ativo, a sessão pode ser renovada automaticamente, não sendo necessário exigir um novo login após um período fixo.
>
> **Terminar sessão:** O logout deve invalidar apenas a sessão do dispositivo em utilização. As restantes sessões da mesma conta podem permanecer ativas.
>
> Cumprimentos,
> Paulo Matos

### Notas e Ilações para o Projecto
* **Timeout de inactividade configurável (`AA04`, `AA04` AC3):** Introduzir `SESSION_INACTIVITY_MINUTES` (ou equivalente) como variável de ambiente. Valor concreto fica ao critério da equipa (ASIST), mas o mecanismo tem de existir. Documentar no `.env.example`.
* **Sliding expiry (renovação automática):** Enquanto houver actividade, a sessão renova-se. **Não** existe duração absoluta máxima fixa após o login (ao contrário do que a leitura literal de "maximum lifetime" poderia sugerir). O limite efectivo é a **inactividade**, não o tempo total.
* **Logout por dispositivo (não global) (`AA04` AC3):** O logout invalida apenas a sessão do dispositivo actual. As restantes sessões da conta permanecem válidas. Isto implica:
  - Modelo de sessão **por dispositivo** (`session_id` por login), não por utilizador.
  - Logout revoga o refresh-token (ou entrada de sessão) **daquele** dispositivo apenas.
  - A semântica "logout must prevent the ended session from being reused" (AA04 AC3) é satisfeita ao nível da **sessão**, não da conta.
* **Impacto no modelo de tokens:** Combina directamente com **Clarification #34** (validade do token e refresh). A renovação automática (refresh) tem de estar limitada pelo timeout de inactividade configurado — nunca pode "ultrapassar" esse limite.
* **Cross-reference:** #34 (mesmo mecanismo, perspectiva token).

---

## Clarification #30: AI02 — Quantidades de compra indivisíveis e necessidades com atraso

* **Question Origin:** Aluno (Bruno Fernandes, 1191264)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (03/11/2026 → 05/11/2026)

### Question
> Bom dia, Professor.
>
> Complementando os esclarecimentos anteriores, temos duas dúvidas específicas da AI02 — Prolog Requirements Planning and Supplier Selection:
>
> Quando uma oferta apresenta um preço para um determinado número de unidades de stock, esse número representa uma quantidade indivisível de compra ou apenas a base de comparação do preço? Por exemplo, se a oferta indicar 10 € por 6 unidades e forem necessárias 4, podemos propor a compra de 4 unidades com preço proporcional ou devemos comprar 6, mantendo as 2 restantes no saldo hipotético?
>
> Quando nenhum fornecedor consegue entregar a tempo de satisfazer uma necessidade diária, o plano deve propor a entrega mais próxima possível, identificando o atraso, ou apresentar essa necessidade como não satisfeita, sem propor uma compra tardia?
>
> Obrigado pelos esclarecimentos.

### Answer
> Bom dia,
>
> Relativamente às questões apresentadas:
>
> **Quantidade e preço das ofertas:** A quantidade indicada numa oferta representa uma quantidade indivisível de compra. Assim, se uma oferta indicar 10 € por 6 unidades de stock e forem necessárias apenas 4, deverá ser proposta a aquisição de 6 unidades, pelo preço de 10 €, permanecendo as 2 unidades excedentes no saldo hipotético de stock. Devem também ser respeitados os limites diários de fornecimento definidos para a oferta.
>
> **Impossibilidade de entrega atempada:** Quando nenhum fornecedor consegue satisfazer uma necessidade na data prevista, essa necessidade deve ser identificada como não satisfeita no prazo requerido. O plano poderá apresentar uma proposta de aquisição com a data de entrega mais próxima possível, desde que o atraso seja explicitamente identificado. Essa aquisição não deve ser considerada como tendo satisfeito a necessidade original dentro do prazo.
>
> Cumprimentos,
> Paulo Matos

### Notas e Ilações para o Projecto
* **Lote indivisível (`AI02` AC "Select suppliers..."):** `SupplierOffer.stockUnitQuantity` é um **lote indivisível**. O Prolog deve calcular:
  - `orderedQty = ceil(requiredQty / stockUnitQuantity) × stockUnitQuantity`
  - `proposalPrice = (orderedQty / stockUnitQuantity) × offerPrice`
  - Excedente (`orderedQty − requiredQty`) vai para o **saldo hipotético**, não para stock real (consistente com #26 e #28).
* **Limites diários aplicam-se ao lote encomendado (`AI02`, `#28` follow-up):** `dailySupplyLimit` (por oferta por dia) limita a quantidade **encomendada** nesse dia, já arredondada ao lote.
* **Necessidades não satisfeitas atempadamente (`AI02` AC "report late or unmet requirements"):**
  - `unmetNeeds` deve listar a porção que **não** foi satisfeita dentro do prazo.
  - Uma proposta tardia **pode** ser apresentada (com a data de entrega mais próxima possível), mas tem de ser **explicitamente marcada como tardia** e **não conta** como satisfação da necessidade original.
  - Modelação recomendada: `PurchaseProposal { meetsRequiredDate: boolean, expectedDeliveryDate, lateByDays, quantity, supplierCode, productSku }`.
* **DTO de resultado (`AI05`, `AI02`):** Adicionar `meetsRequiredDate: boolean` e `lateByDays: integer` (0 = on-time) a cada `PurchaseProposal`. Manter `unmetNeeds` separado das propostas tardias (uma proposta tardia não "remove" a unmet need original, é informação complementar).
* **Cross-reference:** #26 (read-only), #28 §2 (`stockUnitsPerSale` explícito), #28 follow-up (limites por oferta/dia).

---

## Clarification #31: VIS04 — Reutilização de materiais e critérios de desempenho

* **Question Origin:** Aluno (Bruno Fernandes, 1191264)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (03/11/2026 → 05/11/2026)

### Question
> Bom dia, Professor.
>
> Relativamente à VIS04 - Textures and Materials, gostaríamos de esclarecer dois critérios:
>
> A indicação de que cada objeto deve ter texturas e materiais distintos permite reutilizar o mesmo material em objetos com a mesma superfície, como duas bancadas de inox, ou é esperado um material visualmente diferente para cada objeto?
>
> Para avaliar que as texturas e os materiais não degradam significativamente o desempenho ou o carregamento, existe algum equipamento de referência ou limite definido, ou devemos estabelecer e justificar os critérios usados na demonstração?
>
> Obrigado pelos esclarecimentos.

### Answer
> Bom dia,
>
> Relativamente às questões apresentadas:
>
> **Reutilização de materiais e texturas:** É permitida a reutilização do mesmo material ou textura em diferentes objetos que representem superfícies com características semelhantes. Por exemplo, duas bancadas de inox podem utilizar o mesmo material. O objetivo é garantir uma representação visual coerente e realista dos objetos, não sendo necessário criar um material exclusivo para cada um.
>
> **Otimização do desempenho e tempos de carregamento:** Não é definido um equipamento de referência nem um limite específico de desempenho ou tempo de carregamento. No entanto, devem ser utilizadas técnicas que permitam minimizar os tempos de carregamento e otimizar a utilização de recursos, como, por exemplo, a reutilização de objetos, materiais e texturas previamente carregados de ficheiros, o carregamento assíncrono de recursos e outras estratégias de otimização adequadas. As equipas deverão demonstrar a aplicação destas técnicas e justificar as opções adotadas.
>
> Cumprimentos,
> Paulo Matos

### Notas e Ilações para o Projecto
* **Reutilização de materiais permitida (`VIS04` AC1):** Manter uma **biblioteca de materiais partilhada** (`steel`, `wood_dark`, `ceramic`, `glass`, …) reutilizada em todos os objectos com superfícies semelhantes. Não é necessário material único por objecto. O requisito "distinct textures and materials" (VIS04 AC1) entende-se como "cada objecto tem materiais/cores apropriados", não "material exclusivo".
* **Sem hardware/limiar de referência (`VIS04` AC3):** A equipa define os critérios e **justifica-os** na demonstração. O critério de avaliação é a **aplicação demonstrada** de técnicas de optimização, não um benchmark absoluto.
* **Técnicas esperadas (lista não exaustiva):**
  - Reutilização de materiais/texturas carregados (`Material` registry, `TextureLoader` com cache).
  - Carregamento assíncrono (`GLTFLoader` não bloqueante; `THREE.Cache.enabled = true`).
  - Instanciação (`InstancedMesh`) para objectos repetidos (ex.: pernos, prateleiras).
  - `GLB` auto-contido (ADR-014) para reduzir requests.
* **Documentação:** Registar as decisões e métricas em `docs/sg/3d-assets-guide.md` (já referenciado no ADR-014). Incluir orçamento de performance: nº de draw calls, tamanho total dos GLBs, tempo de carregamento observado.
* **Cross-reference:** ADR-014 (GLB pipeline), VIS04 AC1–AC3, VIS05 (performance de iluminação), VIS06.

---

## Clarification #32: AA01 — Identificador de login, recuperação de password, política de passwords e contas não confirmadas

* **Question Origin:** Aluno (Francisco Sá, 1241341 — 3DE)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (03/11/2026 → 05/11/2026)

### Question
> Dear Client,
>
> We are reviewing AA01 — Local Authentication and would appreciate clarification on the following points:
>
> **Sign-in identifier**
> Should Users sign in with the email address associated with their User account, or should they also be able to use a username or another identifier? Should email addresses be treated as equivalent regardless of uppercase or lowercase letters?
>
> **Password recovery**
> How should a User verify ownership of their account when recovering a password? Should recovery use the email address associated with the User account? How long should the recovery link remain valid?
>
> **Password requirements**
> What requirements should a password meet when a User creates or changes it? Should the same requirements apply when setting a new password during recovery?
>
> **Accounts awaiting email confirmation**
> When a User tries to sign in before confirming their email address, what should happen?
>
> Thank you for your guidance.
>
> Kind regards,
> Francisco Sá/3DE

### Answer
> Bom dia,
>
> Relativamente às questões sobre a AA01 — Local Authentication:
>
> **Identificador:** A autenticação deve utilizar o email, sem distinção entre maiúsculas e minúsculas.
>
> **Recuperação de palavra-passe:** Através do email associado à conta, com uma ligação de utilização única e validade configurável.
>
> **Palavras-passe:** Devem ser aplicadas restrições que garantam um nível de segurança adequado, de acordo com as políticas e boas práticas de segurança estudadas em ASIST. Os mesmos requisitos aplicam-se à criação, alteração e recuperação.
>
> **Contas não confirmadas:** A autenticação deve ser impedida até à ativação da conta, permitindo solicitar o reenvio do email de confirmação.
>
> Cumprimentos,
> Paulo Matos

### Notas e Ilações para o Projecto
* **Login = email case-insensitive (`AA01` AC1):** `POST /api/v1/auth/login` recebe `email`, não `username`. Normalização: `LOWER(email)` na lookup. Já alinhado com `idx_users_email_lower` (KB §20.3). Não adicionar `username` como alternativa de login.
* **Recuperação de password (`AA01` AC "Password recovery"):** Email + link de utilização única + TTL configurável. Introduzir `PASSWORD_RECOVERY_TTL_HOURS` (análogo a `INVITATION_TTL_HOURS` em `#24`). Fluxo: `POST /auth/password-recovery` → email com token → `POST /auth/password-reset` (consome token).
* **Política de passwords (`AA01` AC "Password rules must be documented"):** Aplicar as regras concretas de ASIST (a definir e documentar no `docs/`). As mesmas regras aplicam-se a:
  - Activação (`POST /auth/activate` — #27)
  - Alteração (`PUT /user/me/password` ou equivalente)
  - Recuperação (`POST /auth/password-reset`)
  - Criação em registo público (`POST /auth/register` — #27)
* **Contas `PENDING_REGISTRATION` (`AA01` AC "only active accounts may establish a normal authenticated session"):** Login bloqueado; expor endpoint para **reenviar** o email de activação (ex.: `POST /auth/resend-activation`). Mensagem de erro clara mas sem revelar que a conta existe (não-enumeração — `AA01` AC).
* **Cross-reference:** #24 (invitation TTL), #27 (registo público → `PENDING_REGISTRATION`), #29/#34 (sessão e tokens).

---

## Clarification #33: WEB03/AA05 — Restrições de data-ownership para utilizadores multi-papel

* **Question Origin:** Aluno (FONTES, 1241437)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (04/11/2026 → 05/11/2026)

### Question
> Dear Client,
>
> What are the applicable data-ownership and confidentiality restrictions to users with more than one role exaclty?
>
> e.g., a Staff user that is also a Customer: it will have access to everything both the roles can have or not?
>
> Thank you.

### Answer
> Bom dia,
>
> Um utilizador com vários papéis acumula as permissões atribuídas a cada um deles, mantendo-se as restrições de acesso, propriedade dos dados e confidencialidade aplicáveis.
>
> Por exemplo, um utilizador com os papéis Employee e Customer pode aceder às funcionalidades de ambos, mas o papel Employee não lhe permite aceder indiscriminadamente aos dados pessoais de outros clientes, nem o papel Customer lhe permite consultar dados de outros clientes.
>
> As permissões devem ser verificadas em cada operação, considerando não apenas o papel, mas também os dados a que se pretende aceder.
>
> Cumprimentos,
> Paulo Matos

### Notas e Ilações para o Projecto
* **Acumulação de permissões, não de escopo de dados (`AA03`, `AA05`, `WEB03`, Tabela 1):** Os papéis de um utilizador **somam-se**, mas as restrições de data-ownership e confidencialidade aplicam-se **por operação e por recurso**.
* **Caso concreto (Employee + Customer):**
  - Pode usar funcionalidades de Employee (ex.: consultar catálogo, stock, kitchen viewer — Tabela 1).
  - Pode usar funcionalidades de Customer (ex.: consultar catálogo, gerir os seus próprios dados).
  - **NÃO** pode, como Employee, aceder indiscriminadamente aos dados pessoais de **outros** clientes.
  - **NÃO** pode, como Customer, consultar registos de **outros** clientes.
* **Implicação arquitectural — `RolesGuard` não é suficiente (`AA05` AC4):** É necessária **autorização a nível do recurso** (resource-level authorization). Adicionar:
  - Política de ownership: `currentUser.email === resource.ownerEmail` (para endpoints do próprio) OU
  - `currentUser` tem papel `MANAGER` (que a Tabela 1 autoriza a gerir clientes).
  - Aplicar a endpoints como `GET /customers/:email`, `PUT /customers/:email`, `PUT /customers/:email/dietary-restrictions`, etc.
* **Restrições alimentares (`WEB05`, `WEB03`):** Só visíveis ao próprio (via Customer) ou ao Manager que delas necessite para as suas responsabilidades (Tabela 1: "Access to customer data ... must be limited to the information needed"). Um Employee+Custome r **não** vê as restrições de outros clientes.
* **Implementação sugerida:** `@OwnerCheck({ ownerField: 'email' })` decorator / `CustomerAccessPolicy` (domain service) / verificação explícita no `CustomerService` — a verificação no guard fica como defesa em profundidade, não como única barreira.
* **Cross-reference:** Tabela 1 (Sprint 2), AA03 (multi-role), AA05 §4 ("Users must not access another customer's personal information by changing a record reference or request parameter"), #16 (email unificado).

---

## Clarification #34: AA04/AA01 — Validade do token e renovação automática

* **Question Origin:** Aluno (PINTO, 1241232)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (04/11/2026 → 05/11/2026)

### Question
> Dear Client,
>
> When an User/Customer logs in, a Bearer Token is generated with a time limit.
>
> What should that time limit be? Should it be defined by the team?
>
> Also, should we implement a Token Refresh if the user is still active, even after the token has expired?
>
> Thank you in advance.

### Answer
> Bom dia,
>
> Relativamente às questões apresentadas:
>
> **Validade do token:** O tempo de validade deve ser definido pela equipa, seguindo as boas práticas de segurança estudadas em ASIST. Deve ser configurável sem necessidade de alterar o código da aplicação.
>
> **Renovação do token:** Sim, a renovação automática deve ser suportada enquanto a sessão permanecer válida e o utilizador estiver ativo. A renovação não deve permitir ultrapassar o período máximo de inatividade configurado para a sessão.
>
> Cumprimentos,
> Paulo Matos

### Notas e Ilações para o Projecto
* **Validade do access token (`AA04` AC1):** Definida pela equipa (ASIST), **configurável** (`JWT_EXPIRES_IN` ou equivalente). O valor concreto fica documentado. O default do ADR-004 (15 min) é compatível.
* **Refresh token (`AA04` AC1–AC3):** Renovação automática suportada enquanto:
  - a sessão é válida, **e**
  - o utilizador está activo, **e**
  - não ultrapassa o timeout de inactividade (`SESSION_INACTIVITY_MINUTES` — ver **#29**).
* **Relação com #29:** A renovação **não** pode ultrapassar o limite de inactividade. Ou seja, `refresh` só é aceite se `now − lastActivity < SESSION_INACTIVITY_MINUTES`. Isto evita "sessões eternas" por renovação contínua sem actividade real.
* **Implementação sugerida:**
  - `POST /api/v1/auth/refresh` — recebe refresh token (ou cookie httpOnly), devolve novo access token + (rotable) refresh token.
  - `JwtAuthGuard` aceita access token; `401` dispara refresh no interceptor Angular.
  - Refresh-token persistido por **sessão/dispositivo** (ver #29), revogável no logout daquele dispositivo.
  - `SESSION_INACTIVITY_MINUTES` e `JWT_EXPIRES_IN` são as duas variáveis de configuração a documentar.
* **Cross-reference:** #29 (mesmo mecanismo, perspectiva sessão), ADR-004 (JWT 15 min default), AA04 AC1–AC3.

---

## Clarification #35: BCK10/BCK09 — Stock de pizzas predefinidas

* **Question Origin:** Aluno (VALENTE, 1241264)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (05/11/2026 → 05/11/2026)

### Question
> Good morning,
>
> Should we consider that predefined pizzas have stock, like other products such as mushrooms, beverages? Or are they made in the moment?
>
> Thank you.

### Answer
> Boa tarde,
>
> As pizzas predefinidas são preparadas no momento, pelo que não possuem stock próprio.
>
> O stock é gerido ao nível dos componentes utilizados na sua preparação, sendo as quantidades necessárias descontadas do stock quando a encomenda é confirmada.
>
> Os restantes produtos, como bebidas, podem ter stock próprio, caso estejam configurados para controlo de stock.
>
> Cumprimentos,
> Paulo Matos

### Notas e Ilações para o Projecto
* **Pizzas predefinidas sem stock próprio (`BCK05`, `BCK09`, `BCK10`):** Um `Product` que representa uma `PredefinedPizza`:
  - `isStockControlled = false` (ou, se configurado, é semanticamente irrelevante — recomenda-se **rejeitar** `isStockControlled = true` para `isSellable` que seja `PredefinedPizza`).
  - `stockUnitsPerSale` não se aplica (não faz sentido para pizzas).
* **Stock = componentes (`BCK09`, `BCK10`, `#12`):** O controlo de stock faz-se ao nível dos `PizzaComponent`s. A disponibilidade por tamanho (`v_predefined_pizza_details`, KB §20.2) deriva do stock dos componentes, já implementado.
* **Dedução no momento da confirmação da encomenda (`#12`):** A dedução de stock ocorre quando a encomenda é confirmada, não na criação. Consistente com #12 e com o modelo do `CustomerOrder` (ainda não implementado em Sprint 1/2, mas já modelado).
* **Produtos com stock próprio (`BCK09`, `#36`):** Bebidas, sobremesas, etc. **podem** ter stock próprio se `isStockControlled = true`. Nesse caso, `stockUnitsPerSale` é obrigatório (por #28 §2) e o stock é deduzido por unidade vendida.
* **Cross-reference:** #12 (dedução na confirmação), #28 (só pizzas têm BOM; `stockUnitsPerSale` explícito), #36 (produtos não-pizza em previsões).

---

## Clarification #36: WEB07/AI06 — Inclusão de produtos vendáveis não-pizza nas previsões e planeamento

* **Question Origin:** Aluno (ALMEIDA, 1241273)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (05/11/2026 → 05/11/2026)

### Question
> Since it was confirmed that only pizzas have a Bill of Materials (composed of Pizza Components), should Sprint 2 consumption forecasts, product export, supplier scenarios, and Prolog planning cover only Predefined Pizzas and their Pizza Components, or must standalone non-pizza sellable products (such as drinks or desserts) also be included in forecasts, exports, and replenishment calculations?

### Answer
> Boa tarde,
>
> Os produtos vendáveis que não são pizzas, como bebidas ou sobremesas, também devem ser considerados nas previsões de consumo, exportações, cenários de fornecedores e planos de reposição de stock, quando aplicável.
>
> A distinção está no cálculo das necessidades:
>
> **Pizzas:** As necessidades de stock são calculadas a partir dos componentes e respetivas quantidades definidos na composição de cada pizza.
>
> **Restantes produtos:** As necessidades são calculadas diretamente a partir das quantidades previstas de venda e do consumo de stock configurado por unidade vendida, sem recorrer a uma Bill of Materials (BOM).
>
> Cumprimentos,
> Paulo Matos

### Notas e Ilações para o Projecto
* **Âmbito alargado (`WEB07`, `AI06`, `AI02`):** Previsões de consumo, export de produtos, cenários de fornecedores e planos de reposição incluem **todos** os produtos vendáveis:
  - Pizzas predefinidas (via BOM → componentes)
  - Produtos não-pizza vendáveis (bebidas, sobremesas, …) com ou sem stock próprio
* **Cálculo de necessidades (`AI01`, `AI02`):**
  - **Pizzas:** `forecastQty × ComponentSizeConfiguration.stockUnitsConsumed` por componente (via BOM).
  - **Não-pizza (stock-controlled sellable):** `forecastQty × Product.stockUnitsPerSale` (sem BOM).
  - **Não-pizza (não stock-controlled):** sem necessidade de stock (mas continua a poder constar na previsão/export).
* **Modelação (`WEB07`, `AI06`):**
  - `ConsumptionForecast` entries para produtos não-pizza: `pizzaSize = NULL` (já nullable na migration 014).
  - `stockUnitsPerSale` obrigatório para `isStockControlled ∧ isSellable` (reforça #28 §2; erro explícito se em falta).
  - `ProductExport` inclui todos os produtos relevantes (`GET /api/v1/products/export` — já em Appendix A).
  - `SupplierOffer` é por `(supplier, product)` — tanto pizzas (via componentes) como produtos não-pizza podem ter ofertas.
* **Relatório de planeamento (`AI05`):** `requirements` por produto (não-pizza) e por componente (pizzas), sem dupla contagem.
* **Cross-reference:** #28 (só pizzas têm BOM; `stockUnitsPerSale` explícito), #30 (lotes indivisíveis), #35 (pizzas predefinidas sem stock próprio).

---

## Clarification #37: AI02 — Requirements Planning and Supplier Selection (consolidada)

* **Question Origin:** Aluno (LIMA, 1240625)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (06/11/2026 → 07/11/2026)

### Question
> 1. **Lead time:** Pode ser zero (entrega no próprio dia)? É fixo por supplier ou varia consoante o dia da encomenda?
> 2. **Múltiplos suppliers no mesmo dia:** É possível encomendar a vários suppliers no mesmo dia (produtos iguais ou diferentes)?
> 3. **Comparação e otimização de preços:** Devem considerar-se todas as combinações possíveis ou apenas a de menor custo total? (exemplo: Supplier A 2,30€/un limit 2; B 3,00€/un limit 3; C 1,20€/un limit 50; necessidade 4 unidades → melhor = C, 4,80€)
> 4. **Informação sobre suppliers:** Está disponível apenas para o intervalo do plano ou também para dias anteriores/posteriores? Deve existir informação de dias anteriores à data de execução?
> 5. **Data de referência:** O plano pode ser executado se alguma forecast for de dias anteriores ao atual? Encomendas podem ser executadas antes do dia de execução?
> 6. **Antecipação de encomendas:** O algoritmo deve antecipar encomendas (ex.: N-2) para garantir disponibilidade no dia N?
> 7. **Necessidades satisfeitas com atraso:** Existe limite máximo de atraso? Exemplo: necessário dia 10, entregável dia 18 → propor com atraso de 8 dias ou considerar não satisfeita?
> 8. **Valores simulados:** Que tipos de dados podem ser simulados (forecasts, stock inicial, suppliers, combinações)?
> 9. **Número de forecasts por plano:** Um plano = uma forecast? Várias forecasts com períodos sobrepostos podem coexistir?
> 10. **Continuidade das forecasts:** A forecast pode ter dias sem necessidades? Dias sem necessidades = consumo zero ou "sem informação"?

### Answer
> **Lead time:** Pode ser zero (entrega no próprio dia). É definido por oferta e considerado fixo durante o cenário de planeamento, não variando em função do dia da encomenda.
>
> **Múltiplos fornecedores:** Sim. Podem ser propostas encomendas a vários fornecedores no mesmo dia, para produtos iguais ou diferentes, respeitando os limites de cada oferta.
>
> **Otimização de preços:** O objetivo é apresentar a solução de **menor custo total** que satisfaça as necessidades, respeitando os limites de fornecimento, os lead times e as quantidades indivisíveis de compra. **Não é necessário apresentar todas as combinações possíveis.**
>
> **Informação dos fornecedores e encomendas pendentes:** O planeamento deve considerar as ofertas dos fornecedores **e as encomendas pendentes de entrega**. Estas podem ser fornecidas através de uma lista contendo, por exemplo, o produto, a quantidade e a data prevista de entrega, devendo ser consideradas no cálculo do stock disponível.
>
> **Data de referência:** Cada pedido de planeamento deve incluir as previsões de consumo para o período pretendido. A data de referência pode ser a data atual (por omissão) ou outra data indicada no pedido. **As encomendas propostas não podem ter datas anteriores à data de referência.** Exemplo: pedido com data de referência 10/11 pode incluir previsões de 12 a 20/11; o algoritmo planeia encomendas a partir do dia 10, considerando as necessidades desse período.
>
> **Antecipação de encomendas:** Sim. O algoritmo deve antecipar as encomendas sempre que necessário, considerando os lead times e os limites diários, **desde que as datas propostas não sejam anteriores à data de referência**.
>
> **Necessidades satisfeitas com atraso:** Não existe um limite máximo de atraso predefinido. Podem ser propostas entregas posteriores à data da necessidade, desde que o atraso seja identificado e a necessidade seja considerada não satisfeita no prazo previsto.
>
> **Valores simulados:** Podem ser utilizados valores simulados para as previsões diárias, stock inicial, ofertas dos fornecedores (preços, lead times e limites de fornecimento) e encomendas pendentes de chegada, incluindo combinações destes parâmetros, desde que sejam respeitadas as regras de domínio.
>
> **Número de forecasts:** Cada pedido de planeamento deve considerar uma **única forecast**, composta por entradas que identificam as necessidades de consumo previstas para cada dia do período considerado.
>
> **Continuidade das forecasts:** Não é obrigatório existirem necessidades em todos os dias. Os dias sem necessidades previstas devem ser considerados **dias com consumo previsto igual a zero**, desde que pertençam ao período abrangido pela forecast.
>
> **Nota adicional — Disponibilidade de stock:** Para satisfazer uma necessidade de consumo num determinado dia, os produtos necessários devem estar disponíveis **até ao final do dia anterior**. Exemplo: para consumo no dia 15, os produtos devem estar disponíveis até ao final do dia 14. Esta regra deve ser considerada no cálculo das datas de encomenda e entrega.

### Notas e Ilações para o Projeto
* **Lead time zero (`AI02`, `WEB07`):** `SupplierOffer.leadTimeDays >= 0` já está na migration 014. Sem schema change.
* **Múltiplos suppliers no mesmo dia:** já permitido pelo schema (`supplier_offers` por `(scenario, supplier, product)`). Sem schema change.
* **Menor custo total (`AI02`):** decisão algorítmica no Prolog. Não requer persistência de "todas as combinações" — só a melhor solução. Simplifica o output.
* **Encomendas pendentes de entrega (`AI02`, `WEB07`):** **NOVO INPUT**. O modelo atual (`planning_results`) não tem campo para "pending deliveries". Necessário: (a) incluir no JSON de input do `PlanningService` um array `pendingDeliveries[{productSku, quantity, expectedDeliveryDate}]`; (b) o algoritmo deve somar essas quantidades ao stock disponível a partir da data prevista. **Impacto no schema:** nenhum obrigatório se ficar dentro do `scenario_snapshot` JSONB, mas convém documentar. **Impacto no DTO de `PlanningExecutionRequestDTO`:** adicionar `pendingDeliveries[]`.
* **Data de referência (`AI02`):** `planning_results.reference_date` já existe. A regra "propostas não podem ser anteriores à data de referência" é validação do algoritmo.
* **Antecipação:** já implícito no algoritmo. Sem schema change.
* **Atraso sem limite máximo (`AI02`):** confirma #30. `meetsRequiredDate` + `lateByDays` já modelados.
* **Valores simulados:** `is_simulated` já existe em `planning_results` e `supplier_scenarios`. A extensão a "pending orders simuladas" é apenas JSON.
* **Uma forecast por plano:** já enforced pela FK `forecast_name` em `planning_results`. Sobreposição de forecasts fica fora de âmbito (não suportado).
* **Dias sem necessidades = zero:** **NOVO**. O `ConsumptionForecast` tem `start_date`/`end_date`; o algoritmo deve preencher dias sem entradas com 0. Sem schema change, mas requer validação no `PlanningService`.
* **Stock disponível até ao fim do dia anterior (`AI02`):** **NOVA REGRA SEMÂNTICA**. Hoje não está explicitamente implementada no algoritmo Prolog. Para o dia N, o stock tem de estar disponível até 23:59 do dia N-1. **Impacto:** o `planning.pl` do Prolog tem de incorporar esta regra no cálculo de `deliveryDate` vs `requiredDate`. **Impacto no DTO:** nenhum (regra interna).

---

## Clarification #38: BCK10 — Predefined pizza representation

* **Question Origin:** Aluno (ROCHA, 1231364)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (06/11/2026 → 07/11/2026)

### Question
> Should any active, sellable, non-priced, non-component product be allowed to represent a predefined pizza, or must the represented product be explicitly restricted to a pizza category/role?

### Answer
> Se compreendi corretamente a questão, as pizzas predefinidas são distintas dos restantes produtos vendáveis (Sellable Products), como bebidas ou sobremesas.
>
> As pizzas são preparadas no momento, a partir dos respetivos componentes, não existindo stock de pizzas previamente preparadas. O controlo de stock é realizado exclusivamente ao nível dos componentes utilizados na sua preparação.
>
> Assim, uma pizza predefinida **não deve ser tratada como um produto vendável convencional com stock próprio**.

### Notas e Ilações para o Projeto
* **Reforça #35** (pizzas predefinidas sem stock próprio). O cliente não respondeu diretamente à pergunta sobre "categoria/role" — a resposta é sobre **stock**, não sobre classificação. **Pergunta parcialmente em aberto:** o `Product` que representa uma `PredefinedPizza` tem de estar numa categoria específica (ex.: "Pizzas")? A equipa deve decidir/justificar; `Clarification #08` já dizia que todas as categorias são configuráveis e a categoria é obrigatória — a interpretação mais segura é que a categoria "Pizzas" é apenas uma convenção de seed, não um invariante. Documentar como assunção.
* **Invariante já implementado:** `PredefinedPizzaService` + factory de `Product` já rejeitam `isStockControlled=true` para produtos que sejam pizzas. Migration `018_predefined_pizza_no_stock.sql` (ver nota de colisão de numeração abaixo) formaliza isto.
* **Sem impacto de schema:** o modelo atual já garante `predefined_pizzas.sku → products.sku` com `products.is_stock_controlled = false` para essas linhas (via application + migration).

---

## Clarification #39: WEB04 — User Feedback and Validation

* **Question Origin:** Aluna (Iva Silva, 1241176)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (06/11/2026 → 07/11/2026)

### Question
> 1. Que ações específicas do sistema são classificadas como tendo "consequências significativas" que exigem diálogos de confirmação específicos?
> 2. Qual é o máximo de tempo limite esperado para classificar um pedido como "falha de ligação" e solicitar ao utilizador que tente novamente em segurança?

### Answer
> **Ações com consequências significativas:** Devem ser apresentados diálogos de confirmação para operações que possam provocar **perda de informação**, **alterações difíceis de reverter** ou **consequências relevantes para o negócio**. Exemplos incluem a **eliminação de registos, a desativação de contas de utilizador, a alteração de permissões e o cancelamento de encomendas**. Não é necessário apresentar confirmações para operações comuns de consulta ou edição sem consequências significativas.
>
> **Tempo limite para falhas de ligação:** Não existe um valor máximo obrigatório. A equipa deverá definir um timeout adequado, seguindo boas práticas de usabilidade e considerando o tipo de operação. Quando ocorrer uma falha de ligação, o sistema deverá informar o utilizador e permitir uma nova tentativa em segurança, **evitando a duplicação de operações que possam já ter sido executadas**.
>
> Adicionalmente, seguindo as boas práticas de UI/UX, o sistema deve fornecer feedback adequado após as ações do utilizador, incluindo **indicadores de processamento durante operações demoradas, mensagens de sucesso após a conclusão de uma operação e mensagens de erro claras** quando esta não é concluída. O utilizador não deve ficar sem informação sobre o estado ou resultado da ação realizada.

### Notas e Ilações para o Projeto
* **Escopo de confirmações (`WEB04` AC):** lista mínima = **delete**, **deactivate user**, **role change**, **cancel order** (quando existir). A UI deve implementar `confirm()` / modal genérico antes de disparar `DELETE`, `PATCH` de status/role, e `POST /orders/{id}/cancel` (Sprint 3).
* **Timeout de conexão (`WEB04`):** configurável (e.g., `API_TIMEOUT_MS` no `HttpClient` do Angular, default 30s). Sem valor imposto.
* **Idempotência no retry (`WEB04`, `AI02`, `AI05`):** "evitar duplicação de operações que possam já ter sido executadas" — **isto liga-se a #30** (lotes indivisíveis) e à necessidade de chaves de idempotência nos endpoints `POST`. Recomendação: adicionar `Idempotency-Key` header em `POST /planning/executions` e `POST /supplier-scenarios/{name}/confirm` no OpenAPI (não obrigatório por esta clarificação, mas alinhado).
* **Feedback pós-ação (`WEB04`):** progress indicators + success + error messages obrigatórios. Já coberto pelos ACs; esta clarificação reforça.

---

## Clarification #40: SYS01 — Automated Deployment

* **Question Origin:** Aluno (RIBEIRO, 1240904)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (06/11/2026 → 07/11/2026)

### Question
> 1. O deploy para a VM do DEI deve ser feito pelo GitHub Actions, mas a VM só tem endereços privados. Runners self-hosted estão desativados pelo administrador da organização. Qual é a abordagem esperada?
> 2. Existe uma forma prevista de o GitHub alcançar a VM (VPN, SSH)?

### Answer
> O deployment **não tem de ser realizado obrigatoriamente numa VM do DEI**. Conforme esclarecido pelo RUC de ASIST, podem utilizar máquinas ou serviços de infraestrutura externos ao domínio do DEI, nomeadamente **Microsoft Azure, AWS ou outros fornecedores**.
>
> - Os runners públicos do GitHub Actions **não conseguem aceder diretamente** a máquinas disponíveis apenas em redes privadas do DEI sem um mecanismo de conectividade apropriado.
> - É possível realizar o deployment **através de SSH**, desde que a máquina alojada na cloud do DEI tenha o acesso SSH a partir do exterior ativado e seja utilizado um mecanismo de autenticação seguro, **sem armazenar chaves privadas ou outras credenciais diretamente no repositório**. Devem ser utilizados mecanismos apropriados de gestão de segredos, como os **GitHub Actions Secrets**.
> - Independentemente da solução adotada, devem ser cumpridos os requisitos da US SYS01, incluindo a **automatização do deployment através do GitHub Actions** e a **validação do sistema após a instalação**.
> - A escolha da infraestrutura e da abordagem técnica **fica ao critério da equipa**, devendo ser **devidamente justificada e documentada**.

### Notas e Ilações para o Projeto
* **Deployment multi-cloud (`SYS01`):** Azure / AWS / outra cloud permitido. A escolha deve ser justificada em `docs/asist/sys-deployment.md`.
* **GitHub Actions Secrets (`SYS01` AC):** `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USER` como secrets do repositório. Nunca em `.env` versionado nem em logs.
* **Self-hosted runners:** não é necessário ativar; a solução SSH a partir de runners públicos resolve.
* **Validação pós-deploy (`SYS01` AC):** continua obrigatória (healthcheck, smoke test, ou suite de testes). O pipeline `.github/workflows/ci.yml` já existe mas está **desativado** (`if: false`) — o deployment precisa de um workflow separado (`deploy.yml`) ou de reativar o CI + adicionar job de deploy.

---

## Clarification #41: AI01 — BOM and Aggregate Recursivity

* **Question Origin:** Aluno (ALMEIDA, 1241273)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (06/11/2026 → 07/11/2026)

### Question
> Foi esclarecido que apenas pizzas têm BOM e que restantes produtos são indivisíveis. Contudo, os critérios AI01 referem agregados produzidos internamente, utilização do seu stock antes de expandir ingredientes e receitas potencialmente encadeadas. Esta simplificação aplica-se apenas à Sprint 2, estando a composição recursiva de agregados prevista para a Sprint 3? Na Sprint 2, devemos demonstrar essa capacidade apenas com cenários simulados, ou espera-se também representar componentes produzidos internamente com composição própria para planeamento?

### Answer
> Do ponto de vista do **website e do sistema de gestão LaPrizza**, **apenas as pizzas possuem Bill of Materials (BOM)**, sendo a sua composição definida através dos respetivos Pizza Components. **Esta regra aplica-se à Sprint 2 e manter-se-á nas sprints seguintes.**
>
> Contudo, do lado da **componente de Inteligência Artificial**, poderão existir requisitos específicos relacionados com **BOM recursivas, agregados produzidos internamente e receitas encadeadas**.
>
> O âmbito e a forma de demonstrar estas capacidades na AI01, incluindo a eventual utilização de cenários simulados, **deverão ser esclarecidos diretamente com o RUC de IARTI**.

### Notas e Ilações para o Projeto
* **Domínio LaPrizza (`AI01`, `AI06`):** BOM = só pizzas, **permanentemente** (não é só Sprint 2). Reforça #28 e #36. **Sem schema change.**
* **Domínio IARTI (`AI01`):** o cliente não responde — **redireciona para o RUC de IARTI**. A equipa deve: (a) consultar o RUC de IARTI antes de decidir se implementa agregados recursivos; (b) registar essa consulta numa futura `Clarification #NN` ou num addendum. **Ação pendente.**
* **Impacto no `PlanningService`:** a expansão de agregados (produzidos internamente) **não é obrigatória no domínio LaPrizza**. O Prolog pode implementá-la como cenário simulado se o RUC de IARTI o exigir. O `scenario_snapshot` já permite transportar essa informação como JSON opaco.

---

## Clarification #42: AA05 — Logs Access

* **Question Origin:** Aluno (VALENTE, 1241264)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (07/11/2026 → 07/11/2026)

### Question
> From the specified roles in the system, which ones have access to the denied access logs?

### Answer
> Deve ser feita uma distinção entre **logs aplicacionais** e **logs de sistema ou infraestrutura**:
>
> **Logs aplicacionais:** os registos de tentativas de acesso negadas, associados à autenticação e autorização na aplicação LaPrizza, devem ser consultáveis **apenas por utilizadores com o papel de Administrator**. Os restantes papéis (Manager, Employee e Customer) **não** devem ter acesso a estes registos.
>
> **Logs de sistema ou infraestrutura:** incluem, por exemplo, registos do sistema operativo, servidores, containers e serviços de infraestrutura. O seu acesso deve ser limitado aos **responsáveis técnicos pela administração e operação da infraestrutura**, não estando diretamente associado aos papéis funcionais definidos na aplicação LaPrizza.
>
> Em ambos os casos, devem ser aplicados mecanismos adequados de controlo de acesso e proteção da informação registada.

### Notas e Ilações para o Projeto
* **🔴 TENSÃO COM #04 e com a KB v2.5 §2.1:** a KB v2.5 afirma "No separate ADMINISTRATOR role exists" (citando #04, #24, #25). Esta clarificação #42 **introduz explicitamente o papel de Administrator** para acesso a logs aplicacionais. Combinada com a migration `1793836802000-AdministratorRole.ts`, isto indica que **o `ADMINISTRATOR` passou a existir como role no código** — o que **supersede parcialmente #04**. É preciso: (a) decidir se `ADMINISTRATOR` é um novo valor do enum `UserRole` ou um sinónimo de `MANAGER`; (b) atualizar a KB §2.1, §7.1, §10.1 e §23; (c) registar no histórico de versões da KB.
* **`unauthorized_attempts` (ADR-015):** já existe a tabela. **Falta:** endpoint `GET /api/v1/admin/unauthorized-attempts` (ou similar) restrito a `ADMINISTRATOR`. A KB v2.5 §23 não lista este endpoint.
* **Logs de infraestrutura:** o cliente confirma que ficam fora dos roles funcionais — é responsabilidade de operações (ASIST). Sem impacto no domínio, mas a documentação ASIST (`docs/asist/`) deve referir esta distinção.

---

## Clarification #43: SYS04 — Shared Resource Folder access

* **Question Origin:** Aluno (FONTES, 1241437)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (07/11/2026 → 09/11/2026)

### Question
> For the shared folder, we thought about users having access to it through the website, using the existing login and roles, with the files stored on the DEI server and not exposed directly (only exposed to the back-end). Is this acceptable, or should users access the folder directly on the server?

### Answer
> Sim, a solução proposta é **aceitável**.
>
> Os utilizadores podem aceder à pasta partilhada **através do website LaPrizza**, utilizando os mecanismos de autenticação e autorização da aplicação.
>
> **Não é necessário disponibilizar acesso direto à pasta no servidor**, desde que o **back-end assegure o controlo de acesso** e sejam cumpridos os requisitos funcionais e de segurança definidos.

### Notas e Ilações para o Projeto
* **`SYS04` AC:** acesso via web, mediado pelo back-end. Confirma o desenho: `GET /api/v1/shared-resources/{path}` (com auth) em vez de partilha SMB/NFS direta.
* **Sem impacto de schema:** os ficheiros residem no filesystem do servidor, mas a autorização é feita pela aplicação.
* **Reforça:** "restricted information (customer records, dietary profiles, credentials, backups) must not be placed in the shared folder" (SYS04 AC) — a equipa deve garantir que o `/shared` só tem documentos operacionais, não PII.

---

## Clarification #44: AI02 — Supplier prices per product

* **Question Origin:** Aluno (VALENTE, 1241264)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (07/11/2026 → 09/11/2026)

### Question
> We want to confirm how a supplier's price is defined.
> 1. Can an offer have a different price format per product (price per 1 unit vs price for N units)?
> 2. If an offer is X € for N units, must it be bought in whole packs?

### Answer
> **Preço das ofertas:** Cada oferta de fornecedor define um **preço para uma determinada quantidade de unidades de stock**. Essa quantidade **pode ser 1 ou superior**. Por exemplo, 1,20 € por 1 unidade ou 10 € por 8 unidades. **Cada fornecedor só pode apresentar uma tipologia de fornecimento para o mesmo produto**, não podendo existir diferentes modalidades de preço/quantidade na mesma proposta.
>
> **Quantidades indivisíveis:** Conforme já esclarecido numa resposta anterior neste fórum, a quantidade definida na oferta corresponde a um **lote de compra indivisível**. Por exemplo, se uma oferta estabelece 10 € por 8 unidades e forem necessárias apenas 5, terão de ser adquiridas 8 unidades por 10 €.

### Notas e Ilações para o Projeto
* **Confirma #30** (lote indivisível). **Reforça:** `SupplierOffer.stockUnitQuantity` pode ser > 1 e é o tamanho do lote.
* **🟡 NOVO:** **"Cada fornecedor só pode apresentar uma tipologia de fornecimento para o mesmo produto"** — isto é, para o par `(supplier, product)`, existe **exatamente uma** `SupplierOffer` (não pode haver duas com `stockUnitQuantity` diferentes). O schema atual (`PRIMARY KEY (scenario_name, supplier_code, product_sku)`) **já garante isto**. Sem schema change. Mas a validação no `SupplierScenarioService` deve rejeitar `(supplier, product)` duplicado com mensagem clara (não apenas "duplicate key").
* **Sem impacto de schema.** A semântica `price_amount` + `stock_unit_quantity` já representa "X € por N unidades". O preço unitário efetivo é `price_amount / stock_unit_quantity`, mas a comparação é feita sobre o lote.

---

## Clarification #45: GDPR/Consent Management — Redirect to LAPR5

* **Question Origin:** Aluno (SOUSA, 1241281)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (09/11/2026 → 09/11/2026)

### Question
> 1. **Consent Changes:** If LaPrizza modifies the purpose or conditions of an existing consent, should customers who previously granted it be required to provide their consent again, or should their previous consent remain valid?
> 2. **Consent History:** Should the system maintain a historical record of consent grants, withdrawals, and changes, including timestamps and the corresponding consent versions, or is it sufficient to store only the current consent status?
> 3. **Mandatory Terms Acceptance:** Besides the optional consents mentioned in the System Specification, are there any Terms and Conditions or other agreements that customers must accept to register or use LaPrizza's services? If so, should the system record each customer's acceptance, including the version of the terms accepted?

### Answer
> As questões relacionadas com o Regulamento Geral sobre a Proteção de Dados (RGPD), nomeadamente a sua interpretação e aplicação ao projeto LaPrizza, **deverão ser colocadas diretamente ao docente das aulas TP de LAPR5**, no âmbito dessas aulas.

### Notas e Ilações para o Projeto
* **⚠️ Sem resposta substantiva.** O cliente redireciona para o docente de LAPR5 TP. **Não há nova regra de negócio.** As decisões anteriores da KB sobre consent (`customers.marketing_consent` + `consent_timestamp`) mantêm-se **provisoriamente** válidas até o docente de LAPR5 se pronunciar.
* **Ação pendente:** a equipa deve colocar a questão ao docente de LAPR5 TP. Quando obtiver resposta, registar como `Clarification #NN` ou addendum em `docs/gdpr-policy.md`.
* **Impacto no modelo:** se a resposta exigir "histórico de consentimentos versionado", será preciso nova tabela `consent_records` ou colunas adicionais em `customers`. **Adiar decisão** até resposta do docente.

---

## Clarification #46: Bounded Contexts — One container, multiple contexts (correction)

* **Question Origin:** N/A — Comunicação oficial do cliente no fórum
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas (entre 07/11/2026 e 09/11/2026)

### Announcement
> by lapse the slidedeck for bounded contexts contained an error in slide 24. The general rule is that **one container equals one bounded context**, however it is normal to find **one container hosting more than one bounded context** and that's ok. What must be avoided is **splitting one bounded context across more than one container**.
>
> The slide deck in Moodle has been updated.

### Notas e Ilações para o Projeto
* **Valida o Modular Monolith (ADR-001):** um único container (o back-end NestJS) aloja **múltiplos bounded contexts** (`IdentityAndAccess`, `Customer`, `ProductCatalogue`, `PizzaTaxonomy`, `StockInventory`, `PredefinedPizza`, `CatalogueQuery`, `KitchenConfiguration`, `AIPlanning`). **Conforme.**
* **Anti-padrão a evitar:** dividir um único bounded context por vários containers (precursor de microserviços mal decompostos). A arquitetura atual **não o faz**.
* **Sem impacto de código.** Documentar em `docs/sad/04-principles-and-guidelines.md` (referência ao slide corrigido) e no `ADR-001`.
* **Relação com SYS01/deployment:** confirma que o deployment multi-container (backend + prolog + frontend + postgres) é aceitável, e que o backend pode continuar a ser um único container com vários BCs.

---

---

## Clarification #47: SYS07 — LaPrizza Business Continuity Requirements

* **Question Origin:** Aluno (ALBUQUERQUE, 1230984)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (09/11/2026 → 13/11/2026)

### Question
> 1. Which day-to-day activities are most important to keep running if the system is unavailable?
> 2. Which activities could temporarily pause, and for how long?
> 3. How long could the restaurant manage without the essential activities before the disruption becomes unacceptable?
> 4. How many staff members would need to carry out those essential activities during a disruption?
> 5. If the system had to be restored, how much recent information could the restaurant afford to re-enter or lose?

### Answer
> **Atividades essenciais:** Registo de pedidos, preparação e entrega dos produtos e processamento de pagamentos. Estas atividades deverão continuar, sempre que possível, através de **procedimentos manuais**.
>
> **Atividades não essenciais:** Gestão de produtos, análise de vendas, previsões e planeamento de compras podem ser **suspensos** até à reposição do sistema.
>
> **Tempo de indisponibilidade:** Uma interrupção de **algumas horas** é aceitável, desde que não comprometa o serviço aos clientes. Uma interrupção que afete um **período completo de serviço** é considerada crítica.
>
> **Recursos humanos:** Os colaboradores normalmente afetos ao serviço deverão assegurar as operações essenciais.
>
> **Perda de dados:** **Não é aceitável perder pedidos ou pagamentos confirmados.** Outros dados poderão ser recuperados ou reintroduzidos manualmente.
>
> A equipa deverá **propor e justificar** os mecanismos de continuidade e recuperação adequados.

### Notas e Ilações para o Projeto
* **MBCO concreto (`SYS07` AC):** o MBCO proposto deve articular-se em torno de (a) **RTO target ≤ "algumas horas"** para as funções essenciais (registo de pedidos, preparação, entrega, pagamentos); (b) **operações manuais de fallback** documentadas para cada função essencial; (c) **RPO = 0** para pedidos e pagamentos confirmados (equivalente a `fsync`/replicação síncrona para `customer_orders` e `payments` — este último fora do Sprint 2, mas a arquitetura deve permitir); (d) para dados não críticos, RPO "manual re-entry" é aceitável.
* **Fronteira essencial/não-essencial:** alinha com o resto da KB — `ProductCatalogue`, `PredefinedPizza`, `ConsumptionForecast`, `SupplierScenario`, `PlanningResult` são **não essenciais** durante uma indisrupção; `CustomerOrder` (Sprint 3) e processamento de pagamentos são **essenciais**.
* **`docs/asist/sys-mbco.md`:** o documento deve conter (a) a tabela "atividade → essencial? → procedimento manual de fallback → RTO/RPO target"; (b) **distinguir explicitamente targets propostos vs aprovados** (o cliente ainda não aprovou — pediu "propor e justificar"). A aprovação formal é ação pendente.
* **`SYS08`:** a estratégia de backup já especificada (7 daily / 4 weekly / 12 monthly) é **compatível** com RPO=0 para pedidos confirmados se for complementada com WAL archiving / replicação streaming (a confirmar na demonstração de restore). A equipa deve justificar como atinge RPO=0 para pedidos/pagamentos com a estratégia atual.
* **Sem impacto de schema.** Sem impacto de código direto. Impacto documental em `docs/asist/sys-mbco.md` e `docs/asist/sys-backup-strategy.md`.

---

## Clarification #48: WEB06 — 3D model management

* **Question Origin:** Aluno (VALENTE, 1241264)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (09/11/2026 → 13/11/2026)

### Question
> WEB06 requires that a manager can create, import, edit, delete and activate JSON configurations for the kitchen scene. Is it also required to make 3D model management by the manager, or is the developing team, at this stage, the responsible one to manage the models?

### Answer
> Nesta fase, **não é necessário** disponibilizar ao Manager funcionalidades de gestão dos modelos 3D.
>
> O ficheiro JSON de configuração da cena da cozinha **deverá incluir a informação necessária para localizar e carregar os modelos 3D** utilizados.
>
> A **gestão dos modelos 3D é da responsabilidade da equipa de desenvolvimento**, enquanto o Manager deverá poder **criar, importar, editar, eliminar e ativar as configurações JSON**, conforme definido na WEB06.

### Notas e Ilações para o Projeto
* **Escopo WEB06 (`WEB06` AC):** CRUD + activate de `KitchenConfiguration` (JSON). **NÃO** inclui CRUD de modelos 3D. O Manager gere apenas `KitchenConfiguration.jsonContent`.
* **`jsonContent` continua a referenciar `modelUrl`/`modelReference`** (ADR-014): o JSON aponta para assets `.glb` que a equipa de desenvolvimento coloca em `/assets/3d/models/`. O `KitchenConfigValidationService` continua a validar `modelUrl` pattern `^/assets/3d/models/.+\.glb$` (já definido em `docs/sg/kitchen-schema.json`).
* **Sem schema change.** Sem novo endpoint. Sem impacto no `KitchenConfigurationController` — o CRUD de JSON já está implementado.
* **Documentar em `docs/sg/3d-assets-guide.md`:** referir explicitamente que o Manager só edita JSON; modelos 3D são assets versionados no repositório, geridos pela equipa, referenciados no JSON via URL estável.

---

## Clarification #49: SYS02 — network ranges of the DEI VPN and labs

* **Question Origin:** Aluno (BERNARDINO, 1232120)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (10/11/2026 → 13/11/2026)

### Question
> 1. Which address range does the DEI VPN assign to its clients? We are assuming 10.8.0.0/16, based on the address we were given.
> 2. Which address range do the DEI lab computers use on the internal network?
> 3. The DEI vCenter and DEI cloud VMs are in 10.9.0.0/16, which we also treat as approved.

### Answer
> Os intervalos de endereços IP utilizados pela VPN e pela rede interna do DEI **deverão ser identificados e validados através de testes de conectividade**, realizados a partir dos diferentes ambientes.
>
> Recomenda-se que testem o acesso a partir da **VPN, dos computadores dos laboratórios e das VMs do DEI**, verificando os endereços de origem e confirmando que as regras de acesso funcionam como esperado.
>
> Deverão ter **especial atenção ao facto de existirem redes externas, nomeadamente a Eduroam**, cujos dispositivos podem surgir na rede do DEI com **endereços IP privados**. Assim, a utilização de um endereço privado **não garante, por si só, que a ligação tenha origem numa rede interna autorizada**.
>
> As regras deverão **permitir apenas os acessos necessários**, evitando autorizar intervalos de endereços excessivamente abrangentes.

### Notas e Ilações para o Projeto
* **⚠️ O cliente NÃO confirmou os intervalos** (10.8.0.0/16, 10.9.0.0/16). Redirecionou a validação para **testes de conectividade** realizados pela equipa. **Ação pendente:** a equipa tem de executar esses testes e registar os intervalos confirmados em `docs/asist/sys-network-config.md`.
* **Risco Eduroam (`SYS02` AC):** dispositivos em Eduroam podem aparecer com IP privado (`10.x.x.x`) — **a regra "só aceitar 10.8.0.0/16" não é suficiente**. É preciso combinar com outro critério: (a) VPN com autenticação forte; (b) certificados de cliente; (c) allowlist de IPs públicos + restrição da VPN por utilizador autenticado. Documentar o mecanismo escolhido e justificar por que **não** confia apenas em IP privado.
* **Sem impacto de schema.** Impacto documental em `docs/asist/sys-network-config.md` (já referenciado em §15.3 da KB).
* **Alinhamento com #40 (SYS01):** o deployment via SSH a partir de runners públicos exige que a VM aceite SSH de IPs do GitHub (públicos) ou que se use bastion/VPN. A regra SYS02 restringe a *origem* do acesso; combinar as duas decisões: (a) GitHub Actions → SSH → VM (se exposta com allowlist de IPs do GitHub); (b) ou bastion host + VPN + SSH. Documentar em `docs/asist/sys-deployment.md` como estas duas decisões interagem.

---

## Clarification #50: AA02/AA07 — Primeiro login externo sem telefone, contas existentes e método de ativação

* **Question Origin:** Aluno (Paulo Brito, 1120835)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (11/11/2026 → 13/11/2026)

### Question
> 1. **Telefone no primeiro login externo (AA02).** Na resposta à discussão 7485 indicou que o primeiro login através de um fornecedor externo cria automaticamente uma conta ativa com o papel Customer. Os fornecedores (por exemplo Google) normalmente fornecem o nome e o email, mas não o telefone, que é obrigatório na ficha de cliente (discussão 6830). Como deve ser tratada a ficha de cliente nesse caso? (a) a conta é criada e o telefone é pedido ao utilizador antes de usar as funcionalidades de cliente; (b) a ficha é criada sem telefone e completada mais tarde; ou (c) outra solução que prefira.
>
> 2. **Email já usado por uma conta existente (AA02).** Se alguém se autenticar pela primeira vez com um fornecedor externo e o email verificado já pertencer a uma conta LaPrizza (por exemplo uma conta local criada no registo público, ou uma conta inativa com um convite pendente), o que deve acontecer? (a) Associar automaticamente o fornecedor a essa conta; (b) recusar o login externo e permitir associar o fornecedor só depois de o utilizador entrar com a sua conta (ou, no caso do convite, através do próprio convite); ou (c) outra regra.
>
> 3. **Método de ativação de uma conta convidada (AA07).** Quando o Administrator convida um utilizador, é o Administrator que define se a conta será ativada com palavra-passe local ou através do fornecedor externo, ou o utilizador pode escolher qualquer um dos métodos na página de ativação?

### Answer
> **Telefone no primeiro login externo (AA02):** A conta deverá ser criada automaticamente e ficar **ativa após a autenticação externa bem-sucedida**. Caso o fornecedor **não disponibilize o número de telefone, este deverá ser solicitado ao utilizador antes de poder utilizar as funcionalidades de cliente**.
>
> **Email associado a uma conta existente (AA02):** **Não deverão ser criadas contas duplicadas.** Por razões de segurança, a **associação de um fornecedor externo a uma conta existente deverá exigir a confirmação da identidade do titular** através de um mecanismo de autenticação ou ativação **já associado à conta**. A associação **não deverá ocorrer automaticamente apenas pela coincidência do endereço de email**.
>
> **Método de ativação de contas convidadas (AA07):** Para **contas locais**, o utilizador deverá definir uma palavra-passe e ativar a conta através do email de ativação recebido. Para **contas associadas a fornecedores de identidade externos**, a conta é **automaticamente considerada validada após uma autenticação bem-sucedida** junto do respetivo fornecedor.

### Notas e Ilações para o Projeto
* **🔴 TENSÃO com #27 na parte do telefone:** #27 dizia que o primeiro login externo cria `User ACTIVE + Customer` (com os 3 campos obrigatórios — `firstName`, `lastName`, `phone`). Esta #50 admite que **o telefone pode faltar** no primeiro login externo (Google, etc.) e resolve com **"pedir antes de aceder a funcionalidades de cliente"**. Implicação:
  - O `Customer` pode ser criado com **`phone` nullable temporariamente** e um flag `phonePending`/`profileIncomplete`. **OU** criar `User ACTIVE` mas `Customer` só quando o telefone for fornecido.
  - **Solução recomendada:** `User` criado `ACTIVE` imediatamente; `Customer` criado com `phone = NULL` + `profileCompletedAt = NULL`. `CustomerAccessPolicy` verifica `phone != null` antes de permitir operações de cliente (catálogo é acessível; encomendas e gestão de perfil exigem telefone preenchido).
  - **Impacto no schema:** `customers.phone` deixa de ser `NOT NULL` (migration nova, ou `018` nova — ver nota de colisão). Adicionar `customers.profile_completed_at TIMESTAMPTZ NULL`.
  - **Impacto no `ExternalAuthService`:** após JIT provisioning, se `phone` ausente, redirecionar para `/complete-profile` no SPA. O endpoint `POST /auth/external/callback` pode devolver `{requiresPhoneCompletion: true, accessToken}` em vez de login completo.
* **🔴 TENSÃO com #27 na parte do email duplicado — REFORÇA a KB v2.5 §4.2:** a KB já dizia *"If an account with the same verified email exists without `external_idp_subject`, the login is rejected (account-linking required, prevents takeover)."* Esta #50 **confirma e formaliza**: a associação externa **exige confirmação de identidade** através de mecanismo já associado à conta. **Não há associação automática só por email.** Isto está alinhado com a KB §4.2 — sem contradição, apenas confirmação explícita. **Ação:** atualizar KB §4.2 e ADR-010 para citar #50.
* **🟡 Método de ativação (AA07):** o cliente **não escolhe entre local e externo** — o método é determinado pela **configuração da conta** (local vs. externa). Isto significa:
  - `User` local → ativação por email + password.
  - `User` externo → ativação automática após primeira autenticação bem-sucedida no IdP.
  - O Administrator **não escolhe** o método — o método é definido por como a conta foi criada (local vs. JIT externo). **Impacto no `AA07`:** o endpoint `POST /auth/activate` só se aplica a contas locais; para contas externas não há convite.
* **Impacto no `UserStatus`:** `PENDING_REGISTRATION` continua a aplicar-se só a contas locais (#27). Contas externas JIT nascem `ACTIVE`.
* **Cross-reference:** #27 (JIT provisioning, email unificado, `Customer` obrigatório quando `CUSTOMER` presente), #02 (Customer vs User), #24 (convites, TTL), #32 (password recovery), #45 (GDPR/consent, ainda em aberto).

---

## Clarification #51: AI02 — Prioridade na alocação de uma entrega insuficiente

* **Question Origin:** Aluno (Bruno Fernandes, 1191264). Nota: a pergunta foi originalmente colocada como reply no thread da Clarification #37 (09/11/2026 15:22) e **reaberta em novo tópico** (12/11/2026 10:00) para garantir resposta. Ambas as respostas são **idênticas em substância** (13/11/2026 12:25 e 12:37).
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (09/11/2026 → 13/11/2026)

### Question
> Na AI02, ficaram por satisfazer 3 unidades de queijo do dia 12. Antes do prazo do dia 13 chegam 6 unidades, e o dia 13 precisa de 4. Devemos usar primeiro 3 unidades para cobrir a falta do dia 12, deixando 1 unidade em falta no dia 13, ou reservar 4 unidades para satisfazer o dia 13 a tempo, deixando 1 unidade do dia 12 ainda por satisfazer?
>
> Em ambos os casos, as 3 unidades do dia 12 ficam registadas como não satisfeitas no prazo.

### Answer
> O objetivo é **minimizar os atrasos na satisfação das necessidades previstas**, pelo que deverá ser adotada uma abordagem de planeamento apropriada.
>
> Na situação apresentada, a solução deverá **procurar evitar que necessidades já em atraso comprometam outras que ainda podem ser satisfeitas dentro do prazo**.
>
> A **estratégia adotada deverá ser devidamente justificada**, identificando claramente as quantidades satisfeitas **dentro e fora** dos respetivos prazos.

### Notas e Ilações para o Projeto
* **Prioridade = on-time primeiro (`AI02`):** o algoritmo do Prolog deve, em cada dia, alocar primeiro às necessidades **com prazo ainda por cumprir** (do dia atual e futuros), e só depois às necessidades **já em atraso**. Formalmente: `minimize(totalLateDays)` e, em caso de empate, `maximize(onTimeUnits)`.
* **No exemplo:** as 6 unidades que chegam antes do dia 13 devem ser alocadas **4 ao dia 13 (on-time) + 2 ao dia 12 (late)**. As 3 unidades do dia 12 ficam `unmet` no prazo (mas 2 são cobertas tardiamente — registar como `lateByDays=1` e `quantity=2` na `unmetNeed`). **Não** alocar 3 ao dia 12 primeiro.
* **`planning.pl`:** a função de alocação diária precisa de (a) ordenar necessidades por `(isOverdue ASC, requiredDate ASC)`; (b) alocar stock/deliveries nessa ordem; (c) separar `unmetNeeds` em `unmetOnTime` e `lateFulfilled` para transparência.
* **DTO `PlanningResult`:** os campos `unmetNeeds[]` devem ser enriquecidos com `{quantity, lateFulfilledQuantity, stillUnmetQuantity, lateByDays}` por entrada — a nota "identificando claramente as quantidades satisfeitas dentro e fora dos respetivos prazos" exige esta granularidade. **Impacto no schema:** `planning_results.unmet_needs` é JSONB — sem migration, apenas evolução do payload.
* **Confirma #30** (propostas tardias não removem `unmetNeed` original) e **estende** #30 com a regra de prioridade on-time.
* **Documentar em `docs/resources/procurement_plan.pl` e no AI04 technical report:** a justificação da estratégia (on-time first, late second) e o exemplo do cliente.

---

---

## Clarification #52: Sprint 2 — Aggregates for IARTI, Prices for Guests, Dietary Restrictions (GDPR)

* **Question Origin:** Aluno (CARDOSO, 1200367 — Grupo 3NB-01)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (14/11/2026 → 18/11/2026)

### Question
> **1. Aggregates (AI01/AI02).**
> We understood from the earlier answers that a pizza's Bill of Materials has one level (pizza components), and that predefined pizzas have no stock of their own. The IARTI Sprint B support material, however, builds the BOM with sets of parts (for example a pizza base made of flour, water and yeast) and asks for the highest-level assemblies in stock to be used first.
> - a) In Sprint 2, may the multi-level aggregates (for example pizza dough) exist only in a simulated dataset used for the IARTI demonstration, while the LaPrizza application keeps one-level pizza BOMs?
> - b) If aggregates must exist in the application, who defines them and their recipes and quantities, and can an aggregate have its own stock?
>
> **2. Prices and availability for Guests.**
> The catalogue is public without authentication and must not reveal internal stock.
> - May an unauthenticated Guest see the prices of products?
> - May a Guest see whether a pizza is available, or only the allergens and ingredients?
>
> **3. Dietary restrictions and personal data.**
> Dietary restrictions of a Customer (for example allergies) can reveal health information.
> - Should the team treat them as special-category data under GDPR article 9?
> - If so, should we apply a specific rule, for example explicit consent, restricted access by role or exclusion from the Customer list, or does the answer given for the Customer list (restrictions only on the individual record) cover it?

### Answer
> **Agregados (AI01/AI02):**
>
> **a)** **Sim.** Para efeitos da demonstração dos requisitos de IARTI, podem utilizar um **conjunto de dados simulado com estruturas BOM multinível**, mantendo a aplicação LaPrizza com **BOMs de um único nível** para as pizzas.
>
> **b)** **Não é necessário implementar a gestão de agregados, respetivas receitas ou stocks na aplicação LaPrizza.** Os requisitos específicos de modelação e utilização de agregados no âmbito de IARTI deverão ser esclarecidos com o respetivo docente.
>
> **Preços e disponibilidade para Guests:** os visitantes não autenticados **podem consultar os produtos, a sua disponibilidade e os respetivos alergénios**.
>
> **Restrições alimentares e dados pessoais:** as questões relacionadas com a classificação e o tratamento de dados pessoais ao abrigo do RGPD deverão ser **esclarecidas com o docente de LAPR5 nas aulas TP**, incluindo eventuais requisitos adicionais relativos a dados de saúde.

### Notas e Ilações para o Projeto

#### 2.1. Agregados (AI01/AI02)
* **🟢 RESOLVE a ação pendente da #41:** o cliente confirma explicitamente que BOMs multinível existem **apenas em cenário simulado** para demonstração IARTI. A aplicação LaPrizza mantém **BOM de 1 nível** (`PredefinedPizza → RecipeLine → PizzaComponent × ComponentSizeConfiguration.stockUnitsConsumed`).
* **Sem schema change.** `planning_results.scenario_snapshot` já aceita JSONB opaco — pode transportar BOM multinível simulado.
* **Impacto no `PlanningService`:** o `scenario_snapshot` deve poder transportar BOMs simuladas multinível (arrays de `aggregate_definitions[]`), mantendo a expansão da aplicação em 1 nível. O JSON é opaco do ponto de vista do domínio.
* **Impacto no Prolog:** `prolog/bom.pl` pode incluir predicados para expansão recursiva apenas quando o input assim o exigir (flag `multiLevelBOM: true`). Fora do caminho normal da aplicação.
* **Documentar em `docs/user-stories/AI01/requirements.md` e AI04 technical report:** o cliente distingue explicitamente "IARTI demonstration" de "LaPrizza application". Citar #52.
* **Ação pendente:** consultar RUC de IARTI sobre "quem define os agregados e receitas" — mas para a app LaPrizza **não é necessário**. A resposta (b) diz "esclarecer com docente IARTI".

#### 2.2. Preços e disponibilidade para Guests
* **🟢 Disponibilidade visível para Guests:** `isAvailable: true/false` por tamanho é **público** (confirma #23 §5.1 e #21). Guests **vêem** estado. Guests **NÃO vêem** stock quantity nem `currentUnits`.
* **🟢 Alergénios visíveis para Guests:** já era (catálogo público, BCK11 AC "allergen information"). Confirmação explícita.
* **🟡 GAP NO PREÇO:** a pergunta tinha 3 sub-questões (produtos, preços, disponibilidade). A resposta diz **"consultar os produtos, a sua disponibilidade e os respetivos alergénios"** — mas **não menciona preços explicitamente**. Interpretação razoável:
  - **Preços SÃO visíveis** porque (i) catálogo é público (#21); (ii) BCK11 AC exige "pricing information" no catálogo; (iii) "consultar os produtos" normalmente inclui o preço. 
  - **MAS** o cliente não o disse explicitamente. **Ação:** registar como **assunção documentada** — "preços visíveis para Guests, por interpretação de #21 + BCK11, não obstante #52 não o afirmar explicitamente". Se a equipa quiser certeza, pode re-perguntar; caso contrário, documentar a assunção em `docs/sad/06-api-design-specification.md` §catálogo público.
* **Reforça #23 §5.1:** UI pública mostra estado de disponibilidade; **nunca** detalhes internos de stock. DTO público (`CatalogueItemResponseDTO`) ≠ DTO interno (`CatalogueItemWithStockDTO`).
* **Sem impacto de schema.** Sem impacto de código se o `CatalogueController` já expõe `sizeVariants[].isAvailable` e `allergens[]`.

#### 2.3. Dietary restrictions e GDPR
* **⚠️ Sem resposta substantiva** — cliente redireciona para docente de LAPR5 TP, tal como #45 fez. **Duas clarificações seguidas sem resposta** sobre GDPR — reforça a urgência de consultar o docente.
* **Decisões anteriores provisoriamente válidas:**
  - `customers.marketing_consent` + `consent_timestamp` (KB §17.2, Appendix D).
  - `user_dietary_restrictions` tratado como health data sob Art. 9º-2-a (consentimento explícito) — **já documentado em Appendix D.4 e D.6** da KB.
  - Acesso: só o próprio Customer e o MANAGER que delas necessite (Tabela 1 + #33). Restrições **não aparecem na listagem de clientes** (#23 §1.1).
* **Ação pendente (agora duplicada):** equipa deve consultar o docente de LAPR5 TP **antes do fecho do Sprint 2**. Se o docente exigir histórico de consentimentos versionado, será preciso nova tabela `consent_records` ou `user_dietary_restrictions` versionada. **Adiar decisão** até lá.
* **Cross-reference:** #45 (mesma redireção), #33 (data-ownership), #23 (listagem sem restrições).

---

## Clarification #53: AA04 — Session persistence on reload/new tab and logout across tabs

* **Question Origin:** Aluno (SEMENYUK, 1241202)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (18/11/2026 → 18/11/2026)

### Question
> (a) Se o utilizador recarregar a página (F5) ou abrir a aplicação num separador novo, a aplicação deve mantê-lo autenticado, ou pode pedir-lhe que inicie sessão de novo? (A sessão no servidor continua válida até expirar por inatividade.)
>
> (b) Se o utilizador terminar a sessão num separador, os outros separadores do mesmo browser devem continuar autenticados, ou ficar também sem sessão?

### Answer
> **(a)** A aplicação **deverá manter o utilizador autenticado** após recarregar a página (F5) ou abrir a aplicação num novo separador **do mesmo browser**, desde que a sessão continue válida e não tenha expirado por inatividade.
>
> **(b)** Ao terminar a sessão num separador, a sessão **deverá ser invalidada em todos os separadores do mesmo browser que a partilhem**. O logout **não deverá afetar sessões independentes noutros browsers ou dispositivos**.

### Notas e Ilações para o Projeto

#### 3.1. Refinação de #29 (per-device logout = per-browser, não per-tab)
* **🟢 (a) Persistência em F5 / novo separador:** o JWT **NÃO** pode viver em `sessionStorage` (que é por tab). Deve viver em:
  - **`localStorage`** (partilhado entre tabs do mesmo browser), **OU**
  - **`HttpOnly` cookie** (partilhado automaticamente entre tabs).
  - **Recomendação:** `HttpOnly` cookie para refresh token + `localStorage` para access token (com `storage` event listener), OU ambos em `localStorage` com `BroadcastChannel` para sync. A equipa deve justificar a escolha em ADR-004.
  - **Impacto no `AuthService` (Angular):** ao inicializar a app (`APP_INITIALIZER`), ler token de `localStorage`/cookie e validar (`GET /api/v1/user/me` ou refresh) — se válido, manter autenticado; se inválido, redirecionar para login.

* **🟢 (b) Logout em todos os separadores do mesmo browser:** o logout num tab tem de propagar para os restantes. Mecanismos:
  - **`BroadcastChannel('auth')`**: o tab que faz logout publica `{type: 'logout'}`; os outros tabs escutam e redirecionam para login.
  - **`storage` event**: se o token está em `localStorage`, remover o token dispara `storage` event nos outros tabs.
  - **`localStorage.setItem('auth:logout', Date.now())`** como sinal booleano; todos os tabs escutam.
  - **Server-side revocation (obrigatória):** o logout chama `POST /api/v1/auth/logout` → `auth_sessions.revoked_at = NOW()`. O `JwtAuthGuard` rejeita o JWT nos outros tabs na próxima request (mesmo antes do `BroadcastChannel` propagar). **Dupla defesa: client-side sync + server-side revocation.**
  - **Impacto no `AuthService.logout()`:** chamar endpoint + `localStorage.removeItem('accessToken')` + `BroadcastChannel.postMessage({type: 'logout'})` + redirect.

* **🟢 (b) Logout NÃO afeta outros browsers/dispositivos:** confirma #29 ("logout revokes only the current session"). Cada login cria uma `AuthSession` com `id` UUID. Logout revoga **apenas** essa `AuthSession`. Outros dispositivos têm `AuthSession` diferentes — ficam válidas.

#### 3.2. Impacto no schema `auth_sessions`
* **Sem schema change:** `auth_sessions` já tem `revoked_at`. Logout set `revoked_at = NOW()`. Sem nova coluna.
* **Semântica clarificada:** 1 login = 1 `AuthSession`. Abrir 2 tabs no mesmo browser = 1 `AuthSession` (partilhada). Abrir 2 browsers = 2 `AuthSession` distintas.

#### 3.3. Impacto no `JwtAuthGuard`
* O guard já valida `now < expires_at` AND `now − last_activity_at < SESSION_INACTIVITY_MINUTES` AND `revoked_at IS NULL` (KB §18.4). **Sem alteração no guard.** O comportamento desta clarificação é garantido pelo guard + propagação client-side.

#### 3.4. Impacto na SPA (Angular)
* **F5 / novo tab:** `APP_INITIALIZER` lê `localStorage.accessToken` → valida via `GET /api/v1/user/me` (ou refresh) → se 200, mantém; se 401, redirect login. **Não** assumir autenticado só por existir token — validar server-side.
* **Novo tab num browser sem sessão (e.g., incógnito):** `localStorage` vazio → redirect login. Correto.
* **Logout cross-tab:** `BroadcastChannel` ou `storage` event listener. Quando detetado logout noutro tab, o tab atual limpa tokens + redirect login.
* **Documentar em `ADR-004` (auth)** e `docs/sad/06-api-design-specification.md` (SPA auth flow).

#### 3.5. Cross-reference
* **#29** (inactivity session, per-device logout) — **#53 refina:** "per-device" = "per-browser", não "per-tab".
* **#34** (token refresh) — refresh não bypassa inatividade; continua válido.
* **#24** (role change takes effect immediately via DB) — sem impacto aqui.
* **ADR-004** — atualizar com a clarificação #53.

---

## Clarification #54: AI02 — Meaning of "flag incompatible units" in supplier offers

* **Question Origin:** Aluno (DAVID, 1230487)
* **Answer Origin:** Cliente / Product Owner (Paulo Matos)
* **Date / Reference:** Fórum Geral de Dúvidas / Requisitos (18/11/2026 → 18/11/2026)

### Question
> I would like to clarify one of the acceptance criteria of AI02, which states:
>
> *"Select suppliers from the confirmed supplier scenario. Document and justify the selection criteria, including cost and delivery timing. Compare prices in euros (EUR) on a common stock-unit basis and flag incompatible units; currency conversion is not required."*
>
> My doubt is that I did not understand what is intended with the check for "incompatible units" in this situation.
>
> According to WEB07, each offer specifies a price in euros, the positive integer number of abstract stock units covered by that price and the lead time in days, with supply limits and other attributes being optional; no mandatory field expresses a unit other than the stock unit. The System Specification states that the meaning and granularity of one stock unit are product-specific and assumed to have been previously established by LaPrizza. Following the answers on offers priced for N units (indivisible lots), comparing prices on a common stock-unit basis is clear to me.
>
> Since every offer therefore seems to be expressed in stock units, which situation should be flagged as an incompatible unit? For example, an offer expressed in a unit different from the stock unit of its product, or does this check not apply when all offers are already expressed in stock units?

### Answer
> A interpretação está correta.
>
> No contexto da aplicação LaPrizza, **todas as ofertas dos fornecedores devem utilizar as unidades de stock previamente definidas para cada produto**.
>
> A referência a **"incompatible units"** pretende reforçar que todos os fornecedores devem **expressar as quantidades em unidades inteiras de stock, e não em valores decimais**.
>
> Assim, **se todas as ofertas respeitarem esta regra, não existem incompatibilidades a assinalar**.
>
> **Não é necessário introduzir unidades de medida adicionais na aplicação LaPrizza** para satisfazer este critério.

### Notas e Ilações para o Projeto

#### 4.1. "Flag incompatible units" = validação de inteiros, não novo conceito
* **🟢 RESOLVE o gap na AI02 AC:** "flag incompatible units" **não é** um novo conceito de domínio (não há "unit systems", não há conversão de unidades físicas, não há `MeasurementUnit` aggregate). É uma **regra de validação de input**: `SupplierOffer.stockUnitQuantity` e todas as quantidades em ofertas devem ser **inteiros positivos**.
* **Já implementado no schema:** `supplier_offers.stock_unit_quantity INTEGER NOT NULL CHECK (stock_unit_quantity > 0)` (migration 014, KB §17.8). **Sem schema change.**
* **Reforço:** `daily_supply_limit INTEGER` (nullable). `lead_time_days INTEGER` (#28 §4 — prazos só inteiros). Todos inteiros. Consistente.

#### 4.2. Impacto no `SupplierScenarioService` (import)
* **Validação obrigatória no import de supplier JSON (`WEB07` AC):** o `SupplierScenarioService.import(...)` deve:
  - Rejeitar `stockUnitQuantity` não-inteiro (`1.5`) → `400 Bad Request` com mensagem clara ("stockUnitQuantity must be a positive integer").
  - Rejeitar `price_amount` com mais de 2 casas decimais (já implícito pelo `NUMERIC(10,2)`).
  - Rejeitar `leadTimeDays` não-inteiro (reforço de #28 §4 e #37).
  - Rejeitar `dailySupplyLimit` não-inteiro (se presente).
* **Sem novo código de erro:** `400 Bad Request` (validação de schema) é o mapeamento natural. **Não** é `422` — não há violação de invariante de domínio, apenas formato inválido.

#### 4.3. Impacto no AI04 (technical report)
* **Documentar explicitamente** no relatório IARTI: "flag incompatible units" **é interpretado como validação de inteiros**, não como comparação cross-unit. Citar #54. Isto evita que o professor avaliador procure "lógica de conversão de unidades" inexistente.
* **Ação:** incluir uma secção em `docs/resources/procurement_plan.pl` comments e no AI04 report a explicar que **todas as quantidades são em stock units inteiras**, e que a "incompatibilidade" é apenas a presença de valores decimais (que é rejeitada à entrada).

#### 4.4. Impacto no `prolog/planning.pl`
* **Sem alteração no algoritmo:** o Prolog continua a raciocinar sobre inteiros de stock units. A "incompatibilidade" é pré-filtrada pelo backend antes de chamar o Prolog. O Prolog pode assumir input válido (mas deve rejeitar defensivamente inteiros negativos ou decimais malformados como `422`).

#### 4.5. Cross-reference
* **#28 §4** — prazos inteiros (não decimais). Já enforced.
* **#30** — lote indivisível. `stockUnitQuantity` é o tamanho do lote.
* **#37** — lead time zero permitido; `leadTimeDays >= 0` inteiro.
* **#44** — "cada fornecedor só pode apresentar uma tipologia de fornecimento para o mesmo produto". Confirma: 1 `SupplierOffer` por `(supplier, product)`.
* **ADR-012** (AI Planning Engine) — o contrato REST com o Prolog transporta quantidades em stock units inteiras. Sem alteração.

#### 4.6. Sem impacto em schema, DTO, ou endpoints
* **Conclusão operacional:** nada a mudar no código. A clarificação **fecha o gap interpretativo** e valida a implementação existente. A única ação concreta é **documental**: registar a interpretação no AI04 report e nas comentários do `planning.pl`/`procurement_plan.pl`.

---

## Nota sobre o antigo quadro de tensões

O quadro de tensões que acompanhava a Clarification #54 foi removido por estar desactualizado e misturar estados técnicos com interpretações da equipa. As clarificações #55–#58 abaixo registam as respostas recebidas; o estado de implementação e as acções decorrentes estão no [roadmap actual](../../project_info__1.md), sem substituir as respostas do cliente/docente.

---

## Clarification #55: AI06 — Responsabilidade pela construção da Knowledge Base Prolog

* **Origem da pergunta:** Aluno (Ruben, 1221811)
* **Origem da resposta:** Cliente / Product Owner (Paulo Matos)
* **Data / referência:** Fórum Geral de Dúvidas / Requisitos (18/11/2026 → 19/11/2026)

### Questão

No AI06, o módulo de IA deve obter dados de negócio através de endpoints documentados do backend e de acesso de serviço autorizado, sem ligação directa à base de dados. Foi perguntado se o próprio Prolog deve consultar esses endpoints e construir a sua Knowledge Base, ou se o backend deve recolher e enviar-lhe todos os dados necessários em cada cálculo.

### Resposta do cliente

> Conforme indicado na WEB07, a abordagem esperada é a primeira opção. O backend invoca o predicado Prolog correspondente, passando-lhe a informação de agendamento necessária à execução. O módulo Prolog contacta os endpoints documentados da API do backend, através de acesso de serviço autorizado, para obter os dados necessários à construção da sua base de conhecimento, incluindo produtos, stocks, BOMs, fornecedores e ofertas, entre outros. Poderão ser disponibilizados endpoints especificamente para suportar essa construção. A recolha dos dados de negócio e a construção da base de conhecimento são da responsabilidade do módulo Prolog; o backend não deve preparar e transmitir um conjunto completo desses dados em cada invocação. O módulo Prolog não deve aceder directamente à base de dados da aplicação.

### Precedência e impacto confirmado

Esta clarificação altera o fluxo de dados descrito anteriormente em AI06 e ADR-012: a chamada backend→Prolog mantém-se, mas deve transportar informação de execução/agendamento; o Prolog passa a obter os dados de negócio da API por acesso de serviço autenticado e a construir a KB local por execução. Não especifica o mecanismo de autenticação de serviço, a forma de manter a consistência entre várias leituras, nem a API exacta de replay. Essas decisões de desenho têm de ser registadas separadamente e preservar os requisitos de snapshots imutáveis da ADR-013.

O código e a documentação existentes ainda implementam/documentam o fluxo anterior de payload completo backend→Prolog. Até à sua revisão, AI06 não está conforme com esta clarificação.

---

## Clarification #56: AI02 — Dias da previsão na data de referência ou antes dela

* **Origem da pergunta:** Aluno (David, 1230487)
* **Origem da resposta:** Cliente / Product Owner (Paulo Matos)
* **Data / referência:** Fórum Geral de Dúvidas / Requisitos (18/11/2026 → 19/11/2026)

### Questão

Foi perguntado como tratar, numa execução nova, previsões que contêm dias anteriores ou iguais à data de referência: rejeitar a previsão, ignorar esses dias, ou tratá-los como necessidades que podem ficar por satisfazer ou ser cobertas tardiamente.

### Resposta do cliente

> O replay de uma previsão previamente guardada deve utilizar exactamente os mesmos dados e parâmetros da execução original, incluindo a data de referência, mesmo que esteja no passado. O replay serve para reproduzir os resultados e não deve actualizar automaticamente essa data. Numa nova execução, a data de referência é, por omissão, a data de execução, podendo ser definida explicitamente para uma simulação histórica.

### Limite da resposta

A resposta confirma a semântica de replay e a data por omissão das novas execuções. **Não escolhe expressamente** entre rejeitar, ignorar ou tratar como atrasadas as necessidades de uma nova previsão em dias anteriores/iguais à referência. A interpretação de que esses dias continuam no plano como necessidades atrasadas é uma hipótese de trabalho, não uma resposta confirmada pelo cliente. A equipa deve confirmá-la antes de a codificar como regra definitiva.

O replay deve preservar o snapshot de dados e `referenceDate` originais (Clarifications #28 e #37; ADR-013). Após a #55, a forma como o Prolog obtém esse snapshot no replay requer decisão arquitectural compatível com a consulta autenticada ao backend.

---

## Clarification #57: SYS07 — Validação do MBCO encaminhada para ASIST

* **Origem da pergunta:** Aluno (KOC, 1260154)
* **Origem da resposta:** Cliente / Product Owner (Paulo Matos)
* **Data / referência:** Fórum Geral de Dúvidas / Requisitos (19/11/2026)

### Questão

A equipa pediu validação dos valores propostos para capacidade mínima, interrupção máxima, RTO/RPO e procedimentos manuais de continuidade da SYS07.

### Resposta do cliente

> Os objectivos e procedimentos propostos no âmbito da SYS07 devem ser analisados e validados com o docente da unidade curricular de ASIST, preferencialmente com o docente das aulas PL responsável pela avaliação destes requisitos. A definição de valores concretos para capacidade mínima, tempos máximos de interrupção e objectivos de recuperação, bem como a validação dos procedimentos de continuidade, enquadra-se nessa unidade curricular.

### Impacto confirmado

Os valores constantes de `docs/asist/sys-mbco.md` continuam **propostos** até validação formal em ASIST. Esta resposta não aprova os números apresentados nem determina uma capacidade operacional manual.

---

## Clarification #58: GDPR — Restrições alimentares como dados de saúde (decisão da equipa)

* **Origem da pergunta:** Aluno (Cardoso, 1200367; seguimento da pergunta #52)
* **Origem da resposta:** Docente LAPR5 (Fernandes mtf / Professor JMT)
* **Data / referência:** Fórum Geral de Dúvidas / Requisitos (19/11/2026)

### Questão

Foi perguntado se alergias/restrições alimentares devem ser tratadas como dados de saúde de categoria especial ao abrigo do artigo 9.º do RGPD e se são necessárias salvaguardas específicas, ou se a regra de acesso ao detalhe individual da #52 é suficiente.

### Resposta do docente

> Esta é uma decisão que cabe à equipa, ponderando se se trata verdadeiramente de dados relativos à saúde, na acepção do artigo 9.º do RGPD, ou de informação mais próxima de meras preferências do cliente. A matéria será aprofundada nas próximas aulas, onde as implicações poderão ser discutidas.

### Impacto confirmado

O cliente/docente não escolheu uma classificação nem prescreveu um modelo misto, novo campo de base de dados ou mecanismo de consentimento. A equipa tem de tomar e fundamentar a decisão, considerando a natureza dos dados, as limitações actuais do modelo e as salvaguardas implementadas. A política existente deve identificar claramente a classificação como provisória até essa decisão e à discussão em aula.
