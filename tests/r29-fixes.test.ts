// Rodada 29 — três correções pedidas pelo autor:
// (1) sem selos "real"/"fictícia" na tela (Submundo, críticos, líderes, laços, coletivos, relíquias, alvos do crime);
// (2) menu de ações (clique direito) com TODAS as ações da entidade, divididas em seções — inclusive o Submundo — e cada
//     item ligado a um handler que já existe (a ficha da pessoa usa a mesma fonte);
// (3) Nova run: situação inicial em escada (zero → líder do mercado, hipster, em crise) para as 12 carreiras, com o
//     status seguindo carreira × situação e configs válidas (rápida = completa).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { personActionDefs18, personActions18 } from '../src/sim/personact18';
import { newRunConfig20 } from '../src/sim/start17';
import { CAREERS29, SITS29, careerOf29, setStart29, sit29ById, sitOf29, start28Fits29, statusLabel29, statusOf29, syncStart29, type Sit29 } from '../src/sim/start29data';
import { roleFromMain } from '../src/sim/sys/careers12';
import { CRIMES17, orgs17, targetsFor } from '../src/sim/sys/crime17';
import { careerDefs } from '../src/sim/sys/careers12';
import type { GameState, RunConfig } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { actions20 } from '../src/ui/actions20';
import { SEC29, ctxMenu27, menuSections27, secOf27, type CtxEnv27, type CtxMenu27 } from '../src/ui/ps/ctx27model';
import { buildRun27, draftDefaults27, quickDefaults27, quickRunConfig27 } from '../src/ui/ps/home27model';

const ENV: CtxEnv27 = { has: (f) => f !== 'songmarket' };
const pt = (x: { pt: string } | string | null | undefined) => (typeof x === 'string' ? x : x?.pt ?? '');
const ids = (m: CtxMenu27 | null) => (m ? m.items.map((x) => x.id) : []);
const secs = (m: CtxMenu27 | null) => (m ? menuSections27(m).map((x) => x.sec) : []);

// ================================================================ (1) selos real/fictícia

const BADGE = /fict[íi]ci[ao]|fictional|pessoa real|real person|\(real\)|★/i;
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []; });
}

describe('r29 (1) — sem selos de "real" / "fictícia"', () => {
  it('nenhum pill/selo de real × fictícia no código da interface', () => {
    const bad: string[] = [];
    for (const f of walk(join(__dirname, '../src/ui'))) {
      const src = readFileSync(f, 'utf8');
      // padrões dos selos removidos: pill('real'…), pill(…'fictícia'…), 'pessoa real' em pill, ✦ de coletivo fictício
      for (const re of [/pill\(\s*T?\(?\s*l\('real', 'real'\)/, /pill\([^)]*fict[íi]cia/, /pill\('real'/, /pill\(t\(l\('pessoa real'/, /coletivo fictício/, /catalogNo \? pill\('★'/, /b\.real \? h\('small'/])
        if (re.test(src)) bad.push(`${f.split('/src/')[1]}: ${re}`);
    }
    expect(bad).toEqual([]);
  });

  it('o modelo do menu e os alvos do Submundo não rotulam ninguém como real/fictício', () => {
    const s = createGame(defaultConfig('r29-b1', { startYear: 1965, scenario: 'established', realNames: true }));
    const menus: CtxMenu27[] = [];
    const acts = Object.values(s.acts).slice(0, 25);
    for (const a of acts) { const m = ctxMenu27(s, 'act', a.id, ENV); if (m) menus.push(m); for (const p of a.members.slice(0, 2)) { const q = ctxMenu27(s, 'person', p, ENV); if (q) menus.push(q); } }
    for (const lb of Object.keys(s.labels).slice(0, 8)) { const m = ctxMenu27(s, 'label', lb, ENV); if (m) menus.push(m); }
    for (const o of orgs17(s).slice(0, 6)) { const m = ctxMenu27(s, 'org', o.id, ENV); if (m) menus.push(m); }
    expect(menus.length).toBeGreaterThan(20);
    for (const m of menus) {
      expect(pt(m.name)).not.toMatch(BADGE);
      expect(pt(m.kind)).not.toMatch(BADGE);
      for (const x of m.items) expect(`${pt(x.label)}`).not.toMatch(BADGE);
    }
    for (const c of CRIMES17) for (const x of targetsFor(s, c)) expect(pt(x.name)).not.toMatch(/★/);
    for (const c of CAREERS29) for (const d of SITS29) expect(pt(statusLabel29(c, d.id))).not.toMatch(BADGE);
  });
});

// ================================================================ (2) menu de ações completo e dividido

/** Ids que o run() de ps/ctx27.ts trata (case '…'), mais os prefixos ligados aos registros de sempre. */
const CTX_SRC = readFileSync(join(__dirname, '../src/ui/ps/ctx27.ts'), 'utf8');
const CASES = new Set([...CTX_SRC.matchAll(/case '([^']+)'/g)].map((m) => m[1]));
function handled(id: string): boolean {
  if (CASES.has(id)) return true;
  if (id.startsWith('pa:')) return personActionDefs18().some((d) => d.id === id.slice(3)) && CTX_SRC.includes("startsWith('pa:')");
  if (id.startsWith('a20:')) return actions20().some((d) => d.id === id.slice(4)) && CTX_SRC.includes("startsWith('a20:')");
  if (id.startsWith('crime.plan:')) return CRIMES17.some((c) => c.id === id.slice(11)) && CTX_SRC.includes("startsWith('crime.plan:')");
  // r29 (Submundo, famílias): itens de ps/ctxmob29 despachados por mobRun29 em ps/ctx27.ts
  // R29 (contratos+): "Propor empresariamento/produção/joint venture" — ps/ctx29c.runC29, chamado no default do run()
  if (/^(act|person)\.c29:(management|production|jv)$/.test(id)) return CTX_SRC.includes('runC29(s, m, item)');
  if (id.startsWith('org29:') || id.startsWith('mob.')) return CTX_SRC.includes('mobRun29(s, m, item, anchor)') && CTX_SRC.includes(`startsWith('${id.startsWith('org29:') ? 'org29:' : id.slice(0, id.indexOf(':') + 1) || id}`);
  return false;
}

describe('r29 (2) — menu de ações: todas as ações, por seção', () => {
  let s: GameState;
  beforeAll(() => { s = createGame(defaultConfig('r29-ctx', { startYear: 1975, scenario: 'established', realNames: true })); });

  it('seções na ordem pedida, com cabeçalho', () => {
    expect(SEC29.map((x) => x.id)).toEqual(['open', 'career', 'music', 'live', 'social', 'press', 'dark', 'more']);
    expect(SEC29.map((x) => pt(x.label))).toEqual(['Ver / Abrir', 'Carreira e contrato', 'Música e projetos', 'Ao vivo', 'Relação e vida pessoal', 'Imprensa e imagem', 'Submundo', 'Atalhos']);
  });

  it('pessoa de outro ato famoso: todas as seções, inclusive Submundo, e cada item tem handler', () => {
    const famous = Object.values(s.acts).filter((a) => !playerActs(s).includes(a.id) && a.status !== 'retired' && a.status !== 'split').sort((a, b) => b.fame - a.fame);
    const tk = CRIMES17.find((c) => c.tk === 'person')!;
    const tg = new Set(targetsFor(s, tk).map((x) => x.id));
    const pid = famous.flatMap((a) => a.members).find((m) => tg.has(m) && s.persons[m]?.alive && !s.persons[m].isPlayer)!;
    expect(pid).toBeTruthy();
    const m = ctxMenu27(s, 'person', pid, ENV)!;
    expect(secs(m)).toEqual(expect.arrayContaining(['open', 'career', 'social', 'press', 'dark', 'more']));
    const dark = m.items.filter((x) => secOf27(x) === 'dark').map((x) => x.id);
    expect(dark).toEqual(expect.arrayContaining(['pa:threaten', 'pa:bribe', 'pa:detective', 'crime.person']));
    expect(dark.some((x) => x.startsWith('pa:crime:'))).toBe(true);
    for (const x of m.items) expect(handled(x.id), x.id).toBe(true);
    // indisponível aparece desabilitado com o motivo (não some)
    for (const x of m.items) if (x.block) expect(pt(x.block).length).toBeGreaterThan(3);
    // todas as ações do registro de pessoa estão no menu (o presente vem pela conversa de favor: person.gift)
    for (const r of personActions18(s, `p:${pid}`)) expect(ids(m)).toContain(r.def.id === 'gift' ? 'person.gift' : `pa:${r.def.id}`);
    // sem duplicata do presente
    expect(ids(m)).not.toContain('pa:gift');
  });

  it('a ficha da pessoa usa a mesma fonte: seções sem "Ver / Abrir" cobrem o registro inteiro', () => {
    const a = Object.values(s.acts).find((x) => !playerActs(s).includes(x.id) && x.members.some((p) => s.persons[p]?.alive && !s.persons[p].isPlayer))!;
    const pid = a.members.find((p) => s.persons[p]?.alive && !s.persons[p].isPlayer)!;
    const m = ctxMenu27(s, 'person', `p:${pid}`, ENV)!;
    const sheet = menuSections27(m).filter((x) => x.sec !== 'open').flatMap((x) => x.items.map((i) => i.id));
    for (const r of personActions18(s, `p:${pid}`)) expect(sheet).toContain(r.def.id === 'gift' ? 'person.gift' : `pa:${r.def.id}`);
  });

  it('artista do elenco: o registro inteiro do artista por seção (música, ao vivo, carreira, imprensa, relação, atalhos) + Submundo', () => {
    const mine = playerActs(s)[0];
    const m = ctxMenu27(s, 'act', mine, ENV)!;
    expect(secs(m)).toEqual(expect.arrayContaining(['open', 'music', 'live', 'career', 'press', 'social', 'dark', 'more']));
    expect(ids(m)).toEqual(expect.arrayContaining(['a20:project.open', 'a20:press.interview', 'a20:press.radio', 'a20:rehearse.add', 'a20:rest.add', 'crime.plan:chart_rig', 'crime.plan:royalty_skim', 'act.tie']));
    // um caminho só: o que o menu já tinha não volta duplicado do registro
    for (const dup of ['a20:agenda.edit', 'a20:record.prepare', 'a20:shows.view', 'a20:sheet.full']) expect(ids(m)).not.toContain(dup);
    for (const x of m.items) expect(handled(x.id), x.id).toBe(true);
  });

  it('artista de outro selo, gravadora e organização: Submundo e submenus de pessoa', () => {
    const other = Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && a.status !== 'retired' && a.status !== 'split').sort((a, b) => b.fame - a.fame)[0];
    const am = ctxMenu27(s, 'act', other.id, ENV)!;
    expect(ids(am)).toEqual(expect.arrayContaining(['act.offer', 'crime.plan:sabotage', 'crime.plan:bootleg', 'act.leader']));
    const lm = ctxMenu27(s, 'label', other.owner!, ENV)!;
    expect(ids(lm)).toContain('crime.plan:wiretap');
    const o = orgs17(s)[0];
    const om = ctxMenu27(s, 'org', o.id, ENV)!;
    expect(ids(om)).toEqual(expect.arrayContaining(['org.open', 'org.approach', 'org.report']));
    expect(secs(om)).toContain('dark');
    for (const m of [am, lm, om]) for (const x of m.items) expect(handled(x.id), x.id).toBe(true);
    // sem o Submundo aberto: os itens ficam, desabilitados com o motivo
    const noCrime: CtxEnv27 = { has: (f) => f !== 'area:crime' };
    const am2 = ctxMenu27(s, 'act', other.id, noCrime)!;
    expect(pt(am2.items.find((x) => x.id === 'crime.plan:sabotage')?.block)).toMatch(/Submundo/);
  });

  it('montar os menus não muda o estado', () => {
    const snap = () => JSON.stringify([s.player.cash, s.week, Object.keys(s.knowledge).length, s.player.loans.length]);
    const before = snap();
    for (const a of Object.values(s.acts).slice(0, 20)) { ctxMenu27(s, 'act', a.id, ENV); for (const p of a.members) ctxMenu27(s, 'person', p, ENV); }
    expect(snap()).toBe(before);
  });
});

// ================================================================ (3) Nova run: situação × carreira

describe('r29 (3) — situação inicial e status', () => {
  it('o status segue carreira × situação (12 carreiras × 8 situações)', () => {
    expect(CAREERS29.length).toBe(12);
    // as 12 carreiras do jogo têm nome no status
    for (const d of careerDefs()) expect(CAREERS29).toContain(d.id);
    expect(SITS29.map((x) => x.id)).toEqual(['zero', 'emerging', 'mid', 'hipster', 'established', 'top5', 'leader', 'fallen']);
    expect(pt(statusLabel29('musician', 'zero'))).toBe('Artista iniciante');
    expect(pt(statusLabel29('musician', 'emerging'))).toBe('Artista emergente');
    expect(pt(statusLabel29('musician', 'hipster'))).toBe('Artista hipster');
    expect(pt(statusLabel29('studio', 'top5'))).toBe('Produtor top 5');
    expect(pt(statusLabel29('manager', 'leader'))).toBe('Empresário líder do mercado');
    expect(pt(statusLabel29('label', 'leader'))).toBe('Selo líder do mercado');
    expect(pt(statusLabel29('label', 'emerging'))).toBe('Selo emergente');
    expect(pt(statusLabel29('venue', 'established'))).toBe('Casa de shows estabelecida');
    expect(statusLabel29('studio', 'top5').en).toBe('Top-5 producer');
    const all = new Set<string>();
    for (const c of CAREERS29) for (const d of SITS29) {
      const x = statusLabel29(c, d.id);
      expect(pt(x).length).toBeGreaterThan(4);
      expect(x.en.length).toBeGreaterThan(4);
      if (c !== 'label') expect(pt(x)).not.toMatch(/^Selo/);
      all.add(pt(x));
    }
    expect(all.size).toBe(12 * 8);
  });

  it('a Nova run rápida e a completa dão a mesma RunConfig para a mesma situação; o status não diz "Selo" para artista', () => {
    for (const [career, sit] of [['musician', 'emerging'], ['studio', 'top5'], ['manager', 'leader'], ['label', 'hipster'], ['festival', 'fallen'], ['musician', 'zero']] as [string, Sit29][]) {
      const q = { ...quickDefaults27('r29-q', 'Selo'), career, start29: sit, scenario: sit29ById(sit)!.base };
      const quick = quickRunConfig27(q);
      // configuração completa: fábrica + cartões, marca a carreira, escolhe o cartão de situação (mesmo handler)
      const full = draftDefaults27(newRunConfig20({ seed: 'r29-q', companyName: 'Selo' }));
      if (career !== 'label') { full.careers!.main = [career]; full.role = roleFromMain(full.careers!.main); }
      setStart29(full, sit);
      expect(quick).toEqual(draftDefaults27(full));
      expect(sitOf29(quick)).toBe(sit);
      expect(quick.scenario).toBe(sit29ById(sit)!.base);
      expect(careerOf29(quick)).toBe(career);
      expect(pt(statusOf29(quick))).toBe(pt(statusLabel29(career, sit)));
    }
    // sem escolher situação: segue o scenario (e trocar o scenario por outro caminho re-sincroniza)
    const c = quickRunConfig27(quickDefaults27('r29-d', 'Selo'));
    expect(c.start29).toBe(sitOf29({ scenario: c.scenario }));
    const t: RunConfig = { ...c, start29: 'top5', scenario: 'emerging' };
    expect(syncStart29(t).start29).toBe('emerging');
  });

  it('as 8 situações dão configs válidas para as 12 carreiras (e o começo sorteado não contradiz)', () => {
    for (const career of CAREERS29) for (const d of SITS29) {
      const cfg = draftDefaults27(newRunConfig20({ seed: `r29-${career}-${d.id}`, companyName: 'X' }));
      cfg.careers!.main = [career];
      cfg.role = roleFromMain(cfg.careers!.main);
      setStart29(cfg, d.id);
      const run = buildRun27(draftDefaults27(cfg));
      expect(run.start29).toBe(d.id);
      expect(run.scenario).toBe(d.base);
      expect(start28Fits29(run.start28, run.start29)).toBe(true);
    }
    // uma major não começa "devendo o equipamento"
    expect(start28Fits29('debt', 'leader')).toBe(false);
    expect(start28Fits29('inherit', 'top5')).toBe(false);
    expect(start28Fits29('radio', 'leader')).toBe(true);
    expect(start28Fits29('debt', 'zero')).toBe(true);
  });

  it('a escada escala do mesmo jeito para negócio e artista; hipster troca alcance por prestígio; topo tem rivais e custos; crise tem dívida', () => {
    const g = (career: string, sit: Sit29) => {
      const main = [career];
      return createGame(defaultConfig(`r29-g-${career}`, { startYear: 1975, careers: { main, origin: 'none', ambition: 'legacy' }, role: roleFromMain(main), scenario: sit29ById(sit)!.base, start29: sit }));
    };
    const base = createGame(defaultConfig('r29-g-label', { startYear: 1975, careers: { main: ['label'], origin: 'none', ambition: 'legacy' }, role: 'label', scenario: 'emerging' }));
    for (const career of ['label', 'musician']) {
      const G = Object.fromEntries((['zero', 'emerging', 'mid', 'hipster', 'established', 'top5', 'leader', 'fallen'] as Sit29[]).map((x) => [x, g(career, x)])) as Record<Sit29, GameState>;
      const cash = (x: Sit29) => G[x].player.cash;
      expect(cash('zero')).toBeLessThan(cash('emerging'));
      expect(cash('emerging')).toBeLessThan(cash('mid'));
      expect(cash('mid')).toBeLessThan(cash('established'));
      expect(cash('established')).toBeLessThan(cash('top5'));
      expect(cash('top5')).toBeLessThan(cash('leader'));
      // mesma razão entre degraus para as duas carreiras (todas em pé de igualdade)
      expect(cash('leader') / cash('emerging')).toBeCloseTo(SITS29.find((x) => x.id === 'leader')!.cash, 0);
      // hipster: prestígio artístico acima, alcance comercial abaixo
      expect(G.hipster.player.reputation.artistic).toBeGreaterThan(G.emerging.player.reputation.artistic);
      expect(G.hipster.player.reputation.commercial).toBeLessThan(G.emerging.player.reputation.commercial);
      // sede, equipe e mercados sobem
      expect(G.leader.player.hq).toBeGreaterThanOrEqual(G.established.player.hq);
      expect(G.leader.player.staff.length).toBeGreaterThan(G.established.player.staff.length);
      expect(G.leader.player.territories.length).toBeGreaterThan(G.emerging.player.territories.length);
      // elenco (negócio) ou fama da banda (artista)
      if (career === 'label') expect(playerActs(G.leader).length).toBeGreaterThan(playerActs(G.emerging).length);
      else expect(G.leader.acts[G.leader.player.bandActId!].fame).toBeGreaterThan(G.emerging.acts[G.emerging.player.bandActId!].fame);
      // crise: dívida de verdade
      expect(G.fallen.player.loans.length).toBeGreaterThan(0);
      expect(G.emerging.player.loans.length).toBe(0);
      expect(G.leader.memory.some((m) => m.kind === 'start29')).toBe(true);
    }
    // sem start29 nada muda (valores-ouro)
    const plain = createGame(defaultConfig('r29-g-label', { startYear: 1975, careers: { main: ['label'], origin: 'none', ambition: 'legacy' }, role: 'label', scenario: 'emerging' }));
    expect(plain.player.cash).toBe(base.player.cash);
  });
});
