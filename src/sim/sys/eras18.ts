// Rodada 18 (econ18, ponto 12): eras que coexistem e futuro especulativo.
// • Adoção desigual: cada mercado chega ao digital com atraso próprio (América do Norte primeiro; Europa e Ásia +1 ano;
//   Brasil e América Latina +3; África +5), e o público de cada gênero também (jazz, sacro e folk mais velhos ficam
//   no físico e no rádio; hip-hop e eletrônica chegam antes). A fatia física de um lançamento é a média dos seus mercados.
// • 2027–2040: cenários ESPECULATIVOS com caminhos alternativos sorteados por partida (vozes sintéticas reguladas,
//   soltas ou licenciadas coletivamente; interface neural de massa, de nicho ou que nunca sai do laboratório; palco
//   presencial valorizado ou virtual). Só aparecem na tela quando o ano chega, com o rótulo "especulativo".
import { Rng, seedState } from '../../core/rng';
import { l, type L, type FamilyId, type MarketId, MARKETS, familyOf } from '../../data/world';
import { registerMod, registerSimHook } from '../ext4';
import { physicalShare } from '../production';
import type { GameState, Release } from '../types';
import { fmtL, money, notify, post, remember } from '../util';
import { mkWeights18 } from './econ18';

/** atraso de adoção do digital por mercado (anos) */
export const MK_LAG18: Record<MarketId, number> = { na: 0, eu: 1, oceania: 1, asia: 1, br: 3, latam: 3, africa: 5 };
/** atraso pelo perfil de idade do público do gênero (anos; negativo = adota antes) */
export const AGE_LAG18: Partial<Record<FamilyId, number>> = { blues_jazz: 4, sacred: 4, country_folk: 3, europe: 2, brazil: 1, rock: 1, latin: 1, africa: 1, hiphop: -1, electronic: -1 };

/** fatia física num mercado para um público (ano deslocado pelo atraso; antes do digital é igual em todo lugar) */
export function physIn18(s: GameState, mk: MarketId, fam?: FamilyId): number {
  const lag = MK_LAG18[mk] + (fam ? AGE_LAG18[fam] ?? 0 : 0);
  return physicalShare(s, s.year - lag);
}
/** fatia física de um lançamento: média ponderada dos seus mercados, pelo público do gênero */
export function physShareRel18(s: GameState, rel: Release): number {
  const fam = familyOf(s.acts[rel.actId]?.genre ?? '');
  let t = 0;
  for (const [mk, w] of mkWeights18(s, rel)) t += w * physIn18(s, mk as MarketId, fam);
  return Math.min(0.95, Math.max(0.02, t));
}

/** Leitura para a tela: por mercado, quanto o público jovem e o mais velho ainda ouvem em físico/rádio × digital. */
export function adoptionTable18(s: GameState): { mk: MarketId; name: L; young: number; old: number; stream: number }[] {
  const st = s.techDates.streaming;
  return MARKETS.map((m) => {
    const young = physIn18(s, m.id, 'hiphop'), old = physIn18(s, m.id, 'blues_jazz');
    const lag = MK_LAG18[m.id];
    const stream = st === undefined || s.year < st + lag ? 0 : Math.min(0.9, (s.year - st - lag + 1) * 0.12);
    return { mk: m.id, name: m.name, young, old, stream };
  });
}

// ---------------------------------------------------------------- futuro especulativo

export interface Spec18 { voices: 'regulated' | 'wild' | 'collective'; neural: 'mass' | 'niche' | 'never'; live: 'presence' | 'virtual'; shown: string[] }
export const SPEC18_TXT: Record<string, { y: number; name: L; text: L }> = {
  'voices:regulated': { y: 2029, name: l('Vozes sintéticas regulamentadas', 'Synthetic voices regulated'), text: l('Lei exige consentimento e rótulo: a voz clonada chega mais tarde e rende menos, mas o "feito por humanos" vale mais.', 'Law requires consent and labelling: cloned voices arrive later and pay less, but "made by humans" is worth more.') },
  'voices:wild': { y: 2029, name: l('Vozes sintéticas sem regra', 'Synthetic voices unregulated'), text: l('Nenhuma lei pegou: enxurrada de faixas sintéticas dilui as paradas a partir de 2031; quem licencia vozes ganha mais.', 'No law stuck: a flood of synthetic tracks dilutes the charts from 2031; voice licensors earn more.') },
  'voices:collective': { y: 2029, name: l('Licença coletiva de treino', 'Collective training licence'), text: l('Sociedades arrecadadoras cobram das empresas de IA pelo treino: todo catálogo recebe uma parcela mensal.', 'Collection societies charge AI firms for training: every catalog gets a monthly share.') },
  'neural:mass': { y: 2034, name: l('Interface neural de massa', 'Mass-market neural interface'), text: l('A interface neural chega cedo e barata.', 'The neural interface arrives early and cheap.') },
  'neural:niche': { y: 2036, name: l('Interface neural de nicho', 'Niche neural interface'), text: l('A interface neural existe, mas cara e restrita.', 'The neural interface exists, but pricey and limited.') },
  'neural:never': { y: 2036, name: l('Interface neural fica no laboratório', 'Neural interface stays in the lab'), text: l('Reguladores e médicos barram a interface neural: ela não chega ao público.', 'Regulators and doctors block the neural interface: it never reaches the public.') },
  'live:presence': { y: 2028, name: l('Renascimento do palco presencial', 'Live presence renaissance'), text: l('Cansado de telas, o público paga mais por estar lá: receita de shows +10%.', 'Tired of screens, audiences pay more to be there: show revenue +10%.') },
  'live:virtual': { y: 2027, name: l('Palco virtual', 'Virtual stage'), text: l('Hologramas e shows virtuais chegam antes e tiram parte do público das casas (−5%).', 'Holograms and virtual shows arrive earlier and pull some audience from venues (−5%).') },
};

export function spec18(s: GameState): Spec18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  if (!x.spec18) {
    const r = new Rng(seedState(`spec18|${s.config.seed}`));
    x.spec18 = { voices: r.pick(['regulated', 'wild', 'collective'] as const), neural: r.pick(['mass', 'niche', 'never'] as const), live: r.pick(['presence', 'virtual'] as const), shown: [] } satisfies Spec18;
  }
  return x.spec18 as Spec18;
}
/** ramos já revelados (para a UI: nunca mostrar o futuro) */
export const specShown18 = (s: GameState): { key: string; y: number; name: L; text: L }[] => spec18(s).shown.map((k) => ({ key: k, ...SPEC18_TXT[k] }));

function applyDates(s: GameState): void {
  const sp = spec18(s);
  const td = s.techDates;
  if (td.synthetic_voice !== undefined && s.year < td.synthetic_voice) {
    if (sp.voices === 'regulated') td.synthetic_voice = Math.max(td.synthetic_voice, 2032);
    if (sp.voices === 'wild') td.synthetic_voice = Math.min(td.synthetic_voice, 2029);
  }
  if (td.neural !== undefined && s.year < td.neural) {
    if (sp.neural === 'mass') td.neural = 2034;
    if (sp.neural === 'niche') td.neural = Math.max(td.neural, 2037);
    if (sp.neural === 'never') delete td.neural;
  }
  if (td.hologram !== undefined && s.year < td.hologram && sp.live === 'virtual') td.hologram = Math.min(td.hologram, 2026);
}

registerSimHook('newgame', 'eras18', (s) => applyDates(s));
registerSimHook('month', 'eras18', (s) => {
  const sp = spec18(s);
  if (s.year >= 2025 && s.month === 0) applyDates(s);
  for (const key of [`voices:${sp.voices}`, `neural:${sp.neural}`, `live:${sp.live}`]) {
    const d = SPEC18_TXT[key];
    if (s.year >= d.y && !sp.shown.includes(key)) {
      sp.shown.push(key);
      remember(s, 'spec18', fmtL(l('[Especulativo] {n}: {t}', '[Speculative] {n}: {t}'), { n: d.name, t: d.text }), { important: true });
      notify(s, fmtL(l('Futuro especulativo: {n}.', 'Speculative future: {n}.'), { n: d.name }), 'event');
    }
  }
  // licença coletiva: cada master do catálogo rende uma parcela (receita de licenciamento, paga pela sociedade)
  if (sp.voices === 'collective' && s.year >= 2030) {
    let n = 0;
    for (const id in s.releases) if (s.releases[id].owner === 'player') n++;
    if (n) post(s, `spec18:col:${s.year}:${s.month}`, money(s, 25 * Math.min(400, n)), 'licensing', 'Licença coletiva de treino de IA');
  }
});

// enxurrada sintética: lançamentos humanos vendem menos depois de 2031; presença/virtual mexe nos shows
registerMod('chartUnits', 'spec18', (s, v, c) => {
  if (s.year < 2031 || spec18(s).voices !== 'wild' || !c.release) return null;
  return { value: v * 0.94, label: l('Enxurrada de faixas sintéticas (especulativo)', 'Flood of synthetic tracks (speculative)') };
});
registerMod('showRevenue', 'spec18', (s, v) => {
  const sp = spec18(s);
  if (sp.live === 'presence' && s.year >= 2028) return { value: v * 1.1, label: l('Renascimento do palco (especulativo)', 'Live renaissance (speculative)') };
  if (sp.live === 'virtual' && s.year >= 2027) return { value: v * 0.95, label: l('Palco virtual (especulativo)', 'Virtual stage (speculative)') };
  return null;
});
