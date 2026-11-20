# Guião para o Vídeo — Componente RGPD (Sprint B, LAPR5)

**Duração máxima:** 3:45 (3 minutos e 45 segundos)  
**Equipamento:** Câmera/telemóvel com boa iluminação, microfone externo recomendado  
**Formato:** Todos os 4 elementos aparecem e intervêm  
**Entrega:** Vídeo + transcrição (este documento serve de base)

---

## Distribuição de Tempo

| Elemento | Secção | Tempo | Duração |
|---|---|---|---|
| **Pedro** | Introdução + Projeto + Responsável pelo Tratamento | 0:00 – 0:55 | ~55 s |
| **Eduardo** | Dados Pessoais Tratados + Categoria Especial (Saúde) | 0:55 – 1:50 | ~55 s |
| **Mota** | Tratamentos Aplicados + Bases de Licitude + IA | 1:50 – 2:45 | ~55 s |
| **Gustavo** | Data Breach + Medidas de Segurança + Encerramento | 2:45 – 3:40 | ~55 s |

---

## PEDRO — Introdução, Projeto e Responsável pelo Tratamento (0:00 – 0:55)

### Apontamentos de fala:

> "Olá! Somos a equipa 3DJ-05 do Instituto Superior de Engenharia do Porto e apresentamos o LaPrizza — um sistema de informação integrado para a gestão de um restaurante. O nosso projecto inclui navegação de ementas, autenticação com controlo de acessos baseado em papéis, visualizador de cozinha em tempo real e planeamento de inventário por inteligência artificial."

> "A componente de proteção de dados que desenvolvemos garante conformidade integral com o Regulamento Geral sobre a Proteção de Dados — o RGPD — e com a legislação portuguesa complementar, nomeadamente a Lei n.º 58/2019 e a Lei n.º 27/2021, a Carta Portuguesa de Direitos Humanos na Era Digital."

> "O responsável pelo tratamento dos dados é a Empresa de Restauração LaPrizza, estabelecida em Portugal. Esta escolha justifica-se porque a LaPrizza determina, de forma independente e exclusiva, as finalidades e os meios de todo o tratamento de dados — não existe co-responsabilidade. A entidade designou voluntariamente um Encarregado da Proteção de Dados, o DPO, contactável em dpo@laprizza.local, que reporta directamente à administração de topo e actua com total autonomia, sem sujeição a ordens relativas à apreciação de conformidade, nos termos dos Artigos 37.º a 39.º do RGPD."

### Notas de encenação:
- Pedro deve estar de frente para a câmera, com postura profissional
- Fundo: sala de aula ou espaço de trabalho do projecto
- Pode ter o ecrã do computador visível ao fundo com o sistema LaPrizza
- Tom de voz: confiante e introdutório

---

## EDUARDO — Dados Pessoais Tratados e Categoria Especial (0:55 – 1:50)

### Apontamentos de fala:

> "O LaPrizza trata os seguintes dados pessoais dos clientes registados: nome e apelido, e-mail, número de telefone, morada de entrega, número de identificação fiscal — este último facultativo — e, de forma crucial, restrições alimentares como alergias e intolerâncias."

> "Estas restrições alimentares constituem **dados relativos à saúde** ao abrigo do Artigo 4.º, n.º 15, do RGPD, enquadrando-se na categoria especial do Artigo 9.º, n.º 1. O seu tratamento é proibido por regra, salvo excepção. A LaPrizza legitima-o exclusivamente com base no **consentimento explícito** do titular, ao abrigo do Artigo 9.º, n.º 2, alínea a), recolhido mediante acção positiva e informada durante o registo ou edição de perfil."

> "Os dados de funcionários incluem nome, e-mail e registo de alterações de papéis de acesso. Importante: o quiosque de autosserviço anónimo **não cria qualquer registo persistente** na tabela Customer — os dados da encomenda mantêm-se em memória volátil e são eliminados após a emissão do talão, em conformidade com o princípio da minimização dos dados."

> "Todos os dados estão mapeados no Registo das Actividades de Tratamento — o RAT — exigido pelo Artigo 30.º do RGPD, com 17 entradas que vinculam cada coluna da base de dados à respectiva categoria jurídica, finalidade, base de licitude e período de conservação."

### Notas de encenação:
- Eduardo pode gesticular para enfatizar os pontos-chave
- Se possível, mostrar um excerto da tabela RAT no ecrã ao fundo
- Tom de voz: técnico e preciso, com pausas para ênfase nos conceitos legais

---

## MOTA — Tratamentos Aplicados, Bases de Licitude e IA (1:50 – 2:45)

### Apontamentos de fala:

> "Os dados são tratados para as seguintes finalidades, cada uma alicerçada numa base de licitude específica do Artigo 6.º do RGPD: criação e gestão de conta, autenticação e processamento de encomendas — base legal: execução de contrato, alínea b); comunicações de marketing — base legal: consentimento, alínea a), com caixa de validação não pré-marcada e desvinculada do registo; segurança alimentar através de alertas de alergénios — base legal: consentimento explícito, Artigo 9.º-2-a); auditoria de acessos e rastreabilidade RBAC — base legal: interesses legítimos, alínea f); e conservação de dados fiscais — base legal: obrigação jurídica, alínea c)."

> "O sistema implementa a **proteção de dados desde a conceição e por defeito** — Privacy by Design e Privacy by Default, ao abrigo do Artigo 25.º — com cifragem Argon2id para credenciais, TLS 1.2+ para comunicações, tokens JWT com expiração de 15 minutos, e perfis privados por defeito."

> "Quanto à inteligência artificial: o motor Prolog recebe **exclusivamente dados anonimizados** — níveis de stock, receitas e previsões de consumo. Nomes de clientes, e-mails, telefones e dados de saúde de alergias são **integralmente omitidos** das mensagens dirigidas à IA. As conclusões do planeamento são apenas propostas consultivas de leitura — nenhuma ordem de compra é emitida automaticamente. Toda a decisão de aprovisionamento carece de escrutínio e aprovação humana por parte de um Gestor, em conformidade com o Artigo 22.º do RGPD sobre decisões individuais automatizadas."

> "O sistema também protege menores: em Portugal, a idade de consentimento digital é 13 anos, e para utilizadores entre 13 e 15 anos exige-se acção afirmativa explícita durante o registo, em conformidade com o Artigo 8.º do RGPD e a Lei n.º 58/2019."

### Notas de encenação:
- Mota pode referir-se ao ecrã para mostrar diagramas ou tabelas
- Pode mostrar o mermaid de segurança (secção 8 do documento)
- Tom de voz: analítico e detalhado

---

## GUSTAVO — Data Breach, Medidas de Segurança e Encerramento (2:45 – 3:40)

### Apontamentos de fala:

> "Perante uma violação de dados pessoais com risco elevado para os direitos e liberdades dos titulares, o LaPrizza segue um procedimento rigoroso com o seguinte cronograma:"

> "**T mais zero** — deteção do incidente e notificação imediata ao DPO. **T mais uma hora** — triagem e avaliação de impacto: natureza da violação, categorias de dados visadas, número estimado de pessoas afetadas. **T mais quatro horas** — contenção técnica e preservação de evidências forenses antes de reiniciar serviços, revogação de sessões comprometidas através da regeneração de chaves criptográficas, e desativação de contas suspeitas. **T mais vinte e quatro horas** — redação da notificação destinada à CNPD. **T mais quarenta e oito horas** — parecer formal do DPO e assinatura da administração. **T mais setenta e duas horas** — submissão formal à Comissão Nacional de Proteção de Dados. **T mais sete dias** — comunicação directa e personalizada aos titulares afetados, se confirmado risco elevado. **T mais trinta dias** — relatório final, revisão dos controlos de defesa e arquivo no registo de incidentes."

> "A notificação à CNPD é obrigatória no prazo de 72 horas após o conhecimento do facto, nos termos do Artigo 33.º do RGPD. As violações são classificadas em três categorias: de confidencialidade, de integridade e de disponibilidade."

> "O sistema implementa medidas de segurança robustas ao abrigo do Artigo 32.º: cifra Argon2id para palavras-passe, HTTPS com TLS 1.2 e 1.3, tokens JWT HMAC-SHA256 com expiração de 15 minutos, cópias de segurança cifradas com age encryption, controlo de acessos por papéis com verificação em tempo real, e utilizador de base de dados com menor privilégio."

> "Para concluir: o LaPrizza garante o cumprimento integral do RGPD através de Privacy by Design, minimização de dados, direitos dos titulares — acesso, retificação, apagamento, portabilidade e oposição — e governação rigorosa de subcontratantes com contratos de subcontratação vinculativos. Obrigado pela atenção!"

### Notas de encenação:
- Gustavo pode usar gestos para enfatizar os marcos temporais (T+0, T+1h, etc.)
- Pode mostrar o diagrama de Gantt do cronograma de incidentes (secção 11.4)
- Tom de voz: dinâmico e cativante, com ritmo acelerado nos marcos temporais

---

## Notas Gerais de Produção

### Dicas para todos os elementos:
1. **Falar de forma clara e pausada** — evitar atropelar palavras
2. **Manter contacto visual com a câmera** — transmitir confiança
3. **Usar gestos moderados** — enfatizar pontos-chave sem exagero
4. **Transições suaves** entre elementos — o elemento seguinte deve começar a falar assim que o anterior terminar
5. **Evitar leituras literais** — usar o guião como apoio, não como teleprompter
6. **Ensaio prévio obrigatório** — cronometrar cada secção individualmente

### Checklist de verificação antes de gravar:
- [ ] Todos os 4 elementos aparecem no vídeo
- [ ] Todos os 4 intervêm oralmente
- [ ] Duração total ≤ 3:45
- [ ] Cobertura: projeto, dados pessoais, tratamentos, responsável pelo tratamento, data breach, medidas de segurança
- [ ] Áudio claro e sem ruído de fundo
- [ ] Iluminação adequada
- [ ] Transcrição preparada para submissão

### Sugestões de recursos visuais (B-roll):
- Ecrã com o sistema LaPrizza (login, menu, encomenda)
- Tabela RAT (Art. 30.º) em destaque
- Diagrama de segurança (secção 8)
- Cronograma de incidentes (diagrama de Gantt, secção 11.4)
- Logo LaPrizza e identificação da equipa

---

## Transcrição Completa (para submissão)

*(Esta secção deve ser preenchida com a transcrição exacta do vídeo gravado, incluindo pausas e ênfases. O guião acima serve de base.)*
