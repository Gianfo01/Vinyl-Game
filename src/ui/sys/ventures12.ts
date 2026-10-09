// Rodada 12 — interface das carreiras de editora, mídia e plataforma (anexada ao cartão de cada negócio).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { visibleAct } from '../../sim/future';
import type { GameState } from '../../sim/types';
import { rngOf } from '../../sim/util';
import { MEDIA, type Venture } from '../../sim/sys/ventures9';
import {
  AUDS, LINES, ROLE_NAME, SLOT_NAME, adPulled, adapt, advertisers, chaseExclusive, fireStaff, formatName, hireStaff, medOf, overdue, resolveReview, setLine, setSlot, shiftsOf, slotCap, slotKinds, staffCap, staffPool, staffBy,
  type Aud, type Line, type SlotKind,
} from '../../sim/sys/media12';
import {
  CRIT_NAME, PROPS, REASON_NAME, SIZE_NAME, buyExclusive, catalogOf, configure, curatorCost, dependence, discoveryQuality, effPayout, fanSession, hifiOk, platOf, publishReport, resolveRenewal, setCurators, sizeOf, synthOn,
  type Crit, type Model, type Prop, type Synth,
} from '../../sim/sys/platform12';
import {
  ETHIC_NAME, OFFER_NAME, REQ_NAME, adConflict, answerOffer, chemistry, coWrite, commission, commissionCost, forgotten, genresInPlay, keyOf, profOf, pubOf, reqChance, resolveAd, revive, serveReq, setPair, setSplit, setStance, trending, workOf,
  type AdMode,
} from '../../sim/sys/ventures12';
import { $, actLink, genreName, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';

const say = (x: { ok: boolean; text: L }) => { toast(t(x.text), x.ok ? 'good' : 'bad'); rerender(); };
const btn = (label: L, fn: () => void, cls = 'btn small') => h('button', { class: cls, onclick: fn }, t(label));
const pct = (x: number) => `${Math.round(x * 100)}%`;
const note = (s: L) => h('p', { class: 'small muted' }, t(s));
const notes = (x: { notes: L[] }) => (x.notes.length ? h('ul', { class: 'small' }, x.notes.map((n) => h('li', null, t(n)))) : null);
const opts = <T extends string>(o: Record<T, { name: L }>) => (Object.keys(o) as T[]).map((k) => ({ value: k, label: t(o[k].name) }));
const actsFor = (s: GameState) => Object.values(s.acts).filter((a) => visibleAct(s, a) && a.status !== 'retired' && a.status !== 'split' && a.members.length).sort((a, b) => b.fame - a.fame).slice(0, 40);

// ================================================================== editora

function publisher(s: GameState, v: Venture): HTMLElement {
  const r = rngOf(s), x = pubOf(s, v.id), ws = v.writers!;
  const wopts = ws.map((w) => ({ value: w.pid, label: w.name }));
  let pickKey = '', pa = ws[0]?.pid ?? '', pb = ws[1]?.pid ?? '', gen = genresInPlay(s)[0] ?? '', cw = ws[0]?.pid ?? '';
  const protectedN = v.cat!.filter((c) => c.x?.stance === 'protect').length;
  return h('div', { class: 'card inner' },
    h('h5', null, t(l('Editora: carreira', 'Publisher: career'))),
    h('p', { class: 'small' }, t(l('Colocações', 'Placements')), `: ${x.placed} · `, t(l('relevantes', 'relevant')), `: ${x.relevant} · `, t(l('revividas', 'revived')), `: ${x.revived} · `, t(l('coautorias', 'co-writes')), `: ${x.cow} · `, t(l('evolução dos autores', 'writers\' growth')), `: +${Math.round(x.gained)} `, t(l('pontos', 'pts'))),
    notes(x),
    ws.length ? h('table', { class: 'tbl compact' }, h('tbody', null, ws.map((w) => { const p = profOf(s, v, w.pid); return h('tr', null, h('td', null, w.name), h('td', null, `${t(l('talento', 'skill'))} ${w.skill} (${w.skill >= p.start ? '+' : ''}${Math.round(w.skill - p.start)})`), h('td', null, genreName(p.spec)), h('td', null, t(ETHIC_NAME(p.ethic))), h('td', null, t(l('humor', 'mood')), ' ', bar(p.mood)), h('td', null, `${t(l('parte do autor', 'writer share'))} ${pct(p.cut)}`)); }))) : note(l('Contrate compositores acima para receber pedidos.', 'Sign songwriters above to receive requests.')),
    h('h5', null, t(l('Pedidos do mercado', 'Market requests'))),
    x.reqs.length ? x.reqs.map((q) => {
      let wp = ws[0]?.pid ?? '';
      const w = ws.find((z) => z.pid === q.conflict);
      return h('div', { class: 'card inner' },
        h('div', { class: 'row wrap small' }, pill(t(REQ_NAME[q.kind]), q.kind === 'ad' ? 'warn' : ''), ' ', h('b', null, q.who), ` · ${genreName(q.genre)} · ${$(q.fee)} · `, t(l('prazo semana', 'due week')), ` ${q.until}`, (x.stock[q.genre] ?? 0) > 0 ? pill(t(l('estoque', 'in stock')) + ` ${x.stock[q.genre]}`, 'good') : null, q.brand ? pill(t(l('marca polêmica', 'edgy brand')) + ` ${q.brand.edge}`, q.brand.edge > 60 ? 'bad' : '') : null),
        q.conflict && w ? h('div', null,
          h('p', { class: 'small' }, t(l(`${w.name} rejeita a marca. Opções:`, `${w.name} rejects the brand. Options:`))),
          h('div', { class: 'row wrap' },
            btn(l('Recusar a campanha (autor fica grato)', 'Refuse the campaign (writer grateful)'), () => say(resolveAd(s, r, v.id, q.id, 'refuse' as AdMode))),
            btn(l('Negociar condições (roteiro limpo, −25% do cachê)', 'Negotiate terms (clean script, −25% fee)'), () => say(resolveAd(s, r, v.id, q.id, 'negotiate')), 'btn small primary'),
            select<string>(pickKey, [{ value: '', label: t(l('— outra música do catálogo —', '— another catalog song —')) }, ...v.cat!.filter((c) => !(c.wp && adConflict(s, v, q, c.wp))).map((c) => ({ value: keyOf(c), label: c.title }))], (k) => (pickKey = k)),
            btn(l('Oferecer essa (80% do cachê)', 'Pitch it (80% of fee)'), () => say(resolveAd(s, r, v.id, q.id, 'other', pickKey))))) :
          ws.length ? h('div', { class: 'row wrap' }, select<string>(wp, ws.map((z) => ({ value: z.pid, label: `${z.name} · ${pct(reqChance(s, v, q, z.pid))}${adConflict(s, v, q, z.pid) ? ' ⚠' : ''}` })), (k) => (wp = k)), btn(l('Escalar', 'Assign'), () => say(serveReq(s, r, v.id, q.id, wp)), 'btn small primary')) : null);
    }) : note(l('Nenhum pedido aberto. Com reputação e compositores variados, eles chegam todo mês.', 'No open requests. With reputation and varied writers they arrive monthly.')),
    h('h5', null, t(l('Duplas de coautoria', 'Co-writing pairs'))),
    ws.length >= 2 ? h('div', null,
      x.pairs.map(([a, b]) => h('div', { class: 'row wrap small' }, `${ws.find((z) => z.pid === a)?.name} + ${ws.find((z) => z.pid === b)?.name} · ${t(l('química', 'chemistry'))} ${pct(chemistry(s, v, a, b))} `, btn(l('Compor juntos', 'Write together'), () => say(coWrite(s, r, v.id, a, b))))),
      h('div', { class: 'row wrap' }, select<string>(pa, wopts, (k) => (pa = k)), ' + ', select<string>(pb, wopts, (k) => (pb = k)), btn(l('Formar dupla', 'Form pair'), () => say(setPair(s, v.id, pa, pb))))) : note(l('Precisa de dois compositores.', 'Needs two songwriters.')),
    h('h5', null, t(l('Repertório para o futuro', 'Repertoire for the future'))),
    h('p', { class: 'small' }, t(l('Gêneros em alta (momento médio)', 'Rising genres (avg momentum)')), ': ', trending(s).map((z) => `${genreName(z.g)} ${Math.round(z.m)}`).join(' · '), ' · ', t(l('Estoque', 'Stock')), ': ', Object.entries(x.stock).filter(([, n]) => n > 0).map(([g, n]) => `${genreName(g)}×${n}`).join(', ') || '—'),
    ws.length ? h('div', { class: 'row wrap' }, select<string>(cw, wopts, (k) => (cw = k)), select<string>(gen, genresInPlay(s).map((g) => ({ value: g, label: genreName(g) })), (k) => (gen = k)),
      btn(l('Encomendar música de reserva', 'Commission a spare song'), () => say(commission(s, v.id, cw, gen))), h('span', { class: 'small muted' }, ` ${$(commissionCost(s, ws.find((z) => z.pid === cw)?.skill ?? 50))}`)) : null,
    x.offers.length ? h('div', null, h('h5', null, t(l('Propostas pelas suas obras', 'Offers for your works'))),
      x.offers.map((o) => h('div', { class: 'row wrap small' }, pill(t(OFFER_NAME[o.kind])), ` "${o.title}" ← ${o.by} · ${$(o.fee)} `,
        btn(l('Aceitar', 'Accept'), () => say(answerOffer(s, r, v.id, o.id, 'accept')), 'btn small primary'),
        btn(l('Aceitar exclusivo 2 anos (+40%)', 'Accept 2-yr exclusive (+40%)'), () => say(answerOffer(s, r, v.id, o.id, 'accept', true))),
        o.countered ? null : btn(l('Contrapropor', 'Counter'), () => say(answerOffer(s, r, v.id, o.id, 'counter'))),
        btn(l('Recusar', 'Decline'), () => say(answerOffer(s, r, v.id, o.id, 'decline')), 'btn small danger')))) : null,
    h('h5', null, t(l('Obras: proteger ou oferecer', 'Works: protect or pitch')), ` (${protectedN} ${t(l('protegidas', 'protected'))})`),
    note(l('Protegida: sem propostas externas, valoriza com o tempo e dá prestígio. Oferecida: atrai covers/syncs, mas satura após 4 vidas. Coautorias permitem ajustar a divisão.', 'Protected: no outside offers, appreciates and adds prestige. Pitched: draws covers/syncs but saturates after 4 lives. Co-writes allow adjusting the split.')),
    v.cat!.length ? h('table', { class: 'tbl compact' }, h('tbody', null, v.cat!.slice().sort((a, b) => b.v - a.v).slice(0, 10).map((c) => {
      const key = keyOf(c), e = c.x ?? {};
      return h('tr', null, h('td', null, c.title), h('td', null, actLink(s, c.actId)), h('td', null, `${t(l('vidas', 'lives'))} ${e.lives ?? 1}`, e.excl && e.excl.until > s.year ? ` · ${t(l('exclusivo até', 'exclusive until'))} ${e.excl.until}` : ''),
        h('td', null, select<string>(e.stance ?? '', [{ value: '', label: t(l('normal', 'normal')) }, { value: 'protect', label: t(l('protegida', 'protected')) }, { value: 'pitch', label: t(l('oferecida', 'pitched')) }], (k) => { setStance(s, v.id, key, (k || undefined) as 'protect' | 'pitch' | undefined); rerender(); })),
        h('td', null, e.co ? h('span', null, `${e.split ?? 50}/${100 - (e.split ?? 50)} `, btn(l('−', '−'), () => say(setSplit(s, v.id, key, (e.split ?? 50) - 10))), btn(l('+', '+'), () => say(setSplit(s, v.id, key, (e.split ?? 50) + 10)))) : '—'));
    }))) : null,
    forgotten(s, v).length ? h('div', null, h('h5', null, t(l('Esquecidas (6+ anos): ressuscite com nova versão', 'Forgotten (6+ yrs): revive with a new version'))),
      forgotten(s, v).slice(0, 5).map((c) => h('div', { class: 'row wrap small' }, `"${c.title}" · ${c.x?.last ?? c.y} `, btn(l('Nova versão', 'New version'), () => say(revive(s, r, v.id, keyOf(c))))))) : null,
    void workOf);
}

// ================================================================== mídia

function media(s: GameState, v: Venture): HTMLElement {
  const r = rngOf(s), x = medOf(s, v.id), acts = actsFor(s), cap = slotCap(v);
  const pool = staffPool(s, v.id).filter((z) => !x.staff.some((q) => q.id === z.id));
  let exAct = acts[0]?.id ?? '';
  const fmt = formatName(s, v, x);
  const ads = advertisers(s);
  const now = s.year * 12 + s.month;
  return h('div', { class: 'card inner' },
    h('h5', null, t(l('Redação e linha editorial', 'Newsroom and editorial line'))),
    h('div', { class: 'row wrap' }, t(l('Linha', 'Line')), ' ', select<Line>(x.line, opts(LINES), (k) => { setLine(s, v.id, k, x.aud); rerender(); }), ' ', t(l('Público', 'Audience')), ' ', select<Aud>(x.aud, opts(AUDS), (k) => { setLine(s, v.id, x.line, k); rerender(); })),
    note(LINES[x.line].desc),
    h('p', { class: 'small' }, t(l('Credibilidade', 'Credibility')), ' ', bar(x.cred), ` ${Math.round(x.cred)} · `, t(l('Formato', 'Format')), `: ${fmt ? t(fmt) : t(l('original', 'original'))}`, overdue(s, v, x) ? pill(t(l('formato defasado', 'outdated format')), 'bad') : null),
    x.lastFx.length ? h('ul', { class: 'small' }, x.lastFx.map((z) => h('li', null, t(z)))) : null,
    notes(x),
    x.dil ? h('div', { class: 'card inner warn' },
      h('p', null, h('b', null, t(l('Dilema editorial', 'Editorial dilemma'))), ': ', t(l(`sua crítica detonou ${s.acts[x.dil.actId]?.name ?? '?'} (${s.labels[x.dil.labelId]?.name}), que banca ~${$(x.dil.ad)}/mês da sua publicidade. Prazo: semana ${x.dil.until}.`, `your critic panned ${s.acts[x.dil.actId]?.name ?? '?'} (${s.labels[x.dil.labelId]?.name}), who funds ~${$(x.dil.ad)}/mo of your advertising. Deadline: week ${x.dil.until}.`))),
      h('div', { class: 'row wrap' },
        btn(l('Amaciar (mantém o contrato, perde credibilidade)', 'Soften (keep the contract, lose credibility)'), () => say(resolveReview(s, r, v.id, 'soften'))),
        btn(l('Publicar com direito de resposta', 'Publish with right of reply'), () => say(resolveReview(s, r, v.id, 'reply'))),
        btn(l('Publicar na íntegra', 'Publish in full'), () => say(resolveReview(s, r, v.id, 'publish')), 'btn small primary'))) : null,
    h('h5', null, t(l('Programação', 'Programming')), ` (${Math.min(x.prog.length, cap)}/${cap} ${t(l('vagas', 'slots'))})`),
    h('div', null, Array.from({ length: cap }, (_, i) => {
      const sl = x.prog[i];
      return h('div', { class: 'row wrap small' }, `${i + 1}. `, select<string>(sl?.kind ?? '', [{ value: '', label: '—' }, ...slotKinds(s).map((k) => ({ value: k, label: t(SLOT_NAME[k]) }))], (k) => { setSlot(s, v.id, i, k as SlotKind | '', sl?.actId ?? ''); rerender(); }),
        sl ? select<string>(sl.actId ?? '', [{ value: '', label: '—' }, ...acts.map((a) => ({ value: a.id, label: `${a.name} (${Math.round(a.fame)})` }))], (k) => { setSlot(s, v.id, i, sl.kind, k); rerender(); }) : null,
        sl?.actId && s.acts[sl.actId] ? h('span', { class: 'muted' }, ` ${LINES[x.line].fit(s.acts[sl.actId]) > 0.3 ? t(l('combina com a linha', 'fits the line')) : LINES[x.line].fit(s.acts[sl.actId]) < -0.3 ? t(l('destoa da linha', 'clashes with the line')) : ''}`) : null);
    })),
    note(l('Cada vaga dá momento ao artista. Artistas pequenos formam audiência nova; os que combinam com a linha elevam a credibilidade.', 'Each slot gives the act momentum. Small acts build a new audience; those that fit the line raise credibility.')),
    h('p', { class: 'small' }, t(l('Nova audiência', 'New audience')), ' ', bar(x.newAud)),
    h('h5', null, t(l('Equipe', 'Staff')), ` (${x.staff.length}/${staffCap(v)})`),
    x.staff.map((z) => h('div', { class: 'row wrap small' }, `${z.name} · ${t(ROLE_NAME[z.role])} · ${t(l('talento', 'skill'))} ${z.skill} · ${t(l('integridade', 'integrity'))} ${z.integrity} · ${$(z.salary)}/${t(l('mês', 'mo'))} `, btn(l('Demitir', 'Fire'), () => { fireStaff(s, v.id, z.id); rerender(); }, 'btn small danger'))),
    pool.length && x.staff.length < staffCap(v) ? h('div', { class: 'row wrap small' }, t(l('Contratar', 'Hire')), ' ', pool.map((z) => btn(l(`${z.name} (${t(ROLE_NAME[z.role])} ${z.skill}/int ${z.integrity})`, `${z.name} (${t(ROLE_NAME[z.role])} ${z.skill}/int ${z.integrity})`), () => say(hireStaff(s, v.id, z))))) : null,
    h('p', { class: 'small muted' }, t(l('Curador acha artistas cedo; crítico dá crédito mas pode se demitir se você amaciar; apresentador e repórter abrem exclusivas.', 'Curators spot acts early; critics add credibility but may quit if you soften; hosts and reporters open exclusives.'))),
    x.disc.length ? h('p', { class: 'small' }, t(l('Descobertas', 'Discoveries')), ': ', x.disc.map((d) => `${s.acts[d.actId]?.name ?? '?'} (${d.y})`).join(', ')) : null,
    h('h5', null, t(l('Exclusivas e fontes', 'Exclusives and sources'))),
    acts.length ? h('div', { class: 'row wrap' }, select<string>(exAct, acts.map((a) => ({ value: a.id, label: `${a.name} · ${t(l('fonte', 'source'))} ${Math.round(x.src[a.id] ?? 30)}` })), (k) => (exAct = k)), btn(l('Pedir exclusiva', 'Ask for an exclusive'), () => say(chaseExclusive(s, r, v.id, exAct)))) : null,
    h('h5', null, t(l('Anunciantes', 'Advertisers'))),
    h('p', { class: 'small' }, ads.map((a) => `${a.name} ${Math.round(a.w * 100)}%${(x.pulled[a.id] ?? 0) > now ? ` (${t(l('cortou', 'pulled'))})` : ''}`).join(' · '), ' · ', t(l('dependência do maior', 'top dependence')), ` ${Math.round((ads[0]?.w ?? 0) * 100)}% · `, t(l('perdido', 'lost')), ` ${Math.round(adPulled(s, x) * 100)}%`),
    shiftsOf(s, v, x).some((z) => !z.done) ? h('div', null, h('h5', null, t(l('Mudança de formato da época', 'Era format shift'))), shiftsOf(s, v, x).filter((z) => !z.done).map((z) => h('div', { class: 'row wrap small' }, `${z.y}: ${t(z.name)} `, btn(l(`Adaptar (${$(Math.round(z.cost * 100 * v.level))}+)`, `Adapt (${$(Math.round(z.cost * 100 * v.level))}+)`), () => say(adapt(s, v.id, z.y)))))) : null,
    void MEDIA, void staffBy);
}

// ================================================================== plataforma

function platform(s: GameState, v: Venture): HTMLElement {
  const r = rngOf(s), x = platOf(s, v.id), P = PROPS[x.prop], q = discoveryQuality(s, v, x), cat = catalogOf(s, v);
  const acts = actsFor(s);
  let fa = acts[0]?.id ?? '';
  const cfg = (o: Parameters<typeof configure>[2]) => say(configure(s, v.id, o));
  return h('div', { class: 'card inner' },
    h('h5', null, t(l('Estratégia da plataforma', 'Platform strategy'))),
    h('div', { class: 'row wrap' }, t(l('Proposta', 'Proposition')), ' ', select<Prop>(x.prop, opts(PROPS).map((o) => ({ ...o, disabled: o.value === 'hifi' && !hifiOk(s) && false })), (k) => cfg({ prop: k })), ' ',
      t(l('Preço', 'Price')), ' ', select<number>(x.price, [0.8, 0.9, 1, 1.1, 1.25, 1.4].map((n) => ({ value: n, label: `${Math.round(n * 100)}%` })), (k) => cfg({ price: k })), ' ',
      t(l('Plano gratuito c/ anúncios', 'Free ad-supported tier')), ' ', select<number>(x.free, [{ value: 0, label: t(l('nenhum', 'none')) }, { value: 0.5, label: '0,5×' }, { value: 1, label: '1×' }], (k) => cfg({ free: k }))),
    note(P.desc),
    x.prop === 'hifi' && !hifiOk(s) ? note(l('Aviso: sem tecnologia lossless madura antes de 2015, assinantes reclamam da qualidade.', 'Warning: without mature lossless before 2015, subscribers complain about quality.')) : null,
    h('p', { class: 'small' }, `${t(l('Assinantes', 'Subscribers'))}: ${v.subs!.toLocaleString()} · ${t(l('Gratuitos', 'Free'))}: ${Math.round(v.subs! * x.free).toLocaleString()} (+${x.conv}/${t(l('mês viram pagantes', 'mo convert'))}) · ${t(l('Confiança', 'Trust'))} `), bar(x.trust),
    h('h5', null, t(l('Por que os assinantes saem (% ao mês)', 'Why subscribers leave (% per month)'))),
    h('div', { class: 'small' }, Object.entries(x.churn).map(([k, n]) => h('div', { class: 'row' }, h('span', { style: 'min-width:170px' }, t(REASON_NAME[k as keyof typeof REASON_NAME])), bar(Math.min(100, n * 25)), ` ${n}%`))),
    h('h5', null, t(l('Descoberta: humana x recomendação', 'Discovery: human vs recommendation'))),
    h('div', { class: 'row wrap' }, t(l('Curadoria humana', 'Human curation')), ' ', select<number>(x.human, [0, 25, 50, 75, 100].map((n) => ({ value: n, label: `${n}%` })), (k) => cfg({ human: k })), ' ',
      t(l('Critério', 'Criterion')), ' ', select<Crit>(x.crit, (Object.keys(CRIT_NAME) as Crit[]).map((k) => ({ value: k, label: t(CRIT_NAME[k]) })), (k) => cfg({ crit: k })), ' ',
      t(l('Curadores', 'Curators')), ' ', btn(l('−', '−'), () => { setCurators(s, v.id, x.curators - 1); rerender(); }), h('b', null, ` ${x.curators} `), btn(l('+', '+'), () => { setCurators(s, v.id, x.curators + 1); rerender(); }), h('span', { class: 'small muted' }, ` ${$(curatorCost(s))}/${t(l('mês cada', 'mo each'))}`)),
    h('p', { class: 'small' }, `${t(l('Qualidade da descoberta', 'Discovery quality'))}: ${pct(q.dq)} (${t(l('humana', 'human'))} ${pct(q.cur)} · ${t(l('algoritmo', 'algorithm'))} ${pct(q.algo)})`),
    x.picks.length ? h('div', { class: 'small' }, t(l('Destaques do mês', 'This month\'s picks')), ': ', x.picks.map((p, i) => h('span', null, i ? ', ' : '', actLink(s, p.actId))), h('div', { class: 'muted' }, t(x.picks[0].why))) : null,
    note(l('Seus critérios decidem quem ganha ouvintes: popularidade reforça os grandes; novidade, diversidade e curadoria elevam cenas e artistas pequenos.', 'Your criteria decide who gains listeners: popularity feeds the big; newness, diversity and curation lift scenes and small acts.')),
    h('h5', null, t(l('Repasse e transparência', 'Payouts and transparency'))),
    h('div', { class: 'row wrap' }, t(l('Modelo', 'Model')), ' ', select<Model>(x.model, [{ value: 'prorata', label: t(l('Pro-rata (bolo comum)', 'Pro-rata (common pot)')) }, { value: 'usercentric', label: t(l('Centrado no usuário', 'User-centric')) }], (k) => cfg({ model: k })), ' ', btn(l('Publicar relatório de transparência', 'Publish transparency report'), () => say(publishReport(s, v.id)))),
    note(l('Centrado no usuário paga mais aos independentes e menos às majors; as majors reclamam.', 'User-centric pays indies more and majors less; majors complain.')),
    h('p', { class: 'small' }, `${pct(v.payout ?? 0.65)} ${t(l('vão para gravadoras', 'go to labels'))} / ${pct(1 - (v.payout ?? 0.65))} ${t(l('ficam com você', 'stay with you'))}`),
    x.dil ? h('div', { class: 'card inner warn' },
      h('p', null, h('b', null, t(l('Renovação em disputa', 'Renewal dispute'))), ': ', t(l(`${s.labels[x.dil.labelId]?.name} (${t(SIZE_NAME[sizeOf(s.labels[x.dil.labelId])])}) exige repasse de ${pct(x.dil.payout)} e garantia de ${$(x.dil.mg)}. Dependência: ${pct(dependence(s, v, x.dil.labelId))} do catálogo.`, `${s.labels[x.dil.labelId]?.name} (${t(SIZE_NAME[sizeOf(s.labels[x.dil.labelId])])}) demands a ${pct(x.dil.payout)} payout and a ${$(x.dil.mg)} guarantee. Dependence: ${pct(dependence(s, v, x.dil.labelId))} of the catalog.`))),
      h('div', { class: 'row wrap' },
        btn(l('Aceitar os termos', 'Accept terms'), () => say(resolveRenewal(s, r, v.id, 'accept'))),
        btn(l('Contrapropor o meio-termo', 'Counter with a middle ground'), () => say(resolveRenewal(s, r, v.id, 'counter')), 'btn small primary'),
        btn(l('Trocar por exclusividade', 'Trade for exclusivity'), () => say(resolveRenewal(s, r, v.id, 'exclusive'))),
        btn(l('Recusar (arrisca perder o catálogo)', 'Refuse (risk losing the catalog)'), () => say(resolveRenewal(s, r, v.id, 'refuse')), 'btn small danger'))) : null,
    v.deals!.length ? h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, ...[l('Gravadora', 'Label'), l('Porte', 'Size'), l('Repasse', 'Payout'), l('Dependência', 'Dependence'), l('Contrato', 'Contract')].map((z) => h('th', null, t(z))))), h('tbody', null, v.deals!.map((id) => {
      const lb = s.labels[id]; if (!lb) return null;
      const tm = x.terms[id];
      return h('tr', null, h('td', null, lb.name), h('td', null, t(SIZE_NAME[sizeOf(lb)])), h('td', null, pct(effPayout(s, x, id, v))), h('td', null, pct(dependence(s, v, id))), h('td', null, tm ? `${t(l('até', 'until'))} ${tm.until}${tm.excl > s.year ? ` · ${t(l('exclusivo', 'exclusive'))}` : ''}` : '—'), h('td', null, tm && tm.excl <= s.year ? btn(l('Comprar exclusividade', 'Buy exclusivity'), () => say(buyExclusive(s, v.id, id))) : null));
    }))) : note(l(`Catálogo total: ${cat.total}. Licencie gravadoras acima; majors, médias e independentes pedem termos diferentes.`, `Total catalog: ${cat.total}. License labels above; majors, mid-size and indies ask for different terms.`)),
    synthOn(s) ? h('div', { class: 'row wrap' }, t(l('Conteúdo sintético', 'Synthetic content')), ' ', select<Synth>(x.synth, [{ value: 'allow', label: t(l('Liberar (barato, gera desconfiança)', 'Allow (cheap, breeds distrust)')) }, { value: 'label', label: t(l('Rotular', 'Label it')) }, { value: 'ban', label: t(l('Banir', 'Ban')) }], (k) => cfg({ synth: k }))) : null,
    acts.length ? h('div', { class: 'row wrap' }, t(l('Sessão exclusiva para assinantes', 'Exclusive subscriber session')), ' ', select<string>(fa, acts.map((a) => ({ value: a.id, label: a.name })), (k) => (fa = k)), btn(l('Realizar', 'Run it'), () => say(fanSession(s, r, v.id, fa)))) : null,
    notes(x));
}

/** Seção extra anexada ao cartão do negócio (editora, mídia, plataforma). */
export function extra12(s: GameState, v: Venture): HTMLElement | null {
  if (v.kind === 'publisher') return publisher(s, v);
  if (v.kind === 'media') return media(s, v);
  if (v.kind === 'platform') return platform(s, v);
  return null;
}
void section;
