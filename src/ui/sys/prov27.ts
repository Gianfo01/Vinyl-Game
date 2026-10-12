// Rodada 27 (F) — "fonte/certeza" na ficha da pessoa e na página do artista: histórico confirmado, aproximado ou não
// conferido, ou simulado (gerado nesta partida). Nascimento gerado aparece como "idade aproximada". Leitura pura.
import { l, type L } from '../../data/world';
import type { Prov27 } from '../../data/realtypes';
import { t } from '../../i18n/strings';
import { realDataOf } from '../../sim/sys/realworld';
import type { Act, GameState, Person } from '../../sim/types';
import { h } from '../dom';
import { ACT_HEAD_EXTRAS, PERSON_HEAD_EXTRAS } from '../pages';

export type Src27 = Prov27 | 'sim';
const TXT: Record<Src27, L> = {
  c: l('histórico · confirmado', 'historical · confirmed'), a: l('histórico · aproximado', 'historical · approximate'),
  u: l('não conferido', 'unverified'), sim: l('simulado nesta partida', 'simulated in this run'),
};
const TONE: Record<Src27, string> = { c: 'good', a: 'warn', u: 'bad', sim: 'muted' };
const AP: Record<string, L> = { f: l('formação', 'formation'), d: l('estreia', 'debut'), b: l('nascimento', 'birth'), x: l('morte', 'death'), m: l('datas de integrantes', 'member dates') };

/** Procedência de um ato: real (nomes reais) confirmado/aproximado/não conferido, ou simulado. */
export function actSrc27(s: GameState, a: Act): { k: Src27; ap: string[] } {
  const d = s.config.realNames && a.catalogNo ? realDataOf(a) : undefined;
  if (!d) return { k: 'sim', ap: [] };
  const full = d as { exact?: false; ap?: string[] };
  if (full.exact === false) return { k: 'u', ap: [] };
  return full.ap?.length ? { k: 'a', ap: full.ap } : { k: 'c', ap: [] };
}

/** Procedência de uma pessoa (a mais certa entre as cópias onde ela aparece). */
export function personSrc27(s: GameState, p: Person): { k: Src27; bornEst: boolean; writer: boolean } {
  const x = p.real27;
  if (!s.config.realNames || p.isPlayer) return { k: 'sim', bornEst: false, writer: false };
  if (x?.prov) return { k: x.prov, bornEst: !!x.bornEst, writer: !!x.writer };
  const act = Object.values(s.acts).find((a) => a.catalogNo && a.members.includes(p.id));
  return { k: act ? actSrc27(s, act).k : 'sim', bornEst: !!x?.bornEst, writer: false };
}

const line = (k: Src27, extra: string[]) => h('div', { class: 'small prov27', 'data-prov': k },
  h('span', { class: 'muted' }, `${t(l('Fonte/certeza', 'Source/certainty'))}: `), h('span', { class: TONE[k] }, t(TXT[k])),
  extra.length ? h('span', { class: 'muted' }, ` · ${extra.join(' · ')}`) : null);

PERSON_HEAD_EXTRAS.push((s, p) => {
  const x = personSrc27(s, p);
  if (x.k === 'sim' && !x.bornEst) return null;
  const extra: string[] = [];
  if (x.bornEst) extra.push(t(l('idade aproximada (nascimento não documentado)', 'approximate age (birth not documented)')));
  if (x.writer) extra.push(t(l('compositor(a) parceiro(a)', 'songwriting partner')));
  return line(x.k, extra);
});

ACT_HEAD_EXTRAS.push((s, a) => {
  const x = actSrc27(s, a);
  if (x.k === 'sim') return null;
  return line(x.k, x.ap.map((f) => `${t(AP[f] ?? l(f, f))} ${t(l('aproximada', 'approximate'))}`));
});
