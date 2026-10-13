// R29 (contratos+) — itens do clique direito (ctx27) para os três modelos: "Propor empresariamento", "Propor produção"
// e "Propor joint venture", na seção "Carreira e contrato" do menu do ato e do da pessoa (pelo ato dela). Puro (sem DOM):
// a interface liga `c29Open().f` ao MESMO handler do botão da ficha (ficha.openOffer já no modelo) — nenhum caminho novo.

import { l, type L } from '../../data/world';
import type { ContractModel } from '../../data/rules';
import { offerEligible29 } from '../../sim/contracts';
import type { Act, GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import type { CtxItem27, CtxMenu27 } from './ctx27model';

export const C29_MODELS: ContractModel[] = ['management', 'production', 'jv'];
export const C29_LABEL: Record<string, L> = {
  management: l('Propor empresariamento', 'Offer to manage'),
  production: l('Propor contrato de produção', 'Offer a production deal'),
  jv: l('Propor joint venture', 'Offer a joint venture'),
};
const NOTE: Record<string, L> = {
  management: l('O ato fica no selo dele; você vira o empresário (comissão).', 'The act stays on its label; you become its manager (commission).'),
  production: l('Sua produtora assina, grava e entrega masters a um selo.', 'Your production company signs, records and delivers masters to a label.'),
  jv: l('Um selo co-propriedade sua e do artista (meta e divisão do lucro).', 'A label co-owned by you and the act (target and profit split).'),
};

/** Handler único (a interface registra: o mesmo do botão "Propor empresariamento" da ficha). Hoisted. */
export function c29Open(): { f?: (actId: string, model: ContractModel) => void } { const g = c29Open as unknown as { o?: { f?: (actId: string, model: ContractModel) => void } }; return (g.o ??= {}); }

/** Itens do menu para um ato que não é seu; bloqueados mostram o motivo (a mesma regra da proposta). */
export function proposals29(s: GameState, a: Act | undefined, prefix: 'act' | 'person'): CtxItem27[] {
  if (!a || a.playerBand || playerActs(s).includes(a.id) || a.status === 'retired' || a.status === 'split') return [];
  const pending = s.offers.some((o) => o.actId === a.id && (o.status === 'pending' || o.status === 'counter'));
  return C29_MODELS.map((model) => {
    const el = offerEligible29(s, a, model);
    const block: L | null = pending ? l('Já há uma proposta em andamento: veja na Caixa/Mercado.', 'An offer is already in progress: see Inbox/Market.') : el.ok ? null : el.why ?? l('Indisponível agora.', 'Unavailable now.');
    return { id: `${prefix}.c29:${model}`, label: C29_LABEL[model], icon: 'contract', grp: 'do', block, sec: 'career', note: NOTE[model] } as CtxItem27;
  });
}

/** O ato de uma pessoa (o mesmo critério do atalho "Abrir o artista"). */
export const actOfPerson29 = (s: GameState, key: string): Act | undefined => {
  const pid = key.startsWith('p:') ? key.slice(2) : '';
  return pid ? Object.values(s.acts).find((a) => a.members.includes(pid) && a.status !== 'retired' && a.status !== 'split') : undefined;
};

/** Executa um item `*.c29:<modelo>`: chama o handler registrado. Devolve se tratou. */
export function runC29(s: GameState, m: CtxMenu27, item: CtxItem27): boolean {
  const k = item.id.indexOf('.c29:');
  if (k < 0) return false;
  if (item.block) return true;
  const model = item.id.slice(k + 5) as ContractModel;
  const actId = m.ent === 'act' ? m.id : actOfPerson29(s, m.id)?.id;
  if (actId) c29Open().f?.(actId, model);
  return true;
}
