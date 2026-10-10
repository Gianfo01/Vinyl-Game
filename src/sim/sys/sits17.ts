// Rodada 17 — situações-semente do diretor (usam Facts, obrigações, estresse e o pipeline de escândalo).
// Cada uma acontece com NPCs (escolha pelos traços) ou com você (cartão na mesa). Desfechos com chance e custo
// à vista no texto da opção; o que der errado vira Fact (e boato, se público).

import { clamp } from '../../core/rng';
import { l } from '../../data/world';
import { isStrict, viewsOf } from '../beliefs';
import { grantHold, holds17, holdsOf, type Hold } from '../holds17';
import { scandal, lastScandal } from '../scandal17';
import { addStress, relieveLong, stressOf } from '../stress17';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { f16 } from './fame16';
import { leaders } from './leaders10';
import { P, healthOf } from './people/state';
import { registerSituation, type SitCtx } from './situations17';

const pay = (s: GameState, ctx: SitCtx, key: string, real: number, memo: string): void => {
  const act = ctx.act ? s.acts[ctx.act] : undefined;
  const v = money(s, real);
  if (!act || act.owner === 'player' || ctx.hero === 'player') post(s, `sit17:${key}:${s.week}`, -v, 'misc', memo);
  else { const lb = act.owner ? s.labels[act.owner] : undefined; if (lb) lb.cash -= v; else act.cash -= v; }
};
const live = (a?: Act): a is Act => !!a && (a.status === 'active' || a.status === 'emerging');
const notable = (s: GameState): Act[] => { const mine = new Set(playerActs(s)); return Object.values(s.acts).filter((a) => live(a) && (mine.has(a.id) || a.fame >= 30)); };
const leadOf = (s: GameState, a: Act): Person | undefined => s.persons[a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0]];
const F = (P0: { facets: Record<string, number> } | null, k: string): number => (P0?.facets[k] ?? 50) / 50;
const nm = (s: GameState, id: string): string => s.persons[id]?.name ?? s.acts[id]?.name ?? s.labels[id]?.name ?? leaders(s)?.L[id.replace(/^l:/, '')]?.name ?? '?';

// 1 ---------------------------------------------------------------- no limite (corpo)
registerSituation({
  id: 'burnout', pressure: 'body', cost: 2, cooldown: 4,
  when: () => true,
  actorsPick: (s) => {
    let best: [Person, Act, number] | null = null;
    for (const a of notable(s)) for (const id of a.members) {
      const p = s.persons[id];
      if (!p?.alive || p.isPlayer) continue;
      const x = stressOf(s, id);
      if (x.short > 55 && x.long > 20 && (!best || x.short + x.long > best[2])) best = [p, a, x.short + x.long];
    }
    return best ? { hero: best[0].id, act: best[1].id, cast: { person: best[0].id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('{p} está no limite', '{p} is at the limit'), { p: nm(s, c.hero) }),
  text: (s, c) => { const x = stressOf(s, c.hero); return fmtL(l('{p} ({a}) acumula estresse {x} (desgaste de longo prazo {y}). Motivos: {w}. Se nada mudar, a quebra vem.', '{p} ({a}) carries stress {x} (long-term wear {y}). Reasons: {w}. If nothing changes, a breakdown is coming.'), { p: nm(s, c.hero), a: nm(s, c.act!), x: x.short, y: x.long, w: x.why.map((w) => w.pt).slice(0, 2).join('; ') || '—' }); },
  options: [
    { id: 'rest', label: l('Um mês de folga', 'A month off'), hint: l('−30 estresse, −10 desgaste; o ato perde embalo (−6 momento).', '−30 stress, −10 wear; the act loses momentum (−6).'), weightByTraits: (P0) => F(P0, 'paciencia') + F(P0, 'ansiedade') * 0.5,
      apply: (s, c) => { addStress(s, c.hero, -30, l('Folga', 'Time off')); relieveLong(s, c.hero, 10); const a = s.acts[c.act!]; if (a) { a.momentum = clamp(a.momentum - 6, 0, 100); a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + 4); } } },
    { id: 'therapy', label: l('Pagar terapia', 'Pay for therapy'), hint: l('Custa $1.500 (era): −20 estresse, −15 desgaste.', 'Costs $1,500 (era): −20 stress, −15 wear.'), weightByTraits: (P0) => F(P0, 'empatia') + F(P0, 'curiosidade') * 0.5,
      apply: (s, c) => { pay(s, c, 'therapy', 1500, 'Terapia'); addStress(s, c.hero, -20, l('Terapia', 'Therapy')); relieveLong(s, c.hero, 15); } },
    { id: 'push', label: l('Seguir a agenda', 'Keep the schedule'), hint: l('+10 estresse; 35% de surto em público (escândalo).', '+10 stress; 35% chance of a public meltdown (scandal).'), weightByTraits: (P0) => F(P0, 'ambicao') + F(P0, 'ego') * 0.6,
      apply: (s, c, r) => {
        addStress(s, c.hero, 10, l('Agenda sem pausa', 'No-break schedule'));
        if (r.chance(0.35)) { scandal(s, c.act!, 'meltdown', 40, fmtL(l('Exausto(a), {p} surta em público.', 'Exhausted, {p} melts down in public.'), { p: nm(s, c.hero) }), { person: c.hero }); return fmtL(l('{p} seguiu a agenda e surtou em público.', '{p} kept going and melted down in public.'), { p: nm(s, c.hero) }); }
      } },
  ],
});

// 2 ---------------------------------------------------------------- luto (coração)
registerSituation({
  id: 'grief', pressure: 'heart', cost: 1, cooldown: 3, trigger: ['death'],
  when: (s, c) => !!c.fact,
  actorsPick: (s, c) => {
    const dead = new Set(c.fact!.actors.filter((id) => s.persons[id] && !s.persons[id].alive));
    const a = c.fact!.actors.map((id) => s.acts[id]).find((x) => live(x) && x.members.some((m) => s.persons[m]?.alive && !dead.has(m)));
    const lead = a ? a.members.map((m) => s.persons[m]).find((p) => p?.alive && !dead.has(p.id)) : undefined;
    return a && lead ? { hero: lead.id, act: a.id, cast: { person: lead.id }, data: { dead: [...dead].map((id) => s.persons[id]?.name).join(', ') || '?' }, fact: c.fact } : null;
  },
  title: (s, c) => fmtL(l('Luto em {a}', 'Grief in {a}'), { a: nm(s, c.act!) }),
  text: (s, c) => fmtL(l('{a} perdeu {d}. Como seguir?', '{a} lost {d}. How to carry on?'), { a: nm(s, c.act!), d: String(c.data.dead) }),
  options: [
    { id: 'tribute', label: l('Canções em homenagem', 'Tribute songs'), hint: l('Inspiração +25, estresse −10, momento +5.', 'Inspiration +25, stress −10, momentum +5.'), weightByTraits: (P0) => F(P0, 'melancolia') + F(P0, 'romantismo'),
      apply: (s, c) => { const a = s.acts[c.act!]; if (!a) return; for (const m of a.members) { const p = s.persons[m]; if (p?.alive) { p.inspiration = clamp(p.inspiration + 25, 0, 100); addStress(s, m, -10, l('Homenagem', 'Tribute')); } } a.momentum = clamp(a.momentum + 5, 0, 100); } },
    { id: 'pause', label: l('Parar por dois meses', 'Pause for two months'), hint: l('Estresse −20 e desgaste −8; sem shows nem gravações.', 'Stress −20 and wear −8; no shows or recording.'), weightByTraits: (P0) => F(P0, 'empatia') + F(P0, 'paciencia'),
      apply: (s, c) => { const a = s.acts[c.act!]; if (!a) return; a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + 8); for (const m of a.members) { addStress(s, m, -20, l('Luto em paz', 'Grieving in peace')); relieveLong(s, m, 8); } } },
    { id: 'carry_on', label: l('O show continua', 'The show goes on'), hint: l('Nada para; +8 estresse em todos.', 'Nothing stops; +8 stress for everyone.'), weightByTraits: (P0) => F(P0, 'ambicao') + F(P0, 'disciplina'),
      apply: (s, c) => { const a = s.acts[c.act!]; for (const m of a?.members ?? []) addStress(s, m, 8, l('Luto engolido', 'Swallowed grief')); } },
  ],
});

// 3 ---------------------------------------------------------------- resposta a escândalo (fama)
registerSituation({
  id: 'scandal_reply', pressure: 'fame', cost: 1, cooldown: 2, trigger: ['scandal'],
  when: (s, c) => (c.fact?.severity ?? 0) >= 35,
  actorsPick: (s, c) => {
    const a = s.acts[c.fact!.actors[0]];
    const lead = a && live(a) ? leadOf(s, a) : undefined;
    return a && lead ? { hero: lead.id, act: a.id, cast: { person: lead.id }, data: { a3: String(c.fact!.data?.a3 ?? ''), fame: Number(c.fact!.data?.fame ?? 0) }, fact: c.fact } : null;
  },
  title: (s, c) => fmtL(l('{a}: como responder ao escândalo?', '{a}: how to answer the scandal?'), { a: nm(s, c.act!) }),
  text: (s, c) => { const sc = lastScandal(s, c.act!); return fmtL(l('"{t}" Reação calculada: {w}.', '"{t}" Expected reaction: {w}.'), { t: c.fact?.text.pt ?? '', w: sc?.why.map((x) => x.pt).join(' · ') ?? '—' }); },
  options: [
    { id: 'apologize', label: l('Pedir desculpas', 'Apologize'), hint: l('Recupera metade da fama perdida no país; núcleo −3%.', 'Recovers half the fame lost in that country; core fans −3%.'), weightByTraits: (P0) => F(P0, 'empatia') * 1.2 + (2 - F(P0, 'ego')) * 0.5,
      apply: (s, c) => { const a = s.acts[c.act!]; if (!a) return; const a3 = String(c.data.a3); const lost = Number(c.data.fame); if (a3 && lost < 0) { const d = (f16(s).d[a.id] ??= {}); d[a3] = clamp((d[a3] ?? 0) - lost / 2, -40, 40); } a.fans.core = Math.round(a.fans.core * 0.97); if (a.owner === 'player') s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100); } },
    { id: 'double_down', label: l('Dobrar a aposta', 'Double down'), hint: l('Núcleo +6%, casuais −6%; 25% de nova polêmica.', 'Core +6%, casual −6%; 25% chance of a new controversy.'), weightByTraits: (P0) => F(P0, 'ego') + F(P0, 'teimosia') + F(P0, 'rebeldia') * 0.7,
      apply: (s, c, r) => { const a = s.acts[c.act!]; if (!a) return; a.fans.core = Math.round(a.fans.core * 1.06); a.fans.casual = Math.round(a.fans.casual * 0.94); if (r.chance(0.25)) scandal(s, a.id, 'offense', 25, fmtL(l('{a} piora a polêmica com nova declaração.', '{a} makes it worse with a new statement.'), { a: a.name }), { cause: c.fact ? [c.fact.id] : undefined }); } },
    { id: 'silence', label: l('Silêncio', 'Silence'), hint: l('Nada muda; o boato segue o curso.', 'Nothing changes; the rumor runs its course.'), weightByTraits: (P0) => F(P0, 'paciencia') + F(P0, 'disciplina') * 0.5, apply: () => undefined },
  ],
});

// 4 ---------------------------------------------------------------- favor cobrado (poder)
const dueFavor = (s: GameState): Hold | undefined => holds17(s).h.find((h) => h.status === 'open' && (h.kind === 'favor' || h.kind === 'debt') && s.week - h.w > 26 && h.holder !== 'player' && (h.until ?? Infinity) >= s.week);
registerSituation({
  id: 'favor_due', pressure: 'power', cost: 2, cooldown: 3,
  when: (s) => !!dueFavor(s),
  actorsPick: (s) => { const h = dueFavor(s); return h ? { hero: h.holder, cast: { target: h.target }, data: { hold: h.id, str: h.strength } } : null; },
  title: (s, c) => fmtL(l('{h} cobra o favor', '{h} calls in the favor'), { h: nm(s, c.hero) }),
  text: (s, c) => { const h = holds17(s).h.find((x) => x.id === c.data.hold); return fmtL(l('"{t}" Agora é a vez de {x} pagar.', '"{t}" Now it is {x}\'s turn to pay.'), { t: h?.text.pt ?? '', x: c.cast.target === 'player' ? 'você' : nm(s, c.cast.target) }); },
  options: [
    { id: 'honor', label: l('Honrar', 'Honor it'), hint: l('Custa ~$2.000–8.000 (era); a obrigação acaba e a relação melhora.', 'Costs ~$2,000–8,000 (era); the obligation ends and the relationship improves.'), weightByTraits: (P0) => F(P0, 'lealdade') * 1.3 + F(P0, 'generosidade') * 0.5,
      apply: (s, c) => { const h = holds17(s).h.find((x) => x.id === c.data.hold); if (!h) return; const v = 2000 + h.strength * 60; if (c.cast.target === 'player') post(s, `favor17:${h.id}`, -money(s, v), 'misc', 'Favor pago'); else { const lb = s.labels[c.cast.target]; if (lb) lb.cash -= money(s, v); } const hl = s.labels[h.holder]; if (hl) hl.cash += money(s, v); h.status = 'used'; h.uses++; h.lastUse = s.week; } },
    { id: 'refuse', label: l('Recusar', 'Refuse'), hint: l('Grátis, mas vira mágoa forte contra quem recusou (pesa em negociações).', 'Free, but becomes a strong grievance against whoever refused (weighs on negotiations).'), weightByTraits: (P0) => F(P0, 'teimosia') + F(P0, 'ego') * 0.5,
      apply: (s, c) => { const h = holds17(s).h.find((x) => x.id === c.data.hold); if (!h) return; h.status = 'void'; grantHold(s, { holder: h.holder, target: h.target, kind: 'grievance', strength: 55, months: 48, text: fmtL(l('{h}: favor recusado', '{h}: refused favor'), { h: nm(s, h.holder) }), src: 'sit17' }); if (h.target === 'player' && s.labels[h.holder]) s.rivalries[h.holder] = (s.rivalries[h.holder] ?? 0) + 15; } },
  ],
});

// 5 ---------------------------------------------------------------- chantagem de um selo rival (lei)
const threat = (s: GameState): { sec: ReturnType<typeof P>['secrets'][number]; lb: string } | null => {
  const mine = new Set(playerActs(s).flatMap((id) => s.acts[id]?.members ?? []));
  for (const sec of P(s).secrets) {
    if (sec.leaked || !(sec.owner === 'owner' || mine.has(sec.owner))) continue;
    const lb = sec.knownBy.find((k) => s.labels[k]?.active);
    if (lb) return { sec, lb };
  }
  return null;
};
registerSituation({
  id: 'blackmail', pressure: 'law', cost: 2, cooldown: 8, playerOnly: true,
  when: (s) => !!threat(s),
  actorsPick: (s) => { const t = threat(s); return t ? { hero: 'player', cast: { label: t.lb, ...(t.sec.owner !== 'owner' ? { person: t.sec.owner } : {}) }, data: { sec: t.sec.id, sev: t.sec.severity } } : null; },
  title: (s, c) => fmtL(l('{b} sabe demais', '{b} knows too much'), { b: nm(s, c.cast.label) }),
  text: (s, c) => fmtL(l('{b} descobriu um segredo ({w}) e manda recado: ou paga, ou vaza.', '{b} found out a secret ({w}) and sends word: pay, or it leaks.'), { b: nm(s, c.cast.label), w: c.cast.person ? nm(s, c.cast.person) : l('seu', 'yours').pt }),
  options: [
    { id: 'pay', label: l('Pagar o silêncio', 'Pay for silence'), hint: l('Custa $4.000–13.000 (era): o segredo fica guardado por eles.', 'Costs $4,000–13,000 (era): they keep the secret.'),
      apply: (s, c) => { const sec = P(s).secrets.find((x) => x.id === c.data.sec); const v = 4000 + Number(c.data.sev) * 3000; post(s, `bm17:${c.data.sec}`, -money(s, v), 'legal', 'Acordo de silêncio'); const lb = s.labels[c.cast.label]; if (lb) lb.cash += money(s, v); if (sec) sec.knownBy = sec.knownBy.filter((k) => k !== c.cast.label); } },
    { id: 'counter', label: l('Ameaçar de volta', 'Threaten back'), hint: l('Com um segredo/favor sobre eles: empate e nada vaza. Sem isso: 55% vaza.', 'With a secret/favor on them: stalemate, nothing leaks. Without: 55% it leaks.'),
      apply: (s, c, r) => { const has = holdsOf(s, 'player').has.some((h) => h.target === c.cast.label && (h.kind === 'secret' || h.kind === 'favor')); const sec = P(s).secrets.find((x) => x.id === c.data.sec); if (!sec) return; if (has || !r.chance(0.55)) { sec.knownBy = sec.knownBy.filter((k) => k !== c.cast.label); return l('Eles recuaram: empate técnico.', 'They backed off: a stalemate.'); } leak(s, sec, c); return l('Não colou: o segredo vazou.', 'It did not work: the secret leaked.'); } },
    { id: 'call_bluff', label: l('Pagar para ver', 'Call the bluff'), hint: l('Grátis; 60% de vazar (escândalo).', 'Free; 60% chance it leaks (scandal).'),
      apply: (s, c, r) => { const sec = P(s).secrets.find((x) => x.id === c.data.sec); if (!sec) return; if (r.chance(0.6)) { leak(s, sec, c); return l('Eles vazaram.', 'They leaked it.'); } sec.knownBy = sec.knownBy.filter((k) => k !== c.cast.label); return l('Era blefe.', 'It was a bluff.'); } },
  ],
});
function leak(s: GameState, sec: ReturnType<typeof P>['secrets'][number], c: SitCtx): void {
  sec.leaked = true;
  sec.known = true;
  if (sec.owner === 'owner') { s.player.reputation.institutional = clamp(s.player.reputation.institutional - 5 * sec.severity, 0, 100); notify(s, fmtL(l('{b} vazou um segredo seu.', '{b} leaked a secret of yours.'), { b: nm(s, c.cast.label) }), 'bad'); return; }
  const a = Object.values(s.acts).find((x) => x.members.includes(sec.owner));
  const K: Record<string, Parameters<typeof scandal>[2]> = { affair: 'sex', child: 'sex', addiction: 'drugs', tax: 'money', debt: 'money', payola: 'money', plagiarism: 'money', fake_bio: 'conduct' };
  if (a) scandal(s, a.id, K[sec.kind] ?? 'conduct', 25 + sec.severity * 18, fmtL(l('{b} vaza: {p} esconde algo.', '{b} leaks: {p} is hiding something.'), { b: nm(s, c.cast.label), p: nm(s, sec.owner) }), { person: sec.owner });
}

// 6 ---------------------------------------------------------------- mágoa que ferve (poder)
const grudge = (s: GameState): Hold | undefined => holds17(s).h.find((h) => h.status === 'open' && h.kind === 'grievance' && h.target === 'player' && h.strength >= 30 && s.persons[h.holder]?.alive && playerActs(s).some((a) => s.acts[a]?.members.includes(h.holder)));
registerSituation({
  id: 'grudge', pressure: 'power', cost: 1, cooldown: 4, playerOnly: true,
  when: (s) => !!grudge(s),
  actorsPick: (s) => { const h = grudge(s)!; const a = playerActs(s).find((id) => s.acts[id]?.members.includes(h.holder)); return { hero: h.holder, act: a, cast: { person: h.holder }, data: { hold: h.id } }; },
  title: (s, c) => fmtL(l('{p} não esqueceu', '{p} has not forgotten'), { p: nm(s, c.hero) }),
  text: (s, c) => { const h = holds17(s).h.find((x) => x.id === c.data.hold); return fmtL(l('{p} cobra: "{t}". A mágoa pesa na renovação e no humor.', '{p} brings it up: "{t}". The grudge weighs on renewal and mood.'), { p: nm(s, c.hero), t: h?.text.pt ?? '' }); },
  options: [
    { id: 'amends', label: l('Reparar com um bônus', 'Make amends with a bonus'), hint: l('Custa $2.500 (era): mágoa perdoada, confiança +10.', 'Costs $2,500 (era): grudge forgiven, trust +10.'),
      apply: (s, c) => { post(s, `amends17:${c.hero}:${s.week}`, -money(s, 2500), 'artist_dev', 'Reparação'); const h = holds17(s).h.find((x) => x.id === c.data.hold); if (h) h.status = 'forgiven'; const a = s.acts[c.act!]; if (a) a.trust = clamp(a.trust + 10, 0, 100); addStress(s, c.hero, -8, l('Reparação do selo', 'Amends from the label')); } },
    { id: 'raise', label: l('Subir o royalty em 1 ponto', 'Raise royalty by 1 point'), hint: l('Custo recorrente; mágoa perdoada.', 'Recurring cost; grudge forgiven.'),
      apply: (s, c) => { const a = s.acts[c.act!]; const k = a?.contractId ? s.contracts[a.contractId] : undefined; if (k) k.royalty = Math.min(0.5, k.royalty + 0.01); const h = holds17(s).h.find((x) => x.id === c.data.hold); if (h) h.status = 'forgiven'; } },
    { id: 'ignore', label: l('Ignorar', 'Ignore it'), hint: l('Confiança −8, estresse +8; a mágoa cresce.', 'Trust −8, stress +8; the grudge grows.'),
      apply: (s, c) => { const a = s.acts[c.act!]; if (a) a.trust = clamp(a.trust - 8, 0, 100); addStress(s, c.hero, 8, l('Ignorado pelo selo', 'Ignored by the label')); const h = holds17(s).h.find((x) => x.id === c.data.hold); if (h) h.strength = clamp(h.strength + 10, 1, 100); } },
  ],
});

// 7 ---------------------------------------------------------------- recaída à vista (corpo)
registerSituation({
  id: 'relapse', pressure: 'body', cost: 2, cooldown: 6,
  when: (s) => !s.config.contentFilters.some((t) => t === 'drugs' || t === 'health'),
  actorsPick: (s) => {
    for (const a of notable(s)) {
      if (a.rs) continue;
      for (const id of a.members) { const p = s.persons[id]; const h = P(s).health[id]; if (p?.alive && !p.isPlayer && h?.history && !h.treatment && stressOf(s, id).short > 60) return { hero: id, act: a.id, cast: { person: id }, data: {} }; }
    }
    return null;
  },
  title: (s, c) => fmtL(l('{p} anda sumindo', '{p} keeps disappearing'), { p: nm(s, c.hero) }),
  text: (s, c) => fmtL(l('Quem conhece {p} ({a}) reconhece os sinais: estresse alto e velhos hábitos por perto.', 'Those who know {p} ({a}) recognize the signs: high stress and old habits nearby.'), { p: nm(s, c.hero), a: nm(s, c.act!) }),
  options: [
    { id: 'clinic', label: l('Clínica agora', 'Clinic now'), hint: l('Custa $3.000 (era): dependência −15, estresse −15, pausa curta.', 'Costs $3,000 (era): dependency −15, stress −15, a short break.'), weightByTraits: (P0) => F(P0, 'disciplina') + F(P0, 'empatia') * 0.5,
      apply: (s, c) => { pay(s, c, 'clinic', 3000, 'Clínica'); const h = healthOf(s, c.hero); h.dependency = clamp(h.dependency - 15, 0, 100); addStress(s, c.hero, -15, l('Clínica', 'Clinic')); const a = s.acts[c.act!]; if (a) a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + 3); } },
    { id: 'confront', label: l('Conversa franca da banda', 'Band intervention'), hint: l('50%: estresse −10; 50%: ressentimento +10.', '50%: stress −10; 50%: resentment +10.'), weightByTraits: (P0) => F(P0, 'coragem') + F(P0, 'sociabilidade') * 0.5,
      apply: (s, c, r) => { const p = s.persons[c.hero]; if (!p) return; if (r.chance(0.5)) addStress(s, c.hero, -10, l('A banda ajudou', 'The band helped')); else p.resentment = clamp(p.resentment + 10, 0, 100); } },
    { id: 'cover', label: l('Abafar', 'Cover it up'), hint: l('Nada agora; a imprensa passa a ter um segredo sobre o ato.', 'Nothing now; the press gets a secret on the act.'), weightByTraits: (P0) => F(P0, 'vaidade') + F(P0, 'impulsividade') * 0.5,
      apply: (s, c) => { const h = healthOf(s, c.hero); h.dependency = clamp(h.dependency + 6, 0, 100); grantHold(s, { holder: 'press', target: c.act!, kind: 'secret', strength: 45, months: 24, proof: 0, text: fmtL(l('{p} ({a}): recaída abafada', '{p} ({a}): covered-up relapse'), { p: nm(s, c.hero), a: nm(s, c.act!) }), src: 'sit17', data: { sk: 'addiction' } }); } },
  ],
});

// 8 ---------------------------------------------------------------- fé x escândalo na banda (fé)
registerSituation({
  id: 'faith', pressure: 'faith', cost: 1, cooldown: 4, trigger: ['scandal'],
  when: (s, c) => !!c.fact && ['sex', 'drugs', 'blasphemy'].some((t) => c.fact!.tags.includes(t)),
  actorsPick: (s, c) => {
    const a = s.acts[c.fact!.actors[0]];
    if (!live(a)) return null;
    const culprit = c.fact!.actors[1];
    const dev = a.members.find((m) => m !== culprit && s.persons[m]?.alive && !s.persons[m].isPlayer && isStrict(viewsOf(s, m)));
    return dev ? { hero: dev, act: a.id, cast: { person: dev }, data: {}, fact: c.fact } : null;
  },
  title: (s, c) => fmtL(l('{p} em crise de consciência', '{p} in a crisis of conscience'), { p: nm(s, c.hero) }),
  text: (s, c) => fmtL(l('Devoto(a), {p} não aceita o escândalo de {a} e pensa em se afastar.', 'Devout, {p} cannot accept the {a} scandal and is thinking of stepping away.'), { p: nm(s, c.hero), a: nm(s, c.act!) }),
  options: [
    { id: 'mediate', label: l('Mediar', 'Mediate'), hint: l('Ressentimento −15, estresse −5.', 'Resentment −15, stress −5.'), weightByTraits: (P0) => F(P0, 'empatia') + F(P0, 'paciencia'),
      apply: (s, c) => { const p = s.persons[c.hero]; if (p) { p.resentment = clamp(p.resentment - 15, 0, 100); addStress(s, c.hero, -5, l('Mediação', 'Mediation')); } } },
    { id: 'rebuke', label: l('Crítica pública', 'Public rebuke'), hint: l('Fiel ao público religioso; a banda racha (relações −20).', 'Wins the religious audience; the band cracks (relations −20).'), weightByTraits: (P0) => F(P0, 'coragem') + F(P0, 'teimosia'),
      apply: (s, c) => { const a = s.acts[c.act!]; const p = s.persons[c.hero]; if (!a || !p) return; for (const m of a.members) if (m !== p.id && s.persons[m]) { p.rel[m] = clamp((p.rel[m] ?? 0) - 20, -100, 100); s.persons[m].rel[p.id] = clamp((s.persons[m].rel[p.id] ?? 0) - 20, -100, 100); } } },
    { id: 'accept', label: l('Engolir em silêncio', 'Swallow it quietly'), hint: l('Estresse +10; vira mágoa contra o ato.', 'Stress +10; becomes a grudge against the act.'), weightByTraits: (P0) => F(P0, 'lealdade') + F(P0, 'ansiedade') * 0.5,
      apply: (s, c) => { addStress(s, c.hero, 10, l('Fé ferida', 'Wounded faith')); grantHold(s, { holder: c.hero, target: c.act!, kind: 'grievance', strength: 35, months: 24, text: fmtL(l('{p}: escândalo que fere a fé', '{p}: a scandal that wounds faith'), { p: nm(s, c.hero) }), src: 'sit17', quiet: true }); } },
  ],
});

// 9 ---------------------------------------------------------------- informante vende segredo (poder)
const forSale = (s: GameState): { id: string; owner: string; act: Act } | null => {
  for (const sec of P(s).secrets) {
    if (sec.known || sec.leaked || sec.owner.startsWith('label:') || sec.owner === 'owner') continue;
    const a = Object.values(s.acts).find((x) => x.members.includes(sec.owner) && live(x) && x.owner !== 'player' && x.fame >= 30);
    if (a) return { id: sec.id, owner: sec.owner, act: a };
  }
  return null;
};
registerSituation({
  id: 'secret_sale', pressure: 'power', cost: 1, cooldown: 10, playerOnly: true,
  when: (s) => s.player.cash > money(s, 6000) && !!forSale(s),
  actorsPick: (s) => { const x = forSale(s); return x ? { hero: 'player', act: x.act.id, cast: { target: x.owner }, data: { sec: x.id } } : null; },
  title: (s, c) => fmtL(l('Um informante tem algo sobre {p}', 'An informant has dirt on {p}'), { p: nm(s, c.cast.target) }),
  text: (s, c) => fmtL(l('Alguém do círculo de {a} oferece um segredo de {p}. Informação é poder — e risco.', 'Someone close to {a} offers a secret about {p}. Information is power — and risk.'), { a: nm(s, c.act!), p: nm(s, c.cast.target) }),
  options: [
    { id: 'buy', label: l('Comprar', 'Buy it'), hint: l('Custa $2.500 (era): vira obrigação sua sobre eles (chantagem/negociação).', 'Costs $2,500 (era): becomes your hold over them (blackmail/negotiation).'),
      apply: (s, c) => { post(s, `info17:${c.data.sec}`, -money(s, 2500), 'misc', 'Informante'); const sec = P(s).secrets.find((x) => x.id === c.data.sec); if (sec) sec.known = true; } },
    { id: 'tip_off', label: l('Avisar o artista', 'Warn the artist'), hint: l('Grátis: ele fica te devendo um favor (pesa em ofertas).', 'Free: they owe you a favor (weighs on offers).'),
      apply: (s, c) => { grantHold(s, { holder: 'player', target: c.act!, kind: 'favor', strength: 40, months: 36, text: fmtL(l('{a}: você avisou sobre um vazamento', '{a}: you warned them of a leak'), { a: nm(s, c.act!) }), src: 'sit17' }); } },
    { id: 'pass', label: l('Recusar', 'Pass'), hint: l('Nada acontece.', 'Nothing happens.'), apply: () => undefined },
  ],
});

// 10 --------------------------------------------------------------- rixa pública (fama)
const feud = (s: GameState): [Person, Act, Person, Act] | null => {
  const acts = notable(s);
  const leadAct = new Map<string, Act>();
  for (const a of acts) { const p = leadOf(s, a); if (p?.alive) leadAct.set(p.id, a); }
  for (const [pid, a] of leadAct) {
    const p = s.persons[pid];
    for (const [o, v] of Object.entries(p.rel)) if (v < -55 && leadAct.has(o) && leadAct.get(o)!.id !== a.id) return [p, a, s.persons[o], leadAct.get(o)!];
  }
  return null;
};
registerSituation({
  id: 'feud', pressure: 'fame', cost: 1, cooldown: 3,
  when: (s) => !!feud(s),
  actorsPick: (s) => { const f = feud(s); return f ? { hero: f[0].id, act: f[1].id, cast: { person: f[0].id, rival: f[2].id, ract: f[3].id }, data: {} } : null; },
  title: (s, c) => fmtL(l('{a} x {b}', '{a} vs {b}'), { a: nm(s, c.act!), b: nm(s, c.cast.ract) }),
  text: (s, c) => fmtL(l('{p} e {q} não se suportam, e a imprensa adora. Qual o próximo passo de {p}?', '{p} and {q} cannot stand each other, and the press loves it. What is {p}\'s next move?'), { p: nm(s, c.hero), q: nm(s, c.cast.rival) }),
  options: [
    { id: 'diss', label: l('Música de provocação', 'Diss track'), hint: l('Os dois ganham +1 de fama; relação −10; 20% de polêmica.', 'Both gain +1 fame; relationship −10; 20% chance of controversy.'), weightByTraits: (P0) => F(P0, 'ego') + F(P0, 'rebeldia') + F(P0, 'humor') * 0.4,
      apply: (s, c, r) => { const a = s.acts[c.act!], b = s.acts[c.cast.ract]; if (a) a.fame = clamp(a.fame + 1, 0, 100); if (b) b.fame = clamp(b.fame + 1, 0, 100); const p = s.persons[c.hero]; if (p) p.rel[c.cast.rival] = clamp((p.rel[c.cast.rival] ?? 0) - 10, -100, 100); if (a && r.chance(0.2)) scandal(s, a.id, 'offense', 25, fmtL(l('A provocação de {a} passa do ponto.', '{a}\'s diss goes too far.'), { a: a.name }), { person: c.hero }); } },
    { id: 'reconcile', label: l('Fazer as pazes', 'Make peace'), hint: l('Relação +30, estresse −5 nos dois.', 'Relationship +30, stress −5 for both.'), weightByTraits: (P0) => F(P0, 'empatia') + F(P0, 'generosidade'),
      apply: (s, c) => { const p = s.persons[c.hero], q = s.persons[c.cast.rival]; if (p) p.rel[c.cast.rival] = clamp((p.rel[c.cast.rival] ?? 0) + 30, -100, 100); if (q) q.rel[c.hero] = clamp((q.rel[c.hero] ?? 0) + 30, -100, 100); addStress(s, c.hero, -5, l('Paz selada', 'Peace made')); addStress(s, c.cast.rival, -5, l('Paz selada', 'Peace made')); } },
    { id: 'ignore', label: l('Ignorar', 'Ignore'), hint: l('Nada muda.', 'Nothing changes.'), weightByTraits: (P0) => F(P0, 'paciencia'), apply: () => undefined },
  ],
});

// 11 --------------------------------------------------------------- dinheiro com amarra (dinheiro)
const lender = (s: GameState): string | null => {
  const L0 = Object.values(leaders(s)?.L ?? {}).filter((x) => x.st === 'active' && x.label && s.labels[x.label]?.active && s.labels[x.label].cash > money(s, 40000)).sort((a, b) => (b.rel?.player ?? 0) - (a.rel?.player ?? 0) || (a.id < b.id ? -1 : 1))[0];
  return L0 ? `l:${L0.id}` : null;
};
registerSituation({
  id: 'loan_offer', pressure: 'money', cost: 1, cooldown: 12, playerOnly: true,
  when: (s) => s.player.cash > 0 && s.player.cash < money(s, 9000) && playerActs(s).length > 0 && !holds17(s).h.some((h) => h.src === 'loan17' && h.status === 'open'),
  actorsPick: (s) => { const k = lender(s); return k ? { hero: 'player', cast: { lender: k }, data: {} } : null; },
  title: (s, c) => fmtL(l('{n} oferece uma ajuda', '{n} offers a hand'), { n: nm(s, c.cast.lender) }),
  text: (s, c) => fmtL(l('O caixa está curto e {n} oferece dinheiro "sem juros". Em troca, um favor — a ser cobrado quando ele quiser.', 'Cash is short and {n} offers money "interest-free". In return, a favor — to be called in whenever they like.'), { n: nm(s, c.cast.lender) }),
  options: [
    { id: 'accept', label: l('Aceitar', 'Accept'), hint: fmtL(l('Entram ~$8.000 (era); você fica devendo um favor forte (cobrado em 6+ meses).', 'About $8,000 (era) comes in; you owe a strong favor (called in after 6+ months).'), {}),
      apply: (s, c) => { const L0 = leaders(s).L[c.cast.lender.slice(2)]; const lb = L0?.label ? s.labels[L0.label] : undefined; const v = money(s, 8000); post(s, `loan17:${s.week}`, v, 'other_income', 'Ajuda de outro selo'); if (lb) lb.cash -= v; grantHold(s, { holder: lb?.id ?? c.cast.lender, target: 'player', kind: 'favor', strength: 60, months: 60, src: 'loan17', data: { amt: v }, text: fmtL(l('{n}: ajuda de caixa em {y}', '{n}: cash help in {y}'), { n: nm(s, c.cast.lender), y: s.year }) }); } },
    { id: 'decline', label: l('Recusar', 'Decline'), hint: l('Nada muda.', 'Nothing changes.'), apply: () => undefined },
  ],
});

export const SITS17_IDS = ['burnout', 'grief', 'scandal_reply', 'favor_due', 'blackmail', 'grudge', 'relapse', 'faith', 'secret_sale', 'feud', 'loan_offer'];
