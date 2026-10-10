// Rodada 18 (decide18) — 10 decisões NOVAS que mostram cada forma de escolha: com PRAZO (vencem na semana),
// em VÁRIAS ETAPAS (a promessa volta como novo cartão), APOSTAS com chance visível, opções TRAVADAS por traço,
// habilidade ou relação, e opções que se DESTRAVAM por escolhas anteriores. Todas com efeito agora e/ou depois.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerConseq18, unlocked18, type Ctx18 } from '../decide18';
import type { EventDef } from '../events';
import { deferEvents } from '../ext4';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post, staffSkill } from '../util';
import { adjRel18, relOf18 } from './agency18';
import { follow18 } from './echoes18';
import { per13 } from './persona13';
import { scandal } from '../scandal17';

type Opt = EventDef['options'][number];
const N = (pt: string, en: string): L => l(pt, en);
const mineActs = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split' && a.members.length);
const actOf = (s: GameState, c: Ctx18): Act | undefined => s.acts[String(c.act)];
const rr = (s: GameState, c: Ctx18, tag: string): Rng => Rng.fromSeed(`${s.config.seed}:dn18:${tag}:${c.act ?? ''}:${c.person ?? ''}:${s.week}`);
const pay = (s: GameState, k: string, real: number, cat: string, memo: string): void => { post(s, `dn18:${k}`, -money(s, real), cat, memo); };
const gain = (s: GameState, k: string, real: number, cat: string, memo: string): void => { post(s, `dn18:${k}`, money(s, real), cat, memo); };
const mood = (s: GameState, a: Act | undefined, k: 'morale' | 'stress' | 'inspiration' | 'fatigue' | 'resentment', v: number, only?: string): void => {
  if (!a) return;
  for (const id of a.members) { if (only && id !== only) continue; const p = s.persons[id]; if (p?.alive) p[k] = clamp(p[k] + v, 0, 100); }
};
const me = (s: GameState) => per13(s, 'player');
const pct = (p: number) => `${Math.round(p * 100)}%`;
const o = (id: string, pt: string, en: string, hint: [string, string], apply: Opt['apply']): Opt => ({ id, label: l(pt, en), hint: l(hint[0], hint[1]), apply });
const ev = (d: Omit<EventDef, 'tags'> & { tags?: string[] }): EventDef => ({ tags: [], weight: 0.55, ...d });

// ---------------------------------------------------------------- chances (visíveis no cartão e usadas no sorteio)
export const haggleP18 = (s: GameState): { p: number; why: L[] } => {
  const neg = me(s)?.attrs.neg ?? 50, bk = staffSkill(s, 'booking');
  return { p: clamp(0.3 + (neg - 50) / 200 + bk / 400, 0.1, 0.8), why: [N('Base 30%', 'Base 30%'), fmtL(l('Sua negociação {n}', 'Your negotiation {n}'), { n: Math.round(neg) }), fmtL(l('Agente de shows {n}', 'Booking agent {n}'), { n: bk })] };
};
export const pressP18 = (s: GameState, c: Ctx18): { p: number; why: L[] } => {
  const a = actOf(s, c);
  const f = a?.fame ?? 20, m = a?.momentum ?? 0;
  return { p: clamp(0.2 + f / 200 + m / 300, 0.08, 0.85), why: [N('Base 20%', 'Base 20%'), fmtL(l('Fama {n}', 'Fame {n}'), { n: Math.round(f) }), fmtL(l('Embalo {n}', 'Momentum {n}'), { n: Math.round(m) })] };
};
export const demoP18 = (s: GameState): { p: number; why: L[] } => {
  const ar = staffSkill(s, 'anr'), ear = me(s)?.attrs.ear ?? 50;
  return { p: clamp(0.2 + ar / 250 + (ear - 50) / 250, 0.08, 0.75), why: [N('Base 20%', 'Base 20%'), fmtL(l('A&R {n}', 'A&R {n}'), { n: ar }), fmtL(l('Seu ouvido {n}', 'Your ear {n}'), { n: Math.round(ear) })] };
};

// ---------------------------------------------------------------- 1. show relâmpago (prazo + aposta)
const flash = ev({
  id: 'd18_flash_gig', cat: 'stage', tone: 'good', cooldown: 10,
  find: (s, r) => { const a = mineActs(s).filter((x) => x.fame >= 10); if (!a.length || !r.chance(0.3)) return null; const x = r.pick(a); return { act: x.id, fee: Math.round(1500 + x.fame * 60), dl18: s.week + 1 }; },
  title: N('Show relâmpago para {act}', 'Last-minute gig for {act}'),
  text: N('Um promotor perdeu a banda de abertura de um astro. Quer {act} AMANHÃ por {feeTxt}. Responde ainda nesta semana.', 'A promoter lost a star\'s opening act. Wants {act} TOMORROW for {feeTxt}. Answer this week.'),
  options: [
    o('go', 'Topar na hora', 'Take it now', ['Cachê agora; cansaço; público novo depois (talvez).', 'Fee now; fatigue; new audience later (maybe).'], (s, _r, c) => { gain(s, `flash:${c.act}`, Number(c.fee), 'live', 'Show relâmpago'); mood(s, actOf(s, c), 'fatigue', 10); }),
    o('haggle', 'Pedir o dobro', 'Ask for double', ['Aposta: chance visível de levar 1,8× — ou perder a vaga.', 'Gamble: visible odds of 1.8× — or losing the slot.'], (s, _r, c) => {
      const ok = rr(s, c, 'haggle').chance(haggleP18(s).p);
      if (ok) { gain(s, `flash2:${c.act}`, Math.round(Number(c.fee) * 1.8), 'live', 'Show relâmpago (renegociado)'); mood(s, actOf(s, c), 'fatigue', 10); }
      else mood(s, actOf(s, c), 'morale', -4);
    }),
    o('pass', 'Recusar', 'Decline', ['Nada muda.', 'Nothing changes.'], () => {}),
  ],
});
registerConseq18('ev:d18_flash_gig:go', { now: N('Cachê entra, +10 cansaço.', 'Fee in, +10 fatigue.'), later: [{ in: [1, 4], p: 0.5, tone: 'good', hint: N('O público do astro pode virar seu.', 'The star\'s crowd may become yours.'), fx: (f) => { f.fans(3); return fmtL(l('Fãs do astro descobriram {a} naquela noite.', 'The star\'s fans discovered {a} that night.'), { a: f.act?.name ?? '' }); } }] });
registerConseq18('ev:d18_flash_gig:haggle', { odds: (s) => haggleP18(s), now: N('Ganha: 1,8× o cachê. Perde: a vaga vai para outro.', 'Win: 1.8× the fee. Lose: the slot goes to someone else.') });

// ---------------------------------------------------------------- 2. a promessa do disco solo (várias etapas)
const promise = ev({
  id: 'd18_promise_solo', cat: 'band', tone: 'neutral', cooldown: 18,
  find: (s, r) => {
    const a = mineActs(s).filter((x) => x.members.length >= 3);
    if (!a.length || !r.chance(0.25)) return null;
    const x = r.pick(a), p = s.persons[r.pick(x.members)];
    return p?.alive && !p.isPlayer ? { act: x.id, person: p.id } : null;
  },
  title: N('{person} quer um disco solo', '{person} wants a solo record'),
  text: N('{person} pede, em particular, a promessa de um disco solo pelo selo "quando a banda respirar". O resto de {act} não sabe.', '{person} privately asks for a promise of a solo record "once the band can breathe". The rest of {act} doesn\'t know.'),
  options: [
    o('promise', 'Prometer', 'Promise', ['Moral +12 agora. Daqui a meses a conta chega: cumprir custa, quebrar magoa.', 'Morale +12 now. In months the bill comes: keeping costs, breaking hurts.'], (s, _r, c) => mood(s, actOf(s, c), 'morale', 12, String(c.person))),
    o('refuse', 'Dizer não, com franqueza', 'Say no, honestly', ['Moral −8 agora; pode guardar mágoa.', 'Morale −8 now; may hold a grudge.'], (s, _r, c) => mood(s, actOf(s, c), 'morale', -8, String(c.person))),
    o('later', 'Conversar depois', 'Talk later', ['Moral −3; o assunto não morre.', 'Morale −3; the topic doesn\'t die.'], (s, _r, c) => mood(s, actOf(s, c), 'morale', -3, String(c.person))),
  ],
});
const promiseDue = ev({
  id: 'd18_promise_due', cat: 'band', tone: 'neutral', cooldown: 0, forcedOnly: true,
  title: N('A promessa a {person}', 'The promise to {person}'),
  text: N('{person} lembra: "você prometeu o disco solo". Cumprir custa dinheiro e tempo; adiar de novo é quebrar a palavra.', '{person} reminds you: "you promised the solo record". Keeping it costs money and time; postponing again breaks your word.'),
  options: [
    o('keep', 'Cumprir: bancar o disco solo', 'Keep it: fund the solo record', ['Custo agora; confiança e lealdade; destrava "palavra cumprida".', 'Cost now; trust and loyalty; unlocks "word kept".'], (s, _r, c) => { pay(s, `solo:${c.person}`, 4000, 'artist_dev', 'Disco solo prometido'); const a = actOf(s, c); if (a) a.trust = clamp(a.trust + 10, 0, 100); mood(s, a, 'morale', 15, String(c.person)); mood(s, a, 'inspiration', 10, String(c.person)); }),
    o('band', 'Cumprir pela metade: faixa solo no disco da banda', 'Half-keep: a solo track on the band album', ['Barato; agrada um pouco; a banda pode estranhar.', 'Cheap; pleases a bit; the band may resent.'], (s, _r, c) => { pay(s, `solo2:${c.person}`, 800, 'artist_dev', 'Faixa solo'); mood(s, actOf(s, c), 'morale', 5, String(c.person)); mood(s, actOf(s, c), 'resentment', 4); }),
    o('break', 'Adiar de novo', 'Postpone again', ['Promessa quebrada: mágoa forte; pode sair da banda.', 'Promise broken: strong grudge; may leave the band.'], (s, _r, c) => { mood(s, actOf(s, c), 'resentment', 20, String(c.person)); mood(s, actOf(s, c), 'morale', -12, String(c.person)); }),
  ],
});
registerConseq18('ev:d18_promise_solo:promise', { later: [{ in: [6, 10], p: 1, tone: 'mixed', hint: N('Promessas voltam para cobrança.', 'Promises come back to be collected.'), fx: (f) => { follow18(f, 'd18_promise_due'); return fmtL(l('{p} veio cobrar a promessa do disco solo.', '{p} came to collect on the solo-record promise.'), { p: f.person?.name ?? '' }); } }] });
registerConseq18('ev:d18_promise_solo:refuse', { later: [{ in: [4, 8], p: 0.35, tone: 'bad', hint: N('Um "não" pode azedar.', 'A "no" may sour.'), fx: (f) => { f.mood('resentment', 10); return fmtL(l('{p} anda dizendo que o selo "não deixa ninguém crescer".', '{p} says the label "lets no one grow".'), { p: f.person?.name ?? '' }); } }] });
registerConseq18('ev:d18_promise_due:keep', { unlock: 'keeper18', later: [{ in: [4, 9], p: 0.6, tone: 'good', hint: N('Palavra cumprida vira fama no meio.', 'A kept word becomes industry reputation.'), fx: (f) => { f.rep('artists', 4); return N('Artistas comentam: "lá eles cumprem o que prometem".', 'Artists say: "over there, they keep their promises".'); } }] });
registerConseq18('ev:d18_promise_due:break', { later: [{ in: [2, 6], p: 0.55, tone: 'bad', hint: N('Promessa quebrada procura a porta.', 'A broken promise looks for the door.'), fx: (f) => { f.mood('resentment', 8); follow18(f, 'member_leaves'); return fmtL(l('{p} decidiu: sem disco solo, sem banda.', '{p} decided: no solo record, no band.'), { p: f.person?.name ?? '' }); } }] });

// ---------------------------------------------------------------- 3. a pergunta do jornalista (mentira que pode vir à tona; opção destravável)
const press = ev({
  id: 'd18_press_lie', cat: 'scandal', tone: 'bad', cooldown: 14,
  find: (s, r) => { const a = mineActs(s).filter((x) => x.members.some((id) => (s.persons[id]?.resentment ?? 0) > 30 || (s.persons[id]?.stress ?? 0) > 55)); if (!a.length || !r.chance(0.35)) return null; return { act: r.pick(a).id }; },
  title: N('Um jornalista pergunta sobre {act}', 'A journalist asks about {act}'),
  text: N('"É verdade que {act} está brigando e pode acabar?" A matéria sai na semana que vem — com ou sem a sua versão.', '"Is it true {act} is fighting and may split?" The story runs next week — with or without your side.'),
  options: [
    o('lie', 'Negar tudo: "nunca estivemos tão bem"', 'Deny everything: "never been better"', ['Nada agora. Se a verdade aparecer, o estrago é maior.', 'Nothing now. If the truth comes out, the damage is bigger.'], () => {}),
    o('truth', 'Contar a verdade com cuidado', 'Tell the truth carefully', ['Fama −1 agora; reputação +2; o jornalista pode virar aliado.', 'Fame −1 now; reputation +2; the journalist may become an ally.'], (s, _r, c) => { const a = actOf(s, c); if (a) a.fame = clamp(a.fame - 1, 0, 100); s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100); }),
    o('goodwill', 'Cobrar a boa vontade da imprensa', 'Call in press goodwill', ['A matéria morre. Exige ter feito algo pela cidade (show beneficente) ou um aliado na imprensa.', 'The story dies. Needs a past good deed (charity gig) or a press ally.'], () => {}),
    o('noco', 'Sem comentários', 'No comment', ['A matéria sai sem a sua versão.', 'The story runs without your side.'], (s, _r, c) => { const a = actOf(s, c); if (a) mood(s, a, 'stress', 4); }),
  ],
});
registerConseq18('ev:d18_press_lie:lie', { later: [{ in: [3, 9], p: 0.55, tone: 'bad', hint: N('Mentiras públicas têm prazo de validade.', 'Public lies have an expiry date.'), fx: (f) => { const a = f.act; if (a) scandal(f.s, a.id, 'conduct', 25, N('A mentira sobre a banda veio à tona.', 'The lie about the band surfaced.')); f.rep('institutional', -4); return fmtL(l('A briga em {a} veio à tona — e a sua negação virou manchete.', 'The {a} fight surfaced — and your denial made headlines.'), { a: a?.name ?? '' }); } }] });
registerConseq18('ev:d18_press_lie:truth', { later: [{ in: [3, 8], p: 0.45, tone: 'good', hint: N('Franqueza pode render um aliado.', 'Candor may earn an ally.'), fx: (f) => { f.rep('institutional', 2); return N('O jornalista agradeceu a franqueza: agora te liga antes de publicar.', 'The journalist appreciated the candor: now calls you before publishing.'); } }], unlock: 'press_ally18' });
registerConseq18('ev:d18_press_lie:goodwill', { gate: (s) => (unlocked18(s, 'goodwill18') || unlocked18(s, 'press_ally18') ? null : N('Travada: falta boa vontade (faça um show beneficente ou conquiste um aliado na imprensa).', 'Locked: no goodwill yet (play a charity gig or win a press ally).')) });
registerConseq18('ev:d18_press_lie:noco', { later: [{ in: [2, 6], p: 0.3, tone: 'mixed', hint: N('O silêncio deixa a história com os outros.', 'Silence leaves the story to others.'), fx: (f) => { f.fame(-1); return fmtL(l('A matéria sobre {a} ganhou continuação.', 'The {a} story got a sequel.'), { a: f.act?.name ?? '' }); } }] });

// ---------------------------------------------------------------- 4. dobrar a tiragem (aposta com odds)
const bet = ev({
  id: 'd18_pressing_bet', cat: 'manufacturing', tone: 'neutral', cooldown: 12,
  find: (s, r) => { const p = s.pendingReleases.filter((x) => s.acts[x.actId]?.owner === 'player'); if (!p.length || !r.chance(0.3)) return null; const x = r.pick(p); return { act: x.actId, pending: x.id, fee: 3000 }; },
  title: N('Dobrar a tiragem de "{pendingTitle}"?', 'Double the run of "{pendingTitle}"?'),
  text: N('A fábrica oferece o dobro de cópias pelo preço de 1,5× se você fechar agora ({feeTxt} a mais). Se o disco pegar, você lucra no estoque; se não, encalha.', 'The plant offers double copies at 1.5× the price if you commit now ({feeTxt} extra). If it hits you profit on stock; if not, it sits.'),
  options: [
    o('double', 'Dobrar (aposta)', 'Double (gamble)', ['Custo agora; chance visível de render 2,6× em 1–3 meses.', 'Cost now; visible odds of 2.6× in 1–3 months.'], (s, _r, c) => pay(s, `bet:${c.pending}`, Number(c.fee), 'release', 'Tiragem dobrada')),
    o('normal', 'Tiragem normal', 'Normal run', ['Sem risco.', 'No risk.'], () => {}),
  ],
});
registerConseq18('ev:d18_pressing_bet:double', {
  odds: (s, c) => pressP18(s, c), now: N('−custo agora.', '−cost now.'),
  later: [{ in: [1, 3], p: (s, c) => pressP18(s, c).p, tone: 'mixed', hint: N('Ou o estoque vira ouro, ou vira encalhe.', 'The stock turns to gold — or to dead stock.'),
    fx: (f) => { f.cash(Math.round(Number(f.c.fee) * 2.6), 'Tiragem dobrada: esgotou', 'sales'); return N('A aposta deu certo: a tiragem dobrada esgotou.', 'The bet paid off: the doubled run sold out.'); },
    miss: (f) => { f.cash(-400, 'Encalhe: armazém', 'release'); return N('Encalhe: metade da tiragem dobrada voltou para o armazém.', 'Dead stock: half the doubled run came back to the warehouse.'); } }],
});

// ---------------------------------------------------------------- 5. o mentor (portão de habilidade, destrava)
const mentor = ev({
  id: 'd18_mentor', cat: 'career', tone: 'good', cooldown: 20,
  find: (s, r) => { const a = mineActs(s).filter((x) => s.year - x.formed <= 4); if (!a.length || !r.chance(0.25)) return null; const x = r.pick(a); return { act: x.id, person: x.leaderId ?? x.members[0] }; },
  title: N('Um veterano quer orientar {person}', 'A veteran wants to mentor {person}'),
  text: N('Um produtor lendário viu {act} e quer passar seis meses orientando {person}. Funciona melhor se alguém do selo acompanhar.', 'A legendary producer saw {act} and wants to mentor {person} for six months. Works best if someone from the label follows along.'),
  options: [
    o('ar', 'Aceitar com o seu A&R junto', 'Accept with your A&R along', ['Inspiração +12; destrava "escola do mentor". Exige A&R ≥ 55.', 'Inspiration +12; unlocks "mentor school". Needs A&R ≥ 55.'], (s, _r, c) => mood(s, actOf(s, c), 'inspiration', 12, String(c.person))),
    o('accept', 'Aceitar (pagar a ajuda de custo)', 'Accept (pay the stipend)', ['Custo; inspiração +8; o veterano pode virar contato.', 'Cost; inspiration +8; the veteran may become a contact.'], (s, _r, c) => { pay(s, `mentor:${c.person}`, 2000, 'artist_dev', 'Mentoria'); mood(s, actOf(s, c), 'inspiration', 8, String(c.person)); }),
    o('pass', 'Agradecer e recusar', 'Thank and decline', ['Nada muda.', 'Nothing changes.'], () => {}),
  ],
});
registerConseq18('ev:d18_mentor:ar', { gate: (s) => (staffSkill(s, 'anr') >= 55 ? null : fmtL(l('Travada: seu A&R tem {n} (precisa de 55).', 'Locked: your A&R is {n} (needs 55).'), { n: staffSkill(s, 'anr') })), unlock: 'mentor18',
  later: [{ in: [5, 10], p: 0.65, tone: 'good', hint: N('O que o mentor ensina aparece no disco.', 'What the mentor teaches shows on the record.'), fx: (f) => { f.mood('inspiration', 10).fame(2); return fmtL(l('{p} voltou da mentoria outro(a) artista.', '{p} came back from mentoring a different artist.'), { p: f.person?.name ?? '' }); } }] });
registerConseq18('ev:d18_mentor:accept', { later: [{ in: [4, 9], p: 0.4, tone: 'good', hint: N('Um contato veterano abre portas.', 'A veteran contact opens doors.'), fx: (f) => { f.rep('artistic', 2); return N('O veterano indicou o seu selo numa entrevista.', 'The veteran name-checked your label in an interview.'); } }] });

// ---------------------------------------------------------------- 6. trégua com um rival (portão de relação e traço)
const truce = ev({
  id: 'd18_truce', cat: 'market', tone: 'neutral', cooldown: 24,
  find: (s, r) => { const ls = Object.values(s.labels).filter((x) => x && !(x as { defunct?: boolean }).defunct); if (ls.length < 2 || !r.chance(0.2)) return null; return { label: r.pick(ls).id }; },
  title: N('{labelName} propõe uma trégua', '{labelName} proposes a truce'),
  text: N('O chefe da {labelName} sugere: nada de aliciar artistas um do outro por dois anos. Um aperto de mão — ou uma negociação dura.', 'The {labelName} boss suggests: no poaching each other\'s artists for two years. A handshake — or a hard bargain.'),
  options: [
    o('shake', 'Apertar a mão', 'Shake hands', ['Relação +20. Exige relação ≥ +10 com o chefe.', 'Relationship +20. Needs relationship ≥ +10 with the boss.'], (s, _r, c) => adjRel18(s, `l:${c.label}`, 'player', 20, l('trégua', 'truce'))),
    o('demand', 'Exigir compensação', 'Demand compensation', ['Dinheiro agora; ele não esquece. Exige sua negociação ≥ 60.', 'Money now; they won\'t forget. Needs your negotiation ≥ 60.'], (s, _r, c) => { gain(s, `truce:${c.label}`, 3000, 'other_income', 'Compensação de trégua'); adjRel18(s, `l:${c.label}`, 'player', -10, l('exigiu compensação', 'demanded compensation')); }),
    o('refuse', 'Recusar', 'Refuse', ['A rivalidade segue.', 'The rivalry goes on.'], (s, _r, c) => adjRel18(s, `l:${c.label}`, 'player', -5, l('recusou a trégua', 'refused the truce'))),
  ],
});
registerConseq18('ev:d18_truce:shake', { gate: (s, c) => { const v = relOf18(s, `l:${c.label}`, 'player'); return v >= 10 ? null : fmtL(l('Travada: relação com o chefe é {v} (precisa de +10).', 'Locked: relationship with the boss is {v} (needs +10).'), { v: Math.round(v) }); },
  later: [{ in: [4, 10], p: 0.5, tone: 'good', hint: N('Aliados trocam dicas.', 'Allies trade tips.'), fx: (f) => { f.rep('commercial', 2); return N('O rival passou uma dica: um artista bom demais para o elenco dele.', 'The rival passed you a tip: an artist too good for their roster.'); } }] });
registerConseq18('ev:d18_truce:demand', { gate: (s) => { const n = me(s)?.attrs.neg ?? 0; return n >= 60 ? null : fmtL(l('Travada: sua negociação é {n} (precisa de 60).', 'Locked: your negotiation is {n} (needs 60).'), { n: Math.round(n) }); },
  later: [{ in: [6, 14], p: 0.4, tone: 'bad', hint: N('Quem paga caro cobra depois.', 'Those who pay dearly collect later.'), fx: (f) => { f.rep('commercial', -2); return N('O rival "esqueceu" a trégua e cercou um dos seus artistas.', 'The rival "forgot" the truce and courted one of your artists.'); } }] });
registerConseq18('ev:d18_truce:refuse', { later: [{ in: [6, 12], p: 0.3, tone: 'bad', hint: N('Rival recusado procura vingança.', 'A refused rival seeks payback.'), fx: (f) => { f.rep('commercial', -1); return N('O rival fala mal do seu selo em toda reunião de rádio.', 'The rival badmouths your label at every radio meeting.'); } }] });

// ---------------------------------------------------------------- 7. show beneficente (destrava boa vontade)
const charity = ev({
  id: 'd18_charity', cat: 'culture', tone: 'good', cooldown: 18,
  find: (s, r) => { const a = mineActs(s); if (!a.length || !r.chance(0.25)) return null; return { act: r.pick(a).id, city: s.config.homeCity }; },
  title: N('Show beneficente em {cityName}', 'Charity gig in {cityName}'),
  text: N('Um hospital da cidade pede um show beneficente de {act}. Não paga nada — mas a cidade lembra de quem aparece.', 'A city hospital asks {act} for a charity gig. Pays nothing — but the city remembers who shows up.'),
  options: [
    o('play', 'Tocar de graça', 'Play for free', ['Cansaço +8; reputação +2; destrava "boa vontade".', 'Fatigue +8; reputation +2; unlocks "goodwill".'], (s, _r, c) => { mood(s, actOf(s, c), 'fatigue', 8); s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100); }),
    o('donate', 'Só doar', 'Just donate', ['Custo; destrava "boa vontade".', 'Cost; unlocks "goodwill".'], (s) => pay(s, `charity:${s.week}`, 1500, 'marketing', 'Doação')),
    o('skip', 'Agenda cheia', 'Schedule is full', ['Nada muda.', 'Nothing changes.'], () => {}),
  ],
});
registerConseq18('ev:d18_charity:play', { unlock: 'goodwill18', later: [{ in: [3, 9], p: 0.5, tone: 'good', hint: N('A cidade lembra de quem apareceu.', 'The city remembers who showed up.'), fx: (f) => { f.fans(2).rep('institutional', 1); return fmtL(l('O hospital batizou uma ala com o nome do show de {a}.', 'The hospital named a wing after the {a} show.'), { a: f.act?.name ?? '' }); } }] });
registerConseq18('ev:d18_charity:donate', { unlock: 'goodwill18' });

// ---------------------------------------------------------------- 8. a van quebrou (várias etapas)
const van = ev({
  id: 'd18_van', cat: 'stage', tone: 'bad', cooldown: 10,
  find: (s, r) => { if (unlocked18(s, 'van18')) return null; const a = mineActs(s).filter((x) => x.fame < 60); if (!a.length || !r.chance(0.2)) return null; return { act: r.pick(a).id }; },
  title: N('A van de {act} morreu na estrada', '{act}\'s van died on the road'),
  text: N('Motor fundido no meio da turnê. Três caminhos: uma usada barata, uma nova, ou alugar até o fim da turnê.', 'Blown engine mid-tour. Three ways: a cheap used one, a new one, or rent until the tour ends.'),
  options: [
    o('used', 'Van usada barata', 'Cheap used van', ['Barato agora; pode quebrar de novo.', 'Cheap now; may break again.'], (s, _r, c) => pay(s, `van:${c.act}:${s.week}`, 1200, 'live', 'Van usada')),
    o('new', 'Van nova', 'New van', ['Caro; resolve de vez (destrava "van própria").', 'Pricey; solves it for good (unlocks "own van").'], (s, _r, c) => post(s, `dn18:vannew:${c.act}`, -money(s, 6000), 'capex', 'Van nova')),
    o('rent', 'Alugar', 'Rent', ['Custo médio; cansaço +6.', 'Medium cost; fatigue +6.'], (s, _r, c) => { pay(s, `vanr:${c.act}:${s.week}`, 800, 'live', 'Aluguel de van'); mood(s, actOf(s, c), 'fatigue', 6); }),
  ],
});
registerConseq18('ev:d18_van:used', { later: [{ in: [1, 4], p: 0.5, tone: 'bad', hint: N('Barato pode sair caro.', 'Cheap can turn expensive.'), fx: (f) => { follow18(f, 'd18_van'); f.mood('stress', 5); return fmtL(l('A van usada de {a} quebrou de novo.', '{a}\'s used van broke down again.'), { a: f.act?.name ?? '' }); } }] });
registerConseq18('ev:d18_van:new', { unlock: 'van18' });

// ---------------------------------------------------------------- 9. a demo quente (prazo + aposta)
const demo = ev({
  id: 'd18_demo', cat: 'scouting', tone: 'good', cooldown: 12,
  find: (s, r) => (r.chance(0.18) ? { fee: 1000, dl18: s.week + 1, genre: r.pick(Object.keys(s.genrePop)) } : null),
  title: N('Uma demo quente de {genreName}', 'A hot {genreName} demo'),
  text: N('Um garoto deixou uma fita na recepção. Dois selos já ligaram para ele. Assinar hoje custa {feeTxt} de adiantamento — amanhã pode ser tarde.', 'A kid left a tape at the front desk. Two labels already called him. Signing today costs a {feeTxt} advance — tomorrow may be too late.'),
  options: [
    o('sign', 'Assinar agora (aposta)', 'Sign now (gamble)', ['Custo agora; chance visível de virar um sucesso regional.', 'Cost now; visible odds of a regional hit.'], (s) => pay(s, `demo:${s.week}`, 1000, 'advances', 'Adiantamento de demo')),
    o('pass', 'Deixar passar', 'Let it go', ['Nada agora; um rival pode pegar.', 'Nothing now; a rival may grab it.'], () => {}),
  ],
});
registerConseq18('ev:d18_demo:sign', { odds: (s) => demoP18(s), later: [{ in: [3, 8], p: (s) => demoP18(s).p, tone: 'mixed', hint: N('Demo é bilhete de loteria com ouvido.', 'A demo is a lottery ticket with ears.'),
  fx: (f) => { f.cash(4500, 'Single da demo', 'sales').rep('artistic', 2); return N('O single da demo virou sucesso regional.', 'The demo single became a regional hit.'); },
  miss: (f) => { f.note(N('Adiantamento perdido.', 'Advance lost.')); return N('A demo não passou de uma fita bonita.', 'The demo was just a nice tape.'); } }] });
registerConseq18('ev:d18_demo:pass', { later: [{ in: [3, 8], p: 0.3, tone: 'bad', hint: N('Quem passou pode estourar no rival.', 'The one you passed on may blow up at a rival.'), fx: (f) => { f.rep('commercial', -1); return N('O garoto da demo assinou com um rival — e está no rádio.', 'The demo kid signed with a rival — and he\'s on the radio.'); } }] });

// ---------------------------------------------------------------- 10. jantar com financista (portão de traço)
const dinner = ev({
  id: 'd18_investor_dinner', cat: 'business', tone: 'neutral', cooldown: 20,
  find: (s, r) => (s.year >= 1950 && r.chance(0.12) ? {} : null),
  title: N('Jantar com um financista', 'Dinner with a financier'),
  text: N('Um financista quer "conhecer melhor o negócio da música". Pode virar patrocínio — se você souber conduzir a noite.', 'A financier wants to "get to know the music business". It could turn into sponsorship — if you can carry the evening.'),
  options: [
    o('charm', 'Encantar (histórias de estúdio)', 'Charm (studio stories)', ['Patrocínio provável depois. Exige carisma ≥ 60.', 'Sponsorship likely later. Needs charisma ≥ 60.'], () => {}),
    o('numbers', 'Mostrar os números', 'Show the numbers', ['Patrocínio menor, mais certo. Exige gestão ≥ 55.', 'Smaller, surer sponsorship. Needs management ≥ 55.'], () => {}),
    o('polite', 'Jantar educado', 'Polite dinner', ['Nada demais.', 'Nothing much.'], () => {}),
  ],
});
registerConseq18('ev:d18_investor_dinner:charm', { gate: (s) => { const n = me(s)?.attrs.cha ?? 0; return n >= 60 ? null : fmtL(l('Travada: seu carisma é {n} (precisa de 60).', 'Locked: your charisma is {n} (needs 60).'), { n: Math.round(n) }); },
  later: [{ in: [2, 6], p: 0.6, tone: 'good', hint: N('Uma boa noite rende ligação.', 'A good evening earns a call.'), fx: (f) => { f.cash(5000, 'Patrocínio do financista', 'brands'); return N('O financista ligou: quer patrocinar o próximo lançamento.', 'The financier called: wants to sponsor the next release.'); } }] });
registerConseq18('ev:d18_investor_dinner:numbers', { gate: (s) => { const n = me(s)?.attrs.mgmt ?? 0; return n >= 55 ? null : fmtL(l('Travada: sua gestão é {n} (precisa de 55).', 'Locked: your management is {n} (needs 55).'), { n: Math.round(n) }); },
  later: [{ in: [2, 6], p: 0.8, tone: 'good', hint: N('Números claros dão confiança.', 'Clear numbers build trust.'), fx: (f) => { f.cash(2500, 'Patrocínio do financista', 'brands'); return N('O financista fechou um patrocínio modesto.', 'The financier closed a modest sponsorship.'); } }] });

// gates em decisões antigas: compensação/compra exige caixa
registerConseq18('ev:catalog_for_sale:buy', { gate: (s, c) => (s.player.cash >= money(s, Number(c.price ?? 0)) ? null : N('Travada: caixa insuficiente para o preço pedido.', 'Locked: not enough cash for the asking price.')),
  later: [{ in: [6, 12], p: 0.5, tone: 'good', hint: N('Catálogo antigo esconde joias.', 'Old catalogs hide gems.'), fx: (f) => { f.cash(5000, 'Joia do catálogo', 'licensing'); return N('Uma faixa esquecida do catálogo comprado entrou numa novela.', 'A forgotten track from the bought catalog landed in a TV drama.'); } }] });

deferEvents<EventDef>([flash, promise, promiseDue, press, bet, mentor, truce, charity, van, demo, dinner]);
export const NEW18 = ['d18_flash_gig', 'd18_promise_solo', 'd18_promise_due', 'd18_press_lie', 'd18_pressing_bet', 'd18_mentor', 'd18_truce', 'd18_charity', 'd18_van', 'd18_demo', 'd18_investor_dinner'];
export const _dn18 = { pct };
