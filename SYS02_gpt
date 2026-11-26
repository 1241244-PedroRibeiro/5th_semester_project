# SYS02 — explicação e defesa das decisões de implementação

A SYS02 restringe o acesso de entrada ao servidor e aos serviços publicados pelo Docker. Para a defesa, convém explicar não só o que cada parte faz, mas também **por que foi implementada dessa forma** e que problema resolve.

O script principal é [infra/sys02-network-access/firewall.sh](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/infra/sys02-network-access/firewall.sh). A política usa a tabela nftables `inet laprizza_sys02`, e a configuração está em [config/network-policy.env.example](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/config/network-policy.env.example).

## 1. Desenho geral: dois caminhos, duas chains

O script cria duas chains porque o kernel trata de forma diferente pacotes destinados ao próprio servidor e pacotes encaminhados para um contentor:

```text
Acesso ao próprio servidor → hook input → host_input
Acesso a um contentor     → hook forward → docker_ingress
```

A chain `host_input` protege serviços do sistema operativo, como SSH. A chain `docker_ingress` protege as portas publicadas pelo Docker, como HTTP e HTTPS.

**Justificação para a defesa:** filtrar apenas o tráfego `input` não seria suficiente para proteger as portas publicadas por Docker. Esse tráfego é encaminhado pelo servidor até à bridge do contentor e passa pelo caminho `forward`. A separação permite aplicar regras adequadas a cada percurso sem tratar todo o tráfego de entrada como se tivesse o mesmo destino.

## 2. Cabeçalho e modo estrito

```bash
#!/usr/bin/env bash
# SYS02 host and Docker ingress policy for the Debian/nftables deployment.
# The script owns only table inet laprizza_sys02; Docker's tables are untouched.
set -euo pipefail
```

`#!/usr/bin/env bash` define o interpretador. Os comentários registam o âmbito do script e a tabela que lhe pertence.

`set -euo pipefail` activa o modo estrito do Bash:

- `-e` termina o script quando um comando falha;
- `-u` trata variáveis não definidas como erro;
- `pipefail` faz uma pipeline falhar se falhar algum comando que a compõe.

**Justificação:** um erro na descoberta da rede, validação dos CIDRs ou geração do lote não deve ser ignorado. Se o script prosseguisse com valores incompletos, poderia gerar regras diferentes das pretendidas.

A tabela própria `inet laprizza_sys02` também é uma decisão de delimitação: o script administra a sua política sem apagar ou substituir tabelas geridas pelo Docker.

## 3. Configuração separada do código

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POLICY_ENV="${NETWORK_POLICY_FILE:-/etc/laprizza/network-policy.env}"
```

O primeiro comando descobre o caminho absoluto da pasta onde está o script. O segundo escolhe o ficheiro de configuração: usa `NETWORK_POLICY_FILE` se estiver definido; caso contrário, usa `/etc/laprizza/network-policy.env`.

```bash
if [[ -f "${POLICY_ENV}" ]]; then
    set -a
    source "${POLICY_ENV}"
    set +a
fi
```

Se o ficheiro existir, o Bash carrega as suas variáveis. `set -a` exporta essas variáveis para os comandos seguintes; `set +a` desactiva essa opção após a leitura.

A configuração de exemplo define:

```bash
ALLOWED_SOURCE_CIDRS=10.8.0.0/16
DOCKER_INGRESS_NETWORK=laprizza_laprizza-network
WAN_INTERFACE=eth0
```

**Justificação:** manter parâmetros operacionais fora do código permite alterar a rede aprovada ou a interface sem reescrever a lógica da firewall. O exemplo fica versionado; a configuração instalada no servidor pode ter permissões restritas.

**Ponto de defesa:** `source` executa o conteúdo do ficheiro no contexto do Bash. Portanto, esse ficheiro tem de ser controlado por administradores, em vez de ser editável por qualquer utilizador.

## 4. Privilégios e dependências

```bash
if [[ "$(id -u)" -ne 0 ]]; then
    echo "SYS02: run as root (or with sudo)." >&2
    exit 1
fi
```

`id -u` devolve o UID do utilizador. O UID `0` corresponde a `root`. Se o script não estiver a correr com esse UID, apresenta o erro em `stderr` e termina.

```bash
for cmd in nft python3 ip docker; do
    command -v "${cmd}" >/dev/null 2>&1 || {
        echo "SYS02: required command missing: ${cmd}" >&2
        exit 1
    }
done
```

O ciclo confirma que existem as ferramentas necessárias:

- `nft` para validar e aplicar regras;
- `python3` para validar redes IP;
- `ip` para consultar a rota predefinida;
- `docker` para consultar a rede e sub-rede dos contentores.

**Justificação:** as alterações nftables exigem privilégio administrativo, e a execução deve parar imediatamente se faltar uma ferramenta essencial. Assim, o script não tenta construir a política com uma descoberta parcial do ambiente.

## 5. Valores predefinidos e descoberta da interface

```bash
ALLOWED_SOURCE_CIDRS="${ALLOWED_SOURCE_CIDRS:-10.8.0.0/16}"
DOCKER_INGRESS_NETWORK="${DOCKER_INGRESS_NETWORK:-laprizza_laprizza-network}"
WAN_INTERFACE="${WAN_INTERFACE:-$(ip -4 route show default | awk 'NR == 1 { for (i=1; i<=NF; i++) if ($i == "dev") { print $(i+1); exit } }')}"
APPLY="${APPLY:-false}"
```

`${VAR:-valor}` usa o valor da variável quando está definida e não vazia; caso contrário, usa o valor indicado.

- A allowlist predefinida é `10.8.0.0/16`.
- A rede Docker predefinida é `laprizza_laprizza-network`.
- Se `WAN_INTERFACE` não estiver configurada, o script consulta a rota IPv4 predefinida. O `awk` procura o campo `dev` e extrai o nome da interface.
- `APPLY` começa como `false`.

**Justificação:** os valores permitem uma execução previsível no servidor, mas continuam configuráveis. A descoberta da interface evita depender de um nome fixo de placa de rede; a pré-visualização por omissão reduz o risco de uma execução acidental alterar a firewall.

```bash
if [[ -z "${WAN_INTERFACE}" || ! "${WAN_INTERFACE}" =~ ^[a-zA-Z0-9_.:-]+$ ]]; then
    echo "SYS02: could not determine a valid WAN_INTERFACE; set it in ${POLICY_ENV}." >&2
    exit 1
fi
```

O script rejeita uma interface vazia ou com caracteres fora do formato permitido.

**Justificação:** o valor vai ser inserido no ficheiro nftables. Validá-lo evita criar uma regra inválida ou inserir texto inesperado no lote.

## 6. Validar as redes autorizadas com Python

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

O Bash passa a lista de CIDRs ao Python:

1. divide a lista por vírgulas;
2. remove espaços em redor dos valores;
3. rejeita uma lista vazia;
4. valida cada rede com a biblioteca `ipaddress`;
5. rejeita IPv6;
6. normaliza os valores, remove repetidos e ordena-os.

Se o Python terminar com erro, o Bash imprime `SYS02: invalid source allowlist.` e termina.

**Justificação:** validar endereços com uma biblioteca própria é mais robusto do que tentar fazê-lo com expressões regulares no Bash. A rejeição de IPv6 é deliberada: esta configuração só autoriza a pool IPv4 definida, evitando aceitar uma pool IPv6 sem validação independente.

O resultado fica em `CIDR_ELEMENTS`, pronto a ser colocado no set nftables.

## 7. Descobrir a rede Docker

```bash
NETWORK_INFO="$(docker network inspect "${DOCKER_INGRESS_NETWORK}" \
  --format '{{.Id}} {{range .IPAM.Config}}{{.Subnet}}{{end}}' \
  2>/dev/null || true)"
```

O Docker devolve o ID e a sub-rede da rede seleccionada. A saída de erro é ocultada, e `|| true` permite que o script apresente a sua própria mensagem caso a rede não exista.

```bash
if [[ -z "${NETWORK_INFO}" ]]; then
    echo "SYS02: Docker ingress network not found: ${DOCKER_INGRESS_NETWORK}" >&2
    exit 1
fi
NETWORK_ID="${NETWORK_INFO%% *}"
```

Se não houver resultado, o script termina. Caso haja, `${NETWORK_INFO%% *}` conserva o ID antes do primeiro espaço.

```bash
DOCKER_BRIDGE="${DOCKER_BRIDGE:-br-${NETWORK_ID:0:12}}"
if [[ ! "${DOCKER_BRIDGE}" =~ ^[a-zA-Z0-9_.:-]+$ ]]; then
    echo "SYS02: invalid Docker bridge interface." >&2
    exit 1
fi
```

O nome da bridge é construído com `br-` mais os primeiros 12 caracteres do ID da rede, salvo se `DOCKER_BRIDGE` tiver sido configurada explicitamente.

**Justificação:** o Docker pode recriar uma rede e atribuir-lhe outro ID. Descobrir a bridge reduz a dependência de um nome fixo e ajuda o script a continuar a apontar para a rede correcta após essa recriação. A validação protege o texto que será inserido nas regras.

## 8. Gerar um lote temporário de regras

```bash
RULES_FILE="$(mktemp /tmp/laprizza-sys02.XXXXXX.nft)"
trap 'rm -f "${RULES_FILE}"' EXIT
```

`mktemp` cria um ficheiro temporário com nome imprevisível. `trap` programa a sua remoção quando o script termina.

Se a tabela já existir:

```bash
if nft list table inet laprizza_sys02 >/dev/null 2>&1; then
    echo 'delete table inet laprizza_sys02' > "${RULES_FILE}"
fi
```

O script acrescenta ao lote uma instrução para substituir a tabela que lhe pertence. Não pede para apagar as tabelas do Docker.

**Justificação:** gerar um ficheiro completo permite validar o conjunto de regras antes de o instalar. A substituição é dirigida à tabela SYS02, mantendo separada a política do Docker.

## 9. O set de origens permitidas

```nft
table inet laprizza_sys02 {
    set allowed_sources4 {
        type ipv4_addr
        flags interval
        elements = { ${CIDR_ELEMENTS} }
    }
```

O *here-document* `cat <<NFT` acrescenta a tabela ao lote e expande `CIDR_ELEMENTS`.

- `table inet laprizza_sys02` cria uma tabela própria para SYS02, com suporte da família `inet`.
- `set allowed_sources4` cria o conjunto de origens autorizadas.
- `type ipv4_addr` define os elementos como IPv4.
- `flags interval` permite representar redes através de intervalos, como CIDRs.
- `elements` preenche o conjunto com os valores já validados.

**Justificação:** um set evita repetir a mesma lista de origens em cada regra e torna a allowlist mais fácil de rever. `interval` permite representar redes como `10.8.0.0/16` sem enumerar cada endereço individualmente.

## 10. `host_input`: proteger o próprio servidor

```nft
chain host_input {
    type filter hook input priority -10; policy drop;
```

A chain está associada ao hook `input`, destinado a pacotes cujo destino é o próprio host. `policy drop` define o comportamento final: se nenhuma regra aceitar o pacote, ele é descartado.

```nft
iifname "lo" accept
```

Aceita tráfego que chega pela interface de loopback.

**Justificação:** as comunicações locais do próprio sistema devem continuar funcionais, apesar da política de entrada restritiva.

```nft
ct state invalid drop
```

Descarta pacotes classificados pelo connection tracking como inválidos.

**Justificação:** pacotes que não correspondem a um estado de ligação válido não precisam de avançar para as restantes regras.

```nft
ct state established,related accept
```

Aceita pacotes de ligações já estabelecidas ou relacionadas com uma ligação existente.

**Justificação:** permite o tráfego de resposta de ligações válidas sem ter de criar uma regra de entrada para cada pacote de resposta. É o comportamento stateful da firewall.

```nft
ip protocol icmp accept
meta l4proto ipv6-icmp accept
```

Aceita ICMP IPv4 e ICMPv6.

**Justificação:** ICMP participa em diagnóstico e em funções necessárias à operação da rede. A decisão é específica a esses protocolos; não abre todas as ligações IPv4 ou IPv6.

A regra SSH é:

```nft
ip saddr @allowed_sources4 tcp dport 22 accept
```

Aceita TCP/22 apenas se a origem pertencer ao set IPv4.

Na VM, a porta interna é 22. O ficheiro de configuração documenta que a borda da rede redirecciona TCP/2222 para TCP/22 no servidor.

**Justificação:** a regra é aplicada à porta que efectivamente chega à VM depois do redireccionamento. A limitação por endereço de origem restringe o SSH às redes autorizadas.

As regras seguintes registam tráfego que não chegou a uma regra de aceitação:

```nft
tcp dport 22 limit rate 5/second burst 10 packets \
    log prefix "LAPRIZZA-SYS02-DENY " flags all

tcp dport 2228 limit rate 5/second burst 10 packets \
    log prefix "LAPRIZZA-SYS02-DENY " flags all

limit rate 5/second burst 10 packets \
    log prefix "LAPRIZZA-SYS02-DENY " flags all
```

A primeira identifica tentativas a TCP/22; a segunda, tráfego a TCP/2228; a terceira regista outros pacotes que chegam a esse ponto. `limit rate` restringe a frequência do logging; o prefixo permite encontrar os eventos no journal.

Uma regra `log` não termina a chain. O pacote continua a ser avaliado e, se não for aceite, acaba descartado pela `policy drop`.

**Justificação:** registar tentativas permite investigar acessos bloqueados. Limitar a frequência protege o sistema contra um volume excessivo de mensagens se houver muitas tentativas.

## 11. `docker_ingress`: proteger as portas publicadas

```nft
chain docker_ingress {
    type filter hook forward priority -10; policy accept;
```

Esta chain está no hook `forward`: o tráfego encaminhado para um contentor não termina no host. A política predefinida desta chain é `accept`, mas existem regras específicas para o tráfego DNAT vindo da WAN.

**Justificação:** não se define aqui uma política global de `drop` para todo o encaminhamento do host, pois esta chain deve tratar especificamente o tráfego publicado que chega da WAN. A restrição relevante é implementada pelas regras que identificam e tratam esse tráfego.

A autorização é:

```nft
iifname "${WAN_INTERFACE}" \
oifname "${DOCKER_BRIDGE}" \
ct status dnat \
ct original proto-dst { 80, 443 } \
ip saddr @allowed_sources4 accept
```

O pacote só é aceite se cumprir todas estas condições:

- entrou pela interface WAN;
- sai pela bridge Docker seleccionada;
- foi identificado como DNAT pelo connection tracking;
- a porta original pedida era 80 ou 443;
- a origem IPv4 pertence à allowlist.

`ct original proto-dst` consulta a porta anterior à tradução NAT. O Docker pode traduzir o destino para um endereço e porta internos do contentor; a regra compara as portas públicas que o cliente pediu.

**Justificação:** o Nginx recebe tráfego encaminhado pelo Docker. A combinação de interface, estado DNAT, portas e origem restringe esse percurso a HTTP/HTTPS proveniente das redes autorizadas.

As tentativas DNAT provenientes da WAN que não correspondem à autorização são primeiro registadas:

```nft
iifname "${WAN_INTERFACE}" ct status dnat \
    limit rate 5/second burst 10 packets \
    log prefix "LAPRIZZA-SYS02-DENY " flags all
```

Depois são descartadas:

```nft
iifname "${WAN_INTERFACE}" ct status dnat drop
```

Como `log` não termina o processamento, o pacote passa à regra seguinte e é descartado.

**Justificação:** a regra de registo fornece evidência das tentativas recusadas; a regra seguinte efectua efectivamente o bloqueio. A condição DNAT limita a decisão ao tráfego encaminhado que passou por uma tradução de destino.

## 12. Validar antes de aplicar

```bash
echo "SYS02 plan: source CIDRs=${CIDR_ELEMENTS}; WAN=${WAN_INTERFACE}; Docker network=${DOCKER_INGRESS_NETWORK} (${DOCKER_BRIDGE}); SSH inside VM=22 (network port 2222 is redirected to it)."
```

Mostra os valores descobertos e a política que o script vai preparar.

```bash
nft -c -f "${RULES_FILE}"
```

`-c` verifica a sintaxe e a validade do lote, sem o aplicar.

```bash
if [[ "${APPLY}" != "true" ]]; then
    echo "SYS02: validation passed; no rules changed. Review the plan, then rerun with APPLY=true to apply."
    exit 0
fi
```

Sem `APPLY=true`, o script pára depois da validação.

**Justificação:** separar validação e aplicação reduz o risco de uma execução normal alterar regras sem revisão. O administrador pode ver o plano e só depois pedir a aplicação explícita.

```bash
nft -f "${RULES_FILE}"
echo "SYS02: applied nftables table inet laprizza_sys02. Docker-managed tables were not replaced."
nft list table inet laprizza_sys02
```

Com `APPLY=true`, `nft -f` aplica o lote. Depois o script apresenta a tabela activa.

**Justificação:** o lote é verificado antes da aplicação, e a tabela aplicada é inspeccionada no fim. A verificação posterior permite comparar a política activa com o plano esperado.

## 13. Serviço systemd e reinstalação no arranque

O [serviço systemd](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/config/systemd/laprizza-sys02.service) usa `Type=oneshot`: corre o script uma vez e termina. Corre como `root`, define `APPLY=true` e executa `/opt/laprizza/scripts/firewall.sh`.

O unit também estabelece dependências:

```ini
Wants=network-online.target
After=network-online.target docker.service
Requires=docker.service
```

**Justificação:** a rede e o Docker têm de estar disponíveis antes de o script descobrir a bridge. Como o estado nftables é estado do kernel e precisa de ser reposto após reinício, o serviço habilitado reproduz a política no arranque.

O serviço limita ainda capacidades e acesso:

```ini
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
```

**Justificação:** o serviço recebe capacidades relacionadas com a gestão de rede, não privilégios ilimitados para adquirir outras capacidades. A protecção do sistema de ficheiros e das pastas pessoais reduz a superfície de acesso do processo.

Por ser `oneshot`, “enabled” e “active” não significam a mesma coisa. `enabled` indica que será chamado no arranque; após executar e terminar, pode aparecer como `inactive`.

## 14. Relatório diário: como é produzido e qual o seu limite

O script [ufw-report.sh](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/infra/sys02-network-access/ufw-report.sh) tem um nome histórico: resume mensagens nftables com o prefixo SYS02 encontradas no journal do kernel.

Recebe uma data no formato `YYYYMMDD`, ou usa a data UTC actual se não receber argumento. Constrói o início e fim do dia UTC, verifica o formato da data e exige `journalctl`. Se o journal não estiver disponível, termina em vez de produzir um relatório que sugira falsamente zero ocorrências.

A pesquisa é feita com:

```bash
journalctl -k \
  --since "${START_DATE}" \
  --until "${END_DATE}" \
  -o cat --no-pager |
  grep -E 'LAPRIZZA-SYS02-DENY'
```

- `-k` lê mensagens do kernel;
- `--since` e `--until` limitam o período;
- `-o cat` mostra o texto da mensagem;
- `grep` selecciona apenas eventos com o prefixo SYS02.

Se houver eventos, o relatório conta as linhas, agrupa endereços `SRC=` e portas `DPT=` e apresenta as últimas dez mensagens. Se não houver, escreve que não encontrou entradas SYS02 no período. O próprio relatório esclarece que zero entradas não prova que a firewall estivesse instalada nem que o tráfego tivesse sido testado.

**Justificação:** o relatório facilita a consulta diária dos registos e resume origens/portas recorrentes. Não substitui a inspecção da tabela nem um teste de conectividade.

A tarefa cron, em [laprizza-ufw-report](C:/Users/pedro/vsc/LEI-SEM5-PI-2026-27-3DJ-05/config/cron/laprizza-ufw-report), agenda a execução diária e acrescenta a saída a `/var/log/laprizza-ufw-report.log`. A linha cron não define `CRON_TZ`; logo, a hora efectiva depende do fuso do servidor, embora o período do relatório seja calculado em UTC.

# Verificações e a justificação de cada uma

## 1. Pré-visualização

```bash
make firewall
```

Executa o script sem `APPLY=true`.

**O que verifica:** descoberta dos parâmetros, validação dos CIDRs, geração do lote e aceitação da sintaxe pelo `nft -c`.

**Por que é útil:** permite rever o que seria aplicado sem alterar a tabela activa.

**O que não demonstra:** não demonstra que a regra esteja instalada; para isso é necessário inspeccionar a tabela activa.

## 2. Aplicação explícita

```bash
make firewall-apply
```

O alvo passa `APPLY=true`.

**O que verifica:** a operação completa de aplicação do lote validado.

**Por que é útil:** torna explícita a decisão administrativa de passar da revisão para a alteração do estado activo.

## 3. Inspeccionar a tabela

```bash
sudo nft list table inet laprizza_sys02
```

**O que verificar:** existência do set `allowed_sources4`, `policy drop` na chain `host_input`, regra SSH/22 limitada por origem, e regras da chain `docker_ingress` para tráfego DNAT em 80/443 e para o descarte dos restantes DNAT da WAN.

**Por que é útil:** mostra a política realmente carregada no kernel, em vez de apenas o conteúdo do script.

## 4. Testar uma origem permitida

Com a VPN ligada:

```powershell
curl.exe -k -i --connect-timeout 8 `
  https://vs582.dei.isep.ipp.pt/api/health
```

**O que verificar:** uma resposta HTTP do endpoint, como a resposta 200 anteriormente recebida através da VPN.

**Justificação:** confirma que um cliente no contexto de rede permitido consegue chegar ao serviço publicado.

## 5. Testar uma origem fora da VPN e correlacionar o journal

A partir de uma rede externa:

```powershell
curl.exe -k -i --connect-timeout 8 `
  https://vs582.dei.isep.ipp.pt/api/health
```

Logo depois, no servidor:

```bash
sudo journalctl -k --since "10 minutes ago" \
  --grep 'LAPRIZZA-SYS02-DENY' --no-pager
```

**O que verificar:** falha do pedido externo e, para atribuir o bloqueio à tabela da VM, uma mensagem correspondente no journal com o prefixo SYS02.

**Justificação:** o resultado do `curl` demonstra que a ligação falhou; a mensagem de kernel ajuda a localizar o bloqueio na regra SYS02. Se a rede de borda bloquear o pedido antes de este chegar à VM, não se deve atribuir esse bloqueio à tabela local.

## 6. Verificar serviço e agendamento

```bash
systemctl is-enabled laprizza-sys02.service
sudo systemctl status laprizza-sys02.service
```

**O que verificar:** se a unidade está habilitada para o arranque e o resultado da execução mais recente.

**Justificação:** a inspecção nftables confirma o estado actual; systemd explica como a política é reaplicada após reinício.

## 7. Gerar um relatório

```bash
sudo /opt/laprizza/scripts/ufw-report.sh "$(date -u +%Y%m%d)"
```

**O que verificar:** que o relatório é criado para a data pedida, lê o intervalo correcto e apresenta eventos quando existirem.

**Justificação:** demonstra a capacidade de resumir os logs; não substitui as outras verificações.

# `vim` versus `cat <<NFT`

É possível editar com `vim` o ficheiro de configuração, por exemplo:

```bash
sudoedit /etc/laprizza/network-policy.env
make firewall
make firewall-apply
```

O `vim` serve para uma pessoa alterar a configuração. Já o `cat <<NFT` no script escreve o lote nftables temporário, incorporando valores que só são conhecidos na execução, como CIDRs validados, interface WAN e bridge Docker.

**Justificação:** não se mantém manualmente uma regra diferente para cada servidor. A configuração descreve a intenção; o script adapta-a ao ambiente, valida-a e gera regras repetíveis. O ficheiro `.nft` é um artefacto temporário da execução, não a fonte de verdade.

# Respostas curtas para perguntas da defesa

**“Por que separar `input` e `forward`?”**  
Porque SSH termina no host e passa por `input`; tráfego para portas publicadas pelo Docker é encaminhado para contentores e passa por `forward`.

**“Por que usar `ct status dnat`?”**  
Para identificar tráfego cujo destino foi traduzido pelo Docker, distinguindo-o de outros pacotes encaminhados.

**“Por que consultar `ct original proto-dst`?”**  
Para avaliar a porta pública originalmente pedida, mesmo que o Docker a tenha traduzido para outra porta interna.

**“O que garante que uma origem de SSH é autorizada?”**  
A regra TCP/22 exige que o IPv4 de origem pertença ao set `allowed_sources4`; os restantes pacotes não aceites acabam na política `drop`.

**“O `log` bloqueia o pacote?”**  
Não. `log` regista e continua a avaliação. O bloqueio é feito pela regra `drop` ou pela política `drop` da chain.

**“O que prova `make firewall`?”**  
Que o lote foi construído e passou a verificação de sintaxe. Como não define `APPLY=true`, não prova que a tabela foi aplicada.

**“O que prova `nft list table`?”**  
Que existe uma tabela activa no kernel e mostra as regras actualmente carregadas.

**“Porque a política `forward` tem `policy accept`?”**  
A chain não aplica um `drop` global a todo o tráfego encaminhado. O controlo desta regra trata especificamente pacotes DNAT provenientes da WAN: permite o caso aprovado e regista/descarta os restantes.

**“Um timeout fora da VPN prova que foi a SYS02?”**  
Não isoladamente. Para atribuir a recusa ao servidor, é importante correlacionar o teste com uma mensagem `LAPRIZZA-SYS02-DENY` no journal. A rede de borda também pode bloquear antes de o pacote chegar à VM.

**“Um relatório com zero eventos prova a firewall?”**  
Não. Só indica que o script não encontrou eventos com aquele prefixo no período consultado. A tabela activa e os testes de conectividade são evidências distintas.

## Síntese para apresentar

> “A SYS02 controla duas vias de entrada: o tráfego dirigido ao host, pela chain `input`, e o tráfego encaminhado para contentores Docker, pela chain `forward`. A allowlist IPv4 é validada com Python, a bridge e a sub-rede são descobertas a partir do Docker, e o script gera uma tabela nftables própria. O host usa default drop e só permite SSH/22 das origens aprovadas, além do tráfego de sistema explicitamente aceite. Na via Docker, só aceita DNAT da WAN para as portas originais 80 e 443 quando a origem pertence à allowlist; os restantes DNAT da WAN são registados e descartados. O lote é verificado primeiro com `nft -c` e aplicado apenas com `APPLY=true`. Um serviço systemd reaplica a política no arranque, enquanto o relatório diário resume eventos do kernel sem substituir a verificação da tabela ou os testes de rede.”
