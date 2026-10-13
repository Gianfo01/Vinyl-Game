// R29 (integrante) — interface da oferta a um integrante específico. Entrada: "Oferecer a {nome}… ›" na seção
// "Carreira e contrato" do clique direito numa pessoa e do painel "Ações" da ficha (o mesmo modelo, ps/ctx27model).
// Cada opção segue o fluxo de sempre (docs/act27.md, um caminho só):
//  • carreira solo → cria o solo-proposta (sim/sys/member29) e abre a TELA DA OFERTA de sempre (openOffer: a mesa r27,
//    ou a proposta única no "Resolver rápido"); ao fechar a mesa/proposta, settleMember29 conclui ou desfaz;
//  • participação (feat) → o feat negociado de sempre (round8.openFeatModal) com a banda como convidada;
//  • entrar / sessão / projeto paralelo / equipe / ghostwriter → resolvem na hora (sorteio próprio) com aviso;
//    o projeto paralelo, quando nasce, abre a proposta de contrato do supergrupo (como no bonds9).
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { bandOf29, runMemberOption29, settleMember29, startMemberSolo29, type MoMode29 } from '../../sim/sys/member29';
import type { GameState } from '../../sim/types';
import { rerender, toast } from '../common';
import { openOffer } from '../ficha';

/** Conclui propostas de solo abertas (depois de fechar a mesa/proposta) e avisa. */
export function settleToast29(s: GameState): void {
  for (const x of settleMember29(s)) toast(t(x.t), x.ok ? 'good' : 'bad');
}

/** Executa um item `mo.*` do submenu "Oferecer a {nome}…". */
export function runMember29(s: GameState, pid: string, itemId: string): void {
  if (itemId.startsWith('mo.solo:')) {
    const r = startMemberSolo29(s, pid, itemId.slice(8) as MoMode29);
    if (!('actId' in r)) { toast(t(r), 'bad'); return; }
    toast(t(l('Proposta de carreira solo: assinou, sai da banda; sem acordo, fica onde está.', 'Solo career offer: if they sign, they leave the band; no deal, they stay put.')), 'info');
    openOffer(r.actId);
    return;
  }
  if (itemId === 'mo.feat') {
    const band = bandOf29(s, pid);
    if (band) void import('./round8').then((m) => m.openFeatModal(s, { guest: band.id })); // carregado sob demanda (não muda a ordem de registro das seções)
    return;
  }
  const out = runMemberOption29(s, pid, itemId);
  toast(t(out.text), out.ok ? 'good' : 'bad');
  rerender();
  if (out.ok && itemId.startsWith('mo.side:') && out.actId && s.acts[out.actId] && !s.acts[out.actId].owner) setTimeout(() => openOffer(out.actId!), 0);
}
