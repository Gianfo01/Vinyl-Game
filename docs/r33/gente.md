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

## Pendências para a parte B

- Gente da cidade contratada como diretor ou equipe pessoal continua na vaga do `gente31`, porque a parte A não mexe
  na forma de guardar pessoas. Na parte B, a vaga deve ser liberada e a pessoa promovida de camada.
- **Promoção e rebaixamento:**
  - diretor que sai ou é roubado deve virar pessoa "completa", com resumo do passado;
  - funcionário pessoal e pessoas fixas são candidatos naturais à camada "leve".
- O jornalista escreve como **fato** (`column33`); a coluna no Jornal e nas Redes é da REDES33, pelo fato.
- Escolha manual de candidato (lista com os 6 melhores) existe na regra (`cands33`, `hireBranchDir33(s, br, k)`). O
  cartão usa o melhor; uma ficha de escolha fica para a parte B ou o POL33.
- **Goldens:** não mudam, porque nada roda sem ação do jogador. A parte B muda.
