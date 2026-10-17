// R33 · REDES: fato público vira post com o artista certo; boato vira público ao postar; indireta mexe na briga; conta
// hackeada derruba a reputação; 1.000 posts do mesmo artista sem núcleo repetido nos últimos 50; o Jornal monta as seções
// a partir dos fatos; classificados apontam para as ações certas; a família Fossati nunca entra em fofoca romântica.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { emitFact, factById } from '../src/sim/facts17';
import { setSw } from '../src/sim/r31/switches';
import { feudOf18 } from '../src/sim/sys/feud18';
import { SW_REDES33, boatos33, feed33, form33, hackChance33, hackMonth33, ownPost33, react33, redes33, redes33On, sync33, write33, delegate33, FORMS33 } from '../src/sim/r33/redes33';
import { CLASSIFIED33, JSEC33, jornal33, papers33, classifieds33, cartas33 } from '../src/sim/r33/jornal33';
import { CORE_KINDS33, CORE_TEXT33 } from '../src/sim/r33/frases33data';
import { MEM33, TONES33, compose33, coreIds33, coreTotal33, pickCore33, remember33, variants33, CATCH_COUNT33 } from '../src/sim/r33/frases33';
import { OPEN33, CLOSE33, SLANG33 } from '../src/sim/r33/frases33tone';
import { vida33 } from '../src/sim/r33/vida33';
import { Rng } from '../src/core/rng';
import type { Act, GameState } from '../src/sim/types';
import { card5 } from '../src/ui/r31/acoes5model'; // primeiro: a ordem de carga dos cartões (ciclo de hoje)
import { ACTS_CAT5 } from '../src/ui/r31/acoes5cat';
import { CARDS5 } from '../src/ui/r31/acoes5data';
import { cardBoato33, cardItem33, cardPost33, redesApp33 } from '../src/ui/r33/redes33ui';
import { ICON33, redesIcon33, THUMB33, thumb33, MASTHEAD33, masthead33 } from '../src/ui/r33/redes33px';
import { ep5Of } from '../src/ui/pixel/exp5px';
import { apps33, extraApps33 } from '../src/ui/r33/aparelhos33model';
import '../src/ui/r33/redes33phone';
import { era33 } from '../src/sim/r33/frases33';

const game = (year = 1975): GameState => createGame(defaultConfig('r33-redes', { startYear: year }));
const acts = (s: GameState): Act[] => Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && a.members.length > 0 && !a.catalogNo);
const mineAct = (s: GameState): Act => { const a = acts(s)[0]; a.owner = 'player'; a.fame = 80; return a; };

describe('r33 redes · feed', () => {
  it('ligado por padrão', () => {
    const s = game();
    expect(redes33On(s)).toBe(true);
    setSw(s, SW_REDES33, false);
    expect(feed33(s)).toEqual([]);
  });
  it('fato público vira post com o artista certo, na voz dele; rumor não vira post', () => {
    const s = game(2008);
    const [a, b] = acts(s);
    emitFact(s, { kind: 'award', actors: [a.id], place: a.city, severity: 60, visibility: 'public', text: { pt: 'A ganha um prêmio.', en: 'A wins an award.' } });
    emitFact(s, { kind: 'show', actors: [b.id], place: b.city, severity: 40, visibility: 'rumor', text: { pt: 'B rumor.', en: 'B rumor.' } });
    sync33(s);
    const fd = feed33(s);
    const p = fd.find((x) => x.who === a.id && x.kind === 'award');
    expect(p).toBeTruthy();
    expect(p!.text.pt.length).toBeGreaterThan(10);
    expect(p!.text.en.length).toBeGreaterThan(10);
    expect(fd.some((x) => x.who === b.id && x.kind === 'show')).toBe(false);
  });
  it('seus artistas primeiro; o mundo também posta', () => {
    const s = game(2008);
    const [a, b] = acts(s);
    b.owner = 'player';
    emitFact(s, { kind: 'award', actors: [a.id], severity: 50, visibility: 'public', text: { pt: 'x', en: 'x' } });
    emitFact(s, { kind: 'release', actors: [b.id], severity: 30, visibility: 'public', text: { pt: 'y', en: 'y' } });
    emitFact(s, { kind: 'law', actors: [], severity: 50, visibility: 'public', text: { pt: 'Nova lei do direito autoral.', en: 'New copyright law.' } });
    const fd = feed33(s);
    expect(fd[0].mine).toBe(true);
    expect(fd[0].who).toBe(b.id);
    const w = fd.find((x) => x.world);
    expect(w?.text.pt).toContain('lei');
    expect(fd.indexOf(w!)).toBeGreaterThan(fd.findIndex((x) => x.who === a.id));
  });
  it('formas por época: jornal antes de 2004, perfil, post curto, foto, vídeo curto, avatar', () => {
    expect([1962, 2003, 2004, 2006, 2010, 2018, 2030].map(form33)).toEqual(['jornal', 'jornal', 'perfil', 'micro', 'foto', 'video', 'avatar']);
    expect(FORMS33.map((f) => f.y)).toEqual([1889, 2004, 2006, 2010, 2018, 2030]);
  });
});

describe('r33 redes · posts mexem no mundo', () => {
  it('postar sobre um boato o torna público; hype e fãs sobem', () => {
    const s = game(2012);
    const a = mineAct(s);
    const f = emitFact(s, { kind: 'affair', actors: [a.id], severity: 50, visibility: 'rumor', text: { pt: 'boato', en: 'rumour' } });
    expect(boatos33(s).some((x) => x.f.id === f.id)).toBe(true);
    const casual = a.fans.casual;
    const r = ownPost33(s, a.id, 'post', f.id);
    expect(r.ok).toBe(true);
    expect(factById(s, f.id)!.visibility).toBe('public');
    expect(a.fans.casual).toBeGreaterThan(casual);
    // cooldown de posts
    expect(ownPost33(s, a.id, 'post').ok).toBe(false);
  });
  it('desmentir e pedir desculpa respondem; ficar quieto não gasta nada', () => {
    const s = game(2012);
    const a = mineAct(s);
    const f = emitFact(s, { kind: 'scandal', actors: [a.id], severity: 50, visibility: 'rumor', text: { pt: 'boato', en: 'rumour' } });
    const rep = vida33(s).rep;
    expect(ownPost33(s, a.id, 'apologize', f.id).ok).toBe(true);
    expect(vida33(s).rep).toBeGreaterThan(rep);
    expect(ownPost33(s, a.id, 'deny', f.id).ok).toBe(true);
    expect(ownPost33(s, a.id, 'quiet', f.id).ok).toBe(true);
  });
  it('indireta de rival: responder esquenta a briga', () => {
    const s = game(2012);
    const a = mineAct(s);
    const rival = acts(s).find((x) => x.id !== a.id && x.genre !== a.genre) ?? acts(s)[1];
    const st = redes33(s);
    st.posts.push({ id: 'rj1', w: s.week, y: s.year, m: s.month, who: rival.id, kind: 'feud', vis: 'public', sev: 30, text: { pt: 'indireta', en: 'jab' }, core: 'feud#0', tone: 'arrogante', mine: false, jab: a.id });
    const r = react33(s, 'rj1', 'reply', a.id);
    expect(r.ok).toBe(true);
    // fora do modo exato, sem protegidos: a briga existe (ou o par é protegido e nada acontece)
    const fe = feudOf18(s, a.id, rival.id);
    expect(fe).toBeTruthy();
    expect(fe!.h).toBeGreaterThanOrEqual(8);
    expect(react33(s, 'rj1', 'like', a.id).ok).toBe(false); // já reagiu
  });
  it('curtir e repostar aproximam; delegar exige diretor de imprensa', () => {
    const s = game(2012);
    const a = mineAct(s), rival = acts(s)[1];
    const st = redes33(s);
    st.posts.push({ id: 'rp1', w: s.week, y: s.year, m: s.month, who: rival.id, kind: 'chart', vis: 'public', sev: 30, text: { pt: 'p', en: 'p' }, core: 'chart#0', tone: 'humilde', mine: false });
    expect(react33(s, 'rp1', 'repost', a.id).ok).toBe(true);
    st.posts.push({ id: 'mp1', w: s.week, y: s.year, m: s.month, who: a.id, kind: 'scandal', vis: 'public', sev: 50, text: { pt: 'p', en: 'p' }, core: 'scandal#0', tone: 'humilde', mine: true });
    expect(delegate33(s, 'mp1').ok).toBe(false);
  });
});

describe('r33 redes · conta hackeada, live e viral', () => {
  it('a conta hackeada derruba a reputação e bloqueia posts até recuperar', () => {
    const s = game(2012);
    const a = mineAct(s);
    const rep0 = vida33(s).rep;
    let hit = false;
    for (let y = 2012; y <= 2040 && !hit; y++) for (let m = 0; m < 12 && !hit; m++) { s.year = y; s.month = m; hackMonth33(s); hit = !!redes33(s).hacked[a.id]; }
    expect(hit).toBe(true);
    expect(vida33(s).rep).toBeLessThan(rep0);
    expect(redes33(s).posts.some((p) => p.bad && p.who === a.id)).toBe(true);
    expect(ownPost33(s, a.id, 'post').ok).toBe(false);
  });
  it('rara, maior com fama e menor com segurança digital; só de 2010 em diante', () => {
    const s = game(2012);
    const a = mineAct(s);
    const c0 = hackChance33(s, a);
    a.fame = 20; const low = hackChance33(s, a); a.fame = 90; const high = hackChance33(s, a);
    expect(low).toBeLessThan(high);
    expect(high).toBeLessThan(0.05);
    redes33(s).sec = 2;
    expect(hackChance33(s, a)).toBeLessThan(c0);
    s.year = 2009;
    expect(hackChance33(s, a)).toBe(0);
  });
});

describe('r33 redes · frases', () => {
  it('~600 núcleos, 6 tons, 84 aberturas e 84 fechos, 6 faixas de gíria; bilíngues', () => {
    expect(CORE_KINDS33.length).toBe(60);
    for (const k of CORE_KINDS33) expect(CORE_TEXT33[k].length).toBe(10);
    expect(coreTotal33()).toBeGreaterThanOrEqual(600);
    expect(TONES33.length).toBe(6);
    for (const t of TONES33) { expect(OPEN33[t].length).toBe(14); expect(CLOSE33[t].length).toBe(14); }
    expect(SLANG33.length).toBe(6);
    expect(CATCH_COUNT33).toBeGreaterThanOrEqual(20);
    expect(variants33()).toBeGreaterThan(10000);
    for (const t of Object.values(CORE_TEXT33).flat()) { const [pt, en] = t.split('|'); expect(pt.length).toBeGreaterThan(5); expect(en && en.length).toBeGreaterThan(5); }
    for (const t of TONES33) for (const x of [...OPEN33[t], ...CLOSE33[t]]) expect(x.split('|').length).toBe(2);
  });
  it('tipos raros caem no núcleo genérico do grupo', () => {
    expect(coreIds33('release')[0]).toBe('release#0');
    expect(coreIds33('hold_used')[0]).toMatch(/^g:/);
    expect(coreIds33('rehearsal_oddity')).toHaveLength(10);
  });
  it('1.000 posts seguidos do mesmo artista sem núcleo igual entre os últimos 50 (via write33, com a memória do artista)', () => {
    const s = game(1999);
    const a = acts(s)[0];
    const rng = Rng.fromSeed("7");
    const kinds = [...CORE_KINDS33, 'hold_used', 'stress_odd', 'rate_shift', 'crime_member'];
    const seq: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const w = write33(s, a, kinds[i % kinds.length], undefined, `t${i}`);
      const win = seq.slice(-MEM33);
      expect(win.includes(w.core)).toBe(false);
      expect(w.text.pt.length).toBeGreaterThan(8);
      seq.push(w.core);
    }
    void rng;
    expect(new Set(seq).size).toBeGreaterThan(300);
  });
  it('tipos que se repetem muito usam o núcleo mais antigo, nunca o mesmo duas vezes seguidas', () => {
    const mem: string[] = [];
    const rng = Rng.fromSeed("3");
    let last = '';
    for (let i = 0; i < 200; i++) {
      const c = pickCore33('show', mem, rng);
      expect(c).not.toBe(last);
      last = c; remember33(mem, c);
    }
    expect(mem.length).toBeLessThanOrEqual(MEM33);
    const gaps = new Map<string, number>();
    mem.length = 0;
    for (let i = 0; i < 100; i++) { const c = pickCore33('show', mem, rng); const g = gaps.get(c); if (g !== undefined) expect(i - g).toBeGreaterThanOrEqual(10); gaps.set(c, i); remember33(mem, c); }
  });
  it('o tom e a época mudam a frase; rival com bordão', () => {
    const rng = (n: number) => Rng.fromSeed(String(n));
    const a = compose33({ kind: 'award', tone: 'misterioso', year: 1905, slots: { c: 'Londres' }, mem: [], rng: rng(1), core: 'award#0' });
    const b = compose33({ kind: 'award', tone: 'arrogante', year: 2025, slots: { c: 'Londres' }, mem: [], rng: rng(1), core: 'award#0' });
    expect(a.text.pt).not.toBe(b.text.pt);
    expect(a.text.pt).toBe(a.text.pt.toLowerCase());
    let withCatch = 0;
    for (let i = 0; i < 40; i++) { const c = compose33({ kind: 'show', tone: 'humilde', year: 1990, slots: {}, mem: [], rng: rng(100 + i), catch: { pt: 'BORDAO', en: 'CATCH' } }); if (c.text.pt.includes('BORDAO')) withCatch++; }
    expect(withCatch).toBeGreaterThan(3);
    expect(withCatch).toBeLessThan(25);
  });
});

describe('r33 jornal', () => {
  it('forma por época: folha, rádio, fofoca e paradas, TV e fanzines, jornal e portal', () => {
    expect(papers33(1900).map((p) => p.id)).toEqual(['folha']);
    expect(papers33(1930).map((p) => p.id)).toEqual(['folha', 'radio']);
    expect(papers33(1962).map((p) => p.id)).toEqual(['jornal', 'fofoca', 'paradas']);
    expect(papers33(1985).map((p) => p.id)).toEqual(['jornal', 'tv', 'fanzine']);
    expect(papers33(1995).map((p) => p.id)).toEqual(['jornal', 'portal']);
    expect(Object.keys(JSEC33)).toHaveLength(8);
  });
  it('monta as seções a partir dos fatos', () => {
    const s = game(1962);
    const a = mineAct(s);
    emitFact(s, { kind: 'award', actors: [a.id], place: a.city, severity: 80, visibility: 'public', text: { pt: 'Prêmio para A.', en: 'Award for A.' } });
    emitFact(s, { kind: 'release', actors: [a.id], severity: 30, visibility: 'public', text: { pt: 'Disco novo de A.', en: 'New record by A.' } });
    emitFact(s, { kind: 'affair', actors: [a.id], severity: 40, visibility: 'rumor', text: { pt: 'Boato sobre A.', en: 'Rumour about A.' } });
    emitFact(s, { kind: 'law', actors: [], severity: 50, visibility: 'public', text: { pt: 'Nova lei.', en: 'New law.' } });
    emitFact(s, { kind: 'birth', actors: [a.id], severity: 20, visibility: 'public', text: { pt: 'Nasceu o filho de A.', en: 'A has a baby.' } });
    const j = jornal33(s);
    expect(j.sections.manchete[0]?.head.pt).toContain('Prêmio');
    expect(j.sections.musica.some((x) => x.head.pt.includes('Disco novo'))).toBe(true);
    expect(j.sections.coluna.some((x) => x.kind === 'boato' && x.actId === a.id)).toBe(true);
    expect(j.sections.mundo.some((x) => x.head.pt.includes('lei'))).toBe(true);
    expect(j.sections.nascimentos.some((x) => x.head.pt.includes('Nasceu'))).toBe(true);
    expect(j.sections.classificados.length).toBe(classifieds33(1962).length);
    expect(j.sections.cartas).toHaveLength(3);
    expect(cartas33(s)[0].text.pt.length).toBeGreaterThan(10);
  });
  it('as publicações não repetem texto: cada uma conta do seu jeito, reparte as seções e tem cartas próprias', () => {
    const s = game(1962);
    const a = mineAct(s);
    for (let i = 0; i < 4; i++) emitFact(s, { kind: 'show', actors: [a.id], severity: 40 + i, visibility: 'public', text: { pt: `Show ${i} de A.`, en: `Show ${i} by A.` } });
    const j = jornal33(s);
    const heads = (p: string) => Object.values(j.byPaper[p]).flat().filter((x) => x.kind !== 'anuncio').map((x) => x.head.pt);
    const [x, y] = [heads('fofoca'), heads('paradas')];
    expect(x.filter((h) => y.includes(h))).toEqual([]);
    const letters = (p: string) => j.byPaper[p].cartas.map((c) => c.head.pt);
    expect(new Set(letters('fofoca')).size).toBe(3);
    expect(letters('fofoca')).not.toEqual(letters('jornal'));
    const txt = jornal33(s).byPaper.fofoca.musica.map((m) => m.head.pt).join('|');
    expect(txt).toMatch(/Exclusivo|Boca pequena|Sem querer|E tem mais|Quem diria|Contem/);
  });
  it('classificados: toda ação é de um app antes do celular e existe', () => {
    for (const c of CLASSIFIED33) { expect(c.acts.length).toBeGreaterThan(0); expect(c.body.pt && c.body.en && c.head.en).toBeTruthy(); }
    expect(CLASSIFIED33.find((c) => c.id === 'coracao')!.acts).toContain('chamarSair');
    expect(CLASSIFIED33.find((c) => c.id === 'musico')!.acts).toContain('garimpar');
    expect(CLASSIFIED33.find((c) => c.id === 'correio')!.acts).toEqual(['r33.cl.compras']);
  });
  it('a família Fossati nunca entra em fofoca romântica (feed, coluna, nascimentos e casamentos)', () => {
    const s = game(2008);
    const a = mineAct(s);
    emitFact(s, { kind: 'romance', actors: ['fam:lucia', a.id], severity: 50, visibility: 'public', text: { pt: 'ROMANCE FOSSATI', en: 'ROMANCE FOSSATI' } });
    emitFact(s, { kind: 'affair', actors: ['lucia', a.id], severity: 50, visibility: 'rumor', text: { pt: 'CASO FOSSATI', en: 'AFFAIR FOSSATI' } });
    emitFact(s, { kind: 'marriage', actors: ['sonia', a.id], severity: 40, visibility: 'public', text: { pt: 'CASAMENTO FOSSATI', en: 'WEDDING FOSSATI' } });
    emitFact(s, { kind: 'romance', actors: [a.id], severity: 50, visibility: 'public', text: { pt: 'ROMANCE COMUM', en: 'ORDINARY ROMANCE' } });
    const j = jornal33(s);
    const all = [...feed33(s).map((x) => x.text.pt), ...Object.values(j.sections).flat().map((x) => x.head.pt), ...boatos33(s).map((x) => x.f.text.pt)].join(' | ');
    expect(all).not.toContain('FOSSATI');
    expect(feed33(s).some((x) => x.kind === 'romance')).toBe(true);
  });
});

describe('r33 redes · telas, cartões e o app', () => {
  it('classificados: cada anúncio abre o cartão com as ações certas, que existem no catálogo', () => {
    const s = game(1962);
    for (const c of CLASSIFIED33) for (const a of c.acts) expect(ACTS_CAT5[a], `${c.id}:${a}`).toBeTruthy();
    for (const id of ['r33.cl.compras', 'r33.cl.leilao']) { expect(ACTS_CAT5[id].src?.length).toBe(2); expect(typeof ACTS_CAT5[id].fn).toBe('function'); }
    const item = (ad: string) => jornal33(s).sections.classificados.find((x) => x.ad === ad)!;
    const ids = (ad: string) => cardItem33(s, item(ad)).acts.map((a) => a.id);
    expect(ids('coracao')).toContain('chamarSair'); // 'encontro' só aparece quando há com quem jantar
    expect(ids('musico')).toEqual(expect.arrayContaining(['garimpar', 'contratarArtista']));
    expect(ids('correio')).toEqual(['r33.cl.compras']);
    expect(ids('leilao')).toEqual(['r33.cl.leilao']);
    expect(ids('vagas')).toContain('contratarFunc');
  });
  it('cartão de post: seu artista (postar, desmentir, desculpa, quieto, delegar); de outro (curtir, repostar, responder, ignorar)', () => {
    const s = game(2012);
    const a = mineAct(s), rival = acts(s)[1];
    const st = redes33(s);
    st.posts.push({ id: 'cp1', w: s.week, y: s.year, m: s.month, who: a.id, kind: 'award', vis: 'public', sev: 40, text: { pt: 'p', en: 'p' }, core: 'award#0', tone: 'humilde', mine: true });
    st.posts.push({ id: 'cp2', w: s.week, y: s.year, m: s.month, who: rival.id, kind: 'chart', vis: 'public', sev: 40, text: { pt: 'p', en: 'p' }, core: 'chart#0', tone: 'humilde', mine: false });
    const fd = feed33(s, { limit: 100 });
    expect(cardPost33(s, fd.find((x) => x.id === 'cp1')!).acts.map((x) => x.id)).toEqual(['r33.post', 'r33.deny', 'r33.sorry', 'r33.quiet', 'r33.delegate']);
    expect(cardPost33(s, fd.find((x) => x.id === 'cp2')!).acts.map((x) => x.id)).toEqual(['r33.like', 'r33.repost', 'r33.reply', 'r33.ignore']);
    const f = emitFact(s, { kind: 'affair', actors: [a.id], severity: 40, visibility: 'rumor', text: { pt: 'b', en: 'b' } });
    expect(cardBoato33(s, f.id, a.id).acts.map((x) => x.id)).toEqual(['r33.b.post', 'r33.b.deny', 'r33.b.plant', 'r33.b.run', 'r33.b.delegate']);
  });
  it('o Jornal na mesa ganha "Ler o jornal" e, de 2004, "Abrir as redes"', () => {
    expect(CARDS5.jornal.acts).toEqual(expect.arrayContaining(['r33.jornal', 'r33.redes']));
    const mk = (y: number) => card5(game(y), 'jornal')!.acts.map((x) => x.id);
    expect(mk(1962)).toContain('r33.jornal');
    expect(mk(1962)).not.toContain('r33.redes');
    expect(mk(2010)).toEqual(expect.arrayContaining(['r33.jornal', 'r33.redes']));
  });
  it('app Redes: registro pronto para a casca, formas por ano, ícone e arte diferentes por forma e por época', () => {
    expect(redesApp33.id).toBe('redes');
    expect(redesApp33.forms.map((f) => `${f.y}:${f.id}`)).toEqual(['2004:perfil', '2006:micro', '2010:foto', '2018:video', '2030:avatar']);
    expect(redesApp33.when(game(2003))).toBe(false);
    expect(redesApp33.when(game(2010))).toBe(true);
    expect(typeof redesApp33.open).toBe('function');
    const forms = ['jornal', 'perfil', 'micro', 'foto', 'video', 'avatar'] as const;
    const sig = forms.map((f) => Array.from(redesIcon33(f, 2025).d).join(','));
    expect(new Set(sig).size).toBe(forms.length);
    for (const f of forms) { const p = redesIcon33(f, 2025); expect(p.w).toBe(ICON33 + 2); expect(new Set(Array.from(p.d).filter(Boolean)).size).toBeGreaterThan(3); }
    expect(Array.from(redesIcon33('perfil', 1962).d).join()).not.toBe(Array.from(redesIcon33('perfil', 2025).d).join());
    const th = thumb33('award', 'x', 2012, 'video');
    expect([th.w, th.h]).toEqual([THUMB33.w, THUMB33.h]);
    expect(new Set(Array.from(th.d)).size).toBeGreaterThan(5);
    const m = masthead33('folha', 'A Folha', 1905);
    expect([m.w, m.h]).toEqual([MASTHEAD33.w, MASTHEAD33.h]);
    expect(new Set(Array.from(m.d)).size).toBeGreaterThan(4);
    for (const y of [1889, 1919, 1920, 1949, 1950, 1969, 1970, 1989, 1990, 2009, 2010, 2040]) expect(era33(y)).toBe(ep5Of(y));
  });
  it('o app Redes está registrado no celular e aparece de 2007 em diante (2004 na tabela do PC); some com o sistema desligado', () => {
    expect(extraApps33('phone').some((a) => a.id === 'redes' && a.de === 2004)).toBe(true);
    expect(apps33(game(2012), 'phone')).toContain('redes');
    expect(apps33(game(1997), 'phone')).not.toContain('redes');
    const s = game(2012);
    setSw(s, SW_REDES33, false);
    expect(apps33(s, 'phone')).not.toContain('redes');
  });
});
