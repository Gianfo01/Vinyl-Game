# R31 · onda 4 (AMOR) — chamar qualquer pessoa para sair, ser amante e romance com o mercado

Pedido do dono: poder pedir NPCs em namoro e ser amante (menos a família Fossati), integrado ao que já existe e indo tão
fundo quanto faz sentido.

## O que mudou para o jogador

- **Chamar para sair qualquer pessoa adulta e viva** — integrante, líder de selo, crítico, empresário, produtor: pela
  ficha/menu de ações da pessoa ("Chamar para sair", no grupo Romance), pelo painel rápido (⚡ / clique direito) e clicando
  nela numa cena (interiores: bar, casa de shows, estúdio, rádio…; a praça). Antes do clique aparecem o modo (namoro, caso
  secreto ou "você seria o/a amante"), a chance e **cada fator com o peso**: conhecimento (know), opinião, química, seu
  charme (carisma e aparência), atração pela orientação da pessoa, diferença de idade, estado civil dela e o seu, fama
  relativa, romantismo e sociabilidade, laço com você (seu elenco, sócio, crítico, rival) e ex. A resposta é a conta: a
  mesma pessoa no mesmo mês responde igual. **Recusa sempre diz o motivo** (o fator que mais pesou) e a trava mostra quando
  dá para tentar de novo (26 semanas). O fluxo antigo (sair para conhecer gente, festa da indústria) continua.
- **Par oficial e caso**: o sim vira namoro (→ noivado → casamento, como sempre) ou caso secreto, agora com gente do mundo.
  Solteiro(a) com alguém casado(a): você vira o/a amante (o cônjuge pode descobrir; a pessoa pode largar o casamento).
- **Risco de descoberta por mês** com as partes à vista na ficha: o risco antigo (discrição, tempo, fama, ciúme) **mais**
  quem sabe (gente próxima do/a amante fica sabendo com o tempo e passa a guardar um trunfo contra você), fofoqueiros entre
  elas, a imprensa da época (cartas e jornais discretos → colunas sociais → revistas de fofoca → paparazzi → celulares e
  redes) e "cuidar da discrição" (1 tempo livre + um lugar discreto: três meses de risco menor).
- **Descoberta**: o par descobre (cena própria); se você é conhecido(a), a imprensa fica com as provas (trunfo — dá
  chantagem) e o boato vira notícia em 3 a 7 semanas (fato público → pesa no valor do selo, `value31` "caso amoroso
  público"); o par, os filhos dele(a) e seus sócios mudam de opinião pela moral da época e do país (divórcio e caso eram
  mal vistos antes de ~1970; casal do mesmo sexo pesa pela aceitação do país — só reação do mundo, nunca trava); casado(a)
  e com pouca afinidade, o par pode pedir o divórcio na justiça (partilha do bolso do dono, pensões e guarda do love17).
  Na cena dá para **pedir perdão** com a chance mostrada antes.
- **Romance com gente do mercado** (selo rival, crítico, rádio/mídia, empresário, sócio, artista do seu elenco): na
  intimidade a pessoa conta um segredo do outro lado (vira trunfo seu, uma vez); sócios do mesmo negócio e a banda dela
  desconfiam e se ressentem mês a mês; término ruim vira rixa pública entre os atos (`feud18`) ou mágoa (trunfo contra você).
- **Casal de artistas**: namoro/casamento público dá um pouco de expectativa aos dois atos todo mês; o término vira
  inspiração ("a dor vira disco") para a banda dela e a sua.
- **Casamento como evento de mídia**: com fama, sai nas colunas sociais ou vira capa de revista e TV (fato público +
  expectativa para os atos do casal).
- **Par com carreira própria** pede ajuda de vez em quando (apresentar e pagar divulgação: + expectativa para o ato dele/a,
  + afinidade; recusar magoa; ignorar 8 semanas também).
- **Aniversários** de namoro e de casamento no calendário; lembrar com um encontro no mês sobe a afinidade, esquecer pesa.
- **Presentes da loja (H)**: o presente para o par sobe a afinidade; para o/a amante, deixa rastro (discrição −3).
- **Ficha Coração** (aba Vida pessoal › Coração) ganha "Amor no mundo": par e caso com a ficha de quem é, laço de
  mercado, risco do mês por parte, quem sabe, cuidar da discrição, terminar, pedido de ajuda, **encontro em cena** (os
  lugares da época: restaurante/bistrô, cinema mudo/de rua/cinema, baile com orquestra/discoteca/boate, café-concerto/bar
  com música ao vivo, noite em casa, viagem de trem ou avião e hotel — com você e o par lado a lado, mesa com vela, cadeiras,
  banda da cidade no palco), a **cena da descoberta** e "Chamar alguém para sair" (conhecidos, com a chance).
- **Família Fossati**: Efro, Lucia, Sonia, Antonella e Gianluca nunca são alvo — uma trava só (`romanceLock31`), por qualquer
  porta (chave da ficha, id curto ou pessoa com o nome), com qualquer interruptor.
- **Consentimento**: a pessoa pode recusar e pode terminar (opinião no chão ou cansaço do caso depois de um ano). Nada
  explícito.

## Interruptores (Editor › Interruptores e Editor › Pessoas)

| id | padrão | desligado |
|---|---|---|
| `amor31.ask` | ligado | só o "flertar" antigo do menu e os candidatos sorteados |
| `amor31.affair` | ligado | sem caso com gente do mundo nem ser amante pelo pedido; risco e descoberta do love17 como antes |
| `amor31.market` | ligado | gente do mercado não aceita sair; sem informação, conflito de interesse, rixa nem fama de casal |

Editor: os três interruptores, afinidade com o par, discrição do caso; executáveis "Fazer o par descobrir o caso agora" e
"Apagar as recusas recentes".

## Medição (`scripts/r31/measure.ts`, sementes e eras fixas da base30)

MEDICAO

## Arquivos

- `src/sim/sys/amor31.ts` — motor (pedido, chance, trava, Fossati, risco, descoberta, mercado, mês, calendário, menu de
  pessoa, editor).
- `src/sim/sys/love17.ts` — ganchos `AMOR17` (pm, risk), `affairRisk17` (fonte única do risco), `discoverAffair17`.
- `src/ui/r31/amor31ui.ts`, `amor31model.ts`, `amor31.css` — pedido, ficha, cenas; `src/ui/pixel/interior27.ts` (`youAt`).
- Ligações: `src/ui/sys/life17.ts` (ficha Coração), `src/ui/r31/inside31.ts` e `fos31.ts` (pedido no painel da cena).
- `tests/r31-amor.test.ts`, `scripts/r31/shots-amor.mjs`, capturas `docs/r31/shots/onda4-amor-*.png`.
