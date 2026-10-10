// Rodada 18 (media18) — abas em Mídia: Público e streaming (fontes de descoberta, quem volta, estratégia pico ×
// base, pró-rata, playlists, fraude), Campanhas (canais com público, conversão, ingressos, atraso, saturação,
// aprendizado e pós-morte previsto × realizado), Rádio (formatos, consultores, diretores, adição/rotação,
// promotor independente) e Clipes, virais e pistas (clipe com diretor/coreografia, DJs, remix, parada de clubes).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { CHANNELS } from '../../data/rules';
import { availableChannels } from '../../sim/market';
import { CH18, mk18, satOf18, SRC18, type Src18 } from '../../sim/sys/mkt18';
import { CONS18, FMT18, HOW18, addOdds18, consNow18, ensureStations18, fmtsNow18, lunchPd18, pitchRadio18, radio18, radioWeight18, spins18, type Fmt18, type How18 } from '../../sim/sys/radio18';
import { FARM18, STRAT18, buyStreams18, dmOpen18, farmRisk18, funnel18, pitchOdds18, pitchPlaylist18, setDm18, setStrat18, st18, type Strat18 } from '../../sim/sys/stream18';
import { DSTYLE18, VTIER18, choreoFee18, commissionRemix18, djFee18, djFit18, djStyle18, dirFee18, ensureDirs18, ensureDjs18, makeVideo18, media18, remixContest18, remixOpen18, togglePool18, videoOpen18 } from '../../sim/sys/media18';
import type { GameState, Release } from '../../sim/types';
import { fmtL, hasTech, money, playerActs } from '../../sim/util';
import { $, N, actLink, pill, releaseLink, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { why18 } from '../explain18';
import { registerTab } from '../registry';
import { btn, note } from './world4/util';

const F = { rel: '', fmt: '' as Fmt18 | '', how: 'plug' as How18, edit: false, tier: 1, dir: '', choreo: false, censor: true };
const say = (x: L | null | undefined, ok: L = l('Feito.', 'Done.')) => { toast(t(x ?? ok), 'info'); rerender(); };
const pc = (x: number) => `${Math.round(x * 100)}%`;
const recentMine = (s: GameState, weeks: number): Release[] => playerActs(s).flatMap((id) => (s.acts[id]?.releases ?? []).map((r) => s.releases[r])).filter((r): r is Release => !!r && r.owner === 'player' && s.week - r.week <= weeks).sort((a, b) => b.week - a.week);
const table = (head: string[], rows: (Node | string)[][]) => h('div', { class: 'w4-table-wrap' }, h('table', { class: 'w4-table' }, h('thead', null, h('tr', null, head.map((x) => h('th', null, x)))), h('tbody', null, rows.map((r) => h('tr', null, r.map((c) => h('td', null, c)))))));

// ================================================================ público e streaming

function srcBars(src: Partial<Record<Src18, number>>): HTMLElement {
  const ks = (Object.keys(src) as Src18[]).filter((k) => (src[k] ?? 0) > 0.01).sort((a, b) => (src[b] ?? 0) - (src[a] ?? 0));
  return h('div', { class: 'row small', style: 'gap:.4rem;flex-wrap:wrap' }, ks.map((k) => pill(`${t(SRC18[k])} ${pc(src[k] ?? 0)}`, k === 'pl' || k === 'vid' ? 'warn' : k === 'wom' || k === 'srch' ? 'good' : '')));
}

function streamTab(s: GameState): HTMLElement {
  const acts = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  const streaming = hasTech(s, 'streaming');
  return h('div', null,
    section(t(l('Por que ouvem seus artistas', 'Why people listen to your acts')),
      note(l('Cada fonte de descoberta converte diferente: quem chega por playlist ou vídeo ouve uma vez; quem procura o nome ou chega por indicação volta — e é quem compra ingresso. Milhões de plays com poucos que voltam não sustentam turnê.', 'Each discovery source converts differently: playlist or video listeners play once; people who search the name or come by word of mouth return — and they buy tickets. Millions of plays with few returning listeners won\'t sustain a tour.')),
      acts.length ? table([t(l('Artista', 'Act')), t(l('Ouvintes/mês', 'Listeners/mo')), t(l('Voltam', 'Return')), t(l('Fãs convertidos', 'Converted fans')), t(l('Fontes', 'Sources')), t(l('Estratégia', 'Strategy'))], acts.map((a) => {
        const f = funnel18(s, a);
        const st = st18(s).a[a.id];
        return [actLink(s, a.id), why18(s, 'stream.funnel', { act: a.id }, N(Math.round(f.L))), h('span', { class: f.ret < 0.1 && f.L > 20000 ? 'bad' : '' }, pc(f.ret)), N(Math.round(f.F)), srcBars(f.src),
          select<Strat18>(st?.strat ?? 'bal', (Object.keys(STRAT18) as Strat18[]).map((k) => ({ value: k, label: t(STRAT18[k].name) })), (v) => { setStrat18(s, a.id, v); rerender(); }, { title: t(STRAT18[st?.strat ?? 'bal'].desc), 'aria-label': t(l('Estratégia', 'Strategy')) })];
      })) : note(l('Sem artistas.', 'No acts.')),
      h('ul', { class: 'small' }, (Object.keys(STRAT18) as Strat18[]).map((k) => h('li', null, h('b', null, t(STRAT18[k].name)), ': ', t(STRAT18[k].desc)))),
    ),
    streaming ? section(t(l('Royalties pró-rata', 'Pro-rata royalties')),
      note(l('Não existe tarifa fixa por play. Cada território junta assinaturas e anúncios num bolo; você recebe a sua fatia dos streams. Mercado com pouca receita por usuário paga menos por play; fã que assina paga mais que ouvinte gratuito de vídeo.', 'There is no fixed per-play rate. Each territory pools subscriptions and ads; you get your share of streams. Markets with low revenue per user pay less per play; a subscribing fan pays more than a free video listener.')),
      h('div', { class: 'row', style: 'flex-wrap:wrap;gap:.5rem' }, recentMine(s, 30).slice(0, 6).map((r) => h('span', null, releaseLink(s, r.id), ' ', why18(s, 'stream.payout', { rel: r.id }, '×?')))),
      dmOpen18(s) ? h('div', null, h('h4', null, t(l('Comissão de alcance (algoritmo)', 'Reach commission (algorithm)'))), note(l('Aceitar royalty 30% menor em troca de empurrão do algoritmo (+12% de unidades nos primeiros 6 meses, mais ouvintes por recomendação).', 'Accept a 30% lower royalty in exchange for an algorithmic push (+12% units in the first 6 months, more recommendation listeners).')),
        h('div', { class: 'row', style: 'flex-wrap:wrap;gap:.4rem' }, acts.map((a) => { const on = !!st18(s).a[a.id]?.dm; return btn(`${a.name}: ${t(on ? l('ligada', 'on') : l('desligada', 'off'))}`, () => say(setDm18(s, a.id, !on)), { pressed: on }); }))) : null,
    ) : null,
    streaming ? section(t(l('Playlists e algoritmo', 'Playlists and algorithm')),
      note(l('Editorial: curadores escolhem; o pitch precisa ser feito até 4 semanas depois do lançamento (antes é melhor). Algorítmica: vem sozinha quando muita gente salva a faixa (taxa de retorno alta).', 'Editorial: curators choose; pitch within 4 weeks of release (earlier is better). Algorithmic: comes on its own when many people save the track (high return rate).')),
      ...recentMine(s, 4).map((r) => {
        const p = st18(s).pitch[r.id];
        const o = pitchOdds18(s, r);
        return h('div', { class: 'row' }, releaseLink(s, r.id), ' ',
          p ? pill(t(p.ok ? l('Na playlist editorial', 'On editorial playlist') : l('Curadores passaram', 'Curators passed')), p.ok ? 'good' : '') : btn(t(fmtL(l('Pitch para curadores ({p}%)', 'Pitch curators ({p}%)'), { p: Math.round(o.p * 100) })), () => say(pitchPlaylist18(s, r.id)), { title: o.why.map((w) => t(w)).join(' · ') }));
      }),
      recentMine(s, 4).length ? null : note(l('Nenhum lançamento nas últimas 4 semanas.', 'No releases in the last 4 weeks.')),
    ) : null,
    streaming ? section(t(l('Fazendas de streams (crime)', 'Stream farms (crime)')),
      note(l('Comprar plays falsos sobe a parada, mas não gera fã nem royalty; as plataformas procuram todo mês. Se pegarem: faixa derrubada por 10 semanas, multa, escândalo, curadores evitam o artista por 1 ano.', 'Buying fake plays lifts the chart, but yields neither fans nor royalties; platforms look every month. If caught: track down for 10 weeks, fine, scandal, curators avoid the act for a year.')),
      ...recentMine(s, 8).slice(0, 3).map((r) => h('div', { class: 'row' }, releaseLink(s, r.id), ' ', FARM18.map((d, i) => btn(`${t(d.name)} · ${$(money(s, d.real))} · ${t(l('risco', 'risk'))} ${Math.round(farmRisk18(s, i) * 100)}%/${t(l('mês', 'mo'))}`, () => say(buyStreams18(s, r.id, i)), { cls: 'danger' })))),
    ) : null,
  );
}

// ================================================================ campanhas

function campTab(s: GameState): HTMLElement {
  const st = mk18(s);
  const chs = availableChannels(s);
  const acts = playerActs(s).slice(0, 6);
  const pms = Object.values(st.pm).filter((p) => p.done).sort((a, b) => b.w - a.w).slice(0, 8);
  return h('div', null,
    section(t(l('Canais: público, conversão e limites', 'Channels: audience, conversion and limits')),
      note(l('Repetir o mesmo canal para o mesmo artista rende menos (saturação, que se recupera em alguns meses); a equipe melhora nos canais que usa (até +30%). Atenção sem consumo vira fama; campanhas de cena local quase não vendem disco, mas lotam os shows da cidade.', 'Repeating a channel for the same act yields less (saturation, recovering over a few months); the team gets better at the channels it uses (up to +30%). Attention without sales becomes fame; local-scene campaigns barely sell records but fill hometown shows.')),
      table([t(l('Canal', 'Channel')), t(l('Público', 'Audience')), t(l('Conversão', 'Conversion')), t(l('Ingressos', 'Tickets')), t(l('Atraso', 'Delay')), t(l('Aprendizado', 'Learning')), ...acts.map((id) => s.acts[id]?.name ?? '')], chs.map((c) => {
        const p = CH18[c.id];
        return [t(c.name), h('span', { class: 'small' }, p ? t(p.aud) : ''), p ? `×${p.conv}` : '', p ? String(p.tix) : '', p ? t(fmtL(l('{w} sem.', '{w} wk'), { w: p.lag })) : '',
          `+${Math.round((satOf18(s, '-', c.id).learn - 1) * 100)}%`,
          ...acts.map((id) => { const k = satOf18(s, id, c.id); return why18(s, 'mkt.channel', { ch: c.id, act: id }, h('span', { class: k.sat < 0.8 ? 'bad' : '' }, `×${Math.round(k.k * 100) / 100}`)); })];
      })),
    ),
    section(t(l('Pós-morte dos lançamentos (previsto × realizado)', 'Release post-mortems (forecast × actual)')),
      pms.length ? h('div', null, pms.map((p) => h('div', { class: 'card', style: 'margin:.4rem 0' },
        h('div', { class: 'row' }, releaseLink(s, p.rel), ' ', pill(`${t(l('previsto', 'forecast'))} ${N(p.fc)} · ${t(l('10 semanas', '10 weeks'))} ${N(p.u10 ?? 0)}`, (p.u10 ?? 0) >= p.fc ? 'good' : 'warn')),
        h('ul', { class: 'small' }, (p.notes ?? []).map((n) => h('li', null, t(n)))),
        p.ch.length ? table([t(l('Canal', 'Channel')), t(l('Previsto (unid.)', 'Expected (units)')), t(l('Realizado (unid.)', 'Actual (units)')), t(l('Alcance planejado → real', 'Planned → real reach'))], p.ch.map((c) => [t(CHANNELS.find((x) => x.id === c.id)?.name ?? l(c.id, c.id)), N(c.exp), N(c.act ?? 0), `${pc(c.en)} → ${pc(c.e)}`])) : null,
        p.L ? note(fmtL(l('Ouvintes {L} · voltaram {R} · fãs convertidos {F}', 'Listeners {L} · returned {R} · converted fans {F}'), { L: N(p.L), R: N(p.R ?? 0), F: N(p.fans ?? 0) })) : null,
      ))) : note(l('O pós-morte sai 10 semanas depois de cada lançamento.', 'Post-mortems arrive 10 weeks after each release.')),
    ),
  );
}

// ================================================================ rádio

function radioTab(s: GameState): HTMLElement {
  if (!hasTech(s, 'radio')) return note(l('Ainda não há rádio comercial.', 'No commercial radio yet.'));
  const sts = ensureStations18(s);
  const st = radio18(s);
  const fmts = fmtsNow18(s);
  const rels = recentMine(s, 16);
  if (!rels.some((r) => r.id === F.rel)) F.rel = rels[0]?.id ?? '';
  if (!F.fmt || !fmts.includes(F.fmt)) F.fmt = fmts[0] ?? '';
  const rel = s.releases[F.rel];
  return h('div', null,
    section(t(l('Reunião de programação', 'Programming meeting')),
      note(fmtL(l('Peso da rádio nesta época: {w}. Cada estação começa em rotação leve e sobe se a faixa vender ou entrar na parada; estações de um mesmo consultor decidem juntas.', 'Radio weight in this era: {w}. Each station starts in light rotation and climbs if the track sells or charts; stations under one consultant decide together.'), { w: pc(radioWeight18(s)) })),
      rels.length ? h('div', { class: 'row', style: 'flex-wrap:wrap;gap:.4rem' },
        select(F.rel, rels.map((r) => ({ value: r.id, label: `${r.title} (${s.acts[r.actId]?.name ?? ''})` })), (v) => { F.rel = v; rerender(); }, { 'aria-label': t(l('Faixa', 'Track')) }),
        select<Fmt18>(F.fmt as Fmt18, fmts.map((f) => ({ value: f, label: t(FMT18[f].name) })), (v) => { F.fmt = v; rerender(); }, { 'aria-label': t(l('Formato', 'Format')) }),
        select<How18>(F.how, (Object.keys(HOW18) as How18[]).map((k) => ({ value: k, label: `${t(HOW18[k].name)} · ${$(money(s, HOW18[k].real))}` })), (v) => { F.how = v; rerender(); }, { 'aria-label': t(l('Como', 'How')) }),
        F.fmt && FMT18[F.fmt as Fmt18].edit ? h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: F.edit, onchange: () => { F.edit = !F.edit; rerender(); } }), ' ', t(l('Versão editada para rádio', 'Radio edit'))) : null,
        btn(t(l('Apresentar', 'Pitch')), () => say(pitchRadio18(s, F.rel, F.fmt as Fmt18, F.how, F.edit)), { cls: F.how === 'indie' ? 'danger' : 'primary', disabled: !!st.tried[`${F.rel}|${F.fmt}`] }),
      ) : note(l('Nenhum lançamento seu das últimas 16 semanas.', 'No releases of yours from the last 16 weeks.')),
      note(HOW18[F.how].desc),
      F.fmt ? note(FMT18[F.fmt as Fmt18].desc) : null,
    ),
    section(t(l('Estações e diretores de programação', 'Stations and program directors')),
      table([t(l('Estação', 'Station')), t(l('Formato', 'Format')), t(l('Diretor', 'PD')), t(l('Relação', 'Relationship')), t(l('Consultor', 'Consultant')), t(l('Chance agora', 'Chance now')), ''], sts.map((x) => {
        const c = x.cons ? CONS18.find((k) => k.id === x.cons) : undefined;
        return [x.call, t(FMT18[x.fmt].name), `${x.pd}${x.adv > 0.6 ? ` (${t(l('aventureiro', 'adventurous'))})` : ''}`, String(x.rel), c ? h('span', { title: t(c.desc) }, c.name) : '—',
          rel && x.fmt === F.fmt ? why18(s, 'radio.add', { rel: rel.id, st: x.id, how: F.how, edit: F.edit ? 1 : 0 }, pc(addOdds18(s, rel, x, F.how, F.edit).p)) : '—',
          btn(t(l('Jantar', 'Dinner')), () => say(lunchPd18(s, x.id)), { disabled: (x.lunch ?? -99) > s.week - 8 })];
      })),
      h('ul', { class: 'small' }, fmts.map((f) => { const c = consNow18(s, f); return c ? h('li', null, h('b', null, c.name), ` (${t(FMT18[f].name)}): `, t(c.desc)) : null; })),
    ),
    section(t(l('Suas faixas no ar', 'Your tracks on air')),
      Object.keys(st.rot).length ? table([t(l('Faixa', 'Track')), t(l('Estações', 'Stations')), t(l('Força', 'Strength'))], Object.entries(st.rot).map(([rid, rots]) => [releaseLink(s, rid), rots.map((r) => `${sts.find((x) => x.id === r.st)?.call ?? '?'} (${['', t(l('leve', 'light')), t(l('média', 'medium')), t(l('pesada', 'heavy'))][r.lvl]})`).join(', '), `+${Math.round(Math.min(0.6, 0.05 * spins18(s, rid)) * radioWeight18(s) * 100)}%`])) : note(l('Nada tocando agora.', 'Nothing on air now.')),
      st.paid.length ? h('div', null, h('h4', null, t(l('Quem pagou, quem recebeu', 'Who paid, who got paid'))), note(l('Cada pagamento a promotor independente fica registrado; pode vazar enquanto o calor do jabá estiver alto.', 'Every payment to an independent promoter is on record; it can leak while payola heat is high.')),
        h('ul', { class: 'small' }, st.paid.slice(-6).reverse().map((p) => h('li', { class: p.out ? 'bad' : '' }, `${p.who} · ${$(p.amt)} · ${s.releases[p.rel]?.title ?? '?'}${p.out ? ` · ${t(l('VAZOU', 'LEAKED'))}` : ''}`)))) : null,
    ),
  );
}

// ================================================================ clipes, virais e pistas

function clipsTab(s: GameState): HTMLElement {
  const st = media18(s);
  const rels = recentMine(s, 20);
  if (!rels.some((r) => r.id === F.rel)) F.rel = rels[0]?.id ?? '';
  const dirs = ensureDirs18(s);
  if (!dirs.some((d) => d.id === F.dir)) F.dir = dirs[0]?.id ?? '';
  const dir = dirs.find((d) => d.id === F.dir);
  const djs = ensureDjs18(s);
  const rx = recentMine(s, 26);
  const virals = Object.values(st.viral).filter((v) => v.until > s.week - 8);
  return h('div', null,
    videoOpen18(s) ? section(t(l('Clipe', 'Music video')),
      note(hasTech(s, 'clipnet') ? (s.year <= 2008 ? l('Era da rede de clipes: rotação pesada faz carreiras; imagem conta. Autoral sem versão censurada pode ser banido (perde a rotação, ganha polêmica).', 'Video-network era: heavy rotation makes careers; image matters. An auteur cut without a censored version can be banned (loses rotation, gains controversy).') : l('Clipe vive nas plataformas de vídeo: menos rotação, mais coreografia e desafios.', 'Videos live on video platforms: less rotation, more choreography and challenges.')) : l('Antes das redes de clipes, o filme promocional passa nos programas de TV (efeito menor, custo menor).', 'Before video networks, promo films air on TV shows (smaller effect, smaller cost).')),
      rels.length && dir ? h('div', { class: 'row', style: 'flex-wrap:wrap;gap:.4rem' },
        select(F.rel, rels.map((r) => ({ value: r.id, label: `${r.title} (${s.acts[r.actId]?.name ?? ''})`, disabled: !!st.vids[r.id] })), (v) => { F.rel = v; rerender(); }, { 'aria-label': t(l('Faixa', 'Track')) }),
        select<number>(F.tier, VTIER18.map((v, i) => ({ value: i, label: t(v.name) })), (v) => { F.tier = v; rerender(); }, { 'aria-label': t(l('Orçamento', 'Budget')) }),
        select(F.dir, dirs.map((d) => ({ value: d.id, label: `${d.name} · ${t(DSTYLE18[d.style].name)} · ${t(l('fama', 'fame'))} ${Math.round(d.fame)}` })), (v) => { F.dir = v; rerender(); }, { 'aria-label': t(l('Diretor', 'Director')) }),
        h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: F.choreo, onchange: () => { F.choreo = !F.choreo; rerender(); } }), ' ', t(l('Coreógrafo', 'Choreographer')), ` (${$(choreoFee18(s))})`),
        h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: F.censor, onchange: () => { F.censor = !F.censor; rerender(); } }), ' ', t(l('Versão censurada', 'Censored cut'))),
        btn(`${t(l('Filmar', 'Shoot'))} · ${$(dirFee18(s, dir, F.tier) + (F.choreo ? choreoFee18(s) : 0))}`, () => say(makeVideo18(s, F.rel, { tier: F.tier, dir: F.dir, choreo: F.choreo, censor: F.censor })), { cls: 'primary', disabled: !!st.vids[F.rel] }),
      ) : note(l('Nenhum lançamento recente.', 'No recent releases.')),
      dir ? note(DSTYLE18[dir.style].desc) : null,
      Object.values(st.vids).length ? h('ul', { class: 'small' }, Object.values(st.vids).slice(-6).reverse().map((v) => h('li', null, why18(s, 'media.video', { rel: v.rel }, `${s.releases[v.rel]?.title ?? '?'}: ${v.v}`), v.heavy && v.heavy > s.week ? ` · ${t(l('rotação pesada', 'heavy rotation'))}` : '', v.banned ? ` · ${t(l('banido', 'banned'))}` : ''))) : null,
    ) : null,
    section(t(l('Virais e catálogo que volta', 'Virals and returning catalog')),
      note(l('Faixas antigas podem voltar (vídeo curto, série, filme). A decisão chega na caixa de entrada: impulsionar, remix oficial, derrubar usos ou deixar passar. Viral traz muitos ouvintes de uma vez: poucos viram fãs.', 'Old tracks can come back (short video, series, film). The decision lands in your inbox: boost, official remix, take down uses or let it ride. Virals bring many one-time listeners: few become fans.')),
      virals.length ? h('ul', { class: 'small' }, virals.map((v) => h('li', null, releaseLink(s, v.rel), ` · ×${v.k} · ${v.until > s.week ? t(l('em alta', 'trending')) : t(l('passou', 'over'))}`))) : note(l('Nenhum viral agora.', 'No virals right now.')),
    ),
    remixOpen18(s) ? section(t(l('DJs, remix e pistas', 'DJs, remixes and clubs')),
      note(l('Remix encomendado leva a faixa às pistas por 16 semanas (melhor se o estilo do DJ combina com o gênero). Record pool: DJs recebem seus discos de graça. Concurso de remix: fãs participam e o vencedor pode virar DJ.', 'A commissioned remix takes the track to clubs for 16 weeks (better if the DJ style fits the genre). Record pool: DJs get your records free. Remix contest: fans join and the winner may become a DJ.')),
      h('div', { class: 'row' }, s.year >= 1975 ? btn(st.pool ? t(l('Sair do record pool', 'Leave the record pool')) : `${t(l('Entrar no record pool', 'Join the record pool'))} (${$(money(s, 150))}/${t(l('mês', 'mo'))})`, () => say(togglePool18(s)), { pressed: !!st.pool }) : null),
      table([t(l('DJ', 'DJ')), t(l('Estilo', 'Style')), t(l('Fama', 'Fame')), t(l('Sucessos', 'Hits')), t(l('Cachê', 'Fee')), ...rx.slice(0, 3).map((r) => r.title)], djs.map((d) => [d.name + (d.fan ? ` (${t(l('ex-fã', 'ex-fan'))})` : ''), t(djStyle18(d.style)?.name ?? l(d.style, d.style)), String(Math.round(d.fame)), String(d.hits), $(djFee18(s, d)),
        ...rx.slice(0, 3).map((r) => st.rmx[r.id] ? (st.rmx[r.id].dj === d.id ? pill(t(l('remixou', 'remixed')), 'good') : '—') : btn(`${t(l('Encomendar', 'Commission'))} (${djFit18(s, d, r) >= 1 ? t(l('combina', 'fits')) : t(l('não combina', 'poor fit'))})`, () => say(commissionRemix18(s, r.id, d.id))))])),
      hasTech(s, 'internet') ? h('div', { class: 'row', style: 'flex-wrap:wrap;gap:.4rem' }, rx.slice(0, 3).map((r) => btn(`${t(l('Concurso de remix', 'Remix contest'))}: ${r.title}`, () => say(remixContest18(s, r.id)), { disabled: !!st.n[`cont:${r.id}`] }))) : null,
      h('h4', null, t(l('Parada de clubes', 'Club chart'))),
      st.club.length ? h('ol', { class: 'small' }, st.club.map((c) => h('li', { class: c.mine ? 'good' : '' }, releaseLink(s, c.rel), ` · ${s.acts[s.releases[c.rel]?.actId ?? '']?.name ?? ''}`))) : note(l('A parada sai no fim do mês.', 'The chart comes out at month end.')),
    ) : null,
  );
}

registerTab('mediaHub', { id: 'st18', icon: 'stream', order: 55, label: l('Público e streaming', 'Audience and streaming'), render: streamTab, badge: (s) => playerActs(s).filter((id) => { const a = st18(s).a[id]; return a && a.drop && a.drop > s.week; }).length || undefined });
registerTab('mediaHub', { id: 'mk18', icon: 'chart-up', order: 56, label: l('Campanhas', 'Campaigns'), render: campTab });
registerTab('mediaHub', { id: 'radio18', icon: 'radio', order: 57, label: l('Rádio: formatos', 'Radio: formats'), render: radioTab, visible: (s) => hasTech(s, 'radio') });
registerTab('mediaHub', { id: 'clips18', icon: 'tv', order: 58, label: l('Clipes, virais e pistas', 'Videos, virals and clubs'), render: clipsTab });
