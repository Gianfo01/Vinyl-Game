// R33 · BUGS33 (item 4, pedido do dono) — negócios ao ENTRAR numa cidade: comprar imóvel e abrir filial ali.
// Só junta os fluxos que já existem, cada um com a sua trava (o motivo aparece no botão):
//   imóvel fora da sede → buyHome31 (r31/city31; sai do bolso do dono, a casa mais barata da época);
//   já tem imóvel lá    → ações do imóvel (cidade33: escritório regional, alugar, vender) = baseActs33;
//   filial              → canOpenBranch/openBranch (branches.ts);
//   diretor da filial   → canHireBranchDir33/hireBranchDir33 (GENTE33, só com o interruptor ligado).
// Na cidade-sede não há filial (é a matriz) nem "imóvel fora": a ação vem travada com o motivo, e os terrenos e
// prédios à venda continuam pelo cartão de cada lote (lots31/campus18).
// Usado pelo cartão da cidade no mapa-múndi (mundo27) e pela ficha da cidade visitada (map5ui). Testes:
// tests/r33-bugs-4.test.ts.

import { BRANCH_LEVELS } from '../../data/rules';
import { cityById, l, type L } from '../../data/world';
import { canOpenBranch, openBranch } from '../branches';
import { buyHome31, casasOn31, homePrice31, homes31, housesAt31 } from '../r31/city31';
import { HOUSES, ownerOf } from '../sys/people/owner';
import type { GameState } from '../types';
import { fmtL, money } from '../util';
import { baseActs33, runBase33 } from './cidade33';
import { canHireBranchDir33, dirOf33, gente33On, hireBranchDir33 } from './gente33';

export type CityBuyId33 = 'home' | 'branch' | 'dir' | `base:${string}`;
export interface CityBuy33 { id: CityBuyId33; label: L; desc: L; cost?: number; dis?: L }

/** A casa mais barata da época numa cidade (o atalho de "comprar imóvel"; a lista completa fica em Casa › imóveis). */
export function cheapHome33(s: GameState, city: string): number | undefined {
  return housesAt31(s).sort((a, b) => homePrice31(s, city, a) - homePrice31(s, city, b) || a - b)[0];
}

/** Por que não dá para comprar imóvel nesta cidade agora (null = dá). Mesmas regras de buyHome31, antes do clique. */
export function homeLock33(s: GameState, city: string): L | null {
  if (!cityById[city]) return l('Cidade desconhecida.', 'Unknown city.');
  if (city === s.config.homeCity) return l('Na sua cidade, a casa é a principal (compre em "Casa"); terrenos e prédios à venda estão no cartão de cada lote.', 'In your own city, use your main home ("Home"); plots and buildings for sale are on each lot\'s card.');
  if (!casasOn31(s)) return l('Imóveis em outras cidades estão desligados nesta partida.', 'Homes in other cities are switched off in this game.');
  if (homes31(s).some((x) => x.city === city)) return l('Você já tem um imóvel nesta cidade.', 'You already own a home in this city.');
  const hs = cheapHome33(s, city);
  if (hs === undefined) return l('Nenhum tipo de casa à venda nesta época.', 'No kind of house for sale in this era.');
  if (ownerOf(s).wealth < homePrice31(s, city, hs)) return l('Patrimônio pessoal insuficiente (o imóvel sai do seu bolso, não da empresa).', 'Not enough personal wealth (the home comes out of your pocket, not the company).');
  return null;
}

/** Ações de negócio da cidade (na ordem do cartão). Sempre devolve imóvel e filial, travados com motivo quando preciso. */
export function cityBuyActs33(s: GameState, city: string): CityBuy33[] {
  const out: CityBuy33[] = [];
  const own = homes31(s).some((x) => x.city === city);
  if (own) {
    out.push({ id: 'home', label: l('Seu imóvel aqui', 'Your home here'), desc: l('Base de turnê e pouso na cidade.', 'A tour base and a place to stay in town.'), dis: homeLock33(s, city) ?? undefined });
    for (const a of baseActs33(s, city)) out.push({ id: `base:${a.id}`, label: a.label, desc: a.desc, cost: a.cost, dis: a.dis });
  } else {
    const hs = cheapHome33(s, city);
    out.push({ id: 'home', label: l('Comprar imóvel aqui', 'Buy a home here'), cost: hs !== undefined && city !== s.config.homeCity ? homePrice31(s, city, hs) : undefined,
      desc: hs !== undefined ? fmtL(l('{h}: base de turnê e pouso na cidade; sai do seu bolso.', '{h}: a tour base and a place to stay in town; comes out of your pocket.'), { h: HOUSES[hs].name }) : l('Base de turnê e pouso na cidade.', 'A tour base and a place to stay in town.'),
      dis: homeLock33(s, city) ?? undefined });
  }
  const br = (s.branches ?? []).find((b) => b.city === city);
  out.push(br
    ? { id: 'branch', label: l('Sua filial (aberta)', 'Your branch (open)'), desc: l('Público, distribuição e olheiros na região.', 'Audience, distribution and scouts in the region.'), dis: l('Já existe uma filial aqui.', 'There is already a branch here.') }
    : { id: 'branch', label: l('Abrir filial aqui', 'Open a branch here'), cost: money(s, BRANCH_LEVELS[0].cost),
      desc: l('Filial: mais público e distribuição na região, olheiros locais.', 'Branch: more audience and distribution in the region, local scouts.'), dis: (city === s.config.homeCity ? l('A matriz já fica nesta cidade.', 'The main HQ is already in this city.') : canOpenBranch(s, city)) ?? undefined });
  if (br && gente33On(s) && !dirOf33(s, br.id)) out.push({ id: 'dir', label: l('Contratar diretor(a) da filial', 'Hire a branch director'),
    desc: l('Alguém para comandar a filial: garimpa talentos e manda relatório todo mês.', 'Someone to run the branch: scouts talent and reports every month.'), dis: canHireBranchDir33(s, br.id) ?? undefined });
  return out;
}

/** Executa uma ação de `cityBuyActs33` (de novo pela trava do fluxo de origem). */
export function runCityBuy33(s: GameState, city: string, id: CityBuyId33): { ok: boolean; text: L } {
  const done = (err: L | null, ok: L) => (err ? { ok: false, text: err } : { ok: true, text: ok });
  const name = cityById[city]?.name ?? l(city, city);
  if (id === 'home') {
    const why = homeLock33(s, city);
    if (why) return { ok: false, text: why };
    return done(buyHome31(s, city, cheapHome33(s, city)!), fmtL(l('Imóvel comprado em {c}: agora é sua base de turnê lá.', 'Home bought in {c}: it is now your tour base there.'), { c: name }));
  }
  if (id === 'branch') return done(openBranch(s, city), fmtL(l('Filial aberta em {c}!', 'Branch opened in {c}!'), { c: name }));
  if (id === 'dir') {
    const br = (s.branches ?? []).find((b) => b.city === city);
    if (!br) return { ok: false, text: l('Abra a filial primeiro.', 'Open the branch first.') };
    return done(hireBranchDir33(s, br.id), fmtL(l('A filial de {c} tem diretor(a).', 'The {c} branch has a director.'), { c: name }));
  }
  if (id.startsWith('base:')) return runBase33(s, city, id.slice(5));
  return { ok: false, text: l('Ação indisponível.', 'Action unavailable.') };
}
