# R31 · NOMES — o filtro de nomes reais troca só nomes de entidades

Com **Nomes e obras reais** desligado, o filtro `disp31` (src/data/realdisp31.ts) trocava também textos da interface:
"Nome" → "Noix" (o "NOIX" dos cabeçalhos), "Telefone" → "Teliel", "Z" → "A", "5" → "10", "1984" → "1985",
"Mover para "Mais"" → "Maard", "Fazer proposta" → "Fazmann proposta", "Teto mensal" → "Teola mensal",
"Balanço" → "Balby", a tecla "Enter" → "Entford", "Rio de Janeiro" → "Riwick de Janeiro".

## Causa

A tabela de trocas tem ~12,3 mil nomes "em frase" e ~6,6 mil títulos "texto inteiro". Os títulos (músicas, discos,
nomes de uma palavra) vinham das bases grandes com homenagem gerada, sem filtro: incluíam números ("5", "1984", "13"),
letras ("Z", "I", "N"), siglas ("OK", "LP") e palavras comuns que também são rótulos ("Nome", "Telefone", "Status",
"Balanço"). Todo texto que não viesse marcado pelo `t()` (a marca UI31 protegia só o rótulo de texto inteiro que passa
por `t()`) era trocado — e muitos caminhos não são esse (rótulos entre aspas, `title`, partes de frase, teclas).

## Correção (só exibição)

Junto com a correção do dono já integrada (`keep31`: cidades, países, mercados e teclas fora da tabela):

1. **Motor** (`notEntity31`): nunca troca texto sem letra, de 1 caractere, ou de 2 letras sem dígito ("OK", "LP",
   "No"). "U2" (letra e dígito) é nome de ato e troca.
2. **Palavras da interface geradas** (`scripts/r31/uiwords31.ts` → `src/data/uiwords31.ts`): varre os textos do
   código (pares pt/en de `l()`/`s()`/`N()`… e chamadas `l()`/`s()` do resto) e cruza com a tabela e com todo texto
   das bases (títulos que a partida põe na tabela na hora):
   - `UI_WHOLE31` (1175): nome que é um rótulo da interface — tem tradução diferente ou aparece em minúsculas numa
     frase — não troca como texto inteiro ("Nome", "Telefone", "Balanço", "Lightning", "Status");
   - `UI_INTEXT31` (161): palavra única comum ou homônima — em minúsculas numa frase, ou com maiúscula num texto da
     interface sem ser citação de propósito — só troca como texto inteiro ("Fazer", "Teto", "Neto", "Mobile", "Blitz").
     Citação de propósito continua trocando em frase: nomes compostos ("B.B. King") e a lista `ENTITY_OK31` revisada à
     mão + registro de lugares/veículos/marcas ("o som Motown", "Sobreviva ao Napster", "Era TV/MTV").
   - O teste falha se o arquivo gerado estiver desatualizado (`npx tsx scripts/r31/uiwords31.ts`).
3. **Entidades conhecidas** (`entities31`: gravadoras reais e atos do catálogo à mão) que coincidem com um rótulo
   continuam trocando como texto: a gravadora "Elenco" → "Sol Maior Discos"; o rótulo "Elenco" (aba, departamento)
   fica protegido pela marca UI31 do `t()`.

**Homônimo não protegível (aceito):** disco ou ato cujo nome inteiro é palavra da interface, número ou sigla curta
("Nome", "Luz", "1984", "5150", "Europe", "Television", "LP", "883"; os produtores "Flood" e "Youth") aparece com o nome real quando está sozinho na
tela. No meio de frase, nome de ato composto continua trocado.

## Varredura da interface (navegador)

`scripts/r31/nomes-sweep.mjs` (Playwright) abre 4 partidas com a exibição desligada — 1975 nomes inventados, 2005
nomes reais (todas as páginas e até 14 abas de cada), 1962 nomes reais e 2025 nomes inventados com **exp5.nav ligado**
(todos os objetos/papéis da onda 5 e seus marcadores). Em cada tela compara o texto (nós de texto + `title`,
`aria-label`, `placeholder`) com o filtro ligado e zerado; `scripts/r31/nomes-class.ts` separa número/letra/rótulo
traduzido/palavra minúscula trocada (suspeito) do resto (entidade). Dados: `nomes-sweep-antes.json`, `nomes-sweep.json`.

| | antes (integração) | depois |
|---|---|---|
| telas comparadas | 1593 | 1595 |
| trocas distintas | 4289 | 3634 |
| número/letra/sigla trocados (vezes) | 7051 | 0 (só "U2", ato) |
| rótulo traduzido trocado (casos) | "Nome", "Mais", "Home", "Teto", "Balanço", "Lightning", "Enter", "Q", "LP"… | 0 (só citações de propósito: "Elenco" gravadora, MTV, Motown, SABC, Cavern Club) |
| palavra comum trocada em frase | "Fazer", "Teto", "Rei", "Blitz", "Oriente", "Rio" | 0 (o que sobra são títulos de músicas com palavras minúsculas: entidade) |
| erros de página | 0 | 0 |

Rótulos de teclas (Enter, Esc, Z…), cabeçalhos de tabela ("Nome"), números das paradas e nomes de cidade não
aparecem mais entre as trocas. As trocas que restam são nomes de atos, pessoas, gravadoras, festivais, veículos e
obras (ex.: "The Yardbirds" → "The Yardbford", "Top of the Pops" → "Parada Quente", "Rock am Ring" → "Ringwald Open
Air"). Texto pintado em canvas: nenhum texto passou pelo filtro trocado nas telas varridas.

## Testes

`tests/r31-uiwords.test.ts` (casos medidos, rótulos via `t()` e crus, varredura de toda string curta da interface e de
toda chave de `S`, amostra de >1500 nomes reais continua trocada, arquivo gerado em dia, mundo com nomes reais);
`tests/r31-x-sweep.test.ts` (vazamento conta sem os homônimos não protegíveis); `r31-realnames` e goldens r27-p2a,
r27-p2b, r27-m3, r16-playbot iguais.
