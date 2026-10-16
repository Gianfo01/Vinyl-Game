// R31 · onda 5 (INI, EXP-9) — modelo puro da ficha de inscrição (Começo rápido) e da prévia "Sua história".
// A ficha guarda as escolhas da Nova run rápida de sempre (QuickRun27: cidade, carreira, ano, tamanho do começo,
// dificuldade, duração e o personagem QuickChar29 com a aparência) e mais três: traço de personalidade, "nomes reais" e
// "mundo segue a história real". A configuração sai do MESMO caminho da tela antiga — `quickRunConfig27` — e as três
// escolhas novas passam pelos MESMOS setters da configuração completa: traço = o clique do `traitPicker`, nomes reais =
// `setRealNames31` (cartão Mundo), história real = `applyWorld17` (rádio "Fidelidade histórica" / padrão).

import { l, type L } from '../../data/world';
import { applyWorld17, worldOf17 } from '../../sim/start17';
import type { RunConfig } from '../../sim/types';
import { endOf28, REC_YEARS28, pickStart28, yearsFor28 } from '../../sim/start28data';
import { SITS29, sit29ById, sitOfScenario29, start28Fits29, statusLabel29, type Sit29 } from '../../sim/start29data';
import { labelsTag29 } from '../../sim/labels29data';
import { playerTraitById } from '../../sim/sys/persona/data';
import { setRealNames31 } from '../newgame17';
import { quickRunConfig27, type QuickRun27 } from '../ps/home27model';

export interface QuickRun5 extends QuickRun27 {
  /** traço de personalidade opcional (um; ausente = nenhum) */
  trait5?: string;
  /** "Nomes reais (artistas, gravadoras, obras)"; ausente = o padrão do mundo */
  real5?: boolean;
  /** "Mundo segue a história real" (Fidelidade histórica); ausente = o padrão (reais em mundo aleatório) */
  hist5?: boolean;
}

/** Os 3 traços da ficha (um por atributo do dono: carisma, ouvido, negociação). Os outros ficam na completa. */
export const TRAITS5 = ['charismatic', 'visionary', 'greedy'] as const;
/** As 6 carreiras principais da ficha (os ícones de hoje); as outras ficam na configuração completa. */
export const PRIMARY5 = ['label', 'musician', 'manager', 'studio', 'festival', 'booking'] as const;
/** Tamanho do começo na ficha (iniciante → em crise); "hipster" e "top 5" ficam na configuração completa. */
export const SIZES5: Sit29[] = ['zero', 'emerging', 'mid', 'established', 'leader', 'fallen'];
export const SIZE_NAME5: Record<string, L> = {
  zero: l('Iniciante', 'Beginner'), emerging: l('Emergente', 'Emerging'), mid: l('Médio', 'Mid-size'), hipster: l('Hipster', 'Hipster'),
  established: l('Estabelecido', 'Established'), top5: l('Top 5', 'Top 5'), leader: l('Líder', 'Leader'), fallen: l('Em crise', 'In crisis'),
};
/** Duração: 25 anos (o recomendado), até 2040 ou sem fim. */
export type Dur5 = 'rec' | 'y2040' | 'none';
export const durOf5 = (q: Pick<QuickRun27, 'startYear' | 'runYears'>): Dur5 | null => {
  const y = q.runYears ?? REC_YEARS28;
  return y === 0 ? 'none' : y === REC_YEARS28 ? 'rec' : y === yearsFor28(q.startYear, 2040) ? 'y2040' : null;
};
export const yearsOfDur5 = (d: Dur5, start: number): number => d === 'none' ? 0 : d === 'rec' ? REC_YEARS28 : yearsFor28(start, 2040);

/** Régua das eras (marcos com nome; o ano pode ser qualquer um entre 1889 e 2040). */
export const ERAS5: { y: number; name: L; line: L }[] = [
  { y: 1889, name: l('cilindro', 'cylinder'), line: l('os cilindros de cera ainda são novidade e música se vende em partitura', 'wax cylinders are still new and music sells as sheet music') },
  { y: 1920, name: l('rádio', 'radio'), line: l('o rádio entra nas salas e o disco de 78 rotações vira negócio', 'radio enters living rooms and the 78 becomes a business') },
  { y: 1950, name: l('rock', 'rock'), line: l('o rock and roll explode e o vinil toma o lugar da goma-laca', 'rock and roll explodes and vinyl replaces shellac') },
  { y: 1962, name: l('beat', 'beat'), line: l('o beat está nascendo nos porões', 'beat music is being born in the basements') },
  { y: 1980, name: l('MTV', 'MTV'), line: l('o videoclipe manda e a fita cassete vai no bolso', 'the music video rules and the cassette goes in your pocket') },
  { y: 2000, name: l('internet', 'internet'), line: l('a internet derruba o CD e todo mundo baixa música', 'the internet topples the CD and everyone downloads') },
  { y: 2025, name: l('IA', 'AI'), line: l('o streaming é o mercado e a inteligência artificial bate à porta', 'streaming is the market and AI knocks on the door') },
];
export const eraOf5 = (year: number) => [...ERAS5].reverse().find((e) => year >= e.y) ?? ERAS5[0];

/** Rascunho da Nova run a partir da ficha (mesmo caminho e mesmos setters da tela antiga e da configuração completa). */
export function quickRun5Config(q: QuickRun5): RunConfig {
  const cfg = quickRunConfig27(q);
  applyExtras5(cfg, q);
  return cfg;
}

/** Aplica as três escolhas novas num rascunho (a ordem é a da ficha: mundo, depois nomes, depois traço). */
export function applyExtras5(cfg: RunConfig, q: Pick<QuickRun5, 'trait5' | 'real5' | 'hist5'>): void {
  if (q.hist5 !== undefined) { const want = q.hist5 ? 'exact' : 'random'; if (worldOf17(cfg) !== want) applyWorld17(cfg, want); }
  if (q.real5 !== undefined && q.real5 !== (cfg.showReal31 ?? !!cfg.realNames)) setRealNames31(cfg, q.real5);
  if (q.trait5 && playerTraitById[q.trait5]) {
    const ch = cfg.character!;
    const cur = ch.traits ?? [];
    if (!cur.includes(q.trait5)) ch.traits = [...cur, q.trait5]; // o clique do traitPicker
  }
}

/** Estado mostrado nos interruptores (lê o rascunho: vale também vindo da configuração completa). */
export const realOn5 = (cfg: RunConfig): boolean => cfg.showReal31 ?? !!cfg.realNames;
export const histOn5 = (cfg: RunConfig): boolean => worldOf17(cfg) === 'exact';

// ---------------------------------------------------------------- prévia "Sua história" (só leitura)

const NOUN5: Record<string, L> = {
  label: l('dono de selo', 'label owner'), musician: l('artista', 'artist'), manager: l('empresário', 'manager'), studio: l('produtor', 'producer'),
  festival: l('dono de festival', 'festival owner'), booking: l('agente de shows', 'booking agent'), venue: l('dono de casa de shows', 'venue owner'),
  publisher: l('editor musical', 'music publisher'), media: l('dono de mídia', 'media owner'), platform: l('dono de plataforma', 'platform owner'),
};
const ATTR5: Record<string, L> = { charisma: l('carisma alto', 'high charisma'), ear: l('ouvido bom', 'good ear'), negotiation: l('negocia bem', 'strong negotiator'), management: l('organizado', 'organized') };

export interface Story5 {
  name: string;
  /** "dono de selo · 28 anos · Londres" */
  who: L;
  /** traços em palavras ("carisma alto · ouvido bom") */
  traits: L | null;
  year: number;
  city: string;
  /** frase da época e do começo: "o beat está nascendo nos porões. Você abre um …" */
  era: L;
  start: L;
  startFx: L;
  /** "25 anos de jogo · fim em 1986 com a sua história e pontuação" */
  length: L;
  tags: L[];
  rolled: L | null;
}

/** Resumo legível do rascunho (não muda nada no rascunho nem no jogo). */
export function story5(cfg: RunConfig, cityName: (id: string) => string): Story5 {
  const career = cfg.careers?.main?.[0] ?? 'label';
  const ch = cfg.character;
  const sit: Sit29 = (cfg.start29 as Sit29 | undefined) ?? sitOfScenario29(cfg.scenario);
  const d = sit29ById(sit) ?? SITS29[0];
  const age = ch?.age ?? 30;
  const city = cityName(cfg.homeCity);
  const noun = NOUN5[career] ?? NOUN5.label;
  const tr = (ch?.traits ?? []).map((id) => playerTraitById[id]).filter(Boolean);
  const words = tr.map((x) => { const a = Object.entries(x.attrs ?? {}).sort((p, q) => (q[1] as number) - (p[1] as number))[0]; return a && (a[1] as number) > 0 && ATTR5[a[0]] ? ATTR5[a[0]] : x.name; });
  const years = cfg.runYears17 ?? REC_YEARS28;
  const end = endOf28(cfg.startYear, years);
  const st = statusLabel29(career, sit);
  const tags: L[] = [
    realOn5(cfg) ? l('Nomes reais', 'Real names') : l('Nomes inventados', 'Invented names'),
    histOn5(cfg) ? l('Mundo da história real', 'Real-history world') : worldOf17(cfg) === 'random' ? l('Mundo aleatório', 'Random world') : worldOf17(cfg) === 'fiction' ? l('Universo ficcional', 'Fictional universe') : l('História alternativa', 'Alternate history'),
    cfg.difficulty === 'easy' ? l('Tranquila', 'Relaxed') : cfg.difficulty === 'hard' ? l('Dura', 'Hard') : l('Equilibrada', 'Balanced'),
  ];
  const lt = labelsTag29(cfg);
  if (lt.pt.replace(/^\s*·\s*/, '')) tags.push(l(lt.pt.replace(/^\s*·\s*/, ''), lt.en.replace(/^\s*·\s*/, '')));
  if (cfg.ironman) tags.push(l('Ironman', 'Ironman'));
  const r28 = cfg.scenario17 ? null : pickStart28(cfg.seed);
  return {
    name: ch?.name || '',
    who: l(`${noun.pt} · ${age} anos · ${city}`, `${noun.en} · ${age} · ${city}`),
    traits: words.length ? l(words.map((w) => w.pt).join(' · '), words.map((w) => w.en).join(' · ')) : null,
    year: cfg.startYear,
    city,
    era: eraOf5(cfg.startYear).line,
    start: l(st.pt.toLowerCase(), st.en.toLowerCase()),
    startFx: d.fx,
    length: end === null ? l('Sem fim: jogue quanto quiser', 'No end: play as long as you like')
      : l(`${years} anos de jogo · fim em ${end} com a sua história e pontuação`, `${years} years of play · ends in ${end} with your story and score`),
    tags,
    rolled: r28 && start28Fits29(r28.id, sit) ? r28.name : null,
  };
}
