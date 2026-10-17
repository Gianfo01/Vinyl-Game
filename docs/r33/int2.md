# INT-2 · prédios novos com interior (v33)

Interruptor **`exp33.int2`** (padrão DESLIGADO no código; sim `src/sim/r33/int2.ts`). Desligado: `int2Types` devolve vazio e nenhuma ação roda.

## Arquivos
- `src/sim/r33/int2.ts` — registro `INT2` (14 tipos), ações (`int2Acts`/`int2Do`, formato `PAct27`), ganchos `INT2_HOOKS`, linha de situação `int2Now`.
- `src/ui/r33/int2kit.ts` — casca da sala e peças repetidas (balcão, estante com mercadoria, mesa, janela, porta, tela, letreiro…).
- `src/ui/r33/int2px.ts` — `int2Interior(id, ano)` (360×150, opaco, preenche a área), `int2Facade(id, ano)` (128×96), `int2Shop(biz, ano)` (lojas da época), `int2Spots(id)` (onde ficam as pessoas).
- `scripts/r33/int2shots.ts` → prints em `docs/r33/mocks/int2/` (um PNG por lugar: fachada + interior em 1889*, 1962, 2025, 2035 onde o lugar existe; `lojas.png` com as 23 lojas). *1889 só onde o lugar já existe.
- `tests/r33-int2.test.ts` — registro, interruptor, ações, arte.

## Registro (para a MAPA33)
`int2Types(s, cidade, ano)` → lista de `{ id, name, lot:{w,d}, where, from, to, cities?, water?, tag, mapArt }`.
| id | lote | onde | existe |
|---|---|---|---|
| bank | 4×4 | centro | 1889+ |
| court | 4×4 | centro | 1889+ |
| hospital | 4×4 | borda | 1889+ (reabilitação 1970+) |
| stadium | 8×6 | periferia | 1920+ |
| jazz | 4×3 | bairro | 1920–1979 |
| nightclub | 4×3 | bairro | 1970+ |
| church | 4×4 | bairro | 1889+ |
| tvstudio | 6×5 | borda | 1920+ |
| adagency | 4×3 | centro | 1900+ |
| samba | 6×4 | periferia | 1928+, só `rio` |
| print | 4×3 | borda | 1889+ |
| pirate | 3×3 | beco | 1960+ |
| station | 6×4 | centro | 1889+ |
| port | 6×4 | água | 1889+, só cidades de `PORT_CITIES33` |
`mapArt` = arte do mapa isométrico já existente em `pred31` (office, hotel, arena, venue, museum, tv, press, alley, platform, plant) até a MAPA33/PRED dar desenho próprio; a fachada de frente e o interior são os daqui.

## Ações (cartão do lugar; efeito simples, custo e espera visíveis)
Cada lugar tem 1–3 ações em `PAct27` (`int2Acts`) com custo em dólar real do ano, espera em semanas e motivo de bloqueio. Efeitos pequenos: reputação (comercial/artística/artistas/institucional), estresse e saúde do dono, caixa (cachês). Dois têm efeito próprio: `bank.loan` usa o `takeLoan` de hoje; `bank.collateral` cria crédito menor (US$ 6 mil reais, 10% a.a., 12 meses) com o catálogo como garantia; `hospital.rehab` põe o 1º integrante seu com vício, burnout ou doença em `recovering` (estresse −20).

## Ganchos para outras frentes (chave = `<lugar>.<ação>`, `INT2_HOOKS[chave] = (s, chave) => {ok,text} | null`)
Quem registra o gancho assume o efeito (o custo e a espera continuam daqui). Nenhum existe ainda:
- GESTÃO: `bank.loan`; CATÁLOGO: `bank.collateral` (relíquias/catálogo como garantia), `court.registro`/`court.plagio`/`court.rescisao` (rights18), `tvstudio.calouros`/`tvstudio.trilha`, `adagency.jingle`/`adagency.sync` (pop31), `print.capa` (capa pesa no físico).
- VIDA: `hospital.checkup` (saúde do dono), `hospital.rehab` (vício/burnout); PESSOAS/turnês: `stadium.show`; MUNDO: `station.viagem`/`port.embarque` (viagem antes do avião), crise de crédito (`int2Now('bank')` lê `economy.recession`; a MUNDO pode trocar por crédito mais apertado).

## Fica de fora
Ligar na tela (cartão de lugar, botão "Entrar", objeto no `objects5`/`acoes5data` e o desenho no mapa isométrico) — arquivos de outras frentes (INT-1/MAPA33/place27); a fachada de frente e `mapArt` ficam prontos para esse encaixe. Pessoas nos interiores (`int2Spots` diz onde; o desenho de bonecos é da camada de cena). Sem gancho, sem regra de dinheiro própria além do crédito pequeno.
