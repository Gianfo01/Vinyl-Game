// R29 (contratos+): empresariamento, produção e joint venture jogáveis — oferta, aceite, um ano rodando com o dinheiro
// andando do jeito certo (comissão / entrega de masters / divisão do lucro da JV), saídas, telas e determinismo; e os
// papéis/carreiras sem "fase 4/5" em lugar nenhum.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { CONTRACT_MODELS, ROLES, roleOfCareers29 } from '../src/data/rules';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer, evaluateOffer, makeOffer, offerEligible29 } from '../src/sim/contracts';
import { composeSongs, recordSongs } from '../src/sim/production';
import { defaultRights, rightsOf } from '../src/sim/rights';
import { advanceMonth } from '../src/sim/tick';
import type { Act, Contract, GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { active29, applyModel29, termTxt29 } from '../src/sim/terms29';
import {
  buyoutJV29, deliverMasters29, deliveryLabels29, dissolveJV29, jvSub29, quitManagement29, releaseProduction29, specialDeals29, splitJV29,
} from '../src/sim/sys/contracts29';
import { ventures } from '../src/sim/sys/ventures9';
import { careers } from '../src/sim/sys/careers12';
import { ownerOf } from '../src/sim/sys/people/owner';
import { activeAct } from '../src/sim/sys/ventures12';
import { scoutEligible20 } from '../src/sim/scout20';
import { actContracts } from '../src/sim/sys/dossier13';
import { insp29 } from '../src/ui/ps/insp29model';
import { packageFromOffer, scorePackage } from '../src/sim/sys/offers12';
import { negoGate27, propose27, startNego27 } from '../src/sim/sys/nego27';

const game = (seed: string) => createGame(defaultConfig(seed, { startYear: 1975, realNames: true }));
const freeAct = (s: GameState, i = 0): Act => Object.values(s.acts).filter((a) => !a.owner && activeAct(a) && scoutEligible20(s, a).ok && a.fame >= 3 && a.status === 'active').sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1))[i];
const npcAct = (s: GameState): Act => Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && s.labels[a.owner] && activeAct(a) && a.fame >= 5 && a.fame <= 40).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1))[0];
const newest = (s: GameState, actId: string, model: string): Contract => Object.values(s.contracts).filter((c) => c.actId === actId && c.model === model && c.party === 'player').sort((a, b) => b.startWeek - a.startWeek)[0];

function sign(s: GameState, a: Act, model: 'management' | 'production' | 'jv', tweak: (o: ReturnType<typeof defaultOffer>) => void = () => {}): Contract {
  const o = defaultOffer(s, a);
  applyModel29(o, model);
  o.rights = defaultRights(o.model, o.publishing);
  tweak(o);
  s.player.cash = Math.max(s.player.cash, o.advance + 5_000_000);
  const offer = makeOffer(s, o);
  expect(offer, `makeOffer ${model}`).toBeTruthy();
  expect(acceptOffer(s, a, offer!)).toBe(true);
  return newest(s, a.id, model);
}

function record(s: GameState, a: Act, n = 3): void {
  const r = Rng.fromSeed(`${s.config.seed}|test29|${a.id}`);
  const songs = composeSongs(s, r, a, n);
  recordSongs(s, r, a, songs.map((x) => x.id), 2, 'balanced', 'act');
}

describe('R29 contratos+ — papéis e carreiras sem "fase 4/5"', () => {
  it('ROLES e CONTRACT_MODELS são todos jogáveis, sem nota de fase', () => {
    expect(ROLES.every((r) => r.available)).toBe(true);
    expect(CONTRACT_MODELS.every((m) => m.available)).toBe(true);
    for (const x of [...ROLES, ...CONTRACT_MODELS]) for (const txt of [x.name.pt, x.name.en, x.desc.pt, x.desc.en]) expect(txt).not.toMatch(/fase [45]|phase [45]/i);
    expect(roleOfCareers29(['manager'])).toBe('manager');
    expect(roleOfCareers29(['studio', 'label'])).toBe('studio');
    expect(roleOfCareers29(['publisher'])).toBe('publisher');
    expect(roleOfCareers29(['label', 'musician'])).toBe('hybrid');
    expect(roleOfCareers29(['musician'])).toBe('artist');
    expect(roleOfCareers29(undefined)).toBe('label');
  });
  it('nenhum texto de interface ou i18n fala em fase 4/5 ou "fase posterior"', () => {
    for (const f of ['src/data/rules.ts', 'src/i18n/strings.ts', 'src/ui/newgame.ts', 'src/ui/ficha.ts', 'src/ui/ps/home27model.ts', 'src/ui/sys/careers12.ts', 'src/ui/act27/negotiate27.ts']) {
      const txt = readFileSync(f, 'utf8');
      expect(txt, f).not.toMatch(/fase [45]\b|phase [45]\b|phaseLater|fase posterior|later phase/i);
    }
  });
});

describe('R29 contratos+ — empresariamento', () => {
  it('oferta a ato de selo rival: o ato fica no selo, você vira empresário e a comissão entra por um ano', () => {
    const s = game('c29-mgmt');
    const a = npcAct(s);
    const lb = a.owner;
    expect(offerEligible29(s, a, 'classic').ok).toBe(false);
    expect(offerEligible29(s, a, 'management').ok).toBe(true);
    expect(negoGate27(s, a.id, 'management')).toBeNull();
    expect(negoGate27(s, a.id, 'classic')).not.toBeNull();
    const w0 = ownerOf(s).wealth;
    const c = sign(s, a, 'management', (o) => { o.advance = 0; o.x29 = { commission: 0.2 }; });
    expect(c.model).toBe('management');
    expect(a.owner).toBe(lb); // continua no selo dele
    expect(a.contractId).not.toBe(c.id);
    expect(careers(s).active).toContain('manager'); // a carreira começa com o primeiro cliente
    const cl = ventures(s).mg.clients.find((x) => x.actId === a.id)!;
    expect(cl.rate).toBe(0.2);
    expect(rightsOf(c).master).toBe('artist');
    expect(active29(s, c)).toBe(true);
    for (let m = 0; m < 12; m++) { const k = ventures(s).mg.clients.find((x) => x.actId === a.id); if (k) k.sat = 90; advanceMonth(s); }
    expect(c.x29?.ended).toBeUndefined();
    expect(c.x29!.paid!).toBeGreaterThan(0);
    expect(c.x29!.paid).toBe(ventures(s).mg.clients.find((x) => x.actId === a.id)!.earned);
    expect(ownerOf(s).wealth).toBeGreaterThan(w0); // a comissão cai no patrimônio do dono (mg.owner = pessoal, como a carreira de sempre)
  });

  it('saídas: deixar a gestão, prazo e demissão', () => {
    const s = game('c29-mgmt-exit');
    const a = npcAct(s);
    const c = sign(s, a, 'management', (o) => { o.advance = 0; });
    const t0 = a.trust;
    expect(quitManagement29(s, c.id)).toBeNull();
    expect(c.x29!.ended).toBe('quit');
    expect(a.trust).toBeLessThan(t0);
    expect(ventures(s).mg.clients.some((x) => x.actId === a.id)).toBe(false);
    expect(active29(s, c)).toBe(false);
    // prazo
    const b = Object.values(s.acts).filter((x) => x.owner && x.owner !== 'player' && x.id !== a.id && activeAct(x) && x.fame >= 3).sort((p, q) => (p.id < q.id ? -1 : 1))[0];
    const c2 = sign(s, b, 'management', (o) => { o.advance = 0; });
    c2.endWeek = s.week;
    advanceMonth(s);
    expect(c2.x29!.ended).toBe('expired');
    expect(ventures(s).mg.clients.some((x) => x.actId === b.id)).toBe(false);
    // demissão: a satisfação desaba e o artista demite você (máquina de sempre, ventures9) → o contrato encerra como "fired"
    const e = Object.values(s.acts).filter((x) => x.owner && x.owner !== 'player' && x.id !== a.id && x.id !== b.id && activeAct(x) && x.fame >= 3).sort((p, q) => (p.id < q.id ? -1 : 1))[0];
    const c3 = sign(s, e, 'management', (o) => { o.advance = 0; });
    for (let m = 0; m < 48 && !c3.x29?.ended; m++) { const k = ventures(s).mg.clients.find((x) => x.actId === e.id); if (k) k.sat = 0; advanceMonth(s); }
    expect(c3.x29!.ended).toBe('fired');
  });

  it('a avaliação reage: carreiristas gostam de empresário, comissão alta pesa contra', () => {
    const s = game('c29-mgmt-eval');
    const a = npcAct(s);
    const o = defaultOffer(s, a); applyModel29(o, 'management'); o.rights = defaultRights('management');
    const cl = { ...defaultOffer(s, a), rights: defaultRights('classic') };
    // a vantagem do empresariamento sobre o contrato de selo (mesmo ato) é maior para quem quer fama do que para quem quer segurança
    const edge = () => evaluateOffer(s, a, o).score - evaluateOffer(s, a, cl).score;
    for (const id of a.members) s.persons[id].ambition = 'fame';
    const fame = edge();
    for (const id of a.members) s.persons[id].ambition = 'security';
    const sec = edge();
    expect(fame).toBeGreaterThan(sec);
    const hi = evaluateOffer(s, a, { ...o, x29: { commission: 0.25 } }).score;
    const lo = evaluateOffer(s, a, { ...o, x29: { commission: 0.1 } }).score;
    expect(lo).toBeGreaterThan(hi);
    expect(Number.isFinite(lo) && Number.isFinite(hi)).toBe(true);
  });
});

describe('R29 contratos+ — produção', () => {
  it('a produtora assina, grava e entrega masters a um selo rival: adiantamento, parte do artista e pontos', () => {
    const s = game('c29-prod');
    const a = freeAct(s);
    const c = sign(s, a, 'production', (o) => { o.advance = 50_000; o.royalty = 0.4; });
    expect(a.owner).toBe('player');
    expect(a.contractId).toBe(c.id);
    expect(careers(s).active).toContain('studio');
    expect(rightsOf(c).master).toBe('label'); // a produtora é dona do master
    record(s, a, 3);
    const lbs = deliveryLabels29(s, c.id);
    expect(lbs.length).toBeGreaterThan(0);
    const lb = s.labels[lbs[0].id];
    const cash0 = s.player.cash, lbCash0 = lb.cash, actCash0 = a.cash, rec0 = c.recoupBalance;
    expect(deliverMasters29(s, c.id, lb.id, 'license')).toBeNull();
    const d = c.x29!.deliveries![0];
    expect(d.adv).toBe(lbs[0].adv);
    expect(lb.cash).toBe(lbCash0 - d.adv);
    const rel = s.releases[d.relId];
    expect(rel.owner).toBe(lb.id); // o selo lança
    const part = Math.round(d.adv * 0.4);
    const rec = Math.min(rec0, part);
    expect(c.recoupBalance).toBe(rec0 - rec); // a parte do artista abate o adiantamento dele primeiro
    expect(a.cash - actCash0).toBe(part - rec);
    expect(s.player.cash - cash0).toBe(d.adv - (part - rec));
    for (let m = 0; m < 12; m++) advanceMonth(s);
    expect(d.earned).toBeGreaterThan(0); // pontos acumulam sobre a receita do selo
    expect(d.paid).toBe(Math.max(0, d.earned - d.adv)); // e só pagam depois de recuperar o adiantamento do selo
    expect(s.ledger.some((x) => x.key.endsWith(`sales:${rel.id}`))).toBe(false); // a venda é do selo, não do seu caixa
    expect(rel.revenue).toBeGreaterThan(0);
  });

  it('venda dos masters e liberar o artista (as entregas seguem valendo)', () => {
    const s = game('c29-prod-exit');
    const a = freeAct(s);
    const c = sign(s, a, 'production', (o) => { o.advance = 0; });
    record(s, a, 2);
    const lb = deliveryLabels29(s, c.id)[0];
    expect(deliverMasters29(s, c.id, lb.id, 'sale')).toBeNull();
    expect(c.x29!.deliveries![0].kind).toBe('sale');
    expect(c.x29!.deliveries![0].pts).toBe(0);
    expect(deliverMasters29(s, c.id, lb.id, 'license')).not.toBeNull(); // nada mais gravado esperando
    expect(releaseProduction29(s, c.id)).toBeNull();
    expect(a.owner).toBeNull();
    expect(c.x29!.ended).toBe('released');
    expect(c.x29!.deliveries!.length).toBe(1);
  });

  it('a avaliação reage: gente de estúdio gosta de produção', () => {
    const s = game('c29-prod-eval');
    const a = freeAct(s);
    const o = defaultOffer(s, a); applyModel29(o, 'production'); o.rights = defaultRights('production');
    const base = evaluateOffer(s, a, o).score;
    s.persons[a.members[0]].traits.push('perfectionist');
    expect(evaluateOffer(s, a, o).score).toBeGreaterThan(base);
  });
});

describe('R29 contratos+ — joint venture', () => {
  it('cria o subselo co-propriedade, capital = adiantamento, e divide o lucro pela participação', () => {
    const s = game('c29-jv');
    const a = freeAct(s);
    const actCash0 = a.cash;
    const cash0 = s.player.cash + 5_000_000; // sign() completa o caixa
    const c = sign(s, a, 'jv', (o) => { o.advance = 2_000_000; o.x29 = { artistShare: 0.4, target: 2 }; });
    const sl = jvSub29(s, c)!;
    expect(sl).toBeTruthy();
    expect(sl.founderShare).toBe(0.6);
    expect(sl.board.find((b) => b.name === a.name)?.share).toBe(0.4);
    expect(sl.roster).toContain(a.id);
    expect(sl.cash).toBe(2_000_000);
    expect(a.cash).toBe(actCash0); // o adiantamento não vai para o bolso do artista
    expect(c.recoupBalance).toBe(0);
    expect(s.player.cash).toBeLessThanOrEqual(cash0);
    expect(rightsOf(c).master).toBe('shared');
    // lucro do ano: 60% para você (dividendos), 40% para o artista
    sl.retained = 1_000_000;
    sl.cash += 1_000_000;
    const p0 = s.player.cash, a0 = a.cash;
    expect(splitJV29(s, c)).toBe(1_000_000);
    expect(s.player.cash - p0).toBe(600_000);
    expect(a.cash - a0).toBe(400_000);
    // um ano rodando pela máquina de sempre do subselo
    for (let m = 0; m < 12; m++) advanceMonth(s);
    expect(['active', 'distress']).toContain(jvSub29(s, c)!.status);
    expect(c.x29!.ended).toBeUndefined();
  });

  it('saídas: comprar a parte, dissolver (multa sem meta), o artista sai quando a confiança desaba', () => {
    const s = game('c29-jv-exit');
    const [a, b, d] = [freeAct(s, 0), freeAct(s, 1), freeAct(s, 2)];
    const c1 = sign(s, a, 'jv', (o) => { o.advance = 500_000; o.x29 = { artistShare: 0.3, target: 1 }; });
    const ac0 = a.cash;
    expect(buyoutJV29(s, c1.id)).toBeNull();
    expect(jvSub29(s, c1)!.founderShare).toBe(1);
    expect(a.cash).toBeGreaterThan(ac0);
    expect(a.owner).toBe('player'); // o contrato segue
    const c2 = sign(s, b, 'jv', (o) => { o.advance = 500_000; o.x29 = { artistShare: 0.4, target: 5 }; });
    const bc0 = b.cash;
    expect(dissolveJV29(s, c2.id)).toBeNull();
    expect(jvSub29(s, c2)!.status).toBe('closed');
    expect(b.owner).toBeNull(); // o ato deixa o selo
    expect(c2.x29!.ended).toBe('dissolved');
    expect(b.cash).toBeGreaterThan(bc0); // parte do caixa + multa (meta não cumprida)
    expect(s.ledger.some((x) => x.key.endsWith(`jv29pen:${c2.id}`))).toBe(true);
    const c3 = sign(s, d, 'jv', (o) => { o.advance = 500_000; });
    d.trust = 5;
    advanceMonth(s);
    expect(c3.x29!.ended).toBe('partner_exit');
    expect(jvSub29(s, c3)!.status).toBe('closed');
  });

  it('a avaliação reage: independentes gostam de JV', () => {
    const s = game('c29-jv-eval');
    const a = freeAct(s);
    const o = defaultOffer(s, a); applyModel29(o, 'jv'); o.rights = defaultRights('jv');
    const cl = { ...defaultOffer(s, a), rights: defaultRights('classic') };
    const edge = () => evaluateOffer(s, a, o).score - evaluateOffer(s, a, cl).score;
    for (const id of a.members) s.persons[id].ambition = 'freedom';
    const free = edge();
    for (const id of a.members) s.persons[id].ambition = 'security';
    expect(free).toBeGreaterThan(edge());
  });
});

describe('R29 contratos+ — telas, mesa r27 e promessas', () => {
  it('Contratos (S07), inspetor, dossiê, ficha de direitos e o "por quê" das ofertas mostram os três', () => {
    const s = game('c29-views');
    const m = sign(s, npcAct(s), 'management', (o) => { o.advance = 0; o.promises = ['tour']; });
    const p = sign(s, freeAct(s, 0), 'production', (o) => { o.advance = 0; });
    const j = sign(s, freeAct(s, 1), 'jv', (o) => { o.advance = 300_000; });
    const rows = specialDeals29(s);
    expect(rows.map((r) => r.c.model).sort()).toEqual(['jv', 'management', 'production']);
    for (const r of rows) { expect(r.active).toBe(true); expect(r.terms.pt.length).toBeGreaterThan(5); expect(r.flows.pt).toMatch(/\$/); }
    // inspetor do ato (R29 REORG)
    expect(insp29(s, m.actId)!.tabs.contracts.some((x) => (x.title as { pt: string }).pt === 'Você é o empresário')).toBe(true);
    expect(insp29(s, p.actId)!.tabs.contracts.some((x) => (x.title as { pt: string }).pt === 'Contrato de produção')).toBe(true);
    expect(insp29(s, j.actId)!.tabs.contracts.some((x) => (x.title as { pt: string }).pt === 'Joint venture')).toBe(true);
    // dossiê (dossier13): o contrato aparece e conta como vigente
    expect(actContracts(s, s.acts[m.actId]).some((c) => c.id === m.id && active29(s, c))).toBe(true);
    expect(termTxt29(m).pt).toMatch(/comissão/);
    // promessa r28 com verba no empresariamento
    expect(m.promises[0].kind).toBe('tour');
    expect(m.promises[0].budget).toBeGreaterThan(0);
    // offers12 (explicação): o pacote enxerga a comissão / participação
    const a = freeAct(s, 2);
    for (const model of ['management', 'production', 'jv'] as const) {
      const o = defaultOffer(s, a); applyModel29(o, model); o.rights = defaultRights(model);
      const sc = scorePackage(s, a, packageFromOffer(s, o));
      expect(Number.isFinite(sc.total)).toBe(true);
    }
  });

  it('a mesa r27 negocia os modelos novos e fecha pelo caminho normal', () => {
    const s = game('c29-nego');
    const a = npcAct(s);
    const d = defaultOffer(s, a); applyModel29(d, 'management'); d.rights = defaultRights('management'); d.advance = 0;
    const n = startNego27(s, a.id, d);
    expect('actId' in n).toBe(true);
    if (!('actId' in n)) return;
    const o = { ...d, x29: { commission: 0.1 }, advance: 2_000_000 };
    propose27(s, n, o);
    expect(n.log.some((x) => /comissão/.test(x.t.pt))).toBe(true);
    if (n.status === 'deal') {
      expect(s.contracts[n.contractId!].model).toBe('management');
      expect(a.owner).not.toBe('player');
    }
    expect(n.rival).toBeNull(); // empresariamento não tem leilão de selos
  });
});

describe('R29 contratos+ — determinismo', () => {
  const run = () => {
    const s = game('c29-det');
    const m = sign(s, npcAct(s), 'management', (o) => { o.advance = 0; });
    const a = freeAct(s, 0);
    const p = sign(s, a, 'production', (o) => { o.advance = 0; });
    record(s, a, 3);
    deliverMasters29(s, p.id, deliveryLabels29(s, p.id)[0].id, 'license');
    const j = sign(s, freeAct(s, 1), 'jv', (o) => { o.advance = 400_000; });
    for (let k = 0; k < 6; k++) advanceMonth(s);
    return JSON.stringify({ cash: s.player.cash, m: m.x29, p: p.x29, j: j.x29, sub: jvSub29(s, j)?.cash, w: ownerOf(s).wealth });
  };
  it('mesma semente, mesmas escolhas → mesmo resultado', () => {
    expect(run()).toBe(run());
  });
});

// ================================================================ R29 contratos+ (NPC): empresários, produtoras e selos
import { playMonth } from '../src/sim/playbot16';
import { resolveDecision } from '../src/sim/events';
import { npcProdOf29, offerMasters29, proposeJV29, prodCos29, signNpcProd29 } from '../src/sim/sys/npc29';
import { m14 } from '../src/sim/sys/managers14';
import { ctxMenu27 } from '../src/ui/ps/ctx27model';
import { c29Open, runC29 } from '../src/ui/ps/ctx29c';
import { mgrEra29, prodEra29, jvEra29 } from '../src/sim/terms29';

/** 10 anos de bot: quantos contratos NPC de cada modelo nasceram (e em que ano). */
function npcCensus(seed: string, startYear: number, years = 10) {
  const s = createGame(defaultConfig(seed, { startYear, realNames: true }));
  const seen = new Map<string, { model: string; y: number; party: string }>();
  for (let m = 0; m < years * 12 && !s.ended; m++) {
    playMonth(s, 'balanced');
    advanceMonth(s);
    for (const c of Object.values(s.contracts)) if ((c.party.includes(':') || (c.model === 'jv' && c.party !== 'player')) && !seen.has(c.id)) seen.set(c.id, { model: c.model, y: s.config.startYear + Math.floor(c.startWeek / 52), party: c.party });
  }
  const by = (model: string) => [...seen.values()].filter((x) => x.model === model);
  return { s, seen, mgmt: by('management'), prod: by('production'), jv: by('jv') };
}

describe('R29 contratos+ — NPC usam os três modelos (10 anos de bot)', () => {
  it('era do rock (1962–72): empresários NPC com contrato e comissão; produtoras NPC assinam e entregam', () => {
    const { s, mgmt, prod, jv } = npcCensus('c29-npc-62', 1962);
    console.log('NPC 1962–72', { management: mgmt.length, production: prod.length, jv: jv.length });
    expect(mgmt.length).toBeGreaterThan(5);
    expect(mgmt.every((x) => x.party.startsWith('e:'))).toBe(true);
    expect(prod.length).toBeGreaterThan(3);
    expect(prod.every((x) => x.party.startsWith('pd:') || x.party.startsWith('vs:'))).toBe(true);
    expect(jv.every((x) => x.y >= 1970)).toBe(true); // JV NPC só a partir dos anos 1970
    // quem empresaria quem = contrato vigente (m14.rep ↔ s.contracts)
    for (const [aid, rp] of Object.entries(m14(s).rep)) expect(Object.values(s.contracts).some((c) => c.actId === aid && c.party === `e:${rp.m}` && c.model === 'management' && !c.x29?.ended)).toBe(true);
    const paid = Object.values(s.contracts).filter((c) => c.model === 'management' && c.party.startsWith('e:')).reduce((t, c) => t + (c.x29?.paid ?? 0), 0);
    expect(paid).toBeGreaterThan(0); // a comissão saiu do caixa dos atos
    const delivered = Object.values(s.contracts).filter((c) => c.model === 'production' && c.party.includes(':')).flatMap((c) => c.x29?.deliveries ?? []);
    expect(delivered.length).toBeGreaterThan(0); // masters entregues a selos
  }, 600_000);

  it('anos 1975–85: JV/selo-vaidade NPC com estrelas aparece; produção ainda forte', () => {
    const { prod, jv } = npcCensus('c29-npc-75', 1975);
    console.log('NPC 1975–85', { production: prod.length, jv: jv.length });
    expect(jv.length).toBeGreaterThan(0);
    expect(prod.length).toBeGreaterThan(3);
  }, 600_000);

  it('curvas de época: empresário desde os 1950 (pico no rock), produção 1960–80, JV a partir de 1970', () => {
    expect(mgrEra29(1965)).toBeGreaterThan(mgrEra29(1955));
    expect(mgrEra29(1955)).toBeGreaterThan(mgrEra29(1940));
    expect(prodEra29(1970)).toBeGreaterThan(prodEra29(1995));
    expect(prodEra29(1945)).toBe(0);
    expect(jvEra29(1969)).toBe(0);
    expect(jvEra29(1975)).toBeGreaterThan(0);
  });
});

describe('R29 contratos+ — Caixa de entrada: masters de produtora NPC e JV proposta por estrela', () => {
  it('"{produtora} oferece as masters de {ato}" → licenciar: o disco sai pelo seu selo, a produtora ganha pontos', () => {
    const s = game('c29-inbox-m');
    s.player.cash += 5_000_000;
    const a = freeAct(s, 0);
    const co = prodCos29(s)[0] ?? { key: 'pd:test', name: 'Produtora Teste' };
    const c = signNpcProd29(s, a, co);
    expect(npcProdOf29(s, a.id)?.id).toBe(c.id);
    expect(scoutEligible20(s, a).ok).toBe(false); // quem quer o ato negocia as masters com a produtora
    record(s, a, 3);
    expect(offerMasters29(s, c.id)).toBe(true);
    const d = s.decisions.find((x) => x.eventId === 'c29_masters')!;
    expect(d).toBeTruthy();
    expect(d.title.pt).toContain(`oferece as masters de ${a.name}`);
    expect(d.options.map((o) => o.id)).toEqual(['license', 'buy', 'decline']);
    const cash0 = s.player.cash;
    expect(resolveDecision(s, d.id, 'license')).toBe(true);
    const del = c.x29!.deliveries![0];
    expect(del.lb).toBe('player');
    expect(s.releases[del.relId].owner).toBe('player');
    expect(s.player.cash).toBe(cash0 - del.adv);
    for (let m = 0; m < 6; m++) advanceMonth(s);
    expect(del.earned).toBeGreaterThan(0);
    expect(s.ledger.some((x) => x.key.endsWith(`sales:${del.relId}`))).toBe(true); // a venda é sua
  });

  it('comprar as masters: sem pontos; recusar: vai para um selo rival', () => {
    const s = game('c29-inbox-b');
    s.player.cash += 5_000_000;
    const [a, b] = [freeAct(s, 0), freeAct(s, 1)];
    const co = prodCos29(s)[0] ?? { key: 'pd:test', name: 'Produtora Teste' };
    const c1 = signNpcProd29(s, a, co);
    record(s, a, 2);
    offerMasters29(s, c1.id);
    resolveDecision(s, s.decisions.find((x) => x.eventId === 'c29_masters')!.id, 'buy');
    expect(c1.x29!.deliveries![0].kind).toBe('sale');
    expect(c1.x29!.deliveries![0].pts).toBe(0);
    const c2 = signNpcProd29(s, b, co);
    record(s, b, 2);
    offerMasters29(s, c2.id);
    resolveDecision(s, s.decisions.find((x) => x.eventId === 'c29_masters')!.id, 'decline');
    const d2 = c2.x29!.deliveries![0];
    expect(d2 && d2.lb !== 'player' && !!s.labels[d2.lb]).toBe(true);
  });

  it('a estrela propõe uma JV: aceitar assina o contrato normal e cria o subselo', () => {
    const s = createGame(defaultConfig('c29-inbox-jv', { startYear: 1978, realNames: true }));
    s.player.cash += 50_000_000;
    const star = Object.values(s.acts).filter((x) => !x.owner && activeAct(x) && offerEligible29(s, x, 'jv').ok).sort((p, q) => q.fame - p.fame)[0];
    proposeJV29(s, star);
    const d = s.decisions.find((x) => x.eventId === 'c29_jv')!;
    expect(d.title.pt).toContain('propõe uma joint venture');
    expect(resolveDecision(s, d.id, 'accept')).toBe(true);
    const c = newest(s, star.id, 'jv');
    expect(c).toBeTruthy();
    expect(star.owner).toBe('player');
    expect(jvSub29(s, c)?.status).toBe('active');
  });
});

describe('R29 contratos+ — clique direito (ctx27)', () => {
  it('ato de selo rival: "Propor empresariamento" ativo, produção/JV desativados com motivo; mesmo handler', () => {
    const s = game('c29-ctx');
    const a = npcAct(s);
    const m = ctxMenu27(s, 'act', a.id)!;
    const items = m.items.filter((x) => x.id.startsWith('act.c29:'));
    expect(items.map((x) => x.id)).toEqual(['act.c29:management', 'act.c29:production', 'act.c29:jv']);
    expect(items.every((x) => x.sec === 'career')).toBe(true);
    expect(items[0].block).toBeNull();
    expect(items[1].block?.pt).toMatch(/contrato/i);
    expect(items[2].block?.pt).toMatch(/contrato/i);
    const calls: [string, string][] = [];
    c29Open().f = (id, model) => { calls.push([id, model]); };
    expect(runC29(s, m, items[0])).toBe(true);
    expect(runC29(s, m, items[1])).toBe(true); // bloqueado: não chama
    expect(calls).toEqual([[a.id, 'management']]);
    // o botão da ficha usa o mesmo handler
    expect(readFileSync('src/ui/sys/contracts29reg.ts', 'utf8')).toMatch(/c29Open\(\)\.f\?\.\(a\.id, 'management'\)/);
    // pessoa: pelo ato dela
    const pid = a.members.find((x) => s.persons[x]?.alive)!;
    const pm = ctxMenu27(s, 'person', `p:${pid}`)!;
    const pi = pm.items.find((x) => x.id === 'person.c29:management')!;
    expect(pi?.block).toBeNull();
    runC29(s, pm, pi);
    expect(calls[1]).toEqual([a.id, 'management']);
    // ato sem selo: os três valem
    const f = freeAct(s, 0);
    const fm = ctxMenu27(s, 'act', f.id)!;
    expect(fm.items.filter((x) => x.id.startsWith('act.c29:') && !x.block).length).toBe(3);
  });
});

describe('R29 contratos+ — determinismo do lado NPC', () => {
  const run = () => {
    const s = createGame(defaultConfig('c29-npc-det', { startYear: 1966, realNames: true }));
    for (let m = 0; m < 24; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
    return JSON.stringify(Object.values(s.contracts).filter((c) => c.party.includes(':') || c.model === 'jv').map((c) => [c.id, c.model, c.party, c.x29?.paid ?? 0, c.x29?.deliveries?.length ?? 0, c.x29?.ended ?? '']));
  };
  it('mesma semente → mesmos contratos NPC', () => { expect(run()).toBe(run()); }, 300_000);
});
