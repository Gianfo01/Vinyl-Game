// Rodada 17 — menu CRIME: Organizações · Planos/Ações · Espionagem (movida de Gravadoras/Mercado) · Mercado negro ·
// Investigações/Polícia · Histórico. Toda ação mostra chance, risco de exposição, custo, calor e o porquê.

import { countryName } from '../../data/geo';
import { KIND_NAME, RACKET_NAME } from '../../data/orgs17';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { recentFacts } from '../../sim/facts17';
import { histMode } from '../../sim/history15';
import {
  CRIMES17, FENCES17, PLEA17, SEC17, agency, bossName, buyOffer, commitCrime, crime17, crimeById, crimeOdds, fenceQuote, fences, fineOf,
  forensic, forgeCost, forgeRelic, hasRacket, heatIn, isReal, myCases, nameOf17, orgById, orgs17, partnerOdds, pizzoFee, raidBootleggers, raidCost, resolveCase,
  returnHot, ricoName, sellHot, setSecurity, targetBlock17, targetId17, targetsFor, trialOdds, usd, type Ctx17, type Plea,
} from '../../sim/sys/crime17';
import { targetPicker29 } from './crimepick29'; // r29: seletor de alvo com busca (todos os personagens)
import { delay29, jobTarget29, jobsFor29, METER29, askDef29, asks29, doMob29, era29, fulfill29, hire29, hireOdds29, meter29, mobActs29, peek29, refuse29 } from '../../sim/sys/mob29'; // r29 Submundo: famílias
import { LINK29, LINKSIM29, orgLinks29 } from '../../sim/sys/orglinks29';
import { AWCAT29, awCatsOn29 } from '../../sim/sys/rig29'; // r29: votação de prêmio comprada
import { orgAff29 } from '../../sim/sys/aff29'; // r29: facções × cenas
import { fmtL } from '../../sim/util';
import { GONE23, RANK23, ROLE23, density23, name23, orgPower23 } from '../../sim/sys/crimemem23';
import { WARN_REPLY, cutTie, payOffCost, replyWarn, tieAct, tieOf, truce, truceCost, type WarnReply } from '../../sim/sys/crimenpc17';
import { relics } from '../../sim/sys/relics9';
import type { GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { heat19 } from '../../sim/rivals19';
import { rivalsExtra } from '../panels/discovery';
import { cityName, monthName, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { registerArea } from '../registry';
import { chips, setTab, stat, tabs } from '../vis';
import { intriguePanel } from './intrigue';
import { emblemImg28, orgEmblemKind28 } from '../pixel/emblem28';
import { relicImg28 } from '../pixel/relic28';
import { heistOn27 } from '../act27/heist27'; // r27 (M3): operação jogável
import { screen27, screenOn27 } from '../act27/flow27'; // r27 FLOW: uma entrada só
import { crimeForm17, presetHire29 } from './crimeform29';
import { ent27 } from '../ps/ent27';
import { relicBrowser29 } from './relics29'; // R29: filtros e páginas para listas grandes de relíquias

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));
/** r28 (arte): brasão semeado da organização (forma pelo tipo, cores pela região, carga pelo negócio). */
const orgEmblem = (o: { id: string; kind: string; a3: string; rackets: string[]; name: L }, size: number) => emblemImg28({ id: o.id, kind: orgEmblemKind28(o.kind), a3: o.a3, rackets: o.rackets, name: o.name.pt }, size, T(o.name));
const say = (x: L | string, tone: 'good' | 'bad' | 'info' = 'info') => { toast(T(x), tone); rerender(); };
const P = (x: number): string => `${Math.round(x * 100)}%`;
const btn = (label: L | string, fn: () => void, o: { title?: L | string; dis?: boolean; cls?: string } = {}) =>
  h('button', { class: `btn small ${o.cls ?? ''}`, disabled: !!o.dis, title: o.title ? T(o.title) : '', onclick: fn }, T(label));

// ================================================================ Organizações

function orgsTab(s: GameState): HTMLElement {
  const st = crime17(s);
  const strict = histMode(s) === 'strict';
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
  const list = orgs17(s, false, true).sort((a, b) => (b.a3 === orgs17(s).find((o) => o.id === 'fnoite')?.a3 ? 1 : 0) - (a.a3 === orgs17(s).find((o) => o.id === 'fnoite')?.a3 ? 1 : 0) || b.power - a.power);
  const feuds = Object.entries(st.feud).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return h('div', null,
    h('p', { class: 'muted small' }, T(l(
      'Organizações ativas nesta época. As reais trazem apenas laços documentados; ' + (strict ? 'no modo Vida real exata nada é inventado para pessoas reais.' : 'nos modos livres, laços novos de pessoas reais aparecem só como boato.') + ' Assassinato nunca envolve pessoas reais.',
      'Organizations active in this era. Real ones only show documented ties; ' + (strict ? 'in Exact real life mode nothing is invented for real people.' : 'in free modes, new ties of real people only appear as rumors.') + ' Murder never involves real people.'))),
    // r29: o que as famílias estão cobrando agora (o card de cada uma tem os botões)
    asks29(s).length ? h('div', { class: 'card' }, h('b', null, T(l('Pedidos das famílias', 'Requests from the families'))), h('ul', { class: 'small' }, asks29(s).map((a) => h('li', null,
      `${T(orgById(s, a.o)?.name ?? a.o)}: ${T(askDef29(a.k).name)} · ${T(l('prazo: semana', 'deadline: week'))} ${a.dl}`)))) : null,
    h('div', { class: 'cards' }, list.map((o) => {
      const rel = Math.round(st.org[o.id] ?? 0);
      const down = (st.down[o.id] ?? 0) > s.week;
      return h('section', { class: 'card' },
        h('h3', null, orgEmblem(o, 40), ' ', h('span', { class: 'ent27', tabindex: '0', ...ent27('org', o.id) }, T(o.name)), ' ', pill(T(KIND_NAME[o.kind])), down ? pill(T(l('desmantelada', 'dismantled')), 'good') : null),
        chips(stat('globe', `${cityName(o.city)} · ${T(countryName(o.a3))}`, l('Sede', 'Base')), stat('fire', o.power, l('Poder', 'Power')), stat('handshake', rel, l('Relação com você', 'Relationship with you'))),
        h('p', { class: 'small' }, T(o.desc)),
        h('p', { class: 'small muted' }, `${T(l('Negócios', 'Rackets'))}: ${o.rackets.map((r) => T(RACKET_NAME[r])).join(' · ')} · ${T(l('Chefe', 'Boss'))}: ${T(bossName(o))}`),
        // r29 (Submundo): relação visível, época, ligações (fonte única orglinks29), pedidos e interações (mob29)
        meterRow29(s, o.id),
        h('p', { class: 'small muted' }, T(era29(s, o).text)),
        // r29: facções × gêneros e cenas (afinidade cultural; nunca afirmação sobre pessoas)
        ...orgAff29(s, o.id).map((x) => h('p', { class: 'small' }, pill(T(x.doc ? l('cena documentada', 'documented scene') : l('afinidade de jogo', 'game affinity')), x.doc ? 'trait' : ''), ` ${T(x.scene)} — `, h('span', { class: 'muted' }, T(x.note)))),
        membersBox(s, o.id),
        asksBox29(s, o.id),
        h('details', { class: 'small' }, h('summary', null, `${T(l('Negócios com a família', 'Dealings with the family'))} (${mobActs29(s, o.id).filter((x) => !x.block).length}/${mobActs29(s, o.id).length})`), h('div', { class: 'row wrap' },
          ...mobActs29(s, o.id).map((x) => btn(x.cost ? `${T(x.a.name)} (${T(usd(x.cost))})` : x.a.name, () => { const r = doMob29(s, o.id, x.a.id); say(r.text, r.ok ? 'info' : 'bad'); }, { dis: !!x.block, title: x.block ? T(x.block) : `${T(x.a.desc)} ${T(x.a.fx)}${x.chance !== undefined ? ` · ${P(x.chance)}` : ''}`, cls: x.a.id === 'inform' ? 'ghost' : '' })),
          st.pizzo[o.id] !== undefined ? pill(st.pizzo[o.id] > 0 ? `${T(l('pagando proteção', 'paying protection'))} ${T(usd(pizzoFee(s, o)))}` : T(l('recusou o pizzo', 'refused protection')), st.pizzo[o.id] > 0 ? 'warn' : 'bad') : null,
          (st.vend[o.id] ?? 0) > s.week ? pill(T(l('querem vingança', 'want revenge')), 'bad') : null,
        )),
        h('details', { class: 'small' }, h('summary', null, T(l('Contratar a família para…', 'Hire the family to…'))), h('div', { class: 'row wrap' },
          ...jobsFor29(o).map((j) => j.c.startsWith('x:')
            ? btn(j.name, () => { const t = jobTarget29(s, o.id, j.id); if (!t) { say(l('Sem alvo possível agora: use o menu de ações de um artista (clique direito).', 'No possible target now: use an act\'s action menu (right-click).'), 'bad'); return; } const r = hire29(s, o.id, j.id, t); say(r.text, r.ok ? 'good' : 'bad'); }, { cls: 'ghost', title: l('Executa direto no alvo possível (seu artista ou o escolhido no menu de ações).', 'Runs directly on the possible target (your act or the one picked in the action menu).') })
            : btn(j.name, () => { presetHire29(o.id, j.c, j.m); setTab('crime17', 'plans'); rerender(); }, { cls: 'ghost', title: l('Abre Planos com a família como executora: escolha o alvo, veja chance, taxa e o favor devido.', 'Opens Plans with the family as executor: pick the target, see odds, fee and the favor owed.') })))),
        mobLog29(s, o.id),
        (o.kind === 'gang' || o.kind === 'cartel' || o.kind === 'firm') && mine.length ? h('div', { class: 'row wrap' },
          h('small', { class: 'muted' }, T(l('Seu artista de rua com eles:', 'Your street artist with them:'))),
          ...mine.map((a) => tieOf(s, a!.id)?.id === o.id
            ? btn(fmtTxt(l('Cortar laços: {a}', 'Cut ties: {a}'), a!.name), () => say(cutTie(s, a!.id)), { cls: 'ghost' })
            : btn(a!.name, () => say(tieAct(s, a!.id, o.id)), { title: l('Proteção e credibilidade de rua (+5% de apelo em rap/funk/corridos), mas calor e rixas com gangues rivais.', 'Protection and street cred (+5% appeal for rap/funk/corridos), but heat and feuds with rival gangs.') }))) : null,
      );
    })),
    section(T(l('Rixas de rua', 'Street feuds')),
      feuds.length ? h('ul', { class: 'small' }, feuds.map(([k, v]) => {
        const [a, b] = k.split('|').map((id) => s.acts[id]);
        const mineF = [a, b].some((x) => x && (x.owner === 'player' || x.playerBand));
        return h('li', null, `${a?.name ?? '?'} × ${b?.name ?? '?'} `, bar(v), ' ', pill(v >= 85 ? T(l('tiros', 'shots')) : v >= 55 ? T(l('briga', 'brawl')) : v >= 25 ? T(l('diss', 'diss')) : T(l('tensão', 'tension')), v >= 55 ? 'bad' : 'warn'),
          mineF ? btn(fmtTxt(l('Trégua ({v})', 'Truce ({v})'), usd(truceCost(s))), () => say(truce(s, k))) : null);
      })) : h('p', { class: 'muted small' }, T(l('Nenhuma rixa. Artistas ligados a gangues rivais trocam diss (vende!), depois brigas e, no limite, tiros — só entre personagens fictícios.', 'No feuds. Artists tied to rival gangs trade disses (it sells!), then brawls and, at the limit, shots — fictional characters only.')))),
  );
}
/** r23 → r29: ligações com a organização — UMA fonte (orglinks29), a mesma da ficha da pessoa, do menu de ações e da
 *  busca: ligação documentada · membro (com posto/função e o que você sabe) · associado · deve favor · inimizade · sócio. */
function membersBox(s: GameState, oid: string): HTMLElement {
  const st = crime17(s);
  const o = orgById(s, oid)!;
  const links = orgLinks29(s, oid);
  const mem = st.mem23 ?? {};
  const gone = (st.gone23 ?? []).filter((g) => g.o === oid && g.how === 'informant');
  const pw = orgPower23(s, o);
  const nMem = links.filter((x) => x.kind === 'member').length;
  return h('details', { class: 'small', open: links.some((x) => x.kind === 'doc') || undefined },
    h('summary', null, `${T(l('Ligações', 'Ties'))} (${links.length}) · ${T(l('membros conhecidos', 'known members'))} ${nMem}${gone.length ? ` · ${T(l('delatores', 'informants'))} ${gone.length}` : ''}${pw < o.power ? ` · ${T(l('poder', 'power'))} ${o.power}→${pw}` : ''}`),
    links.length ? h('ul', null, links.map((x) => {
      const m = x.kind === 'member' ? mem[x.key] : undefined;
      return h('li', null,
        whoLink29(s, x.key), ' ', pill(T(LINK29[x.kind]), x.kind === 'doc' ? 'trait' : x.kind === 'enemy' ? 'bad' : x.kind === 'owes' ? 'warn' : ''), x.sim ? pill(T(LINKSIM29), 'warn') : null,
        x.y ? ` ${x.y}` : '',
        m ? [` — ${T(RANK23[m.rk])}, ${T(ROLE23[m.ro])} `, pill(m.k === 2 ? T(l('confirmado', 'confirmed')) : T(l('boato', 'rumor')), m.k === 2 ? 'bad' : 'warn')] : null,
        x.key.startsWith('s:') ? pill(T(l('sua equipe', 'your staff')), 'trait') : null,
        (st.jail[x.key.slice(2)]?.u ?? 0) > s.week ? pill(T(l('preso', 'jailed')), 'warn') : null,
        h('div', { class: 'muted' }, m ? `${T(l('Por quê', 'Why'))}: ${m.why.map((w) => T(w)).join(' · ')}` : T(x.text)));
    })) : h('p', { class: 'muted' }, T(l('Ninguém conhecido. Membros são segredo até virar boato (fama, prisão, crime exposto) ou a sua segurança descobrir.', 'Nobody known. Members are secret until rumors start (fame, prison, exposed crime) or your security finds out.'))),
    gone.length ? h('p', { class: 'muted' }, `${T(l('Delatores', 'Informants'))}: ${gone.slice(-5).map((g) => `${name23(s, g.k)} (${T(RANK23[g.rk])})`).join(', ')} — ${T(GONE23.informant)}`) : null,
    h('p', { class: 'muted' }, fmtTxt(l('Membros (todos, inclusive secretos) no país: {v} — a polícia presta atenção.', 'Members (all, secret included) in the country: {v} — police take notice.'), String(density23(s, o.a3)))),
  );
}
/** Nome com menu de ações (clique direito) de quem está ligado. */
function whoLink29(s: GameState, key: string): HTMLElement {
  if (key === 'player') return h('b', null, s.config.companyName);
  const id = key.startsWith('p:') ? key.slice(2) : key;
  const ent = s.acts[id] ? 'act' : s.labels[id] ? 'label' : 'person';
  return h('b', { class: 'ent27', tabindex: '0', ...ent27(ent, ent === 'person' ? (key.startsWith('p:') || key.includes(':') ? key : `p:${key}`) : id) }, nameOf17(s, id));
}
/** r29: respeito · medo · dívida · hostilidade com a família. */
function meterRow29(s: GameState, oid: string): HTMLElement {
  const m = meter29(s, oid);
  return h('div', { class: 'row wrap small' }, ...(Object.keys(METER29) as (keyof typeof METER29)[]).map((k) => h('span', { title: T(METER29[k]) }, `${T(METER29[k])} `, bar(m[k], 100, k === 'hostility' || k === 'debt' ? 'bad' : ''), ` ${m[k]} `)));
}
/** r29: favores cobrados e ofertas de trabalho (prazo de 4 semanas; vencido = recusa). */
function asksBox29(s: GameState, oid: string): HTMLElement | null {
  const xs = asks29(s, oid);
  if (!xs.length) return null;
  return h('div', { class: 'card' }, ...xs.map((a) => {
    const d = askDef29(a.k);
    return h('div', null,
      h('b', null, a.k === 'job' ? T(l('Oferta de trabalho', 'Job offer')) : T(l('Cobram o favor', 'Calling in the favor'))), `: ${T(d.name)} — `, h('i', null, T(d.desc)),
      h('p', { class: 'small muted' }, `${T(d.fx)} · ${T(l('prazo: semana', 'deadline: week'))} ${a.dl}`),
      h('div', { class: 'row wrap' },
        btn(a.k === 'job' ? l('Aceitar', 'Accept') : l('Cumprir', 'Do it'), () => { const r = fulfill29(s, a.id); say(r.text, r.ok ? 'good' : 'bad'); }, { cls: 'primary' }),
        !a.delay && !['job', 'baile', 'homage'].includes(a.k) ? btn(l('Negociar prazo (+4 sem.)', 'Negotiate (+4 wk)'), () => { const r = delay29(s, a.id); say(r.text, r.ok ? 'info' : 'bad'); }) : null,
        btn(l('Recusar', 'Refuse'), () => { const r = refuse29(s, a.id); say(r.text, 'bad'); }, { title: a.k === 'job' ? l('Sem consequência (por ora).', 'No consequence (for now).') : l('A dívida continua e a família escala: ameaça → sabotagem → violência.', 'The debt stands and the family escalates: threat → sabotage → violence.') })));
  }));
}
/** r29: últimas coisas entre você e a família. */
function mobLog29(s: GameState, oid: string): HTMLElement | null {
  const xs = (peek29(s)?.log ?? []).filter((x) => x[2] === oid).slice(-3).reverse();
  return xs.length ? h('ul', { class: 'small muted' }, xs.map((x) => h('li', null, `${x[1]} · `, T(x[3])))) : null;
}
const fmtTxt = (x: L, v: L | string): string => T(x).replace('{v}', T(v)).replace('{a}', T(v));

// ================================================================ Planos / Ações

const form = crimeForm17; // r29: rascunho compartilhado com o menu de ações (crimeform29.ts)

function plansTab(s: GameState): HTMLElement {
  const st = crime17(s);
  const d = crimeById(form.c) ?? CRIMES17[0];
  // r29: qualquer pessoa/ato/selo vale como alvo (seletor com busca); a lista de sempre vira sugestão e padrão
  const tg = targetsFor(s, d);
  form.target = targetId17(s, form.target);
  const world = d.tk === 'person' || d.tk === 'act' || d.tk === 'label';
  if (!form.target || (!world && !tg.some((x) => x.id === form.target))) form.target = tg[0]?.id ?? '';
  if (d.methods && !d.methods.some((m) => m.id === form.method)) form.method = d.methods[0].id;
  const executors = [{ value: 'player', label: `${T(l('Você', 'You'))} (${s.config.companyName})` },
    ...playerActs(s).flatMap((id) => s.acts[id]?.members.filter((m) => s.persons[m]?.alive && !s.persons[m].isPlayer).map((m) => ({ value: m, label: `${s.persons[m].name} (${s.acts[id].name})` })) ?? [])];
  // r29 (Submundo): "Contratar a família" — a organização executa (mob29.hire29), com taxa e favor devido
  executors.push(...orgs17(s, false, true).filter((o) => !((st.down[o.id] ?? 0) > s.week)).map((o) => ({ value: `hire:${o.id}`, label: `${T(l('Contratar', 'Hire'))} ${T(o.name)} (${T(l('a família executa', 'the family does it'))})` })));
  if (!executors.some((x) => x.value === form.actor)) form.actor = 'player';
  const hireO = form.actor.startsWith('hire:') ? form.actor.slice(5) : '';
  const cats = d.id === 'award_rig' ? awCatsOn29(s) : [];
  if (cats.length && !cats.includes(form.cat as never)) form.cat = cats[0];
  const ctx: Ctx17 = { actor: hireO ? 'player' : form.actor, target: form.target, method: d.methods ? form.method : undefined, org: hireO ? undefined : form.org || undefined, partners: hireO ? [] : form.partners, ...(cats.length ? { cat: form.cat } : {}) };
  const ho = hireO && form.target ? hireOdds29(s, hireO, d.id, form.target, ctx.method, ctx.cat) : null;
  const od = !form.target ? null : ho ? { p: ho.p, q: ho.q, cost: ho.cost, heat: ho.heatYou, sev: d.sev, a3: ho.a3, block: ho.block,
    why: [...ho.why, fmtL(l('Taxa da família {f} · você fica devendo um favor ({v}/100) que eles vão cobrar', 'Family fee {f} · you will owe a favor ({v}/100) they will call in'), { f: usd(ho.fee), v: ho.favor })] } : crimeOdds(s, ctx, d.id);
  const tb = form.target ? targetBlock17(s, d, form.target, hireO ? 'player' : form.actor) : null; // r29: alvo fora, com o motivo
  const blk = tb ?? od?.block ?? null;
  const labels = Object.values(s.labels).filter((x) => x.active).sort((a, b) => heat19(s, a.id) - heat19(s, b.id)).slice(0, 12);
  return h('div', null,
    st.warn.length ? section(T(l('Planos descobertos e convites', 'Discovered plots and invitations')), ...st.warn.map((w) => {
      const inv = w.partners.includes('invite');
      const dd = crimeById(w.c)!;
      const opts: WarnReply[] = inv ? ['join', 'decline'] : ['police', 'strike', 'pay', 'ignore'];
      return h('div', { class: 'card' },
        h('b', null, inv ? fmtTxt(l('{a} convida você', '{a} invites you'), nameOf17(s, w.actor)) : fmtTxt(l('{a} trama contra você', '{a} is plotting against you'), nameOf17(s, w.actor))),
        h('p', { class: 'small' }, `"${T(dd.name)}" → ${nameOf17(s, w.target)} · ${T(l('prazo: semana', 'deadline: week'))} ${w.dl}${w.partners.filter((p) => p !== 'invite').length ? ` · ${T(l('com', 'with'))} ${w.partners.filter((p) => p !== 'invite').map((p) => nameOf17(s, p)).join(', ')}` : ''}`),
        h('div', { class: 'row wrap' }, ...opts.map((o) => btn(o === 'pay' ? `${T(WARN_REPLY[o].name)} (${T(usd(payOffCost(s)))})` : WARN_REPLY[o].name, () => say(replyWarn(s, w.id, o)), { title: WARN_REPLY[o].hint }))),
        h('p', { class: 'muted small' }, T(l('Sem resposta até o prazo: o plano segue (avisado, você corta 20% da chance deles); convites expiram.', 'No reply by the deadline: the plot goes ahead (forewarned, you cut 20% of their odds); invitations expire.'))));
    })) : null,
    section(T(l('Montar um plano', 'Plan a job')),
      h('div', { class: 'row wrap' },
        select<string>(form.c, CRIMES17.map((c) => ({ value: c.id, label: `${T(c.name)}${c.extra ? ' ★' : ''}` })), (v) => { form.c = v; const nd = crimeById(v); if (!nd || !form.target || targetBlock17(s, nd, form.target, form.actor)) form.target = ''; rerender(); }),
        select<string>(form.actor, executors, (v) => { form.actor = v; rerender(); }, { title: T(l('Quem executa: você ou um artista seu (os traços e a fama dele contam; a exposição cai sobre ele).', 'Who carries it out: you or one of your artists (their traits and fame count; exposure falls on them).')) }),
        d.methods ? select<string>(form.method, d.methods.map((m) => ({ value: m.id, label: T(m.name) })), (v) => { form.method = v; rerender(); }) : null,
        cats.length ? select<string>(form.cat ?? cats[0], AWCAT29.filter((c) => cats.includes(c.id)).map((c) => ({ value: c.id, label: T(c.name(s)) })), (v) => { form.cat = v; rerender(); }, { title: T(l('Qual prêmio (indicação e noite da cerimônia).', 'Which award (nomination and ceremony night).')) }) : null, // r29: votação comprada
        select<string>(form.org, [{ value: '', label: T(l('Sem organização', 'No organization')) }, ...orgs17(s).filter((o) => (st.down[o.id] ?? 0) < s.week).map((o) => ({ value: o.id, label: `${T(o.name)} (${T(countryName(o.a3))})` }))], (v) => { form.org = v; rerender(); }),
      ),
      h('div', { class: 'row wrap' }, targetPicker29(s, d, form, (id) => { form.target = id; rerender(); }, form.actor)), // r29: todos os personagens
      h('p', { class: 'small' }, T(d.desc), d.methods ? ` ${T(d.methods.find((m) => m.id === form.method)?.desc ?? '')}` : ''),
      hireO ? null : h('div', { class: 'row wrap' }, h('small', { class: 'muted' }, T(l('Sócios (gravadoras):', 'Partners (labels):'))), ...labels.map((lb) => {
        const po = partnerOdds(s, lb.id, ctx);
        const on = form.partners.includes(lb.id);
        return h('label', { class: 'small', title: po.why.map(T).join(' · ') }, h('input', { type: 'checkbox', checked: on, onchange: () => { form.partners = on ? form.partners.filter((x) => x !== lb.id) : [...form.partners, lb.id].slice(-2); rerender(); } }), ` ${lb.name} (${P(po.p)} ${T(l('topa', 'accept'))}, ${P(po.betray)} ${T(l('trai', 'betray'))}) `);
      })),
      ho && ho.block && !ho.p ? h('div', { class: 'card' }, h('p', { class: 'small bad' }, T(ho.block))) // r29: a família não pega o serviço (motivo)
      : od ? h('div', { class: 'card' },
        chips(stat('sparkle', P(od.p), l('Chance de sucesso', 'Success odds')), stat('warning', P(od.q), l('Risco de exposição', 'Exposure risk')), stat('money', T(usd(od.cost)), l('Custo', 'Cost')), stat('fire', `+${od.heat}`, l('Calor', 'Heat')), stat('skull', od.sev, l('Gravidade', 'Severity'))),
        h('p', { class: 'small' }, `${T(l('Por quê', 'Why'))}: ${od.why.map(T).join(' · ') || '—'}`),
        h('p', { class: 'small muted' }, fmtTxt(l('Calor em {a}: {h}. Sucesso sem exposição = segredo (só testemunhas sabem e guardam isso contra você). Exposto = boato/manchete, escândalo com reação regional, caso policial, mágoa da vítima e rivalidade.', 'Heat in {a}: {h}. Success without exposure = a secret (only witnesses know, and keep it against you). Exposed = rumor/headline, scandal with regional reaction, police case, the victim\'s grievance and rivalry.'), countryName(od.a3)).replace('{h}', String(heatIn(s, od.a3)))),
        blk ? h('p', { class: 'small bad' }, T(blk)) : hireO ? btn(fmtL(l('Contratar {o}', 'Hire {o}'), { o: orgById(s, hireO)?.name ?? hireO }), () => { const r = hire29(s, hireO, d.id, form.target, ctx.method, ctx.cat); say(r.text, r.ok ? 'good' : 'bad'); }, { cls: 'primary' }) : btn(heistOn27(d.id) && screenOn27('heist', s, { data: { cid: d.id } }) ? l('🎮 Executar (planejar)', '🎮 Execute (plan)') : l('Executar', 'Execute'), () => {
          // r27 FLOW: um caminho só — quando a operação é jogável, "Executar" abre o plano (com "executar direto" dentro)
          if (screen27('heist', s, { data: { cid: d.id, ctx } }, () => exec27())) return;
          exec27();
        }, { cls: 'primary' }),
      ) : null,
    ),
  );
  function exec27(): void {
    const r = commitCrime(s, d.id, ctx);
    if (typeof r === 'object' && 'ok' in r) {
      const inv = form.partners.filter((p) => !r.joined.includes(p));
      say(`${T(r.ok ? l('Feito. ', 'Done. ') : l('Falhou. ', 'Failed. '))}${T(r.text)}${r.ex ? ` ${T(l('E vazou!', 'And it leaked!'))}` : ''}${inv.length ? ` ${T(l('Recusaram:', 'Declined:'))} ${inv.map((p) => nameOf17(s, p)).join(', ')}.` : ''}${r.betrayed.length ? ` ${T(l('Traidor(es):', 'Traitor(s):'))} ${r.betrayed.map((p) => nameOf17(s, p)).join(', ')}.` : ''}`, r.ok && !r.ex ? 'good' : 'bad');
    } else say(r, 'bad');
  }
}

// ================================================================ Mercado negro

function marketTab(s: GameState): HTMLElement {
  const st = crime17(s);
  const fs = fences(s);
  const stash = st.stash.map((id) => relics(s).list.find((x) => x.id === id)).filter(Boolean);
  const bootOrgs = orgs17(s).filter((o) => hasRacket(o, 'bootleg'));
  const famous = relics(s).list.filter((x) => x.v > 50000 && !st.fake[x.id]).sort((a, b) => b.v - a.v).slice(0, 6);
  return h('div', null,
    section(T(l('Seu esconderijo', 'Your hideout')),
      stash.length ? h('ul', null, stash.map((rl) => h('li', null, h('b', null, T(rl!.n)), st.fake[rl!.id] ? pill(T(l('réplica', 'replica')), 'warn') : null, h('div', { class: 'row wrap' },
        ...fs.map((f) => { const q = fenceQuote(s, rl!.id, f.i); return btn(`${T(f.name)}: ${T(usd(q.price))} · ${P(q.risk)} ${T(l('risco', 'risk'))}`, () => say(sellHot(s, rl!.id, f.i)), { title: `${T(f.desc)} ${q.why.map(T).join(' · ')}` }); }),
        st.fake[rl!.id] ? null : btn(l('Devolver e cobrar recompensa (10%)', 'Return for the reward (10%)'), () => say(returnHot(s, rl!.id), 'good'), { cls: 'ghost' }))))) : h('p', { class: 'muted small' }, T(l('Vazio. Relíquias roubadas (Planos → Roubar relíquia) ou compradas aqui ficam escondidas; a polícia pode achá-las (mais calor, mais buscas).', 'Empty. Relics stolen (Plans → Steal a relic) or bought here stay hidden; police may find them (more heat, more searches).'))),
      h('p', { class: 'muted small' }, T(l('Receptadores cobram corte e alguns são armadilhas da polícia. Peça "quente" vale menos; procedência duvidosa derruba o preço.', 'Fences take a cut and some are police stings. A "hot" piece is worth less; doubtful provenance cuts the price.')))),
    section(T(l('Ofertas no mercado negro', 'Black-market offers')),
      st.market.length ? (() => {
        const offerLi = (of: (typeof st.market)[number], rl: (typeof stash)[number] & object) => h('li', null, relicImg28(rl.k, rl.n.en, rl.y, rl.rr ?? rl.id, 24), ` ${T(rl.n)} — ${T(FENCES17[of.fence].name)} · ${T(usd(of.price))} · ${T(l('autenticidade estimada', 'estimated authenticity'))} ${P(of.auth)} · ${T(l('até semana', 'until week'))} ${of.until} `, btn(l('Comprar', 'Buy'), () => say(buyOffer(s, of.id)), { title: l('Pode ser falsa; receptação aumenta o calor.', 'May be fake; handling stolen goods raises heat.') }));
        const pairs = st.market.map((of) => [of, relics(s).list.find((x) => x.id === of.rl)] as const).filter((x) => !!x[1]);
        // R29: com muitas relíquias o mercado fica cheio — filtros e páginas acima de 6 ofertas
        if (pairs.length <= 6) return h('ul', null, ...pairs.map(([of, rl]) => offerLi(of, rl!)));
        return relicBrowser29(s, 'crime:market', pairs.map((x) => x[1]!), (rl) => offerLi(pairs.find((x) => x[1] === rl)![0], rl), { size: 8, owners: false, wrap: (kids) => h('ul', null, ...kids) });
      })() : h('p', { class: 'muted small' }, T(l('Nada à venda agora. Peças roubadas pelo mundo aparecem aqui com preço baixo — e risco.', 'Nothing for sale now. Pieces stolen around the world show up here cheap — and risky.')))),
    section(T(l('Falsificação', 'Forgery')),
      h('p', { class: 'small muted' }, T(l('Encomende uma réplica de peça famosa e venda como verdadeira: o comprador desconfia (autenticidade baixa).', 'Commission a replica of a famous piece and sell it as genuine: buyers get suspicious (low authenticity).'))),
      h('div', { class: 'row wrap' }, ...famous.map((rl) => btn(`${T(rl.n)} (${T(usd(forgeCost(s, rl.v)))})`, () => say(forgeRelic(s, rl.id)), { title: fmtTxt(l('Autenticidade percebida {v}', 'Perceived authenticity {v}'), P(0.25)) })))),
    section(T(l('Pirataria (bootlegs)', 'Bootleg rings')),
      h('p', { class: 'small muted' }, T(l('Fábricas piratas copiam seus sucessos recentes e você perde vendas. Uma batida com a polícia fecha a fábrica por um ano.', 'Bootleg plants copy your recent hits and you lose sales. A police raid shuts the plant for a year.'))),
      h('ul', { class: 'small' }, bootOrgs.map((o) => h('li', null, orgEmblem(o, 20), ` ${T(o.name)} (${T(countryName(o.a3))}) `, (st.boot[o.id] ?? 0) > s.week ? pill(T(l('fechada', 'shut')), 'good') : btn(fmtTxt(l('Batida ({v})', 'Raid ({v})'), usd(raidCost(s))), () => say(raidBootleggers(s, o.id)), { title: l('~55% (+ Jurídico) de fechar por 1 ano; relação com eles −20.', '~55% (+ Legal) to shut it for 1 year; relationship −20.') }))))),
  );
}

// ================================================================ Investigações / Polícia

function policeTab(s: GameState): HTMLElement {
  const st = crime17(s);
  const heat = Object.entries(st.heat).sort((a, b) => b[1] - a[1]);
  const cases = myCases(s);
  const jailed = Object.entries(st.jail).filter(([, j]) => j.u > s.week);
  const others = st.cases.filter((c) => c.who !== 'player' && c.stage !== 'closed').slice(-8);
  return h('div', null,
    section(T(l('Calor policial', 'Police heat')),
      heat.length ? h('ul', null, heat.map(([a3, v]) => h('li', null, `${T(countryName(a3))} — ${T(agency(s, a3))} `, bar(v), ` ${Math.round(v)}`, st.exile[a3] ? pill(T(l('foragido', 'fugitive')), 'bad') : v >= 60 ? pill(T(l('investigação aberta', 'investigation open')), 'bad') : v >= 50 ? pill(T(l('turnês arriscadas', 'risky tours')), 'warn') : null))) : h('p', { class: 'muted small' }, T(l('Ficha limpa em todos os países.', 'Clean record everywhere.'))),
      h('p', { class: 'small muted' }, `${T(l('Calor cai 3/mês. 50+: shows do selo no país correm mais risco. 60+: abre investigação. Perícia da época', 'Heat drops 3/month. 50+: your shows in that country are riskier. 60+: an investigation opens. Forensics of the era'))}: ${T(forensic(s.year).why)}.${st.parole > s.week ? ` ${T(l('Você está em liberdade condicional.', 'You are on parole.'))}` : ''}`)),
    section(T(l('Seus casos', 'Your cases')),
      cases.length ? h('div', null, cases.map((cs) => {
        const tr = trialOdds(s, cs);
        return h('div', { class: 'card' },
          h('b', null, `${T(agency(s, cs.a3))} · ${T(countryName(cs.a3))}`), ' ', pill(cs.stage === 'charged' ? T(l('indiciado', 'charged')) : T(l('investigação', 'investigation')), cs.stage === 'charged' ? 'bad' : 'warn'), cs.rico ? pill(T(ricoName(s, cs.a3) ?? l('RICO')), 'bad') : null,
          h('div', null, T(l('Provas', 'Evidence')), ' ', bar(cs.ev), ` ${Math.round(cs.ev)}/70 · ${cs.n} ${T(l('crime(s)', 'crime(s)'))}${cs.inf.length ? ` · ${T(l('informantes', 'informants'))}: ${cs.inf.map((x) => nameOf17(s, x)).join(', ')}` : ''}`),
          cs.stage === 'charged' ? h('div', null,
            h('p', { class: 'small' }, `${T(l('Absolvição no julgamento', 'Acquittal at trial'))}: ${P(tr.p)} — ${tr.why.map(T).join(' · ')} · ${T(l('multa se condenado', 'fine if convicted'))} ${T(usd(fineOf(s, cs)))} · ${T(l('prazo: semana', 'deadline: week'))} ${cs.dl}`),
            h('div', { class: 'row wrap' }, ...(Object.keys(PLEA17) as Plea[]).map((k) => btn(PLEA17[k].name, () => say(resolveCase(s, cs.id, k), 'info'), { title: PLEA17[k].hint })))) : h('p', { class: 'small muted' }, T(l('Com 70 de provas vem o indiciamento. Subornar (Planos → Subornar) reduz provas; Jurídico freia a investigação; lavagem e informantes aceleram.', 'At 70 evidence comes the indictment. Bribes (Plans → Bribe) cut evidence; Legal staff slows the probe; laundering and informants speed it up.'))));
      })) : h('p', { class: 'muted small' }, T(l('Nenhuma investigação contra você.', 'No investigation against you.')))),
    section(T(l('Segurança e guarda-costas', 'Security and bodyguards')),
      h('div', { class: 'row wrap' }, select<number>(st.sec, SEC17.map((x, i) => ({ value: i, label: `${T(x.name)} — ${T(usd(money(s, x.cost)))}/${T(l('mês', 'mo'))}` })), (v) => say(setSecurity(s, v) ?? l('Segurança ajustada.', 'Security set.'), 'good'))),
      h('p', { class: 'small muted' }, `${T(SEC17[st.sec].desc)} ${T(l('Reduz a chance de crimes contra você e seus artistas e aumenta a chance de descobrir planos antes.', 'Cuts the odds of crimes against you and your artists and raises the chance of uncovering plots in advance.'))}`)),
    jailed.length ? section(T(l('Atrás das grades', 'Behind bars')), h('ul', { class: 'small' }, jailed.slice(0, 12).map(([pid, j]) => h('li', null, `${s.persons[pid]?.name ?? '?'} — ${T(countryName(j.a3))} · ${T(l('sai na semana', 'out by week'))} ${j.u}${j.album ? ` · ${T(l('gravando de dentro', 'recording from inside'))}` : ''}`)))) : null,
    others.length ? section(T(l('Outros casos em andamento', 'Other ongoing cases')), h('ul', { class: 'small' }, others.map((c) => h('li', null, `${nameOf17(s, c.who)} — ${T(agency(s, c.a3))} `, bar(c.ev), c.stage === 'charged' ? pill(T(l('indiciado', 'charged')), 'bad') : null)))) : null,
  );
}

// ================================================================ Histórico

function historyTab(s: GameState): HTMLElement {
  const st = crime17(s);
  const mine = st.log.filter((x) => x.mine || x.ex).slice(-30).reverse();
  const docs = recentFacts(s, { kind: 'crime_doc', limit: 12 });
  const pub = recentFacts(s, { tag: 'crime', notSecret: true, limit: 20 }).filter((f) => f.kind !== 'crime_doc');
  return h('div', null,
    section(T(l('Seu dossiê', 'Your file')), mine.length ? h('ul', { class: 'small' }, mine.map((e) => h('li', null, h('span', { class: 'muted' }, `${monthName(e.m)} ${e.y} `), pill(e.ok ? T(l('sucesso', 'success')) : T(l('falhou', 'failed')), e.ok ? 'good' : 'warn'), e.ex ? pill(T(l('exposto', 'exposed')), 'bad') : pill(T(l('segredo', 'secret')), 'trait'), ' ', T(e.text)))) : h('p', { class: 'muted small' }, T(l('Nada no seu dossiê… ainda.', 'Nothing in your file… yet.')))),
    section(T(l('Nas ruas e nos jornais', 'On the streets and in the papers')), pub.length ? h('ul', { class: 'small' }, pub.map((f) => h('li', null, h('span', { class: 'muted' }, `${monthName(f.m)} ${f.y} `), pill(f.visibility === 'rumor' ? T(l('boato', 'rumor')) : T(l('público', 'public')), f.visibility === 'rumor' ? 'warn' : ''), ' ', T(f.text)))) : h('p', { class: 'muted small' }, '—')),
    section(T(l('Crônica real do crime na música', 'Real chronicle of crime in music')), docs.length ? h('ul', { class: 'small' }, docs.map((f) => h('li', null, h('span', { class: 'muted' }, `${f.y} `), T(f.text)))) : h('p', { class: 'muted small' }, T(l('Os casos reais documentados aparecem quando a história chega neles.', 'Documented real cases appear when history reaches them.')))),
  );
}

// ================================================================ área

function crimeArea(s: GameState): HTMLElement {
  const st = crime17(s);
  const charged = myCases(s).filter((c) => c.stage === 'charged').length;
  return h('div', { class: 'hub' }, tabs('crime17', [
    { id: 'orgs', label: t(l('Organizações', 'Organizations')), icon: 'handshake', render: () => orgsTab(s) },
    { id: 'plans', label: t(l('Planos/Ações', 'Plans/Actions')), icon: 'skull', badge: st.warn.length || undefined, render: () => plansTab(s) },
    { id: 'spy', label: t(l('Espionagem', 'Espionage')), icon: 'camera', render: () => h('div', null, rivalsExtra(s), intriguePanel(s)) },
    { id: 'market', label: t(l('Mercado negro', 'Black market')), icon: 'vault', badge: st.stash.length || undefined, render: () => marketTab(s) },
    { id: 'police', label: t(l('Investigações/Polícia', 'Investigations/Police')), icon: 'gavel', badge: charged || undefined, render: () => policeTab(s) },
    { id: 'log', label: t(l('Histórico', 'History')), icon: 'newspaper', render: () => historyTab(s) },
  ], rerender));
}

registerArea({ id: 'crime', label: l('Crime', 'Crime'), icon: 'skull', key: ';', render: crimeArea, badge: (s) => (crime17(s).warn.length + myCases(s).filter((c) => c.stage === 'charged').length) || undefined });
export const _crimeUi17 = { isReal };
