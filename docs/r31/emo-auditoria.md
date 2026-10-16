# R31 · onda 4 (EMO) — auditoria de emojis e símbolos-ícone

Pedido do dono: "hoje as cenas estão com emojis; troque por emojis em pixel art para manter a consistência do jogo".

Varredura dos literais de texto (strings e templates; comentários não contam) de `src/ui`, `src/sim` e `src/data` — gerada por `npx tsx scripts/r31/emo-audit.ts` (o código continua escrevendo o emoji como marcador semântico; é a tela que troca pelo ícone — por isso a lista vale para antes e depois; a tabela de reserva de vis.ts, 50 emojis, foi apagada).

**769 ocorrências · 157 pictogramas distintos · 194 arquivos.** Por onde passam: cenas 242, motor (fatos, avisos, conquistas, calendário) 62, resto da interface 465.

Como cada um chega à tela e é trocado:

- **Texto do DOM** montado com `h()` (quase toda a interface e todo texto do motor: fatos, avisos, conquistas, manchetes) → `dom.ts` troca por `<img class="px pxi pxe" alt="…">` (`pxNodes31`).
- **`textContent`/`innerHTML`** fora do `h()` → rede de segurança `installEmo31()` (MutationObserver no documento) faz a mesma troca; `pxText(str)` serve para quem monta HTML.
- **`title`, `aria-label`, `placeholder`, `<option>`, `<textarea>`, SVG** (não aceitam imagem) → `emoPlain31`: o emoji vira a palavra (se estiver sozinho) ou some (se houver texto).
- **Canvas** (`fillText` nas cenas, mapa, campus) → gancho `installCanvasEmo31()` desenha o ícone no lugar; a nota ♪ do campus virou 4×5 px desenhados.
- **CSS** (`content:` com ★ ✓ ✕ 🔒) → `background: var(--pxi-<nome>)` com o mesmo ícone.

Símbolos que **ficam como texto** (não são ícone): setas de navegação (→ ← ↗ ↩ …), triângulos de abrir/tocar (▶ ◀ ▾ ▲ ▼), marcadores geométricos (● ○ ■ ◆), sinais matemáticos e de moeda, ♀ ♂ ⚲ ☰.

| Emoji | Código | Ícone | Rótulo (pt / en) | Nº | Onde aparece (arquivo:linha) |
|---|---|---|---|---|---|
| ★ | U+2605 | `fame` | estrela / star | 108 | data/rules.ts:276, sim/r31/relic31.ts:349, sim/reviews.ts:306, sim/sys/discover18.ts:190, sim/sys/scout11.ts:56, sim/sys/why18.ts:147, ui/ab18stars.ts:21, ui/ab18stars.ts:24, ui/ach27.ts:37, ui/act27/campaign27.ts:67, ui/act27/favors27.ts:125, ui/act27/heist27.ts:198 … (+69) |
| ✓ | U+2713 | `check` | feito / done | 79 | sim/r31/tags.ts:20, sim/start17.ts:29, sim/start17.ts:34, sim/start17.ts:49, sim/sys/careers19.ts:514, sim/sys/careers19.ts:515, sim/sys/scout23.ts:330, sim/sys/scout23.ts:335, sim/sys/scout23.ts:338, ui/newgame13.ts:84, ui/panels/artists.ts:247, ui/panels/misc.ts:470 … (+52) |
| ⚠ | U+26A0 | `warning` | atenção / warning | 39 | sim/sys/circuits18.ts:89, sim/sys/idols18.ts:85, ui/act27/compose27.ts:133, ui/act27/compose27.ts:171, ui/act27/show27.ts:131, ui/newgame.ts:383, ui/newgame17.ts:279, ui/panels/artists.ts:112, ui/panels/artists.ts:140, ui/ps/home27.ts:122, ui/ps/home27.ts:189, ui/quick18.ts:57 … (+22) |
| ✕ | U+2715 | `cross` | não / no | 38 | ui/act27/favors27.ts:92, ui/act27/road27.ts:86, ui/act27/show27.ts:84, ui/common.ts:130, ui/explain18.ts:86, ui/newgame13.ts:74, ui/panels/artists.ts:296, ui/panels/artists.ts:342, ui/panels/business.ts:56, ui/panels/central.ts:167, ui/panels/creation.ts:77, ui/r31/car31ui.ts:139 … (+25) |
| ⏱ | U+23F1 | `clock` | prazo / deadline | 37 | sim/calendar19.ts:43, ui/help18data.ts:11, ui/help18data.ts:308, ui/newgame17.ts:277, ui/r31/desk31model.ts:35, ui/r31/salas31model.ts:308, ui/r31/salas31model.ts:574, ui/r31/scene31model.ts:15, ui/scen22.ts:129, ui/sys/agenda17.ts:35, ui/sys/agenda17.ts:60, ui/sys/agenda17.ts:61 … (+19) |
| 🔒 | U+1F512 | `lock` | bloqueado / locked | 28 | ui/ach27.ts:46, ui/ach27.ts:91, ui/act27/heist27.ts:178, ui/help18data.ts:11, ui/ps/home27.ts:160, ui/r31/art31model.ts:136, ui/r31/fos31model.ts:173, ui/r31/inside31model.ts:196, ui/r31/lock31.ts:32, ui/r31/lock31.ts:33, ui/r31/lock31.ts:35, ui/r31/lock31.ts:41 … (+12) |
| ✗ | U+2717 | `cross` | não / no | 21 | sim/start17.ts:44, ui/panels/artists.ts:247, ui/r31/quick31.ts:153, ui/r31/scene31core.ts:274, ui/rightsView.ts:130, ui/sys/actmenu20.ts:306, ui/sys/artist18.ts:78, ui/sys/artist18.ts:228, ui/sys/fest12.ts:94, ui/sys/live/festival.ts:153, ui/sys/live/festival.ts:156, ui/sys/long18.ts:103 … (+4) |
| ♪ | U+266A | `note` | música / music | 19 | ui/editor31.ts:127, ui/editor31.ts:136, ui/editor31.ts:138, ui/panels/business.ts:174, ui/ps/ctx27.ts:92, ui/r31/art31.ts:53, ui/r31/art31model.ts:154, ui/r31/gente31ui.ts:14, ui/r31/inside31.ts:66, ui/r31/inside31model.ts:211, ui/r31/salaart31.ts:71, ui/r31/salas31model.ts:358 … (+7) |
| ☆ | U+2606 | `star-empty` | estrela vazia / empty star | 15 | sim/r31/relic31.ts:349, sim/reviews.ts:306, ui/ab18stars.ts:24, ui/app.ts:665, ui/nav15.ts:108, ui/r31/quick31.ts:106, ui/r31/quick31.ts:145, ui/r31/quick31.ts:146, ui/r31/quick31.ts:199, ui/sys/inbox27.ts:169, ui/sys/inbox27.ts:249, ui/sys/lendas9.ts:44 … (+1) |
| 🤝 | U+1F91D | `handshake` | acordo / deal | 11 | sim/r31/rescind31.ts:25, ui/act27/flow27p2.ts:99, ui/act27/negotiate27.ts:40, ui/r31/scene31core.ts:237, ui/r31/scene31core.ts:286, ui/r31/scene31core.ts:360, ui/r31/scene31w.ts:307, ui/sys/live19.ts:107, ui/sys/people/negotiation.ts:22, ui/sys/people/views.ts:119, ui/sys/retro8.ts:72 |
| 🎲 | U+1F3B2 | `dice` | sorteio / random | 11 | ui/newgame.ts:227, ui/newgameLabels.ts:130, ui/ngdata13.ts:87, ui/panels/creation.ts:96, ui/pixel/editor.ts:147, ui/ps/char29.ts:33, ui/ps/char29.ts:75, ui/ps/char29.ts:77, ui/ps/char29.ts:96, ui/sys/project8.ts:183 |
| ☁ | U+2601 | `cloud` | nuvem / cloud | 11 | ui/r31/salas31model.ts:215, ui/r31/salas31model.ts:358, ui/r31/salas31model.ts:396, ui/savechip20.ts:34, ui/saves17.ts:252, ui/saves17.ts:259, ui/saves17.ts:264, ui/saves17.ts:271 |
| 🎮 | U+1F3AE | `gamepad` | jogável / playable | 10 | ui/act27/flow27.ts:120, ui/act27/flow27.ts:168, ui/act27/flow27.ts:173, ui/act27/flow27.ts:194, ui/act27/flow27model.ts:217, ui/rightsView.ts:141, ui/sys/crime17.ts:244 |
| ✦ | U+2726 | `sparkle` | destaque / highlight | 10 | ui/actions20.ts:402, ui/charCreate.ts:141, ui/newgame13.ts:84, ui/ngdata13.ts:105, ui/panels/artists.ts:295, ui/panels/artists.ts:318, ui/sys/home18.ts:77, ui/sys/home18.ts:78 |
| ⚡ | U+26A1 | `bolt` | rápido / quick | 9 | ui/act27/compose27.ts:80, ui/act27/compose27.ts:88, ui/act27/compose27.ts:137, ui/act27/compose27.ts:138, ui/r31/lock31.ts:66, ui/r31/quick31.ts:145, ui/r31/salas31model.ts:214 |
| ⏭ | U+23ED | `skip` | pular / skip | 9 | ui/app.ts:341, ui/app.ts:356, ui/pixel/cine18.ts:258, ui/ps/cut27.ts:185, ui/r31/cast31.ts:57, ui/r31/mech31.ts:128, ui/sys/pacing8.ts:54 |
| 🔥 | U+1F525 | `fire` | em alta / hot | 8 | sim/sys/people/feed.ts:79, ui/act27/heist27.ts:178, ui/help18data.ts:309, ui/quick18.ts:56, ui/sys/calendar19.ts:44, ui/sys/lendas9.ts:120 |
| ✎ | U+270E | `pen` | escrever / write | 8 | ui/newgame.ts:369, ui/ps/home27.ts:163, ui/ps/home27.ts:202, ui/r31/salas31model.ts:460, ui/r31/salas31model.ts:588, ui/r31/salas31model.ts:739, ui/saves17.ts:248, ui/saves17.ts:270 |
| 🎬 | U+1F3AC | `clapper` | filmagem / filming | 8 | ui/panels/market.ts:52, ui/panels/misc.ts:410, ui/r31/car31ui.ts:97, ui/r31/mech31.ts:129, ui/r31/socio31ui.ts:69, ui/sys/project12.ts:126, ui/sys/session19.ts:52, ui/sys/world4/industry.ts:43 |
| 💾 | U+1F4BE | `floppy` | salvar / save | 7 | ui/app.ts:277, ui/panels/artists.ts:343, ui/savechip20.ts:38, ui/savechip20.ts:39, ui/savechip20.ts:53 |
| 🎤 | U+1F3A4 | `mic` | microfone / microphone | 7 | ui/panels/creation.ts:114, ui/panels/desk.ts:22, ui/panels/people.ts:43, ui/sys/home18.ts:75, ui/sys/intrigue.ts:30, ui/sys/live/museum.ts:16, ui/sys/tribute19.ts:31 |
| ✍ | U+270D | `pen` | escrever / write | 6 | sim/calendar19.ts:43, ui/act27/negotiate27.ts:47, ui/r31/scene31core.ts:239, ui/r31/scene31w.ts:202, ui/r31/scene31w.ts:209, ui/sys/home18.ts:75 |
| ⚖ | U+2696 | `gavel` | justiça / law | 6 | sim/calendar19.ts:43, sim/r31/rescind31.ts:27, ui/act27/heist27.ts:178, ui/help18data.ts:429, ui/sys/ctx19.ts:22 |
| 🏅 | U+1F3C5 | `medal` | medalha / medal | 6 | sim/calendar19.ts:43, ui/ach27.ts:66, ui/newgame17.ts:276, ui/sys/home18.ts:75, ui/sys/live/goals.ts:106, ui/sys/ux19.ts:320 |
| 🥇 | U+1F947 | `medal-gold` | ouro / gold | 6 | ui/ach27.ts:18, ui/scen22.ts:84, ui/scen22.ts:135, ui/sys/lendas9.ts:118, ui/sys/live/goals.ts:85, ui/sys/live/goals.ts:144 |
| 🏆 | U+1F3C6 | `trophy` | troféu / trophy | 6 | ui/ach27.ts:89, ui/ach27.ts:99, ui/r31/salas31model.ts:639, ui/sys/home18.ts:75, ui/sys/lendas9.ts:119, ui/sys/rockhall9.ts:33 |
| ♥ | U+2665 | `heart` | afeto / affection | 6 | ui/act27/heist27.ts:178, ui/r31/salas31model.ts:216, ui/sys/directory.ts:161, ui/sys/life17.ts:239, ui/sys/people/views.ts:33, ui/sys/story12.ts:21 |
| ⓘ | U+24D8 | `info` | informação / info | 6 | ui/explain18.ts:126, ui/newgame17.ts:238, ui/ng29labels.ts:95, ui/ps/grid29.ts:53, ui/ps/nr29.ts:49, ui/ps/screens29.ts:65 |
| 🥈 | U+1F948 | `medal-silver` | prata / silver | 5 | ui/ach27.ts:18, ui/scen22.ts:84, ui/scen22.ts:135, ui/sys/live/goals.ts:85, ui/sys/live/goals.ts:144 |
| 🥉 | U+1F949 | `medal-bronze` | bronze / bronze | 5 | ui/ach27.ts:18, ui/scen22.ts:84, ui/scen22.ts:135, ui/sys/live/goals.ts:85, ui/sys/live/goals.ts:144 |
| 👤 | U+1F464 | `person` | pessoa / person | 5 | ui/act27/night27.ts:66, ui/ps/home27.ts:129, ui/saves17.ts:303, ui/sys/lendas9.ts:218, ui/sys/talentos23.ts:96 |
| ✉ | U+2709 | `letter` | carta / letter | 4 | sim/calendar19.ts:43, ui/r31/salaart31.ts:78, ui/sys/home18.ts:140, ui/sys/inbox27.ts:404 |
| 📰 | U+1F4F0 | `newspaper` | imprensa / press | 4 | sim/r31/rescind31.ts:28, ui/act27/heist27.ts:178, ui/panels/desk.ts:21, ui/sys/home18.ts:75 |
| ⏸ | U+23F8 | `pause` | pausa / pause | 4 | ui/app.ts:286, ui/panels/artists.ts:103, ui/pixel/cine18.ts:261, ui/sys/pacing8.ts:67 |
| 🎸 | U+1F3B8 | `guitar` | guitarra / guitar | 4 | ui/panels/desk.ts:21, ui/r31/scene31core.ts:524, ui/sys/live/museum.ts:17, ui/sys/live/museum.ts:18 |
| 💼 | U+1F4BC | `briefcase` | negócios / business | 4 | ui/panels/desk.ts:22, ui/r31/scene31core.ts:171, ui/r31/scene31w.ts:392, ui/scen22.ts:133 |
| 🗑 | U+1F5D1 | `trash` | apagar / delete | 4 | ui/ps/home27.ts:176, ui/ps/home27.ts:209, ui/saves17.ts:253, ui/saves17.ts:271 |
| ⏳ | U+23F3 | `hourglass` | aguardando / waiting | 3 | sim/r31/tags.ts:19, sim/util.ts:66, ui/dossierView.ts:96 |
| 😐 | U+1F610 | `face-neutral` | neutro / neutral | 3 | sim/r31/w31.ts:158, ui/sys/home18.ts:82, ui/sys/prof19.ts:53 |
| 🃏 | U+1F0CF | `card` | trunfo / trump card | 3 | ui/act27/negotiate27.ts:41, ui/act27/negotiate27.ts:44, ui/r31/scene31core.ts:240 |
| 🚪 | U+1F6AA | `door` | porta / door | 3 | ui/act27/negotiate27.ts:42, ui/r31/scene31core.ts:242, ui/r31/scene31core.ts:438 |
| 🥁 | U+1F941 | `drums` | bateria / drums | 3 | ui/act27/negotiate27.ts:43, ui/r31/scene31core.ts:159, ui/sys/live/museum.ts:19 |
| 🤫 | U+1F92B | `shush` | segredo / secret | 3 | ui/act27/negotiate27.ts:51, ui/r31/scene31core.ts:238, ui/r31/scene31w.ts:363 |
| 💬 | U+1F4AC | `speech` | conversa / talk | 3 | ui/act27/night27.ts:58, ui/quick18.ts:60, ui/sys/live/festival.ts:242 |
| 👥 | U+1F465 | `people` | pessoas / people | 3 | ui/act27/road27.ts:90, ui/panels/desk.ts:21, ui/quick18.ts:61 |
| ⚙ | U+2699 | `gear` | ajustes / settings | 3 | ui/app.ts:359, ui/ps/home27.ts:131, ui/sys/ux19.ts:134 |
| 📌 | U+1F4CC | `pin` | fixado / pinned | 3 | ui/blocks19.ts:58, ui/r31/scene31w.ts:135, ui/sys/people/negotiation.ts:44 |
| 🔎 | U+1F50E | `magnifier` | buscar / search | 3 | ui/compare.ts:26, ui/panels/desk.ts:22, ui/quick18.ts:59 |
| ⛔ | U+26D4 | `no-entry` | proibido / not allowed | 3 | ui/newgame13.ts:87, ui/sys/biz17.ts:79, ui/ux20.ts:73 |
| ☑ | U+2611 | `check` | feito / done | 3 | ui/panels/misc.ts:502, ui/sys/industry.ts:166, ui/sys/industry.ts:210 |
| ☠ | U+2620 | `skull` | perigo / danger | 3 | ui/ps/home27.ts:120, ui/ps/home27.ts:197, ui/saves17.ts:242 |
| ✈ | U+2708 | `plane` | viagem / trip | 3 | ui/r31/desk31model.ts:188, ui/r31/salas31model.ts:358, ui/r31/salas31model.ts:385 |
| 🎯 | U+1F3AF | `target` | meta / goal | 3 | ui/r31/quick31.ts:147, ui/r31/scene31w.ts:143, ui/sys/ux19.ts:329 |
| 🙂 | U+1F642 | `face-smile` | atento / attentive | 3 | ui/r31/scene31core.ts:144, ui/sys/home18.ts:82, ui/sys/prof19.ts:53 |
| 🙅 | U+1F645 | `face-no` | braços cruzados / arms crossed | 3 | ui/r31/scene31core.ts:145, ui/r31/scene31core.ts:286, ui/r31/scene31w.ts:306 |
| ⚔ | U+2694 | `swords` | rivalidade / rivalry | 3 | ui/r31/under31ui.ts:28, ui/sys/live19.ts:107, ui/sys/people/views.ts:119 |
| 💿 | U+1F4BF | `cd` | disco / record | 2 | sim/calendar19.ts:43, ui/sys/home18.ts:75 |
| 🏭 | U+1F3ED | `factory` | fábrica / factory | 2 | sim/calendar19.ts:43, ui/panels/desk.ts:22 |
| 🚐 | U+1F690 | `tour-bus` | turnê / tour | 2 | sim/calendar19.ts:43, ui/act27/road27.ts:88 |
| 😢 | U+1F622 | `face-sad` | triste / sad | 2 | sim/r31/rescind31.ts:26, ui/r31/scene31core.ts:397 |
| 😰 | U+1F630 | `face-stress` | tenso / tense | 2 | sim/r31/w31.ts:157, ui/r31/scene31core.ts:160 |
| 🎖 | U+1F396 | `medal` | medalha / medal | 2 | sim/sys/kpop18.ts:162 |
| 🌏 | U+1F30F | `globe` | mundo / world | 2 | sim/sys/regions18.ts:354 |
| 📋 | U+1F4CB | `clipboard` | lista / list | 2 | ui/act27/flow27p2.ts:69, ui/r31/mech31.ts:130 |
| 😊 | U+1F60A | `face-happy` | feliz / happy | 2 | ui/act27/negotiate27.ts:45, ui/r31/scene31core.ts:143 |
| ⏩ | U+23E9 | `skip` | pular / skip | 2 | ui/app.ts:340, ui/app.ts:355 |
| 🕘 | U+1F558 | `clock` | prazo / deadline | 2 | ui/app.ts:666, ui/nav15.ts:109 |
| ⚑ | U+2691 | `flag` | marco / milestone | 2 | ui/app.ts:693, ui/r31/proj31.ts:151 |
| 🏁 | U+1F3C1 | `flag` | marco / milestone | 2 | ui/newgame17.ts:381, ui/sys/live/goals.ts:198 |
| 🎛 | U+1F39B | `mixer` | mesa de som / mixing desk | 2 | ui/newgame17.ts:403, ui/sys/live/museum.ts:23 |
| 📜 | U+1F4DC | `contract` | contrato / contract | 2 | ui/panels/desk.ts:21, ui/sys/lendas9.ts:218 |
| 🏢 | U+1F3E2 | `building` | empresa / company | 2 | ui/panels/desk.ts:21, ui/sys/intrigue.ts:29 |
| 🌍 | U+1F30D | `globe` | mundo / world | 2 | ui/panels/desk.ts:22, ui/sys/charts7.ts:25 |
| ✝ | U+271D | `candle` | luto / mourning | 2 | ui/panels/people.ts:64, ui/sys/cine18.ts:175 |
| 🔕 | U+1F515 | `bell-off` | silenciado / muted | 2 | ui/ps/alerts29.ts:44, ui/ps/alerts29.ts:60 |
| ☎ | U+260E | `phone` | telefone / phone | 2 | ui/r31/desk31.ts:230, ui/r31/salas31model.ts:683 |
| ⛓ | U+26D3 | `chains` | preso / bound | 2 | ui/r31/inside31model.ts:211, ui/r31/under31ui.ts:152 |
| ☾ | U+263E | `moon` | noite / night | 2 | ui/r31/salas31model.ts:358, ui/sys/theme14.ts:25 |
| ♫ | U+266B | `note` | música / music | 2 | ui/r31/salas31model.ts:594, ui/r31/under31ui.ts:29 |
| 📞 | U+1F4DE | `phone` | telefone / phone | 2 | ui/r31/scene31core.ts:438, ui/r31/scene31w.ts:365 |
| 😒 | U+1F612 | `face-wry` | desconfiado / skeptical | 2 | ui/r31/scene31core.ts:524, ui/r31/scene31w.ts:418 |
| 📁 | U+1F4C1 | `folder` | pasta / folder | 2 | ui/r31/scene31w.ts:154, ui/r31/scene31w.ts:203 |
| ☕ | U+2615 | `coffee` | café / coffee | 2 | ui/r31/scene31w.ts:156, ui/sys/industry.ts:71 |
| 🎧 | U+1F3A7 | `headphones` | fones / headphones | 2 | ui/r31/scene31w.ts:358, ui/sys/industry.ts:71 |
| 📣 | U+1F4E3 | `megaphone` | anúncio / announcement | 2 | ui/sys/dyn18.ts:29, ui/sys/dyn18.ts:38 |
| ✋ | U+270B | `hand` | mão / hand | 2 | ui/sys/dyn18.ts:29, ui/sys/dyn18.ts:38 |
| 🎺 | U+1F3BA | `trumpet` | trompete / trumpet | 2 | ui/sys/era1889.ts:63, ui/sys/live/museum.ts:21 |
| 🎻 | U+1F3BB | `violin` | violino / violin | 2 | ui/sys/era1889.ts:63, ui/sys/live/museum.ts:25 |
| 💔 | U+1F494 | `broken-heart` | separação / breakup | 2 | ui/sys/home18.ts:75, ui/sys/retro8.ts:72 |
| 😄 | U+1F604 | `face-happy` | feliz / happy | 2 | ui/sys/home18.ts:82, ui/sys/prof19.ts:53 |
| 😟 | U+1F61F | `face-sad` | triste / sad | 2 | ui/sys/home18.ts:82, ui/sys/prof19.ts:53 |
| ☀ | U+2600 | `sun` | sol / sun | 2 | ui/sys/live/festival.ts:91, ui/sys/theme14.ts:25 |
| 🧾 | U+1F9FE | `receipt` | recibo / receipt | 2 | ui/sys/ux19.ts:244, ui/sys/ux19.ts:365 |
| 🎪 | U+1F3AA | `star` | festival / festival | 1 | sim/calendar19.ts:43 |
| 🏗 | U+1F3D7 | `crane` | obra / construction | 1 | sim/calendar19.ts:43 |
| 🤑 | U+1F911 | `face-money` | interesseiro / money-minded | 1 | sim/r31/w31.ts:155 |
| 👀 | U+1F440 | `eye` | de olho / watching | 1 | sim/r31/w31.ts:156 |
| 🗣 | U+1F5E3 | `speech` | conversa / talk | 1 | ui/act27/heist27.ts:178 |
| ✖ | U+2716 | `cross` | não / no | 1 | ui/act27/heist27.ts:178 |
| 😆 | U+1F606 | `face-happy` | feliz / happy | 1 | ui/act27/negotiate27.ts:46 |
| 🎟 | U+1F39F | `ticket` | ingresso / ticket | 1 | ui/act27/road27.ts:89 |
| 💰 | U+1F4B0 | `money` | dinheiro / money | 1 | ui/act27/road27.ts:91 |
| 🛠 | U+1F6E0 | `gear` | ajustes / settings | 1 | ui/editor31.ts:214 |
| ⌂ | U+2302 | `house` | casa / home | 1 | ui/map.ts:250 |
| ℹ | U+2139 | `info` | informação / info | 1 | ui/newgame17.ts:281 |
| 🔍 | U+1F50D | `magnifier` | buscar / search | 1 | ui/panels/artists.ts:138 |
| 🎼 | U+1F3BC | `note` | música / music | 1 | ui/panels/desk.ts:21 |
| 📡 | U+1F4E1 | `stream` | streaming / streaming | 1 | ui/panels/desk.ts:21 |
| 🎨 | U+1F3A8 | `palette` | arte / art | 1 | ui/panels/desk.ts:21 |
| 🩺 | U+1FA7A | `health` | saúde / health | 1 | ui/panels/desk.ts:22 |
| 🧠 | U+1F9E0 | `brain` | mente / mind | 1 | ui/panels/desk.ts:22 |
| ☺ | U+263A | `face-happy` | feliz / happy | 1 | ui/r31/salas31model.ts:676 |
| ⛺ | U+26FA | `tent` | acampamento / camp | 1 | ui/r31/salas31model.ts:704 |
| 😠 | U+1F620 | `face-angry` | bravo / angry | 1 | ui/r31/scene31core.ts:146 |
| 🤔 | U+1F914 | `face-think` | pensativo / thinking | 1 | ui/r31/scene31core.ts:147 |
| 🧑 | U+1F9D1 | `person` | pessoa / person | 1 | ui/r31/scene31core.ts:171 |
| ⌚ | U+231A | `clock` | prazo / deadline | 1 | ui/r31/scene31core.ts:341 |
| 📦 | U+1F4E6 | `box` | pacote / package | 1 | ui/r31/scene31core.ts:397 |
| 💪 | U+1F4AA | `flex` | força / strength | 1 | ui/r31/scene31core.ts:438 |
| 👋 | U+1F44B | `hand` | mão / hand | 1 | ui/r31/scene31core.ts:524 |
| 👍 | U+1F44D | `thumbs-up` | aprovado / approved | 1 | ui/r31/scene31w.ts:98 |
| 🤨 | U+1F928 | `face-wry` | desconfiado / skeptical | 1 | ui/r31/scene31w.ts:98 |
| 🗒 | U+1F5D2 | `clipboard` | lista / list | 1 | ui/r31/scene31w.ts:98 |
| 🧽 | U+1F9FD | `sponge` | limpeza / clean-up | 1 | ui/r31/scene31w.ts:133 |
| 🗓 | U+1F5D3 | `calendar` | agenda / calendar | 1 | ui/r31/scene31w.ts:139 |
| 🧐 | U+1F9D0 | `face-think` | pensativo / thinking | 1 | ui/r31/scene31w.ts:157 |
| 🖊 | U+1F58A | `pen` | escrever / write | 1 | ui/r31/scene31w.ts:158 |
| 🦈 | U+1F988 | `shark` | tubarão / shark | 1 | ui/r31/scene31w.ts:209 |
| 🔑 | U+1F511 | `key` | chave / key | 1 | ui/r31/scene31w.ts:300 |
| 🍷 | U+1F377 | `drink` | bebida / drink | 1 | ui/r31/scene31w.ts:357 |
| 🫲 | U+1FAF2 | `hand` | mão / hand | 1 | ui/r31/scene31w.ts:365 |
| 😏 | U+1F60F | `face-wry` | desconfiado / skeptical | 1 | ui/r31/scene31w.ts:417 |
| 🎁 | U+1F381 | `gift` | presente / gift | 1 | ui/r31/shop31.ts:44 |
| 📍 | U+1F4CD | `pin` | fixado / pinned | 1 | ui/scen22.ts:128 |
| 💡 | U+1F4A1 | `bulb` | ideia / idea | 1 | ui/scen22.ts:144 |
| 🗺 | U+1F5FA | `map` | mapa / map | 1 | ui/sys/charts7.ts:26 |
| 🔓 | U+1F513 | `unlock` | liberado / unlocked | 1 | ui/sys/decide18.ts:31 |
| 🏠 | U+1F3E0 | `house` | casa / home | 1 | ui/sys/fossati31.ts:43 |
| ⛲ | U+26F2 | `fountain` | praça / square | 1 | ui/sys/fossati31.ts:44 |
| 🕯 | U+1F56F | `candle` | luto / mourning | 1 | ui/sys/home18.ts:75 |
| 😫 | U+1F62B | `face-stress` | tenso / tense | 1 | ui/sys/home18.ts:82 |
| 💸 | U+1F4B8 | `money-out` | gasto / spending | 1 | ui/sys/home18.ts:142 |
| 📅 | U+1F4C5 | `calendar` | agenda / calendar | 1 | ui/sys/home18.ts:190 |
| 🎶 | U+1F3B6 | `note` | música / music | 1 | ui/sys/lendas9.ts:352 |
| 📂 | U+1F4C2 | `folder` | pasta / folder | 1 | ui/sys/lendas9.ts:461 |
| ⛈ | U+26C8 | `rain` | chuva / rain | 1 | ui/sys/live/festival.ts:91 |
| 🌧 | U+1F327 | `rain` | chuva / rain | 1 | ui/sys/live/festival.ts:91 |
| 🎹 | U+1F3B9 | `keyboard` | teclado / keyboard | 1 | ui/sys/live/museum.ts:20 |
| 🎚 | U+1F39A | `mixer` | mesa de som / mixing desk | 1 | ui/sys/live/museum.ts:22 |
| 🎙 | U+1F399 | `mic` | microfone / microphone | 1 | ui/sys/live/museum.ts:24 |
| 💠 | U+1F4A0 | `diamond` | diamante / diamond | 1 | ui/sys/live/museum.ts:26 |
| 🏛 | U+1F3DB | `columns` | instituição / institution | 1 | ui/sys/live/museum.ts:85 |
| 🍺 | U+1F37A | `drink` | bebida / drink | 1 | ui/sys/live/venue.ts:54 |
| 🔊 | U+1F50A | `speaker` | som / sound | 1 | ui/sys/live/venue.ts:55 |
| 🌐 | U+1F310 | `globe` | mundo / world | 1 | ui/sys/manager12.ts:115 |
| ❤ | U+2764 | `heart` | afeto / affection | 1 | ui/sys/people/views.ts:120 |
| ⌛ | U+231B | `hourglass` | aguardando / waiting | 1 | ui/ux20.ts:75 |

## Por grupo

### Cenas (trocadas primeiro) — 242 em 38 arquivos

`ui/r31/scene31core.ts` 30 · `ui/r31/salas31model.ts` 26 · `ui/r31/scene31w.ts` 26 · `ui/r31/quick31.ts` 19 · `ui/sys/home18.ts` 19 · `ui/ps/home27.ts` 11 · `ui/act27/heist27.ts` 10 · `ui/act27/negotiate27.ts` 9 · `ui/act27/compose27.ts` 7 · `ui/r31/inside31model.ts` 7 · `ui/act27/flow27.ts` 5 · `ui/act27/road27.ts` 5 · `ui/act27/show27.ts` 5 · `ui/r31/lock31.ts` 5 · `ui/r31/proj31.ts` 5 · `ui/pixel/cine18.ts` 4 · `ui/r31/desk31model.ts` 4 · `ui/r31/inside31.ts` 4 · `ui/r31/mech31.ts` 4 · `ui/r31/under31ui.ts` 4 · `ui/r31/proj31model.ts` 3 · `ui/r31/salaart31.ts` 3 · `ui/r31/tour31model.ts` 3 · `ui/act27/favors27.ts` 2 · `ui/act27/flow27model.ts` 2 · `ui/act27/flow27p2.ts` 2 · `ui/act27/night27.ts` 2 · `ui/r31/car31ui.ts` 2 · `ui/r31/fos31model.ts` 2 · `ui/r31/shop31.ts` 2 · `ui/r31/socio31ui.ts` 2 · `ui/sys/fossati31.ts` 2 · `ui/pixel/editor.ts` 1 · `ui/r31/cast31.ts` 1 · `ui/r31/desk31.ts` 1 · `ui/r31/fos31.ts` 1 · `ui/r31/salas31.ts` 1 · `ui/r31/scene31model.ts` 1

### Textos do motor que aparecem na tela — 62 em 19 arquivos

`sim/calendar19.ts` 10 · `sim/start17.ts` 10 · `sim/sys/discover18.ts` 6 · `sim/r31/rescind31.ts` 4 · `sim/r31/w31.ts` 4 · `sim/sys/scout23.ts` 4 · `data/rules.ts` 2 · `sim/r31/relic31.ts` 2 · `sim/r31/tags.ts` 2 · `sim/reviews.ts` 2 · `sim/sys/careers19.ts` 2 · `sim/sys/circuits18.ts` 2 · `sim/sys/idols18.ts` 2 · `sim/sys/kpop18.ts` 2 · `sim/sys/people/feed.ts` 2 · `sim/sys/regions18.ts` 2 · `sim/sys/scout11.ts` 2 · `sim/sys/why18.ts` 1 · `sim/util.ts` 1

### Resto da interface — 465 em 137 arquivos

`ui/panels/desk.ts` 15 · `ui/sys/talentos23.ts` 15 · `ui/app.ts` 14 · `ui/help18data.ts` 14 · `ui/saves17.ts` 14 · `ui/panels/artists.ts` 12 · `ui/sys/live/museum.ts` 12 · `ui/savechip20.ts` 11 · `ui/scen22.ts` 11 · `ui/sys/ux19.ts` 11 · `ui/sys/goods8.ts` 10 · `ui/sys/lendas9.ts` 10 · `ui/ach27.ts` 9 · `ui/sys/live/festival.ts` 9 · `ui/sys/live/goals.ts` 9 · `ui/sys/long18.ts` 9 · `ui/ab18stars.ts` 8 · `ui/r31/art31model.ts` 8 · `ui/newgame17.ts` 7 · `ui/sys/inbox27.ts` 7 · `ui/sys/artist18.ts` 6 · `ui/sys/industry.ts` 6 · `ui/sys/people/views.ts` 6 · `ui/quick18.ts` 5 · `ui/sys/actmenu20.ts` 5 · `ui/sys/live19.ts` 5 · `ui/editor31.ts` 4 · `ui/gloss18.ts` 4 · `ui/help18tabs.ts` 4 · `ui/newgame13.ts` 4 · `ui/ngdata13.ts` 4 · `ui/panels/misc.ts` 4 · `ui/ps/char29.ts` 4 · `ui/sys/biz17.ts` 4 · `ui/sys/campus18.ts` 4 · `ui/sys/dyn18.ts` 4 · `ui/sys/fest12.ts` 4 · `ui/sys/hq12.ts` 4 · `ui/sys/prof19.ts` 4 · `ui/sys/project8.ts` 4 · `ui/sys/promises28.ts` 4 · `ui/newgame.ts` 3 · `ui/panels/creation.ts` 3 · `ui/panels/discovery.ts` 3 · `ui/rightsView.ts` 3 · `ui/sys/agenda17.ts` 3 · `ui/sys/crime17.ts` 3 · `ui/sys/decide18.ts` 3 · `ui/sys/life.ts` 3 · `ui/sys/manager12.ts` 3 · `ui/sys/mapx8.ts` 3 · `ui/sys/project12.ts` 3 · `ui/sys/talent18.ts` 3 · `ui/tutorial18.ts` 3 · `ui/ux20.ts` 3 · `ui/charCreate.ts` 2 · `ui/explain18.ts` 2 · `ui/nav15.ts` 2 · `ui/panels/business.ts` 2 · `ui/panels/people.ts` 2 · `ui/panels/repertoire.ts` 2 · `ui/panels/studio.ts` 2 · `ui/ps/alerts29.ts` 2 · `ui/ps/cut27.ts` 2 · `ui/ps/screens29.ts` 2 · `ui/sys/capacity14.ts` 2 · `ui/sys/careers12.ts` 2 · `ui/sys/charts7.ts` 2 · `ui/sys/cine18.ts` 2 · `ui/sys/directory.ts` 2 · `ui/sys/eggs27.ts` 2 · `ui/sys/era1889.ts` 2 · `ui/sys/fame16.ts` 2 · `ui/sys/hubs8.ts` 2 · `ui/sys/intrigue.ts` 2 · `ui/sys/live/venue.ts` 2 · `ui/sys/mapinfo17.ts` 2 · `ui/sys/pacing8.ts` 2 · `ui/sys/people/negotiation.ts` 2 · `ui/sys/persona13.ts` 2 · `ui/sys/project13.ts` 2 · `ui/sys/regions18.ts` 2 · `ui/sys/retro8.ts` 2 · `ui/sys/route8.ts` 2 · `ui/sys/story12.ts` 2 · `ui/sys/theme14.ts` 2 · `ui/sys/ui20.ts` 2 · `ui/sys/venue12.ts` 2 · `ui/act27/campaign27.ts` 1 · `ui/actions20.ts` 1 · `ui/blocks19.ts` 1 · `ui/common.ts` 1 · `ui/compare.ts` 1 · `ui/dossierView.ts` 1 · `ui/map.ts` 1 · `ui/newgameLabels.ts` 1 · `ui/ng29labels.ts` 1 · `ui/pages.ts` 1 · `ui/panels/central.ts` 1 · `ui/panels/market.ts` 1 · `ui/panels/tours.ts` 1 · `ui/pick22.ts` 1 · `ui/ps/ctx27.ts` 1 · `ui/ps/grid29.ts` 1 · `ui/ps/menu31ui.ts` 1 · `ui/ps/nr29.ts` 1 · `ui/r31/art31.ts` 1 · `ui/r31/gente31ui.ts` 1 · `ui/r31/learn31ui.ts` 1 · `ui/registry.ts` 1 · `ui/skin31.ts` 1 · `ui/sys/calendar19.ts` 1 · `ui/sys/ctx19.ts` 1 · `ui/sys/deleg31.ts` 1 · `ui/sys/fame15.ts` 1 · `ui/sys/featp29.ts` 1 · `ui/sys/hq6.ts` 1 · `ui/sys/hq8.ts` 1 · `ui/sys/instruments.ts` 1 · `ui/sys/leisure14.ts` 1 · `ui/sys/life17.ts` 1 · `ui/sys/lifeevents10.ts` 1 · `ui/sys/market19a.ts` 1 · `ui/sys/media17.ts` 1 · `ui/sys/mundo27.ts` 1 · `ui/sys/offer20.ts` 1 · `ui/sys/personact18.ts` 1 · `ui/sys/place27ui.ts` 1 · `ui/sys/regions19.ts` 1 · `ui/sys/rockhall9.ts` 1 · `ui/sys/session19.ts` 1 · `ui/sys/tour12.ts` 1 · `ui/sys/tribute19.ts` 1 · `ui/sys/ventures12.ts` 1 · `ui/sys/ventures9.ts` 1 · `ui/sys/world4/industry.ts` 1 · `ui/tutorial.ts` 1

