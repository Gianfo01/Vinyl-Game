// Rodada 16 — momento → cena (função pura, testável): que quadro de scenes14 desenhar para cada
// acontecimento, com o local certo (bar, clube, teatro, arena, estádio, festival; TV, rádio ou coletiva
// conforme a época; cerimônia certa do prêmio; estúdio; fábrica ou loja; escritório do contrato).

import { l, type L } from '../../data/world';
import type { Moment16 } from '../../sim/sys/moments16';
import type { PlaceKind } from '../../sim/sys/scenes/state';
import type { Scene14, SceneOpts14 } from './spec14';

export interface MomentSpec16 { scene: Scene14; opts: SceneOpts14; place: PlaceKind | null; title: L }

const VENUE: PlaceKind[] = ['venue_bar', 'venue_club', 'venue_theatre', 'venue_arena', 'venue_stadium'];
const VENUE_T: L[] = [l('Bar com palquinho', 'Bar with a tiny stage'), l('Clube de shows', 'Music club'), l('Teatro', 'Theatre'), l('Arena', 'Arena'), l('Estádio', 'Stadium')];

/** Porte que já existe no ano (estádio de show só depois de 1965, arena depois de 1950). */
export function eraTier16(tier: number, year: number): number {
  let t = Math.max(0, Math.min(4, Math.round(tier)));
  if (t === 4 && year < 1965) t = 3;
  if (t === 3 && year < 1950) t = 2;
  return t;
}

function pressPlace(medium: string, y: number): { place: PlaceKind | null; title: L } {
  const radio = (): { place: PlaceKind; title: L } => y < 1960 ? { place: 'radio_am', title: l('Estúdio de rádio AM', 'AM radio studio') } : y < 2012 ? { place: 'radio_fm', title: l('Estúdio de rádio FM', 'FM radio studio') } : { place: 'podcast', title: l('Estúdio de podcast', 'Podcast studio') };
  if (medium === 'radio') return radio();
  if (medium === 'magazine') return { place: null, title: l('Sessão de fotos da capa', 'Cover photo shoot') };
  if (medium === 'tv') {
    if (y < 1950) return radio();
    if (y < 1962) return { place: 'tv_variety', title: l('Programa de TV preto e branco', 'Black-and-white TV show') };
    if (y < 1981) return { place: 'tv_auditorium', title: l('Programa de auditório', 'Studio-audience show') };
    if (y < 2000) return { place: 'tv_clips', title: l('Canal de clipes', 'Music video channel') };
    if (y < 2020) return { place: 'tv_talk', title: l('Talk show', 'Talk show') };
    return { place: 'livestream', title: l('Live com milhões assistindo', 'Livestream with millions watching') };
  }
  // entrevista
  if (y < 1950) return radio();
  if (y < 1990) return { place: null, title: l('Coletiva de imprensa', 'Press conference') };
  if (y < 2012) return { place: 'tv_talk', title: l('Entrevista na TV', 'TV interview') };
  return { place: 'podcast', title: l('Entrevista em podcast', 'Podcast interview') };
}

const AWARD: Record<string, { place: PlaceKind; v: number; title: L }> = {
  major: { place: 'awards', v: 0, title: l('Gramófonos de Ouro', 'Golden Gramophones') },
  regional: { place: 'awards', v: 1, title: l('Prêmio regional', 'Regional award') },
  national: { place: 'awards', v: 2, title: l('Prêmio nacional', 'National award') },
  hall: { place: 'awards', v: 3, title: l('Hall dos Ecos', 'Hall of Echoes') },
  special: { place: 'awards', v: 1, title: l('Prêmio especial', 'Special award') },
  contest: { place: 'venue_bar', v: 0, title: l('Concurso de bandas', 'Battle of the bands') },
};

/** Cena de cada momento (local pelo tipo e pela época). */
export function momentSpec16(m: Moment16): MomentSpec16 {
  const year = m.year;
  const mk = (scene: Scene14, place: PlaceKind | null, title: L, extra: Partial<SceneOpts14> = {}): MomentSpec16 =>
    ({ scene, place, title, opts: { year, ...(place ? { place } : {}), title, ...extra } });
  switch (m.k) {
    case 'show': {
      if (m.fest) return mk('venue', 'venue_festival', l('Palco de festival', 'Festival stage'), { attendance: m.att, capacity: m.cap, cityId: m.city });
      const t = eraTier16(m.tier, year);
      const place: PlaceKind = t === 3 && year < 1975 ? 'venue_gym' : VENUE[t];
      return mk('venue', place, VENUE_T[t], { attendance: m.att, capacity: m.cap, cityId: m.city });
    }
    case 'press': {
      const p = pressPlace(m.medium, year);
      return mk(p.place ? 'media' : 'press', p.place, p.title);
    }
    case 'award': {
      if (m.award === 'festival') {
        const tv = year >= 1960 && year < 2000;
        return mk('awards', tv ? 'tv_auditorium' : 'venue_festival', tv ? l('Final do festival da canção na TV', 'TV song festival final') : l('Troféu no palco do festival', 'Trophy on the festival stage'));
      }
      const a = AWARD[m.award] ?? AWARD.major;
      return mk('awards', a.place, a.title, { variant: a.v });
    }
    case 'record': return mk('studio_live', null, l('Fim de sessão no estúdio', 'Studio session wraps'));
    case 'release': return year < 1990 ? mk('pressing', 'factory', l('Primeira tiragem saindo da prensa', 'First run coming off the press')) : mk('store', 'store', l('Dia de lançamento na loja', 'Release day at the store'));
    case 'contract': return mk('press', 'boardroom', m.renewal ? l('Renovação de contrato', 'Contract renewal') : l('Assinatura do contrato', 'Contract signing'), {
      gear: year < 1980 ? l('Contrato datilografado, caneta-tinteiro e aperto de mão', 'Typed contract, fountain pen and a handshake') : year < 2005 ? l('Advogados, fax e uma pilha de vias', 'Lawyers, a fax and a stack of copies') : l('Assinatura digital e advogados na chamada de vídeo', 'Digital signature and lawyers on a video call'),
    });
  }
}
