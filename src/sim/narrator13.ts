// Rodada 13 — narradores com voz. Cada narrador tem um ritmo (quantos eventos, ondas de tensão, peso de
// crises e de boas notícias, se alivia quando o caixa aperta) e uma voz que reescreve o texto das notícias
// e das decisões do mês. Os três originais (Maestro, Brisa, Acaso) mantêm o texto neutro.
// A voz é determinística (hash do evento + semana): não consome o gerador da partida.

import { l, type L } from '../data/world';
import type { GameState, StorytellerId } from './types';

export interface NarratorPace {
  /** eventos por mês (média) */
  freq: number;
  /** período da onda de tensão em meses (sem onda: alvo fixo 0,35) */
  wave?: number;
  /** multiplicador fixo para crises (substitui a leitura da tensão) */
  flatBad?: number;
  /** multiplicadores extras sobre crises e boas notícias */
  bad: number;
  good: number;
  /** alivia crises e puxa boas notícias quando o caixa aperta */
  mercy: boolean;
  /** sorteio puro, sem curva */
  random?: boolean;
}

export const PACES: Record<StorytellerId, NarratorPace> = {
  maestro: { freq: 1.35, wave: 14, bad: 1, good: 1, mercy: true },
  brisa: { freq: 0.7, flatBad: 0.45, bad: 1, good: 1, mercy: true },
  acaso: { freq: 1.2, bad: 1, good: 1, mercy: true, random: true },
  cronista: { freq: 1.0, wave: 30, bad: 1, good: 1, mercy: true },
  tabloide: { freq: 1.55, bad: 1.5, good: 0.9, mercy: true },
  poeta: { freq: 0.9, bad: 0.7, good: 1.3, mercy: true },
  cinico: { freq: 1.2, bad: 1.25, good: 0.85, mercy: false },
  locutor: { freq: 1.3, wave: 8, bad: 1, good: 1.15, mercy: true },
};
export const narratorPace = (id: string): NarratorPace => PACES[id as StorytellerId] ?? PACES.maestro;

type Tone = 'good' | 'bad' | 'neutral';
interface Voice { pre?: Partial<Record<Tone | 'any', L[]>>; post?: Partial<Record<Tone | 'any', L[]>> }

const MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const VOICES: Partial<Record<StorytellerId, Voice>> = {
  tabloide: {
    pre: {
      bad: [l('BOMBA! ', 'SHOCKER! '), l('ESCÂNDALO: ', 'SCANDAL: '), l('VOCÊ NÃO VAI ACREDITAR: ', 'YOU WON\'T BELIEVE IT: ')],
      good: [l('EXCLUSIVO: ', 'EXCLUSIVE: '), l('FURO: ', 'SCOOP: ')],
      neutral: [l('BASTIDORES: ', 'BEHIND THE SCENES: '), l('FOFOCA QUENTE: ', 'HOT GOSSIP: ')],
    },
    post: { bad: [l(' Fontes dizem que é só o começo.', ' Sources say this is just the beginning.')], good: [l(' Os invejosos já estão falando.', ' The haters are already talking.')] },
  },
  poeta: {
    post: {
      good: [l(' — e por um instante tudo soa afinado.', ' — and for a moment everything is in tune.'), l(' — a manhã tem gosto de refrão.', ' — the morning tastes like a chorus.')],
      bad: [l(' — a canção continua, mesmo em tom menor.', ' — the song goes on, even in a minor key.'), l(' — há silêncios que também são música.', ' — some silences are music too.')],
      neutral: [l(' — e a agulha segue no sulco.', ' — and the needle keeps to the groove.'), l(' — o disco gira, o mundo também.', ' — the record spins, and so does the world.')],
    },
  },
  cinico: {
    post: {
      good: [l(' Aproveite, que não dura.', ' Enjoy it, it won\'t last.'), l(' Até relógio parado acerta duas vezes por dia.', ' Even a stopped clock is right twice a day.')],
      bad: [l(' Já vi esse filme. Termina mal.', ' Seen this movie. It ends badly.'), l(' Bem-vindo à indústria.', ' Welcome to the industry.')],
      neutral: [l(' Nada de novo sob os holofotes.', ' Nothing new under the spotlights.'), l(' Mais um dia, mais um contrato.', ' Another day, another contract.')],
    },
  },
  locutor: {
    pre: { any: [l('Alô, ouvintes! ', 'Hello, listeners! '), l('No ar, direto da redação: ', 'On air, straight from the newsroom: ')] },
    post: { good: [l(' Aumenta o volume!', ' Turn it up!')], bad: [l(' Segura a onda, voltamos já.', ' Hang in there, back after the break.')], neutral: [l(' Fique na sintonia.', ' Stay tuned.')] },
  },
};

function hash(str: string): number {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0;
  return x;
}

/** Reescreve uma notícia/decisão no tom do narrador escolhido (texto neutro para os três originais). */
export function narrate(s: GameState, text: L, tone: Tone, key: string): L {
  const id = s.config.storyteller;
  if (id === 'cronista') {
    const m = ((s.month % 12) + 12) % 12;
    return { pt: `Crônica de ${MONTHS_PT[m]} de ${s.year}: ${text.pt}`, en: `Chronicle, ${MONTHS_EN[m]} ${s.year}: ${text.en}` };
  }
  const v = VOICES[id];
  if (!v) return text;
  const h = hash(`${key}:${s.week}`);
  const pick = (xs?: Partial<Record<Tone | 'any', L[]>>, salt = 0) => { const a = xs?.[tone] ?? xs?.any; return a?.length ? a[(h + salt) % a.length] : undefined; };
  const pre = pick(v.pre);
  const post = pick(v.post, 7);
  return { pt: `${pre?.pt ?? ''}${text.pt}${post?.pt ?? ''}`, en: `${pre?.en ?? ''}${text.en}${post?.en ?? ''}` };
}
