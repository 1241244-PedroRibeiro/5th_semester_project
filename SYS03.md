Tens razão. A resposta anterior falou sobretudo da intenção da SYS03 e deixou de fora grande parte do código que precisas de defender. Abaixo percorro o **script que está no repositório**, incluindo as linhas de validação, resolução DNS, geração das regras, aplicação, logs e os testes.

# SYS03 — dissecação do `egress.sh`

A SYS03 controla o tráfego de saída **encaminhado pela rede Docker seleccionada**. A lista editável está em YAML; o script valida-a e transforma-a numa tabela nftables. O ficheiro de referência é [infra/sys03-egress-allowlist/egress.sh](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/infra/sys03-egress-allowlist/egress.sh).

O fluxo geral é:

```text
allowed-endpoints.yml
        │
        ├─ YAML parse → JSON
        ├─ JSON Schema + verificação de nomes repetidos
        ├─ Descoberta da rede Docker e interface WAN
        ├─ Resolução DNS dos destinos externos
        ├─ Geração de policy.nft temporária
        ├─ nft -c: validar sem aplicar
        └─ APPLY=true → nft -f: aplicar a tabela
```

## 1. Interpretador, modo estrito e permissões

```bash
#!/usr/bin/env bash
# SYS03 runtime egress policy for Docker containers on the Debian/nftables VM.
# Host egress and Docker-managed tables are deliberately left unchanged.
set -euo pipefail
umask 027
```

- `#!/usr/bin/env bash` pede ao sistema para executar o ficheiro com Bash.
- Os comentários registam o âmbito: tráfego de contentores na VM, preservando a saída do host e as tabelas geridas pelo Docker.
- `set -euo pipefail` activa o modo estrito:
  - `-e`: termina quando um comando falha, salvo situações tratadas explicitamente;
  - `-u`: falha ao usar uma variável não definida;
  - `pipefail`: uma pipeline falha se falhar um dos seus comandos, em vez de só olhar para o último.
- `umask 027` limita as permissões dos ficheiros criados pelo processo. O resultado normal é que o proprietário tenha acesso completo, o grupo possa ler/atravessar conforme o tipo de ficheiro e os outros utilizadores não tenham acesso.

**Pergunta provável:** “Porque usar `set -euo pipefail` num script de firewall?”  
**Resposta:** Para que um erro de leitura, resolução ou geração não seja ignorado e o script não continue com uma política incompleta. Há alguns comandos que podem falhar legitimamente e são tratados de forma explícita, como a pesquisa da tabela existente.

## 2. Descobrir a raiz e definir caminhos

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${LAPRIZZA_REPO_DIR:-}"
```

- `${BASH_SOURCE[0]}` identifica o ficheiro de script actualmente executado.
- `dirname` obtém a pasta desse ficheiro.
- `cd ... && pwd` converte-a num caminho absoluto.
- `LAPRIZZA_REPO_DIR` permite indicar explicitamente a raiz do repositório, sobretudo útil para testes isolados.

Depois tenta encontrar automaticamente o repositório:

```bash
if [[ -z "${ROOT_DIR}" ]]; then
    for candidate in "${SCRIPT_DIR}/../.." "${SCRIPT_DIR}/.."; do
        if [[ -f "${candidate}/config/allowed-endpoints.yml" ]]; then
            ROOT_DIR="$(cd "${candidate}" && pwd)"
            break
        fi
    done
fi
ROOT_DIR="${ROOT_DIR:-/opt/laprizza}"
```

Se a variável estiver vazia, procura o YAML em duas localizações relativas ao script. Encontrar o YAML serve como sinal de que encontrou a raiz do projecto. `break` interrompe a procura quando encontra a primeira opção válida. Se não encontrar, usa `/opt/laprizza`, o caminho de instalação no servidor.

Em seguida define os caminhos usados:

```bash
YAML_FILE="${ROOT_DIR}/config/allowed-endpoints.yml"
POLICY_ENV="${NETWORK_POLICY_FILE:-/etc/laprizza/network-policy.env}"
EGRESS_LOG="${EGRESS_LOG:-/var/log/laprizza/egress.log}"
CHANGES_LOG="${CHANGES_LOG:-/var/log/laprizza/egress-changes.log}"
ADMIN_GROUP="${ADMIN_GROUP:-laprizza-admins}"
APPLY="${APPLY:-false}"
```

A sintaxe `${VAR:-valor}` significa “usar `VAR` se estiver definida e não vazia; caso contrário, usar este valor”. Isto permite:

- usar o ficheiro de política instalado em `/etc/laprizza/network-policy.env`;
- redireccionar os registos para uma pasta de teste;
- manter a pré-visualização como comportamento normal, porque `APPLY` começa em `false`.

O utilizador e a revisão de origem são obtidos assim:

```bash
ACTOR="${ACTOR:-${SUDO_USER:-$(id -un)}}"
SRC_COMMIT="${SRC_COMMIT:-$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || echo uncommitted)}"
```

- `ACTOR` usa, por ordem, a variável já definida, `SUDO_USER` ou o utilizador actual.
- `SRC_COMMIT` tenta obter o hash curto do commit da raiz do repositório.
- Se o `git rev-parse` falhar, regista `uncommitted`. O `|| echo uncommitted` trata essa falha em vez de deixar a substituição de comando interromper esta atribuição.

## 3. Carregar as variáveis da máquina e confirmar os requisitos

```bash
if [[ -f "${POLICY_ENV}" ]]; then
    set -a; source "${POLICY_ENV}"; set +a
fi
```

Se o ficheiro de configuração do host existir, o Bash carrega-o. `source` executa as atribuições no contexto do script. `set -a` exporta as variáveis definidas nesse ficheiro para o ambiente dos comandos seguintes; `set +a` desliga esse comportamento depois da leitura.

É neste ficheiro que podem estar, por exemplo, `DOCKER_EGRESS_NETWORK`, `WAN_INTERFACE` e `DOCKER_DNS_SERVERS`. Como `source` executa comandos Bash, o ficheiro tem de ser controlado por administradores e protegido no servidor.

```bash
if [[ "$(id -u)" -ne 0 ]]; then
    echo "SYS03: run as root (or with sudo)." >&2
    exit 1
fi
```

`id -u` devolve o identificador numérico do utilizador. `0` é o `root`. Se não estiver a correr como root, o script escreve o erro em `stderr` (`>&2`) e termina com código `1`.

```bash
for cmd in node yq jq dig timeout sha256sum nft docker ip python3 chgrp; do
    command -v "${cmd}" >/dev/null 2>&1 || {
        echo "SYS03: required command missing: ${cmd}" >&2
        exit 1
    }
done
```

Para cada comando necessário, `command -v` verifica se está disponível no `PATH`. A saída normal é descartada. Se algum faltar, o script termina antes de construir ou aplicar regras.

As ferramentas têm estas funções:

| Ferramenta | Uso no script |
|---|---|
| `node` | Executar o validador JavaScript |
| `yq` | Ler o YAML e produzir JSON |
| `jq` | Extrair os endpoints do JSON |
| `dig` | Consultar DNS |
| `timeout` | Limitar a duração de uma consulta |
| `sha256sum` | Identificar o conteúdo da configuração |
| `nft` | Validar e gerir a tabela nftables |
| `docker` | Consultar a rede Docker |
| `ip` | Descobrir a rota e a interface WAN |
| `python3` | Validar e normalizar sub-redes e endereços |
| `chgrp` | Atribuir os logs ao grupo administrativo |

Por fim:

```bash
[[ -f "${YAML_FILE}" ]] || {
    echo "SYS03: allowlist not found: ${YAML_FILE}" >&2
    exit 1
}
```

O YAML é obrigatório. Se não existir, não há configuração a validar e o script termina.

## 4. Descobrir a rede Docker e a interface WAN

```bash
DOCKER_EGRESS_NETWORK="${DOCKER_EGRESS_NETWORK:-laprizza_laprizza-network}"
WAN_INTERFACE="${WAN_INTERFACE:-$(ip -4 route show default | awk 'NR == 1 { for (i=1; i<=NF; i++) if ($i == "dev") { print $(i+1); exit } }')}"
```

A rede Docker tem um valor predefinido, mas pode ser substituída pela configuração do host. A interface WAN também pode ser configurada. Se não estiver, o comando `ip -4 route show default` mostra a rota IPv4 predefinida e o `awk` procura o campo `dev`, que identifica a interface de saída, como `eth0`.

```bash
[[ -n "${WAN_INTERFACE}" && "${WAN_INTERFACE}" =~ ^[a-zA-Z0-9_.:-]+$ ]] || {
    echo "SYS03: set a valid WAN_INTERFACE." >&2
    exit 1
}
```

Confirma que a variável não está vazia e que só contém caracteres aceites para um nome de interface. A validação também evita inserir texto arbitrário dentro do ficheiro nftables gerado.

O script consulta depois o Docker:

```bash
NETWORK_INFO="$(docker network inspect "${DOCKER_EGRESS_NETWORK}" \
  --format '{{.Id}} {{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || true)"
[[ -n "${NETWORK_INFO}" ]] || {
    echo "SYS03: Docker egress network not found: ${DOCKER_EGRESS_NETWORK}" >&2
    exit 1
}
NETWORK_ID="${NETWORK_INFO%% *}"
```

`docker network inspect` pede o identificador e a sub-rede da rede. `--format` formata a resposta sem imprimir todo o JSON. Os erros do Docker são ocultados por `2>/dev/null`; `|| true` impede que o modo `-e` termine antes de a verificação seguinte poder produzir a mensagem própria do script.

`NETWORK_INFO%% *` remove tudo a partir do primeiro espaço, deixando o identificador da rede.

A sub-rede é validada com Python:

```bash
NETWORK_SUBNET="$(python3 - "${NETWORK_INFO#* }" <<'PY'
import ipaddress, sys
network = ipaddress.ip_network(sys.argv[1], strict=False)
if network.version != 4:
    raise SystemExit("the selected Docker runtime network must have one IPv4 subnet")
print(network)
PY
)" || {
    echo "SYS03: Docker network must have a valid IPv4 subnet." >&2
    exit 1
}
```

`NETWORK_INFO#* ` remove o identificador e o espaço inicial. O pequeno programa Python:

1. lê a sub-rede recebida em `sys.argv[1]`;
2. usa a biblioteca `ipaddress` para validar e normalizar a rede;
3. exige IPv4;
4. imprime a forma normalizada.

Se a rede estiver mal formada ou for IPv6, a substituição de comando falha e o script termina.

A bridge é calculada pelo prefixo do identificador Docker:

```bash
DOCKER_BRIDGE="${DOCKER_BRIDGE:-br-${NETWORK_ID:0:12}}"
[[ "${DOCKER_BRIDGE}" =~ ^[a-zA-Z0-9_.:-]+$ ]] || {
    echo "SYS03: invalid Docker bridge interface." >&2
    exit 1
}
```

Docker costuma nomear a bridge como `br-` seguido dos primeiros 12 caracteres do ID da rede. A variável pode ser substituída explicitamente. Depois há outra validação para impedir que um valor inesperado entre no ficheiro de regras.

## 5. Criar área temporária, logs e funções

```bash
TEMP_DIR="$(mktemp -d /tmp/laprizza-egress.XXXXXX)"
trap 'rm -rf "${TEMP_DIR}"' EXIT
CONFIG_JSON="${TEMP_DIR}/config.json"
NFT_FILE="${TEMP_DIR}/policy.nft"
RESOLVED="${TEMP_DIR}/resolved.tsv"
YAML_SHA256="$(sha256sum "${YAML_FILE}" | awk '{print $1}')"
```

- `mktemp -d` cria uma pasta temporária com nome imprevisível.
- `trap ... EXIT` pede ao Bash para apagar essa pasta quando o script termina, incluindo em saídas por erro.
- Os ficheiros temporários têm funções distintas:
  - `config.json`: YAML convertido;
  - `policy.nft`: regras que serão verificadas/aplicadas;
  - `resolved.tsv`: lista tabulada de endpoints já resolvidos.
- `sha256sum` calcula o hash do YAML. O `awk` selecciona a primeira coluna, que é o hash.

Os logs são preparados assim:

```bash
mkdir -p "$(dirname "${EGRESS_LOG}")" "$(dirname "${CHANGES_LOG}")"
touch "${EGRESS_LOG}" "${CHANGES_LOG}"
chgrp "${ADMIN_GROUP}" "${EGRESS_LOG}" "${CHANGES_LOG}"
chmod 640 "${EGRESS_LOG}" "${CHANGES_LOG}"
```

`dirname` obtém as pastas dos logs; `mkdir -p` cria-as se forem necessárias; `touch` garante que os ficheiros existem. Depois são atribuídos ao grupo de administradores e recebem modo `640`: o proprietário pode ler e escrever, o grupo pode ler e os restantes não têm permissões.

As funções seguintes centralizam o registo:

```bash
log() {
    printf '[%s] [%s] %s\n' \
      "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$1" "$2" |
      tee -a "${EGRESS_LOG}"
}
```

`log` recebe nível e mensagem. `date -u` produz data UTC; `printf` cria uma linha consistente; `tee -a` acrescenta-a ao ficheiro e também a mostra no terminal ou journal.

```bash
audit() {
    printf 'TS=%s ACTOR=%s ACTION=apply RESULT=%s RULES=%s SHA256=%s SRC=%s\n' \
      "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "${ACTOR}" "$1" \
      "${2:-0}" "${YAML_SHA256}" "${SRC_COMMIT}" >> "${CHANGES_LOG}"
    chmod 640 "${CHANGES_LOG}"
    chgrp "${ADMIN_GROUP}" "${CHANGES_LOG}"
}
```

`audit` escreve uma linha de auditoria com data, actor, acção, resultado, número de regras, hash e origem Git. O segundo argumento tem `0` como valor predefinido. No fim reforça as permissões e o grupo do ficheiro.

```bash
fail() {
    log ERROR "$1"
    audit invalid 0
    echo "EGRESS: INVALID — $1" >&2
    exit 1
}
```

`fail` é o caminho comum para falhas após a definição destas funções: regista o erro, audita a tentativa inválida, escreve uma mensagem para `stderr` e termina com código `1`.

## 6. Converter e validar a configuração

```bash
yq '.' "${YAML_FILE}" > "${CONFIG_JSON}" || fail "YAML parsing failed"
node "${SCRIPT_DIR}/validate-allowed-endpoints.mjs" \
  "${CONFIG_JSON}" "${ROOT_DIR}/config/allowed-endpoints.schema.json" ||
  fail "schema validation failed"
```

Primeiro, `yq` analisa o YAML. O `.` significa seleccionar o documento inteiro. A versão de `yq` usada no Debian gera JSON por omissão, que é guardado em `CONFIG_JSON`.

Depois, Node executa o validador com dois argumentos: o JSON temporário e o schema. Qualquer erro de parsing ou validação chama `fail`, antes da geração e aplicação da política.

### O validador JavaScript, passo a passo

Em [validate-allowed-endpoints.mjs](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/infra/sys03-egress-allowlist/validate-allowed-endpoints.mjs):

```js
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
```

Importa as funções nativas do Node necessárias para ler ficheiros, resolver caminhos e permitir carregar os pacotes instalados pelo backend.

```js
const require = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
```

Como este é um ficheiro ES module, `createRequire` cria uma função compatível com `require`. `fileURLToPath` transforma o URL do módulo num caminho normal; `dirname` guarda a pasta do validador.

```js
const moduleRoots = [
    resolve(scriptDirectory, '../../backend/node_modules'),
    resolve(scriptDirectory, '../backend/node_modules'),
    '/opt/laprizza/backend/node_modules',
];
```

O validador procura as dependências Ajv e Ajv Formats em três locais: relativo à árvore de desenvolvimento e no caminho de produção no servidor.

```js
const requireBackendModule = (name) => {
    for (const root of moduleRoots) {
        try {
            return require(resolve(root, name));
        } catch (error) {
            if (error.code !== 'MODULE_NOT_FOUND') throw error;
        }
    }
    throw new Error(`Could not find ${name} in backend production dependencies`);
};
```

Tenta carregar o pacote em cada raiz. Se o erro for “módulo não encontrado”, continua para o caminho seguinte; outros erros são propagados imediatamente. Se esgotar as opções, informa que a dependência de produção não foi encontrada.

```js
const Ajv = requireBackendModule('ajv/dist/ajv.js');
const addFormatsModule =
    requireBackendModule('ajv-formats/dist/index.js');
const addFormats = addFormatsModule.default || addFormatsModule;
```

Carrega Ajv e o complemento de formatos. `default || addFormatsModule` permite lidar com a forma como o módulo exporta a função, consoante a versão/formato do pacote.

```js
const configPath = process.argv[2];
const schemaPath = process.argv[3];

if (!configPath || !schemaPath) {
    console.error('Usage: validate-allowed-endpoints.mjs <config.json> <schema.json>');
    process.exit(2);
}
```

Os argumentos do programa estão em `process.argv`. Se faltar algum, imprime a utilização correcta e termina com código `2`, que representa utilização incorrecta do validador.

```js
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const validate = ajv.compile(schema);
```

Lê os dois ficheiros como UTF-8 e interpreta-os como JSON. Cria Ajv com:

- `allErrors: true`: recolhe mais do que o primeiro erro;
- `strict: true`: activa verificações estritas do schema;
- `strictRequired: false`: desactiva uma verificação estrita específica relacionada com propriedades obrigatórias.

Adiciona formatos como `date`, compila o schema e obtém uma função `validate`.

```js
if (!validate(config)) {
    for (const error of validate.errors || []) {
        console.error(`${error.instancePath || '/'} ${error.message}`);
    }
    process.exit(1);
}
```

Se o JSON não corresponder ao schema, imprime cada erro com o caminho do campo afectado (`instancePath`) e a mensagem. `|| '/'` usa `/` quando o erro não tem caminho específico. Termina com código `1`.

```js
const names = config.endpoints.map((endpoint) => endpoint.name);
const duplicateNames =
    names.filter((name, index) => names.indexOf(name) !== index);
if (duplicateNames.length > 0) {
    console.error(`duplicate endpoint name: ${[...new Set(duplicateNames)].join(', ')}`);
    process.exit(1);
}
```

O schema não consegue expressar directamente a unicidade do campo `name` entre objectos. Este código percorre os endpoints, recolhe os nomes e identifica os repetidos. Se encontrar algum, imprime os nomes sem duplicar a própria mensagem e termina com falha.

## 7. Descobrir DNS e resolver cada destino

O script constrói a lista de servidores DNS:

```bash
NAMESERVER_LIST="$(python3 - "${DOCKER_DNS_SERVERS:-}" <<'PY'
...
PY
)" || fail "invalid DNS resolver configuration"
```

O Python lê os `nameserver` IPv4 do `/etc/resolv.conf` e acrescenta os endereços indicados em `DOCKER_DNS_SERVERS`. Valida cada endereço através de `ipaddress`, rejeita endereços que não sejam IPv4, remove duplicados e exige pelo menos um servidor DNS.

Depois transforma os servidores numa lista Bash:

```bash
mapfile -t NAMESERVERS <<< "${NAMESERVER_LIST}"
```

`mapfile` lê cada linha da saída e coloca-a como um elemento do array `NAMESERVERS`.

A lista usada para resolver os destinos é escolhida assim:

```bash
if [[ -n "${DOCKER_DNS_SERVERS:-}" ]]; then
    mapfile -t RESOLUTION_SERVERS < <(
      tr ',' '\n' <<< "${DOCKER_DNS_SERVERS}" |
      sed 's/^[[:space:]]*//;s/[[:space:]]*$//' |
      sort -u
    )
else
    RESOLUTION_SERVERS=("${NAMESERVERS[@]}")
fi
```

Se estiver configurada uma lista explícita, divide-a pelas vírgulas, remove espaços em redor e ordena/remover duplicados. Caso contrário, usa os DNS obtidos do host.

A lista de resultados começa vazia:

```bash
: > "${RESOLVED}"
FAILED=()
```

`: > ficheiro` cria o ficheiro ou esvazia-o. `FAILED` guardará os destinos externos que não puderam ser resolvidos.

O ciclo lê as linhas produzidas por `jq`:

```bash
while IFS=$'\t' read -r name protocol port destination; do
    ...
done < <(
  jq -r '.endpoints[]
    | select((.internal_only // false) | not)
    | . as $e
    | $e.destinations[] as $d
    | ($e.port // $e.ports[])
    | [$e.name,$e.protocol,(tostring),$d]
    | @tsv' "${CONFIG_JSON}"
)
```

Este `jq`:

1. percorre `.endpoints[]`;
2. exclui as entradas com `internal_only: true`;
3. percorre cada destino de cada endpoint;
4. usa `port` ou, se não existir, percorre `ports`;
5. produz colunas separadas por tabulação: nome, protocolo, porta e destino.

`IFS=$'\t'` diz ao `read` para separar pelos tabs; `-r` impede que barras invertidas sejam interpretadas.

Dentro do ciclo, um destino que contenha `/` é tratado como CIDR:

```bash
if [[ "${destination}" == */* ]]; then
    resolved="$(python3 - "${destination}" <<'PY'
...
PY
)" || fail "invalid/non-IPv4 CIDR destination: ${destination}"
```

O Python interpreta a rede e aceita apenas IPv4 individual com prefixo `/32`. Isto impede usar aqui um intervalo IPv4 amplo ou uma rede IPv6.

Se não for CIDR, trata-se como nome DNS:

```bash
resolved=""
for resolver in "${RESOLUTION_SERVERS[@]}"; do
    answers="$(
      timeout 5s dig +short +time=2 +tries=1 @"${resolver}" \
      "${destination}" A 2>/dev/null |
      grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' || true
    )"
    [[ -z "${answers}" ]] || resolved+="${answers}"$'\n'
done
```

Para cada resolver, `dig` pede registos A. `+short` reduz a resposta ao essencial; `+time=2 +tries=1` limita a espera da consulta; `timeout 5s` impõe um limite exterior. O `grep` mantém apenas linhas com formato IPv4. Erros de `dig` são ocultados e `|| true` permite continuar a consultar os outros servidores.

Depois normaliza as respostas:

```bash
resolved="$(
  printf '%s\n' "${resolved}" |
  grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' |
  sort -u || true
)"
[[ -n "${resolved}" ]] || FAILED+=("${destination}")
```

`sort -u` ordena e remove respostas repetidas. Se não houver nenhuma resposta IPv4, o destino é acrescentado a `FAILED`.

Por cada IP obtido, cria uma linha tabulada:

```bash
for address in ${resolved}; do
    printf '%s\t%s\t%s\t%s\n' \
      "${name}" "${address}" "${protocol}" "${port}" >> "${RESOLVED}"
done
```

Por exemplo, um nome com dois registos A gera duas linhas. Assim, a regra posterior autoriza cada IP resolvido.

Quando termina a resolução:

```bash
[[ ${#FAILED[@]} -eq 0 ]] || fail "DNS resolution failed: ${FAILED[*]}"
[[ -s "${RESOLVED}" ]] || fail "no external allow rules resolved"
```

`#FAILED[@]` é o número de falhas. Se houver qualquer destino não resolvido, a configuração é rejeitada. Se o ficheiro de resultados estiver vazio, não há regra externa para aplicar e a operação também é rejeitada.

## 8. Construir a tabela nftables

O ficheiro de regras começa vazio e inclui uma substituição da tabela anterior, se ela existir:

```bash
: > "${NFT_FILE}"
if nft list table inet laprizza_sys03 >/dev/null 2>&1; then
    printf 'delete table inet laprizza_sys03\n' >> "${NFT_FILE}"
fi
```

`nft list table` é usado aqui como teste de existência. A saída é descartada. Se a tabela existir, a instrução de remoção é acrescentada ao lote que será validado e aplicado.

O script escreve o início da tabela e da chain:

```bash
cat >> "${NFT_FILE}" <<NFT
table inet laprizza_sys03 {
    chain container_egress {
        type filter hook forward priority -10; policy accept;
        ct state invalid drop
        ct state established,related accept
NFT
```

`cat <<NFT` é um *here-document*: tudo até ao delimitador `NFT` é acrescentado ao ficheiro. Aqui não há expansão de variáveis no texto inicial; é um bloco fixo de sintaxe nftables.

- `table inet laprizza_sys03`: cria uma tabela da família `inet`, que pode tratar tráfego IPv4 e IPv6.
- `chain container_egress`: nome da chain gerida pelo script.
- `hook forward`: inspecciona pacotes que o host encaminha, como saída de contentores pela bridge.
- `priority -10`: define a prioridade da chain no hook `forward`.
- `policy accept`: esta chain não descarta por defeito todo o tráfego que a atravessa. As regras explícitas de recusa mais abaixo são limitadas ao tráfego da bridge seleccionada para a WAN.
- `ct state invalid drop`: descarta pacotes que o connection tracking classifica como inválidos.
- `ct state established,related accept`: aceita pacotes de ligações que o connection tracking identifica como estabelecidas ou relacionadas.

As regras de autorização são acrescentadas dinamicamente:

```bash
RULE_COUNT=0
while IFS=$'\t' read -r _name address protocol port; do
    printf '        iifname "%s" oifname "%s" ip saddr %s ip daddr %s %s dport %s accept\n' \
      "${DOCKER_BRIDGE}" "${WAN_INTERFACE}" "${NETWORK_SUBNET}" \
      "${address}" "${protocol}" "${port}" >> "${NFT_FILE}"
    RULE_COUNT=$((RULE_COUNT + 1))
done < <(sort -u "${RESOLVED}")
```

Para cada combinação única de endereço, protocolo e porta:

- `iifname` exige que o pacote entre pela bridge Docker seleccionada;
- `oifname` exige que saia pela interface WAN;
- `ip saddr` limita a origem à sub-rede IPv4 dos contentores;
- `ip daddr` limita o destino ao IP resolvido;
- `tcp dport` ou `udp dport` limita protocolo e porta;
- `accept` autoriza a ligação correspondente;
- `RULE_COUNT` conta as regras de endpoints geradas.

Os DNS são tratados separadamente:

```bash
for nameserver in "${NAMESERVERS[@]}"; do
    for protocol in udp tcp; do
        printf '        iifname "%s" oifname "%s" ip saddr %s ip daddr %s %s dport 53 accept\n' \
          "${DOCKER_BRIDGE}" "${WAN_INTERFACE}" "${NETWORK_SUBNET}" \
          "${nameserver}" "${protocol}" >> "${NFT_FILE}"
        RULE_COUNT=$((RULE_COUNT + 1))
    done
done
```

Para cada servidor DNS, permite consultas tanto UDP/53 — o caso mais comum — como TCP/53, que também pode ser necessário para respostas DNS maiores ou operações específicas.

No fim do bloco são escritas as recusas:

```nft
iifname "<bridge>" oifname "<wan>" ip saddr <subnet> \
  limit rate 5/second burst 10 packets \
  log prefix "LAPRIZZA-SYS03-DENY " flags all

iifname "<bridge>" oifname "<wan>" ip saddr <subnet> counter drop

iifname "<bridge>" oifname "<wan>" meta nfproto ipv6 \
  limit rate 5/second burst 10 packets \
  log prefix "LAPRIZZA-SYS03-DENY6 " flags all

iifname "<bridge>" oifname "<wan>" meta nfproto ipv6 counter drop
```

As duas primeiras regras são para tráfego IPv4 não autorizado da bridge para a WAN:

1. `limit rate ... log` regista até cinco mensagens por segundo, com um burst inicial de dez pacotes;
2. `counter drop` incrementa o contador e descarta o pacote.

As duas seguintes fazem o mesmo para IPv6, usando o prefixo `LAPRIZZA-SYS03-DENY6`. A política actual não gera allow rules IPv6 para os endpoints; a saída IPv6 da bridge seleccionada para a WAN é descartada.

Finalmente:

```bash
}
NFT
```

Fecha a chain, a tabela e o *here-document*. Até este ponto o script só construiu texto num ficheiro temporário; ainda não aplicou a nova tabela.

## 9. Validar, pré-visualizar e aplicar

```bash
log INFO "Validated YAML sha256=${YAML_SHA256}; network=..."
nft -c -f "${NFT_FILE}" || fail "nftables syntax/check failed; previous policy remains active"
```

A primeira linha regista a configuração validada, a rede descoberta, a sub-rede, as interfaces e a quantidade de regras. `nft -c -f` pede ao nftables para verificar o lote sem o aplicar. Se houver erro, chama `fail` e termina antes da aplicação.

O comportamento predefinido é apenas mostrar o plano:

```bash
if [[ "${APPLY}" != "true" ]]; then
    cat "${NFT_FILE}"
    echo "EGRESS: VALID — preview only; no rules changed. Review, then rerun with APPLY=true to apply."
    exit 0
fi
```

Se `APPLY` não for exactamente `true`, imprime o conteúdo gerado e termina com sucesso. Isto permite rever as regras propostas sem alterar o estado activo.

A aplicação é explícita:

```bash
nft -f "${NFT_FILE}" ||
  fail "nftables apply failed; previous policy should remain active"
audit success "${RULE_COUNT}"
log INFO "Applied container egress policy atomically; host OUTPUT and Docker-managed tables were left unchanged"
echo "EGRESS: SUCCESS — ${RULE_COUNT} allow rules applied to ${DOCKER_EGRESS_NETWORK}"
nft list table inet laprizza_sys03
```

- `nft -f` pede ao nftables para aplicar o lote.
- Se falhar, `fail` regista uma tentativa inválida.
- Se resultar, `audit success` guarda a quantidade de regras, hash e origem.
- A mensagem de log deixa claro que o âmbito são os contentores e que `OUTPUT` do host e tabelas Docker não foram substituídos.
- `nft list table` mostra a tabela que ficou activa.

**Distinção importante na defesa:** `nft -c` valida, mas não aplica. `nft -f` aplica. `APPLY=true` é o que selecciona o segundo caminho.

# O validador, ligado ao resultado observado

No teste que enviaste, o erro foi:

```text
/endpoints/3/protocol must be equal to one of the allowed values
...
EGRESS: INVALID — schema validation failed
```

Isto corresponde ao caminho `/endpoints/3/protocol`: o quinto item da lista — índices JSON começam em zero — tinha um `protocol` que não correspondia aos permitidos pelo schema (`tcp` e `udp`). O validador imprime o caminho e a razão; o Bash chama `fail`; a tabela não chega ao bloco de aplicação.

# Como explicar os testes e o que cada um demonstra

## 1. Pré-visualização

```bash
make egress-dry-run
```

O alvo chama o script sem `APPLY=true`. Demonstra que o YAML foi analisado, validado, resolvido e convertido num lote que passou `nft -c`. **Não demonstra, por si só, que essa tabela foi aplicada.**

Depois de uma aplicação, a verificação do estado activo é:

```bash
sudo nft list table inet laprizza_sys03
```

## 2. Destino permitido e destino recusado

Os registos de validação em `docs/asist/evidence/sys02-sys03-vs582-20261121.md` resumem os seguintes resultados no servidor:

- Google por HTTPS: resposta HTTP 200;
- Gmail por TCP/587: ligação estabelecida;
- `1.1.1.1:443`, que não consta da lista autorizada: timeout e aumento do contador IPv4 de *drop*.

O teste permitido demonstra que o serviço necessário continua acessível. O teste recusado, em conjunto com o contador, dá evidência de que o pacote não autorizado foi descartado pela política.

## 3. Configuração inválida e preservação da tabela

O teste de configuração inválida que executaste usou uma cópia temporária do YAML, modificou o valor de `protocol` e comparou a tabela antes e depois. A saída que partilhaste foi:

```text
/endpoints/3/protocol must be equal to one of the allowed values
[ERROR] schema validation failed
EGRESS: INVALID — schema validation failed
PASS: configuração inválida rejeitada (exit=1)
PASS: a política activa não mudou
...
ACTION=apply RESULT=invalid ...
```

Este teste demonstra quatro coisas para aquela alteração inválida:

1. o schema detectou o valor não permitido;
2. o script devolveu código de erro;
3. a operação ficou registada como inválida;
4. a tabela comparada antes e depois não mudou.

## 4. Serviço e timer

Os comandos de verificação descritos no runbook são:

```bash
sudo systemctl status laprizza-egress.service
systemctl is-enabled laprizza-egress.timer
systemctl list-timers laprizza-egress.timer
sudo journalctl -u laprizza-egress --no-pager
```

Mostram, respectivamente, o estado da execução do serviço, se o timer está activado, a próxima execução agendada e as mensagens de execuções anteriores. A evidência versionada da SYS03 regista timer activo e uma execução manual do serviço terminada com `status=0/SUCCESS`.

## 5. Auditoria e mensagens do kernel

```bash
sudo tail -n 20 /var/log/laprizza/egress.log
sudo tail -n 20 /var/log/laprizza/egress-changes.log
sudo journalctl -k --grep 'LAPRIZZA-SYS03-DENY' --no-pager
sudo nft list table inet laprizza_sys03
```

- `egress.log`: mensagens de validação e execução.
- `egress-changes.log`: actor, resultado, contagem de regras, hash do YAML e revisão Git.
- `journalctl -k`: mensagens do kernel geradas pelas regras `log`.
- `nft list table`: regras e contadores activos.

O `limit rate` nas regras de log impede que cada pacote de um fluxo intenso produza uma mensagem. Por isso, os registos são limitados; os contadores de *drop* continuam a ser úteis para observar o tráfego descartado.

# `vim` versus `cat <<NFT`

A pergunta é boa, mas na SYS03 há **dois tipos diferentes de ficheiro**:

1. **A configuração mantida por pessoas:** `config/allowed-endpoints.yml`. É perfeitamente razoável editá-la com `vim`, VS Code ou outro editor.
2. **As regras nftables geradas:** `policy.nft`, em `/tmp`. São produzidas pelo script para incorporar valores dinâmicos descobertos nessa execução.

Por exemplo, uma alteração manual legítima começa por editar o YAML, não por editar `policy.nft`:

```bash
vim config/allowed-endpoints.yml
make egress-dry-run
make egress-apply
```

O `cat <<NFT` no script escreve um bloco de regras para um ficheiro temporário. As regras autorizadas são acrescentadas com `printf`, porque contêm variáveis como bridge, interface WAN, IP resolvido e porta. Um editor interactivo não serve para a execução do serviço systemd, que tem de terminar sem esperar por uma pessoa.

Também convém corrigir uma ideia demasiado absoluta da resposta de referência: usar `vim` **não impede** versionamento ou auditoria. Se editares o YAML dentro do repositório, a alteração pode ser versionada em Git e revista por pull request. A vantagem do script é gerar as regras activas de forma repetível a partir dessa configuração, validá-las e aplicar apenas o lote produzido.

# Perguntas difíceis do professor

**“Qual é a diferença entre a allowlist YAML e a tabela nftables?”**  
A YAML é a configuração humana e versionada. A tabela nftables é a representação activa no kernel, gerada a partir da YAML depois de validação e resolução DNS.

**“Por que o script consulta a rede Docker?”**  
Para construir as regras com a sub-rede e a bridge da rede seleccionada. Assim, a regra aplica-se ao tráfego que parte dessa rede e não a uma interface presumida sem validação.

**“Porque resolver nomes para IPv4?”**  
As regras geradas usam endereços IP concretos. O script consulta os servidores configurados, reúne as respostas A e cria uma regra por endereço resolvido.

**“O que acontece se um endpoint não resolver?”**  
O nome entra na lista `FAILED`; no fim da fase DNS, `fail` termina o script antes de substituir a tabela.

**“O que garante que o YAML está bem formado?”**  
`yq` tenta analisá-lo. Depois, Ajv valida o JSON contra o schema. O validador também verifica a unicidade dos nomes dos endpoints.

**“O `policy accept` significa que tudo está permitido?”**  
Não significa isso isoladamente. As regras explícitas de recusa da SYS03 correspondem à bridge e sub-rede seleccionadas em direcção à WAN. O `policy accept` evita que esta chain descarte indiscriminadamente todo o encaminhamento do host.

**“Porque há uma regra `established,related accept`?”**  
Para deixar passar pacotes pertencentes a ligações que o connection tracking já conhece. As regras de autorização definem os novos destinos e portas; o estado permite o tráfego das ligações autorizadas já estabelecidas.

**“A SYS03 controla a saída do host?”**  
Não. O âmbito declarado é o tráfego encaminhado dos contentores de runtime. A saída originada pelo host e as tabelas que o Docker gere ficam fora da tabela `laprizza_sys03`.

**“Porque existe um timer de seis em seis horas?”**  
As regras contêm IPs resolvidos, que podem mudar com o DNS. O timer volta a validar e resolver a configuração e reaplica a tabela.

**“A alteração de firewall exige reiniciar a aplicação?”**  
Não. `nft -f` aplica a tabela no kernel; o alvo `make egress-apply` não reinicia os serviços da aplicação.

**“O que prova `nft -c`?”**  
Que o lote gerado é aceite pela verificação do nftables. Como é modo de verificação, não prova que a tabela tenha sido instalada.

**“O que prova a comparação antes/depois do teste inválido?”**  
Que, para aquela configuração que falhou no schema, a execução não alterou a tabela activa observada. O output também mostrou o erro e o código de saída não zero.

**Resposta curta para apresentar a SYS03:**  
“Definimos os destinos externos num YAML versionado e validado por JSON Schema. O script resolve os nomes, descobre a rede Docker e a interface WAN, gera uma tabela nftables específica para o tráfego encaminhado dos contentores, valida-a com `nft -c` e só a aplica com `APPLY=true`. As regras autorizam os destinos e portas definidos, registam e descartam a saída não listada, e um timer renova os IPs obtidos por DNS. Verificámos destinos permitidos e bloqueados e testámos que um `protocol` inválido é rejeitado sem alterar a tabela activa.”
