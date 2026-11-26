# SYS03 — explicação e defesa das decisões de implementação

A SYS03 limita o tráfego de saída dos contentores da aplicação. Os destinos autorizados são declarados num YAML; o script valida essa configuração, resolve os nomes DNS e gera uma tabela nftables para o tráfego encaminhado da rede Docker seleccionada.

Os principais ficheiros são [egress.sh](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/infra/sys03-egress-allowlist/egress.sh), [validate-allowed-endpoints.mjs](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/infra/sys03-egress-allowlist/validate-allowed-endpoints.mjs), [allowed-endpoints.yml](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/config/allowed-endpoints.yml) e [allowed-endpoints.schema.json](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/config/allowed-endpoints.schema.json).

## 1. Desenho geral e limites da política

O fluxo é:

```text
YAML de endpoints
    → análise e conversão para JSON
    → validação pelo schema e pelo validador
    → descoberta da rede Docker
    → resolução dos destinos externos por DNS
    → geração de regras nftables
    → verificação do lote
    → aplicação explícita da tabela
```

A tabela chama-se `inet laprizza_sys03` e filtra tráfego na chain `container_egress`, ligada ao hook `forward`.

**Justificação:** os contentores comunicam com destinos externos através do encaminhamento do host. Por isso, o controlo é aplicado no caminho `forward`, e não em `OUTPUT`, que corresponde a tráfego originado pelo próprio servidor. A tabela dedicada permite gerir a política SYS03 sem substituir as tabelas do Docker nem a política de saída do host.

## 2. Modo estrito e descoberta dos caminhos

No início do [egress.sh](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/infra/sys03-egress-allowlist/egress.sh):

```bash
set -euo pipefail
umask 027
```

- `-e` termina o script se um comando falhar;
- `-u` trata variáveis não definidas como erro;
- `pipefail` propaga falhas de comandos dentro de pipelines;
- `umask 027` limita as permissões dos ficheiros criados.

**Justificação:** uma falha de validação, resolução ou descoberta não deve produzir uma política parcial. O `umask` estabelece uma base restritiva para os ficheiros temporários e logs criados pelo processo.

O script determina a sua localização e a raiz do repositório:

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${LAPRIZZA_REPO_DIR:-}"
```

Se `LAPRIZZA_REPO_DIR` não estiver definida, procura uma pasta que contenha `config/allowed-endpoints.yml` relativamente à localização do script. Se não encontrar, usa `/opt/laprizza`.

**Justificação:** o mesmo script pode ser executado a partir da árvore do repositório ou da instalação de produção. A variável `LAPRIZZA_REPO_DIR` permite ainda indicar uma raiz temporária durante testes controlados.

Depois define os caminhos de configuração e logs:

```bash
YAML_FILE="${ROOT_DIR}/config/allowed-endpoints.yml"
POLICY_ENV="${NETWORK_POLICY_FILE:-/etc/laprizza/network-policy.env}"
EGRESS_LOG="${EGRESS_LOG:-/var/log/laprizza/egress.log}"
CHANGES_LOG="${CHANGES_LOG:-/var/log/laprizza/egress-changes.log}"
ADMIN_GROUP="${ADMIN_GROUP:-laprizza-admins}"
APPLY="${APPLY:-false}"
```

`APPLY` começa como `false`. Os restantes caminhos podem ser substituídos pelo ambiente, o que permite direccionar logs e configuração para uma área de teste.

**Justificação:** separar os parâmetros da lógica torna o script reutilizável e testável. Manter a pré-visualização como predefinição evita que a simples execução altere a política activa.

## 3. Actor, revisão e configuração da máquina

```bash
ACTOR="${ACTOR:-${SUDO_USER:-$(id -un)}}"
SRC_COMMIT="${SRC_COMMIT:-$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || echo uncommitted)}"
```

`ACTOR` identifica quem iniciou a operação: usa a variável explícita, depois `SUDO_USER`, e finalmente o utilizador actual. `SRC_COMMIT` tenta guardar o commit curto associado à árvore; se não conseguir, regista `uncommitted`.

**Justificação:** estas informações tornam a auditoria útil para relacionar uma aplicação com o utilizador e com a versão do código/configuração usada.

O ficheiro de configuração do host é carregado se existir:

```bash
if [[ -f "${POLICY_ENV}" ]]; then
    set -a
    source "${POLICY_ENV}"
    set +a
fi
```

`source` lê as variáveis no contexto do script. `set -a` exporta-as para os processos chamados; `set +a` desliga a exportação automática depois da leitura.

**Justificação:** parâmetros como a rede Docker, a interface WAN e os DNS upstream podem variar entre servidores sem estarem escritos directamente no script. Como `source` executa comandos Bash, o ficheiro deve permanecer protegido e sob controlo administrativo.

## 4. Privilégios, dependências e configuração obrigatória

```bash
if [[ "$(id -u)" -ne 0 ]]; then
    echo "SYS03: run as root (or with sudo)." >&2
    exit 1
fi
```

`id -u` verifica o UID. A alteração de regras nftables exige `root`; se o UID não for zero, o script termina.

**Justificação:** falhar explicitamente é preferível a continuar até uma operação privilegiada falhar de forma menos clara.

```bash
for cmd in node yq jq dig timeout sha256sum nft docker ip python3 chgrp; do
    command -v "${cmd}" >/dev/null 2>&1 || {
        echo "SYS03: required command missing: ${cmd}" >&2
        exit 1
    }
done
```

Confirma que estão disponíveis as ferramentas necessárias: Node e Ajv para a validação, `yq` e `jq` para processar a configuração, `dig` e `timeout` para DNS, `nft` para a firewall, Docker e `ip` para descobrir a rede, Python para validar IPs, e `sha256sum`/`chgrp` para auditoria e permissões.

**Justificação:** uma ausência de dependência é detectada antes de qualquer tentativa de aplicar regras.

```bash
[[ -f "${YAML_FILE}" ]] || {
    echo "SYS03: allowlist not found: ${YAML_FILE}" >&2
    exit 1
}
```

O YAML tem de existir.

**Justificação:** sem uma fonte de configuração não há uma política que possa ser validada e aplicada. O script não deve inventar uma lista vazia nem continuar silenciosamente.

## 5. Descobrir e validar a rede Docker

```bash
DOCKER_EGRESS_NETWORK="${DOCKER_EGRESS_NETWORK:-laprizza_laprizza-network}"
WAN_INTERFACE="${WAN_INTERFACE:-$(ip -4 route show default | awk 'NR == 1 { for (i=1; i<=NF; i++) if ($i == "dev") { print $(i+1); exit } }')}"
```

A rede Docker tem um valor predefinido. Se a interface WAN não estiver configurada, `ip -4 route show default` apresenta a rota IPv4 predefinida e `awk` extrai o valor que segue `dev`.

```bash
[[ -n "${WAN_INTERFACE}" && "${WAN_INTERFACE}" =~ ^[a-zA-Z0-9_.:-]+$ ]] || {
    echo "SYS03: set a valid WAN_INTERFACE." >&2
    exit 1
}
```

Confirma que a interface existe como valor não vazio e tem um formato admissível.

**Justificação:** as regras distinguem o tráfego que entra pela bridge e sai pela WAN. Uma interface errada poderia deixar tráfego fora do âmbito pretendido; validar o valor também evita inserção de texto inesperado nas regras.

O Docker fornece o ID e a sub-rede da rede:

```bash
NETWORK_INFO="$(docker network inspect "${DOCKER_EGRESS_NETWORK}" \
  --format '{{.Id}} {{range .IPAM.Config}}{{.Subnet}}{{end}}' \
  2>/dev/null || true)"
```

`docker network inspect` consulta a rede seleccionada. Os erros são ocultados e `|| true` permite que o script teste a resposta e apresente a sua própria mensagem se a rede não existir.

```bash
[[ -n "${NETWORK_INFO}" ]] || {
    echo "SYS03: Docker egress network not found: ${DOCKER_EGRESS_NETWORK}" >&2
    exit 1
}
NETWORK_ID="${NETWORK_INFO%% *}"
```

Se a resposta estiver vazia, termina. Caso contrário, conserva o ID antes do primeiro espaço.

A sub-rede passa por validação Python:

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

Python interpreta e normaliza a rede. Se não for uma rede válida ou não for IPv4, o script termina.

**Justificação:** a política actual gera regras com origem IPv4. É melhor rejeitar uma rede inesperada do que aplicar uma regra que não representa correctamente a rede runtime.

```bash
DOCKER_BRIDGE="${DOCKER_BRIDGE:-br-${NETWORK_ID:0:12}}"
[[ "${DOCKER_BRIDGE}" =~ ^[a-zA-Z0-9_.:-]+$ ]] || {
    echo "SYS03: invalid Docker bridge interface." >&2
    exit 1
}
```

O nome predefinido da bridge é `br-` seguido dos primeiros 12 caracteres do ID da rede, com possibilidade de configuração explícita.

**Justificação:** o ID da rede e a bridge podem mudar quando o Docker recria a rede. A descoberta reduz a dependência de nomes fixos; a validação protege o texto inserido no lote nftables.

## 6. Preparar ficheiros temporários e auditoria

```bash
TEMP_DIR="$(mktemp -d /tmp/laprizza-egress.XXXXXX)"
trap 'rm -rf "${TEMP_DIR}"' EXIT
CONFIG_JSON="${TEMP_DIR}/config.json"
NFT_FILE="${TEMP_DIR}/policy.nft"
RESOLVED="${TEMP_DIR}/resolved.tsv"
YAML_SHA256="$(sha256sum "${YAML_FILE}" | awk '{print $1}')"
```

Cria uma pasta temporária com nome imprevisível e remove-a quando o script terminar. Guarda nela:

- o JSON convertido;
- o lote de regras nftables;
- a lista tabulada dos destinos resolvidos.

O hash identifica o conteúdo exacto do YAML utilizado.

**Justificação:** os dados intermédios são gerados em cada execução e não devem ser confundidos com a configuração mantida no Git. O hash permite identificar que versão de conteúdo foi aplicada.

Os logs são preparados assim:

```bash
mkdir -p "$(dirname "${EGRESS_LOG}")" "$(dirname "${CHANGES_LOG}")"
touch "${EGRESS_LOG}" "${CHANGES_LOG}"
chgrp "${ADMIN_GROUP}" "${EGRESS_LOG}" "${CHANGES_LOG}"
chmod 640 "${EGRESS_LOG}" "${CHANGES_LOG}"
```

Cria as pastas e os ficheiros, atribui-lhes o grupo administrativo e define permissões `640`.

A função `log` escreve uma mensagem com data UTC tanto no log como na saída:

```bash
log() {
    printf '[%s] [%s] %s\n' \
      "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$1" "$2" |
      tee -a "${EGRESS_LOG}"
}
```

A função `audit` acrescenta uma linha estruturada a `egress-changes.log` com actor, acção, resultado, número de regras, hash e origem Git.

```bash
audit() {
    printf 'TS=%s ACTOR=%s ACTION=apply RESULT=%s RULES=%s SHA256=%s SRC=%s\n' \
      "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "${ACTOR}" "$1" \
      "${2:-0}" "${YAML_SHA256}" "${SRC_COMMIT}" >> "${CHANGES_LOG}"
    chmod 640 "${CHANGES_LOG}"
    chgrp "${ADMIN_GROUP}" "${CHANGES_LOG}"
}
```

**Justificação:** os logs operacionais explicam o que aconteceu; o registo de alterações permite relacionar cada tentativa de aplicação com o utilizador e a configuração.

As falhas passam pela função comum:

```bash
fail() {
    log ERROR "$1"
    audit invalid 0
    echo "EGRESS: INVALID — $1" >&2
    exit 1
}
```

Regista a causa, audita o resultado como inválido, envia uma mensagem para `stderr` e termina com código `1`.

**Justificação:** uma configuração rejeitada não deve ser confundida com uma aplicação bem-sucedida. O erro também fica disponível no terminal ou no journal do serviço.

## 7. Converter e validar o YAML

```bash
yq '.' "${YAML_FILE}" > "${CONFIG_JSON}" ||
    fail "YAML parsing failed"
```

`yq` analisa o documento YAML e produz JSON. O `.` selecciona o documento inteiro.

**Justificação:** YAML é conveniente para edição humana; o JSON produzido facilita a validação pelo validador e a extracção dos campos por `jq`.

Depois:

```bash
node "${SCRIPT_DIR}/validate-allowed-endpoints.mjs" \
  "${CONFIG_JSON}" \
  "${ROOT_DIR}/config/allowed-endpoints.schema.json" ||
  fail "schema validation failed"
```

O validador recebe o JSON e o schema. Se falhar, `fail` regista a tentativa inválida. Esta etapa acontece antes de resolver destinos ou construir a tabela.

**Justificação:** encontrar erros de estrutura e valores antes de chegar à firewall evita gerar regras com endpoints mal formados.

## 8. O validador JavaScript e as decisões do schema

O ficheiro [validate-allowed-endpoints.mjs](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/infra/sys03-egress-allowlist/validate-allowed-endpoints.mjs) carrega as bibliotecas Ajv e Ajv Formats a partir das dependências do backend, procurando primeiro na árvore do repositório e depois em `/opt/laprizza/backend/node_modules`.

**Justificação:** reutilizar dependências de produção já instaladas evita manter uma cópia separada destas bibliotecas apenas para validar a configuração.

O validador exige dois argumentos:

```text
validate-allowed-endpoints.mjs <config.json> <schema.json>
```

Se faltar algum, apresenta a utilização e termina com código `2`.

Depois lê ambos os ficheiros com `readFileSync`, converte-os de JSON, cria Ajv com validação estrita e `allErrors: true`, activa os formatos e compila o schema.

**Justificação:** `allErrors: true` permite apresentar vários erros numa execução; validação estrita ajuda a detectar definições de schema inconsistentes; os formatos são necessários para validar campos como datas.

Se Ajv encontrar erros, o script imprime o caminho do campo e a mensagem, por exemplo:

```text
/endpoints/3/protocol must be equal to one of the allowed values
```

Depois termina com código `1`.

Por fim, verifica nomes repetidos:

```js
const names = config.endpoints.map((endpoint) => endpoint.name);
const duplicateNames =
    names.filter((name, index) => names.indexOf(name) !== index);
```

Se houver nomes duplicados, imprime-os e termina.

**Justificação:** o schema valida a estrutura e os valores de cada endpoint, mas a unicidade entre propriedades `name` de vários objectos é tratada explicitamente pelo validador.

## 9. Descobrir os servidores DNS

O script executa Python para recolher servidores IPv4 de `/etc/resolv.conf` e acrescentar os endereços definidos em `DOCKER_DNS_SERVERS`.

O Python:

1. percorre linhas `nameserver`;
2. valida os endereços através de `ipaddress`;
3. conserva os IPv4;
4. valida os valores de `DOCKER_DNS_SERVERS`;
5. remove duplicados;
6. exige que exista pelo menos um resolver.

A saída é carregada para o array `NAMESERVERS` através de `mapfile`.

**Justificação:** os nomes configurados precisam de ser resolvidos antes de serem convertidos em regras IP. Validar a lista de resolvers evita usar um endereço mal formado ou não suportado.

A lista de resolvers para as consultas é seleccionada assim:

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

Se houver DNS upstream Docker explícitos, o script consulta esses endereços; caso contrário, usa os resolvers IPv4 recolhidos do host.

**Justificação:** quando os contentores usam o DNS embutido do Docker, esse resolver encaminha consultas para upstreams configurados no host. Consultar esses mesmos upstreams ajuda a alinhar os IPs autorizados com as respostas DNS que a aplicação recebe.

## 10. Resolver os destinos do YAML

```bash
: > "${RESOLVED}"
FAILED=()
```

Esvazia/cria o ficheiro de resultados e inicializa a lista de nomes que falharem resolução.

O `jq` percorre os endpoints, ignora os marcados `internal_only`, expande destinos e portas e produz linhas tabuladas:

```bash
.endpoints[]
| select((.internal_only // false) | not)
| . as $e
| $e.destinations[] as $d
| ($e.port // $e.ports[])
| [$e.name,$e.protocol,(tostring),$d]
| @tsv
```

**Justificação:** endpoints internos como `prolog` e `postgres` não devem gerar regras de saída para a Internet. As regras externas são construídas apenas para endpoints não internos.

Dentro do ciclo, destinos com `/` são tratados como redes:

```bash
if [[ "${destination}" == */* ]]; then
```

O Python valida que se trata de um endereço IPv4 `/32`, ou seja, um único endereço, e não um intervalo amplo.

**Justificação:** permitir apenas um IPv4 individual neste formato limita a amplitude de uma regra escrita como CIDR.

Os restantes destinos são tratados como nomes DNS. Para cada resolver, o script executa `dig` para registos A, com limites de tempo:

```bash
timeout 5s dig +short +time=2 +tries=1 \
  @"${resolver}" "${destination}" A
```

O `grep` conserva respostas IPv4; `sort -u` agrega e remove duplicados entre os resolvers.

Se um nome não produzir respostas IPv4, é acrescentado a `FAILED`. Depois do ciclo:

```bash
[[ ${#FAILED[@]} -eq 0 ]] ||
    fail "DNS resolution failed: ${FAILED[*]}"
[[ -s "${RESOLVED}" ]] ||
    fail "no external allow rules resolved"
```

A aplicação é interrompida se algum destino externo não resolver ou se não houver regras externas.

**Justificação:** não é seguro aplicar uma nova tabela parcialmente, com alguns destinos autorizados e outros omitidos por uma falha DNS. A resolução completa é um pré-requisito para avançar.

## 11. Construir a tabela nftables

O script começa por esvaziar o ficheiro de regras e inclui uma instrução para apagar a tabela anterior, caso exista:

```bash
: > "${NFT_FILE}"
if nft list table inet laprizza_sys03 >/dev/null 2>&1; then
    printf 'delete table inet laprizza_sys03\n' >> "${NFT_FILE}"
fi
```

**Justificação:** ao gerar a tabela inteira, a execução seguinte não acumula regras duplicadas. A substituição limita-se à tabela gerida pela SYS03.

O início do lote é:

```nft
table inet laprizza_sys03 {
    chain container_egress {
        type filter hook forward priority -10; policy accept;
        ct state invalid drop
        ct state established,related accept
```

- `table inet`: família capaz de expressar regras IPv4 e IPv6.
- `hook forward`: observa pacotes encaminhados pelo host.
- `priority -10`: define a prioridade da chain no hook.
- `policy accept`: mantém a decisão por omissão desta chain como aceitar, e são as regras específicas seguintes que limitam o tráfego seleccionado.
- `ct state invalid drop`: descarta pacotes inválidos.
- `ct state established,related accept`: aceita tráfego de ligações já estabelecidas ou relacionadas.

**Justificação:** o controlo SYS03 concentra-se no tráfego de saída dos contentores pela bridge de runtime para a WAN. Não substitui a política global de encaminhamento do host nem pretende assumir a gestão das tabelas Docker.

As regras permitidas são geradas a partir do ficheiro `RESOLVED`:

```bash
while IFS=$'\t' read -r _name address protocol port; do
    printf 'iifname "%s" oifname "%s" ip saddr %s ip daddr %s %s dport %s accept\n' \
      "${DOCKER_BRIDGE}" "${WAN_INTERFACE}" "${NETWORK_SUBNET}" \
      "${address}" "${protocol}" "${port}" >> "${NFT_FILE}"
    RULE_COUNT=$((RULE_COUNT + 1))
done < <(sort -u "${RESOLVED}")
```

Cada regra exige:

- entrada pela bridge seleccionada;
- saída pela interface WAN;
- origem dentro da sub-rede da rede Docker;
- destino igual ao IP resolvido;
- protocolo e porta declarados no YAML.

Depois aceita esse fluxo. `sort -u` evita gerar regras exactamente repetidas, e `RULE_COUNT` conta as regras de endpoint.

**Justificação:** a regra combina interface, sub-rede, destino e serviço. Uma autorização não se aplica a qualquer processo do host nem a qualquer contentor: aplica-se ao tráfego da rede seleccionada para o destino e porta especificados.

## 12. Permitir DNS e registar/descartar o restante

Para cada resolver da lista, são geradas regras DNS UDP e TCP na porta 53:

```bash
for nameserver in "${NAMESERVERS[@]}"; do
    for protocol in udp tcp; do
        ...
        ip daddr "${nameserver}" "${protocol}" dport 53 accept
    done
done
```

**Justificação:** os contentores precisam de resolver nomes; sem uma regra DNS, poderiam não conseguir alcançar nem os destinos que estão autorizados. TCP/53 é incluído juntamente com UDP/53 para suportar consultas que usem TCP.

O fim da chain contém regras de log e `drop` para IPv4 e IPv6:

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

- O primeiro par regista e descarta tráfego IPv4 da bridge para a WAN que não correspondeu às autorizações anteriores.
- O segundo par regista e descarta tráfego IPv6 nesse caminho.
- `limit rate` limita a frequência do logging.
- `counter` conta os pacotes descartados.

**Justificação:** uma allowlist precisa de um comportamento definido para o que não está listado. Aqui, o tráfego seleccionado que não corresponde a uma autorização é descartado; o prefixo permite procurá-lo no journal e os contadores permitem observar os descartes sem depender apenas do número de mensagens de log.

A política actual não gera autorizações IPv6 para endpoints. O tráfego IPv6 da bridge para a WAN é tratado pelas regras explícitas de `drop`.

## 13. Validar, pré-visualizar e aplicar

Depois de gerar o ficheiro, o script regista um resumo com hash, rede e número de regras. Em seguida:

```bash
nft -c -f "${NFT_FILE}" ||
    fail "nftables syntax/check failed; previous policy remains active"
```

`-c` verifica o lote sem o aplicar.

**Justificação:** há duas validações distintas. Ajv verifica o conteúdo da configuração; `nft -c` verifica o lote nftables que foi efectivamente gerado. O segundo passo detecta problemas na sintaxe da política final antes da aplicação.

O modo normal é pré-visualizar:

```bash
if [[ "${APPLY}" != "true" ]]; then
    cat "${NFT_FILE}"
    echo "EGRESS: VALID — preview only; no rules changed. Review, then rerun with APPLY=true to apply."
    exit 0
fi
```

Sem `APPLY=true`, o lote é mostrado e a tabela activa não é alterada.

**Justificação:** uma execução para inspecção não deve modificar inadvertidamente a firewall. A aplicação fica separada e explícita.

Com `APPLY=true`:

```bash
nft -f "${NFT_FILE}" ||
    fail "nftables apply failed; previous policy should remain active"
audit success "${RULE_COUNT}"
log INFO "Applied container egress policy atomically; host OUTPUT and Docker-managed tables were left unchanged"
echo "EGRESS: SUCCESS — ${RULE_COUNT} allow rules applied to ${DOCKER_EGRESS_NETWORK}"
nft list table inet laprizza_sys03
```

`nft -f` aplica o lote. Se falhar, a tentativa é registada como inválida. Se tiver sucesso, escreve a auditoria, regista a aplicação e apresenta a tabela activa.

**Justificação:** o uso de um lote permite substituir a tabela como uma operação de configuração única, após a validação. A última listagem confirma o resultado no estado activo do kernel.

## 14. O schema e a razão das restrições

O [schema JSON](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/config/allowed-endpoints.schema.json) estabelece, entre outras regras:

- `version` é obrigatório e tem de ser `1`;
- `endpoints` é obrigatório e não pode estar vazio;
- campos não definidos no schema são rejeitados;
- `protocol` só pode ser `tcp` ou `udp`;
- cada endpoint tem `port` ou `ports`, mas não ambos;
- as portas têm de estar entre 1 e 65535;
- cada destino é uma string não vazia;
- os nomes têm formato restrito.

**Justificação:** a validação transforma a configuração numa interface controlada para a política. Erros de escrita, portas inválidas ou propriedades inesperadas são detectados antes de serem convertidos em regras.

Os nomes dos endpoints são ainda verificados pelo JavaScript para evitar duplicados. Essa validação adicional foi escolhida porque a unicidade da propriedade `name` entre vários objectos não é garantida simplesmente por validar cada objecto individualmente.

## 15. Actualização DNS automática

O serviço e o timer estão em [laprizza-egress.service](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/config/cron/laprizza-egress.service) e [laprizza-egress.timer](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/config/cron/laprizza-egress.timer).

O serviço é `oneshot`, corre como `root`, define `APPLY=true` e executa o script instalado em `/opt/laprizza/scripts/egress.sh`. O timer agenda novas execuções de seis em seis horas.

**Justificação:** os nomes DNS podem passar a apontar para outros endereços. Como as regras nftables geradas contêm endereços IP resolvidos, uma execução periódica volta a validar a configuração e a actualizar esses IPs sem exigir alteração manual de regras.

`make egress-timer` instala os ficheiros necessários e activa o timer. O Makefile verifica primeiro que Ajv e Ajv Formats estão instalados nas dependências de produção do backend.

## 16. Verificações e justificação de cada teste

### Pré-visualizar

```bash
make egress-dry-run
```

Valida o YAML, resolve os destinos, constrói o lote e executa `nft -c`, sem aplicar as regras.

**Justificação:** permite rever a política proposta antes de alterar a firewall.

**Limite:** não prova que a tabela esteja activa.

### Aplicar

```bash
make egress-apply
```

Define `APPLY=true` e executa o caminho de aplicação.

**Justificação:** a aplicação requer uma decisão explícita distinta da pré-visualização.

### Inspeccionar a política activa

```bash
sudo nft list table inet laprizza_sys03
```

**Justificação:** confirma que a tabela está no estado activo do kernel e permite verificar destinos, portas, regras de descarte e contadores.

### Verificar o serviço e o timer

```bash
sudo systemctl status laprizza-egress.service
systemctl is-enabled laprizza-egress.timer
systemctl list-timers laprizza-egress.timer
sudo journalctl -u laprizza-egress --no-pager
```

Estes comandos mostram o resultado da execução do serviço, se o timer está habilitado, quando está prevista a próxima execução e as mensagens das execuções.

**Justificação:** a presença do script no repositório não prova que foi instalado ou executado no servidor. As unidades systemd permitem verificar essa parte operacional.

### Testar um destino permitido e um não permitido

Os resultados registados na evidência SYS03 indicam que:

- HTTPS para Google devolveu HTTP 200;
- TCP/587 para Gmail foi estabelecido;
- a ligação a `1.1.1.1:443`, que não estava na allowlist, expirou e incrementou o contador IPv4 de `drop`.

**Justificação:** testar os dois casos verifica simultaneamente a disponibilidade dos serviços necessários e a recusa de um destino não declarado. O contador de `drop` ajuda a relacionar a falha com a política de firewall; um timeout sem essa correlação não identifica, por si só, onde ocorreu o bloqueio.

### Testar configuração inválida

Na execução partilhada, uma cópia temporária da configuração continha um `protocol` não permitido. O resultado foi:

```text
/endpoints/3/protocol must be equal to one of the allowed values
[ERROR] schema validation failed
EGRESS: INVALID — schema validation failed
PASS: configuração inválida rejeitada (exit=1)
PASS: a política activa não mudou
```

O teste comparou a tabela antes e depois da execução inválida.

**Justificação:** comprova que a validação rejeitou esse valor, devolveu erro e não alterou a tabela activa observada. É uma verificação do comportamento de falha segura para essa configuração concreta.

### Verificar logs e auditoria

```bash
sudo tail -n 20 /var/log/laprizza/egress.log
sudo tail -n 20 /var/log/laprizza/egress-changes.log
sudo journalctl -k --grep 'LAPRIZZA-SYS03-DENY' --no-pager
```

- `egress.log` contém mensagens operacionais;
- `egress-changes.log` identifica actor, resultado, quantidade de regras, hash e revisão;
- `journalctl -k` permite procurar os pacotes registados pelas regras.

**Justificação:** logs operacionais, auditoria de alterações e registo de pacotes respondem a perguntas diferentes. Mantê-los separados torna mais fácil perceber se ocorreu uma falha de configuração, uma aplicação ou um pacote recusado.

## 17. `vim` versus `cat <<NFT`

A configuração editável é `config/allowed-endpoints.yml`; pode ser alterada num editor. Por exemplo:

```bash
vim config/allowed-endpoints.yml
make egress-dry-run
make egress-apply
```

O `cat <<NFT` usado no script gera o ficheiro temporário de regras. As regras dependem de valores obtidos durante a execução, como o nome da bridge, a sub-rede, a interface WAN e os IPs DNS resolvidos.

**Justificação:** o editor é adequado à configuração mantida por pessoas; o script gera o lote específico do ambiente. Usar um editor para o lote durante a execução automática exigiria intervenção humana e não reproduziria de forma fiável os valores dinâmicos. A alteração ao YAML, por outro lado, pode ser versionada e revista em Git.

# Perguntas prováveis do professor

**“Por que se usa `forward` em vez de `OUTPUT`?”**  
A política controla tráfego de contentores encaminhado pelo host. `OUTPUT` é o caminho de tráfego criado pelo próprio host.

**“Porque não guardar nomes DNS directamente nas regras?”**  
As regras geradas usam IPs. O script resolve os nomes para endereços A antes da aplicação e regenera esses endereços nas execuções periódicas.

**“O que acontece se um destino não resolver?”**  
O nome é registado na lista de falhas e a execução termina antes da aplicação da nova tabela.

**“O que significa `internal_only`?”**  
Significa que esse endpoint é excluído da geração de regras externas. A comunicação entre serviços internos depende da configuração das redes Docker.

**“O `policy accept` significa que a SYS03 autoriza qualquer saída?”**  
Não. As regras específicas de `log` e `drop` tratam o tráfego da bridge seleccionada para a interface WAN. A tabela não substitui a política de saída do host nem as tabelas Docker.

**“O que valida o Ajv e o que valida `nft -c`?”**  
Ajv valida estrutura e valores da configuração. `nft -c` valida a sintaxe e aceitabilidade do lote de regras gerado. São validações de camadas diferentes.

**“Por que se regista um hash do YAML?”**  
Para identificar o conteúdo exacto da configuração associada à tentativa de aplicação, incluindo quando o código do script é o mesmo.

**“O que demonstra o teste inválido?”**  
Que o valor de protocolo testado foi rejeitado pelo schema, a execução terminou com código diferente de zero e a comparação da tabela antes/depois indicou que a política activa não mudou.

**“O timer actualiza imediatamente um endereço DNS?”**  
Não. O script volta a resolver os nomes quando é executado. Com o timer de seis horas, uma alteração DNS é incorporada na execução seguinte.

## Síntese para a defesa

> “A SYS03 declara os destinos externos num YAML versionado e valida-os contra um JSON Schema, complementado por uma verificação de nomes únicos. O script descobre a rede Docker e a interface WAN, resolve os destinos para IPv4 e gera regras nftables no hook `forward`, limitadas à bridge, sub-rede, destino, protocolo e porta. O tráfego não autorizado nesse percurso é registado e descartado; o tráfego IPv6 da bridge para a WAN também é descartado. O script valida o lote com `nft -c` e só o aplica com `APPLY=true`. Um timer volta a resolver os nomes periodicamente. Verificámos destinos autorizados e não autorizados e testámos que uma configuração com protocolo inválido é rejeitada sem alterar a tabela activa observada.”
