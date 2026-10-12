// Rodada 20c (N1): "Passado profissional" = trajetória (como você entrou na indústria: ficha do personagem,
// identity/data ORIGINS + base de life/data) + origem (o que você fazia antes do negócio: careers12 ORIGINS).
// São duas variáveis diferentes do motor e as duas continuam valendo exatamente como antes; aqui só se SOMA
// o que cada uma dá para mostrar cada bônus uma vez (com as parcelas). Nada aqui muda a matemática do jogo.

import { l, type L } from '../data/world';
import { SKILLS, type SkillId } from '../data/people';
import type { CharacterSpec, RunConfig } from './types';
import type { PerkValues } from './perks';
import { backgroundById, type BackgroundId } from './sys/life/data';
import { originById, type OriginId } from './sys/identity/data';
import { careerOfSpec } from './sys/persona';
import { ORIGIN_FX, ORIGINS as CAREER_ORIGINS, type Origin } from './sys/careers12';

export type OwnerAttr20 = 'ear' | 'negotiation' | 'charisma' | 'management';

/** Padrão da ficha (o mesmo que a ficha do personagem sempre usou ao nascer o rascunho). */
export const defaultCharacter20 = (): CharacterSpec => ({ name: '', age: 30, background: 'musician', career: 'musician', role: 'guitar', traits: [], style: 'mentor', visual: 'casual', pronoun: 'they', points: {}, sex: 'x', skills: [] });
export const defaultCareers20 = (): NonNullable<RunConfig['careers']> => ({ main: ['label'], origin: 'none', ambition: 'legacy' });

/** Trajetória escolhida: mesma mutação que a ficha fazia (trajetória → base → instrumento). */
export function setTrajectory20(ch: CharacterSpec, id: OriginId): void {
  const o = originById[id];
  if (!o) return;
  ch.career = o.id;
  ch.background = o.bg;
  ch.role = backgroundById[o.bg].role;
}

/**
 * Espelho dos efeitos das trajetórias antigas que vivem em código (identity.ts: applyOrigin e a fonte de perks
 * 'identity'). O teste r20c-n1 confere os perks contra o motor.
 */
export const TRAJ_CODE20: Partial<Record<OriginId, { attrs?: Partial<Record<OwnerAttr20, number>>; rep?: number; perks?: PerkValues; local?: PerkValues }>> = {
  exMusician: { attrs: { negotiation: -6 }, rep: -4, perks: { trust: 4, advance: 0.05 } },
  radio: { perks: { signals: 1, critics: -0.2 } },
  promoter: { attrs: { ear: -6 } },
  journalist: { perks: { critics: 0.4, scoutAccuracy: 0.08 } },
  recordStore: { attrs: { charisma: -5 } },
  majorExec: { attrs: { negotiation: 6 }, perks: { advance: -0.06 } },
  sceneOrganizer: { attrs: { management: -5 }, rep: -5, perks: { signals: 1 }, local: { trust: 6 } },
};

export interface Part20 { src: 'base' | 'traj' | 'origin'; v: number }
export interface Line20 { key: string; name?: L; total: number; parts: Part20[] }
export interface Past20 {
  traj: OriginId;
  origin: Origin;
  bg: BackgroundId;
  attrs: Line20[];
  skills: Line20[];
  /** perks que valem sempre (somados por chave; cada chave aparece uma vez) */
  perks: Line20[];
  /** perks condicionais (só alguns atos): ficam à parte, com a condição */
  conditional: { src: 'base' | 'traj'; values: PerkValues; when: L }[];
  /** dólares reais (convertidos para o ano na interface) */
  wealth: { base: number; origin: number };
  cash: Line20;
  rep: Line20[];
  debt?: { months: number; real: number };
}

export const SRC20: Record<Part20['src'], L> = {
  base: l('base da trajetória', 'path base'),
  traj: l('trajetória', 'path'),
  origin: l('origem', 'origin'),
};

function acc(): { add: (key: string, src: Part20['src'], v: number | undefined) => void; lines: (order?: string[]) => Line20[] } {
  const m = new Map<string, Line20>();
  return {
    add: (key, src, v) => {
      if (!v) return;
      const x = m.get(key) ?? { key, total: 0, parts: [] };
      x.total = Math.round((x.total + v) * 1000) / 1000;
      x.parts.push({ src, v });
      m.set(key, x);
    },
    lines: (order) => [...m.values()].sort((a, b) => (order ? order.indexOf(a.key) - order.indexOf(b.key) : 0)),
  };
}

/** Soma do passado profissional para uma configuração (o que o motor aplica no começo). */
export function pastOf20(cfg: RunConfig): Past20 {
  const ch = cfg.character ?? defaultCharacter20();
  const traj = careerOfSpec(ch);
  const T = originById[traj];
  const bgId = (backgroundById[ch.background as BackgroundId] ? ch.background : T.bg) as BackgroundId;
  const B = backgroundById[bgId];
  const origin = ((cfg.careers?.origin && cfg.careers.origin in CAREER_ORIGINS) ? cfg.careers.origin : 'musician') as Origin;
  const O = ORIGIN_FX[origin] ?? {};
  const C = TRAJ_CODE20[traj] ?? {};
  const at = acc(), sk = acc(), pk = acc(), rp = acc(), cs = acc();
  const each = <K extends string>(o: Partial<Record<K, number>> | undefined, src: Part20['src'], to: ReturnType<typeof acc>) => { for (const [k, v] of Object.entries(o ?? {})) to.add(k, src, v as number); };
  each(B.owner, 'base', at); each(T.attrs, 'traj', at); each(C.attrs, 'traj', at); each(O.attrs, 'origin', at);
  each(B.skills, 'base', sk); each(T.skills, 'traj', sk); each(O.skills, 'origin', sk);
  each(B.perks, 'base', pk); each(T.perks, 'traj', pk); each(C.perks, 'traj', pk); each(O.perks, 'origin', pk);
  rp.add('institutional', 'traj', (T.rep ?? 0) + (C.rep ?? 0)); rp.add('institutional', 'origin', O.rep);
  rp.add('artists', 'origin', O.artists);
  cs.add('cash', 'base', B.startCash); cs.add('cash', 'origin', O.cash);
  const conditional: Past20['conditional'] = [];
  const fam = l('só atos destas famílias: {f}', 'only acts of these families: {f}');
  const famL = (ids: string[]): L => ({ pt: fam.pt.replace('{f}', ids.join(', ')), en: fam.en.replace('{f}', ids.join(', ')) });
  if (B.families) conditional.push({ src: 'base', values: B.families.perks, when: famL(B.families.ids) });
  if (T.families) conditional.push({ src: 'traj', values: T.families.perks, when: famL(T.families.ids) });
  if (C.local) conditional.push({ src: 'traj', values: C.local, when: l('só atos da sua cidade', 'only acts from your city') });
  const ATTR_ORDER = ['ear', 'negotiation', 'charisma', 'management'];
  const SK_ORDER = SKILLS.map((x) => x.id as string);
  return {
    traj, origin, bg: bgId,
    attrs: at.lines(ATTR_ORDER),
    skills: sk.lines(SK_ORDER).map((x) => ({ ...x, name: SKILLS.find((s) => s.id === (x.key as SkillId))?.name })),
    perks: pk.lines(),
    conditional,
    wealth: { base: B.wealth, origin: O.wealth ?? 0 },
    cash: cs.lines()[0] ?? { key: 'cash', total: 0, parts: [] },
    rep: rp.lines(['institutional', 'artists']),
    debt: T.debt ? { months: T.debt.months, real: T.debt.real } : undefined,
  };
}
