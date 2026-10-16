# R31 · onda 4 (FOS) — a família Fossati em cena

Pedido do dono: a família, a praça da homenagem e a casa da família viram **cenas**; e (ajuste no meio do trabalho) a casa
é **uma casa no mundo, na cidade de início do jogador**, não uma aba.

## O que mudou para o jogador

- **Casa Fossati no "Nosso mundo"**: a família mora na cidade de início (`FAM_CITY31.id` vazio = cidade de início; o editor
  de base ainda pode fixar outra). Um prédio de moradia da cidade comum vira a "Casa Fossati" (`FAMHOME27` em place27):
  painel do lugar (dono, agora, quem está lá) e **Entrar (ver por dentro)**. Não dá para comprar o imóvel.
- **A casa por dentro** (`ui/r31/fos31*.ts`, pintura `ui/pixel/fos31px.ts`): corte de interior no pixel art antigo, mesma
  grade e escala dos interiores; muda com a época (fogão a lenha/esmaltado, rádio/TV, foto e maquete do avião desde 1911 —
  antes um papagaio de papel —, cartaz de teatro e redação até 1996, lousa da escola de idiomas depois, peça da Metalmac da
  época: cilindro, 78, LP, CD, vinil). Os quatro (e o Gianluca à mesa) estão sempre lá, no canto do papel do momento,
  clicáveis: **Conhecer** (`famMeet31` → `famMet31`, conquista "Famiglia" com os quatro) e a fala do papel atual (`famTalk31`).
- **Objetos → ações que já existiam**: cozinha → lasanha; mesa → almoço da Lucia; troféus → tênis; vitrine → violino (lugar
  vazio quando roubado; nunca à venda); avião → voo (uma vez por partida); mesa da Sonia → evento; cartaz/redação → imprensa
  e teatro (até 1996) ou lousa → escola de idiomas; oficina → Metalmac. O **motivo do bloqueio aparece antes do clique**
  (`famLock31`, fonte única: as ações chamam a mesma função), "Ver como lista", rótulos, painel rápido (⚡ da cidade: ir à
  casa, ir à praça, almoço).
- **Praça Efro e Lucia Fossati**: a placa ao lado da sede, no mapa, agora abre a praça em cena — placa, banco, árvores,
  coreto e uma escultura discreta de violino; gente de verdade da cidade passando (equipe dos lugares que está na cidade
  nesta semana) e, às vezes, a família (`famSquare31`: pelo mês e a semente, sem sorteio nem estado; nunca ao abrir).
- **Aba Mundo › Família Fossati**: continua com tudo (cartões, violino, ações) e ganha "Ir à casa (no mapa)" / "Ir à praça
  (no mapa)".
- **Visuais**: inspirados nas fotos que o dono mandou — Efro de cabelo branco, óculos finos, camisa clara, mais encorpado;
  Lucia de cabelo curto castanho-grisalho e brincos; Antonella loira de cabelo longo e blusa azul-clara; Sonia de cabelo
  castanho-acobreado na altura do ombro, argolas e blusa preta; Gianluca de cabelo castanho-escuro curto, barba curta, óculos
  de aviador, camisa branca e corrente (olhos verdes não aparecem no boneco de 24 px). Peças do jogo, sem peça nova.

## Números

Nenhuma regra econômica nova: as ações e os efeitos são os de antes (atrás de `fam31`); a refatoração `famLock31` devolve os
mesmos textos e na mesma ordem (testes de `r31-familia` iguais). A casa troca um prédio de moradia da cidade comum (só
interface; `places27` é leitura). Goldens: nenhum mudou por esta frente (a junção N + I re-mediu r27-p2a/p2b: caixa
1132370, acts 4020965551).

## Testes

`tests/r31-fos.test.ts`: casa no Nosso mundo da cidade de início; abrir casa e praça não muda estado nem sorteio; família
presente em 1889/1935/1985/2024/2040 com idade fixa; cada objeto leva à ação certa e o motivo é o mesmo da ação; conhecer e
"Famiglia"; família na praça decidida pelo mês.

Capturas: `docs/r31/shots/onda4-fos-*.png` (aba, mapa com a Casa Fossati, casa em 1935/1985/2024, praça, praça com a família,
folha dos visuais). Script: `scripts/r31/shots-fos.mjs`.
