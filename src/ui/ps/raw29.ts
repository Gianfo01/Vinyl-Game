// Rodada 29 (menus/dados crus) — duas coisas pequenas e puras usadas pela interface e pela varredura automática:
//   1) nomes para chaves internas que às vezes vazavam para o jogador ('p:…', 'l:…', ids de gênero/família, funções
//      de integrante) — sempre um texto legível, nunca a chave;
//   2) o detector de "dado cru" (rawHits29): undefined/NaN/[object Object], ids de módulo (real27, ability18…),
//      chaves camelCase/snake_case, ids com prefixo, "Mais dados · …". A varredura de tela (scripts/r29/rawscan.mjs)
//      e o teste (tests/r29-ui-raw.test.ts) usam ESTE detector — uma fonte só.

import { gfName, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { nameOfKey18 } from '../../sim/sys/agency18';
import { ROLE27_NAMES } from '../../sim/sys/roles27';
import type { GameState } from '../../sim/types';
import { ent27 } from './ent27';

/** Função de integrante traduzida ('rhythm' → "Guitarra base"); desconhecida vira texto legível. */
export const roleName29 = (role: string): L => ROLE27_NAMES[role] ?? l(role.replace(/_/g, ' '));
/** Lista de funções ('rhythm, piano, harmonica' → "Guitarra base, Piano, Gaita"). */
export const rolesTxt29 = (roles: readonly string[]): string => roles.map((r) => t(roleName29(r))).join(', ');
/** Gênero ou família traduzidos (reexporta data/world.gfName para a interface). */
export const genre29 = (id: string): string => t(gfName(id));

/** Nome de uma chave de pessoa/ato/selo ('p:…', 'l:…', 'e:…', id de ato ou selo); sem nome conhecido → "alguém". */
export function keyName29(s: GameState, k: string): string {
  let n = k;
  try { n = nameOfKey18(s, k); } catch { n = k; }
  if (n && n !== k) return n;
  const id = k.includes(':') ? k.slice(k.indexOf(':') + 1) : k;
  return s.acts[k]?.name ?? s.labels[k]?.name ?? s.labels[id]?.name ?? s.persons[id]?.name ?? t(l('alguém', 'someone'));
}
/** Marca de clique direito para uma chave (ato → 'act'; selo → 'label'; resto → pessoa). */
export function keyEnt29(s: GameState, k: string): Record<string, string> {
  if (s.acts[k]) return ent27('act', k);
  if (s.labels[k]) return ent27('label', k);
  if (k === 'player' || /^(p|e|pd|l|s|c):/.test(k)) return ent27('person', k);
  return {};
}

/** Texto de um prêmio do livro único (`s.awards`): o nome vem gravado como "pt / en: vencedor" — mostra só a língua
 *  da interface; a categoria (id interno como 'euro_stage') não aparece. */
export function awardTxt29(a: { name: string }): string {
  const m = /^(.+?) \/ (.+?): (.+)$/.exec(a.name);
  return m ? `${t(l(m[1], m[2]))}: ${m[3]}` : a.name;
}

// ---------------------------------------------------------------- detector de dado cru

export type Raw29 = 'lixo' | 'despejo' | 'modulo' | 'id' | 'camelCase' | 'snake_case' | 'enum';
export interface RawHit29 { kind: Raw29; m: string }

/** Ids de módulo que nunca devem aparecer (nomes de sistemas internos). */
const MODULES29 = /\b(?:real27|ability18|roles27|prov27|persona13|dossier13|people16|ctx27|x4|love17|press9|bonds9|media17|screen18|hype12|chron9|bolsa10)\b/g;
/** camelCase legítimo (marcas). */
const OK_CAMEL29 = new Set(['iPod', 'iPhone', 'iTunes', 'eBay', 'iPad', 'YouTube', 'eMusic', 'iMac', 'macOS', 'iOS', 'mySpace', 'myspace', 'deadmau5']);
/** palavras de jargão que o jogo usa de propósito em português (split de autoria, burnout…). */
const OK_WORDS29 = new Set(['split', 'burnout']);
/** Valores de enum que, sozinhos ou em lista "chave: a, b", denunciam falta de tradução. */
export const ENUM29: ReadonlySet<string> = new Set([...Object.keys(ROLE27_NAMES).filter((k) => ROLE27_NAMES[k].pt.toLowerCase() !== k), 'voice_strain', 'addiction', 'recovering', 'few', 'own_act', 'pending', 'counter', 'hiatus']);

/** Procura dado cru num texto visível. Vazio = limpo. */
export function rawHits29(txt: string): RawHit29[] {
  const out: RawHit29[] = [];
  const s = txt.trim();
  if (!s) return out;
  const m0 = s.match(/\bundefined\b|\bNaN\b|\[object Object\]|(?:^|[\s:(])null(?:$|[\s,)])/);
  if (m0) out.push({ kind: 'lixo', m: m0[0].trim() });
  if (/Mais dados\s*·|More data\s*·/.test(s)) out.push({ kind: 'despejo', m: 'Mais dados' });
  for (const m of s.matchAll(MODULES29)) out.push({ kind: 'modulo', m: m[0] });
  for (const m of s.matchAll(/(?:^|[\s(·,])((?:p|e|pd|l|s|c|o|mo29|hire29):[A-Za-z][A-Za-z0-9_-]{2,})/g)) out.push({ kind: 'id', m: m[1] });
  for (const m of s.matchAll(/(?<![\w.@/-])([a-z]+[A-Z][A-Za-z]+)(?![\w.@/-])/g)) if (!OK_CAMEL29.has(m[1])) out.push({ kind: 'camelCase', m: m[1] });
  for (const m of s.matchAll(/(?<![\w.@/-])([a-z]{2,}_[a-z_]{2,})(?![\w.@/-])/g)) out.push({ kind: 'snake_case', m: m[1] });
  const toks = s.split(/[\s,·:;()]+/).filter(Boolean);
  const listy = toks.length === 1 || /:\s*[a-z_]+(?:,\s*[a-z_]+)+\s*$/.test(s);
  if (listy) for (const tok of toks) if (ENUM29.has(tok) && !OK_WORDS29.has(tok)) out.push({ kind: 'enum', m: tok });
  return out;
}
