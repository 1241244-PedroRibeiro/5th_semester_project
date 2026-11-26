# Guia de defesa ARQSI — Pedro Ribeiro

## Como usar este guia

O percurso é: SPA e navegação; identificação das tuas histórias; fluxos completos de frontend/backend; testes; ADRs; demonstração e perguntas. Cada excerto tem ligação directa ao ficheiro-fonte junto do bloco. Os excertos são reduzidos, com as regras e nomes actuais.

### Fronteiras da contribuição

| Período | Histórias de foco principal | O que defender |
| --- | --- | --- |
| Sprint 1 | [BCK03](../../user-stories/BCK03/requirements.md), [BCK04](../../user-stories/BCK04/requirements.md), [BCK05](../../user-stories/BCK05/requirements.md), [BCK06](../../user-stories/BCK06/requirements.md) | Categorias, alergénios, produtos e tamanhos de pizza |
| Sprint 2 | [AI01](../../user-stories/AI01/requirements.md), [AI02](../../user-stories/AI02/requirements.md), [AI06](../../user-stories/AI06/requirements.md), [SYS02](../../user-stories/SYS02/requirements.md), [SYS03](../../user-stories/SYS03/requirements.md) | BOM, planeamento, ligação Backend–Prolog, rede de entrada e saída |
| Transversal/apoio | Autenticação externa, activação/recuperação, documentação e apoio a SYS04–SYS07 | Explicar integração, sem assumir trabalho exclusivo |

A atribuição de Sprint 1 está no [processo Sprint 1](../progress/sprint1/1241244-development-process.md); o Sprint 2 separa foco individual de apoio no [processo Sprint 2](../progress/sprint2/1241244-development-process.md).

---

# 1. A aplicação de ponta a ponta

## 1.1 O que é a SPA

SPA significa *Single Page Application*. O browser carrega a aplicação Angular uma vez; Router troca os componentes sem pedir novo HTML a cada clique. Continua a haver pedidos HTTP para os dados. Navegação e operações de negócio são coisas diferentes.

**Fonte: [frontend/src/app/app.html](../../../frontend/src/app/app.html)**

```html
<app-language-switcher />
<router-outlet />
```

`app-language-switcher` conserva o selector de idioma. `router-outlet` é o local onde Angular insere o componente da rota; não contém todos os ecrãs.

**Fonte: [frontend/src/main.ts](../../../frontend/src/main.ts)**

```typescript
bootstrapApplication(App, appConfig)
```

**Fonte: [frontend/src/app/app.config.ts](../../../frontend/src/app/app.config.ts)**

```typescript
provideTranslateService({
  fallbackLang: 'en',
  loader: provideTranslateHttpLoader({
    prefix: '/i18n/',
    suffix: '.json',
    failOnError: true,
    useHttpBackend: true,
  }),
}),
provideAppInitializer(() => inject(Language).initialize()),
provideRouter(routes),
provideHttpClient(withInterceptors([authInterceptor])),
```

`bootstrapApplication` arranca a aplicação standalone; `provideRouter` regista as rotas; `provideHttpClient` instala o interceptor de autenticação. O loader procura `/i18n/<idioma>.json`. `useHttpBackend` evita que carregar traduções passe pelo interceptor normal.

## 1.2 Rotas, carregamento e redireccionamentos

As rotas comuns de activação, callback e acesso negado juntam-se às rotas do Backoffice e Frontoffice; a rota wildcard redirecciona caminhos desconhecidos.

**Fonte: [frontend/src/app/app.routes.ts](../../../frontend/src/app/app.routes.ts)**

```typescript
export const routes: Routes = [
  { path: 'auth/activate', loadComponent: () => import(...).then(m => m.ActivateAccountPage) },
  { path: 'auth/callback', loadComponent: () => import(...).then(m => m.AuthCallbackPage) },
  { path: 'unauthorized', loadComponent: () => import(...).then(m => m.UnauthorizedPage) },
  ...backofficeRoutes,
  ...frontofficeRoutes,
  { path: '**', redirectTo: '' },
];
```

`loadComponent` usa lazy loading: o componente só é carregado quando a rota é aberta.

**Fonte: [frontend/src/app/backoffice/backoffice.routes.ts](../../../frontend/src/app/backoffice/backoffice.routes.ts)**

```typescript
{
  path: 'backoffice',
  canActivate: [staffGuard],
  loadComponent: () => import('./shared_components/layout/backoffice')
    .then(m => m.Backoffice),
  children: [
    {
      path: 'ai-config',
      canActivate: [managerGuard],
      loadComponent: () => import('./pages/ai-config/ai-config-page')
        .then(m => m.AiConfigPage),
    },
    {
      path: 'product-categories',
      canActivate: [managerGuard],
      loadComponent: () => import('./pages/product-categories/product-categories-page')
        .then(m => m.ProductCategoriesPage),
      data: { resource: productCategoriesConfig },
    },
    {
      path: 'pizza-sizes',
      canActivate: [restaurantGuard],
      loadComponent: () => import('./pages/pizza-sizes/pizza-sizes-page')
        .then(m => m.PizzaSizesPage),
      data: { resource: pizzaSizesConfig },
    },
  ],
}
```

A rota pai exige staff activo; as filhas restringem funções. AI Config e categorias exigem Manager; tamanhos permitem acesso à área de restaurante, mas a escrita continua Manager-only. `data.resource` injecta a configuração no componente reutilizável.

**Fonte: [guards.ts](../../../frontend/src/app/backoffice/core/auth/guards.ts)**

```typescript
export const staffGuard: CanActivateFn = (_, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (auth.staff()) return true;
  if (auth.user()?.roles.includes('CUSTOMER')) return router.createUrlTree(['/']);
  return router.createUrlTree(['/backoffice/login'], {
    queryParams: { returnUrl: state.url },
  });
};

export const managerGuard: CanActivateFn = () =>
  inject(Auth).manager() ||
  inject(Router).createUrlTree(['/unauthorized']);
```

Customer regressa ao Frontoffice; sessão ausente vai ao login com `returnUrl`; função insuficiente vai para `/unauthorized`. Guards orientam navegação, não são segurança suficiente: a API tem de validar também.

## 1.3 Sessão, interceptor e servidor

**Fonte: [auth.ts](../../../frontend/src/app/shared_components/core/auth/auth.ts)**

```typescript
readonly session = signal<Session | null>(this.restore());
readonly user = computed(() => this.session()?.user ?? null);
readonly manager = computed(
  () => this.user()?.roles.includes('MANAGER') ?? false,
);
readonly staff = computed(
  () => this.user()?.status === 'ACTIVE' &&
    this.user()?.roles.some(role =>
      ['ADMINISTRATOR', 'MANAGER', 'EMPLOYEE'].includes(role)),
);
```

A sessão fica em `localStorage` ou `sessionStorage`, conforme “lembrar-me”, e sincroniza separadores. `isValidSession` apenas descodifica JWT localmente e confere `exp`; não valida assinatura. A validação segura ocorre no Backend.

**Fonte: [auth.ts — interceptor](../../../frontend/src/app/shared_components/core/auth/auth.ts)**

```typescript
const protectedApi = request.url.startsWith('/api/') && ![
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/password-recovery',
  '/api/password-recovery/new_pass',
].includes(request.url);

const authenticatedRequest = token && protectedApi
  ? request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    })
  : request;
```

O interceptor não anexa bearer ao login/recuperação. Em `401`, tenta renovar e repetir uma vez (o código completo marca retry para evitar ciclo); se falhar, limpa sessão e redirecciona ao login. Em `403`, envia para acesso negado. `401` = não autenticado; `403` = autenticado sem permissão.

**Fonte: [backend/src/presentation/auth.module.ts](../../../backend/src/presentation/auth.module.ts)**

```typescript
{ provide: APP_GUARD, useClass: AuthGuard },
{ provide: APP_GUARD, useClass: RolesGuard },
{ provide: APP_GUARD, useClass: StatusGuard },
```

O servidor verifica autenticação, função e estado. Assim, invocar API fora do browser não contorna acesso.

## 1.4 Como os dados aparecem

1. Router cria página e passa configuração.
2. Componente chama API.
3. Interceptor acrescenta token, se necessário.
4. Nginx encaminha `/api/...` ao Backend.
5. Controller interpreta HTTP; serviço de aplicação valida/coordenada o caso de uso.
6. Domínio impõe invariantes; repositório lê/grava PostgreSQL.
7. DTO regressa, signals actualizam e Angular redesenha HTML.

Na página genérica, `<code>switchMap</code>` substitui pedidos antigos, `takeUntilDestroyed` limpa subscrições, `catchError` apresenta falha e `finalize` termina loading. Consulta [Resources.ts](../../../frontend/src/app/backoffice/shared_components/resource-management/resources.ts), [template](../../../frontend/src/app/backoffice/shared_components/resource-management/resources.html) e [BackofficeApi](../../../frontend/src/app/backoffice/core/api/backoffice-api.ts). O browser não liga directamente à base de dados.

---

# 2. Casos de uso e relação com as US

## 2.1 Sprint 1

| US | Caso de uso | Papel | Integração |
| --- | --- | --- | --- |
| [BCK03](../../user-stories/BCK03/requirements.md) | Criar/consultar/pesquisar/editar/remover categorias; impedir remoção referenciada | Manager escreve; consulta pública | Classificação de produtos e filtros de catálogo |
| [BCK04](../../user-stories/BCK04/requirements.md) | Gerir alergénios e impedir remoção se produto/restrição os usar | Manager escreve; consulta pública | Produtos e restrições alimentares |
| [BCK05](../../user-stories/BCK05/requirements.md) | Gerir SKU, papel vendável/componente, tipo, preço, alergénios, filtros e estado activo | Manager escreve; consulta pública | Catálogo, receitas, stock, planeamento |
| [BCK06](../../user-stories/BCK06/requirements.md) | Gerir tamanhos; desactivar e preservar referências de configuração/receitas | Manager escreve; consulta pública | Configuração de consumo e variantes de pizza |

BCK03 dá taxonomia, BCK04 dados de segurança alimentar, BCK05 regista itens e usa categoria/alergénios, BCK06 fornece tamanhos às configurações/receitas.

## 2.2 Sprint 2

| US | Caso de uso | Actor | Integração |
| --- | --- | --- | --- |
| [AI01](../../user-stories/AI01/requirements.md) | Calcular BOM a partir de SKUs, tamanhos e quantidades | Manager/API | Backend valida; Prolog calcula; Backend persiste |
| [AI02](../../user-stories/AI02/requirements.md) | Configurar previsão/ofertas, confirmar cenário, executar e consultar/repetir histórico | Manager | WEB07 fornece previsão; AI06 snapshot; Prolog simula |
| [WEB07](../../user-stories/WEB07/requirements.md) | Configurar previsão e cenário de fornecedores; executar e consultar planeamento no Backoffice | Manager | UI chama API de gestão/planeamento; AI02 calcula; AI06 expõe dados ao Prolog |
| [AI06](../../user-stories/AI06/requirements.md) | Servir inputs internos autenticados e coerentes sem PII | Serviço Prolog | Endpoint com `REPEATABLE READ` |
| [SYS02](../../user-stories/SYS02/requirements.md) | Restringir entradas à VM e registar recusas | Administrador | Debian/nftables/Docker/Nginx mais auth da app |
| [SYS03](../../user-stories/SYS03/requirements.md) | Declarar e validar destinos de saída; aplicar política e auditoria | Administrador | YAML/schema/DNS/nftables |

O [processo Sprint 2](../progress/sprint2/1241244-development-process.md) identifica explicitamente as tuas tarefas principais e separa o apoio transversal.

### 2.3 Ligações transversais úteis na defesa

Estas histórias não substituem o foco nas tuas BCK, AI e SYS. São partes da mesma aplicação que explicam como o Manager entra, acede ao planeamento e como uma conta de equipa é activada.

#### WEB07 — a página que inicia o fluxo de planeamento

WEB07 é a camada de interface do caso de uso AI02. No código actual, a página standalone `AiConfigPage` mantém estado por signals para separadores, previsões, cenários, selecção de execução, resultado e histórico. A validação no browser melhora o feedback, mas o Backend volta a validar datas, referências, valores e a confirmação do cenário.

O percurso real é: Manager abre `/backoffice/ai-config` → o guard de Manager protege a rota → a página lê produtos, tamanhos, previsões e cenários → Manager cria/edita uma previsão ou cenário → confirma o cenário → escolhe ambos e executa → `PlanningService` chama Prolog → a execução e os snapshots são guardados → a página mostra o resultado e histórico. O botão de replay envia a identificação da execução original; o Backend é que recupera os snapshots.

**Excerto da página, com ligação ao ficheiro completo:** [AiConfigPage — validação e gravação](../../../frontend/src/app/backoffice/pages/ai-config/ai-config-page.ts)

```typescript
saveForecast(): void {
  const errors = this.validateForecast(this.forecast());
  if (errors.length) { this.errors.set(errors); return; }
  this.run(
    () => this.api.saveForecast(this.forecast(), this.editingForecast()),
    this.translate.instant('Forecast saved.'),
  );
}

confirmScenario(value: SupplierScenario): void {
  this.run(
    () => this.api.confirmScenario(value.name),
    this.translate.instant('Scenario confirmed and available for planning.'),
  );
}
```

**Porquê validar nos dois lados:** a UI pode ser contornada; uma chamada HTTP pode ser fabricada; e produtos, tamanhos ou cenários podem mudar depois de a página carregar. Assim, o formulário fornece mensagens rápidas e o serviço de aplicação mantém a regra de negócio autoritativa.

Ao executar, a página envia apenas a selecção de nomes e a data opcional. Não envia para o browser uma decisão de compra nem altera o stock real:

```typescript
this.api.executePlanning({
  forecastName: this.selectedForecast(),
  scenarioName: this.selectedScenario(),
  ...(this.referenceDate() ? { referenceDate: this.referenceDate() } : {}),
}).subscribe({
  next: (value) => this.result.set(value),
  error: (error) => { this.showError(error); this.busy.set(false); },
  complete: () => { this.busy.set(false); this.loadHistory(); },
});
```

O Controller exige sessão válida e papel `MANAGER`; `PlanningService` exige que o cenário esteja confirmado, valida produtos activos e `stockUnitsPerSale` quando aplicável, invoca o motor e persiste o resultado. Para esta defesa, distingue sempre **WEB07 (configuração e interface)** de **AI02 (cálculo/planeamento)** e **AI06 (fonte interna de dados para o Prolog)**.

**Ficheiros para seguir a chamada:** [rotas e guard de Manager](../../../frontend/src/app/backoffice/backoffice.routes.ts) · [template WEB07](../../../frontend/src/app/backoffice/pages/ai-config/ai-config-page.html) · [API do Backoffice](../../../frontend/src/app/backoffice/core/api/backoffice-api.ts) · [controller de gestão](../../../backend/src/presentation/http/controllers/PlanningManagementController.ts) · [controller de execução/histórico](../../../backend/src/presentation/http/controllers/PlanningController.ts) · [serviço de planeamento](../../../backend/src/application/planning/PlanningService.ts) · [contrato WEB07](../../user-stories/WEB07/requirements.md).

#### AA02 — autenticação externa sem entregar a palavra-passe ao LaPrizza

AA02 usa OpenID Connect. O browser sai temporariamente da SPA para o fornecedor de identidade; o LaPrizza recebe o callback e só depois cria a sessão interna. A palavra-passe do fornecedor não é enviada nem guardada pela aplicação.

1. O botão de login encaminha para `GET /api/auth/external/login`.
2. `ExternalAuthController` cria `state`, `nonce` e `codeVerifier`; guarda o contexto assinado num cookie `httpOnly`, curto e `sameSite=lax`; envia ao IdP um `codeChallenge` derivado do verificador.
3. O IdP autentica a pessoa e redirecciona para o callback com `code` e `state`.
4. O Backend verifica a assinatura/expiração do cookie de contexto e troca o código através do adaptador OIDC; a intenção é validar estado e prova PKCE antes de aceitar a identidade.
5. `ExternalAuthService` exige que o claim `email_verified` seja verdadeiro e associa a identidade pelo `sub` estável. Se o email já pertencer a uma conta local, exige ligação explícita; não faz associação automática apenas por coincidência de email.
6. O Backend cria um código de troca interno, de curta duração e uso único. A SPA troca esse código por uma sessão LaPrizza, guarda-a em `Auth` e navega conforme o papel.

**Excerto do início do fluxo:** [ExternalAuthController](../../../backend/src/presentation/http/controllers/ExternalAuthController.ts)

```typescript
const state = randomBytes(16).toString('hex');
const nonce = randomBytes(16).toString('hex');
const codeVerifier = randomBytes(32).toString('base64url');
const codeChallenge = createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

res.cookie('oidc_ctx', cookieValue, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 5 * 60 * 1000,
});
```

`state` deve correlacionar pedido e resposta e impedir login CSRF; `nonce` deve ligar a resposta de identidade ao pedido; PKCE dificulta a utilização de um código interceptado; `httpOnly` impede leitura do cookie pelo JavaScript da página. O controller verifica o cookie assinado antes de continuar; a comparação de `state` e a validação do `nonce` são lacunas da implementação actual, detalhadas abaixo.

**Ressalva importante ao explicar a implementação existente:** [OidcClientAdapter](../../../backend/src/infrastructure/security/OidcClientAdapter.ts) envia o `code_verifier` ao endpoint de tokens, mas actualmente extrai claims com `jwt.decode()` (sem verificar a assinatura do ID token) e não compara `state` recebido com o `state` guardado no cookie nem valida o `nonce` da resposta. Portanto, explica os controlos que o fluxo pretende implementar, mas não afirmes que o código actual completa toda a validação criptográfica e anti-CSRF exigida por OIDC. Esta é uma lacuna de segurança que deve ser corrigida no adaptador antes de o fluxo ser considerado robusto.

No caso de primeiro acesso externo, o serviço exige email verificado, guarda o `sub` externo e cria uma conta interna Customer; uma conta local com o mesmo email resulta em `account_linking_required`. A identidade externa é apenas a prova de autenticação; as permissões continuam a ser os papéis internos LaPrizza.

**Ficheiros para seguir o percurso:** [botão de login de staff](../../../frontend/src/app/backoffice/shared_components/staff-auth-form/auth-page.ts) · [callback SPA](../../../frontend/src/app/shared_components/pages/auth-callback/auth-callback.ts) · [sessão interna](../../../frontend/src/app/shared_components/core/auth/auth.ts) · [controller OIDC](../../../backend/src/presentation/http/controllers/ExternalAuthController.ts) · [regras de associação/provisionamento](../../../backend/src/application/auth/ExternalAuthService.ts) · [adaptador OIDC](../../../backend/src/infrastructure/security/OidcClientAdapter.ts) · [requisitos AA02](../../user-stories/AA02/requirements.md) · [Bruno AA02](../../../backend/tests/bruno/LaPrizza/AA02-ExternalAuth/README.md).

#### AA07 — activar um convite local com um token limitado

AA07 fecha a passagem de uma conta criada/convidada e ainda inactiva para uma conta utilizável. O link contém um token aleatório, ligado à conta, com validade, revogação e uso único. O token não é um JWT de sessão: autoriza somente a operação de activação para a qual foi emitido.

1. Um Manager convida uma conta; o Backend emite um token aleatório de 32 bytes, regista a finalidade e a expiração, invalida convite local anterior e envia o link por email.
2. A página `/activate-account?token=…` consulta `GET /api/auth/invitation/:token`; mostra só o email mascarado e estado da validade.
3. Para convite local, o utilizador introduz e confirma a palavra-passe. O formulário verifica a correspondência; o serviço valida o token activo, finalidade, estado da conta e política da palavra-passe.
4. O hash é calculado no servidor; `activateLocal` consome o token e activa a conta. O token usado, revogado ou expirado não pode ser repetido.
5. Convites destinados a IdP externo não passam pelo endpoint local: seguem `/activate-external`, e o callback OIDC confirma que o email verificado corresponde ao convite.

**Excerto da separação entre finalidade e activação local:** [AuthService](../../../backend/src/application/auth/AuthService.ts)

```typescript
const invitation = await this.activationInvitations.getActiveInvitation(dto.token);
if (invitation.purpose !== 'LOCAL_ACCOUNT_ACTIVATION') {
  throw new UnprocessableEntityException(
    'This invitation must be completed through the external identity provider.',
  );
}
if (!isValidPassword(dto.password)) {
  throw new UnprocessableEntityException(AuthFailure.WeakPassword);
}
const passwordHash = await this.hasher.hash(dto.password);
await this.invitations.activateLocal(
  invitation.token, user.username.value, passwordHash,
);
```

Esta separação evita que o fluxo de activação local seja usado para concluir um convite OIDC. A UI melhora a experiência, mas as verificações decisivas — token activo, finalidade, estado e força da palavra-passe — estão no Backend.

**Ficheiros de apoio:** [página de activação local](../../../frontend/src/app/shared_components/pages/activate-account/activate-account.ts) · [página de activação OIDC](../../../frontend/src/app/shared_components/pages/activate-external/activate-external.ts) · [AuthController](../../../backend/src/presentation/http/controllers/AuthController.ts) · [ActivationInvitationService](../../../backend/src/application/auth/ActivationInvitationService.ts) · [requisitos AA07](../../user-stories/AA07/requirements.md) · [Bruno AA07](../../../backend/tests/bruno/LaPrizza/AA07%20Account%20Activation/README.md).

**Como estas histórias se relacionam com as tuas:** AA02 permite iniciar sessão e obter um token LaPrizza; os guards da SPA e os guards do servidor continuam a limitar WEB07, BCK e outras páginas. AA07 assegura que a criação de uma conta de equipa não equivale a uma conta já autenticada: a pessoa tem de provar posse do convite e concluir o método correspondente. Nenhuma destas histórias substitui a autorização que cada endpoint continua a aplicar.

---

# 3. Sprint 1 — frontend e backend das BCK

## 3.1 Gestão genérica: por que e como

Categorias, alergénios e tamanhos partilham tabela, pesquisa, paginação, formulário, confirmação e feedback. A rota passa configuração para o mesmo componente, reduzindo duplicação.

**Fontes: [Resources.ts](../../../frontend/src/app/backoffice/shared_components/resource-management/resources.ts), [Resources.html](../../../frontend/src/app/backoffice/shared_components/resource-management/resources.html), [configuração categorias](../../../frontend/src/app/backoffice/pages/product-categories/product-categories.config.ts), [alergénios](../../../frontend/src/app/backoffice/pages/allergens/allergens.config.ts), [tamanhos](../../../frontend/src/app/backoffice/pages/pizza-sizes/pizza-sizes.config.ts)**

```typescript
this.route.data.subscribe(data => {
  this.config.set(data['resource']);
  this.page.set(1);
  this.search.set('');
  this.load();
});
```

Ao trocar configuração, limpa pesquisa/página e recarrega. A pesquisa é atrasada 250 ms; `switchMap` evita resposta antiga sobrescrever nova; subscrições terminam com o componente.

O formulário impede nome vazio antes do pedido; as regras reais são repetidas no servidor.

**Fonte: [Resources.ts — validação](../../../frontend/src/app/backoffice/shared_components/resource-management/resources.ts)**

```typescript
const name = this.draft.name?.trim() ?? '';
if (!name) {
  this.fieldErrors.set({
    name: 'Name is required. Enter a valid name before saving.',
  });
  return;
}
```

**Fonte: [BackofficeApi.saveResource](../../../frontend/src/app/backoffice/core/api/backoffice-api.ts)**

```typescript
const body = path === 'categories' && !original
  ? { categoryName: value.name, description: value.description }
  : value;
return original
  ? this.http.put(`/api/${path}/${encodeURIComponent(original)}`, body)
  : this.http.post(`/api/${path}`, body);
```

O adaptador converte o campo genérico `name` para o contrato particular `categoryName` na criação. `original` diferencia edição de criação. Esta separação evita espalhar peculiaridades do contrato no componente genérico.

**Justificação para defender:** reutilização conserva UX e reduz duplicação; configurações mantêm diferenças declarativas; adaptador resolve incompatibilidades; domínio permanece no Backend. Custo: é preciso tratar explicitamente casos especiais como categoria.

## 3.2 BCK03 — categorias

Fluxo: Manager abre `/backoffice/product-categories`; rota verifica `managerGuard`; `Resources` carrega categorias; adaptador chama `/api/categories`; controller valida corpo e encaminha; service e repository aplicam identidade/persistência; resposta actualiza tabela.

**Fonte: [CategoryController](../../../backend/src/presentation/http/controllers/CategoryController.ts)**

```typescript
@Get()
@Public()
async getAll(@Query('search') search?: string, ...) {
  const result = await this.categoryService.getCategories(search);
  return result.getValue();
}

@Post()
@UseGuards(RolesGuard)
@Roles(UserRole.MANAGER)
@HttpCode(HttpStatus.CREATED)
async addCategory(@Body() body: unknown): Promise<CategoryDto> {
  const name = this.readCategoryName(body);
  return this.productCategories.addCategory(name, description);
}
```

Consulta pública apoia catálogo; mutação exige Manager e responde 201. Corpo entra como `unknown` para ser validado em runtime. **Assimetria real:** criação usa `ProductCategoryService`; outras operações usam `CategoryService`. Não a escondas.

**Fonte: [CategoryService — impedir remoção referenciada](../../../backend/src/application/catalogue/CategoryService.ts)**

```typescript
const isReferenced = await this.categoryRepo.isReferencedByProducts(name);
if (isReferenced) {
  return Result.fail(
    'Category is referenced by existing products and cannot be deleted',
  );
}
await this.categoryRepo.delete(name);
return Result.ok<void>();
```

A verificação da aplicação dá erro de negócio compreensível; a FK protege contra bypass/corrida. Controller traduz referência existente em 409. Demonstra remoção em uso e remoção livre.

**Fontes: [CategoryName](../../../backend/src/domain/product/product-category/CategoryName.ts), [Identifier](../../../backend/src/domain/common/Identifier.ts), [PostgresCategoryRepository](../../../backend/src/infrastructure/persistence/repositories/PostgresCategoryRepository.ts)**

Categoria usa chave natural legível, `CategoryName`, não UUID público. A consequência é que renomeação precisa preservar referências.

## 3.3 BCK04 — alergénios

Um alergénio pode ser referenciado por produtos ou por restrições alimentares; ambas as relações bloqueiam eliminação.

**Fonte: [AllergenService](../../../backend/src/application/allergen/AllergenService.ts)**

```typescript
if (await this.allergenRepo.isReferenced(name)) {
  return Result.fail(
    'Allergen is referenced by existing business information and cannot be deleted',
  );
}
await this.allergenRepo.delete(name);
return Result.ok<void>();
```

**Fonte: [PostgresAllergenRepository](../../../backend/src/infrastructure/persistence/repositories/PostgresAllergenRepository.ts)**

```typescript
async isReferenced(name: AllergenName): Promise<boolean> {
  return await this.dataSource.getRepository(ProductAllergenEntity)
    .existsBy({ allergen_name: name.value })
    || await this.dataSource.getRepository(UserDietaryRestrictionEntity)
      .existsBy({ allergen_name: name.value });
}
```

`||` quer dizer que basta existir uma referência num dos dois sítios. A finalidade é não perder semântica de segurança alimentar.

**Fonte: [AllergenController](../../../backend/src/presentation/http/controllers/AllergenController.ts)**

```typescript
@Get()
@Public()
async getAll(@Query('search') search?: string) {
  return (await this.allergenService.getAllergens(search)).getValue();
}

@Post()
@UseGuards(RolesGuard)
@Roles(UserRole.MANAGER)
@HttpCode(HttpStatus.CREATED)
async create(@Body() body: CreateAllergenDTO) {
  // Serviço detecta duplicado; controller converte em HTTP.
}
```

Consulta é pública, escrita Manager-only. Testa duplicação, associação e remoção em uso.

**Nuance:** `AllergenService.checkAllergens()` valida nomes, mas `ProductService.associateAllergen()` não chama esse método hoje; a FK é a última barreira de integridade. Explica o código real, não afirmes uma validação que não é chamada.

## 3.4 BCK05 — produtos

### Regras de domínio

**Fontes: [ProductFlags](../../../backend/src/domain/product/ProductFlags.ts), [Product](../../../backend/src/domain/product/Product.ts), [Money](../../../backend/src/domain/common/Money.ts)**

```typescript
isConsistent(): boolean {
  return this.props.sellable || this.props.pizzaComponent;
}
```

**Fonte: [Product.create](../../../backend/src/domain/product/Product.ts)**

```typescript
if (props.flags.pizzaComponent && !props.componentType) {
  throw new DomainError('A pizza component must have exactly one component type');
}
if (!props.flags.pizzaComponent && props.componentType) {
  throw new DomainError('A non-component product cannot have a component type');
}
if (props.flags.sellable && directSellingPrice === null) {
  throw new DomainError('A sellable product must have a direct selling price');
}
```

Um item tem de ser vendável, componente ou ambos; componente exige tipo; não componente não pode ter tipo; vendável exige preço. `Money` valida valor finito/não negativo. Repetir estas regras no domínio protege chamadas fora da SPA.

### UI e sequência de gravação

**Fonte: [Products.ts — carregar](../../../frontend/src/app/backoffice/pages/products/products.ts)**

```typescript
forkJoin({
  products: this.api.products(),
  stock: this.api.stock().pipe(
    catchError(error => {
      this.stockError.set(errorMessage(error));
      return of([] as Stock[]);
    }),
  ),
})
```

Produtos e stock carregam juntos. Falha de stock preserva produtos e mostra erro parcial. Lookups de categorias/tipos alimentam formulário.

**Fonte: [Products.save](../../../frontend/src/app/backoffice/pages/products/products.ts)**

```typescript
this.api.saveProduct(value, this.selected()?.sku).pipe(
  tap(saved => { detailsSaved = true; this.selected.set(saved); }),
  switchMap(saved => image
    ? this.api.uploadImage(saved.sku, image).pipe(map(() => saved))
    : of(saved)),
  switchMap(saved => this.stockIncrease > 0 && saved.isStockControlled
    ? this.api.increaseStock(saved.sku, this.stockIncrease)
    : of(null)),
)
```

É sequência, não transacção distribuída. `detailsSaved` permite distinguir erro após os detalhes terem sido gravados; UI não afirma que houve rollback quando não houve. Imagem é exigida na criação pela UI, não pelo domínio.

### Serviço, identidade e flags

**Fonte: [ProductService](../../../backend/src/application/product/ProductService.ts)**

```typescript
const sku = Sku.create(dto.sku);
if (await this.productRepo.findBySku(sku)) {
  return Result.fail('Product SKU already exists');
}
const flags = new ProductFlags(
  dto.isSellable, dto.isPizzaComponent, dto.isStockControlled,
);
const product = Product.create({
  sku,
  name: ProductName.create(dto.name),
  description: dto.description,
  category: CategoryName.create(dto.categoryName),
  flags,
  componentType,
  directSellingPrice: this.parseMoney(dto.directSellingPrice),
  active: true,
  allergens: new Set(),
});
```

O serviço cria value objects (`Sku`, `ProductName`, `CategoryName`, `Money`) antes do domínio. SKU duplicado é detectado no repositório; invariantes cruzadas são verificadas em `Product.create`.

### Bloqueio e ligação ao Frontoffice

**Fontes: [ProductService](../../../backend/src/application/product/ProductService.ts), [ProductController](../../../backend/src/presentation/http/controllers/ProductController.ts)**

Bloquear chama `deactivate()` e grava `active=false`; activar reverte. Não apaga produto: preserva receita/histórico e permite reactivação. Mutação exige JWT, estado activo e Manager.

**Fontes: [menu-page.ts](../../../frontend/src/app/frontoffice/pages/menu/menu-page.ts), [storefront-api.ts](../../../frontend/src/app/frontoffice/core/storefront-api.ts), [CatalogueController](../../../backend/src/presentation/http/controllers/CatalogueController.ts), [CatalogueService](../../../backend/src/application/catalogue/CatalogueService.ts)**

O menu consome catálogo/projecção de leitura e aplica filtros de categoria, disponibilidade, alergénios excluídos, preço e texto. Backoffice mantém dados mestres; catálogo é DTO orientado ao cliente, sem acesso directo às entidades internas.

### Divergência de stock por venda

O domínio `Product` contém `stockUnitsPerSale` e AI02 necessita dele, mas DTO e formulário de produto não expõem o campo. Não afirmes que o Manager o configura na UI actual. Pode vir de dados existentes/seed; em falta, o planeamento rejeita com 422 em vez de assumir valor 1.

**Fontes: [Product](../../../backend/src/domain/product/Product.ts), [ProductDTOs](../../../backend/src/application/product/ProductDTOs.ts), [formulário](../../../frontend/src/app/backoffice/pages/products/products.ts), [AI02](../../user-stories/AI02/requirements.md), [PlanningService](../../../backend/src/application/planning/PlanningService.ts)**

## 3.5 BCK06 — tamanhos de pizza

Rota usa `restaurantGuard`; acções de escrita são Manager-only. GET é público. Serviço usa nome como chave natural e devolve `{ name, active }`.

**Fontes: [rota](../../../frontend/src/app/backoffice/backoffice.routes.ts), [pizza-sizes-page.ts](../../../frontend/src/app/backoffice/pages/pizza-sizes/pizza-sizes-page.ts), [PizzaSizeController](../../../backend/src/presentation/http/controllers/PizzaSizeController.ts), [PizzaSizeService](../../../backend/src/application/pizza/PizzaSizeService.ts)**

```typescript
if (await this.sizeRepo.isReferenced(oldName)) {
  return Result.fail(
    'PizzaSize is referenced by existing business information and cannot be renamed',
  );
}
await this.sizeRepo.delete(oldName);
existingSize.changeName(newName);
```

**Fonte: [PostgresPizzaSizeRepository](../../../backend/src/infrastructure/persistence/repositories/PostgresPizzaSizeRepository.ts)**

```typescript
async isReferenced(name: PizzaSizeName): Promise<boolean> {
  return await this.dataSource.getRepository(ComponentSizeConfigurationEntity)
    .existsBy({ pizza_size: name.value })
  || await this.dataSource.getRepository(PredefinedPizzaAvailableSizeEntity)
    .existsBy({ pizza_size: name.value });
}
```

Protege configurações de consumo e variantes. Desactivar mantém registo; remover/renomear em uso quebraria referências.

**Divergência:** requisito menciona UUID em alguns trechos; implementação identifica por nome, sem UUID de resposta. Apresenta contrato real e identifica a discrepância documental, sem dizer que UUID existe.

Demonstra: listar, criar, duplicar, desactivar, mostrar referência e tentar apagar tamanho utilizado.

---

# 4. Sprint 2 — AI01, AI02 e AI06

## 4.1 Percurso AI completo

1. Manager configura previsão e cenário no AI Config.
2. SPA chama API.
3. `PlanningController` exige JWT/estado/Manager.
4. `PlanningService` valida previsão, produtos, receitas, tamanhos, cenário e unidades.
5. Backend envia invocação pequena ao Prolog (tipo, data, nomes/linhas).
6. Prolog valida e consulta endpoint interno AI06 com token de serviço separado.
7. AI06 lê dados em `REPEATABLE READ`, sem PII.
8. Prolog limpa facts anteriores, carrega KB efémera, calcula.
9. Backend persiste resultado e snapshots.
10. SPA apresenta resultado/histórico; replay usa snapshot antigo.

A aquisição descrita originalmente em ADR-012 foi actualizada pela Clarification #55: Backend envia metadados e Prolog lê dataset no AI06.

## 4.2 AI Config

**Fontes: [ai-config-page.ts](../../../frontend/src/app/backoffice/pages/ai-config/ai-config-page.ts), [HTML](../../../frontend/src/app/backoffice/pages/ai-config/ai-config-page.html), [BackofficeApi](../../../frontend/src/app/backoffice/core/api/backoffice-api.ts)**

```typescript
if (!value.name.trim()) errors.push('Enter a forecast name.');
if (!value.startDate || !value.endDate) {
  errors.push('Enter both forecast dates.');
}
if (value.startDate && value.endDate &&
    value.startDate > value.endDate) {
  errors.push('The forecast start date cannot be after its end date.');
}
```

Também valida datas de linhas, SKU e duplicados. Backend revalida porque SPA pode ser contornada e dados podem mudar. Cenário exige confirmação antes de executar.

**Fonte: [BackofficeApi](../../../frontend/src/app/backoffice/core/api/backoffice-api.ts)**

```typescript
executePlanning(value) {
  return this.http.post('/api/planning/executions', value);
}
planningHistory() {
  return this.http.get('/api/planning/executions');
}
replayExecution(executionId: number) {
  return this.http.post(
    `/api/planning/executions/${executionId}/replay`, {},
  );
}
```

## 4.3 AI01 — BOM

Endpoint protegido por JWT, estado e Manager.

**Fonte: [PlanningController](../../../backend/src/presentation/http/controllers/PlanningController.ts)**

```typescript
@Controller('planning')
@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
export class PlanningController {
  @Post('bom-executions')
  @Roles('MANAGER')
  async executeBom(@Body() body: BomExecutionRequestDTO) {
    return this.planningService.executeBom(body);
  }
}
```

Serviço verifica produto activo, variante/tamanho e configuração; produto não pizza só passa como venda directa se vendável, com stock controlado e unidades por venda.

**Fonte: [PlanningService.executeBom](../../../backend/src/application/planning/PlanningService.ts)**

```typescript
const variants = await this.pizzas.findByProduct(Sku.create(order.productSku));
if (variants.length === 0) {
  if (!product.flags.stockControlled ||
      !product.flags.sellable ||
      product.stockUnitsPerSale === null) {
    throw new UnprocessableEntityException(
      `Product ${order.productSku} is not a pizza or a stock-controlled sellable product`,
    );
  }
  continue;
}
if (!order.pizzaSize) {
  throw new UnprocessableEntityException(
    `Pizza ${order.productSku} requires a size`,
  );
}
```

Validar antes da chamada externa evita resultado parcial plausível com SKU/receita incompleta.

**Fonte: [prolog/bom.pl](../../../prolog/bom.pl)**

```prolog
bom_setp(Sku, Size, Components) :-
    findall(comp(ComponentSku, Units),
        ( bom_recipe_line(Sku, ComponentSku, DefaultQty),
          bom_component_config(ComponentSku, Size, Multiplier),
          Units is DefaultQty * Multiplier,
          Units > 0
        ),
        Components).
```

`bom_recipe_line` lista componentes; `bom_component_config` fornece multiplicador de tamanho; `findall` recolhe soluções; unidades = quantidade base × multiplicador. Baseline expande pizza→componentes uma profundidade e não expande recursivamente agregado como massa→farinha. O requisito AI01 documenta esta fronteira. Necessidades repetidas são somadas por SKU. Prolog compara stock e não altera stock persistido.

`PlanningService` chama `PrologHttpClient`, guarda snapshot e `PlanningResult`; para BOM não há previsão nem proposta de compra, mas ficam necessidades/faltas.

**Fontes: [PlanningService](../../../backend/src/application/planning/PlanningService.ts), [PrologHttpClient](../../../backend/src/infrastructure/prolog/PrologHttpClient.ts), [PlanningResultEntity](../../../backend/src/infrastructure/persistence/entities/PlanningResultEntity.ts)**

AI01 não requer novo checkout; pode demonstrar endpoint/Bruno. AI02 tem a interface operacional.

## 4.4 AI02 — planeamento temporal

**Fonte: [PlanningService.executeForecast](../../../backend/src/application/planning/PlanningService.ts)**

```typescript
const forecast = await this.forecasts.findByName(dto.forecastName);
if (!forecast) throw new NotFoundException(...);

const scenario = await this.scenarios.findByName(dto.scenarioName);
if (!scenario) throw new NotFoundException(...);
if (!scenario.confirmedAt) {
  throw new ConflictException(
    'Scenario must be confirmed before execution',
  );
}
```

Valida previsão, cenário confirmado, data, produtos activos, configuração e unidades por venda. Produto inactivo após criar forecast leva a rejeição; não se calcula silenciosamente com item indisponível.

**Fonte: [prolog/planning.pl](../../../prolog/planning.pl)**

```prolog
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
```

Prolog percorre os dias cronologicamente. Necessidade vence no início do dia. Stock hipotético = inicial + entregas − consumo + propostas recebidas; o saldo calculado alimenta o dia seguinte. Stock real não é alterado.

Quando falta stock, selecção considera SKU, capacidade, prazo/lead time e lote; privilegia entrega atempada e depois preço conforme implementação. Não digas “escolhe sempre o mais barato”. Uma proposta tardia não é necessidade satisfeita a tempo.

Distingue:

- necessidade: quantidade requerida;
- proposta: fornecedor/quantidade/data hipotéticos;
- ordem de compra: não criada no Sprint 2, sem mutação operacional.

Histórico guarda snapshots de previsão, cenário e stock. Replay reconstrói invocação com snapshot original, grava nova execução apontada à anterior; não recalcula com inputs de hoje. [Testes Prolog temporais](../../../prolog/planning_tests.pl) cobrem fronteira de data de referência e impedem raciocínio retroactivo.

## 4.5 AI06 — snapshot interno autenticado

Prolog não lê PostgreSQL directamente. Backend retém ownership do esquema/regras e fornece dados por endpoint de serviço.

**Fonte: [Ai06InputsController](../../../backend/src/presentation/http/controllers/Ai06InputsController.ts)**

```typescript
@Public()
@Controller('internal/ai06')
@UseGuards(Ai06ServiceAuthGuard)
export class Ai06InputsController {
  @Post('inputs')
  async readInputs(@Body() command: InputCommand) {
    return this.dataSource.transaction(
      'REPEATABLE READ',
      async manager => {
        // Leitura do snapshot numa única transacção.
      },
    );
  }
}
```

`@Public()` evita exigir JWT de pessoa; não torna endpoint anónimo. `Ai06ServiceAuthGuard` exige identidade de serviço. `REPEATABLE READ` faz consultas de catálogo, stock, receita, configuração, previsão e ofertas verem leitura coerente.

**Fontes: [Ai06ServiceAuthGuard](../../../backend/src/presentation/http/middlewares/Ai06ServiceAuthGuard.ts), [PrologHttpClient](../../../backend/src/infrastructure/prolog/PrologHttpClient.ts), [prolog/server.pl](../../../prolog/server.pl)**

`PROLOG_SERVICE_TOKEN` autoriza chamar motor; `AI06_SERVICE_TOKEN` autoriza Prolog a pedir dados. São credenciais distintas para limitar alcance.

**Fonte: [prolog/server.pl](../../../prolog/server.pl)**

```prolog
do_handle_plan(Request) :-
    http_read_json_dict(Request, Dict, [value_string_as(atom)]),
    validate_invocation(Dict),
    read_execution_inputs(Dict, Inputs),
    with_mutex(ai06_knowledge_base,
        execute_with_inputs(Dict, Inputs)).
```

O servidor lê JSON, valida allowlist/execução, busca snapshot autenticado e usa mutex porque facts são dinâmicas e partilhadas. Limpa/carrega KB para o cálculo e devolve `inputSnapshot`, base do replay. Chaves são SKU/tamanho/nome/código de fornecedor; sem PII.

Defesa: AI06 não é dump SQL; é contrato interno autenticado, de leitura coerente e com campos permitidos.

---

# 5. SYS02 e SYS03 na VM

SYS02/03 são rede da VM Debian, não guardas SPA. Firewalls limitam a origem/portas e destinos externos; a app continua a autenticar utilizadores. São camadas complementares.

## 5.1 SYS02 — entrada

**Fontes: [firewall.sh](../../../infra/sys02-network-access/firewall.sh), [configuração de rede](../../../docs/asist/sys-network-config.md), [US SYS02](../../user-stories/SYS02/requirements.md)**

```bash
set -euo pipefail
```

`-e` termina ao falhar comando; `-u` falha variável não definida; `pipefail` propaga falhas no pipeline. O objectivo é falhar cedo, sem política parcial.

Script valida CIDRs IPv4, descobre interface WAN/bridge Docker, prepara preview. Cadeia host usa default drop, permite loopback/estabelecidas/SSH autorizado. Cadeia forward para containers permite apenas portas publicadas 80/443 de origens aprovadas e regista/descarta outros DNAT.

**Fonte: [firewall.sh — validar e aplicar](../../../infra/sys02-network-access/firewall.sh)**

```bash
nft -c -f "$RULES_FILE"
if [[ "$APPLY" != "true" ]]; then
    echo "SYS02: validation passed; no rules changed."
    exit 0
fi
nft -f "$RULES_FILE"
```

`nft -c` valida sem aplicação; sem `APPLY=true`, só preview. Tabela `inet laprizza_sys02` é própria, sem substituir Docker.

**Porquê forward:** tráfego das portas publicadas Docker passa pelo encaminhamento. Filtrar apenas INPUT do host não bastaria; cadeia `docker_ingress` protege a entrada publicada.

**Evidência:** segue [US SYS02](../../user-stories/SYS02/requirements.md) e [sys-network-config](../../../docs/asist/sys-network-config.md): listar tabela; testar origem permitida e externa; confirmar `LAPRIZZA-SYS02-DENY` no journal. Testar só da rede permitida não prova negação externa. [ufw-report.sh](../../../infra/sys02-network-access/ufw-report.sh) é nome legado do relatório, não prova que script reconfigure UFW.

## 5.2 SYS03 — egress allowlist

**Fontes: [egress.sh](../../../infra/sys03-egress-allowlist/egress.sh), [validador](../../../infra/sys03-egress-allowlist/validate-allowed-endpoints.mjs), [YAML](../../../config/allowed-endpoints.yml), [schema](../../../config/allowed-endpoints.schema.json), [US SYS03](../../user-stories/SYS03/requirements.md)**

Cadeia: exige root/dependências; converte YAML; valida JSON Schema; resolve DNS; cria regras temporárias; executa `nft -c`; preview por omissão; só `APPLY=true` instala e audita.

**Fonte: [egress.sh — validação](../../../infra/sys03-egress-allowlist/egress.sh)**

```bash
yq '.' "$YAML_FILE" > "$CONFIG_JSON" \
  || fail "YAML parsing failed"
node "$SCRIPT_DIR/validate-allowed-endpoints.mjs" \
  "$CONFIG_JSON" "$ROOT_DIR/config/allowed-endpoints.schema.json" \
  || fail "schema validation failed"
```

YAML/schema/DNS inválido chama `fail`, regista erro e termina; última tabela válida fica activa.

**Fonte: [egress.sh — preview/apply](../../../infra/sys03-egress-allowlist/egress.sh)**

```bash
nft -c -f "$NFT_FILE" \
  || fail "nftables syntax/check failed; previous policy remains active"
if [[ "$APPLY" != "true" ]]; then
    cat "$NFT_FILE"
    echo "EGRESS: VALID — preview only; no rules changed."
    exit 0
fi
nft -f "$NFT_FILE"
```

YAML converte destinos DNS em IP/portos. Ligações estabelecidas e DNS configurado são permitidos; novo egress só passa se casar com regras. IPv6 está bloqueado até ser suportado. Permissões do grupo, root, logs e timer systemd completam o controlo.

Justificação do preview: uma regra errada pode cortar acesso/integridade; validar antes de aplicar reduz risco e dá confirmação operacional explícita.

---

# 6. Testes: Jest, Bruno e falhas observadas

## 6.1 O que cada nível prova

| Nível | O que isola | Exemplos |
| --- | --- | --- |
| Jest unitário | Regra de serviço/domínio sem servidor real | [category.service.spec.ts](../../../backend/tests/unit/application/category.service.spec.ts), [allergen.service.spec.ts](../../../backend/tests/unit/application/allergen.service.spec.ts), [product.service.spec.ts](../../../backend/tests/unit/application/product.service.spec.ts), [pizza-size.service.spec.ts](../../../backend/tests/unit/application/pizza-size.service.spec.ts) |
| Jest integração | Controller, HTTP, guards e filtros | [category.controller.spec.ts](../../../backend/tests/integration/category.controller.spec.ts), [allergen.controller.spec.ts](../../../backend/tests/integration/allergen.controller.spec.ts), [product.controller.spec.ts](../../../backend/tests/integration/product.controller.spec.ts), [pizza-size.controller.spec.ts](../../../backend/tests/integration/pizza-size.controller.spec.ts) |
| Bruno | Contrato de API, tokens e pedidos encadeados | [BCK03](../../../backend/tests/bruno/LaPrizza/BCK03-Categories), [BCK04](../../../backend/tests/bruno/LaPrizza/BCK04-Allergens), [BCK05](../../../backend/tests/bruno/LaPrizza/BCK05-Products), [BCK06](../../../backend/tests/bruno/LaPrizza/BCK06-PizzaSizes), [AI01](../../../backend/tests/bruno/LaPrizza/AI01-BOM), [AI02](../../../backend/tests/bruno/LaPrizza/AI02-PLANNING) |

“Blindar” significa cobertura complementar, não prova absoluta:

- Unitários protegem invariantes e erros.
- Integração testa status 401/403/404/409/422 no HTTP.
- Bruno testa workflows API encadeados.
- Negativos impedem regressões de autorização/integridade; happy path sozinho é insuficiente.

## 6.2 Cobertura Jest das tuas BCK

- **BCK03:** criar/ler por nome, duplicado, remoção referenciada, edição; integração verifica leitura pública, sem token 401, função errada 403, Manager 201.
- **BCK04:** identidade, duplicação, editar/renomear, remoção referenciada; integração protege consulta e papéis.
- **BCK05:** SKU duplicado, preço obrigatório, bloquear/reactivar, associar/filtrar alergénio; integração testa acesso público, autorização e flags inválidas.
- **BCK06:** criar, duplicar, remoção de tamanho referenciado; integração GET público e escrita Manager-only.

Lê os corpos dos ficheiros ligados em arrange/act/assert: preparar, executar, verificar.

## 6.3 Bruno

Pastas têm ambiente, token/fixtures, pedidos numerados e scripts que passam valores dinâmicos entre respostas.

Exemplos: BCK03 duplicado/nome vazio/remoção em uso; BCK04 remoção com alergénio referenciado; BCK05 papel/type inválidos, associação/filtros, bloquear/reactivar; BCK06 duplicado/desactivar/remover em uso; AI01 sem token, SKU/config inválidos, stock suficiente/insuficiente e stock read-only; AI02 cenário não confirmado, forecast/supplier ausentes, produto inactivo, data inválida, falta stockUnitsPerSale e entrega tardia.

Explica um caso: “setup obtém token; pedido prepara recurso; script guarda SKU/ID; próximos pedidos reutilizam-no; assertions verificam status e corpo; caso negativo comprova validação no servidor.”

## 6.4 Falhas do output que enviaste

Output: 1 suite falhada, 65 aprovadas, 11 ignoradas; 2 testes falhados, 621 aprovados e 64 ignorados. A suite é [user.contact.controller.spec.ts](../../../backend/tests/integration/user.contact.controller.spec.ts), BCK02, fora das tuas BCK03–06 e AI/SYS.

1. **“limits managers to customer identity and dietary information”**: teste esperava somente `username`, `firstName`, `lastName`; DTO devolveu também `createdAt`, `email`, `roles`, `status` etc. Divergência do contrato esperado/DTO.
2. **“allows managers to maintain customer dietary restrictions but not other accounts”**: esperava 201, recebeu 403; endpoint negou acesso Manager.

Não alterei: são BCK02, fora do escopo; modificar autorização sem confirmar requisito pode enfraquecer controlo. No output, suites BCK03–06 visíveis passaram. Isto descreve o output colado, não prova estado actual da branch; nem demonstra Bruno, que é execução separada de Jest.

---

# 7. ADRs e a tua implementação

| ADR | Ligação | Justificação |
| --- | --- | --- |
| [ADR-0001 — estilo arquitectural](../../sad/03-rationale/ADR-0001-architectural-style.md) | Domínio/aplicação/apresentação/persistência | Regras testáveis e adaptadores substituíveis |
| [ADR-002.2 — stack](../../sad/03-rationale/ADR-002.2-stack-choosing.md), [ADR-008 — ORM](../../sad/03-rationale/ADR-008-orm-adoption.md) | NestJS/TypeScript/TypeORM/PostgreSQL | DI, repositórios/migrações; ORM não define regra |
| [ADR-005](../../sad/03-rationale/ADR-005-rest-api.md), [ADR-005.2](../../sad/03-rationale/ADR-005.2-rest-api.md) | API BCK/planeamento | Rotas e status HTTP semânticos |
| [ADR-006](../../sad/03-rationale/ADR-006-automated-testing.md), [ADR-007](../../sad/03-rationale/ADR-007-api-testing-tooling.md) | Jest e Bruno | Testes de regra, integração e workflows |
| [ADR-009 — Angular](../../sad/03-rationale/ADR-009-frontend-framework.md) | SPA, Router, guards, signals | Composição e lazy routes |
| [ADR-010.2 — IdP externo](../../sad/03-rationale/ADR-010.2-external-idp.md) | AA02 | OIDC, ligação por `sub`, fronteira entre IdP e conta interna |
| [ADR-017.2 — convites](../../sad/03-rationale/ADR-017.2-user-invitations.md) | AA07 | Link de convite, finalidade, expiração e activação de uso único |
| [ADR-012 — Prolog](../../sad/03-rationale/ADR-012-ai-planning-engine.md) | AI01/02/06 | Motor lógico isolado por REST/JSON |
| [ADR-013 — snapshots](../../sad/03-rationale/ADR-013-planning-results.md) | Histórico e replay | Inputs preservados para reprodutibilidade |

- **ADR-0001:** UI chama HTTP, controller interpreta protocolo, aplicação coordena caso de uso, domínio guarda invariantes, repositório persiste. Serviços dependem de interfaces; unitário pode usar fake sem PostgreSQL.
- **ADR-005:** 400 inválido; 401 não autenticado; 403 sem permissão; 404 ausente; 409 conflito com estado actual; 422 pedido sintacticamente válido mas dados de domínio não processáveis. Explica o caso, não só o número.
- **ADR-006/007:** Jest é repetível para unidade/integração; Bruno verifica contrato HTTP/workflow. São complementares.
- **ADR-009:** Angular/Router/DI/standalone/lazy routes estão presentes. Ressalva: ADR pede reactive forms tipados, mas `Resources` usa `FormsModule`/`ngModel` template-driven. Não digas que todos os formulários são reactive.
- **ADR-010.2:** explica o limite entre autenticação externa e identidade interna. A associação usa o `sub`; coincidência de email não deve fundir uma conta local. A implementação actual do adaptador OIDC tem lacunas de verificação do ID token/state/nonce assinaladas na secção 2.3.2; não afirmes que essas verificações já estão completas.
- **ADR-017.2:** sustenta o fluxo AA07 por convite, com finalidade, token limitado e caminho separado para activação local ou via IdP.
- **ADR-012:** Clarification #55 actualizou aquisição de dados. Explica Backend enviar metadados e Prolog pedir snapshot ao AI06, não o texto original isolado.
- **ADR-013:** snapshots evitam que replay use previsões/stock actuais em vez dos usados originalmente. Replay grava execução nova apontando à anterior; não cria compra.
- **SYS02/03:** não identifiquei ADR específico. Justifica por least privilege, defesa em profundidade, validação, tabelas isoladas e auditoria, conforme US/documentação. Não inventes ADR.

---

# 8. Demonstração e perguntas de defesa

## 8.1 Percurso de 6–8 minutos

1. Backoffice como Manager: SPA, Router, layout e chamadas assíncronas.
2. BCK03: criar categoria, tentar remover uma usada; explicar 201/409 e integridade.
3. BCK04: listar, associar alergénio, tentar apagar; mostrar referências em produtos e restrições.
4. BCK05: explicar SKU/flags/tipo/preço/categoria/alergénios/estado; bloquear reversivelmente.
5. BCK06: mostrar tamanho/configuração, desactivar vs apagar, identidade por nome.
6. Frontoffice: demonstrar filtros vindos dos dados de catálogo.
7. AI02: previsão/cenário confirmado, executar numa data, mostrar resultado/histórico; stock é simulado.
8. AI01/AI06: pedido Bruno, endpoint Manager, motor e snapshot sem PII.
9. SYS: preview/tabela/logs. Não aplicar firewall ao vivo sem ambiente preparado.

## 8.2 Perguntas prováveis

**O que é SPA?** Angular carrega documento base; Router escolhe componente em `router-outlet`. URL/pedidos mudam sem navegação HTML completa.

**Se guard deixa passar, está autorizado?** Não. Guard é UX; API confirma token, estado e função.

**Porquê chave natural?** Nome é legível no negócio. Consequência: rename/delete tem de proteger referências. BCK06 documento/código divergem em UUID.

**Porquê bloquear produto e não apagar?** Preserva receitas/histórico; `active=false` impede uso futuro e permite reactivar.

**Porquê Prolog não lê SQL?** Backend mantém esquema/credenciais/regras; AI06 fornece contrato interno coerente e desacoplado de SQL.

**Como evita facts antigos?** Cada pedido busca inputs e reinicializa facts; `with_mutex` protege estado partilhado; snapshot fica no resultado.

**Planeamento compra stock?** Não. Produz necessidade/proposta hipotética; stock real e compras não mudam.

**Como escolhe fornecedor?** Compatibilidade SKU, prazo, capacidade, lote e lead time; atempado antes de preço, conforme regra. Sem oferta adequada, necessidade não satisfeita.

**Porquê rede e auth?** SYS02 limita origem/portas; auth limita pessoa/operação. Rede permitida não torna toda a pessoa autorizada.

**YAML inválido em SYS03?** Validação falha, há log e a tabela válida fica activa; preview é default.

**Qual falha do output?** Suite BCK02: resposta de perfil mais larga que teste esperado e Manager recebe 403 numa mutação de restrição alimentar esperada como 201. Fora das tuas US; BCK03–06 visíveis passaram.

**Limitação que reconheces?** Escolhe uma com evidência: nome vs UUID BCK06; UI/DTO sem `stockUnitsPerSale`; serviço distinto na criação de categoria; `ngModel` vs ADR reactive; BOM com uma profundidade. Propõe reconciliar docs/código sem afirmar implementação inexistente.

---

# 9. Referências directas

## Stories e contribuição

- [BCK03](../../user-stories/BCK03/requirements.md), [BCK04](../../user-stories/BCK04/requirements.md), [BCK05](../../user-stories/BCK05/requirements.md), [BCK06](../../user-stories/BCK06/requirements.md)
- [AI01](../../user-stories/AI01/requirements.md), [AI02](../../user-stories/AI02/requirements.md), [WEB07](../../user-stories/WEB07/requirements.md), [AI06](../../user-stories/AI06/requirements.md), [AA02](../../user-stories/AA02/requirements.md), [AA07](../../user-stories/AA07/requirements.md), [SYS02](../../user-stories/SYS02/requirements.md), [SYS03](../../user-stories/SYS03/requirements.md)
- [Processo Sprint 1](../progress/sprint1/1241244-development-process.md) · [Processo Sprint 2](../progress/sprint2/1241244-development-process.md)

## Código central

- [SPA](../../../frontend/src/app/app.html), [configuração](../../../frontend/src/app/app.config.ts), [rotas](../../../frontend/src/app/app.routes.ts), [rotas Backoffice](../../../frontend/src/app/backoffice/backoffice.routes.ts), [auth/interceptor](../../../frontend/src/app/shared_components/core/auth/auth.ts), [guards](../../../frontend/src/app/backoffice/core/auth/guards.ts)
- [Resources](../../../frontend/src/app/backoffice/shared_components/resource-management/resources.ts), [BackofficeApi](../../../frontend/src/app/backoffice/core/api/backoffice-api.ts), [Products](../../../frontend/src/app/backoffice/pages/products/products.ts), [menu](../../../frontend/src/app/frontoffice/pages/menu/menu-page.ts)
- [Controllers BCK](../../../backend/src/presentation/http/controllers/CategoryController.ts), [AllergenController](../../../backend/src/presentation/http/controllers/AllergenController.ts), [ProductController](../../../backend/src/presentation/http/controllers/ProductController.ts), [PizzaSizeController](../../../backend/src/presentation/http/controllers/PizzaSizeController.ts)
- [Services BCK](../../../backend/src/application/catalogue/CategoryService.ts), [AllergenService](../../../backend/src/application/allergen/AllergenService.ts), [ProductService](../../../backend/src/application/product/ProductService.ts), [PizzaSizeService](../../../backend/src/application/pizza/PizzaSizeService.ts)
- [PlanningService](../../../backend/src/application/planning/PlanningService.ts), [PrologHttpClient](../../../backend/src/infrastructure/prolog/PrologHttpClient.ts), [AI06 controller](../../../backend/src/presentation/http/controllers/Ai06InputsController.ts), [Prolog server](../../../prolog/server.pl), [BOM](../../../prolog/bom.pl), [planning](../../../prolog/planning.pl)
- [AI Config UI](../../../frontend/src/app/backoffice/pages/ai-config/ai-config-page.ts), [ExternalAuthController](../../../backend/src/presentation/http/controllers/ExternalAuthController.ts), [OidcClientAdapter](../../../backend/src/infrastructure/security/OidcClientAdapter.ts), [ExternalAuthService](../../../backend/src/application/auth/ExternalAuthService.ts), [AuthService](../../../backend/src/application/auth/AuthService.ts), [ActivationInvitationService](../../../backend/src/application/auth/ActivationInvitationService.ts)
- [SYS02](../../../infra/sys02-network-access/firewall.sh), [SYS02 report](../../../infra/sys02-network-access/ufw-report.sh), [SYS03](../../../infra/sys03-egress-allowlist/egress.sh), [schema](../../../config/allowed-endpoints.schema.json)

## ADRs

[ADR-0001](../../sad/03-rationale/ADR-0001-architectural-style.md) · [ADR-005](../../sad/03-rationale/ADR-005-rest-api.md) · [ADR-005.2](../../sad/03-rationale/ADR-005.2-rest-api.md) · [ADR-006](../../sad/03-rationale/ADR-006-automated-testing.md) · [ADR-007](../../sad/03-rationale/ADR-007-api-testing-tooling.md) · [ADR-009](../../sad/03-rationale/ADR-009-frontend-framework.md) · [ADR-010.2](../../sad/03-rationale/ADR-010.2-external-idp.md) · [ADR-012](../../sad/03-rationale/ADR-012-ai-planning-engine.md) · [ADR-013](../../sad/03-rationale/ADR-013-planning-results.md) · [ADR-017.2](../../sad/03-rationale/ADR-017.2-user-invitations.md)

---

## Fecho oral

> “Consigo seguir uma operação do browser à base de dados e de volta: Router escolhe o componente; SPA chama API protegida; controller aplica contrato HTTP; aplicação coordena; domínio valida invariantes; repositório persiste. No planeamento, Backend constrói snapshot coerente, Prolog calcula sem alterar stock real, e o resultado fica auditável. Jest, integração e Bruno cobrem níveis diferentes; SYS02/SYS03 acrescentam controlo de rede.”

