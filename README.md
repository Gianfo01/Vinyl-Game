# Vinyl to Neural

Simulador de gestão musical em turnos mensais, de 1920 a 2040: da goma-laca às vozes neurais.
Esta é a primeira versão jogável construída a partir do **GDD v8**, do **Catálogo do Universo** e da
**Pesquisa de design**. Roda no navegador, sem servidor, em PT-BR e EN.

## Como rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm run build      # gera dist/ (site estático; pode ir para itch.io, GitHub Pages etc.)
npm test           # invariáveis do GDD §27 (determinismo, extrato, recoupment…)
npm run headless -- --runs 20 --years 30 --start 1960 --mode free   # simulador sem interface
```

## Como jogar (resumo)

1. **Nova run**: escolha papel (Gravadora, Artista/banda ou Híbrido), cenário, ano (1920, 1950, 1962,
   1980, 2000 ou 2030), cidade-sede, modo de mundo (Histórico, Livre, Caos), narrador (Maestro, Brisa,
   Acaso), Carta do Selo, mutators, dificuldade, seed e filtros de conteúdo.
2. **Mesa do mês** (tecla 1): briefing de até 5 itens, cartões de decisão, ofertas, metas e rumores.
3. **Mercado → Scouting** (5): sinais chegam todo mês. Aprofunde o conhecimento (rumor → observação →
   acompanhamento → audição → convivência) para estreitar intervalos de talento e potencial; faça ofertas
   com 5 modelos de contrato, cláusulas e promessas. A leitura da negociação é uma faixa, nunca uma %.
4. **Artistas** (4): agenda de 4 slots (3 para iniciantes) com 12 ações + compor/gravar/shows, ou delegue.
5. **Criação** (8): planeje lançamentos — formatos da era, tiragem física (estoque!), marketing com
   retorno decrescente `E = 1 − exp(−verba/custo de alcance)`, territórios e previsão com intervalo.
6. **Avançar**: mês a mês, trimestre ou até o próximo evento (Ctrl+Enter avança; Ctrl+K abre a paleta).
7. Acompanhe **Paradas** (WorldSound 100 / Albums, fecham por semana), **Catálogo** (autópsia de cada
   lançamento, reedições), **Shows**, **Empresa** (finanças, equipe, sede, equipamento, territórios,
   crédito, legado) e o **Diário da run**.
8. Em 2040 a run termina num dos **20 finais do Arco Neural**, escolhido pelo legado em 7 dimensões e
   pelas escolhas da era sintética. Depois dá para seguir em sandbox.

## O que está implementado (mapa do GDD v8)

| GDD | Situação nesta versão |
|---|---|
| §1 Pilares, plataforma | Navegador, PC primeiro; layout responsivo para celular (abas, tabelas roláveis) |
| §3 Cadeia de 16 etapas | Formação/cena, descoberta, negociação, composição, gravação, mixagem (abordagem), fabricação/estoque, distribuição (territórios), promoção, palco, direitos (master × edição, sync), catálogo (reedição, compra de catálogo), negócios (investidor, crédito, fusões de rivais), legado. Manual ou delegado |
| §4 Papéis | Gravadora, Artista/banda e Híbrido jogáveis. Empresário, Editora e Estúdio aparecem bloqueados (fase 4) |
| §5 Run única | Seed (L0), datas de tecnologia por modo e grafo de dependências (L1), elenco a partir dos 100 atos-arquétipo + gerador procedural com gênio solitário e ato fênix (L2), rivais e profissionais (L3), diretor de histórias e pontos de divergência (L4), papel/cenário/Carta/mutators/narrador (L5). 16 mutators, 12 Cartas com metas, assinatura da run, Diário |
| §6 Loop e ritmo | Briefing ≤ 5 itens, avanço mês/trimestre/até evento com interrupções, desfazer mês ou modo compromisso |
| §7 Mundo | 7 mercados, 40 cidades, eras com formatos, mídia e pressões próprias; macroeventos (recessão, greve, leis) |
| §8 Cenas e gêneros | ~130 gêneros em 14 famílias com data de nascimento e pais; popularidade dinâmica, cenas por cidade, explosão de cena, revivals |
| §9 Pessoas | 7 habilidades 0–100, potencial oculto, 36 traços, 8 ambições, 7 origens, estados (moral, inspiração, fadiga, estresse, ressentimento), saída de integrante (moral < 25 por 3 meses; substituto $6.500), carreira em 3 eixos, aposentadoria, lendas |
| §10 Scouting | 9 fontes por era, 5 graus, viés e envelhecimento de relatórios, pedido estruturado, disputa com rivais, quadro de pipeline |
| §11 Contratos | Clássico, 360, licenciamento, distribuição e edição; adiantamento, royalties, prazo, controle criativo, publishing, promessas registradas; recoupment conforme o exemplo do v6; renovação, contraproposta, rescisão |
| §12 Criação | Q = 0,25 melodia + 0,20 letra + 0,25 performance + 0,20 produção + 0,10 originalidade; estúdios por nível, abordagem espontânea/equilibrada/minuciosa, produtor, engenheiro, equipamento por era |
| §13 Fabricação e distribuição | Formatos por era, parcela física 80/35/8 %, prensagem com custo, estoque e falta, reprensagem, pirataria por era |
| §14 Marketing | 12 canais por era com retorno decrescente, críticos, jabá com risco persistente, gestão de crise, reputação em 4 dimensões |
| §15 Palco | 5 níveis de casa, estimativa de público, divisão com promotor, fadiga, incidentes, festivais com billing (abertura/tarde/headline), residências |
| §16 Direitos | Master e edição separados; chaves únicas no ledger (reprocessar não duplica); sync; licença de voz sintética |
| §17 Fandom | Casual, ativo e núcleo com conversão e desgaste |
| §18 Economia | Centavos e índice de preços por década, cascata com distribuição e impostos, crédito, investidor, insolvência com venda de ativos |
| §19 Rivais | 22 gravadoras do Catálogo em 4 famílias + selos novos procedurais; IA por regras, só com informação pública, motivo de cada decisão registrado; falências e fusões |
| §20 Eventos | ~50 eventos em 15 categorias com pré-condições, cooldown, tags de conteúdo e opções; perfis Maestro/Brisa/Acaso; "machuca, mas não mata"; regra RS do Catálogo |
| §21 Sede | Garagem, Estúdio pequeno, Loft, Complexo (vagas, equipe, sessões, equipamento), carga de gestão e terceirização; 12 funções de equipe; sede isométrica com uma unidade por banda |
| §22 Progressão | Metas visíveis, legado em 7 dimensões, Gramófonos de Ouro (4 categorias), Hall of Echoes, 20 finais |
| §24 Interface | 10 áreas + Diário, Mesa do mês, ficha unificada com cadeia de inspeção, autópsia, paleta de comandos, informação tipada (exato × intervalo) |
| §25 Arte, áudio, acessibilidade | Logos e capas gerados por parâmetros (fora do save); prévias instrumentais procedurais por gênero e era, só por clique; texto 90–130 %, alto contraste, movimento reduzido, teclado, tema claro/escuro; PT-BR e EN |
| §26 Arquitetura | TypeScript, Canvas 2D, simulação separada da renderização, saves em IndexedDB com gzip, exportação/importação JSON, migrações; simulador headless |
| §27 QA | Testes de determinismo, extrato × caixa, recoupment, cancelar não cobra, chave duplicada, filtros de conteúdo, regra RS, finais |

### Decisões pendentes do GDD §30 — o que foi adotado

Usei as recomendações do próprio GDD: sem "porte inicial" (cenário + sede); Gravadora e Híbrido começam no
Estúdio pequeno; logos e capas procedurais; 4 slots de agenda; os três narradores; capital do Do zero menor
que o do Artista; 3 papéis primeiro; recarga livre com compromisso opcional; filtros de conteúdo oferecidos,
tudo ligado por padrão; dólar fictício único; pool de streaming pró-rata; PT-BR e EN; sem nuvem.
Conteúdo sexual explícito **não** foi incluído (dúvida 8 do GDD ainda em aberto).

### Ainda não está (próximas fases do roadmap)

- Papéis Empresário, Editora musical e Estúdio/produtor (fase 4/5) e modelos de contrato correspondentes.
- Tick em Web Worker, editor de universo, placar por seed, telemetria opt-in, pacote offline.
- Filiais e joint ventures; mercados com moedas próprias; 500 eventos (há ~50).
- Calibração fina: o simulador headless já mede falência e unicidade (sobreposição de top 100 entre
  seeds fica entre 6 % e 23 %), mas os números `[HIP]` do GDD ainda precisam de playtest.

## Estrutura

```
src/core      RNG determinístico (sfc32) e dinheiro em centavos com índice de preços
src/data      Catálogo do Universo, mundo (mercados, cidades, gêneros), pessoas e regras
src/sim       Simulação: worldgen, scouting, contratos, produção, mercado, palco, rivais,
              eventos/diretor, economia, legado, agenda, ciclo de vida, tick e bot headless
src/ui        Interface: app, painéis, ficha, sede isométrica, arte e áudio procedurais
src/i18n      Textos da interface (PT-BR/EN)
tools         Simulador sem interface
tests         Invariáveis do GDD §27
```

O universo é 100% ficcional. A coluna "referência real" do Catálogo é interna e **não** entra no código.
