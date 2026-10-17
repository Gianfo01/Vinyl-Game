# GENTE33 · parte A — mais gente com papel (versão 33)

Código: `src/sim/r33/gente33.ts` (regras) e `src/ui/r33/gente33ui.ts` (ações nos cartões de objeto).
Teste: `tests/r33-gente-a.test.ts`. Prints: `docs/r33/gente/` (script `scripts/r33/shots-gente33.mjs`).

## Regra de ouro: tudo opt-in

- Só acontece quando o **jogador** contrata ou ativa. O estado (`s.x4.gente33`) nasce na primeira ação.
- Sem estado, o gancho do mês sai na primeira linha: não sorteia, não grava, não mexe em caixa.
- Sorteios com `Rng.fromSeed('<semente>|gente33|<tag>|<semana>')`, nunca o fluxo do jogo (`rng19`).
- Interruptor `exp33.gente`, **ligado** por padrão. Ligado não muda nada até o jogador agir. Desligado, as opções
  somem dos cartões e quem já foi contratado fica parado.
- A família Fossati nunca entra em nenhuma busca, nem gente de ato real (catálogo, `real27`).

## 1. Diretor(a) de filial

- **Quem:** uma pessoa que já existe no jogo, vinda de uma de quatro fontes (`cands33`):
  - alguém da sua equipe (sai da folha);
  - um executivo de selo rival (livre, ou tirado do comando de um rival, que põe um sucessor; luvas de 6 salários);
  - gente da cidade (`gente31`: dono, vendedor, técnico, bartender…);
  - um ex-artista.
- **Ficha:** salário, competência, estilo (ousado, cuidadoso, de gente, dos números) e ambição, tirados dos traços
  que já existem (personalidade da pessoa, estilo e ambição do líder, nível do funcionário).
- **Bônus de cena:** ex-artista da cena da cidade da filial ganha bônus regional (mais garimpo e mais público).
- **Todo mês na região** (`branchMonth33`):
  - garimpa: noites de olheiro põem talento da cidade no radar (`addSignal`, origem `branch33`);
  - contrata local quando a linha deixa (`acceptOffer`), no máximo um a cada 13 semanas, e põe o ato na filial;
  - marca shows na cidade para os artistas da filial (`playGigs`) e divulga (momento e fãs);
  - cuida do orçamento: nada passa do teto do mês; o salário sai como "Salários".
- **Relatório mensal** na Caixa (`g33_br`, boletim de relatórios).
- **O jogador define** a linha (ousado ou conservador) e o teto de gasto (`setBranchLine33`).
- **Riscos** (`branchRisks33`, sorteio próprio; `GENTE33.risk` multiplica todos):
  - **rival rouba o diretor:** competência e ambição altas, lealdade baixa;
  - **sai levando o elenco regional e abre selo:** com atrito alto ou ambição alta e lealdade baixa
    (`foundLabel17` + `signWithRival`; ato real travado não sai);
  - **desvio de dinheiro:** fato secreto com marca do submundo (`under31`, `crime`). O jurídico e a administração
    ajudam a descobrir; aí a Caixa pergunta: polícia, demitir em silêncio ou fingir que não viu;
  - **briga com a sede:** o atrito sobe com estilo × linha e com teto abaixo da ambição. A Caixa pergunta: carta
    branca, manter a linha ou demitir.

## 2. CEO da empresa (fim de jogo)

- **Quando:** sede Complexo ou 25 anos de casa; competência mínima 55.
- **Ao contratar:** guarda a delegação de antes e aplica "Multinacional: só exceções" (`applyPreset31('multi')`).
  Toda a delegação vai para a equipe ou para a regra, inclusive a agenda de todo o elenco. O jogador vira presidente
  do conselho.
- **Grandes decisões:** a cada 13 semanas o CEO leva uma ao conselho. Aprovar chama a função de sempre:
  - recomprar bloco de raider (`repelRaider`);
  - ampliar a sede;
  - abrir filial (`openBranch`);
  - ampliar filial (`upgradeBranch`).
- **Relatório mensal** na Caixa.
- **Dispensar** devolve a delegação de antes.
- **Sucessão:** se o dono muda (`heirs8`) com o CEO no cargo, ele segura a transição (+reputação institucional) ou,
  se a lealdade é baixa, pode sair.

## 3. Conselho e acionistas

- **Quando:** só com sócios privados (`capital`) ou ações na bolsa. O jogador instala o conselho.
- **Reunião anual:** votam os maiores acionistas (`holders`). Contam:
  - o desempenho (receita do ano, preço da ação, competência do CEO);
  - a confiança do conselho;
  - os raiders hostis, que votam contra.
- **Maioria contra:** moção para tirar o jogador da presidência. A Caixa oferece três saídas:
  - recomprar o maior bloco hostil (`repelRaider`);
  - aceitar um CEO indicado;
  - brigar (reputação e preço da ação caem).

## 4. Equipe pessoal

Gente da cidade; o médico pode vir da sua equipe. Salário pago do bolso (`purse`).

- **Motorista:** −estresse.
- **Segurança pessoal:** `setGuard33` (nível 1, ou 2 com competência ≥ 60), que corta `papChance33`. Com
  `exp33.paparazzi` ligado, a conta do segurança é a do vida33 (uma conta só).
- **Personal trainer:** +saúde e um pouco de −estresse.
- **Médico particular:** +saúde (check-up quando a saúde cai abaixo de 45) e −estresse.

## 5. Pessoas fixas

Sempre a mesma pessoa:

- **Presidente do fã-clube** do seu maior artista: organiza (momento, lealdade dos fãs) ou briga em público (fato
  público, lealdade cai).
- **Jornalista** que acompanha a sua carreira:
  - de preferência o crítico do jornal da cidade (`gente31`);
  - coluna mensal como fato de imprensa (`column33`); aliado sobe e inimigo derruba a reputação artística;
  - "dar uma exclusiva" melhora a relação.
- **Representante do sindicato:** relação boa sobe a confiança da entidade (`union20`) e relação ruim derruba;
  quando há pauta aberta, avisa na Caixa como a base está.

## Onde aparece (cartões ACOES5, sem tela nova)

| Objeto | Ações | Número / linhas |
|---|---|---|
| Mapa da parede (sede) | Contratar diretor(a) de filial · Trocar a linha da filial | Filiais com diretor(a) |
| Mesa de reunião (sede) | Contratar CEO · Dispensar o CEO · Instalar o conselho | Conselho (CEO, confiança) · últimas decisões |
| Porta | Contratar segurança pessoal | — |
| Garagem (casa) | Contratar motorista | — |
| Espelho (casa) | Contratar personal trainer · Contratar médico(a) particular | — |
| Mural do elenco | Conhecer o(a) presidente do fã-clube | — |
| Jornal da mesa | Ter um(a) jornalista que acompanha você · Dar uma exclusiva | — |
| Quadro da equipe | Receber o(a) representante do sindicato | — |

## Parte B já feita (o que não é da REDES33 nem da POL33)

Continua opt-in: só age sobre quem o jogador contratou, então os goldens não mudam.

- **A vaga da cidade é liberada.** Gente da cidade contratada como diretor, CEO ou equipe pessoal larga o emprego no
  `gente31` (`leaveJob31`), e a vaga é preenchida na virada do mês. Enquanto trabalha para você, a cidade não a
  recontrata (registro `BUSY31`). Pessoas fixas (fã-clube, jornalista, sindicato) seguem no emprego delas.
- **Quem sai vira executivo de verdade.** Diretor de filial ou CEO que sai vivo (demitido, roubado, pediu para sair)
  vira executivo livre no mercado (`leaders10`), com o cargo na sua empresa no currículo. Os rivais podem chamá-lo
  como sucessor, e ele volta a aparecer para você como candidato "executivo". Quem sai com o elenco já vira fundador
  do selo novo. Executivo que veio do mercado só ganha a linha no currículo.
- **Ficha da passagem.** Cada pessoa guarda os cargos que teve com você, as datas e como saiu (`past`).
- **Opinião sobre você.** Opinião de verdade (`opinion.ts`): sobe ao ser contratado, cai ao ser demitido (mais ainda
  se saiu brigado).
- **Camada leve** (`light33`): ficha curta de quem trabalha ou trabalhou com você, com nome, idade, profissão de hoje
  (vaga na cidade, "chefe de selo X" ou "ex-cargo"), 2–3 traços e opinião. Aparece nas linhas do cartão do quadro da
  equipe.

## Parte B completa (`src/sim/r33/gente33b.ts`, teste `tests/r33-gente-b.test.ts`)

Mexe em todo mundo, por isso cada regra tem o seu interruptor, **desligado por padrão**. Desligados, os goldens não
mudam. O QA33 liga e mede.

| Interruptor | O quê |
|---|---|
| `exp33.camadas` | **Três camadas** que seguem a pessoa, não o emprego. **Completa:** artistas em atividade, quem trabalha para você, família, romances. **Leve:** gente da cidade, ex-artistas, quem já trabalhou para você; ficha `lightCard33` com nome, idade, profissão, 2–3 traços e opinião, sem custo mensal. **Multidão:** sem identidade. Na virada do mês, quem perdeu o papel desce: guarda um resumo do passado (atos, auge, papéis) e só as relações fortes (\|v\| ≥ 40). Quem ganhou papel sobe, sempre com o mesmo id. |
| `exp33.talento` | **Talento escondido:** cerca de 12% de quem trabalha na cidade tem dom, fixo pela semente e pela pessoa. É achado pelo A&R e pelos canais de descoberta da época, ou ao ouvir a pessoa no bar (cartão do bar: "Ouvir quem trabalha aqui"). Achado, vira artista solo fazendo bico no mesmo emprego (o ciclo do gente31 continua: assinou, larga a vaga). Rivais também acham. Quem você achou e deixou meio ano sem contrato, um rival leva. **Gancho:** gente da cidade que passou pelo seu radar e virou estrela num rival gera aviso na Caixa ("A que escapou") e um fato. |
| `exp33.volta` | **Volta por cima:** catálogo de volta às paradas, olheiro do seu selo ou vídeo viral (2006+) trazem ex-artistas de volta. A banda se reúne, ou o melhor integrante segue solo, sem contrato e no seu radar. No máximo 2 por mês e uma vez por década por ato; ato travado pela história não volta. |
| `exp33.romance33` | **Romance no elenco:** o seu par ou o seu caso entra no seu elenco e vira decisão na Caixa (manter em segredo, assumir, terminar). O segredo pode vazar como escândalo (cai a confiança do ato e a reputação com artistas). |

A família Fossati fica fora de tudo. Sorteios com `Rng.fromSeed('gente33b')`. O estado (`s.x4.gente33b`) só nasce
com um interruptor ligado.

## Fica para depois

- **REDES33:** a coluna do jornalista e o post "ex-artista atrás do balcão", a partir dos fatos `column33`,
  `talent33`, `comeback33` e `missed33`.
- **POL33:** a ficha de escolha de candidato na tela.
- **QA33:** ligar os quatro interruptores, medir os goldens e ajustar as chances de descoberta e de volta por cima
  num jogo longo.
