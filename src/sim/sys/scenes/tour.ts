// Vinhetas de turnê: bastidores, ônibus, hotel e aeroporto (visto negado). Disparadas pelos
// ganchos 'show' e 'day' com baixa frequência; cada uma tem uma pequena escolha.
// O efeito básico acontece na hora (ex.: a multa do quarto destruído); a escolha só ajusta.

import type { Rng } from '../../../core/rng';
import { cityById, l, type L } from '../../../data/world';
import type { HookArgs } from '../../ext4';
import type { Act, GameState } from '../../types';
import { fmtL, money, post, remember } from '../../util';
import { clampN, cooled, findScene, markSeen, patchScene, queueScene, sc, setCool, wasSeen, type PlaceKind } from './state';

export type VignetteKind = 'backstage' | 'bus' | 'hotel' | 'airport';

export interface VignetteOption {
  id: string;
  label: L;
  hint: L;
}

const OPTIONS: Record<VignetteKind, VignetteOption[]> = {
  backstage: [
    { id: 'grant', label: l('Atender o pedido', 'Grant the request'), hint: l('Custa um pouco; o humor sobe.', 'Costs a little; morale goes up.') },
    { id: 'refuse', label: l('Recusar com firmeza', 'Firmly refuse'), hint: l('Economiza; a confiança cai.', 'Saves money; trust drops.') },
    { id: 'joke', label: l('Transformar em piada no palco', 'Turn it into an on-stage joke'), hint: l('O público adora; o artista nem tanto.', 'The crowd loves it; the artist less so.') },
  ],
  bus: [
    { id: 'rest', label: l('Parar um dia para descansar', 'Stop a day to rest'), hint: l('Menos cansaço, menos momento.', 'Less fatigue, less momentum.') },
    { id: 'push', label: l('Seguir viagem direto', 'Drive straight on'), hint: l('Mais momento, mais cansaço.', 'More momentum, more fatigue.') },
    { id: 'jam', label: l('Jam no fundo do ônibus', 'Jam at the back of the bus'), hint: l('Inspiração para a banda.', 'Inspiration for the band.') },
  ],
  hotel: [
    { id: 'pay', label: l('Pagar a multa e abafar', 'Pay the fine and hush it up'), hint: l('Nada vaza.', 'Nothing leaks.') },
    { id: 'charge', label: l('Descontar do artista', 'Charge the artist'), hint: l('Recupera metade; a confiança cai.', 'Recover half; trust drops.') },
    { id: 'legend', label: l('Deixar virar lenda', 'Let it become legend'), hint: l('Fama de rebelde; imagem pública cai.', 'Rebel cred; public image drops.') },
  ],
  airport: [
    { id: 'statement', label: l('Nota à imprensa local', 'Statement to the local press'), hint: l('Fãs da cidade ficam do seu lado.', 'Local fans side with you.') },
    { id: 'video', label: l('Gravar um recado para os fãs', 'Record a message for the fans'), hint: l('Mais fãs fiéis.', 'More core fans.') },
    { id: 'home', label: l('Voltar e descansar', 'Fly home and rest'), hint: l('Menos cansaço.', 'Less fatigue.') },
  ],
};

export function vignetteOptions(kind: VignetteKind): VignetteOption[] {
  return OPTIONS[kind];
}

const PLACE: Record<VignetteKind, PlaceKind> = { backstage: 'backstage', bus: 'tour_bus', hotel: 'hotel', airport: 'airport' };

const RIDERS: L[] = [
  l('só M&Ms azuis no camarim', 'only blue M&Ms in the dressing room'),
  l('um aquário com peixes dourados', 'a fish tank with goldfish'),
  l('doze toalhas brancas passadas', 'twelve ironed white towels'),
  l('um piano de cauda no camarim', 'a grand piano in the dressing room'),
  l('incenso de sândalo e um tapete persa', 'sandalwood incense and a Persian rug'),
];

function isMine(act: Act | undefined): act is Act {
  return !!act && (act.owner === 'player' || !!act.playerBand);
}

function queueVignette(s: GameState, kind: VignetteKind, act: Act, cityId: string, extra: Record<string, unknown> = {}, minor = true): void {
  const city = cityById[cityId]?.name ?? l(cityId);
  const titles: Record<VignetteKind, L> = {
    backstage: l('Camarim', 'Dressing room'),
    bus: l('Na estrada', 'On the road'),
    hotel: l('Hotel', 'Hotel'),
    airport: l('Aeroporto', 'Airport'),
  };
  queueScene(s, 'vignette', PLACE[kind], {
    title: fmtL(l('{t} — {a} em {c}', '{t} — {a} in {c}'), { t: titles[kind], a: act.name, c: city }),
    vkind: kind, actId: act.id, cityId, city, ...extra,
  }, { minor });
  sc(s).stats.vignettes += 1;
}

/** Gancho 'show': às vezes uma vinheta (no máximo uma a cada 6 semanas). */
export function vignetteOnShow(s: GameState, r: Rng, show: HookArgs['show']): void {
  const act = s.acts[show.actId];
  if (!isMine(act) || !cooled(s, 'vignette', 6) || !r.chance(0.06)) return;
  setCool(s, 'vignette');
  const kind = r.pick(['backstage', 'bus', 'hotel'] as VignetteKind[]);
  if (kind === 'hotel') {
    const fine = money(s, 1500 + act.fame * 60);
    post(s, `hotelfine:${show.tourId}:${show.cityId}`, -fine, 'touring', 'Multa de hotel (quarto destruído)');
    queueVignette(s, 'hotel', act, show.cityId, { fine, text: l('O quarto 512 amanheceu sem a TV, com a TV na piscina. O hotel manda a conta.', 'Room 512 woke up without its TV — the TV is in the pool. The hotel sends the bill.') });
  } else if (kind === 'backstage') {
    queueVignette(s, 'backstage', act, show.cityId, { rider: r.pick(RIDERS), text: l('Antes de subir ao palco, o pedido do camarim chega com exigências.', 'Before the show, the rider arrives with demands.') });
  } else {
    queueVignette(s, 'bus', act, show.cityId, { text: l('Doze horas de estrada até a próxima cidade. A banda está exausta.', 'Twelve hours of road to the next city. The band is exhausted.') });
  }
}

/** Gancho 'day': visto negado vira cena no aeroporto. */
export function airportDay(s: GameState): void {
  for (const t of s.tours) {
    if (t.status !== 'running' && t.status !== 'done') continue;
    const act = s.acts[t.actId];
    if (!isMine(act)) continue;
    for (const st of t.stops) {
      if (st.status !== 'cancelled' || !st.visa || !st.note || st.note.en !== 'visa denied') continue;
      const key = `visa:${t.id}:${st.cityId}`;
      if (wasSeen(s, key)) continue;
      markSeen(s, key);
      queueVignette(s, 'airport', act, st.cityId, { text: l('No balcão da imigração, o carimbo vermelho: visto negado. O show foi cancelado.', 'At the immigration desk, the red stamp: visa denied. The show is cancelled.') }, false);
    }
  }
}

export function resolveVignette(s: GameState, r: Rng, csId: string, opt: string): L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'vignette') return l('Cena não encontrada.', 'Scene not found.');
  if (cs.data.done) return cs.data.result as L;
  const act = s.acts[String(cs.data.actId)];
  const kind = cs.data.vkind as VignetteKind;
  const members = act ? act.members.map((id) => s.persons[id]).filter((p) => p?.alive) : [];
  const each = (f: (p: (typeof members)[number]) => void) => members.forEach((p) => p && f(p));
  let result: L = l('Seguimos.', 'Moving on.');
  if (act) {
    if (kind === 'backstage') {
      if (opt === 'grant') {
        post(s, `rider:${csId}`, -money(s, 400), 'touring', 'Pedido de camarim');
        each((p) => (p.morale = clampN(p.morale + 6, 0, 100)));
        result = l('O pedido é atendido. O show sai inspirado.', 'The request is granted. The show is inspired.');
      } else if (opt === 'refuse') {
        act.trust = clampN(act.trust - 4, 0, 100);
        result = l('Recusado. O clima no camarim fica pesado.', 'Refused. The mood backstage turns sour.');
      } else {
        act.momentum = clampN(act.momentum + 4, 0, 100);
        each((p) => (p.morale = clampN(p.morale - 2, 0, 100)));
        result = l('A piada vira assunto na cidade. O artista ri amarelo.', 'The joke is the talk of the town. The artist forces a smile.');
      }
    } else if (kind === 'bus') {
      if (opt === 'rest') {
        each((p) => (p.fatigue = clampN(p.fatigue - 12, 0, 100)));
        act.momentum = clampN(act.momentum - 2, 0, 100);
        result = l('Um dia num posto de beira de estrada. Todos dormem.', 'A day at a roadside stop. Everyone sleeps.');
      } else if (opt === 'push') {
        each((p) => (p.fatigue = clampN(p.fatigue + 8, 0, 100)));
        act.momentum = clampN(act.momentum + 5, 0, 100);
        result = l('Chegam a tempo de uma rádio local. Cansados, mas em alta.', 'They arrive in time for a local radio spot. Tired, but on a roll.');
      } else {
        each((p) => (p.inspiration = clampN(p.inspiration + 8, 0, 100)));
        result = l('Do fundo do ônibus sai um riff novo.', 'A new riff comes out of the back of the bus.');
      }
    } else if (kind === 'hotel') {
      const fine = Number(cs.data.fine) || 0;
      if (opt === 'charge') {
        post(s, `hotelback:${csId}`, Math.round(fine / 2), 'touring', 'Multa descontada do artista');
        act.trust = clampN(act.trust - 6, 0, 100);
        result = l('Metade da multa sai do bolso do artista. Ele não gostou.', 'Half the fine comes out of the artist\'s pocket. Not happy.');
      } else if (opt === 'legend') {
        if (act.image) act.image.publicImage = clampN(act.image.publicImage - 4, 0, 100);
        act.fans.core += Math.round(150 + act.fame * 10);
        result = l('A história da TV na piscina corre o mundo. Os fãs rebeldes adoram.', 'The TV-in-the-pool story goes around the world. Rebel fans love it.');
      } else {
        result = l('Conta paga, gerente calado. Ninguém fica sabendo.', 'Bill paid, manager hushed. Nobody finds out.');
      }
    } else if (kind === 'airport') {
      if (opt === 'statement') {
        act.fame = clampN(act.fame + 0.5, 0, 100);
        result = l('Os jornais locais publicam a nota; a cidade quer o show de volta.', 'Local papers print the statement; the city wants the show back.');
      } else if (opt === 'video') {
        act.fans.core += Math.round(200 + act.fame * 12);
        result = l('O recado aos fãs comove. O fã-clube local cresce.', 'The message to fans moves people. The local fan club grows.');
      } else {
        each((p) => (p.fatigue = clampN(p.fatigue - 10, 0, 100)));
        result = l('Volta para casa e descanso.', 'Back home to rest.');
      }
    }
  }
  patchScene(s, csId, { done: true, result, opt });
  remember(s, 'vignette', result, { actId: act?.id });
  void r;
  return result;
}
