// Revisão 21 (G-1) — OPÇÃO PADRÃO EXPLÍCITA dos eventos construídos por fábrica (events_more, events_more11, módulos
// de sistema). A opção padrão é a aplicada quando o cartão vence sem resposta (tick.openMonth) e quando o evento é
// filtrado por conteúdo/regra RS (events.emitEvent). Regra: a mais cautelosa — sem custo, sem aposta, sem dano
// permanente. Quando TODAS as opções custam (o evento é uma conta), vale a de custo fixo e sem aposta; esses casos
// estão listados como exceções em tests/r21-g.test.ts. Eventos declarados em events.ts levam `neutral` inline.

export const NEUTRAL21: Record<string, string> = {
  // events_more.ts
  tv_waist_up: 'accept',
  crowd_surge: 'stop',
  morality_clause: 'refund', // devolve o patrocínio: custo fixo, sem processo
  plagiarism_suit: 'credit',
  sample_uncleared: 'replay', // regravar o trecho: custo pequeno e fixo, sem processo depois
  cowriter_claim: 'share', // 10% da edição: custo fixo, sem tribunal
  band_name_dispute: 'buy', // comprar o nome: custo fixo; renomear perde 15% da fama
  estate_dispute: 'settle',
  espionage_exposed: 'settle',
  neural_headache: 'warn', // o menor custo; negar é aposta de ação coletiva
  // events_more11.ts
  r11_hotel_trash: 'pay', // a conta do hotel é o evento; cobrar da banda ou "virar lenda" machuca
  r11_relapse: 'hope', // a recaída é o evento; as outras opções custam
  r11_social_feud: 'delete',
  r11_embezzler: 'quiet', // o desvio já aconteceu; demitir em silêncio é o custo fixo
  r11_office_flood: 'patch',
  r11_distributor_bust: 'write_off', // o crédito já se perdeu; dar baixa é o custo fixo
  r11_cutout_bin: 'cutout',
  r11_8track_war: 'both',
  // módulos de sistema
  dsp15_audit: 'settle', // acordo de 70%: certo e sem aposta
  id_noncompete: 'settle', // todas custam; o acordo é fixo, o tribunal é aposta
  d18_van: 'rent', // o menor custo
  era19_cyl_bet: 'cyl',
};
