// Rodada 28 (F3, análise 2.3/2.4) — ECO PADRÃO COM VARIANTES E DINHEIRO NA ESCALA DO SELO.
// Antes: uma frase-molde por tom ("A aposta pagou {w}: {a} colheu o que você arriscou.") e US$ 650 × (0,7 + fama/80),
// igual para um selo de garagem e para uma multinacional. Agora:
//  - 3 variantes por (grupo da categoria × desfecho), com ATOR ({a} ato ou selo, {p} pessoa) e OBJETO ({o} = a decisão
//    original). A variante sai de um hash do id do eco (sem sorteio: os fluxos do Rng não mudam).
//  - dinheiro: o valor antigo é o piso; escala com 2% da receita anual (× fama), com teto em 8% da receita e 12× o
//    valor antigo.
import { l, type L } from '../../data/world';
import type { Fx18 } from '../decide18';
import { fmtL, money } from '../util';
import { annualRev28 } from './story28';

export type Out28 = 'riskWin' | 'riskLose' | 'generous' | 'deceit' | 'cautWin' | 'cautMiss' | 'aggrWin' | 'aggrLose';
type G28 = 'people' | 'press' | 'market' | 'road' | 'studio';
/** categoria do evento → grupo das variantes */
export const GROUP28: Record<string, G28> = {
  people: 'people', band: 'people', health: 'people', scandal: 'press', culture: 'press', market: 'market', business: 'market', contract: 'market',
  manufacturing: 'market', stage: 'road', career: 'road', tech: 'studio', scouting: 'studio', neural: 'studio', world: 'press',
};
const V = (pt: string, en: string): L => l(pt, en);
/** [grupo][desfecho] → 3 variantes. Placeholders: {a} ator, {p} pessoa, {o} decisão original, {w} onde. */
export const VARIANTS28: Record<G28, Record<Out28, L[]>> = {
  people: {
    riskWin: [V('A aposta em "{o}" pagou {w}: {a} colheu o que você arriscou.', 'The bet on "{o}" paid off {w}: {a} reaped what you risked.'), V('{p} ainda fala de "{o}" como o dia em que o selo acreditou — e deu certo.', '{p} still calls "{o}" the day the label believed — and it worked.'), V('O risco de "{o}" virou união {w}: {a} rende mais do que nunca.', 'The risk in "{o}" became unity {w}: {a} delivers more than ever.')],
    riskLose: [V('A aposta em "{o}" deu errado {w}: a conta chegou para {a}.', 'The bet on "{o}" went wrong {w}: the bill came for {a}.'), V('"{o}" cobrou o preço {w}: {p} paga caro pelo risco.', '"{o}" took its toll {w}: {p} pays dearly for the risk.'), V('O que parecia ousadia em "{o}" virou dor de cabeça para {a}.', 'What looked bold in "{o}" became a headache for {a}.')],
    generous: [V('O gesto em "{o}" não foi esquecido {w}: {a} fala bem de você por aí.', 'The gesture in "{o}" was not forgotten {w}: {a} speaks well of you.'), V('{p} lembra de "{o}" e retribui com lealdade.', '{p} remembers "{o}" and pays it back with loyalty.'), V('A ajuda de "{o}" virou história de bastidor: {a} confia mais no selo.', 'The help in "{o}" became a backstage story: {a} trusts the label more.')],
    deceit: [V('A versão oficial de "{o}" não colou {w}: alguém contou a outra.', 'The official story of "{o}" did not hold {w}: someone told the other one.'), V('{p} descobriu o que houve em "{o}" — e não gostou.', '{p} found out what happened in "{o}" — and did not like it.'), V('O segredo de "{o}" vazou {w}; {a} se sente enganado.', 'The secret of "{o}" leaked {w}; {a} feels deceived.')],
    cautWin: [V('A cautela em "{o}" poupou dor de cabeça {w}.', 'Caution in "{o}" spared you a headache {w}.'), V('Esperar em "{o}" deu tempo para {a} se acertar.', 'Waiting on "{o}" gave {a} time to settle.'), V('{p} agradece o passo atrás de "{o}": a poeira baixou.', '{p} is grateful for the step back on "{o}": the dust settled.')],
    cautMiss: [V('Um rival fez o que você não quis em "{o}" — e saiu na frente.', 'A rival did what you would not in "{o}" — and got ahead.'), V('{a} sente que "{o}" foi uma chance perdida.', '{a} feels "{o}" was a missed chance.'), V('Enquanto você esperava em "{o}", {p} perdeu o embalo.', 'While you waited on "{o}", {p} lost momentum.')],
    aggrWin: [V('A briga de "{o}" virou manchete a seu favor.', 'The fight over "{o}" made headlines in your favour.'), V('{p} ganhou respeito no elenco depois de "{o}".', '{p} earned respect in the roster after "{o}".'), V('A dureza em "{o}" pôs ordem na casa: {a} entrou na linha.', 'Toughness in "{o}" set the house in order: {a} fell in line.')],
    aggrLose: [V('A briga de "{o}" custou caro: advogados e inimizades.', 'The fight over "{o}" cost dearly: lawyers and enemies.'), V('{p} não esqueceu "{o}" — e o clima azedou {w}.', '{p} has not forgotten "{o}" — and the mood soured {w}.'), V('"{o}" deixou cicatriz: {a} fala mal do selo pelos corredores.', '"{o}" left a scar: {a} badmouths the label in the hallways.')],
  },
  press: {
    riskWin: [V('A ousadia de "{o}" virou capa: {a} está em todas as rodas.', 'The daring of "{o}" made the cover: {a} is the talk of the town.'), V('Críticos que torceram o nariz para "{o}" agora elogiam {a}.', 'Critics who frowned at "{o}" now praise {a}.'), V('"{o}" pegou {w}: o público abraçou {a}.', '"{o}" caught on {w}: the public embraced {a}.')],
    riskLose: [V('A imprensa não perdoou "{o}": {a} paga a conta.', 'The press did not forgive "{o}": {a} pays the bill.'), V('"{o}" virou piada {w} e {a} sentiu no bolso.', '"{o}" became a joke {w} and {a} felt it in the wallet.'), V('O tiro de "{o}" saiu pela culatra: manchetes contra {a}.', '"{o}" backfired: headlines against {a}.')],
    generous: [V('Jornalistas lembram de "{o}": {a} tem boa imprensa.', 'Journalists remember "{o}": {a} gets good press.'), V('Uma coluna inteira sobre o gesto de "{o}" — e sobre {a}.', 'A whole column about the gesture in "{o}" — and about {a}.'), V('O bem feito em "{o}" voltou como reputação {w}.', 'The good done in "{o}" came back as reputation {w}.')],
    deceit: [V('Um repórter puxou o fio de "{o}": a versão oficial caiu.', 'A reporter pulled the thread of "{o}": the official story fell.'), V('A fachada de "{o}" rachou {w}; {a} está nas manchetes erradas.', 'The facade of "{o}" cracked {w}; {a} is in the wrong headlines.'), V('Um informante contou o que "{o}" escondia.', 'An informant told what "{o}" was hiding.')],
    cautWin: [V('Ficar quieto em "{o}" evitou a fogueira {w}.', 'Staying quiet on "{o}" avoided the bonfire {w}.'), V('A imprensa esqueceu "{o}" — exatamente como você queria.', 'The press forgot "{o}" — exactly as you wanted.'), V('O silêncio sobre "{o}" passou por elegância.', 'Silence about "{o}" passed for class.')],
    cautMiss: [V('Outro selo ocupou o espaço que "{o}" deixou vago {w}.', 'Another label took the space "{o}" left open {w}.'), V('Sem resposta em "{o}", a versão dos outros virou a oficial.', 'With no answer on "{o}", the others\' version became the official one.'), V('{a} sumiu das páginas depois de "{o}".', '{a} vanished from the pages after "{o}".')],
    aggrWin: [V('O contra-ataque de "{o}" ganhou a opinião pública.', 'The counter-attack in "{o}" won public opinion.'), V('"{o}" mostrou um selo que não se cala: {a} cresce {w}.', '"{o}" showed a label that does not back down: {a} grows {w}.'), V('A briga de "{o}" vendeu jornal — e discos de {a}.', 'The fight over "{o}" sold papers — and {a}\'s records.')],
    aggrLose: [V('A briga de "{o}" na imprensa custou caro: processos e inimigos.', 'The press fight over "{o}" cost dearly: lawsuits and enemies.'), V('"{o}" pegou mal {w}: {a} parece arrogante.', '"{o}" went down badly {w}: {a} looks arrogant.'), V('Advogados ainda cobram por "{o}".', 'Lawyers are still billing for "{o}".')],
  },
  market: {
    riskWin: [V('O risco de "{o}" deu lucro {w}: {a} colheu o que você arriscou.', 'The risk in "{o}" turned a profit {w}: {a} reaped what you risked.'), V('Os números de "{o}" vieram acima do previsto.', 'The numbers on "{o}" came in above forecast.'), V('"{o}" abriu uma porta {w} — e o caixa sentiu.', '"{o}" opened a door {w} — and the till felt it.')],
    riskLose: [V('"{o}" não fechou a conta {w}: o prejuízo ficou com {a}.', '"{o}" did not add up {w}: {a} was left with the loss.'), V('O mercado virou e "{o}" afundou.', 'The market turned and "{o}" sank.'), V('O contador franze a testa: "{o}" ainda dá prejuízo.', 'The accountant frowns: "{o}" is still losing money.')],
    generous: [V('Parceiros lembram do acordo justo de "{o}".', 'Partners remember the fair deal in "{o}".'), V('"{o}" rendeu boa vontade {w}: abrem-se portas para {a}.', '"{o}" earned goodwill {w}: doors open for {a}.'), V('O gesto de "{o}" voltou como preferência nos negócios.', 'The gesture in "{o}" came back as business preference.')],
    deceit: [V('A conta de "{o}" não fechou na auditoria {w}.', 'The books on "{o}" did not balance at the audit {w}.'), V('Um sócio descobriu a letra miúda de "{o}".', 'A partner found the fine print of "{o}".'), V('O jeitinho de "{o}" apareceu num balanço {w}.', 'The shortcut in "{o}" showed up on a balance sheet {w}.')],
    cautWin: [V('Não entrar em "{o}" poupou o caixa {w}.', 'Staying out of "{o}" spared the cash {w}.'), V('Quem entrou no lugar de "{o}" quebrou a cara; você não.', 'Whoever went in on "{o}" fell flat; you did not.'), V('A prudência de "{o}" pareceu sábia no fim do trimestre.', 'The prudence of "{o}" looked wise at quarter end.')],
    cautMiss: [V('Um rival fez o que você não quis em "{o}" — e saiu na frente.', 'A rival did what you would not in "{o}" — and got ahead.'), V('O negócio de "{o}" foi para outro selo e deu certo lá.', 'The "{o}" deal went to another label and worked there.'), V('{a} olha para "{o}" como dinheiro deixado na mesa.', '{a} sees "{o}" as money left on the table.')],
    aggrWin: [V('A queda de braço de "{o}" terminou com acordo melhor.', 'The arm-wrestling over "{o}" ended in a better deal.'), V('"{o}" mostrou ao mercado que o selo cobra o que vale.', '"{o}" showed the market the label charges what it\'s worth.'), V('A pressão de "{o}" dobrou a outra parte {w}.', 'The pressure in "{o}" bent the other side {w}.')],
    aggrLose: [V('A briga de "{o}" custou caro: advogados e inimizades.', 'The fight over "{o}" cost dearly: lawyers and enemies.'), V('"{o}" acabou no tribunal {w} — e a conta veio.', '"{o}" ended up in court {w} — and the bill came.'), V('O mercado lembra de "{o}" e fecha a porta para {a}.', 'The market remembers "{o}" and shuts the door on {a}.')],
  },
  road: {
    riskWin: [V('A estrada recompensou "{o}": {a} lotou casas {w}.', 'The road rewarded "{o}": {a} packed venues {w}.'), V('O risco de "{o}" virou turnê lembrada.', 'The risk in "{o}" became a tour people remember.'), V('Depois de "{o}", {p} sobe ao palco como dono dele.', 'After "{o}", {p} takes the stage like they own it.')],
    riskLose: [V('"{o}" deu errado {w}: datas canceladas e a conta para {a}.', '"{o}" went wrong {w}: dates cancelled and the bill for {a}.'), V('A noite que "{o}" prometia virou prejuízo.', 'The night "{o}" promised turned into a loss.'), V('{p} ainda sente "{o}" no corpo e no bolso.', '{p} still feels "{o}" in body and wallet.')],
    generous: [V('A banda lembra de "{o}" toda vez que sobe ao palco.', 'The band remembers "{o}" every time they hit the stage.'), V('"{o}" virou lenda de camarim: {a} confia no selo.', '"{o}" became dressing-room legend: {a} trusts the label.'), V('Equipe e banda falam de "{o}" com carinho {w}.', 'Crew and band speak fondly of "{o}" {w}.')],
    deceit: [V('O que se escondeu em "{o}" apareceu na estrada.', 'What was hidden in "{o}" showed up on the road.'), V('Um roadie contou a história real de "{o}".', 'A roadie told the real story of "{o}".'), V('"{o}" não colou {w}: {a} soube a verdade.', '"{o}" did not hold {w}: {a} learned the truth.')],
    cautWin: [V('Não forçar em "{o}" poupou a banda {w}.', 'Not forcing "{o}" spared the band {w}.'), V('Descansar em vez de "{o}" devolveu a voz de {p}.', 'Resting instead of "{o}" gave {p} their voice back.'), V('A agenda leve depois de "{o}" fez bem a {a}.', 'The light schedule after "{o}" did {a} good.')],
    cautMiss: [V('Outra banda ocupou a data que "{o}" deixou livre.', 'Another band took the date "{o}" left open.'), V('{a} perdeu o embalo da estrada depois de "{o}".', '{a} lost road momentum after "{o}".'), V('Um rival fez o que você não quis em "{o}" — e saiu na frente.', 'A rival did what you would not in "{o}" — and got ahead.')],
    aggrWin: [V('A firmeza de "{o}" garantiu cachê melhor {w}.', 'Firmness in "{o}" secured a better fee {w}.'), V('Promotores aprenderam com "{o}": {a} não aceita qualquer coisa.', 'Promoters learned from "{o}": {a} does not take just anything.'), V('"{o}" virou fama de banda que se impõe.', '"{o}" became a reputation as a band that stands its ground.')],
    aggrLose: [V('A briga de "{o}" fechou portas na estrada.', 'The fight over "{o}" closed doors on the road.'), V('"{o}" custou datas e um processo {w}.', '"{o}" cost dates and a lawsuit {w}.'), V('Casas lembram de "{o}" e não chamam {a}.', 'Venues remember "{o}" and do not call {a}.')],
  },
  studio: {
    riskWin: [V('O experimento de "{o}" deu certo {w}: {a} soa à frente do tempo.', 'The experiment in "{o}" worked {w}: {a} sounds ahead of its time.'), V('"{o}" rendeu um som que todo mundo quer copiar.', '"{o}" produced a sound everyone wants to copy.'), V('A aposta de "{o}" virou diferencial do selo.', 'The bet in "{o}" became the label\'s edge.')],
    riskLose: [V('"{o}" queimou dinheiro {w} sem render um disco.', '"{o}" burned money {w} without yielding a record.'), V('A tecnologia de "{o}" envelheceu antes de pagar.', 'The tech in "{o}" aged before it paid off.'), V('O estúdio ainda paga a conta de "{o}".', 'The studio is still paying for "{o}".')],
    generous: [V('Quem você apoiou em "{o}" voltou com ideias novas.', 'Whoever you backed in "{o}" came back with new ideas.'), V('"{o}" criou boa vontade {w}: técnicos querem trabalhar com {a}.', '"{o}" built goodwill {w}: engineers want to work with {a}.'), V('O favor de "{o}" voltou como uma demo de primeira.', 'The favour in "{o}" came back as a first-rate demo.')],
    deceit: [V('O atalho de "{o}" apareceu na ficha técnica {w}.', 'The shortcut in "{o}" showed up in the credits {w}.'), V('Alguém do estúdio contou o que houve em "{o}".', 'Someone at the studio told what happened in "{o}".'), V('"{o}" não colou: a versão oficial caiu.', '"{o}" did not hold: the official story fell.')],
    cautWin: [V('Esperar em "{o}" evitou uma tecnologia que não pegou.', 'Waiting on "{o}" avoided a technology that did not catch on.'), V('A cautela de "{o}" poupou o orçamento do estúdio.', 'Caution in "{o}" spared the studio budget.'), V('Não entrar em "{o}" foi a escolha certa {w}.', 'Staying out of "{o}" was the right call {w}.')],
    cautMiss: [V('Um rival fez o que você não quis em "{o}" — e saiu na frente.', 'A rival did what you would not in "{o}" — and got ahead.'), V('O som que "{o}" prometia saiu por outro selo.', 'The sound "{o}" promised came out on another label.'), V('{a} ficou para trás depois de "{o}".', '{a} fell behind after "{o}".')],
    aggrWin: [V('A insistência de "{o}" rendeu a melhor gravação de {a}.', 'Insisting on "{o}" yielded {a}\'s best recording.'), V('"{o}" mostrou quem manda no estúdio — e funcionou.', '"{o}" showed who runs the studio — and it worked.'), V('A cobrança de "{o}" virou disco premiado.', 'The pressure in "{o}" became an award-winning record.')],
    aggrLose: [V('A briga de "{o}" custou caro: advogados e inimizades.', 'The fight over "{o}" cost dearly: lawyers and enemies.'), V('"{o}" esvaziou o estúdio: técnicos não querem voltar.', '"{o}" emptied the studio: engineers will not come back.'), V('A pressão de "{o}" quebrou a sessão {w}.', 'The pressure in "{o}" broke the session {w}.')],
  },
};

const hash = (x: string): number => { let h = 2166136261; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const nm = (f: Fx18): L => (f.act ? l(f.act.name, f.act.name) : l('o selo', 'the label'));
/** Texto do eco padrão: variante (hash do id do eco) com ator e objeto. */
export function echoText28(f: Fx18, out: Out28, cat: string, w: L): L {
  const g = GROUP28[cat] ?? 'press';
  const list = VARIANTS28[g][out];
  const v = list[hash(`${f.c.e18 ?? ''}:${out}`) % list.length];
  const o = f.t ?? l('aquela decisão', 'that decision');
  return fmtL(v, { a: nm(f), p: f.person?.name ?? nm(f), o, w });
}
/** Dinheiro do eco padrão (US$ reais): piso = valor antigo (base × fama); escala com 2% da receita anual, teto 8% e 12×. */
export function stake28(f: Fx18, base: number): number {
  const fm = 0.7 + (f.act?.fame ?? 25) / 80;
  const s0 = Math.round(base * fm);
  const k = money(f.s, 10000) / 10000;
  const rev = annualRev28(f.s);
  if (!(k > 0) || !(rev > 0)) return s0;
  const c0 = s0 * k;
  const c = Math.max(c0, Math.min(rev * 0.02 * fm, rev * 0.08, c0 * 12));
  return Math.round(c / k);
}
