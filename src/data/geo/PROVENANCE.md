# Dados geográficos

- **Fonte:** [Natural Earth](https://www.naturalearthdata.com/) 1:110m Admin 0 – Countries,
  **domínio público** (sem restrições de uso; atribuição opcional: "Made with Natural Earth").
- **Pacote:** [`world-atlas`](https://github.com/topojson/world-atlas) 2.0.2 (`countries-110m.json`, TopoJSON, licença ISC),
  instalado como devDependency.
- **Códigos e nomes PT:** [`i18n-iso-countries`](https://github.com/michaelwittig/node-i18n-iso-countries) (MIT),
  ISO 3166 numérico → alpha-3 e nomes em português, com ajustes para a grafia do Brasil em `tools/build-geo.ts`.
- **Geração:** `npm run geo` (`npx tsx tools/build-geo.ts`) — requantiza os arcos para 0,04°, codifica em delta,
  registra os países de cada lado de cada arco (para esconder/tracejar fronteiras internas de uniões históricas)
  e localiza o país de cada cidade de `CITIES` (ponto-em-polígono; cidades costeiras que caem no mar na escala
  1:110m usam o país de borda mais próxima).
- **Arquivos:** `countries.json` (formas, carregado sob demanda) e `meta.json` (nomes + país de cada cidade, estático).
- Territórios sem código ISO no Natural Earth: Chipre do Norte (`XNC`), Somalilândia (`XSL`), Kosovo (`XKX`).
- Fronteiras históricas (URSS, Iugoslávia, partições, colônias, blocos) são aproximações do jogo em `src/data/geo.ts`.

Rode `npm run geo` de novo sempre que cidades forem adicionadas a `src/data/world.ts`.
