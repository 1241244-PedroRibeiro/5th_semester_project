Compreendo perfeitamente. Para uma defesa de ASIST, o professor pode pedir-te para justificares até a última flag do `nftables`. Vou fazer uma **dissecação exaustiva e linha a linha** do vosso `firewall.sh`, explicando a teoria por trás de cada comando, o que ele faz na prática, e como o testar e verificar.

---

# 🛡️ Dissecação Linha a Linha do `firewall.sh` (SYS02)

### 1. O Cabeçalho e a Segurança do Script (Linhas 1-16)
```bash
#!/usr/bin/env bash
# SYS02 host and Docker ingress policy for the Debian/nftables deployment.
# The script owns only table inet laprizza_sys02; Docker's tables are untouched.
set -euo pipefail
```
*   **O que faz:** O `#!/usr/bin/env bash` define o interpretador. O `set -euo pipefail` é o **modo estrito** do Bash.
    *   `-e`: Se um comando falhar, o script aborta imediatamente.
    *   `-u`: Se tentares usar uma variável que não existe, o script aborta (evita aplicar regras com variáveis vazias).
    *   `-o pipefail`: Se um comando numa *pipe* (`|`) falhar, o script aborta (sem isto, o bash só vê o resultado do último comando da pipe).
*   **Defesa:** "Numa firewall, um erro silencioso pode deixar o servidor exposto ou inacessível. O modo estrito garante que o script para imediatamente ao primeiro sinal de problema."

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POLICY_ENV="${NETWORK_POLICY_FILE:-/etc/laprizza/network-policy.env}"
if [[ -f "${POLICY_ENV}" ]]; then
    set -a; source "${POLICY_ENV}"; set +a
fi
```
*   **O que faz:** Descobre a diretoria do script e carrega o ficheiro de configuração. O `set -a` exporta automaticamente todas as variáveis lidas do ficheiro para o ambiente do script.
*   **Defesa:** "Separámos a configuração do código. Os IPs permitidos, a interface de rede e o nome da rede Docker não estão *hardcoded*. Estão num ficheiro de ambiente (`/etc/laprizza/network-policy.env`), o que permite alterar a política sem tocar no código."

```bash
if [[ "$(id -u)" -ne 0 ]]; then
    echo "SYS02: run as root (or with sudo)." >&2
    exit 1
fi
for cmd in nft python3 ip docker; do
    command -v "${cmd}" >/dev/null 2>&1 || { echo "SYS02: required command missing: ${cmd}" >&2; exit 1; }
done
```
*   **O que faz:** Verifica se está a correr como `root` (UID 0). Verifica se as ferramentas essenciais (`nft`, `python3`, `ip`, `docker`) existem no sistema.
*   **Defesa:** "Só o `root` pode manipular o `nftables`. Se faltar alguma ferramenta, o script aborta antes de fazer alterações parciais. É uma falha segura (*fail-fast*)."

### 2. Descoberta Dinâmica do Ambiente (Linhas 18-50)

```bash
ALLOWED_SOURCE_CIDRS="${ALLOWED_SOURCE_CIDRS:-10.8.0.0/16}"
DOCKER_INGRESS_NETWORK="${DOCKER_INGRESS_NETWORK:-laprizza_laprizza-network}"
WAN_INTERFACE="${WAN_INTERFACE:-$(ip -4 route show default | awk 'NR == 1 { for (i=1; i<=NF; i++) if ($i == "dev") { print $(i+1); exit } }')}"
APPLY="${APPLY:-false}"
```
*   **O que faz:** Define os valores padrão caso não estejam no ficheiro de ambiente. O `awk` vai à tabela de rotas (`ip -4 route show default`) e procura a palavra `dev` para extrair o nome da interface de saída para a Internet (ex: `eth0`).
*   **Defesa:** "Não assumimos que a interface é sempre `eth0`. O script descobre dinamicamente qual é a interface WAN, o que torna o script portável para diferentes servidores."

```bash
CIDR_ELEMENTS="$(python3 - "${ALLOWED_SOURCE_CIDRS}" <<'PY'
import ipaddress
import sys
items = [part.strip() for part in sys.argv[1].split(",") if part.strip()]
if not items:
    raise SystemExit("ALLOWED_SOURCE_CIDRS must contain at least one IPv4 CIDR")
networks = []
for item in items:
    network = ipaddress.ip_network(item, strict=False)
    if network.version != 4:
        raise SystemExit(f"IPv6 source range is not enabled until independently validated: {item}")
    networks.append(str(network))
print(", ".join(sorted(set(networks))))
PY
)" || { echo "SYS02: invalid source allowlist." >&2; exit 1; }
```
*   **O que faz (CORAÇÃO DA VALIDAÇÃO):** O Bash é péssimo a validar IPs. O script invoca o Python e usa a biblioteca nativa `ipaddress`.
    *   Divide a string por vírgulas (ex: `10.8.0.0/16,192.168.1.0/24`).
    *   Valida cada rede (`ip_network`).
    *   **Rejeita IPv6** (`network.version != 4`): isto é uma decisão de segurança. Se um administrador colocar um IP IPv6 por engano, o script falha. É o princípio do *fail-safe* (segurança em primeiro lugar).
    *   Remove duplicados (`set`) e devolve uma lista limpa.
*   **Defesa:** "A validação rigorosa dos CIDRs é feita em Python porque o `nftables` não valida sintaxes de rede de forma amigável. Se o administrador escrever `10.8.0.0/33`, o script falha antes de tentar aplicar. Bloqueámos IPv6 de propósito porque não tínhamos um range validado pela DEI."

```bash
NETWORK_INFO="$(docker network inspect "${DOCKER_INGRESS_NETWORK}" --format '{{.Id}} {{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || true)"
if [[ -z "${NETWORK_INFO}" ]]; then
    echo "SYS02: Docker ingress network not found: ${DOCKER_INGRESS_NETWORK}" >&2
    exit 1
fi
NETWORK_ID="${NETWORK_INFO%% *}"
DOCKER_BRIDGE="${DOCKER_BRIDGE:-br-${NETWORK_ID:0:12}}"
```
*   **O que faz:** Pede ao Docker o ID da rede. Extrai os primeiros 12 caracteres e constrói o nome da interface de bridge (ex: `br-fcd5d890c816`).
*   **Defesa:** "Se fizermos `docker compose down` e `up`, o Docker gera um novo ID de rede e uma nova bridge. O nosso script descobre-a dinamicamente. Se a rede não existir, o script falha."

### 3. A Construção das Regras Nftables (Linhas 52-94)

O script cria um ficheiro temporário para escrever as regras. Isto é **fundamental** para a atomicidade.

```bash
RULES_FILE="$(mktemp /tmp/laprizza-sys02.XXXXXX.nft)"
trap 'rm -f "${RULES_FILE}"' EXIT
```
*   **O que faz:** Cria um ficheiro temporário. O `trap` garante que o ficheiro é apagado mesmo que o script falhe a meio.
*   **Defesa:** "O `trap` é uma boa prática de engenharia. Não deixamos lixo no sistema de ficheiros."

```bash
if nft list table inet laprizza_sys02 >/dev/null 2>&1; then
    echo 'delete table inet laprizza_sys02' > "${RULES_FILE}"
fi
```
*   **O que faz:** Se a tabela `laprizza_sys02` já existir, o script adiciona a instrução `delete table` ao ficheiro.
*   **Defesa:** "É **idempotente**. Podemos correr o script 100 vezes que ele produz o mesmo resultado. Ele limpa a sua própria tabela antes de criar a nova. Não toca nas tabelas do Docker (`filter`, `nat`, `DOCKER-USER`)."

```bash
cat >> "${RULES_FILE}" <<NFT
table inet laprizza_sys02 {
    set allowed_sources4 {
        type ipv4_addr
        flags interval
        elements = { ${CIDR_ELEMENTS} }
    }
```
*   **O que faz:** Cria a tabela e o *set* de IPs.
    *   `type ipv4_addr`: Define o tipo de dados (IPv4).
    *   `flags interval`: **MUITO IMPORTANTE**. Sem isto, o `nftables` criaria milhares de regras individuais para cada IP dentro do CIDR. Com `interval`, ele trata o `/16` como um único intervalo matemático. É muito mais eficiente em memória e CPU.
*   **Defesa:** "Usámos `flags interval` para otimizar a tabela. Em vez de expandir o `/16` em 65.536 regras, o kernel faz uma comparação matemática de intervalo."

```bash
    chain host_input {
        type filter hook input priority -10; policy drop;
        iifname "lo" accept
        ct state invalid drop
        ct state established,related accept
        ip protocol icmp accept
        meta l4proto ipv6-icmp accept
        ip saddr @allowed_sources4 tcp dport 22 accept
        tcp dport 22 limit rate 5/second burst 10 packets log prefix "LAPRIZZA-SYS02-DENY " flags all
        tcp dport 2228 limit rate 5/second burst 10 packets log prefix "LAPRIZZA-SYS02-DENY " flags all
        limit rate 5/second burst 10 packets log prefix "LAPRIZZA-SYS02-DENY " flags all
    }
```
*   **O que faz:** Protege o host (o sistema operativo).
    *   `hook input priority -10`: Executa antes de outras chains (prioridade negativa).
    *   `policy drop`: **A REGRA DE OURO.** Nega tudo por defeito.
    *   `iifname "lo" accept`: Permite o *loopback* (`127.0.0.1`). Essencial para o sistema.
    *   `ct state invalid drop`: Bloqueia pacotes corrompidos ou fora do estado (proteção contra ataques de fragmentação).
    *   `ct state established,related accept`: **A Firewall Stateful**. Permite o tráfego de retorno de ligações iniciadas pelo próprio host. Ex: um `apt update` gera pacotes de ida (OUTPUT) e volta (INPUT); esta regra permite o retorno.
    *   `ip protocol icmp accept`: Permite `ping` para diagnosticar a rede.
    *   `ip saddr @allowed_sources4 tcp dport 22 accept`: Permite SSH (porta 22) **APENAS** se o IP de origem estiver na lista `@allowed_sources4`.
    *   `limit rate 5/second... log`: Regista tentativas nas portas 22 e 2228 (GoTTY). O `limit` protege o disco de ser inundado por logs num ataque de força bruta.
    *   `limit rate... log` (final): Regista qualquer outro tráfego que caia no `drop` final.
*   **Defesa:** "A regra `ct state established,related accept` é o que torna isto uma firewall stateful e não um simples filtro de pacotes. A `policy drop` final garante que tudo o que não for explicitamente permitido é bloqueado e registado."

```bash
    chain docker_ingress {
        type filter hook forward priority -10; policy accept;
        iifname "${WAN_INTERFACE}" oifname "${DOCKER_BRIDGE}" ct status dnat ct original proto-dst { 80, 443 } ip saddr @allowed_sources4 accept
        iifname "${WAN_INTERFACE}" ct status dnat limit rate 5/second burst 10 packets log prefix "LAPRIZZA-SYS02-DENY " flags all
        iifname "${WAN_INTERFACE}" ct status dnat drop
    }
}
NFT
```
*   **O que faz (A PARTE MAIS CRÍTICA):** Protege os containers. O Docker usa NAT. O tráfego da Internet para os containers não passa em `INPUT`, passa em `FORWARD`.
    *   `hook forward priority -10`: Executa antes das chains do Docker (`DOCKER-USER`, etc).
    *   `policy accept`: **ATENÇÃO**. A política é aceitar para não quebrar a comunicação interna dos containers (container-to-container), que também passa no `forward`.
    *   `iifname $WAN_INTERFACE oifname $DOCKER_BRIDGE`: O tráfego tem de vir da Internet (`WAN_INTERFACE`) e ir para a bridge do Docker.
    *   `ct status dnat`: **ISTO É OURO.** O `conntrack` (tracker de ligações do kernel) diz que este pacote sofreu *Destination NAT*.
    *   `ct original proto-dst { 80, 443 }`: Olha para a **porta de destino original** (antes do NAT). Se o cliente pediu a porta 80 ou 443, continua.
    *   `ip saddr @allowed_sources4 accept`: Se o IP de origem é da VPN da DEI, aceita.
    *   `iifname $WAN_INTERFACE ct status dnat ... log`: Regista os pacotes DNAT que não foram aceites (ex: tentativa de aceder ao container na porta 5432).
    *   `iifname $WAN_INTERFACE ct status dnat drop`: **A REGRA FINAL.** Todo o tráfego DNAT vindo da Internet que não foi aceite é descartado.
*   **Defesa:** "O `policy accept` é necessário para o tráfego interno do Docker (que também é `forward`). A segurança é feita pelas regras explícitas. Qualquer pacote DNAT vindo da Internet que não seja para as portas 80/443 da VPN cai no `drop` final. Isto impede, por exemplo, que a base de dados PostgreSQL (porta 5432) seja acessível do exterior, mesmo que o Docker a tente publicar."

### 4. Aplicação Atómica (Linhas 96-106)

```bash
echo "SYS02 plan: source CIDRs=${CIDR_ELEMENTS}; WAN=${WAN_INTERFACE}; Docker network=${DOCKER_INGRESS_NETWORK} (${DOCKER_BRIDGE}); SSH inside VM=22 (network port 2222 is redirected to it)."
nft -c -f "${RULES_FILE}"
if [[ "${APPLY}" != "true" ]]; then
    echo "SYS02: validation passed; no rules changed. Review the plan, then rerun with APPLY=true to apply."
    exit 0
fi
nft -f "${RULES_FILE}"
echo "SYS02: applied nftables table inet laprizza_sys02. Docker-managed tables were not replaced."
nft list table inet laprizza_sys02
```
*   **O que faz:**
    *   `nft -c -f`: **CHECK**. O `nftables` faz o *parse* e a validação de sintaxe do ficheiro, mas **não aplica**.
    *   `APPLY != "true"`: Se o utilizador não deu permissão explícita, o script mostra o plano e sai. Isto evita aplicar regras de firewall acidentalmente.
    *   `nft -f`: **APLICA**. O `nftables` lê o ficheiro e aplica as regras de forma **atómica**. Se houver um erro na linha 50, ele não aplica nada. O kernel faz *rollback*.
    *   `nft list table`: Mostra a tabela aplicada para verificação.
*   **Defesa:** "O `nft -f` é transacional. Ou aplica tudo, ou não aplica nada. Isto evita o pior cenário numa firewall: ficar a meio da aplicação e cortar o acesso ao servidor. O `APPLY=true` obriga o administrador a confirmar que reviu o plano."

---

# 🧪 Testes e Verificação (Como provar que funciona)

O professor vai perguntar: **"Como é que provaram que isto funciona?"**

### 1. Verificação da Estrutura (Dry Run)
```bash
make firewall    # ou ./firewall.sh (sem APPLY=true)
```
*   **O que faz:** O script imprime o plano e o `nft -c -f` valida a sintaxe. Não altera nada.
*   **Prova:** Mostra que o script não é um "destruidor" cego.

### 2. Verificação de Acesso Permitido (VPN)
Com a VPN da DEI ligada:
```bash
curl -k -I --connect-timeout 8 https://vs582.dei.isep.ipp.pt/api/health
```
*   **Resultado esperado:** `HTTP/2 200` ou `HTTP/1.1 200 OK`.
*   **Prova:** O tráfego DNAT para a porta 443 da VPN é aceite.

### 3. Verificação de Acesso Negado (Hotspot Móvel)
Com o telemóvel em hotspot (IP público, fora da VPN):
```bash
curl -k -I --connect-timeout 8 https://vs582.dei.isep.ipp.pt/api/health
```
*   **Resultado esperado:** `Connection timeout` ou `Connection refused`.
*   **Prova:** O tráfego DNAT de fora da VPN sofre `drop`.

### 4. Verificação dos Logs (Auditoria)
```bash
sudo journalctl -k --grep "LAPRIZZA-SYS02-DENY"
```
*   **Resultado esperado:** Linhas com `SRC=8.8.8.8 DPT=443` (ou similar) com o *timestamp* do teste de acesso negado.
*   **Prova:** O `drop` foi registado com o prefixo que definimos.

### 5. Verificação do Relatório Diário
```bash
sudo /opt/laprizza/scripts/ufw-report.sh "$(date -u +%Y%m%d)"
```
*   **Resultado esperado:** Um ficheiro em `logs/ufw-report/YYYYMMDD.txt` com o Top de IPs e portas bloqueadas.
*   **Prova:** O sistema de auditoria está funcional e o `journalctl` está a ser lido corretamente.

---

# 🎤 Perguntas "Matadoras" do Júri (Preparação)

**1. "Porque é que não usaram simplesmente o UFW?"**
*   **R:** "O UFW é uma abstração que cria regras na chain `INPUT`. Mas o Docker não usa a `INPUT`. Quando publicamos uma porta (`80:80`), o Docker cria regras NAT e o tráfego vai para a chain `FORWARD`. Se usássemos UFW, a porta 80 estaria aberta ao mundo, independentemente das regras do UFW. O nosso script cria uma tabela nativa que interceta o `FORWARD` antes do Docker."

**2. "O que é o `ct status dnat` e porque é que é necessário?"**
*   **R:** "O `conntrack` é o sistema do kernel que regista o estado das ligações. Quando o Docker publica uma porta, ele reescreve o IP de destino (DNAT). O `ct status dnat` diz ao `nftables` para só avaliar os pacotes que sofreram esta reescrita. Sem isto, estaríamos a avaliar tráfego que não se destina aos containers."

**3. "Se o `policy` da chain `forward` é `accept`, como é que bloqueiam o tráfego malicioso?"**
*   **R:** "O `policy accept` é necessário porque o tráfego *container-to-container* também passa na `forward`. Se fosse `drop`, a aplicação deixava de funcionar internamente. O bloqueio é feito pela regra final explícita: `iifname $WAN_INTERFACE ct status dnat drop`. Ou seja, o tráfego DNAT vindo de fora é bloqueado, mas o tráfego interno do Docker é permitido."

**4. "O que acontece se o vosso script falhar a meio da aplicação?"**
*   **R:** "O `nftables` é transacional. O comando `nft -f` aplica o ficheiro de regras de forma atómica. Se houver um erro de sintaxe, ele não aplica nada e a tabela antiga continua em vigor. Além disso, o script usa `set -e` para abortar ao primeiro erro."

**5. "Como é que garantem que a tabela não fica 'presa' no kernel após um reboot?"**
*   **R:** "As regras do `nftables` não são persistentes por defeito. No entanto, o `make sys02-install` instala um serviço systemd (`laprizza-sys02.service`) que corre o script com `APPLY=true` no arranque. A tabela é recriada automaticamente."

**6. "Porque é que o log tem `limit rate 5/second`?"**
*   **R:** "Para evitar um ataque de negação de serviço (DoS) ao disco. Se um atacante enviar milhares de pacotes por segundo, o kernel não pode escrever milhares de linhas no log. O `limit` faz *sampling* e protege a integridade do sistema. É um *trade-off* entre visibilidade total e resiliência."

Estás pronto. Com esta dissecação, dominas cada linha do script e sabes justificar as decisões de engenharia. O júri vai perceber que não fizeste um script "copy-paste", mas sim uma implementação pensada para o contexto do Docker e da DEI. Boa sorte!
