# Base italiana — 2ª passada pelo MusicBrainz (R31 BASE-IT)

1. `python3 mbfetch.py discover|detail|areas` — busca artistas de país IT por gênero, baixa as fichas (url-rels, gêneros,
   discos, integrantes) e a cadeia de áreas até a região (1 consulta/s, cache em `mb/`).
2. `gamedata.json` em `mb/`: chaves de deduplicação de REAL_ALL e ano de nascimento dos gêneros do jogo (gerado por um
   tsx que lê `REAL_ALL`, `REAL_ACTS`, `FICTION31` e `GENRES`).
3. `python3 mbbuild.py` — aplica as regras (docs/r31/base-it.md) e grava `mb/acts.json` + motivos de recusa.
4. `python3 mbemit.py` — escreve o bloco entre `// @@MB31-START` e `// @@MB31-END` em src/data/base31it.ts.
Depois: regenerar o registro de nomes reais (bloco `@@BASE31IT` de src/data/realnames31.ts) e rodar tests/r31-base-it.
