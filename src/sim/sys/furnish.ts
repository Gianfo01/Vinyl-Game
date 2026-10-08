// Mobília e instrumentos da sede (rodada 7): a sede começa quase vazia e cada compra aparece no desenho
// em pixel art (bateria, amplificadores, teclados, sofás, mesas…). Cada item tem um efeito pequeno e
// mensurável: instrumentos melhoram composição e gravação dos seus atos, conforto reduz estresse e
// sobe a moral, escritório e reuniões ajudam a reputação.
//
// Saves antigos (sem este estado) continuam com a sede mobiliada como antes ("legacy").

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { songQ } from '../production';
import type { GameState } from '../types';
import { money, playerActs, post } from '../util';

export type FurnRoom = 'booth' | 'rehearsal' | 'control' | 'writing' | 'lounge' | 'office' | 'meeting' | 'hall' | 'trophy' | 'any';

export interface FurnDef {
  id: string;
  name: L;
  /** tipos de móvel desenhados que este item libera */
  kinds: string[];
  rooms: FurnRoom[];
  cost: number;
  max: number;
  from?: number;
  desc: L;
  fx: { compose?: number; record?: number; morale?: number; stress?: number; rep?: number };
}

export const FURNITURE: FurnDef[] = [
  { id: 'drums', name: l('Bateria', 'Drum kit'), kinds: ['drumkit'], rooms: ['booth', 'rehearsal'], cost: 1800, max: 2, desc: l('+0,6 de interpretação nas gravações.', '+0.6 performance on recordings.'), fx: { record: 0.6 } },
  { id: 'amp', name: l('Amplificador e guitarra', 'Amp and guitar'), kinds: ['amp'], rooms: ['booth', 'rehearsal'], cost: 900, max: 4, from: 1940, desc: l('+0,4 de interpretação nas gravações.', '+0.4 performance on recordings.'), fx: { record: 0.4 } },
  { id: 'keys', name: l('Piano, órgão ou sintetizador', 'Piano, organ or synth'), kinds: ['piano', 'organ', 'synth'], rooms: ['booth', 'rehearsal', 'writing'], cost: 3500, max: 3, desc: l('+0,8 de melodia nas composições.', '+0.8 melody on new songs.'), fx: { compose: 0.8 } },
  { id: 'pa', name: l('Caixas de som (PA)', 'PA speakers'), kinds: ['speaker'], rooms: ['rehearsal', 'booth'], cost: 2200, max: 2, desc: l('+0,4 de interpretação; ensaios rendem mais.', '+0.4 performance; rehearsals pay off.'), fx: { record: 0.4 } },
  { id: 'mic', name: l('Microfone extra', 'Extra microphone'), kinds: ['mic'], rooms: ['booth', 'rehearsal'], cost: 400, max: 3, desc: l('+0,3 de interpretação nas gravações.', '+0.3 performance on recordings.'), fx: { record: 0.3 } },
  { id: 'sofa', name: l('Sofá', 'Sofa'), kinds: ['sofa'], rooms: ['lounge', 'control'], cost: 700, max: 3, desc: l('−0,4 de estresse por mês para seus artistas.', '−0.4 stress a month for your artists.'), fx: { stress: 0.4 } },
  { id: 'armchair', name: l('Poltrona', 'Armchair'), kinds: ['armchair'], rooms: ['lounge'], cost: 350, max: 2, desc: l('−0,2 de estresse por mês.', '−0.2 stress a month.'), fx: { stress: 0.2 } },
  { id: 'coffee_table', name: l('Mesa de centro', 'Coffee table'), kinds: ['coffee_table'], rooms: ['lounge'], cost: 200, max: 1, desc: l('+0,1 de moral por mês.', '+0.1 morale a month.'), fx: { morale: 0.1 } },
  { id: 'tv', name: l('Televisão', 'Television'), kinds: ['tv'], rooms: ['lounge'], cost: 600, max: 1, from: 1950, desc: l('+0,3 de moral por mês.', '+0.3 morale a month.'), fx: { morale: 0.3 } },
  { id: 'arcade', name: l('Fliperama e jogos', 'Arcade and games'), kinds: ['fun'], rooms: ['lounge'], cost: 1500, max: 1, desc: l('+0,4 de moral por mês.', '+0.4 morale a month.'), fx: { morale: 0.4 } },
  { id: 'coffee', name: l('Máquina de café', 'Coffee machine'), kinds: ['coffee'], rooms: ['lounge'], cost: 300, max: 1, desc: l('+0,2 de moral por mês.', '+0.2 morale a month.'), fx: { morale: 0.2 } },
  { id: 'table', name: l('Mesa de composição', 'Writing table'), kinds: ['table', 'workbench'], rooms: ['writing'], cost: 400, max: 1, desc: l('+0,3 de letra nas composições.', '+0.3 lyrics on new songs.'), fx: { compose: 0.3 } },
  { id: 'chair', name: l('Cadeiras', 'Chairs'), kinds: ['chair'], rooms: ['any'], cost: 120, max: 12, desc: l('Lugares para sentar (sem cadeira, todo mundo fica de pé).', 'Seats (without chairs everybody stands).'), fx: {} },
  { id: 'shelf', name: l('Estante de discos e livros', 'Records and books shelf'), kinds: ['shelf'], rooms: ['writing', 'office'], cost: 300, max: 2, desc: l('+0,2 de originalidade nas composições.', '+0.2 originality on new songs.'), fx: { compose: 0.2 } },
  { id: 'lamp', name: l('Luminária', 'Lamp'), kinds: ['lamp'], rooms: ['any'], cost: 80, max: 3, desc: l('Ambiente mais acolhedor (+0,05 de moral).', 'Cosier room (+0.05 morale).'), fx: { morale: 0.05 } },
  { id: 'plant', name: l('Planta', 'Plant'), kinds: ['plant'], rooms: ['any'], cost: 60, max: 8, desc: l('+0,05 de moral por mês.', '+0.05 morale a month.'), fx: { morale: 0.05 } },
  { id: 'desk', name: l('Mesa de escritório', 'Office desk'), kinds: ['desk'], rooms: ['office'], cost: 500, max: 8, desc: l('Lugar de trabalho para a equipe (+0,05 de reputação institucional).', 'A workstation for staff (+0.05 institutional reputation).'), fx: { rep: 0.05 } },
  { id: 'filing', name: l('Arquivo', 'Filing cabinet'), kinds: ['filing'], rooms: ['office'], cost: 250, max: 1, desc: l('Contratos organizados (+0,05 de reputação).', 'Organised contracts (+0.05 reputation).'), fx: { rep: 0.05 } },
  { id: 'water', name: l('Bebedouro', 'Water cooler'), kinds: ['water'], rooms: ['office'], cost: 150, max: 1, desc: l('+0,05 de moral.', '+0.05 morale.'), fx: { morale: 0.05 } },
  { id: 'meeting_table', name: l('Mesa de reunião', 'Meeting table'), kinds: ['table3'], rooms: ['meeting'], cost: 1200, max: 1, desc: l('Negociações na sede (+0,1 de reputação institucional).', 'Negotiations at HQ (+0.1 institutional reputation).'), fx: { rep: 0.1 } },
  { id: 'bench', name: l('Banco de espera', 'Waiting bench'), kinds: ['bench'], rooms: ['hall'], cost: 200, max: 1, desc: l('Recepção para visitas e demos.', 'A reception for visitors and demos.'), fx: { rep: 0.03 } },
  { id: 'vending', name: l('Máquina de lanches', 'Vending machine'), kinds: ['vending'], rooms: ['hall'], cost: 900, max: 1, from: 1950, desc: l('+0,1 de moral.', '+0.1 morale.'), fx: { morale: 0.1 } },
];
export const furnById: Record<string, FurnDef> = Object.fromEntries(FURNITURE.map((x) => [x.id, x]));
/** móvel desenhado → item que o libera */
export const KIND_TO_ITEM: Record<string, string> = {};
for (const f of FURNITURE) for (const k of f.kinds) KIND_TO_ITEM[k] = f.id;

export interface FurnState { legacy: boolean; items: Record<string, number> }
declare module '../ext4' { interface Ext4 { furn: FurnState } }
registerExt4('furn', () => ({ legacy: true, items: {} }));
export const furn = (s: GameState): FurnState => (s as unknown as { x4: { furn: FurnState } }).x4.furn;

/** Kit inicial: uma mesa, duas cadeiras, um microfone (o resto se compra). */
const STARTER: Record<string, number> = { mic: 1, table: 1, chair: 2, desk: 1, lamp: 1 };

registerSimHook('newgame', 'furnish', (s) => {
  const f = furn(s);
  f.legacy = false;
  f.items = { ...STARTER };
  const kit = s.config.custom?.studio;
  if (kit === 'basic' || kit === 'pro') Object.assign(f.items, { amp: 2, drums: 1, keys: 1, chair: 4, sofa: 1 });
  if (kit === 'pro') Object.assign(f.items, { pa: 1, mic: 2, shelf: 1, plant: 2, coffee: 1, desk: 2 });
});


export function furnBlocker(s: GameState, id: string, roomKinds: string[]): L | null {
  const def = furnById[id];
  if (!def) return l('Item inválido.', 'Invalid item.');
  if (def.from && s.year < def.from) return l('Ainda não existe nesta época.', 'Does not exist yet in this era.');
  if ((furn(s).items[id] ?? 0) >= def.max) return l('Já tem o máximo deste item.', 'You already have the maximum of this item.');
  if (!def.rooms.includes('any') && !def.rooms.some((r) => roomKinds.includes(r))) return l('A sede não tem a sala certa (amplie a sede ou troque a função de uma sala).', 'The HQ lacks the right room (upgrade or repurpose a room).');
  if (s.player.cash < money(s, def.cost)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}

export function buyFurniture(s: GameState, id: string, roomKinds: string[]): L | null {
  const err = furnBlocker(s, id, roomKinds);
  if (err) return err;
  const def = furnById[id];
  const have = furn(s).items[id] ?? 0;
  post(s, `furn:${id}:${have}:${s.week}`, -money(s, def.cost), 'hq', `Sede: ${def.name.pt}`);
  furn(s).items[id] = have + 1;
  return null;
}

export function sellFurniture(s: GameState, id: string): L | null {
  const def = furnById[id];
  const have = furn(s).items[id] ?? 0;
  if (!def || have <= 0) return l('Nada para vender.', 'Nothing to sell.');
  furn(s).items[id] = have - 1;
  post(s, `furnsell:${id}:${have}:${s.week}`, Math.round(money(s, def.cost) * 0.35), 'hq', `Venda: ${def.name.pt}`);
  return null;
}

/** Soma dos efeitos dos itens (com retorno decrescente). */
export function furnEffects(s: GameState): Required<FurnDef['fx']> {
  const out = { compose: 0, record: 0, morale: 0, stress: 0, rep: 0 };
  const f = furn(s);
  if (f.legacy) return out;
  for (const [id, n] of Object.entries(f.items)) {
    const def = furnById[id];
    if (!def || n <= 0) continue;
    for (const k of Object.keys(def.fx) as (keyof typeof out)[]) out[k] += (def.fx[k] ?? 0) * Math.sqrt(n) * (n > 1 ? 1 : 1);
  }
  out.compose = Math.min(out.compose, 3);
  out.record = Math.min(out.record, 3);
  out.morale = Math.min(out.morale, 1.5);
  out.stress = Math.min(out.stress, 1.5);
  return out;
}

const mineSong = (s: GameState, actId: string) => s.acts[actId]?.owner === 'player' || !!s.acts[actId]?.playerBand;

registerSimHook('compose', 'furnish', (s, _r, arg) => {
  const so = arg.song;
  if (!so || !mineSong(s, so.actId)) return;
  const fx = furnEffects(s);
  if (!fx.compose) return;
  so.melody = clamp(so.melody + fx.compose * 0.6, 5, 100);
  so.lyrics = clamp(so.lyrics + fx.compose * 0.4, 5, 100);
});

registerSimHook('record', 'furnish', (s, _r, arg) => {
  const so = arg.song;
  if (!so || !mineSong(s, so.actId)) return;
  const fx = furnEffects(s);
  if (!fx.record) return;
  so.performance = clamp(so.performance + fx.record, 5, 100);
  so.q = songQ(so);
});

registerSimHook('month', 'furnish', (s) => {
  const fx = furnEffects(s);
  if (!fx.morale && !fx.stress && !fx.rep) return;
  for (const id of playerActs(s)) for (const pid of s.acts[id]?.members ?? []) {
    const p = s.persons[pid];
    if (!p?.alive) continue;
    p.morale = clamp(p.morale + fx.morale, 0, 100);
    p.stress = clamp(p.stress - fx.stress, 0, 100);
  }
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + fx.rep, 0, 100);
});
