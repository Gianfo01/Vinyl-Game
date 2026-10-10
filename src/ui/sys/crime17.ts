// Rodada 17 — menu CRIME: Organizações · Planos/Ações · Espionagem (movida de Gravadoras/Mercado) · Mercado negro ·
// Investigações/Polícia · Histórico. Toda ação mostra chance, risco de exposição, custo, calor e o porquê.

import { countryName } from '../../data/geo';
import { KIND_NAME, RACKET_NAME } from '../../data/orgs17';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { recentFacts } from '../../sim/facts17';
import { histMode } from '../../sim/history15';
import {
  CRIMES17, FENCES17, PLEA17, SEC17, agency, approachOrg, bossName, buyOffer, commitCrime, crime17, crimeById, crimeOdds, fenceQuote, fences, fineOf,
  forensic, forgeCost, forgeRelic, hasRacket, heatIn, isReal, launderFee, myCases, nameOf17, orgs17, partnerOdds, pizzoFee, raidBootleggers, raidCost, reportOrg, resolveCase,
  returnHot, ricoName, sellHot, setSecurity, targetsFor, toggleLaunder, trialOdds, usd, type Ctx17, type Plea,
} from '../../sim/sys/crime17';
import { WARN_REPLY, cutTie, payOffCost, replyWarn, tieAct, tieOf, truce, truceCost, type WarnReply } from '../../sim/sys/crimenpc17';
import { relics } from '../../sim/sys/relics9';
import type { GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { rivalsExtra } from '../panels/discovery';
import { cityName, monthName, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { registerArea } from '../registry';
import { chips, stat, tabs } from '../vis';
import { intriguePanel } from './intrigue';

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const say = (x: L | string, tone: 'good' | 'bad' | 'info' = 'info') => { toast(T(x), tone); rerender(); };
const P = (x: number): string => `${Math.round(x * 100)}%`;
const btn = (label: L | string, fn: () => void, o: { title?: L | string; dis?: boolean; cls?: string } = {}) =>
  h('button', { class: `btn small ${o.cls ?? ''}`, disabled: !!o.dis, title: o.title ? T(o.title) : '', onclick: fn }, T(label));

// ================================================================ Organizações

function orgsTab(s: GameState): HTMLElement {
  const st = crime17(s);
  const strict = histMode(s) === 'strict';
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
  const list = orgs17(s).sort((a, b) => (b.a3 === orgs17(s).find((o) => o.id === 'fnoite')?.a3 ? 1 : 0) - (a.a3 === orgs17(s).find((o) => o.id === 'fnoite')?.a3 ? 1 : 0) || b.power - a.power);
  const feuds = Object.entries(st.feud).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return h('div', null,
    h('p', { class: 'muted small' }, T(l(
      'Organizações ativas nesta época. As reais trazem apenas laços documentados; ' + (strict ? 'no modo Vida real exata nada é inventado para pessoas reais.' : 'nos modos livres, laços novos de pessoas reais aparecem só como boato.') + ' Assassinato nunca envolve pessoas reais.',
      'Organizations active in this era. Real ones only show documented ties; ' + (strict ? 'in Exact real life mode nothing is invented for real people.' : 'in free modes, new ties of real people only appear as rumors.') + ' Murder never involves real people.'))),
    h('div', { class: 'cards' }, list.map((o) => {
      const rel = Math.round(st.org[o.id] ?? 0);
      const tied = Object.entries(st.ties).filter(([, oid]) => oid === o.id).map(([aid]) => s.acts[aid]).filter(Boolean);
      const down = (st.down[o.id] ?? 0) > s.week;
      return h('section', { class: 'card' },
        h('h3', null, T(o.name), ' ', pill(T(KIND_NAME[o.kind])), o.real ? pill(T(l('real', 'real')), 'trait') : pill(T(l('fictícia', 'fictional'))), down ? pill(T(l('desmantelada', 'dismantled')), 'good') : null),
        chips(stat('globe', `${cityName(o.city)} · ${T(countryName(o.a3))}`, l('Sede', 'Base')), stat('fire', o.power, l('Poder', 'Power')), stat('handshake', rel, l('Relação com você', 'Relationship with you'))),
        h('p', { class: 'small' }, T(o.desc)),
        h('p', { class: 'small muted' }, `${T(l('Negócios', 'Rackets'))}: ${o.rackets.map((r) => T(RACKET_NAME[r])).join(' · ')} · ${T(l('Chefe', 'Boss'))}: ${T(bossName(o))}`),
        o.ties?.length ? h('ul', { class: 'small' }, o.ties.filter((x) => x.y <= s.year).map((x) => h('li', null, pill(T(l('documentado', 'documented')), 'good'), ` ${x.who} (${x.y}): ${T(x.text)}`))) : null,
        tied.length ? h('p', { class: 'small' }, `${T(l('Andam com eles', 'Run with them'))}: ${tied.map((a) => `${a!.name}${a!.catalogNo ? ` (${T(l('boato', 'rumor'))})` : ''}`).join(', ')}`) : null,
        h('div', { class: 'row wrap' },
          btn(l('Aproximar-se (presente)', 'Approach (gift)'), () => say(approachOrg(s, o.id), 'info'), { title: l('Relação +15; calor +3. Relação boa barateia e melhora serviços.', 'Relationship +15; heat +3. Good relations make services better.') }),
          hasRacket(o, 'laundering') ? btn(st.laund[o.id] ? l('Parar de lavar', 'Stop laundering') : fmtTxt(l('Lavar dinheiro ({v}/mês)', 'Launder money ({v}/mo)'), usd(launderFee(s, o))), () => say(toggleLaunder(s, o.id), 'info'), { title: l('Renda mensal; calor +3/mês; eles guardam um segredo provado seu; casos viram crime organizado.', 'Monthly income; heat +3/month; they hold a proven secret on you; cases become organized crime.') }) : null,
          btn(l('Denunciar', 'Report'), () => say(reportOrg(s, o.id), 'info'), { cls: 'ghost', title: l('Reputação +3, calor −15, caso contra eles; vingança por 18 meses.', 'Reputation +3, heat −15, case on them; revenge for 18 months.') }),
          st.pizzo[o.id] !== undefined ? pill(st.pizzo[o.id] > 0 ? `${T(l('pagando proteção', 'paying protection'))} ${T(usd(pizzoFee(s, o)))}` : T(l('recusou o pizzo', 'refused protection')), st.pizzo[o.id] > 0 ? 'warn' : 'bad') : null,
          (st.vend[o.id] ?? 0) > s.week ? pill(T(l('querem vingança', 'want revenge')), 'bad') : null,
        ),
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
const fmtTxt = (x: L, v: L | string): string => T(x).replace('{v}', T(v)).replace('{a}', T(v));

// ================================================================ Planos / Ações

const form: { c: string; actor: string; target: string; method: string; org: string; partners: string[] } = { c: 'blackmail', actor: 'player', target: '', method: '', org: '', partners: [] };

function plansTab(s: GameState): HTMLElement {
  const st = crime17(s);
  const d = crimeById(form.c) ?? CRIMES17[0];
  const tg = targetsFor(s, d);
  if (!tg.some((x) => x.id === form.target)) form.target = tg[0]?.id ?? '';
  if (d.methods && !d.methods.some((m) => m.id === form.method)) form.method = d.methods[0].id;
  const executors = [{ value: 'player', label: `${T(l('Você', 'You'))} (${s.config.companyName})` },
    ...playerActs(s).flatMap((id) => s.acts[id]?.members.filter((m) => s.persons[m]?.alive && !s.persons[m].isPlayer).map((m) => ({ value: m, label: `${s.persons[m].name} (${s.acts[id].name})` })) ?? [])];
  if (!executors.some((x) => x.value === form.actor)) form.actor = 'player';
  const ctx: Ctx17 = { actor: form.actor, target: form.target, method: d.methods ? form.method : undefined, org: form.org || undefined, partners: form.partners };
  const od = form.target ? crimeOdds(s, ctx, d.id) : null;
  const labels = Object.values(s.labels).filter((x) => x.active).sort((a, b) => (s.rivalries[a.id] ?? 0) - (s.rivalries[b.id] ?? 0)).slice(0, 12);
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
        select<string>(form.c, CRIMES17.map((c) => ({ value: c.id, label: `${T(c.name)}${c.extra ? ' ★' : ''}` })), (v) => { form.c = v; form.target = ''; rerender(); }),
        select<string>(form.actor, executors, (v) => { form.actor = v; rerender(); }, { title: T(l('Quem executa: você ou um artista seu (os traços e a fama dele contam; a exposição cai sobre ele).', 'Who carries it out: you or one of your artists (their traits and fame count; exposure falls on them).')) }),
        tg.length ? select<string>(form.target, tg.map((x) => ({ value: x.id, label: T(x.name) })), (v) => { form.target = v; rerender(); }) : h('span', { class: 'muted small' }, T(l('Sem alvos possíveis.', 'No possible targets.'))),
        d.methods ? select<string>(form.method, d.methods.map((m) => ({ value: m.id, label: T(m.name) })), (v) => { form.method = v; rerender(); }) : null,
        select<string>(form.org, [{ value: '', label: T(l('Sem organização', 'No organization')) }, ...orgs17(s).filter((o) => (st.down[o.id] ?? 0) < s.week).map((o) => ({ value: o.id, label: `${T(o.name)} (${T(countryName(o.a3))})` }))], (v) => { form.org = v; rerender(); }),
      ),
      h('p', { class: 'small' }, T(d.desc), d.methods ? ` ${T(d.methods.find((m) => m.id === form.method)?.desc ?? '')}` : ''),
      h('div', { class: 'row wrap' }, h('small', { class: 'muted' }, T(l('Sócios (gravadoras):', 'Partners (labels):'))), ...labels.map((lb) => {
        const po = partnerOdds(s, lb.id, ctx);
        const on = form.partners.includes(lb.id);
        return h('label', { class: 'small', title: po.why.map(T).join(' · ') }, h('input', { type: 'checkbox', checked: on, onchange: () => { form.partners = on ? form.partners.filter((x) => x !== lb.id) : [...form.partners, lb.id].slice(-2); rerender(); } }), ` ${lb.name} (${P(po.p)} ${T(l('topa', 'accept'))}, ${P(po.betray)} ${T(l('trai', 'betray'))}) `);
      })),
      od ? h('div', { class: 'card' },
        chips(stat('sparkle', P(od.p), l('Chance de sucesso', 'Success odds')), stat('warning', P(od.q), l('Risco de exposição', 'Exposure risk')), stat('money', T(usd(od.cost)), l('Custo', 'Cost')), stat('fire', `+${od.heat}`, l('Calor', 'Heat')), stat('skull', od.sev, l('Gravidade', 'Severity'))),
        h('p', { class: 'small' }, `${T(l('Por quê', 'Why'))}: ${od.why.map(T).join(' · ') || '—'}`),
        h('p', { class: 'small muted' }, fmtTxt(l('Calor em {a}: {h}. Sucesso sem exposição = segredo (só testemunhas sabem e guardam isso contra você). Exposto = boato/manchete, escândalo com reação regional, caso policial, mágoa da vítima e rivalidade.', 'Heat in {a}: {h}. Success without exposure = a secret (only witnesses know, and keep it against you). Exposed = rumor/headline, scandal with regional reaction, police case, the victim\'s grievance and rivalry.'), countryName(od.a3)).replace('{h}', String(heatIn(s, od.a3)))),
        od.block ? h('p', { class: 'small bad' }, T(od.block)) : btn(l('Executar', 'Execute'), () => {
          const r = commitCrime(s, d.id, ctx);
          if (typeof r === 'object' && 'ok' in r) {
            const inv = form.partners.filter((p) => !r.joined.includes(p));
            say(`${T(r.ok ? l('Feito. ', 'Done. ') : l('Falhou. ', 'Failed. '))}${T(r.text)}${r.ex ? ` ${T(l('E vazou!', 'And it leaked!'))}` : ''}${inv.length ? ` ${T(l('Recusaram:', 'Declined:'))} ${inv.map((p) => nameOf17(s, p)).join(', ')}.` : ''}${r.betrayed.length ? ` ${T(l('Traidor(es):', 'Traitor(s):'))} ${r.betrayed.map((p) => nameOf17(s, p)).join(', ')}.` : ''}`, r.ok && !r.ex ? 'good' : 'bad');
          } else say(r, 'bad');
        }, { cls: 'primary' })) : null,
    ),
  );
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
      st.market.length ? h('ul', null, st.market.map((of) => { const rl = relics(s).list.find((x) => x.id === of.rl); return rl ? h('li', null, `${T(rl.n)} — ${T(FENCES17[of.fence].name)} · ${T(usd(of.price))} · ${T(l('autenticidade estimada', 'estimated authenticity'))} ${P(of.auth)} · ${T(l('até semana', 'until week'))} ${of.until} `, btn(l('Comprar', 'Buy'), () => say(buyOffer(s, of.id)), { title: l('Pode ser falsa; receptação aumenta o calor.', 'May be fake; handling stolen goods raises heat.') })) : null; })) : h('p', { class: 'muted small' }, T(l('Nada à venda agora. Peças roubadas pelo mundo aparecem aqui com preço baixo — e risco.', 'Nothing for sale now. Pieces stolen around the world show up here cheap — and risky.')))),
    section(T(l('Falsificação', 'Forgery')),
      h('p', { class: 'small muted' }, T(l('Encomende uma réplica de peça famosa e venda como verdadeira: o comprador desconfia (autenticidade baixa).', 'Commission a replica of a famous piece and sell it as genuine: buyers get suspicious (low authenticity).'))),
      h('div', { class: 'row wrap' }, ...famous.map((rl) => btn(`${T(rl.n)} (${T(usd(forgeCost(s, rl.v)))})`, () => say(forgeRelic(s, rl.id)), { title: fmtTxt(l('Autenticidade percebida {v}', 'Perceived authenticity {v}'), P(0.25)) })))),
    section(T(l('Pirataria (bootlegs)', 'Bootleg rings')),
      h('p', { class: 'small muted' }, T(l('Fábricas piratas copiam seus sucessos recentes e você perde vendas. Uma batida com a polícia fecha a fábrica por um ano.', 'Bootleg plants copy your recent hits and you lose sales. A police raid shuts the plant for a year.'))),
      h('ul', { class: 'small' }, bootOrgs.map((o) => h('li', null, `${T(o.name)} (${T(countryName(o.a3))}) `, (st.boot[o.id] ?? 0) > s.week ? pill(T(l('fechada', 'shut')), 'good') : btn(fmtTxt(l('Batida ({v})', 'Raid ({v})'), usd(raidCost(s))), () => say(raidBootleggers(s, o.id)), { title: l('~55% (+ Jurídico) de fechar por 1 ano; relação com eles −20.', '~55% (+ Legal) to shut it for 1 year; relationship −20.') }))))),
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
