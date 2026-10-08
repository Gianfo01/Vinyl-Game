// Árvore de pesquisa: pontos ganhos com lançamentos, sessões e equipe destravam técnicas com efeito real.

import { l, type L } from '../../../data/world';
import { registerSimHook } from '../../ext4';
import type { GameState } from '../../types';
import { fmtL, notify, staffCount } from '../../util';

export interface ResearchNode {
  id: string;
  name: L;
  desc: L;
  cost: number;
  requires?: string[];
  minYear?: number;
}

export const RESEARCH: ResearchNode[] = [
  { id: 'signature_sound', name: l('Som assinatura', 'Signature sound'), desc: l('+4% de apelo em todos os lançamentos da casa.', '+4% appeal on all house releases.'), cost: 40 },
  { id: 'quality_control', name: l('Controle de qualidade', 'Quality control'), desc: l('Menos defeitos de prensagem.', 'Fewer pressing defects.'), cost: 30 },
  { id: 'lean_press', name: l('Prensagem enxuta', 'Lean pressing'), desc: l('+25% de capacidade e −5% no custo de fábrica.', '+25% capacity and −5% plant cost.'), cost: 60, requires: ['quality_control'] },
  { id: 'market_data', name: l('Análise de dados de mercado', 'Market data analysis'), desc: l('Preço e distribuição rendem mais (+3% de vendas).', 'Pricing and distribution perform better (+3% sales).'), cost: 50 },
  { id: 'radio_network', name: l('Rede de divulgação em rádio', 'Radio promotion network'), desc: l('+5% de apelo em singles.', '+5% appeal on singles.'), cost: 45, requires: ['signature_sound'] },
  { id: 'retail_merch', name: l('Merchandising de loja', 'Retail merchandising'), desc: l('Lojas próprias vendem +20%.', 'Own stores sell +20%.'), cost: 35 },
  { id: 'deal_360', name: l('Contrato 360° aprimorado', 'Improved 360° deal'), desc: l('Receita de shows e merch das suas lojas e promotora +10%.', 'Show and merch revenue from your stores and promoter +10%.'), cost: 55, minYear: 2003 },
  { id: 'digital_early', name: l('Distribuição digital antecipada', 'Early digital distribution'), desc: l('Na era digital, +6% de vendas digitais.', 'In the digital era, +6% digital sales.'), cost: 60, minYear: 1997, requires: ['market_data'] },
  { id: 'fan_crm', name: l('Cadastro de fãs', 'Fan database'), desc: l('Clube do disco e streaming próprio crescem mais rápido.', 'Mail club and own streaming grow faster.'), cost: 40, requires: ['market_data'] },
  { id: 'acoustic_lab', name: l('Laboratório de acústica', 'Acoustics lab'), desc: l('Itens de sala da sede rendem +50%.', 'HQ room items yield +50%.'), cost: 45 },
  { id: 'global_logistics', name: l('Logística global', 'Global logistics'), desc: l('Distribuidores cobram 5 pontos a menos de comissão.', 'Distributors charge 5 points less commission.'), cost: 70, requires: ['lean_press', 'market_data'] },
  { id: 'ai_mastering', name: l('Masterização assistida', 'Assisted mastering'), desc: l('+3% de apelo e crítica um pouco melhor.', '+3% appeal and slightly better reviews.'), cost: 80, minYear: 2018, requires: ['signature_sound'] },
];

export const researchById = Object.fromEntries(RESEARCH.map((x) => [x.id, x])) as Record<string, ResearchNode>;

export function researchDone(s: GameState, id: string): boolean {
  return !!s.x4?.industry?.research.done.includes(id);
}

export function canResearch(s: GameState, id: string): L | null {
  const n = researchById[id];
  if (!n) return l('Inválido.', 'Invalid.');
  const st = s.x4.industry.research;
  if (st.done.includes(id)) return l('Já pesquisado.', 'Already researched.');
  if (n.minYear && s.year < n.minYear) return fmtL(l('Disponível a partir de {y}.', 'Available from {y}.'), { y: n.minYear });
  const miss = (n.requires ?? []).filter((x) => !st.done.includes(x));
  if (miss.length) return fmtL(l('Requer: {r}.', 'Requires: {r}.'), { r: miss.map((x) => researchById[x].name.pt).join(', ') });
  return null;
}

export function startResearch(s: GameState, id: string): L | null {
  const e = canResearch(s, id);
  if (e) return e;
  s.x4.industry.research.current = id;
  s.x4.industry.research.progress = 0;
  return null;
}

function researchMonth(s: GameState): void {
  const st = s.x4.industry.research;
  // pontos: equipe de análise e A&R, mais lançamentos recentes
  const recent = Object.values(s.releases).filter((x) => x.owner === 'player' && s.week - x.week < 5).length;
  const gain = 2 + staffCount(s, 'analyst') * 3 + staffCount(s, 'anr') + staffCount(s, 'engineer') + recent * 2 + (s.x4.industry.plants.length ? 1 : 0);
  st.points += gain;
  if (!st.current) return;
  const n = researchById[st.current];
  const use = Math.min(st.points, n.cost - st.progress);
  st.points -= use;
  st.progress += use;
  if (st.progress >= n.cost) {
    st.done.push(n.id);
    st.current = null;
    st.progress = 0;
    notify(s, fmtL(l('Pesquisa concluída: {n}.', 'Research complete: {n}.'), { n: n.name }), 'good');
  }
}

registerSimHook('month', 'industry:research', (s) => researchMonth(s));
