# QA5 · onda 5 · jogar o jogo inteiro com `exp5.nav` ligado

Build do dono: `VITE_EXP5NAV=1` (vite com `scripts/vite-qa5.config.mjs`, porta 5891). Jogado por Playwright (Chromium),
começo rápido pela tela de Nova run, clicando como o dono. Capturas em `docs/r31/shots/qa5/`.

Donos: **POL5** (janela baixa, mundo↔cidade, cartão da cidade, fixar, painel cortando, títulos, vazio do mural/quadro,
polimento), **CENAS5** (moldura antiga dentro dos lugares, voltar para a cidade), **ACOES5** (ações no objeto em vez de
telas), **QA5** (esta frente: o resto), outros (TUT, DECO, NOMES, INI…).

Estado: ✅ resolvido · ⏳ com a frente dona (ainda não chegou) · ❌ aberto.

| # | Problema | Onde / como reproduzir | Captura | Dono | Estado |
|---|----------|------------------------|---------|------|--------|
| 1 | Porta da rua (e mapa-múndi na parede) abre a página antiga "Nosso mundo" num papel, em vez de ir para a cidade/mundo | Sede → clicar na porta da Recepção | `qa5-01-porta-papel.png` | QA5 | ✅ (`show5`: objeto só-atalho de viagem viaja) |
| 2 | Esc numa janela antiga (Janela da casa, Carregar, Ctrl+K…) fecha a janela **e** abre a pausa no mesmo toque | Casa → Janela → Esc | `qa5-02-janela-modal.png` | QA5 | ✅ (`modal` marca o Esc; casca ignora Esc já usado) |
| 3 | Objetos da sede abrem a página antiga inteira dentro do papel: Mesa do mês, Estante de troféus, Sala de gravação, Mesa de som, Palco de ensaio, Lounge | Sede → clicar no objeto | `qa5-03-mesames-antiga.png` | ACOES5 | ✅ (merge a5925af3: cartão de ações; página antiga só por "ver tudo ▸"; re-testado 1962/1985/2015) |
| 4 | Casa: espelho abre a página "Você" inteira; Estante/Cama/Telefone/Porta-retratos/Escrivaninha: toda ação do cartão abre página antiga inteira; Calendário, Instrumento e "Você" abrem a página direto, sem cartão | Casa → clicar no espelho → Aparência | `qa5-04-espelho-voce.png` | ACOES5 | ✅ (cartão em todas as peças da casa; cada ação testada: nenhuma sem efeito) |
| 5 | Casa: Janela abre a janela antiga "casas à venda" (modal) | Casa → Janela | `qa5-02-janela-modal.png` | ACOES5 | ✅ cartão; mas ver #18 |
| 6 | Dentro dos lugares aparece a moldura antiga (Cena / Ver como lista / Mostrar tudo / Rótulos / caixa de ajuda "Entendi") | Cidade → prédio (Marquee Club) → Entrar | `qa5-05-lugar-moldura.png` | CENAS5 | ⏳ |
| 7 | Cidade (⇧3) é a página antiga rolada: título e abas "Sua sede / Nosso mundo" somem no topo, atalhos cortados embaixo (1280×720) | ⇧3 | `qa5-06-cidade-cortada.png` | POL5 | ⏳ |
| 8 | Mundo: abas do mapa cortadas no topo; painel do país com o nome cortado | ⇧4 → Reino Unido | `qa5-07-mundo-pais-cortado.png` | POL5 | ⏳ |
| 9 | Cidade aberta pelo mundo (Liverpool): "← Voltar ao mundo" fica fora da vista e Esc abre a pausa em vez de voltar ao mundo (beco sem saída para quem joga por tecla) | ⇧4 → Reino Unido → Liverpool → Esc | `qa5-08-cidade-mundo-sem-volta.png` | POL5 | ⏳ |
| 10 | Clicar numa cidade no mundo entra direto, sem cartão com infos | ⇧4 → país → cidade | — | POL5 | ⏳ |
| 11 | "+ fixar" da barra fica apagado sem papel aberto e não diz o que fazer | barra de baixo, sem papel | — | POL5 | ⏳ |
| 12 | Casa: faixa "SUA CASA · MORADIA…" cortada na borda esquerda; rótulos Telefone e Porta-retratos se sobrepõem | ⇧2 | `qa5-09-casa-rotulos.png` | POL5 | ⏳ |
| 13 | Nova run: rótulos da régua de época grudam ("1950 rock1962 beat") | Nova run, ano 1962 | `qa5-10-novarun-regua.png` | outro (INI) → QA5 | ✅ (eras pares descem uma linha) |
| 14 | Caderno na estante: abre com o balão "Por quê?" aberto; precisa de 2 Esc para fechar | Sede → Caderno | `qa5-11-caderno-pop.png` | QA5 | ✅ não reproduz com o cartão (era o mouse parado sobre o "Por quê?") |
| 15 | Sede em 1280×720: cena não ocupa a largura, faixa vazia à direita sob os recados | ⇧1 | `qa5-06…` | POL5 | ⏳ |

| 16 | "ver tudo ▸" da porta (sede e casa) abria a cidade inteira num papel por cima da casa | Casa → Porta → ver tudo | — | QA5 | ✅ (`show5`: objeto-lugar viaja também com papel fechado) |
| 17 | Carreira Festival (1985): botão ⇧1 diz "Terreno do festival", mas a cena é a sede do selo ("SELO AGULHA", estúdio, palco) | Nova run Festival 1985 → ⇧1 | `qa5-12-festival-sede.png` | outro (NAV/CASA) | ❌ anotado (decisão de arte/conteúdo da sede por carreira) |
| 18 | Casa: cartão da Janela só tem "Sair para a cidade"; "ver tudo" abre o cofre; comprar/mudar de casa sumiu do caminho direto | Casa → Janela | — | ACOES5 | ⏳ |

## Robô (`scripts/r31/qa5.mjs` + `tests/r31-qa5.test.ts`)
`node scripts/r31/qa5.mjs [--quick] [--out x.json] [--shots pasta]` sobe o vite com `VITE_EXP5NAV=1`, começa pela Nova
run e percorre sede, casa (cartão e cada ação), cidade (um prédio de cada tipo, entrar e Esc), mundo (país → cidade →
Esc), viagem (⇧1–4, cliques, H), ajuda, busca, pausa (Salvar, Carregar, índice inteiro), bolso e avançar mês. Achados
conhecidos ficam em `scripts/r31/qa5-known.json` com o dono; qualquer outro reprova. `--quick` (o teste) = 1962,
gravadora, 1280×720 (~4 min); completo = 1925 artista 1366×768, 1962 gravadora 1280×720, 1985 festival 1600×700,
2015 gravadora 1920×1080.

## O que funcionou (1962, gravadora, 1280×720)
- Começo rápido em ~2,5 s; sem erro de página no começo nem em 6 meses avançados.
- Busca (Ctrl+K → "fin" → Enter abre o Livro-caixa), ajuda de teclas (?), pausa (Esc), Salvar (toast "Jogo salvo."),
  Carregar (abre a lista), H volta à sede, ⇧1–4 viajam.
- Bolso: "+ fixar no bolso" do papel funciona; o item aparece na barra com a tecla.
- Lugar → Esc volta à cidade.
