// R31 · onda 4 (X) — INTERRUPTOR "NOMES E OBRAS REAIS" (exibição). Um interruptor só cobre tudo que pode infringir
// direito de terceiros: artistas e integrantes, músicas e discos, gravadoras, festivais, veículos, plataformas, prêmios,
// paradas, empresários e produtores reais, relíquias (donos), bandas de ficção, cultura pop, memes e modos.
//
// Duas coisas diferentes:
//  - `s.config.realNames` é a escolha da Nova partida (decide com que nomes o mundo NASCE — já existia, rodada 6);
//  - `realShown31(s)` é o que a TELA mostra agora. Começa igual à escolha da partida e pode ser trocado em Opções no meio
//    do jogo: a troca é só na hora de mostrar (`s.x4.rn31.show`), saves e simulação não mudam.
//
// A tabela de trocas sai do registro único (src/data/realnames31.ts, homenagens escritas à mão) e das bases reais grandes
// (homenagem gerada, src/data/homage31.ts); mais os atos desta partida (o mesmo ato real nascido com nome inventado volta
// a ter o nome real quando o interruptor é ligado). O motor de troca está em src/data/realdisp31.ts.
import { CATALOG_ACTS, CATALOG_LABELS, FESTIVALS, MEDIA } from '../../data/catalog';
import { AWARDS, PLATFORMS } from '../../data/content';
import { COUNTRY_INFO } from '../../data/countries';
import { REAL_MGRS } from '../../data/managers14';
import { REAL_CLASSIC } from '../../data/realacts_classic';
import { REAL_PRODS } from '../../data/producers15';
import { REAL_ACTS, REAL_LABELS, REAL_TEXT, applyRealNames } from '../../data/realnames';
import { REALNAMES31 } from '../../data/realnames31';
import { FICTION31 } from '../../data/fiction31';
import { POP31 } from '../../data/pop31';
import { homage31 } from '../../data/homage31';
import { setDisplay31, tooShort31, type DispPair31 } from '../../data/realdisp31';
import { allCountryCodes, countryName } from '../../data/geo';
import { CITIES, GENRES, MARKETS } from '../../data/world';
import { registerExt4 } from '../ext4';
import { RELICS17 } from '../relics17';
import { REAL_ALL, realDataOf } from '../sys/realworld';
import type { GameState } from '../types';

declare module '../ext4' { interface Ext4 { rn31: { show?: boolean } } }
registerExt4('rn31', () => ({}));

const rn = (s: GameState): { show?: boolean } => {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  return (x.rn31 ??= {}) as { show?: boolean };
};

/** O que a tela mostra agora (Opções › Nomes e obras reais); sem troca, segue a escolha da Nova partida. */
export const realShown31 = (s: GameState): boolean => rn(s).show ?? s.config.showReal31 ?? !!s.config.realNames;
/** Troca só a exibição (não marca a partida, não muda simulação). */
export function setRealShown31(s: GameState, on: boolean): void {
  if (on === (s.config.showReal31 ?? !!s.config.realNames)) delete rn(s).show;
  else rn(s).show = on;
  syncRealShow31(s);
}

// ---------------------------------------------------------------- palavras que não podem ser trocadas em frase

const COMMON31 = new Set(('yes kiss heart queen prince boston chicago america europe genesis journey poison television blondie madness '
  + 'traffic family free cream love help yesterday hello imagine angel angels sugar gold silver rush berlin japan texas nirvana bush garbage '
  + 'live bread air justice train war space muse travis keane suede blur oasis a-ha abc wham yello devo rain sting seal moby adele drake future '
  + 'logic common nas eve brandy monica mya aaliyah sade shakira anitta xuxa mina rita elis gal cazuza djavan sandy junior cher dido enya bjork '
  + 'jewel lorde halsey prince madonna rihanna beyoncé usher ciara akon pitbull juanes alpha omega zero one two three four five six seven eight '
  + 'nine ten the a o os as e de da do um uma rádio radio festival tv band banda music música rock pop jazz blues samba bossa funk soul disco '
  + 'punk metal rap reggae ska house techno trance gospel country folk mpb forró axé sertanejo pagode tango salsa '
  // nomes reais que são palavras comuns da interface ou de frases (pt/en): só trocam como texto inteiro ou entre aspas
  + 'elenco nada menor magro alemão dente levante clara area gala mango city culture focus jet winter sabotage bender accept '
  + 'deluxe random melody shade hub jun jul flood youth vinyl friends friday savage gazebo syria variety '
  // verbos de botão da interface que também são nomes reais (ex.: Fazer, do N-Dubz, virava "Fazmann" em "Fazer contatos")
  + 'fazer ver abrir jogar fechar pular comprar vender gravar lançar contratar marcar ligar avançar sair').split(/\s+/));

// teclas e palavras curtas da interface (rótulos de tecla e botões que não passam por t()): nunca trocadas
const UIWORDS31 = ['Enter', 'Esc', 'Tab', 'Alt', 'Ctrl', 'Shift', 'Space', 'Espaço', 'Home', 'End', 'Delete', 'Backspace',
  'OK', 'Ok', 'No', 'Go', 'Up', 'On', 'Off', 'So', 'Be', 'Re', 'Do', 'Oh',
  'Fazer', 'Ver', 'Abrir', 'Jogar', 'Fechar', 'Pular', 'Comprar', 'Vender', 'Gravar', 'Lançar', 'Contratar', 'Marcar', 'Ligar', 'Avançar', 'Sair'];

let PLACES31: Set<string> | null = null;
/** nomes de lugar: cidades, países e mercados (pt e en), inteiros */
function places31(): Set<string> {
  if (PLACES31) return PLACES31;
  const pl = new Set<string>();
  for (const c of CITIES) { pl.add(c.name.pt); pl.add(c.name.en); }
  for (const a3 of allCountryCodes()) { const n = countryName(a3); pl.add(n.pt); pl.add(n.en); }
  for (const m of MARKETS) { pl.add(m.name.pt); pl.add(m.name.en); }
  return (PLACES31 = pl);
}

let STOP31: Set<string> | null = null;
function stop31(): Set<string> {
  if (STOP31) return STOP31;
  const st = new Set<string>(COMMON31);
  // lugares inteiros e cada palavra deles ("Rio" de "Rio de Janeiro", "Hungria", "Oriente"): não trocam em frase
  for (const p of places31()) { st.add(p.toLowerCase()); for (const w of p.split(/[^\p{L}]+/u)) if (w) st.add(w.toLowerCase()); }
  for (const g of GENRES) { st.add(g.name.pt.toLowerCase()); st.add(g.name.en.toLowerCase()); }
  return (STOP31 = st);
}

let KEEP31: Set<string> | null = null;
/** texto que o interruptor nunca troca, nem como texto inteiro: cidade, país ou mercado ("Boston", "Chicago",
 *  "Berlin" também são nomes de banda, mas na tela quase sempre são o lugar), palavras/teclas da interface e texto curto
 *  ou sem letra ("N", "1984", "883": na tela quase sempre é tecla, ano ou número) */
export const keep31 = (s: string): boolean => tooShort31(s) || (KEEP31 ??= new Set([...places31(), ...UIWORDS31])).has(s.trim());
const set31 = (names: DispPair31[], titles: DispPair31[]): void =>
  setDisplay31(names.filter(([a]) => !keep31(a)), titles.filter(([a]) => !keep31(a)), entities31());
/** nome que pode ser trocado em qualquer ponto da frase (o resto só quando é o texto inteiro ou está entre aspas) */
const inText31 = (n: string): boolean => {
  const w = n.trim();
  if (w.length < 3) return false;
  if (/\s/.test(w)) return !stop31().has(w.toLowerCase());
  return !stop31().has(w.toLowerCase()) && /^\p{Lu}/u.test(w);
};

// ---------------------------------------------------------------- tabela estática (bases reais → homenagem)

const hasWord31 = (s: string, w: string): boolean => {
  const i = s.indexOf(w);
  if (i < 0) return false;
  const wc = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);
  return !wc(s[i - 1]) && !wc(s[i + w.length]);
};

/** R31 (NOMES): entidade conhecida que troca mesmo coincidindo com uma palavra da interface (gravadoras reais e atos do
 *  catálogo à mão: a gravadora "Elenco", o sambista "Cartola"); como rótulo da interface, a marca UI31 do t() protege. */
let ENT31: Set<string> | null = null;
export const entities31 = (): ReadonlySet<string> => (ENT31 ??= new Set([...Object.values(REAL_LABELS), ...Object.values(REAL_ACTS).map((a) => a.name)]));

export interface RealPairs31 { names: DispPair31[]; titles: DispPair31[]; keep: ReadonlySet<string> }
let STATIC_OFF: RealPairs31 | null = null;

/** Todas as trocas real → homenagem que valem com o interruptor desligado (sem os atos da partida). */
export function realPairsOff31(): RealPairs31 {
  if (STATIC_OFF) return STATIC_OFF;
  const names: DispPair31[] = [];
  const titles: DispPair31[] = [];
  const seen = new Set<string>();
  const add = (real: string | undefined, sub: string | undefined, title = false) => {
    if (!real || !sub || seen.has(real)) return;
    if (sub === real || hasWord31(sub, real)) sub = homage31(real); // homenagem antiga que contém o nome real
    seen.add(real);
    (title || !inText31(real) ? titles : names).push([real, sub]);
  };
  // 1) registro escrito à mão (prioridade)
  for (const r of Object.values(REALNAMES31)) add(r.real, r.substituto, r.tipo === 'work');
  // 2) catálogo da rodada 6: o nome ficcional do catálogo é a homenagem
  const cat = new Map(CATALOG_ACTS.map((a) => [a.no, a.name]));
  for (const [no, ra] of Object.entries(REAL_ACTS)) {
    add(ra.name, cat.get(Number(no)) ?? homage31(ra.name));
    for (const m of ra.members ?? []) add(m, homage31(m));
  }
  const labName = new Map(CATALOG_LABELS.map((d) => [d.id, d.name]));
  for (const [id, real] of Object.entries(REAL_LABELS)) add(real, labName.get(id) ?? homage31(real));
  for (const [fic, real] of REAL_TEXT) add(real, fic);
  for (const p of PLATFORMS) if (p.realRef && /^[A-Z0-9]/.test(p.realRef)) add(p.realRef, p.name);
  for (const a of AWARDS) if (a.realRef) add(a.realRef, a.name);
  for (const c of COUNTRY_INFO) { add(c.chart[1], c.chart[0]); if (c.award) add(c.award[1], c.award[0]); }
  for (const f of FESTIVALS) if (f.realRef) add(f.realRef.replace(/\s*\([^)]*\)\s*$/, '').trim(), f.name);
  for (const m of MEDIA) if (m.realRef && /^[A-Z0-9]/.test(m.realRef)) add(m.realRef.replace(/\s*\([^)]*\)\s*$/, '').trim(), m.name);
  // 3) bases grandes: artistas, integrantes, músicas e discos (homenagem gerada)
  for (const a of REAL_ALL) {
    add(a.n, homage31(a.n));
    for (const m of a.m ?? []) add(m[0], homage31(m[0]));
  }
  for (const ex of Object.values(REAL_CLASSIC)) for (const m of ex.m ?? []) add(m[0], homage31(m[0]));
  for (const a of REAL_ALL) for (const r of a.al ?? []) add(r[0], homage31(r[0]), true);
  for (const ex of Object.values(REAL_CLASSIC)) for (const r of ex.al ?? []) add(r[0], homage31(r[0]), true);
  for (const p of REAL_PRODS) add(p.name, homage31(p.name));
  for (const m of REAL_MGRS) add(m.name, homage31(m.name));
  for (const r of RELICS17) add(r.owner, homage31(r.owner));
  // 4) bandas de filmes, séries e animações (as sem registro à mão ganham homenagem gerada) e seus personagens
  for (const f of FICTION31) {
    add(f.n, homage31(f.n));
    add(f.obra, homage31(f.obra), true);
    for (const m of f.m) add(m, homage31(m));
  }
  // 5) cultura pop, memes, bolhas e fracassos (src/data/pop31.ts): homenagem escrita junto da referência
  for (const p of POP31) for (const [real, sub] of p.refs) add(real, sub);
  return (STATIC_OFF = { names, titles, keep: entities31() });
}

/** Todos os nomes reais conhecidos pelo interruptor (teste de varredura). */
export const allRealNames31 = (): string[] => { const p = realPairsOff31(); return [...p.names, ...p.titles].map(([a]) => a); };

// ---------------------------------------------------------------- sincronização (tela)

/** Monta a tabela conforme o que a tela deve mostrar. Chamado ao abrir a partida, ao trocar o interruptor e após avançar. */
let lastKey31 = '';
export function syncRealShow31(s: GameState): void {
  const show = realShown31(s);
  const key = `${s.config.seed}|${show}|${Object.keys(s.acts).length}|${!show && s.config.realNames ? Object.keys(s.releases).length : 0}`;
  if (key === lastKey31) return;
  lastKey31 = key;
  applyRealNames(show); // dados estáticos antigos (festivais, veículos) e o filtro da rodada 6
  if (show) {
    // partida nascida com nomes inventados: o ato real volta ao nome real na tela
    const names: DispPair31[] = [];
    if (!s.config.realNames) {
      const fic = (s as unknown as { x4?: { x31?: { fic?: Record<string, string> } } }).x4?.x31?.fic ?? {};
      for (const [fid, aid] of Object.entries(fic)) { const f = FICTION31.find((x) => x.id === fid), a = s.acts[aid]; if (f && a && a.name !== f.n) names.push([a.name, f.n]); }
      for (const a of Object.values(s.acts)) {
        const real = a.catalogNo ? (realDataOf(a)?.n ?? REAL_ACTS[a.catalogNo]?.name) : undefined;
        if (real && real !== a.name && inText31(a.name)) names.push([a.name, real]);
      }
    }
    set31(names, Object.values(s.acts).flatMap((a) => { const real = a.catalogNo && !s.config.realNames ? (realDataOf(a)?.n ?? REAL_ACTS[a.catalogNo]?.name) : undefined; return real && real !== a.name && !inText31(a.name) ? [[a.name, real] as DispPair31] : []; }));
    return;
  }
  const st = realPairsOff31();
  if (!s.config.realNames) { set31(st.names, st.titles); return; }
  // mundo nascido com nomes reais: títulos e integrantes vindos de qualquer base (canções por artista, auditorias…)
  const names = [...st.names], titles = [...st.titles];
  const known = new Set([...names, ...titles].map(([a]) => a));
  for (const a of Object.values(s.acts)) {
    if (!a.catalogNo) continue;
    const real = realDataOf(a)?.n ?? REAL_ACTS[a.catalogNo]?.name;
    if (!real || a.name !== real) continue;
    for (const pid of a.members) { const pn = s.persons[pid]?.name; if (pn && !known.has(pn)) { known.add(pn); (inText31(pn) ? names : titles).push([pn, homage31(pn)]); } }
  }
  for (const r of Object.values(s.releases)) {
    const a = s.acts[r.actId];
    if (!a?.catalogNo || !r.title || known.has(r.title)) continue;
    const real = realDataOf(a)?.n ?? REAL_ACTS[a.catalogNo]?.name;
    if (!real || a.name !== real) continue;
    known.add(r.title);
    titles.push([r.title, homage31(r.title)]);
  }
  set31(names, titles);
}
