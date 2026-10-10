// Rodada 18 (decide18) — ECOS das decisões existentes: 57 escolhas de events.ts/events_more.ts, respostas da Caixa
// e ações sobre pessoas ganharam consequências ATRASADAS (algumas só depois, outras agora e depois). Cada eco tem
// janela em meses, chance (às vezes lida do estado), condição no disparo e uma dica sem spoiler para o cartão.

import { Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerConseq18, type Ctx18, type EchoSpec18, type Fx18 } from '../decide18';
import { emitEvent } from '../events';
import { grantHold } from '../holds17';
import { scandal } from '../scandal17';
import type { GameState } from '../types';
import { fmtL, staffSkill } from '../util';
import { adjRel18 } from './agency18';

const E = (key: string, ...later: EchoSpec18[]) => registerConseq18(`ev:${key}`, { later });
const N = (pt: string, en: string): L => l(pt, en);
const actN = (f: Fx18): string => f.act?.name ?? '—';
const perN = (f: Fx18): string => f.person?.name ?? actN(f);
const T = (f: Fx18, pt: string, en: string): L => fmtL(l(pt, en), { a: actN(f), p: perN(f) });
/** follow-up: abre um novo cartão (decisão em várias etapas) se a mesa tiver espaço */
export function follow18(f: Fx18, id: string, c: Ctx18 = f.c): boolean {
  if (f.s.decisions.length >= 6) return false;
  const n = f.s.decisions.length;
  emitEvent(f.s, Rng.fromSeed(`${f.s.config.seed}:fol18:${id}:${f.s.week}`), id, c);
  return f.s.decisions.length > n;
}
const scan = (f: Fx18, kind: Parameters<typeof scandal>[2], sev: number, text: L): void => {
  const a = f.act;
  if (a) scandal(f.s, a.id, kind, sev, text, { person: f.person?.id, text });
};
const stillMine = (s: GameState, c: Ctx18) => s.acts[String(c.act)]?.owner === 'player';

// ---------------------------------------------------------------- saúde e pessoas
E('burnout:push',
  { in: [2, 6], p: 0.45, tone: 'bad', hint: N('O corpo cobra a conta.', 'The body sends the bill.'),
    fx: (f) => { f.mood('stress', 15).mood('fatigue', 15).fame(-2).cash(-2500, 'Show cancelado'); return T(f, '{a} desmoronou no palco: show cancelado, a conta do mês passado chegou.', '{a} collapsed on stage: show cancelled, last month\'s bill came due.'); } });
E('burnout:pause',
  { in: [4, 8], p: 0.6, tone: 'good', hint: N('O descanso pode virar disco.', 'Rest may turn into a record.'),
    fx: (f) => { f.mood('inspiration', 15).mood('morale', 8).trust(4); return T(f, '{a} voltou da pausa com caderno cheio de canções.', '{a} came back from the break with a notebook full of songs.'); } });
E('burnout:therapy',
  { in: [5, 10], p: 0.5, tone: 'good', hint: N('Terapia leva tempo — e às vezes funciona.', 'Therapy takes time — and sometimes works.'),
    fx: (f) => { f.mood('stress', -10).mood('inspiration', 8).trust(5); return T(f, 'A terapia de {a} deu frutos: menos crises, mais foco.', '{a}\'s therapy paid off: fewer crises, more focus.'); } });
E('voice_strain:push',
  { in: [2, 6], p: 0.5, tone: 'bad', hint: N('A voz pode não aguentar.', 'The voice may not hold.'),
    fx: (f) => { const p = f.person; if (p) p.health = 'voice_strain'; f.mood('stress', 12).fame(-1); return T(f, 'A voz de {p} falhou de novo — agora no meio de uma transmissão.', '{p}\'s voice failed again — this time mid-broadcast.'); } });
E('voice_strain:surgery',
  { in: [6, 12], p: 0.35, tone: 'mixed', hint: N('A voz depois da cirurgia nunca é a mesma.', 'The voice after surgery is never the same.'),
    fx: (f) => { const up = f.r.chance(0.55); if (up) f.mood('inspiration', 10).fame(1); else f.mood('morale', -10); return up ? T(f, 'Timbre novo: {p} canta mais grave e a crítica adorou.', 'New timbre: {p} sings lower and critics loved it.') : T(f, '{p} perdeu as notas altas. O repertório precisa mudar.', '{p} lost the high notes. The setlist must change.'); } });
E('addiction:cover',
  { in: [4, 12], p: 0.55, tone: 'bad', hint: N('Segredos têm prazo de validade.', 'Secrets have an expiry date.'),
    fx: (f) => { if (!follow18(f, 'coverup_exposed', { act: f.act?.id ?? '' })) scan(f, 'drugs', 35, T(f, 'O caso abafado de {a} vazou.', 'The {a} cover-up leaked.')); return T(f, 'Um ex-roadie de {a} está falando com a imprensa.', 'A former {a} roadie is talking to the press.'); } });
E('addiction:treatment',
  { in: [6, 12], p: 0.6, tone: 'good', hint: N('Sobriedade às vezes vira o melhor disco.', 'Sobriety sometimes becomes the best record.'),
    fx: (f) => { f.mood('inspiration', 12).mood('morale', 8).trust(8); return T(f, '{p} completou seis meses limpo e quer gravar sobre isso.', '{p} is six months clean and wants to record about it.'); } });
E('addiction:ignore',
  { in: [2, 6], p: 0.5, tone: 'bad', hint: N('Ignorar não faz o problema sumir.', 'Ignoring doesn\'t make it go away.'),
    fx: (f) => { f.mood('stress', 15).mood('morale', -10); scan(f, 'drugs', 30, T(f, '{p} foi levado(a) ao hospital depois de uma festa.', '{p} was taken to hospital after a party.')); return T(f, 'Susto: {p} parou no hospital. O elenco culpa o selo.', 'Scare: {p} ended up in hospital. The roster blames the label.'); } });
E('coverup_exposed:deny',
  { in: [3, 9], p: 0.5, tone: 'bad', hint: N('Uma mentira pública pede provas.', 'A public lie invites evidence.'),
    fx: (f) => { f.rep('institutional', -6).rep('artists', -4).trust(-6); return T(f, 'Apareceram recibos da clínica: a negação de {a} desmoronou.', 'Clinic receipts surfaced: the {a} denial collapsed.'); } });
E('grief:support',
  { in: [6, 12], p: 0.55, tone: 'good', hint: N('Luto respeitado vira lealdade.', 'Respected grief turns into loyalty.'),
    fx: (f) => { f.mood('inspiration', 15).trust(6); return T(f, '{a} escreveu uma homenagem — e agradece ao selo no encarte.', '{a} wrote a tribute — and thanks the label in the liner notes.'); } });
E('grief:work',
  { in: [3, 8], p: 0.4, tone: 'bad', hint: N('Dor guardada não some.', 'Bottled grief doesn\'t vanish.'),
    fx: (f) => { f.mood('stress', 18).mood('resentment', 10); return T(f, '{a} desabou numa entrevista: "o selo não nos deixou chorar".', '{a} broke down in an interview: "the label wouldn\'t let us grieve".'); } });
E('wedding:publicize',
  { in: [6, 18], p: 0.45, tone: 'mixed', hint: N('Casamento na capa vira novela.', 'A cover wedding becomes a soap opera.'),
    fx: (f) => { const ok = f.r.chance(0.5); if (ok) f.fans(3); else f.mood('stress', 10); return ok ? T(f, 'Bodas de papel de {p} na capa de novo: os fãs adoram.', '{p}\'s first anniversary on the cover again: fans love it.') : T(f, 'Tabloides falam em crise no casamento de {p}.', 'Tabloids talk of a marriage crisis for {p}.'); } });
E('child_born:insist',
  { in: [6, 12], p: 0.6, tone: 'bad', hint: N('Quem perdeu o nascimento do filho não esquece.', 'Those who missed their child\'s birth don\'t forget.'),
    fx: (f) => { f.mood('resentment', 20).trust(-8); if (f.r.chance(0.35) && f.person) follow18(f, 'member_leaves'); return T(f, '{p} ainda não perdoou a turnê no mês do parto.', '{p} still hasn\'t forgiven the tour in the birth month.'); } });
E('child_born:accept',
  { in: [6, 12], p: 0.5, tone: 'good', hint: N('Gestos assim são lembrados.', 'Gestures like this are remembered.'),
    fx: (f) => { f.trust(8).mood('morale', 8); return T(f, '{p} voltou e declarou: "esse selo é família".', '{p} came back and said: "this label is family".'); } });
E('member_leaves:convince',
  { in: [5, 10], p: 0.8, tone: 'mixed', hint: N('Uma promessa precisa ser cumprida.', 'A promise needs keeping.'),
    when: (s, c) => (s.persons[String(c.person)]?.morale ?? 0) >= 55,
    fx: (f) => { f.mood('morale', 6).trust(4); return T(f, 'Promessa cumprida: {p} ficou e renovou o compromisso com {a}.', 'Promise kept: {p} stayed and renewed the commitment to {a}.'); },
    miss: (f) => { f.mood('resentment', 12).trust(-6); if (f.r.chance(0.5)) follow18(f, 'member_leaves'); return T(f, 'Promessa quebrada: {p} sente que o bônus comprou só tempo.', 'Promise broken: {p} feels the bonus only bought time.'); } });
E('member_leaves:smaller',
  { in: [3, 6], p: 0.5, tone: 'mixed', hint: N('Bandas menores às vezes ficam mais unidas.', 'Smaller bands sometimes grow tighter.'),
    fx: (f) => { const ok = f.r.chance(0.55); if (ok) f.mood('morale', 10).mood('inspiration', 6); else f.mood('fatigue', 12); return ok ? T(f, '{a} em formação enxuta soa mais cru — e melhor.', 'Stripped-down {a} sounds rawer — and better.') : T(f, '{a} está sobrecarregado sem o integrante que saiu.', '{a} is overstretched without the member who left.'); } });
E('credit_dispute:main',
  { in: [4, 10], p: 0.55, tone: 'bad', hint: N('Quem ficou sem crédito guarda a conta.', 'The uncredited keep score.'),
    fx: (f) => { f.mood('resentment', 15); const a = f.act; if (a?.members.length) grantHold(f.s, { holder: a.members[a.members.length - 1], target: 'player', kind: 'grievance', strength: 40, text: l('Crédito negado na composição', 'Denied songwriting credit'), months: 24, src: 'decide18' }); return T(f, 'Um integrante de {a} contratou advogado por causa do crédito.', 'A {a} member hired a lawyer over the credit.'); } });
E('credit_dispute:equal',
  { in: [4, 10], p: 0.45, tone: 'good', hint: N('Divisão justa cria parceria.', 'Fair splits build partnerships.'),
    fx: (f) => { f.mood('morale', 8).mood('inspiration', 6); return T(f, '{a} está compondo junto como nunca.', '{a} is writing together like never before.'); } });
E('creative_block:wait',
  { in: [2, 8], p: 0.5, tone: 'mixed', hint: N('Esperar pode destravar — ou não.', 'Waiting may unblock — or not.'),
    fx: (f) => { const ok = f.r.chance(0.6); if (ok) f.mood('inspiration', 20); else f.momentum(-8); return ok ? T(f, 'Do nada, {a} destravou: três canções numa semana.', 'Out of nowhere, {a} unblocked: three songs in a week.') : T(f, '{a} continua travado e o público esquece.', '{a} is still blocked and the audience forgets.'); } });
E('creative_block:cowrite',
  { in: [6, 12], p: 0.3, tone: 'bad', hint: N('Coautores têm memória (e advogados).', 'Co-writers have memories (and lawyers).'),
    fx: (f) => { f.cash(-2000, 'Acordo de coautoria', 'legal'); return T(f, 'Um compositor contratado diz que merecia mais pontos em {a}.', 'A hired writer says they deserved more points on {a}.'); } });
E('genre_shift:refuse',
  { in: [6, 12], p: 0.5, tone: 'bad', hint: N('Artista contido pode procurar a porta.', 'A restrained artist may look for the door.'),
    fx: (f) => { f.mood('resentment', 12).trust(-6).momentum(-5); return T(f, '{a} grava escondido o disco que o selo vetou.', '{a} secretly records the album the label vetoed.'); } });
E('genre_shift:allow',
  { in: [5, 10], p: 0.6, tone: 'mixed', hint: N('Fãs antigos ou fãs novos — talvez os dois.', 'Old fans or new fans — maybe both.'),
    fx: (f) => { const ok = f.r.chance(0.5 + (f.act?.trust ?? 50) / 400); if (ok) f.fans(6).mood('morale', 6); else f.fans(-5); return ok ? T(f, 'A virada de {a} achou um público novo.', '{a}\'s pivot found a new audience.') : T(f, 'Fãs antigos de {a} queimaram discos na porta do show.', 'Old {a} fans burned records outside the show.'); } });
E('controversial_remark:double_down',
  { in: [2, 6], p: 0.5, tone: 'bad', hint: N('Briga pública costuma ter segundo round.', 'Public fights usually get a second round.'),
    fx: (f) => { if (!follow18(f, 'boycott', { act: f.act?.id ?? '' })) f.fans(-3); return T(f, 'A frase de {a} virou campanha de boicote.', '{a}\'s remark became a boycott campaign.'); } });
E('controversial_remark:silence',
  { in: [6, 14], p: 0.3, tone: 'bad', hint: N('O assunto pode voltar num aniversário.', 'It may resurface on an anniversary.'),
    fx: (f) => { f.fame(-1).mood('stress', 6); return T(f, 'Um ano depois, a declaração de {a} voltou a circular.', 'A year later, {a}\'s statement is circulating again.'); } });
E('controversial_remark:apologize',
  { in: [4, 10], p: 0.35, tone: 'good', hint: N('Desculpa sincera pode ser lembrada.', 'A sincere apology may be remembered.'),
    fx: (f) => { f.rep('institutional', 2).fans(1); return T(f, 'Uma ONG elogiou a forma como {a} se retratou.', 'An NGO praised how {a} made amends.'); } });
E('leak:embrace',
  { in: [2, 6], p: 0.6, tone: 'good', hint: N('Fãs lembram de quem os tratou bem.', 'Fans remember who treated them well.'),
    fx: (f) => { f.fans(4).momentum(5); return T(f, 'Os fãs que baixaram o vazamento de {a} compraram ingresso.', 'The fans who grabbed the {a} leak bought tickets.'); } });
E('leak:takedown',
  { in: [3, 8], p: 0.4, tone: 'bad', hint: N('Processar fã raramente pega bem.', 'Suing fans rarely looks good.'),
    fx: (f) => { f.rep('artists', -2).fans(-2); return T(f, 'Um fã processado por causa de {a} virou mártir na internet.', 'A fan sued over {a} became an internet martyr.'); } });
E('tv_invite:decline',
  { in: [6, 12], p: 0.4, tone: 'bad', hint: N('Produtores de TV têm memória longa.', 'TV producers have long memories.'),
    fx: (f) => { f.fame(-1).rep('commercial', -1); return T(f, 'O programa que {a} recusou convidou o rival — e o rival estourou.', 'The show {a} declined booked the rival — and the rival blew up.'); } });
E('tv_invite:accept',
  { in: [3, 9], p: 0.4, tone: 'good', hint: N('A reprise pode render mais que a estreia.', 'The rerun may pay more than the premiere.'),
    fx: (f) => { f.fans(2).cash(800, 'Reprise na TV', 'licensing'); return T(f, 'A participação de {a} foi reprisada no horário nobre.', '{a}\'s appearance was rerun in prime time.'); } });
E('festival_invite:decline',
  { in: [10, 14], p: 0.5, tone: 'bad', hint: N('Festivais não convidam duas vezes quem recusa.', 'Festivals rarely ask twice.'),
    fx: (f) => { f.rep('commercial', -2); return T(f, 'O festival fechou o line-up sem {a} — "não respondem a gente".', 'The festival locked its line-up without {a} — "they don\'t answer us".'); } });
E('festival_invite:accept',
  { in: [8, 13], p: 0.45, tone: 'good', hint: N('Uma boa tarde no festival abre portas.', 'A good festival set opens doors.'),
    fx: (f) => { f.fans(3).fame(1); return T(f, 'O festival chamou {a} de volta — agora num horário melhor.', 'The festival invited {a} back — in a better slot.'); } });
E('residency_offer:accept',
  { in: [4, 9], p: 0.45, tone: 'mixed', hint: N('Residência rende, mas cansa.', 'Residencies pay, but wear you out.'),
    fx: (f) => { const ok = f.r.chance(0.5); if (ok) f.cash(2500, 'Residência estendida', 'live'); else f.mood('fatigue', 15); return ok ? T(f, 'A casa estendeu a residência de {a}.', 'The venue extended {a}\'s residency.') : T(f, '{a} está exausto das mesmas noites, mesmo palco.', '{a} is exhausted by the same nights, same stage.'); } });
E('stage_accident:fight',
  { in: [6, 12], p: 0.75, tone: 'mixed', hint: N('Justiça é loteria — com advogado melhor, menos.', 'Courts are a lottery — less so with a good lawyer.'),
    fx: (f) => { const win = f.r.chance(0.35 + staffSkill(f.s, 'legal') / 250); if (win) f.cash(3000, 'Ganho de causa', 'legal'); else f.cash(-12000, 'Indenização', 'legal').rep('institutional', -3); return win ? T(f, 'O tribunal deu razão ao selo no acidente do show de {a}.', 'The court sided with the label on the {a} accident.') : T(f, 'Derrota no tribunal: indenização pelo acidente no show de {a}.', 'Court loss: damages for the {a} show accident.'); } });
E('stage_accident:pay',
  { in: [4, 10], p: 0.35, tone: 'good', hint: N('Pagar sem briga pode virar boa vontade.', 'Paying without a fight may build goodwill.'),
    fx: (f) => { f.rep('institutional', 3); return T(f, 'A família do ferido agradeceu publicamente ao selo e a {a}.', 'The injured fan\'s family publicly thanked the label and {a}.'); } });
E('sync_offer:license',
  { in: [3, 9], p: 0.5, tone: 'good', hint: N('Uma cena bem colocada faz catálogo voltar.', 'A well-placed scene revives catalog.'),
    fx: (f) => { f.fans(3).cash(1500, 'Sync: bônus de audiência', 'sync'); return T(f, 'O filme com a música de {a} estourou: catálogo vendendo de novo.', 'The film with {a}\'s song is a hit: catalog selling again.'); } });
E('sampling_claim:fight',
  { in: [4, 10], p: 0.8, tone: 'mixed', hint: N('Ganhar devolve dinheiro; perder custa o dobro.', 'Winning returns money; losing costs double.'),
    fx: (f) => { const win = f.r.chance(0.4 + staffSkill(f.s, 'legal') / 300); if (win) f.cash(4000, 'Sampling: vitória', 'legal'); else f.cash(-10000, 'Sampling: derrota', 'legal'); return win ? N('Vitória no caso do sampling: o juiz chamou de uso transformativo.', 'Sampling case won: the judge called it transformative use.') : N('Derrota no caso do sampling: custas e royalties retroativos.', 'Sampling case lost: costs and back royalties.'); } });
E('royalty_audit:stall',
  { in: [3, 9], p: 0.6, tone: 'bad', hint: N('Enrolar auditoria costuma virar processo.', 'Stalling an audit tends to become a lawsuit.'),
    fx: (f) => { f.trust(-10).cash(-6000, 'Processo de royalties', 'legal').rep('artists', -3); return T(f, '{a} processou o selo por royalties atrasados.', '{a} sued the label over late royalties.'); } });
E('royalty_audit:open',
  { in: [4, 10], p: 0.45, tone: 'good', hint: N('Transparência vira reputação entre artistas.', 'Transparency becomes reputation among artists.'),
    fx: (f) => { f.trust(6).rep('artists', 3); return T(f, '{a} conta em entrevistas que o selo "abriu os livros sem medo".', '{a} tells interviewers the label "opened the books without fear".'); } });
E('payola_offer:pay',
  { in: [3, 8], p: 0.45, tone: 'bad', hint: N('Quem aceita dinheiro por fora pede mais.', 'Those who take under-the-table money ask for more.'),
    fx: (f) => { f.cash(-1500, 'DJ: "manutenção"', 'marketing'); return N('O DJ voltou: quer uma "manutenção" mensal para continuar calado.', 'The DJ is back: wants a monthly "upkeep" to keep quiet.'); } });
E('payola_exposed:deny',
  { in: [3, 9], p: 0.4, tone: 'bad', hint: N('A investigação ainda não terminou.', 'The investigation isn\'t over.'),
    fx: (f) => { f.rep('institutional', -5).cash(-8000, 'Jabá: novas provas', 'legal'); return N('Um ex-funcionário entregou planilhas do jabá ao promotor.', 'A former employee handed the payola spreadsheets to the prosecutor.'); } });
E('boycott:stand',
  { in: [6, 12], p: 0.5, tone: 'good', hint: N('Obra defendida pode virar culto.', 'A defended work may become a cult classic.'),
    fx: (f) => { f.rep('artistic', 3).fans(3); return T(f, 'O disco boicotado de {a} virou objeto de culto.', 'The boycotted {a} record became a cult object.'); } });
E('boycott:edit',
  { in: [4, 10], p: 0.4, tone: 'bad', hint: N('Artista censurado pelo próprio selo não esquece.', 'An artist censored by their own label doesn\'t forget.'),
    fx: (f) => { f.trust(-8).mood('resentment', 10); return T(f, '{a} lançou a letra original no show — e criticou o selo no microfone.', '{a} sang the original lyric live — and criticized the label on mic.'); } });
E('rival_poach:let_go',
  { in: [8, 18], p: 0.4, tone: 'mixed', hint: N('Quem sai às vezes volta — ou brilha longe.', 'Those who leave sometimes return — or shine elsewhere.'),
    fx: (f) => { const a = f.act; const ok = !!a && a.owner !== 'player' && f.r.chance(0.5); if (ok) f.rep('artists', 2); else f.rep('commercial', -1); return ok ? T(f, '{a} elogiou o selo antigo: "saímos amigos". Artistas notaram.', '{a} praised their old label: "we left as friends". Artists noticed.') : T(f, '{a} estourou no rival. A imprensa lembra quem deixou ir.', '{a} broke out at the rival. The press remembers who let them go.'); } });
E('rival_poach:counter',
  { in: [6, 12], p: 0.5, tone: 'mixed', hint: N('Bônus compra tempo, não amor.', 'A bonus buys time, not love.'), when: stillMine,
    fx: (f) => { const ok = (f.act?.trust ?? 0) >= 50; if (ok) f.trust(5); else f.mood('resentment', 6); return ok ? T(f, '{a} está em paz com a renovação.', '{a} is at peace with the renewal.') : T(f, '{a} comenta que "ficou pelo dinheiro".', '{a} says they "stayed for the money".'); } });
E('investor_offer:accept',
  { in: [10, 20], p: 0.55, tone: 'bad', hint: N('Investidor quer voz nas decisões.', 'Investors want a say.'),
    fx: (f) => { f.rep('artistic', -2); return N('O investidor exige "foco no comercial" e cadeira nas reuniões de A&R.', 'The investor demands "commercial focus" and a seat in A&R meetings.'); } });
E('scene_explosion:invest',
  { in: [5, 12], p: 0.6, tone: 'good', hint: N('Quem apoiou a cena cedo colhe depois.', 'Early scene backers reap later.'),
    fx: (f) => { f.rep('artistic', 3).rep('artists', 2); return N('A cena que você apoiou lembra: bandas novas mandam demos primeiro para você.', 'The scene you backed remembers: new bands send you demos first.'); } });
E('censorship:edit',
  { in: [5, 12], p: 0.35, tone: 'bad', hint: N('A versão editada pode envergonhar depois.', 'The edited version may embarrass later.'),
    fx: (f) => { f.trust(-5).rep('artistic', -1); return T(f, 'A versão editada de {a} virou piada entre críticos.', 'The edited {a} version became a running joke among critics.'); } });
E('voice_license:force',
  { in: [4, 10], p: 0.6, tone: 'bad', hint: N('Clonar sem perguntar vaza.', 'Cloning without asking leaks.'),
    fx: (f) => { f.trust(-15); scan(f, 'conduct', 30, T(f, '{a} descobriu que a voz foi licenciada sem consentimento.', '{a} found out their voice was licensed without consent.')); return T(f, '{a} descobriu o licenciamento da voz e foi à imprensa.', '{a} discovered the voice licence and went to the press.'); } });
E('distress_sale:sell_catalog',
  { in: [12, 24], p: 0.5, tone: 'bad', hint: N('Vender na baixa dói depois.', 'Selling at the bottom hurts later.'),
    fx: (f) => { f.rep('commercial', -1); return N('Os masters que você vendeu na crise valem o triplo agora — a imprensa lembrou.', 'The masters you sold in the crisis are worth triple now — the press noticed.'); } });
E('human_movement:join',
  { in: [6, 12], p: 0.5, tone: 'good', hint: N('Ficar do lado dos humanos pode ser lembrado.', 'Siding with humans may be remembered.'),
    fx: (f) => { f.rep('artists', 3).rep('artistic', 2); return N('O movimento "Feito por Humanos" cita o selo como exemplo.', 'The "Made by Humans" movement cites the label as an example.'); } });
E('clone_without_consent:ignore',
  { in: [4, 10], p: 0.5, tone: 'bad', hint: N('Clone ignorado se multiplica.', 'Ignored clones multiply.'),
    fx: (f) => { f.trust(-8).fans(-3); return T(f, 'Os clones de {a} se multiplicaram e diluíram o nome.', 'Clones of {a} multiplied and diluted the name.'); } });
E('reunion:sign',
  { in: [4, 9], p: 0.7, tone: 'mixed', hint: N('Reunião: nostalgia ou briga antiga.', 'Reunions: nostalgia or old fights.'),
    fx: (f) => { const ok = f.r.chance(0.55); if (ok) f.fans(5).fame(2); else f.mood('resentment', 15); return ok ? T(f, 'A volta de {a} lotou ginásios.', 'The {a} comeback filled arenas.') : T(f, 'Brigas antigas voltaram nos ensaios de {a}.', 'Old fights came back in {a} rehearsals.'); } });
E('label_offer_band:indie',
  { in: [8, 16], p: 0.4, tone: 'good', hint: N('Independência pode virar bandeira.', 'Independence can become a banner.'),
    fx: (f) => { f.rep('artistic', 3).fans(2); return T(f, 'A crítica celebra {a} como "a banda que disse não".', 'Critics hail {a} as "the band that said no".'); } });
E('pressing_backlog:wait',
  { in: [1, 3], p: 0.35, tone: 'bad', hint: N('Lojas não gostam de esperar.', 'Shops don\'t like waiting.'),
    fx: (f) => { f.rep('commercial', -1); return N('Duas redes de lojas reduziram o pedido do próximo lançamento.', 'Two retail chains cut their order for the next release.'); } });
// events_more (eras antigas)
E('radio_queen_contest:buy',
  { in: [2, 6], p: 0.45, tone: 'bad', hint: N('Cupons comprados deixam rastro.', 'Bought coupons leave a trail.'),
    fx: (f) => { f.fame(-2); scan(f, 'money', 20, T(f, 'A compra de cupons para {a} foi descoberta.', 'The coupon-buying for {a} was uncovered.')); return T(f, 'O jornal da rádio descobriu a compra de cupons para {a}.', 'The radio paper uncovered the coupon-buying for {a}.'); } });
E('jukebox_route:exclusive',
  { in: [3, 8], p: 0.5, tone: 'mixed', hint: N('Exclusividade pode prender ou proteger.', 'Exclusivity can trap or protect.'),
    fx: (f) => { const ok = f.r.chance(0.55); if (ok) f.cash(1200, 'Jukebox: bônus', 'licensing'); else f.fans(-2); return ok ? N('O operador da jukebox pagou bônus: a ficha não para de cair.', 'The jukebox operator paid a bonus: the coins keep dropping.') : N('Bares de fora da rota nunca ouviram a música.', 'Bars off the route never heard the song.'); } });
E('member_drafted:sub',
  { in: [8, 18], p: 0.5, tone: 'mixed', hint: N('Quem volta da guerra encontra o lugar ocupado.', 'Those back from war find their seat taken.'),
    fx: (f) => { f.mood('resentment', 10); return T(f, 'O convocado voltou e encontrou o substituto no lugar em {a}.', 'The drafted member returned to find the sub in their spot in {a}.'); } });

// ---------------------------------------------------------------- respostas da Caixa e ações sobre pessoas
registerConseq18('pa:favor:ok', { later: [{ in: [3, 10], p: 0.6, tone: 'bad', hint: N('Favor pedido é favor devido.', 'A favor asked is a favor owed.'),
  fx: (f) => { f.cash(-1500, 'Favor devolvido'); return fmtL(l('{p} veio cobrar o favor: você pagou uma conta de jantar beneficente.', '{p} came to collect: you covered a charity dinner bill.'), { p: perN(f) }); } }] });
registerConseq18('pa:rumor:ok', { later: [{ in: [3, 9], p: 0.35, tone: 'bad', hint: N('Boato tem endereço de volta.', 'Rumors have a return address.'),
  fx: (f) => { f.rep('institutional', -4); if (f.c.pk) adjRel18(f.s, String(f.c.pk), 'player', -25, l('descobriu quem espalhou o boato', 'found out who spread the rumor')); return fmtL(l('{p} descobriu que o boato saiu do seu selo.', '{p} found out the rumor came from your label.'), { p: perN(f) }); } }] });
registerConseq18('pa:bribe:ok', { later: [{ in: [4, 12], p: 0.35, tone: 'bad', hint: N('Suborno tem testemunhas.', 'Bribes have witnesses.'),
  fx: (f) => { f.rep('institutional', -6).cash(-5000, 'Suborno: acordo', 'legal'); return N('O suborno veio à tona numa investigação de rotina.', 'The bribe surfaced in a routine investigation.'); } }] });
registerConseq18('pa:help:ok', { later: [{ in: [6, 14], p: 0.45, tone: 'good', hint: N('Gratidão volta quando menos se espera.', 'Gratitude returns when least expected.'),
  fx: (f) => { if (f.c.pk) adjRel18(f.s, String(f.c.pk), 'player', 12, l('lembrou da ajuda', 'remembered the help')); f.rep('artists', 2); return fmtL(l('{p} conta a todos que o selo ajudou no pior momento.', '{p} tells everyone the label helped at the worst time.'), { p: perN(f) }); } }] });
registerConseq18('pa:criticize:ok', { later: [{ in: [3, 9], p: 0.45, tone: 'bad', hint: N('Críticas públicas viram rixa.', 'Public criticism turns into feuds.'),
  fx: (f) => { if (f.c.pk) adjRel18(f.s, String(f.c.pk), 'player', -15, l('ainda remói a crítica', 'still stewing over the criticism')); f.mood('stress', 5); return fmtL(l('{p} respondeu à sua crítica numa entrevista azeda.', '{p} answered your criticism in a sour interview.'), { p: perN(f) }); } }] });
registerConseq18('pa:flirt:ok', { later: [{ in: [4, 12], p: 0.3, tone: 'bad', hint: N('Romances no meio têm plateia.', 'Industry romances have an audience.'),
  fx: (f) => { f.rep('institutional', -2); return fmtL(l('Fotos suas com {p} circulam nos tabloides.', 'Photos of you with {p} circulate in the tabloids.'), { p: perN(f) }); } }] });
