// Rodada 18 (rights18): página Direitos — obras, gravações e versões, splits, autorizações pendentes, disputas,
// sociedades por mercado, extratos, catálogo (avaliação para compra/venda), editora (administração) e precedentes.
import { MARKETS, l, type L } from '../../data/world';
import { NEIGH18, PRECS18 } from '../../data/rights18';
import { t } from '../../i18n/strings';
import { bidCatalog } from '../../sim/business';
import { annualRevenue } from '../../sim/rights';
import { makeCover } from '../../sim/studio';
import {
  BB_YEARS18, SUB_FEE18, answerTerm18, bbExpiring18, bbTotal18, canAdmin18, catVal18, claimBB18, claimRate18, courtOdds18, disputeOf18,
  euTerm18, fixConflict18, frozen18, hasSub18, homeMk18, meta18, modShares18, neighRate18, payClearance18, r18, rate18, rerecord18,
  rerecordable18, resolveDispute18, setSoc18, setSub18, socOf18, socOptions18, subCost18, takeAdm18, termWindow18, thirdWork18,
} from '../../sim/sys/rights18';
import type { GameState, Release, Song } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, pill, releaseLink, rerender, section, toast } from '../common';
import { h } from '../dom';
import { why18, whyIcon } from '../explain18';
import { registerArea } from '../registry';
import { chips, stat, tabs } from '../vis';

const say = (x: L | null | undefined, ok: L = l('Feito.', 'Done.')) => { toast(t(x ?? ok), x ? 'info' : 'good'); rerender(); };
const pc = (v: number) => `${Math.round(v * 100)}%`;
const mkN = (mk: string) => t(MARKETS.find((m) => m.id === mk)?.name ?? l(mk));
const MOD: Record<string, L> = { perf: l('Execução pública', 'Performance'), mech: l('Mecânico', 'Mechanical'), print: l('Partitura', 'Print'), neigh: l('Conexos (gravação)', 'Neighbouring (recording)'), adm: l('Administração de terceiros', 'Third-party admin'), sync: l('Sync', 'Sync') };
const btn = (label: L, fn: () => void, cls = 'btn small') => h('button', { class: cls, onclick: fn }, t(label));
const tbl = (head: L[], rows: HTMLElement[]) => h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, head.map((x) => h('th', null, t(x))))), h('tbody', null, rows));
const empty = (x: L) => h('p', { class: 'muted small' }, t(x));
const mineSongs = (s: GameState): Song[] => playerActs(s).flatMap((id) => s.acts[id]?.songs ?? []).map((id) => s.songs[id]).filter((x): x is Song => !!x?.releaseId);
const myRels = (s: GameState): Release[] => Object.values(s.releases).filter((x) => x.owner === 'player' && !s.acts[x.actId]?.playerBand);
const moY = (mi: number) => `${String((mi % 12) + 1).padStart(2, '0')}/${Math.floor(mi / 12)}`;

// ---------------------------------------------------------------- resumo

function summary(s: GameState): HTMLElement {
  const st = r18(s), m = meta18(s), Y = st.inc[s.year] ?? {}, Y1 = st.inc[s.year - 1] ?? {};
  const esc = Object.values(st.esc).reduce((a, b) => a + b, 0);
  const open = st.disp.filter((d) => d.st !== 'done').length;
  const pend = s.samples.filter((x) => x.status !== 'cleared' && playerActs(s).includes(s.songs[x.songId]?.actId ?? '')).length + st.clr.filter((c) => c.st !== 'ok').length;
  return h('div', null,
    chips(
      why18(s, 'rights18.meta', {}, stat('pen', pc(m.v), l('Metadados', 'Metadata'))),
      stat('vault', $(bbTotal18(s)), l('Caixa preta (não identificado)', 'Black box (unidentified)'), bbExpiring18(s) ? 'bad' : ''),
      stat('lock', $(esc), l('Em caução (disputas)', 'In escrow (disputes)'), esc ? 'bad' : ''),
      stat('warning', String(open + pend), l('Disputas e autorizações', 'Disputes and clearances'), open + pend ? 'warn' : ''),
    ),
    section(t(l('Por que isso importa', 'Why it matters')),
      h('p', { class: 'small' }, t(l('Uma OBRA (composição) rende edição — execução pública, mecânico, partitura — a autores e editora. Uma GRAVAÇÃO (master) rende vendas e conexos ao dono do master e aos intérpretes. Cover, remix, versão e regravação são novas gravações da mesma obra: pagam os mesmos autores. O dinheiro passa por sociedades de cada país, com taxa, atraso e uma "caixa preta" do que não foi identificado.', 'A WORK (composition) earns publishing — performance, mechanical, print — for writers and publisher. A RECORDING (master) earns sales and neighbouring rights for the master owner and performers. Covers, remixes, translations and re-recordings are new recordings of the same work: they pay the same writers. Money flows through each country\'s societies, with a fee, a delay and a "black box" of whatever went unidentified.'))),
    ),
    section(t(l('Políticas', 'Policies')),
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: st.pol.split, onchange: () => { st.pol.split = !st.pol.split; rerender(); } }), ' ', t(l('Assinar split sheet no estúdio (~$40 por faixa): evita disputas de crédito quando a música estoura e vale como prova na Justiça.', 'Sign split sheets in the studio (~$40 per track): prevents credit fights when a song hits and counts as evidence in court.'))),
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: st.pol.reg, onchange: () => { st.pol.reg = !st.pol.reg; rerender(); } }), ' ', t(l('Registrar toda obra nas sociedades (~$120/mês): +15% de metadados, metade dos conflitos de cadastro, correção automática em 6 meses.', 'Register every work with the societies (~$120/month): +15% metadata, half the registration conflicts, automatic fixes within 6 months.'))),
    ),
    section(t(l('Receita de direitos por modalidade', 'Rights revenue by modality')),
      tbl([l('Modalidade', 'Modality'), l(String(s.year - 1)), l(`${s.year} ${t(l('(até agora)', '(so far)'))}`)], Object.keys(MOD).filter((k) => k !== 'sync').map((k) => h('tr', null, h('td', null, t(MOD[k])), h('td', null, $(Math.round(Y1[k] ?? 0))), h('td', null, $(Math.round(Y[k] ?? 0)))))),
      h('p', { class: 'muted small' }, t(l('Divisão da edição nesta época: {p} execução, {m} mecânico, {x} partitura. Sync aparece em Finanças (DRE).', 'Publishing split in this era: {p} performance, {m} mechanical, {x} print. Sync shows in Finance (P&L).'), { p: pc(modShares18(s.year).perf), m: pc(modShares18(s.year).mech), x: pc(modShares18(s.year).print) })),
    ),
    section(t(l('Receita de direitos por território', 'Rights revenue by territory')),
      tbl([l('Mercado', 'Market'), l(String(s.year - 1)), l(String(s.year)), l('Sobra de cada $1', 'Left of each $1')], MARKETS.map((mk) => h('tr', null, h('td', null, mkN(mk.id)), h('td', null, $(Math.round(Y1[`mk:${mk.id}`] ?? 0))), h('td', null, $(Math.round(Y[`mk:${mk.id}`] ?? 0))),
        h('td', null, why18(s, 'rights18.rate', { mk: mk.id, mod: 'perf' }, (() => { const r = rate18(s, mk.id, 'perf'); return pc((1 - r.bb) * (1 - r.fee)); })()))))),
    ),
    st.log.length ? section(t(l('Últimos acontecimentos', 'Latest events')), h('ul', { class: 'small' }, st.log.slice(0, 10).map(([y, mo, x]) => h('li', null, `${String(mo + 1).padStart(2, '0')}/${y} · ${t(x)}`)))) : null,
  );
}

// ---------------------------------------------------------------- obras

function works(s: GameState): HTMLElement {
  const st = r18(s);
  const vers: Record<string, number> = {};
  for (const so of Object.values(s.songs)) { const k = so.coverOf ?? so.remixOf ?? so.translationOf; if (k) vers[k] = (vers[k] ?? 0) + 1; }
  const list = mineSongs(s).filter((x) => !x.coverOf && !x.remixOf && !x.translationOf).sort((a, b) => (s.releases[b.releaseId!]?.totalUnits ?? 0) - (s.releases[a.releaseId!]?.totalUnits ?? 0)).slice(0, 40);
  if (!list.length) return empty(l('Nenhuma obra lançada ainda.', 'No released works yet.'));
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Cada obra: quem escreveu (splits), situação do cadastro e quantas versões existem no mundo (todas pagam os mesmos autores).', 'Each work: who wrote it (splits), registration status and how many versions exist in the world (all pay the same writers).'))),
    tbl([l('Obra', 'Work'), l('Ato', 'Act'), l('Autores (split)', 'Writers (split)'), l('Cadastro', 'Registration'), l('Versões', 'Versions'), l('')], list.map((so) => {
      const sp = so.splits?.length ? so.splits : so.writers.map((w) => ({ personId: w, share: 1 / Math.max(1, so.writers.length) }));
      const fr = frozen18(s, so.id);
      const reg = st.conf[so.id] ? pill(t(l('conflito de cadastro', 'registration conflict')), 'bad') : fr ? pill(t(l('congelada', 'frozen')), 'bad') : st.reg[so.id] === 2 ? pill(t(l('split assinado', 'split signed')), 'good') : pill(t(l('splits em aberto', 'open splits')), 'warn');
      return h('tr', null, h('td', null, so.title), h('td', null, actLink(s, so.actId)),
        h('td', { class: 'small' }, sp.map((x) => `${s.persons[x.personId]?.name ?? '?'} ${pc(x.share)}`).join(', ')),
        h('td', null, reg), h('td', null, String(vers[so.id] ?? 0)),
        h('td', null, st.conf[so.id] ? btn(l('Corrigir (~$250)', 'Fix (~$250)'), () => say(fixConflict18(s, so.id))) : null));
    })),
  );
}

// ---------------------------------------------------------------- gravações e versões

function recordings(s: GameState): HTMLElement {
  const st = r18(s);
  const rels = myRels(s).sort((a, b) => annualRevenue(b) - annualRevenue(a)).slice(0, 30);
  const kindOf = (r: Release): L => {
    const so = s.songs[r.songs[0]];
    if (r.kind === 'live') return l('ao vivo', 'live');
    if (so?.remixOf) return l('remix', 'remix');
    if (so?.coverOf) return s.songs[so.coverOf]?.actId === so.actId ? l('regravação', 're-recording') : l('cover', 'cover');
    if (so?.translationOf) return l('versão', 'translation');
    return l('original', 'original');
  };
  const acts = playerActs(s).filter((id) => rerecordable18(s, id).length);
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Masters do selo. Conexos: a gravação tocada em público paga o dono do master e os intérpretes (Europa {e} anos de proteção; nos EUA só digital, desde 2000).', 'Label masters. Neighbouring rights: recordings played in public pay the master owner and performers (Europe {e} years of protection; US digital only, since 2000).'), { e: euTerm18(s) })),
    rels.length ? tbl([l('Gravação', 'Recording'), l('Ato', 'Act'), l('Tipo', 'Type'), l('Receita/ano', 'Revenue/yr'), l('Conexos', 'Neighbouring'), l('Prazo', 'Term')], rels.map((r) => {
      const eff = termWindow18(s, r);
      const nb = MARKETS.filter((m) => neighRate18(s, m.id, r).rate > 0).map((m) => m.id.toUpperCase()).join(' ');
      return h('tr', null, h('td', null, releaseLink(s, r.id)), h('td', null, actLink(s, r.actId)), h('td', null, t(kindOf(r)), st.rr[r.id] ? pill(t(l('regravado: −40%', 're-recorded: −40%')), 'bad') : null),
        h('td', null, $(annualRevenue(r))), h('td', { class: 'small' }, nb || '—'),
        h('td', { class: 'small' }, eff ? t(l('rescisão possível em {y}', 'terminable in {y}'), { y: eff }) : t(l('perpétuo/contrato', 'perpetual/contract'))));
    })) : empty(l('Sem masters próprios ainda.', 'No masters of your own yet.')),
    section(t(l('Regravar masters que são de outro selo', 'Re-record masters owned by another label')),
      h('p', { class: 'muted small' }, t(l('Se um artista seu tem discos antigos (5+ anos, fim da cláusula de restrição) num selo rival, ele pode regravar: a "versão do artista" puxa os fãs, o master antigo perde ~40% da demanda e a composição segue pagando os autores.', 'If one of your acts has old records (5+ years, past the re-record restriction) at a rival label, they can re-record: the "artist\'s version" pulls fans, the old master loses ~40% of demand and the song keeps paying its writers.'))),
      acts.length ? h('div', { class: 'row wrap' }, acts.map((id) => btn(l(`${s.acts[id].name}: ${t(l('regravar', 're-record'))} (${rerecordable18(s, id).length})`), () => say(rerecord18(s, id, makeCover))))) : empty(l('Nenhum artista seu tem masters antigos em outro selo.', 'None of your acts has old masters at another label.')),
    ),
  );
}

// ---------------------------------------------------------------- autorizações

function clearances(s: GameState): HTMLElement {
  const st = r18(s), mine = new Set(playerActs(s));
  const smp = s.samples.filter((x) => x.status !== 'cleared' && mine.has(s.songs[x.songId]?.actId ?? ''));
  const cov = st.clr.filter((c) => c.kind === 'cover' && c.st !== 'ok');
  const sy = mineSongs(s).filter((so) => thirdWork18(s, so) && !st.syncOk[so.id]).slice(0, 15);
  const ST: Record<string, L> = { pending: l('pendente', 'pending'), denied: l('negado', 'denied'), uncleared: l('sem pagamento', 'unpaid') };
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Enquanto pendente, a obra fica congelada (royalties em caução) e não pode ir para sync, licença ou reedição. Lançar sample sem liberação abre processo.', 'While pending, the work is frozen (royalties in escrow) and cannot go to sync, licensing or reissue. Releasing an uncleared sample invites a lawsuit.'))),
    section(t(l('Samples', 'Samples')), smp.length ? tbl([l('Faixa', 'Track'), l('Fonte', 'Source'), l('Situação', 'Status'), l('Taxa', 'Fee'), l('')], smp.map((q) => h('tr', null,
      h('td', null, s.songs[q.songId]?.title ?? '?'), h('td', null, s.songs[q.sourceSongId]?.title ?? '?'), h('td', null, pill(t(ST[q.status] ?? l(q.status)), 'bad')), h('td', null, $(q.status === 'denied' ? q.fee * 2 : q.fee)),
      h('td', null, btn(q.status === 'denied' ? l('Proposta dobrada (45%)', 'Double offer (45%)') : l('Pagar liberação', 'Pay clearance'), () => say(payClearance18(s, 'sample', q.id))), ' ',
        btn(l('Regravar o trecho (½ taxa, 20% da edição)', 'Replay it (½ fee, 20% of publishing)'), () => say(payClearance18(s, 'replay', q.id))))))) : empty(l('Nenhum sample pendente.', 'No pending samples.'))),
    section(t(l('Covers (autorização da editora)', 'Covers (publisher authorization)')),
      h('p', { class: 'muted small' }, t(homeMk18(s) === 'na' ? l('Nos EUA a licença mecânica é compulsória desde 1909: qualquer um grava cover pagando a tarifa legal.', 'In the US the mechanical license is compulsory since 1909: anyone may cover a song by paying the statutory rate.') : l('Fora dos EUA, gravar a música de outro exige autorização prévia da editora (que pode negar).', 'Outside the US, recording someone else\'s song needs the publisher\'s prior authorization (which may be refused).'))),
      cov.length ? tbl([l('Faixa', 'Track'), l('Situação', 'Status'), l('')], cov.map((c) => h('tr', null, h('td', null, s.songs[c.song]?.title ?? '?'), h('td', null, pill(t(ST[c.st] ?? l(c.st)), c.st === 'denied' ? 'bad' : 'warn')),
        h('td', null, c.st === 'denied' ? btn(l('Proposta melhor (3× taxa, 60%)', 'Better offer (3× fee, 60%)'), () => say(payClearance18(s, 'cover', c.id))) : t(l('resposta em semanas', 'answer in weeks')))))) : empty(l('Nada pendente.', 'Nothing pending.'))),
    section(t(l('Sync de obras de terceiros', 'Sync of third-party works')),
      sy.length ? tbl([l('Faixa', 'Track'), l('Obra de', 'Work by'), l('')], sy.map((so) => h('tr', null, h('td', null, so.title), h('td', null, actLink(s, thirdWork18(s, so)?.actId)),
        h('td', null, btn(l('Pedir liberação (~$800, 70%)', 'Request clearance (~$800, 70%)'), () => say(payClearance18(s, 'sync', so.id))))))) : empty(l('Nenhuma obra de terceiros no seu catálogo de sync.', 'No third-party works in your sync catalog.'))),
  );
}

// ---------------------------------------------------------------- disputas

function disputes(s: GameState): HTMLElement {
  const st = r18(s);
  const d = st.disp.slice().reverse();
  const tm = st.term.filter((x) => x.st !== 'done');
  return h('div', null,
    d.length ? tbl([l('Obra', 'Work'), l('Quem', 'Who'), l('Pedido', 'Claim'), l('Caução', 'Escrow'), l('Situação', 'Status'), l('')], d.map((x) => h('tr', null,
      h('td', null, s.songs[x.song]?.title ?? '?'), h('td', null, x.name), h('td', null, x.kind === 'credit' ? pc(x.share) : t(l('autorização', 'authorization'))),
      h('td', null, $(Math.round(st.esc[x.song] ?? 0))),
      h('td', null, x.st === 'done' ? h('span', { class: 'small' }, t(x.res ?? l('encerrada', 'closed'))) : x.st === 'court' ? pill(t(l('na Justiça', 'in court')), 'warn') : pill(t(l('aberta', 'open')), 'bad')),
      h('td', null, x.st === 'open' ? h('span', null, btn(l('Reconhecer', 'Concede'), () => say(resolveDispute18(s, x.id, 'give'))), ' ', btn(l(`${t(l('Justiça', 'Court'))} ${pc(courtOdds18(s, x))}`), () => say(resolveDispute18(s, x.id, 'court')))) : null)))) : empty(l('Nenhuma disputa de crédito.', 'No credit disputes.')),
    section(t(l('Rescisões (EUA, 35 anos)', 'Terminations (US, 35 years)')),
      h('p', { class: 'muted small' }, t(s.year >= 1978 ? l('Cessões feitas a partir de 1978 por artistas americanos podem ser rescindidas após 35 anos (aviso de 2 a 10 anos antes).', 'Grants made from 1978 by US artists can be terminated after 35 years (notice 2 to 10 years ahead).') : l('Nos EUA, a lei de direitos autorais ainda é a de 1909: renovação após 28 anos.', 'In the US the copyright law is still the 1909 Act: renewal after 28 years.'))),
      tm.length ? tbl([l('Ato', 'Act'), l('Masters', 'Masters'), l('Vale em', 'Effective'), l('Situação', 'Status'), l('')], tm.map((x) => h('tr', null, h('td', null, actLink(s, x.act)), h('td', null, String(x.rels.length)), h('td', null, String(x.eff)),
        h('td', null, t({ notice: l('aviso recebido', 'notice served'), contest: l('contestado', 'contested'), kept: l('mantido', 'kept'), accepted: l('aceito', 'accepted'), done: l('revertido', 'reverted') }[x.st])),
        h('td', null, x.st === 'notice' ? h('span', null, btn(l('Renegociar', 'Renegotiate'), () => say(answerTerm18(s, x.id, 'reneg', Math.max(1, Math.round(x.rels.reduce((a, id) => a + annualRevenue(s.releases[id]), 0) * 2.5))))), ' ', btn(l('Contestar', 'Contest'), () => say(answerTerm18(s, x.id, 'contest')))) : null)))) : empty(l('Nenhum aviso de rescisão.', 'No termination notices.'))),
  );
}

// ---------------------------------------------------------------- sociedades

function societies(s: GameState): HTMLElement {
  const st = r18(s), home = homeMk18(s);
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Fora do seu país, sua sociedade recebe por acordos recíprocos: +5% de taxa, 2 trimestres de atraso e mais caixa preta. Uma subeditora local cobra direto ({f} de comissão, contrato de 3 anos).', 'Abroad, your society collects via reciprocal deals: +5% fee, 2 quarters of delay and more black box. A local sub-publisher collects directly ({f} commission, 3-year deal).'), { f: pc(SUB_FEE18) })),
    tbl([l('Mercado', 'Market'), l('Execução', 'Performance'), l('Mecânico', 'Mechanical'), l('Conexos', 'Neighbouring'), l('Sobra de $1', 'Left of $1'), l('Subeditora', 'Sub-publisher')], MARKETS.map((m) => {
      const opts = socOptions18(s, m.id, 'p');
      const cur = socOf18(s, m.id, 'p');
      const r = rate18(s, m.id, 'perf');
      const nb = NEIGH18[m.id];
      const nSoc = socOf18(s, m.id, 'n');
      return h('tr', null, h('td', null, mkN(m.id), m.id === home ? pill(t(l('sede', 'home')), 'good') : null),
        h('td', null, opts.length > 1 ? h('select', { onchange: (e: Event) => say(setSoc18(s, m.id, (e.target as HTMLSelectElement).value)) }, opts.map((o) => h('option', { value: o.id, selected: o.id === cur?.id }, `${o.name}${o.invite ? ' *' : ''}`))) : (cur?.name ?? t(l('nenhuma (agentes próprios)', 'none (own agents)'))), cur ? whyIcon(s, 'rights18.rate', { mk: m.id, mod: 'perf' }) : null),
        h('td', { class: 'small' }, socOf18(s, m.id, 'm')?.name ?? '—'),
        h('td', { class: 'small' }, nb && s.year >= nb.from ? `${nSoc?.name ?? t(l('sociedade local', 'local society'))}${nb.digitalOnly ? t(l(' (só digital)', ' (digital only)')) : ''}` : t(l('não cobra', 'not collected'))),
        h('td', null, why18(s, 'rights18.rate', { mk: m.id, mod: 'perf' }, pc((1 - r.bb) * (1 - r.fee))), h('small', { class: 'muted' }, ` +${r.lag}m`)),
        h('td', null, m.id === home ? '—' : hasSub18(s, m.id) ? h('span', null, pill(t(l(`até ${st.sub[m.id]}`, `until ${st.sub[m.id]}`)), 'good'), ' ', btn(l('Encerrar', 'End'), () => say(setSub18(s, m.id, false)))) : btn(l(`${t(l('Contratar', 'Sign'))} ${$(subCost18(s, m.id))}`), () => say(setSub18(s, m.id, true)))));
    })),
    section(t(l('Sobre cada sociedade', 'About each society')), h('ul', { class: 'small' }, MARKETS.flatMap((m) => socOptions18(s, m.id, 'p').concat(socOptions18(s, m.id, 'n').filter((x) => !x.does.includes('p')))).map((o) => h('li', null, h('b', null, o.name), ` (${o.from}) — `, t(o.note))))),
    home === 'br' || s.year >= 1973 ? section(t(l('ECAD: autoral × conexo', 'ECAD: authors × neighbouring')), h('p', { class: 'small' }, t(l('No Brasil o ECAD arrecada num balcão só e reparte: a parte AUTORAL vai a compositores e editoras; a parte CONEXA vai a intérpretes (41,7%), produtores fonográficos/gravadoras (41,7%) e músicos acompanhantes (16,6%). Seus masters recebem a fatia do produtor fonográfico; seus artistas, a de intérpretes.', 'In Brazil ECAD collects at a single desk and splits: the AUTHORS\' share goes to writers and publishers; the NEIGHBOURING share goes to performers (41.7%), phonogram producers/labels (41.7%) and session musicians (16.6%). Your masters get the producer share; your acts get the performers\' share.')))) : null,
  );
}

// ---------------------------------------------------------------- extratos

function statements(s: GameState): HTMLElement {
  const st = r18(s), now = s.year * 12 + s.month;
  const rows = st.stm.slice().sort((a, b) => b.due - a.due).slice(0, 24);
  const tot = rows.reduce((a, x) => ({ g: a.g + x.g, bb: a.bb + x.bb }), { g: 0, bb: 0 });
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Cada sociedade fecha o período (semestral até 1985, trimestral depois) e paga meses depois. "Caixa preta" é o que ela recebeu e não conseguiu ligar a você — fica {n} anos esperando reclamação. Recuperação por auditoria hoje: ~{p}.', 'Each society closes its period (semi-annual until 1985, quarterly after) and pays months later. "Black box" is what it collected but could not match to you — it waits {n} years for a claim. Audit recovery today: ~{p}.'), { n: BB_YEARS18, p: pc(claimRate18(s)) })),
    h('div', { class: 'row wrap' }, btn(l(`${t(l('Reclamar caixa preta', 'Claim the black box'))} (${$(bbTotal18(s))})`), () => say(claimBB18(s)), 'btn small primary'),
      h('span', { class: 'small muted' }, t(l(' Já recuperado: {a} · perdido para o rateio: {b}', ' Recovered so far: {a} · lost to the pool: {b}'), { a: $(st.claimed), b: $(st.lost) }))),
    rows.length ? tbl([l('Pago em', 'Paid'), l('Mercado', 'Market'), l('Sociedade', 'Society'), l('Bruto', 'Gross'), l('Taxa', 'Fee'), l('Caixa preta', 'Black box'), l('Caução', 'Escrow'), l('Líquido', 'Net'), l('')], rows.map((x) => h('tr', null,
      h('td', null, moY(x.due)), h('td', null, mkN(x.mk)), h('td', { class: 'small' }, x.soc), h('td', null, $(Math.round(x.g))), h('td', null, $(Math.round(-x.fee))), h('td', { class: x.bb ? 'bad' : '' }, $(Math.round(-x.bb))), h('td', null, $(Math.round(-x.esc))), h('td', null, h('b', null, $(Math.round(x.net)))),
      h('td', null, x.due <= now ? pill(t(l('pago', 'paid')), 'good') : pill(t(l('a receber', 'receivable')))))) ) : empty(l('Nenhum extrato ainda.', 'No statements yet.')),
    rows.length ? h('p', { class: 'small muted' }, t(l('Nestes extratos, {p} do bruto caiu na caixa preta.', 'In these statements, {p} of gross fell into the black box.'), { p: pc(tot.g ? tot.bb / tot.g : 0) })) : null,
  );
}

// ---------------------------------------------------------------- catálogo

function catalog(s: GameState): HTMLElement {
  const own = catVal18(s, myRels(s), true);
  const open = s.catalogAuctions.filter((a) => a.status === 'open' && a.seller !== 'player');
  return h('div', null,
    section(t(l('Seu catálogo', 'Your catalog')),
      chips(why18(s, 'rights18.cat', {}, stat('chart-up', $(own.value), l('Valor estimado', 'Estimated value'))), stat('money', $(own.annual), l('Receita anual', 'Annual revenue')), stat('sparkle', `${own.mult.toFixed(1)}×`, l('Múltiplo efetivo', 'Effective multiple'))),
      h('ul', { class: 'small' }, own.parts.map((p) => h('li', null, `${t(typeof p.label === 'string' ? l(p.label) : p.label)}: ${typeof p.value === 'number' ? (p.fmt === 'mult' ? `${p.value.toFixed(2)}×` : String(p.value)) : ''}`))),
      h('p', { class: 'muted small' }, t(l('Vender catálogo salva o caixa hoje e leva a renda futura (veja Finanças › renda perdida). Leilão em Negócios.', 'Selling catalog saves cash today and takes future income (see Finance › lost income). Auction it under Business.'))),
    ),
    section(t(l('Catálogos à venda', 'Catalogs for sale')), open.length ? tbl([l('Vendedor', 'Seller'), l('Masters', 'Masters'), l('Lance atual', 'Current bid'), l('Sua avaliação', 'Your valuation'), l('')], open.map((au) => {
      const rels = au.releaseIds.map((id) => s.releases[id]).filter(Boolean);
      const v = catVal18(s, rels);
      const top = Math.max(au.ask, ...au.bids.map((b) => b.amount));
      const bid = Math.round(top * 1.05);
      return h('tr', null, h('td', null, s.labels[au.seller]?.name ?? au.seller), h('td', null, String(rels.length)), h('td', null, $(top)),
        h('td', { class: v.value > bid ? 'good' : 'bad' }, why18(s, 'rights18.cat', { rels: au.releaseIds }, $(v.value))),
        h('td', null, btn(l(`${t(l('Lance', 'Bid'))} ${$(bid)}`), () => say(bidCatalog(s, au.id, bid), l('Lance registrado.', 'Bid placed.')))));
    })) : empty(l('Nenhum leilão aberto agora.', 'No open auctions right now.'))),
  );
}

// ---------------------------------------------------------------- editora (administração)

function publishing(s: GameState): HTMLElement {
  const st = r18(s);
  if (!canAdmin18(s)) return empty(l('Abra uma editora (Negócios ou Empreendimentos) para administrar catálogos de terceiros: você cobra por eles nas sociedades e fica com 10–20%.', 'Open a publisher (Business or Ventures) to administer third-party catalogs: you collect for them at the societies and keep 10–20%.'));
  const m = meta18(s).v;
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Administração: compositores e espólios entregam o catálogo para você registrar, cobrar e reclamar. Sua renda = arrecadado × taxa × identificação ({p} com seus metadados). Clientes mal atendidos não renovam.', 'Administration: songwriters and estates hand you their catalog to register, collect and claim. Your income = collections × fee × identification ({p} with your metadata). Poorly served clients do not renew.'), { p: pc(0.7 + 0.6 * m) })),
    section(t(l('Propostas', 'Offers')), st.admOff.length ? tbl([l('Cliente', 'Client'), l('Arrecadação/ano', 'Collections/yr'), l('Taxa', 'Fee')], st.admOff.map((o) => h('tr', null, h('td', null, o.name), h('td', null, $(o.size)),
      h('td', null, [0.1, 0.15, 0.2].map((f) => btn(l(`${pc(f)} (${t(l('chance', 'chance'))} ${pc((f <= 0.1 ? 0.95 : f <= 0.15 ? 0.75 : 0.45) + m * 0.1)})`), () => say(takeAdm18(s, o.id, f)))))))) : empty(l('Nenhuma proposta agora (chegam a cada poucos meses).', 'No offers right now (they arrive every few months).'))),
    section(t(l('Clientes', 'Clients')), st.adm.length ? tbl([l('Cliente', 'Client'), l('Arrecadação/ano', 'Collections/yr'), l('Taxa', 'Fee'), l('Até', 'Until'), l('Satisfação', 'Satisfaction')], st.adm.map((c) => h('tr', null, h('td', null, c.name), h('td', null, $(c.size)), h('td', null, pc(c.fee)), h('td', null, String(c.until)), h('td', { class: c.sat < 50 ? 'bad' : 'good' }, String(Math.round(c.sat)))))) : empty(l('Nenhum cliente.', 'No clients.'))),
  );
}

// ---------------------------------------------------------------- precedentes

function precedents(s: GameState): HTMLElement {
  const st = r18(s);
  const done = PRECS18.filter((d) => st.prec[d.id]?.y);
  const trial = PRECS18.filter((d) => !st.prec[d.id]?.y && st.prec[d.id]?.ann);
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Casos reais que mudaram as regras na data em que aconteceram. Fora do modo "Vida real exata", o veredito pode sair diferente (história alternativa) — e financiar um lado pesa.', 'Real cases that changed the rules on the date they happened. Outside "Exact real life" mode, the verdict may differ (alternate history) — and backing a side matters.'))),
    trial.length ? section(t(l('Em julgamento', 'On trial')), h('ul', { class: 'small' }, trial.map((d) => h('li', null, h('b', null, d.name), ' — ', t(d.who[0]), ' × ', t(d.who[1]), st.prec[d.id]?.side ? pill(t(l('você financiou um lado', 'you backed a side'))) : null)))) : null,
    done.length ? tbl([l('Ano', 'Year'), l('Caso', 'Case'), l('O que decidiu', 'Ruling'), l('Efeito no jogo', 'Game effect')], done.slice().reverse().map((d) => h('tr', null, h('td', null, String(d.y)), h('td', null, d.name),
      h('td', { class: 'small' }, st.prec[d.id]?.flip ? pill(t(l('veredito invertido (história alternativa)', 'verdict flipped (alternate history)')), 'warn') : t(d.text)), h('td', { class: 'small' }, st.prec[d.id]?.flip ? '—' : t(d.effect))))) : empty(l('Nenhum precedente relevante ainda.', 'No relevant precedents yet.')),
  );
}

function area(s: GameState): HTMLElement {
  const st = r18(s);
  const nDisp = st.disp.filter((d) => d.st !== 'done').length + st.term.filter((x) => x.st === 'notice').length;
  const nClr = st.clr.filter((c) => c.st !== 'ok').length + s.samples.filter((x) => x.status !== 'cleared' && playerActs(s).includes(s.songs[x.songId]?.actId ?? '')).length;
  void disputeOf18;
  return h('div', { class: 'rights18' },
    h('h2', null, t(l('Direitos', 'Rights'))),
    tabs('rights18', [
      { id: 'sum', label: t(l('Resumo', 'Overview')), icon: 'contract', render: () => summary(s) },
      { id: 'works', label: t(l('Obras', 'Works')), icon: 'note', render: () => works(s) },
      { id: 'rec', label: t(l('Gravações e versões', 'Recordings & versions')), icon: 'disc', render: () => recordings(s) },
      { id: 'clr', label: t(l('Autorizações', 'Clearances')), icon: 'lock', badge: nClr || undefined, render: () => clearances(s) },
      { id: 'disp', label: t(l('Disputas', 'Disputes')), icon: 'gavel', badge: nDisp || undefined, render: () => disputes(s) },
      { id: 'soc', label: t(l('Sociedades', 'Societies')), icon: 'globe', render: () => societies(s) },
      { id: 'stm', label: t(l('Extratos', 'Statements')), icon: 'bank', render: () => statements(s) },
      { id: 'cat', label: t(l('Catálogo', 'Catalog')), icon: 'chart-up', render: () => catalog(s) },
      { id: 'pub', label: t(l('Editora', 'Publisher')), icon: 'pen', render: () => publishing(s) },
      { id: 'prec', label: t(l('Precedentes', 'Precedents')), icon: 'trophy', render: () => precedents(s) },
    ], rerender),
  );
}

registerArea({ id: 'rights18', label: l('Direitos', 'Rights'), icon: 'contract', key: '', render: area,
  badge: (s) => { const st = r18(s); return st.disp.filter((d) => d.st === 'open').length + st.term.filter((x) => x.st === 'notice').length || undefined; } });
