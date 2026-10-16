# R31 · onda 4 (EMO) — emojis viram ícones em pixel art

Pedido do dono: "hoje as cenas estão com emojis; troque por emojis em pixel art para manter a consistência do jogo".

## O que mudou para o jogador

- Nenhum emoji colorido do sistema na tela: humores e gestos das pessoas nas cenas (😊 🙅 😠 🤔 …), selos das cenas (⏱ 🔒 ⚡ 🤝 ✍ 🃏 🚪), salas, loja, sede, casa Fossati, cidade, menus, abas, fichas, avisos, conquistas (🥇🥈🥉🏆🔒), salvar (💾 ☁ 🗑), finanças e todo texto que vem do motor (fatos, manchetes, calendário) agora mostram **ícones 16×16 em pixel art** no mesmo estilo de `icons.ts` (paleta curta, contorno escuro), em escala inteira conforme a fonte (16, 32, 48 px).
- Marcas de interface também viraram pixel quando são ícone: ★ ☆ ✓ ✕ ✗ ✦ ⓘ (inclusive as do CSS: estrela da carreira no menu, ✓/✕ do modo daltônico, ✓ da etapa concluída, 🔒 do botão bloqueado compacto). Setas de navegação (→ ← ↗ ↩), triângulos (▶ ▾ ▲ ▼) e marcadores (● ○ ■) continuam texto.
- Acessibilidade: cada ícone tem `alt` e `aria-label` bilíngue com o que o emoji significava (🔒 → "bloqueado / locked"; ✕ sozinho num botão → "Fechar / Close"). Em `title`, `aria-label`, `placeholder`, `<option>` e SVG (que não aceitam imagem) o emoji vira a palavra ou some; marcas monocromáticas (★ ✓ ♪) ficam como texto.
- Canvas: texto pintado com emoji (mapa, cenas) desenha o ícone no lugar; a nota ♪ do campus virou 4×5 px desenhados.

## Como funciona (fonte única)

- `src/ui/pixel/icons31.ts`: 63 ícones novos (anchor, check, cross, star-empty, unlock, bolt, cloud, skip, pause, medalhas de ouro/prata/bronze, floppy, info, person, letter, trash, gear, magnifier, no-entry, receipt, swords, clipboard, money-out, candle, bell-off, phone, chains, moon, sun, folder, coffee, trumpet, violin, keyboard, fountain, crane, sponge, shark, drink, gift, tent, rain, speaker, palette, health, box, card, speech, hand, thumbs-up, flex, shush e 10 rostos de humor).
- `src/ui/pixel/emo31.ts`: o mapa emoji → ícone (um nome por conceito, emojis de mesmo sentido agrupados: ✓✔☑ → `check`, ♪♫🎵🎶🎼 → `note`, 😰😣😫 → `face-stress` …) com rótulo bilíngue; `pxText(str)` (HTML), `pxNodes31(str)` (nós), `pxEmo31(emoji)` (um ícone), `emoPlain31(str)` (só texto), `installEmo31()` (rede de segurança no documento + gancho do canvas + variáveis `--pxi-*` para o CSS).
- O código continua escrevendo o emoji como marcador semântico (inclusive o motor, que não sabe de imagem); a troca é só na exibição: `dom.ts` `h()` (por onde passa quase todo texto), o observador do documento (textContent/innerHTML), o canvas e o CSS.
- Cenas trocadas explicitamente primeiro: o gesto no balão do palco (`scene31stage.ts`) e na faixa de elenco das cenas antigas (`cast31.ts`) usam `pxEmo31` com o rótulo do humor; o resto das cenas (selos, botões, resultados, lock31, quick31, salas, interiores, sede, cidade, FOS/ART2/W+R) passa pelo `h()`.
- Conserto junto: a confirmação de "gastar tempo pessoal" (agenda17) contava ⏱ no texto do botão; agora conta também o ícone `<img data-emo="clock">`.
- `vis.ts`: a tabela de emoji de reserva de `ic()` (50 emojis) foi apagada — nome desconhecido vira um ponto.

## Verificação

- `tests/r31-emo.test.ts`: varre os literais (strings/templates, sem comentários) de `src/ui`, `src/sim`, `src/data`, `src/core`, `src/i18n` e falha se aparecer pictograma fora do mapa; varre o CSS (`content:`); confere que todo nome do mapa tem desenho 16×16 com mais de 30 pixels, desenhos distintos entre si, rótulos pt/en, e a quebra de texto (seletor de variação, ZWJ, tom de pele, setas que ficam).
- Auditoria: `docs/r31/emo-auditoria.md` (gerada por `npx tsx scripts/r31/emo-audit.ts`).
- Números do jogo: nada no motor mudou (só exibição) — sem interruptor, sem medição; goldens iguais.
- Capturas: `docs/r31/shots/onda4-emo-*-antes.png` / `-depois.png` (cenas de lançamento, banco e negociação; salas de troféus e estúdio; sede; loja; casa Fossati; conquistas; avisos; finanças; Hoje) e `onda4-emo-folha.png` (todos os ícones do mapa). Roteiro: `scripts/shots31emo.mjs`. As partidas de antes e depois são sorteadas, então nomes e números diferem; o que se compara são os ícones.

## Conserto depois da junção

- Laço do observador: com as marcas monocromáticas (★ ✓) mantidas em `title`/SVG/`<option>`, reescrever o mesmo valor gerava outra mutação e travava a página (salas não abriam). Agora o observador só escreve quando o valor muda; o teste confere que `emoPlain31` é idempotente.
- ⚓ (aeroporto/porto, vindo da junção) ganhou o ícone `anchor` — o teste pegou o pictograma novo fora do mapa, como devia.

## Testes

Suíte inteira rodada (antes da junção) e, depois da junção, os arquivos restantes + os obrigatórios: falham só os que também falham na base `claude/friendly-brown-vpsmfl` sem esta mudança (r17-data "lote novo", r14-db "< 3s", r31-w2rev "proposta padrão pela cena", r29-connect-all "arestas", r19-data-base e r31-base "curadoria") e o `sim.test` "arco 2030", que só estoura o limite de 300 s com a máquina carregada (rodado sozinho passa, junto com r16-playbot, r27-p2a, r27-p2b e r27-m3: 57/57). `r31-contrast` atualizado: o reforço sem cor do modo daltônico agora é `var(--pxi-check|cross)`.
