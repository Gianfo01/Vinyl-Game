# R33 · INT-1 — interiores próprios e ações no lugar

Interruptor `exp33.int1` (padrão desligado, escopo `game`, em `src/sim/r33/int1.ts`). Desligado, o jogo é o da 32: escola, fábrica,
museu, plataforma, agência e filial continuam emprestando o escritório (o museu, o hotel). Ligado:

## O que muda
- **Interiores próprios** (`IntK33`: `school`, `plant`, `museum`, `platform`, `agency`, `branch`), em `src/ui/r33/int1px.ts`.
  Prédio seu → interior: escola → escola; fábrica → fábrica; museu → museu; plataforma → plataforma; agência de turnê (`booking`) →
  agência; filial (`branch`) e escritório próprio no exterior (`office`) → filial (`ownKind33`, usado por `ownPlace27`).
- **Arte por época** (6 faixas `ep5Of`, desenhada em `Px`, luz de cima à esquerda, contorno INK pela camada `extra` do `paintInterior27`,
  vidro/vapor/luz em camada translúcida):
  - escola: lousa de giz → quadro branco → lousa inteligente; piano de armário → de cauda; vitrola, gravador de rolo, teclado, PC e fone;
  - fábrica: prensa manual a vapor (1889) → hidráulica de goma-laca → vinil → automática + duplicadora → injetora de CD em sala limpa →
    prensas restauradas com braço de robô; matéria-prima, esteira, controle de qualidade (caixa de luz, lupa) e expedição;
  - museu: vitrines de vidro com relíquias, parede de discos de ouro, retratos, cordão, bilheteria (caixa registradora → impressora → quiosque com QR);
  - plataforma: racks de servidor (bege até 2011, depois lâminas), parede de curadoria com a lista escolhida, painel de assinantes;
  - agência: mapa de turnê com fio vermelho (tela no futuro), mesas com telefone da época, calendário de datas, cartazes;
  - filial: relógios do mundo com bandeiras, mapa-múndi, recepção com bandeiras e folhetos.
- **Cena que preenche a área** (nota do QA5): `drawInterior33` pinta o corte de sempre e recorta o céu e a rua em volta (`CROP33`:
  336×112 em vez de 360×150); todos os pontos clicáveis andam junto (`cropPt33`). Vale para os seis novos e para hotel, escritório,
  apartamentos e sede rival quando o interruptor está ligado (`ACT33_KINDS`).
- **Objetos clicáveis** (`OBJS33`, posições em `LAY33`, as mesmas da pintura): `info:` lê o que o sistema já guarda (`int1Lines`:
  escola `school18.own`, fábrica `industry`, museu `relics18`/`relics9`, plataforma/agência `ventures9`, filial `s.branches`),
  `go:own` abre a tela do prédio (`buildings18(...).goto`) e `own:` mostra a leitura + as ações que outras frentes registrarem.
- **Ações no lugar** (`INT33.acts/run` em `place27`, sem tela nova, sem sorteio do jogo):
  - hotel: *Hospedar um artista na suíte* (US$ 400, estresse −4 por integrante, espera de 8 semanas por artista);
  - apartamentos: *Ouvir o ensaio pela parede* (um artista local que ainda não está no radar entra no radar; escolha por hash estável);
  - sede rival: *Almoçar com o CEO rival* (conhecer) e *Ouvir a fita demo na recepção* (radar de um artista deles);
  - escritório: *Quem trabalha aqui* (conhecer, painel `info:meet` já existente) além de *Contratar o serviço* que já existia.
- Gente: `crew33` (professor de verdade da escola, cliente da agência com ficha, demais funcionários com nome de hash estável).

## Ganchos para as outras frentes
- `OWNACT33` (`sim/r33/int1.ts`): `acts(s, k, bldId)` e `run(s, k, bldId, id)` — o painel `own:` mostra e chama. Fábrica: **prensar para
  terceiros** e custo/defeito por época (CATÁLOGO; hoje só lê `industry.contractUnits`, `defectsYear`, `matPrice`); museu: **ingresso**
  e relíquias (CATÁLOGO); plataforma: **curadoria** (GESTÃO).
- `INT33` (`sim/sys/place27.ts`): outras frentes podem somar ações de lugar sem editar o `placeActs27`.
- `cdLeft27`/`cdSet27` (`place27`): esperas de ação por chave, no mesmo estado das outras.
- Pessoas/estresse (VIDA): a suíte usa `addStress` negativo; se VIDA mudar o peso do estresse, a ação segue valendo.

## Arquivos
`src/sim/r33/int1.ts`, `src/ui/r33/int1px.ts` (arte), `int1model.ts` (objetos), `int1gallery.ts` (galeria), edições mínimas em
`place27.ts`, `place27ui.ts`, `inside31.ts`, `inside31model.ts` e no tipo `IKind27` de `interior27.ts` (uma linha).

## Prova
`tests/r33-int1.test.ts` (5 casos): interruptor desligado por padrão, arte por lugar e época, objetos na tabela de posições, cena
recortada sem mudar o estado, ações do hotel/apartamentos. Capturas: `docs/r33/mocks/int1/<lugar>-<ano>.png`
(`node scripts/r33/shots-int1.mjs`, galeria em `docs/r33/mocks/int1/galeria.html`): escola, fábrica, museu e filial em 1889, 1962 e
2025; agência em 1935, 1962 e 2025 (existe desde 1930); plataforma em 2008, 2025 e 2035 (existe desde 2005).

## Ficou de fora
Fachadas novas no `pred31` (os tipos já tinham arte); regras de dinheiro da fábrica/museu/plataforma (outras frentes, pelos ganchos);
prints dentro do jogo (a galeria usa o mesmo desenho e o mesmo recorte).
