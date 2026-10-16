// Rodada 23 — LIGAÇÕES entre sistemas que corriam isolados ("tudo influencia tudo"). Cada ligação é pequena, usa os
// hubs que já existem (ouvintes de fatos, ODDS17 do crime, RECRUIT23 do crimemem23, FIND23 do scout23, PRESS23/ERA23/
// MEDIA23 do secrets23, holds17, estresse) e deixa um "porquê" legível. Lista e critérios em docs/conexoes23.md.
//   L1  culture19 → crimemem23: funcionário insatisfeito (lealdade baixa) é recrutado mais fácil; artista-primeiro protege.
//   L2  culture19 → secrets23: equipe insatisfeita / caos criativo vazam segredos do seu círculo para a imprensa.
//   L3  hood19 → crime17: bairro inseguro da sede facilita crimes contra você (e recrutamento da sua equipe).
//   L4  crime17 → insure19: prisão de pessoa segurada — paga perda de receita, ou anula a apólice se ela é do crime.
//   L5  insure19 → secrets23: o exame médico da seguradora revela doença/dependência escondida (e o prêmio sobe).
//   L6  extras17 → secrets23: reabilitação paga confirma a dependência para você e vira boato na imprensa.
//   L7  kids17 → secrets23/crime: filho(a) rebelde do dono se mete com drogas ou com a organização da praça.
//   L8  zines19 → secrets23: cena de fanzine fuça a vida dos atos da cena; o seu fanzine/revista apura para você.
//   L9  idols18/kpop18 → secrets23: idol não pode namorar (caso/filho pesam mais) e fansites vigiam tudo.
//   L10 secrets23 → naming19: segredo do dono exposto tira a marca do nome da casa/festival (cláusula de conduta).
//   L11 session19 → secrets23: músico de estúdio magoado que tocou para o ato conta da voz-fantasma/ghostwriter.
//   L12 schools19 → scout23: prodígio revelado pela escola entra no funil do olheiro (origem: escola/coro).
//   L13 trends17 → scout23: o olheiro acha mais gente nos gêneros em alta nas paradas.
//   L14 furnish → equipe: sede confortável sobe a lealdade da equipe (people/staff).
//   L15 secrets23 → crimemem23: quem deve a agiota da organização é recrutado para pagar a dívida.

import { Rng, seedState } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { familyOf, l } from '../../data/world';
import { registerSimHook } from '../ext4';
import { onFact } from '../facts17';
import { grantHold } from '../holds17';
import type { Act, GameState } from '../types';
import { addSignal } from '../worldgen';
import { fmtL, notify, post } from '../util';
import { CUL19, avgLoy19, cul19 } from './culture19';
import { ODDS17, a3Of, crime17, orgs17 } from './crime17';
import { RECRUIT23, mem23 } from './crimemem23';
import { furnEffects } from './furnish';
import { hoodStats19 } from './hood19';
import { IDOL_G18 } from './idols18';
import { ins19 } from './insure19';
import { isK18 } from './kpop18';
import { kidOf } from './kids17';
import { pullName19, nm19 } from './naming19';
import { P as people } from './people/state';
import { ownerOf } from './people/owner';
import { FIND23 } from './scout23';
import { ERA23, MEDIA23, PRESS23, addSecret23, mine23, raise23, sec23, secretsOf23, subjAct23 } from './secrets23';
import { ses19 } from './session19';
import { hotList17 } from './trends17';
import { ownOutlet19, zScenesLive19, zinesLive19 } from './zines19';
import { addStaffLoyalty, staffLoyalty } from '../opinion';

// ---------------------------------------------------------------- L1/L3/L15 recrutamento do crime
RECRUIT23.push((s, key) => {
  if (!key.startsWith('s:')) return null;
  const loy = people(s).career[key.slice(2)] ? staffLoyalty(s, key.slice(2)) : undefined;
  const c = cul19(s).c;
  if (loy !== undefined && loy < 30) return { k: 1.6, why: fmtL(l('Insatisfeito(a) com a casa (lealdade {v})', 'Unhappy with the house (loyalty {v})'), { v: Math.round(loy) }) };
  if (c === 'artist' || c === 'prestige') return { k: 0.8, why: fmtL(l('Cultura da casa: {c}', 'House culture: {c}'), { c: CUL19[c].name }) };
  return null;
});
RECRUIT23.push((s, key) => {
  if (!key.startsWith('s:')) return null;
  const h = hoodStats19(s);
  return h.safety < 40 ? { k: 1.3, why: fmtL(l('Bairro da sede barra-pesada (segurança {v})', 'Rough HQ neighbourhood (safety {v})'), { v: h.safety }) } : null;
});
RECRUIT23.push((s, key) => {
  if (!key.startsWith('p:')) return null;
  return secretsOf23(s, key).some((x) => x.kind === 'shark') ? { k: 2.5, why: l('Deve a um agiota da organização', 'Owes a loan shark from the organization') } : null;
});

// ---------------------------------------------------------------- L2/L8/L9/L11 imprensa sobre segredos
PRESS23.push((s, sec) => {
  if (!mine23(s, sec.subject)) return null;
  const loy = avgLoy19(s);
  const c = cul19(s).c;
  if (loy < 40) return { k: 1.5, why: l('Equipe insatisfeita vaza', 'Unhappy staff leaks') };
  if (c === 'chaos') return { k: 1.3, why: l('Caos criativo: ninguém guarda segredo', 'Creative chaos: nobody keeps secrets') };
  return null;
});
PRESS23.push((s, sec) => {
  const a = subjAct23(s, sec.subject);
  if (!a) return null;
  const fam = familyOf(a.genre);
  return zScenesLive19(s).some((z) => z.city === a.city && (z.g === a.genre || familyOf(z.g) === fam)) ? { k: 1.5, why: l('Fanzines da cena fuçam a vida de todo mundo', 'Scene zines dig into everyone\'s life') } : null;
});
const idol = (a?: Act): boolean => !!a && (isK18(a) || IDOL_G18.includes(a.genre));
PRESS23.push((s, sec) => (idol(subjAct23(s, sec.subject)) ? { k: 1.6, why: l('Fansites e "sasaeng" vigiam os idols', 'Fansites and "sasaeng" watch idols') } : null));
ERA23.push((s, sec) => ((sec.kind === 'affair' || sec.kind === 'child') && idol(subjAct23(s, sec.subject)) ? { k: 1.6, why: l('Idol não pode namorar: o contrato e os fãs cobram', 'Idols may not date: contract and fans punish it') } : null));
PRESS23.push((s, sec) => {
  if (sec.kind !== 'lipsync' && sec.kind !== 'ghostwriter') return null;
  const a = subjAct23(s, sec.subject);
  if (!a) return null;
  return ses19(s).aces.some((x) => x.grudge >= 40 && (x.plays.includes(a.id) || x.hire?.act === a.id)) ? { k: 1.5, why: l('Músico de estúdio magoado sabe quem tocou/cantou', 'A bitter session player knows who really played/sang') } : null;
});
MEDIA23.push((s) => { const o = ownOutlet19(s); if (o) return { name: o.name }; const z = zinesLive19(s).find((x) => x.by === 'player'); return z ? { name: z.name } : undefined; });

// ---------------------------------------------------------------- L3 bairro inseguro → crimes contra você
ODDS17.push((s, c, _cid, x) => {
  if (c.actor === 'player') return;
  const home = countryOfCity(s.config.homeCity);
  const tgtMine = c.target === 'player' || s.acts[c.target]?.owner === 'player';
  if (!tgtMine || !home) return;
  const h = hoodStats19(s);
  if (h.safety >= 45) return;
  const d = (45 - h.safety) / 300;
  x.p += d;
  x.why.push(fmtL(l('Bairro da sede inseguro: +{x}%', 'Unsafe HQ neighbourhood: +{x}%'), { x: Math.round(d * 100) }));
});

// ---------------------------------------------------------------- L4 prisão de pessoa segurada
onFact('arrest', (s, f) => {
  if (!f.tags.includes('jail')) return;
  const pid = f.actors[0];
  const st = ins19(s);
  const x = st.pol.find((p) => p.pid === pid);
  if (!x) return;
  const a = s.acts[x.act];
  if (mem23(s)[`p:${pid}`]) {
    st.pol = st.pol.filter((p) => p !== x);
    if (a) notify(s, fmtL(l('Seguradora anula a apólice de {a}: cláusula de atos ilícitos (ligação com o crime).', 'Insurer voids {a}\'s policy: illegal-acts clause (crime ties).'), { a: a.name }), 'bad');
    return;
  }
  if (s.week - x.lastIll < 52) return;
  const v = Math.round(x.cover * 0.2);
  x.lastIll = s.week; x.claims++; x.paid += v;
  post(s, `l23jail:${pid}:${s.week}`, v, 'insurance', 'Seguro de pessoa-chave: prisão (perda de receita)');
  if (a) notify(s, fmtL(l('Seguro de pessoa-chave cobre 20% pela prisão de um integrante de {a}.', 'Key-person cover pays 20% for the jailing of a member of {a}.'), { a: a.name }), 'info');
}, 'links23:insure-jail');

// ---------------------------------------------------------------- L5/L14/L7 mês e ano
function month23(s: GameState): void {
  // L5: exame médico da seguradora
  for (const x of ins19(s).pol) {
    for (const sec of secretsOf23(s, `p:${x.pid}`)) {
      if (sec.kind !== 'illness' && sec.kind !== 'drugs') continue;
      if (raise23(s, sec, 'player', 3, 'investigation', l('exame médico da seguradora', 'insurer\'s medical exam')) === 3 && !(sec23(s).k[sec.id]?.how.some((h) => h.t?.pt === 'prêmio reajustado'))) {
        x.prem = Math.round(x.prem * 1.15);
        sec23(s).k[sec.id]?.how.push({ o: 'insurer', lv: 3, ch: 'investigation', w: s.week, t: l('prêmio reajustado', 'premium raised') });
      }
    }
  }
  // L14: sede confortável → lealdade da equipe
  const fx = furnEffects(s);
  const up = Math.max(0, fx.morale) * 0.4 + Math.max(0, fx.rep) * 0.1;
  if (up > 0) for (const m of s.player.staff) if (people(s).career[m.id] && staffLoyalty(s, m.id) < 70) addStaffLoyalty(s, m.id, up, { max: 70 });
}
registerSimHook('month', 'links23', month23);
function year23(s: GameState): void {
  // L7: filhos rebeldes do dono
  const r = new Rng(seedState(`links23kids|${s.config.seed}|${s.year}`));
  const o = ownerOf(s);
  const a3 = a3Of(s, s.config.homeCity);
  const st = sec23(s);
  for (const k of o.kids) {
    const age = s.year - k.born;
    if (age < 15 || age > 30) continue;
    const x = kidOf(s, k);
    const has = (kind: string) => st.own.some((y) => y.subject === 'player' && y.kind === kind && y.data?.kid === k.name && !y.end);
    if (x.reb >= 70 && !has('drugs') && r.chance(0.2)) addSecret23(s, { kind: 'drugs', subject: 'player', sev: 35, ev: 30, data: { kid: k.name, v: k.name } });
    const org = orgs17(s).find((y) => y.a3 === a3 && (crime17(s).down[y.id] ?? 0) < s.week);
    if (x.reb >= 85 && org && !has('crime') && r.chance(0.12)) {
      addSecret23(s, { kind: 'crime', subject: 'player', sev: 45, ev: 30, data: { kid: k.name, v: k.name, o: org.id } });
      grantHold(s, { holder: org.key, target: 'player', kind: 'secret', strength: 40, months: 60, src: 'links23', text: fmtL(l('{k} anda com a organização', '{k} runs with the organization'), { k: k.name }), quiet: true });
    }
  }
}
registerSimHook('year', 'links23', year23);

// ---------------------------------------------------------------- L10 segredo do dono exposto → naming rights
onFact('secret_exposed', (s, f) => {
  if (!f.actors.includes('player') || f.severity < 40) return;
  for (const x of nm19(s).d.filter((y) => !y.pulled && y.until > s.week)) pullName19(s, x, l('segredo do dono exposto', 'owner\'s secret exposed'), f);
}, 'links23:naming');

// ---------------------------------------------------------------- L12/L13 olheiros
onFact('prodigy_found', (s, f) => {
  const a = s.acts[f.actors.find((x) => !!s.acts[x]) ?? ''];
  if (!a || s.knowledge[a.id] || a.owner) return;
  if (countryOfCity(a.city) !== countryOfCity(s.config.homeCity)) return;
  addSignal(s, new Rng(seedState(`links23sch|${a.id}|${s.week}`)), a.id, 'school', { at: l('relatório da escola/coro', 'school/choir report'), city: a.city });
}, 'links23:school');
FIND23.push((s, a) => (hotList17(s, 5).some((x) => x.g === a.genre) ? 1.5 : 1));

export const _links23 = { month23, year23 };
