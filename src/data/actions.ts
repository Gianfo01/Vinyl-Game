// Ações extras de agenda (GDD §42 "Ações disponíveis", §45.4 carga mensal e §46.5 recuperação).
// load = % da capacidade mensal de cada participante; scope = formação inteira ou uma pessoa.

import { l, type L } from './world';

export interface ActionMeta {
  id: string;
  load: number;
  scope: 'band' | 'person';
  months?: number;
}

export interface ExtraAction {
  id: string;
  name: L;
  desc: L;
  cost: number;
  load: number;
  scope: 'band' | 'person';
  months?: number;
}

const x = (id: string, pt: string, en: string, dpt: string, den: string, cost: number, load: number, scope: 'band' | 'person' = 'band', months = 1): ExtraAction =>
  ({ id, name: l(pt, en), desc: l(dpt, den), cost, load, scope, months });

export const EXTRA_ACTIONS: ExtraAction[] = [
  x('demo_test', 'Testar uma demo', 'Test a demo', 'Mostra uma composição a um público; avaliação incerta.', 'Play a song to an audience; uncertain feedback.', 250, 25),
  x('community', 'Evento comunitário', 'Community event', 'Primeiros ouvintes da cidade.', 'First listeners in your city.', 80, 25),
  x('contest', 'Concurso de bandas', 'Battle of the bands', 'Compete com a cena; prêmio incerto.', 'Compete with the scene; prize not guaranteed.', 200, 50),
  x('fan_club', 'Organizar fã-clube', 'Organize a fan club', 'Interesse vira comunidade e apoio recorrente.', 'Interest becomes community and recurring support.', 300, 25, 'band', 2),
  x('crowdfund', 'Financiamento coletivo', 'Crowdfunding', 'Fãs fiéis apoiam; cria promessa de entrega.', 'Core fans chip in; creates a delivery promise.', 180, 25, 'band', 2),
  x('score_commission', 'Trilha encomendada', 'Commissioned score', 'Paga conforme qualidade e prazo; cria obra.', 'Pays by quality and deadline; creates a work.', 350, 50, 'band', 3),
  x('session_work', 'Músico de sessão', 'Session work', 'Serviço pago conforme habilidade.', 'Paid service by skill.', 80, 50, 'person'),
  x('mediation', 'Mediação e retiro', 'Mediation retreat', 'Trabalha conflitos; não apaga promessas quebradas.', 'Works through conflicts; broken promises remain.', 700, 100),
  x('mentoring', 'Mentoria', 'Mentoring', 'Um veterano ensina; habilidade e vínculo.', 'A veteran teaches; skill and bond.', 400, 20, 'person', 2),
  x('family_time', 'Tempo com a família', 'Family time', 'Vínculo familiar e bem-estar.', 'Family bond and wellbeing.', 0, 25, 'person'),
  x('recovery', 'Recuperação', 'Recovery', 'Descanso, cultura e criação sem pressão.', 'Rest, culture and pressure-free creation.', 300, 50),
  x('therapy', 'Terapia', 'Therapy', 'Acompanhamento por três meses; reduz estresse.', 'Three months of support; lowers stress.', 450, 10, 'person', 3),
  x('collab_prep', 'Preparar colaboração', 'Prepare a collaboration', 'Exige parceiro e acordo de créditos.', 'Needs a partner and a credits deal.', 600, 50, 'band', 2),
  x('solo_project', 'Projeto solo temporário', 'Temporary solo project', 'Um integrante ganha autonomia; a banda pode ressentir.', 'One member gets autonomy; the band may resent it.', 800, 75, 'person', 3),
  x('documentary', 'Documentário', 'Documentary', 'Exige história e catálogo; reativa interesse.', 'Needs history and catalog; rekindles interest.', 3500, 25, 'band', 4),
  x('reunion_prep', 'Preparar reunião', 'Prepare a reunion', 'Negocia a volta de ex-integrantes.', 'Negotiate the return of former members.', 2000, 50, 'band', 3),
  x('songcamp', 'Camp de composição', 'Songwriting camp', 'Vários compositores, muitas ideias, custo alto.', 'Many writers, lots of ideas, high cost.', 2500, 50),
  x('new_era', 'Nova era artística', 'New artistic era', 'Renova identidade e originalidade.', 'Refreshes identity and originality.', 750, 25),
  x('stage_prep', 'Preparação de palco', 'Stage training', 'Presença e comunicação com o público.', 'Presence and audience connection.', 400, 50, 'band', 2),
  x('vocal_prep', 'Preparação vocal', 'Vocal coaching', 'Respiração, afinação e resistência.', 'Breath, pitch and stamina.', 500, 50, 'person', 2),
  x('party', 'Festa de networking', 'Networking party', 'Contatos e convites; o ambiente muda os riscos.', 'Contacts and invites; the venue changes the risks.', 220, 25),
];

/** Carga de cada ação base (GDD §45.4). */
export const BASE_LOADS: Record<string, ActionMeta> = {
  train: { id: 'train', load: 25, scope: 'band' },
  workshop: { id: 'workshop', load: 25, scope: 'band' },
  rehearse: { id: 'rehearse', load: 25, scope: 'band' },
  opening: { id: 'opening', load: 25, scope: 'band' },
  networking: { id: 'networking', load: 25, scope: 'band' },
  interview: { id: 'interview', load: 25, scope: 'band' },
  residency_art: { id: 'residency_art', load: 75, scope: 'band' },
  side_job: { id: 'side_job', load: 75, scope: 'band' },
  feat: { id: 'feat', load: 50, scope: 'band' },
  rest: { id: 'rest', load: 25, scope: 'band' },
  social: { id: 'social', load: 25, scope: 'band' },
  reposition: { id: 'reposition', load: 50, scope: 'band' },
  compose: { id: 'compose', load: 45, scope: 'band' },
  record: { id: 'record', load: 60, scope: 'band' },
  gigs: { id: 'gigs', load: 40, scope: 'band' },
};

export function actionMeta(id: string): ActionMeta {
  const ex = EXTRA_ACTIONS.find((a) => a.id === id);
  if (ex) return { id, load: ex.load, scope: ex.scope, months: ex.months };
  return BASE_LOADS[id] ?? { id, load: 25, scope: 'band' };
}
