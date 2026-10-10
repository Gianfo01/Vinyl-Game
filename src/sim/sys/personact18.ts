// Rodada 18 (item 11) — as ~20 ações sobre pessoas + as de crime17 (ligadas, não duplicadas). Toda ação lê a
// relação (opinião), a fama dos dois lados e os traços (persona13); publica Fatos quando é notícia; mexe em
// obrigações (holds17), estresse (stress17), fama por país (fame16), boatos (media17) e romance (love17).
// Modo "Vida real exata": ações que inventariam fatos (romance, emprego, ameaça, suborno, boato, detetive, crime)
// não valem para pessoas reais.

import { familyOf, l, type L } from '../../data/world';
import { addHype } from './hype12';
import { emitFact, recentFacts } from '../facts17';
import { canUse, grantHold, holdsBetween, leverage, useHold, voidHolds } from '../holds17';
import { pa18, registerPersonAction, type PAChance, type PersonAction18 } from '../personact18';
import { addStress, relieveLong, stressOf } from '../stress17';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, nextId, playerActs } from '../util';
import { bondChance, bondCost, proposeBond } from './bonds9';
import { CRIMES17, commitCrime, crimeOdds, isReal, type Ctx17 } from './crime17';
import { myA3, nudge16 } from './fame16';
import { leaders } from './leaders10';
import { life, playerAct, startDating } from './life';
import { playerFame, startAffair } from './love17';
import { REAL_CRITICS, outlets17, plantOdds, plantRumor, TPL17 } from './media17';
import { P as PS } from './people/state';
import { bondKey } from './people/social';
import { askFavor, favorBlock, giftBlock, GIFT_COST, opine, opinionOf, per13, publicStatement, sendGift, type P13 } from './persona13';
import { p16, status16 } from './people16';
import { staffRoleById } from '../../data/rules';
import { hqCaps } from '../branches';

// ---------------------------------------------------------------- ajudantes

const pidOf = (s: GameState, key: string): string | undefined => (key.startsWith('p:') && s.persons[key.slice(2)] ? key.slice(2) : undefined);
const personOf = (s: GameState, key: string): Person | undefined => { const id = pidOf(s, key); return id ? s.persons[id] : undefined; };
/** id usado em holds/fatos (pessoa: id puro; demais: a chave) */
const hid = (key: string): string => (key.startsWith('p:') ? key.slice(2) : key);
const P = (s: GameState, key: string): P13 | null => per13(s, key);
const fac = (s: GameState, key: string, f: keyof P13['facets']): number => P(s, key)?.facets[f] ?? 50;
const nm = (s: GameState, key: string): string => P(s, key)?.name ?? key;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const sg = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v * 100))}%`;
const isMe = (s: GameState, key: string): boolean => key === 'player' || !!personOf(s, key)?.isPlayer;
const actOfP = (s: GameState, pid: string): Act | undefined => Object.values(s.acts).find((a) => a.members.includes(pid) && a.status !== 'retired' && a.status !== 'split');
const mineAct = (s: GameState, a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const alive = (s: GameState, key: string): boolean => status16(s, key) !== 'dead' && (personOf(s, key)?.alive ?? true);

export function fameOfKey(s: GameState, key: string): number {
  const p = personOf(s, key);
  if (p) return actOfP(s, p.id)?.fame ?? 5;
  if (key.startsWith('l:')) { const L0 = leaders(s).L[key.slice(2)]; return L0?.label ? s.labels[L0.label]?.reputation ?? 30 : 20; }
  if (key.startsWith('c:')) return 35;
  if (key.startsWith('e:') || key.startsWith('pd:')) return 40;
  if (key.startsWith('s:')) return 5;
  return 20;
}
/** Pessoa real (no modo exato, nada de fatos inventados para ela). */
export function realKey18(s: GameState, key: string): boolean {
  if (key.startsWith('l:')) return !!leaders(s).L[key.slice(2)]?.real;
  if (key.startsWith('c:')) return REAL_CRITICS.has(key.slice(2));
  return isReal(s, key);
}
const strictReal = (s: GameState, key: string): L | null => (s.config.history === 'strict' && realKey18(s, key) ? l('Vida real exata: pessoa real só vive fatos documentados.', 'Exact real life: a real person only lives documented facts.') : null);

/** Monta chance com o porquê (cada fator em pontos percentuais). */
function odds(base: number, mods: [L, number][]): PAChance {
  let p = base;
  const why: L[] = [fmtL(l('Base: {v}', 'Base: {v}'), { v: `${Math.round(base * 100)}%` })];
  for (const [t, v] of mods) {
    if (!Number.isFinite(v) || Math.abs(v) < 0.01) continue;
    p += v;
    why.push(fmtL(l('{t}: {v}', '{t}: {v}'), { t, v: sg(v) }));
  }
  return { p: clamp(p, 0.03, 0.97), why };
}
const opMod = (s: GameState, key: string, k = 1): [L, number] => [fmtL(l('Opinião sobre você ({o})', 'Opinion of you ({o})'), { o: opinionOf(s, key) }), (opinionOf(s, key) / 250) * k];
const fameMod = (s: GameState, key: string, k = 1): [L, number] => [fmtL(l('Fama: você {a} × {b}', 'Fame: you {a} × {b}'), { a: Math.round(playerFame(s)), b: Math.round(fameOfKey(s, key)) }), ((playerFame(s) - fameOfKey(s, key)) / 300) * k];
const facMod = (s: GameState, key: string, f: keyof P13['facets'], name: L, k: number): [L, number] => [fmtL(l('{n} ({v})', '{n} ({v})'), { n: name, v: Math.round(fac(s, key, f)) }), ((fac(s, key, f) - 50) / 100) * k];
const notSelf = (s: GameState, key: string): boolean => !isMe(s, key) && !!P(s, key);
const out = (ok: boolean, text: L) => ({ ok, text });
function fact(s: GameState, key: string, kind: string, sev: number, vis: 'secret' | 'rumor' | 'public', tags: string[], text: L): void {
  const a = personOf(s, key) ? actOfP(s, hid(key)) : undefined;
  emitFact(s, { kind, actors: ['player', hid(key), ...(a ? [a.id] : [])], place: P(s, key)?.city ?? s.config.homeCity, severity: sev, visibility: vis, tags: [...tags, 'pa18'], text, src: 'pa18' });
}
const T = (pt: string, en: string, p: Record<string, string | number | L> = {}) => fmtL(l(pt, en), p);

const base: Pick<PersonAction18, 'visible'> = { visible: (s, k) => notSelf(s, k) && alive(s, k) };
const reg = (a: PersonAction18) => registerPersonAction({ ...base, ...a, visible: a.visible ?? base.visible });

// ================================================================ relação

reg({
  id: 'call', group: 'social', icon: 'phone', label: l('Telefonar', 'Call'), cooldown: 4,
  desc: l('Ligação rápida para manter contato. Sem custo; quem não gosta de você nem atende.', 'A quick call to keep in touch. Free; people who dislike you won\'t pick up.'),
  chance: (s, k) => odds(0.7, [opMod(s, k, 1.2), fameMod(s, k, 0.8), facMod(s, k, 'sociabilidade', l('Sociabilidade', 'Sociability'), 0.3)]),
  run: (s, k, r, ok) => ok ? out(true, T('{n} atendeu e conversaram por meia hora (+{v}).', '{n} picked up and you talked for half an hour (+{v}).', { n: nm(s, k), v: opine(s, k, 3, l('ligou para saber como estava.', 'called to check in.')) })) : out(false, T('{n} não atendeu. Recado deixado.', '{n} didn\'t pick up. Message left.', { n: nm(s, k) })),
});

reg({
  id: 'lunch', group: 'social', icon: 'coffee', label: l('Almoçar / jantar', 'Lunch / dinner'), cooldown: 8,
  desc: l('Uma refeição tira a conversa do escritório: aproxima e revela ambições (artistas viram melhor conhecidos no A&R).', 'A meal takes the talk out of the office: it brings you closer and reveals ambitions (artists become better known to A&R).'),
  cost: () => ({ usd: 150, balls: 1 }),
  chance: (s, k) => odds(0.6, [opMod(s, k), fameMod(s, k, 0.6), facMod(s, k, 'sociabilidade', l('Sociabilidade', 'Sociability'), 0.4), facMod(s, k, 'humor', l('Bom humor', 'Good humor'), 0.2)]),
  run: (s, k, r, ok) => {
    if (!ok) return out(false, T('O jantar com {n} foi frio e curto ({v}).', 'Dinner with {n} was cold and short ({v}).', { n: nm(s, k), v: opine(s, k, -2, l('jantar constrangedor.', 'awkward dinner.')) }));
    const v = opine(s, k, 6, l('almoçamos juntos.', 'we had lunch together.'));
    const p = personOf(s, k);
    let extra: L = l('', '');
    if (p) {
      addStress(s, p.id, -3, l('Boa conversa num almoço', 'A good talk over lunch'));
      const a = actOfP(s, p.id);
      if (a && !mineAct(s, a)) {
        const kn = s.knowledge[a.id];
        if (kn) { if (kn.degree < 4) { kn.degree += 1; kn.updatedWeek = s.week; extra = T(' Você conhece melhor {a} (grau {d}).', ' You know {a} better now (degree {d}).', { a: a.name, d: kn.degree }); } }
        else { s.knowledge[a.id] = { actId: a.id, degree: 2, stage: 'monitoring', bias: 0, updatedWeek: s.week, source: 'network' }; extra = T(' {a} entra no seu radar de A&R.', ' {a} is now on your A&R radar.', { a: a.name }); }
      }
    }
    return out(true, T('Bom papo com {n} (+{v}).{x}', 'Good talk with {n} (+{v}).{x}', { n: nm(s, k), v, x: extra }));
  },
});

reg({
  id: 'gift', group: 'social', icon: 'gift', label: l('Mandar presente', 'Send a gift'),
  desc: l('Agrada mais quem é vaidoso ou mão-fechada. Um por ano por pessoa.', 'Pleases the vain and the stingy most. One per year per person.'),
  cost: (s) => ({ cents: money(s, GIFT_COST), shown: true }),
  available: (s, k) => giftBlock(s, k),
  run: (s, k) => out(true, sendGift(s, k)),
});

reg({
  id: 'advice', group: 'social', icon: 'bulb', label: l('Pedir conselho', 'Ask for advice'), cooldown: 12,
  desc: l('Gente gosta de ser consultada. Quem é bom no ofício indica um nome para o seu radar e alivia sua cabeça.', 'People like being consulted. Those good at their craft point you to a name and ease your mind.'),
  cost: () => ({ balls: 1 }),
  chance: (s, k) => odds(0.55, [opMod(s, k), [l('Ouvido musical', 'Musical ear'), ((P(s, k)?.attrs.ear ?? 50) - 50) / 150], facMod(s, k, 'ego', l('Ego (adora opinar)', 'Ego (loves to opine)'), 0.2), facMod(s, k, 'generosidade', l('Generosidade', 'Generosity'), 0.2)]),
  run: (s, k, r, ok) => {
    if (!ok) return out(false, T('{n} desconversou: "cada um com seus problemas".', '{n} brushed you off: "everyone has their own problems".', { n: nm(s, k) }));
    const v = opine(s, k, 4, l('pediu meu conselho.', 'asked for my advice.'));
    const me = s.persons[Object.values(s.persons).find((x) => x.isPlayer)?.id ?? ''];
    if (me) addStress(s, me.id, -4, l('Um bom conselho', 'Good advice'));
    // indica alguém: ato livre, em alta, ainda fora do seu radar (preferência pelo gênero/cidade da pessoa)
    const city = P(s, k)?.city;
    const cand = Object.values(s.acts).filter((a) => !a.owner && (a.status === 'active' || a.status === 'emerging') && !s.knowledge[a.id] && a.members.length)
      .map((a) => ({ a, w: a.momentum + (a.city === city ? 25 : 0) + r.next() * 20 })).sort((x, y) => y.w - x.w)[0]?.a;
    if (cand) s.knowledge[cand.id] = { actId: cand.id, degree: 1, stage: 'signal', bias: 0, updatedWeek: s.week, source: 'network' };
    return out(true, cand ? T('{n} aconselhou (+{v}) e indicou {a}, de {c}: está no seu radar.', '{n} advised you (+{v}) and pointed to {a}: it\'s on your radar.', { n: nm(s, k), v, a: cand.name, c: cand.city }) : T('{n} aconselhou com calma (+{v}).', '{n} gave calm advice (+{v}).', { n: nm(s, k), v }));
  },
});

reg({
  id: 'apologize', group: 'social', icon: 'heart', label: l('Pedir desculpas', 'Apologize'), cooldown: 12,
  desc: l('Repara mágoas: quem é empático aceita; teimosos guardam rancor.', 'Mends grudges: the empathetic accept; the stubborn hold on.'),
  visible: (s, k) => notSelf(s, k) && alive(s, k) && (opinionOf(s, k) < 0 || holdsBetween(s, hid(k), 'player').some((h) => h.kind === 'grievance' && h.status === 'open')),
  chance: (s, k) => odds(0.5, [facMod(s, k, 'empatia', l('Empatia', 'Empathy'), 0.5), facMod(s, k, 'teimosia', l('Teimosia', 'Stubbornness'), -0.5), [l('Tamanho da mágoa', 'Size of the grudge'), Math.min(0, opinionOf(s, k)) / 300]]),
  run: (s, k, r, ok) => {
    if (!ok) return out(false, T('{n} ouviu e respondeu: "palavras não apagam o que houve" ({v}).', '{n} listened and said: "words don\'t erase what happened" ({v}).', { n: nm(s, k), v: opine(s, k, -2, l('desculpas vazias.', 'empty apology.')) }));
    const v = opine(s, k, clamp(-opinionOf(s, k) / 2, 5, 18), l('pediu desculpas.', 'apologized.'));
    const n = voidHolds(s, (h) => h.kind === 'grievance' && h.target === 'player' && h.holder === hid(k));
    if (n) fact(s, k, 'forgiven', 25, 'public', ['good'], T('{n} aceita as desculpas de {c}.', '{n} accepts {c}\'s apology.', { n: nm(s, k), c: s.config.companyName }));
    return out(true, T('{n} aceitou as desculpas (+{v}){m}.', '{n} accepted the apology (+{v}){m}.', { n: nm(s, k), v, m: n ? l('; mágoa encerrada', '; grudge closed') : '' }));
  },
});

// ================================================================ carreira e negócios

reg({
  id: 'favor', group: 'career', icon: 'handshake', label: l('Pedir favor', 'Ask a favor'),
  desc: l('Gasta boa vontade por um ganho imediato — e agora você deve uma (obrigação).', 'Spends goodwill for an immediate gain — and now you owe one (obligation).'),
  available: (s, k) => favorBlock(s, k),
  run: (s, k) => {
    const t0 = askFavor(s, k);
    grantHold(s, { holder: hid(k), target: 'player', kind: 'favor', strength: 35, months: 36, src: 'pa18', text: T('Fez um favor a {c}', 'Did {c} a favor', { c: s.config.companyName }) });
    return out(true, T('{t} Você fica devendo um favor a {n}.', '{t} You now owe {n} a favor.', { t: t0, n: nm(s, k) }));
  },
});

reg({
  id: 'callfavor', group: 'career', icon: 'handshake', label: l('Cobrar favor', 'Call in a favor'),
  desc: l('Usa uma obrigação que esta pessoa tem com você (holds17).', 'Uses an obligation this person owes you (holds17).'),
  visible: (s, k) => notSelf(s, k) && holdsBetween(s, 'player', hid(k)).some((h) => h.status === 'open' && (h.kind === 'favor' || h.kind === 'debt' || h.kind === 'loyalty')),
  available: (s, k) => { const h = holdsBetween(s, 'player', hid(k)).find((x) => x.status === 'open' && (x.kind === 'favor' || x.kind === 'debt' || x.kind === 'loyalty')); return h ? canUse(s, h, 'call') : l('Nada a cobrar.', 'Nothing to call in.'); },
  run: (s, k) => {
    const h = holdsBetween(s, 'player', hid(k)).find((x) => x.status === 'open' && (x.kind === 'favor' || x.kind === 'debt' || x.kind === 'loyalty'))!;
    const r0 = useHold(s, h.id, 'call');
    if (r0.ok) { s.player.reputation.artists = clamp(s.player.reputation.artists + 1, 0, 100); opine(s, k, -3, l('cobrou o favor.', 'called in the favor.')); }
    return out(r0.ok, r0.text);
  },
});

const STAFF_BY: Record<string, string> = { c: 'publicist', m: 'publicist', e: 'manager', pd: 'producer', l: 'anr', s: 'admin' };
reg({
  id: 'job', group: 'career', icon: 'contract', label: l('Oferecer emprego / contrato', 'Offer a job / contract'), cooldown: 26,
  desc: l('Artista livre: abre a proposta de contrato. Profissionais (crítico, empresário, produtor, executivo): convite para a sua equipe.', 'Free artist: opens the contract offer. Professionals (critic, manager, producer, executive): an invitation to join your staff.'),
  visible: (s, k) => notSelf(s, k) && alive(s, k) && (!!personOf(s, k) ? !mineAct(s, actOfP(s, hid(k))) : !!STAFF_BY[k.split(':')[0]] && !s.player.staff.some((x) => `s:${x.id}` === k)),
  cost: (s, k) => { const r0 = staffRoleById[STAFF_BY[k.split(':')[0]] ?? '']; return personOf(s, k) || !r0 ? {} : { usd: r0.salary * 2 }; },
  available: (s, k) => {
    const p = personOf(s, k);
    if (p) { const a = actOfP(s, p.id); return a?.owner && a.owner !== 'player' ? T('Tem contrato com outro selo: aliciar fica no Mercado (ou espere o fim do contrato).', 'Under contract with another label: poaching lives in the Market (or wait for the contract to end).') : s.config.role === 'artist' ? l('Você é artista: não contrata.', 'You are an artist: you don\'t sign acts.') : null; }
    if (s.player.staff.length >= hqCaps(s).staff) return l('Sede sem vagas para equipe.', 'No staff room in the HQ.');
    return strictReal(s, k);
  },
  chance: (s, k) => personOf(s, k) ? { p: 1, why: [l('Abre a proposta: a chance aparece lá, termo a termo.', 'Opens the offer: odds show up there, term by term.')] }
    : odds(0.25, [opMod(s, k, 1.5), [fmtL(l('Sua sede (nível {h})', 'Your HQ (level {h})'), { h: s.player.hq }), s.player.hq * 0.04], [l('Prestígio dela no ofício', 'Their standing in the trade'), -fameOfKey(s, k) / 250], facMod(s, k, 'ambicao', l('Ambição', 'Ambition'), 0.2), facMod(s, k, 'lealdade', l('Lealdade ao emprego atual', 'Loyalty to current job'), -0.25)]),
  run: (s, k, r, ok) => {
    const p = personOf(s, k);
    if (p) { const a = actOfP(s, p.id); return a ? { ok: true, text: T('Proposta para {a}.', 'Offer for {a}.', { a: a.name }), ui: 'offer', uiArg: a.id } : out(false, l('Sem banda para contratar.', 'No act to sign.')); }
    if (!ok) { opine(s, k, -2, l('recusou a proposta de emprego.', 'turned down the job offer.')); return out(false, T('{n} agradeceu e recusou.', '{n} thanked you and declined.', { n: nm(s, k) })); }
    const role = staffRoleById[STAFF_BY[k.split(':')[0]]];
    const Px = P(s, k);
    const skill = Math.round(clamp(((Px?.attrs.ear ?? 50) + (Px?.attrs.mgmt ?? 50) + (Px?.attrs.cha ?? 50)) / 3 + 10, 30, 95));
    s.player.staff.push({ id: nextId(s, 'st18'), name: nm(s, k), role: role.id, skill, salary: money(s, role.salary * 1.25), hiredWeek: s.week });
    opine(s, k, 8, l('me contratou.', 'hired me.'));
    fact(s, k, 'deal', 35, 'public', ['good', 'hire'], T('{n} troca de lado e entra para a equipe de {c}.', '{n} switches sides and joins {c}\'s staff.', { n: nm(s, k), c: s.config.companyName }));
    return out(true, T('{n} aceitou: entra como {r} (habilidade {k}).', '{n} accepted: joins as {r} (skill {k}).', { n: nm(s, k), r: role.name, k: skill }));
  },
});

const bestMine = (s: GameState): Act | undefined => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split' && a.members.length).sort((a, b) => b.fame - a.fame)[0] ?? playerAct(s);
const featKind = (M: Act, O: Act) => (familyOf(M.genre) !== familyOf(O.genre) ? 'cross' : 'ally') as 'cross' | 'ally';
reg({
  id: 'feat', group: 'career', icon: 'note', label: l('Propor parceria / feat', 'Propose a partnership / feat'), cooldown: 26, selfRoll: true,
  desc: l('Junta o seu artista principal com o desta pessoa (bonds9): crossover se os gêneros diferem, aliança se parecidos.', 'Pairs your lead act with this person\'s (bonds9): crossover if genres differ, alliance if close.'),
  visible: (s, k) => { const p = personOf(s, k); const a = p && actOfP(s, p.id); return !!a && !mineAct(s, a) && !!bestMine(s) && alive(s, k); },
  cost: (s, k) => { const M = bestMine(s)!, O = actOfP(s, hid(k))!; return { cents: bondCost(s, featKind(M, O), O.id).cost, shown: true }; },
  available: (s, k) => { const M = bestMine(s)!, O = actOfP(s, hid(k))!; const c = bondCost(s, featKind(M, O), O.id); return c.blocked ? c.text : null; },
  chance: (s, k) => { const M = bestMine(s)!, O = actOfP(s, hid(k))!; const p = bondChance(s, featKind(M, O), M.id, O.id); return { p, why: [T('{m} + {o} ({k})', '{m} + {o} ({k})', { m: M.name, o: O.name, k: featKind(M, O) === 'cross' ? l('crossover', 'crossover') : l('aliança', 'alliance') }), l('Admiração do líder do outro ato pelo seu, laços entre líderes, diferença de fama e reputação com artistas.', 'The other act\'s leader admiration for yours, ties between leaders, fame gap and reputation with artists.')] }; },
  run: (s, k, r) => { const M = bestMine(s)!, O = actOfP(s, hid(k))!; const x = proposeBond(s, r, featKind(M, O), M.id, [O.id]); if (x.ok) opine(s, k, 5, l('topou a parceria.', 'agreed to the partnership.')); return out(x.ok, x.text); },
});

reg({
  id: 'invite', group: 'career', icon: 'mic', label: l('Convidar para show / festa', 'Invite to a show / party'), cooldown: 12,
  desc: l('Camarote no show do seu artista ou festa do selo. Se for famoso(a) e vier, o seu artista ganha hype.', 'A box at your act\'s show or a label party. If they\'re famous and show up, your act gets hype.'),
  cost: () => ({ usd: 300, balls: 1 }),
  chance: (s, k) => odds(0.5, [opMod(s, k), fameMod(s, k), facMod(s, k, 'sociabilidade', l('Sociabilidade', 'Sociability'), 0.4)]),
  run: (s, k, r, ok) => {
    if (!ok) return out(false, T('{n} mandou dizer que estava ocupado(a).', '{n} sent word they were busy.', { n: nm(s, k) }));
    const v = opine(s, k, 5, l('me convidou para o show.', 'invited me to the show.'));
    const M = bestMine(s), f = fameOfKey(s, k);
    if (M && f >= 30) {
      const hv = Math.round(f / 12);
      addHype(s, `a:${M.id}`, `pa18:${hid(k)}`, T('{n} foi visto(a) no show', '{n} seen at the show', { n: nm(s, k) }), hv);
      fact(s, k, 'show', 20 + f / 5, 'public', ['good'], T('{n} aparece no show de {a}.', '{n} shows up at {a}\'s gig.', { n: nm(s, k), a: M.name }));
      return out(true, T('{n} veio e foi fotografado(a) (+{v}); hype de {a} +{h}.', '{n} came and got photographed (+{v}); {a} hype +{h}.', { n: nm(s, k), v, a: M.name, h: hv }));
    }
    return out(true, T('{n} curtiu a noite (+{v}).', '{n} enjoyed the night (+{v}).', { n: nm(s, k), v }));
  },
});

/** Melhor pessoa do seu elenco para apresentar (maior afinidade por idade/gênero/cidade). */
function introPick(s: GameState, k: string): Person | undefined {
  const city = P(s, k)?.city;
  return playerActs(s).flatMap((id) => s.acts[id]?.members ?? []).map((id) => s.persons[id]).filter((p): p is Person => !!p?.alive && !p.isPlayer && `p:${p.id}` !== k)
    .sort((a, b) => (actOfP(s, b.id)?.city === city ? 1 : 0) - (actOfP(s, a.id)?.city === city ? 1 : 0) || b.morale - a.morale)[0];
}
reg({
  id: 'introduce', group: 'career', icon: 'fans', label: l('Apresentar a alguém (networking)', 'Introduce to someone (networking)'), cooldown: 26,
  desc: l('Apresenta esta pessoa a alguém do seu elenco: nasce uma amizade (ou rivalidade) e contatos para os dois.', 'Introduces this person to someone on your roster: a friendship (or rivalry) is born, and contacts for both.'),
  visible: (s, k) => notSelf(s, k) && alive(s, k) && !!introPick(s, k),
  cost: () => ({ balls: 1 }),
  chance: (s, k) => odds(0.6, [facMod(s, k, 'sociabilidade', l('Sociabilidade', 'Sociability'), 0.4), facMod(s, k, 'ego', l('Ego', 'Ego'), -0.2), opMod(s, k, 0.5)]),
  run: (s, k, r, ok) => {
    const p = introPick(s, k)!;
    const t = hid(k);
    const d = ok ? 12 : -8;
    const bk = bondKey(p.id, t);
    const st = PS(s);
    st.bonds[bk] = clamp((st.bonds[bk] ?? 0) + d, -100, 100);
    p.rel[t] = clamp((p.rel[t] ?? 0) + d, -100, 100);
    const tp = personOf(s, k); if (tp) tp.rel[p.id] = clamp((tp.rel[p.id] ?? 0) + d, -100, 100);
    if (ok) { opine(s, k, 3, l('me apresentou gente boa.', 'introduced me to good people.')); const a = actOfP(s, p.id); if (a) a.networking = clamp((a.networking ?? 0) + 4, 0, 100); }
    return ok ? out(true, T('{a} e {b} se deram bem: novo contato (+networking).', '{a} and {b} hit it off: a new contact (+networking).', { a: p.name, b: nm(s, k) }))
      : out(false, T('{a} e {b} se estranharam.', '{a} and {b} rubbed each other the wrong way.', { a: p.name, b: nm(s, k) }));
  },
});

// ================================================================ público e imprensa

reg({
  id: 'praise', group: 'press', icon: 'star', label: l('Elogiar em público', 'Praise publicly'),
  desc: l('Entrevista elogiando: a pessoa gosta e o público dela no seu país também.', 'An interview full of praise: they like it, and so does their audience in your country.'),
  run: (s, k) => {
    const t0 = publicStatement(s, k, true);
    const p = personOf(s, k); const a = p && actOfP(s, p.id); const a3 = myA3(s);
    if (a && a3 && playerFame(s) >= 20) nudge16(s, a.id, a3, 1);
    fact(s, k, 'statement', 15, 'public', ['good'], T('{c} elogia {n} em entrevista.', '{c} praises {n} in an interview.', { c: s.config.companyName, n: nm(s, k) }));
    return out(true, t0);
  },
});

reg({
  id: 'criticize', group: 'press', icon: 'warning', label: l('Criticar em público', 'Criticize publicly'),
  desc: l('Vira rixa pública: a pessoa guarda mágoa e se estressa; os desafetos dela gostam.', 'Turns into a public feud: they hold a grudge and get stressed; their foes enjoy it.'),
  run: (s, k) => {
    const t0 = publicStatement(s, k, false);
    grantHold(s, { holder: hid(k), target: 'player', kind: 'grievance', strength: 40, months: 36, src: 'pa18', text: T('Foi criticado(a) em público por {c}', 'Was publicly criticized by {c}', { c: s.config.companyName }) });
    const p = personOf(s, k); if (p) addStress(s, p.id, 6, T('Criticado(a) em público por {c}', 'Publicly criticized by {c}', { c: s.config.companyName }));
    fact(s, k, 'statement', 35, 'public', ['bad', 'feud'], T('{c} detona {n} em entrevista.', '{c} slams {n} in an interview.', { c: s.config.companyName, n: nm(s, k) }));
    return out(true, t0);
  },
});

/** Melhor modelo e veículo para um boato contra o ato da pessoa. */
function rumorPlan(s: GameState, k: string): { act: Act; tpl: string; out: string; p: number; cost: number; trace: number } | null {
  const p = personOf(s, k); const a = p && actOfP(s, p.id);
  if (!a) return null;
  const tpl = TPL17.filter((x) => x.from <= s.year && x.tone < 0).sort((x, y) => y.sev - x.sev)[0];
  if (!tpl) return null;
  let best: { out: string; p: number; cost: number; trace: number } | null = null;
  for (const o of outlets17(s).slice(0, 40)) { const od = plantOdds(s, a.id, tpl.id, o.id); if (od.ok && (!best || od.p - od.trace > best.p - best.trace)) best = { out: o.id, p: od.p, cost: od.cost, trace: od.trace }; }
  return best ? { act: a, tpl: tpl.id, ...best } : null;
}
reg({
  id: 'rumor', group: 'press', icon: 'newspaper', label: l('Espalhar boato', 'Spread a rumor'), cooldown: 8, selfRoll: true,
  desc: l('Planta uma história num veículo (media17). Se rastrearem até você: mágoa, reputação e talvez processo por difamação.', 'Plants a story in an outlet (media17). If traced back: a grudge, reputation and maybe a defamation suit.'),
  visible: (s, k) => notSelf(s, k) && alive(s, k) && !!personOf(s, k) && !mineAct(s, actOfP(s, hid(k))),
  cost: (s, k) => ({ cents: rumorPlan(s, k)?.cost ?? 0, shown: true }),
  available: (s, k) => strictReal(s, k) ?? (rumorPlan(s, k) ? null : l('Nenhum veículo topa agora.', 'No outlet will take it now.')),
  chance: (s, k) => { const x = rumorPlan(s, k); return x ? { p: x.p, why: [T('Melhor veículo: {o}', 'Best outlet: {o}', { o: outlets17(s).find((o) => o.id === x.out)?.name ?? x.out }), T('Chance de rastrearem até você: {t}%', 'Chance of being traced: {t}%', { t: Math.round(x.trace * 100) })] } : { p: 0, why: [] }; },
  run: (s, k) => { const x = rumorPlan(s, k)!; const r0 = plantRumor(s, x.act.id, x.tpl, x.out); return out(r0.ok, r0.text); },
});

// ================================================================ cuidado

const sick = (s: GameState, k: string): boolean => { const st = status16(s, k); return st === 'ill' || st === 'addiction' || st === 'rehab'; };
reg({
  id: 'visit', group: 'care', icon: 'heart', label: l('Visitar no hospital', 'Visit in hospital'), cooldown: 26,
  desc: l('Visitar quem está doente ou internado: gesto que a pessoa e a família não esquecem.', 'Visiting someone ill or in treatment: a gesture they and their family won\'t forget.'),
  visible: (s, k) => notSelf(s, k) && sick(s, k),
  cost: () => ({ balls: 1 }),
  run: (s, k) => {
    const v = opine(s, k, 10, l('me visitou no hospital.', 'visited me in hospital.'));
    const p = personOf(s, k); if (p) addStress(s, p.id, -8, l('Visita de apoio', 'A supportive visit'));
    grantHold(s, { holder: 'player', target: hid(k), kind: 'loyalty', strength: 30, months: 48, src: 'pa18', text: T('{c} esteve lá quando precisei', '{c} was there when I needed it', { c: s.config.companyName }) });
    return out(true, T('{n} se emocionou com a visita (+{v}).', '{n} was moved by the visit (+{v}).', { n: nm(s, k), v }));
  },
});
reg({
  id: 'funeral', group: 'care', icon: 'flower', label: l('Ir ao funeral / homenagem', 'Attend the funeral / tribute'), cooldown: 520,
  desc: l('Presença no velório ou homenagem: família, banda e colegas notam.', 'Presence at the funeral or tribute: family, band and peers take notice.'),
  visible: (s, k) => !isMe(s, k) && !!P(s, k) && !alive(s, k),
  cost: () => ({ balls: 1 }),
  run: (s, k) => {
    const p = personOf(s, k);
    let n = 0;
    if (p) { const a = Object.values(s.acts).find((x) => x.members.includes(p.id)); for (const m of a?.members ?? []) if (m !== p.id && s.persons[m]?.alive) { opine(s, `p:${m}`, 6, T('esteve no funeral de {n}.', 'came to {n}\'s funeral.', { n: p.name })); n++; } }
    s.player.reputation.artists = clamp(s.player.reputation.artists + 1, 0, 100);
    fact(s, k, 'memory', 20, 'public', ['good'], T('{c} presta homenagem a {n}.', '{c} pays tribute to {n}.', { c: s.config.companyName, n: nm(s, k) }));
    return out(true, T('Você prestou homenagem a {n}; {m} colega(s) notaram (+1 reputação com artistas).', 'You paid tribute to {n}; {m} peer(s) noticed (+1 reputation with artists).', { n: nm(s, k), m: n }));
  },
});

const needsHelp = (s: GameState, k: string): boolean => { const st = status16(s, k); if (st === 'addiction' || st === 'ill') return true; const p = personOf(s, k); if (!p) return false; const x = stressOf(s, p.id); return x.level === 'breaking' || x.level === 'strained'; };
reg({
  id: 'help', group: 'care', icon: 'plus', label: l('Oferecer ajuda (clínica / rehab)', 'Offer help (clinic / rehab)'), cooldown: 52,
  desc: l('Paga tratamento para quem está em crise. Orgulhosos e teimosos recusam; quem aceita fica leal.', 'Pays for treatment for someone in crisis. The proud and stubborn refuse; those who accept stay loyal.'),
  visible: (s, k) => notSelf(s, k) && alive(s, k) && needsHelp(s, k),
  cost: () => ({ usd: 3000 }),
  chance: (s, k) => odds(0.55, [opMod(s, k, 1.5), facMod(s, k, 'teimosia', l('Teimosia', 'Stubbornness'), -0.4), facMod(s, k, 'ego', l('Orgulho (ego)', 'Pride (ego)'), -0.3), facMod(s, k, 'ansiedade', l('Ansiedade (quer ajuda)', 'Anxiety (wants help)'), 0.2)]),
  run: (s, k, r, ok) => {
    if (!ok) { opine(s, k, -3, l('ofereceu ajuda que eu não pedi.', 'offered help I didn\'t ask for.')); return out(false, T('{n} recusou: "eu sei me cuidar". O dinheiro voltou ao caixa? Não — já estava reservado na clínica.', '{n} refused: "I can take care of myself". The clinic deposit is gone.', { n: nm(s, k) })); }
    const p = personOf(s, k);
    if (p) { if (p.health === 'addiction' || p.health === 'burnout' || p.health === 'ill') p.health = 'recovering'; addStress(s, p.id, -15, l('Tratamento pago pelo selo', 'Treatment paid by the label')); relieveLong(s, p.id, 12); }
    else { const L0 = p16(s).L[k]; if (L0 && (L0.st === 'addiction' || L0.st === 'ill')) L0.st = 'rehab'; }
    const v = opine(s, k, 15, l('pagou meu tratamento.', 'paid for my treatment.'));
    grantHold(s, { holder: 'player', target: hid(k), kind: 'loyalty', strength: 55, months: 72, src: 'pa18', text: T('{c} pagou meu tratamento', '{c} paid for my treatment', { c: s.config.companyName }) });
    fact(s, k, 'rehab', 30, 'rumor', ['good', 'health'], T('{n} entra em tratamento; dizem que {c} pagou a conta.', '{n} checks into treatment; word is {c} paid the bill.', { n: nm(s, k), c: s.config.companyName }));
    return out(true, T('{n} aceitou e começou o tratamento (+{v}); fica uma lealdade com você.', '{n} accepted and started treatment (+{v}); they now owe you loyalty.', { n: nm(s, k), v }));
  },
});

// ================================================================ romance (love17)

reg({
  id: 'flirt', group: 'love', icon: 'heart', label: l('Flertar / convidar para sair', 'Flirt / ask out'), cooldown: 26,
  desc: l('Se der química: namoro (solteiro) ou um caso secreto (comprometido — love17: segredo, risco de descobrirem).', 'If there\'s chemistry: dating (single) or a secret affair (taken — love17: a secret, risk of discovery).'),
  visible: (s, k) => { const p = personOf(s, k); return !!p && notSelf(s, k) && p.alive && s.year - p.born >= 18; },
  cost: () => ({ usd: 100, balls: 1 }),
  available: (s, k) => strictReal(s, k),
  chance: (s, k) => odds(0.35, [facMod(s, k, 'romantismo', l('Romantismo', 'Romanticism'), 0.4), opMod(s, k), fameMod(s, k, 0.6), [l('Diferença de idade', 'Age gap'), -Math.abs((personOf(s, k)!.born) - (Object.values(s.persons).find((x) => x.isPlayer)?.born ?? personOf(s, k)!.born)) / 60]]),
  run: (s, k, r, ok) => {
    const p = personOf(s, k)!;
    if (!ok) { opine(s, k, -2, l('levou um fora meu.', 'got turned down by me.')); return out(false, T('{n} sorriu, mas deixou claro: "só amizade".', '{n} smiled but made it clear: "just friends".', { n: p.name })); }
    const L0 = life(s);
    const id = `c${s.week}-pa${pa18(s).n}`;
    L0.candidates = [{ id, name: p.name, born: p.born, job: l('artista', 'artist'), trait: 'artsy', chemistry: Math.round(55 + r.next() * 40), personId: p.id }, ...L0.candidates].slice(0, 4);
    const e = L0.partner ? startAffair(s, id) : startDating(s, id);
    if (e) return out(false, e);
    opine(s, k, 10, l('estamos saindo.', 'we\'re seeing each other.'));
    return out(true, L0.partner && L0.partner.personId === p.id ? T('Você e {n} começaram a namorar.', 'You and {n} started dating.', { n: p.name }) : T('Você e {n} começaram um caso. Discrição é tudo agora.', 'You and {n} began an affair. Discretion is everything now.', { n: p.name }));
  },
});

// ================================================================ jogo sujo

reg({
  id: 'detective', group: 'dark', icon: 'search', label: l('Investigar (contratar detetive)', 'Investigate (hire a detective)'), cooldown: 26,
  desc: l('Procura segredos da pessoa (fatos secretos). Achou: vira trunfo (obrigação "segredo"). Pego no ato: ela descobre.', 'Digs for secrets (secret facts). If found: a trump card (a "secret" hold). Caught: they find out.'),
  cost: () => ({ usd: 2500 }),
  available: (s, k) => strictReal(s, k),
  chance: (s, k) => odds(0.55, [facMod(s, k, 'disciplina', l('Disciplina (é cuidadosa)', 'Discipline (is careful)'), -0.3), [l('Fama do alvo (mais olhos)', 'Target fame (more eyes)'), -fameOfKey(s, k) / 300]]),
  run: (s, k, r, ok) => {
    if (!ok) {
      if (r.chance(0.4)) { opine(s, k, -15, l('mandou um detetive atrás de mim.', 'sent a detective after me.')); grantHold(s, { holder: hid(k), target: 'player', kind: 'grievance', strength: 45, months: 48, src: 'pa18', text: l('Foi investigado(a) por você', 'Was investigated by you') }); return out(false, T('O detetive foi visto. {n} sabe que foi você.', 'The detective was spotted. {n} knows it was you.', { n: nm(s, k) })); }
      return out(false, l('O detetive não achou nada (ou não procurou direito).', 'The detective found nothing (or didn\'t look hard).'));
    }
    const ids = new Set([hid(k), ...(personOf(s, k) ? [actOfP(s, hid(k))?.id ?? ''] : [])]);
    const sec = recentFacts(s, { vis: 'secret', months: 240, limit: 200 }).find((f) => f.actors.some((a) => ids.has(a)) && !f.actors.includes('player'));
    if (!sec) return out(true, T('Ficha limpa: {n} não esconde nada que valha a pena.', 'Clean record: {n} hides nothing worth using.', { n: nm(s, k) }));
    grantHold(s, { holder: 'player', target: hid(k), kind: 'secret', strength: 40 + sec.severity / 2, months: 120, proof: 1, factId: sec.id, src: 'pa18', text: sec.text });
    return out(true, T('O detetive achou: "{t}". Agora você tem um trunfo.', 'The detective found it: "{t}". You now hold a trump card.', { t: sec.text }));
  },
});

reg({
  id: 'threaten', group: 'dark', icon: 'skull', label: l('Ameaçar', 'Threaten'), cooldown: 26,
  desc: l('Pressão com o que você tem contra a pessoa. Cedeu: deve um favor. Não cedeu: vai a público.', 'Pressure with what you have on them. If they cave: they owe you a favor. If not: they go public.'),
  available: (s, k) => strictReal(s, k),
  chance: (s, k) => { const lv = leverage(s, 'player', hid(k)); return odds(0.3, [[lv.why ?? l('Trunfos contra a pessoa', 'Leverage over them'), lv.v * 0.5], facMod(s, k, 'coragem', l('Coragem', 'Courage'), -0.4), facMod(s, k, 'ansiedade', l('Ansiedade', 'Anxiety'), 0.25), fameMod(s, k, 0.5)]); },
  run: (s, k, r, ok) => {
    opine(s, k, -20, l('me ameaçou.', 'threatened me.'));
    if (ok) {
      grantHold(s, { holder: 'player', target: hid(k), kind: 'favor', strength: 50, months: 24, src: 'pa18', text: T('Cedeu à ameaça de {c}', 'Gave in to {c}\'s threat', { c: s.config.companyName }) });
      const p = personOf(s, k); if (p) addStress(s, p.id, 12, l('Ameaçado(a)', 'Threatened'));
      fact(s, k, 'threat', 40, 'secret', ['bad', 'crime'], T('{c} ameaça {n} em particular.', '{c} privately threatens {n}.', { c: s.config.companyName, n: nm(s, k) }));
      return out(true, T('{n} cedeu. Agora deve um favor — e odeia você.', '{n} caved. Now they owe you — and hate you.', { n: nm(s, k) }));
    }
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
    grantHold(s, { holder: hid(k), target: 'player', kind: 'grievance', strength: 55, months: 60, src: 'pa18', text: l('Foi ameaçado(a) por você', 'Was threatened by you') });
    fact(s, k, 'threat', 55, 'public', ['bad', 'scandal', 'crime'], T('{n} denuncia ameaças de {c}.', '{n} goes public about threats from {c}.', { n: nm(s, k), c: s.config.companyName }));
    return out(false, T('{n} não se intimidou e contou tudo à imprensa (reputação institucional −3).', '{n} wasn\'t intimidated and told the press everything (institutional reputation −3).', { n: nm(s, k) }));
  },
});

reg({
  id: 'bribe', group: 'dark', icon: 'coin', label: l('Subornar', 'Bribe'), cooldown: 26,
  desc: l('Dinheiro por boa vontade (crítica favorável, silêncio, um "sim"). Os leais e íntegros denunciam.', 'Money for goodwill (a kind review, silence, a "yes"). The loyal and upright report it.'),
  cost: (s, k) => ({ usd: 2000 + fameOfKey(s, k) * 80 }),
  available: (s, k) => strictReal(s, k),
  chance: (s, k) => odds(0.5, [facMod(s, k, 'lealdade', l('Lealdade/integridade', 'Loyalty/integrity'), -0.5), facMod(s, k, 'ambicao', l('Ambição', 'Ambition'), 0.3), facMod(s, k, 'generosidade', l('Generosidade (não liga para dinheiro)', 'Generosity (doesn\'t care for money)'), -0.2), opMod(s, k, 0.5)]),
  run: (s, k, r, ok) => {
    if (ok) {
      opine(s, k, 10, l('aceitou um agrado.', 'took a sweetener.'));
      grantHold(s, { holder: 'player', target: hid(k), kind: 'secret', strength: 45, months: 60, proof: 1, src: 'pa18', text: T('{n} aceitou suborno de {c}', '{n} took a bribe from {c}', { n: nm(s, k), c: s.config.companyName }) });
      fact(s, k, 'bribe', 45, 'secret', ['bad', 'crime', 'money'], T('{n} aceita dinheiro de {c}.', '{n} takes money from {c}.', { n: nm(s, k), c: s.config.companyName }));
      return out(true, T('{n} aceitou. Os dois agora têm um segredo — e cada um tem algo contra o outro.', '{n} accepted. You both share a secret now — and each has something on the other.', { n: nm(s, k) }));
    }
    opine(s, k, -15, l('tentou me comprar.', 'tried to buy me.'));
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100);
    fact(s, k, 'bribe', 60, 'public', ['bad', 'scandal', 'crime', 'money'], T('{n} denuncia tentativa de suborno de {c}.', '{n} reports a bribe attempt by {c}.', { n: nm(s, k), c: s.config.companyName }));
    return out(false, T('{n} recusou e denunciou (reputação institucional −4).', '{n} refused and reported it (institutional reputation −4).', { n: nm(s, k) }));
  },
});

// ================================================================ crime17 (ligado, não duplicado)

for (const c of CRIMES17) {
  if (c.tk !== 'person' && c.tk !== 'act' && c.tk !== 'label') continue;
  const target = (s: GameState, k: string): string | null => {
    if (c.tk === 'person') return pidOf(s, k) ?? null;
    if (c.tk === 'act') { const id = pidOf(s, k); const a = id ? actOfP(s, id) : undefined; return a && !mineAct(s, a) ? a.id : null; }
    if (k.startsWith('l:')) return leaders(s).L[k.slice(2)]?.label ?? null;
    return null;
  };
  const ctx = (s: GameState, k: string): Ctx17 => ({ actor: 'player', target: target(s, k)!, method: c.methods?.[0]?.id, partners: [] });
  registerPersonAction({
    id: `crime:${c.id}`, group: 'dark', icon: 'skull', label: c.tk === 'act' ? fmtL(l('{c} (o ato)', '{c} (their act)'), { c: c.name }) : c.name, desc: c.desc, selfRoll: true,
    visible: (s, k) => !isMe(s, k) && !!target(s, k) && alive(s, k) && !(c.tk === 'person' && mineAct(s, actOfP(s, hid(k)))),
    cost: (s, k) => ({ cents: crimeOdds(s, ctx(s, k), c.id).cost, shown: true }),
    available: (s, k) => strictReal(s, k) ?? crimeOdds(s, ctx(s, k), c.id).block,
    chance: (s, k) => { const o = crimeOdds(s, ctx(s, k), c.id); return { p: o.p, why: [...o.why, fmtL(l('Risco de exposição: {q}%', 'Exposure risk: {q}%'), { q: Math.round(o.q * 100) }), l('Mais opções (método, sócios, organização): menu Crime → Planos.', 'More options (method, partners, organization): Crime menu → Plans.')] }; },
    run: (s, k) => { const r0 = commitCrime(s, c.id, ctx(s, k)); return typeof r0 === 'object' && 'ok' in r0 ? out(r0.ok, r0.ex ? fmtL(l('{t} E vazou!', '{t} And it leaked!'), { t: r0.text }) : r0.text) : out(false, r0); },
  });
}

export const _pa18sys = { fameOfKey, realKey18, odds, isMe };
