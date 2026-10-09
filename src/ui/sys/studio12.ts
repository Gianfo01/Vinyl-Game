// Rodada 12 (UI): dono de estúdio x produtor. Salas, equipamento, engenheiros, propostas; projeto de produção passo a passo.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { rngOf } from '../../sim/util';
import { ownerOf } from '../../sim/sys/people/owner';
import {
  ROOMS, SPEC_NAME, STYLES, STYLE_NAME, acceptJob, addRoom, buyGear, closeProject, conflictKind, dated, declineJob, deliver, engCandidates, fire, fitReport, gearCost, gearName, hire, hotStyle, maintain, maintainCost, months, offerFee, pointsEV,
  prod, reinvent, roomCost, roomLimit, specialty, startProducer, stepBand, stepConflict, stepIntent, stepTake, studioOf, studios, synthOpen, takeChance, takeJob, unitName,
  type Spec, type Style, type Proj,
} from '../../sim/sys/studio12';
import { maxGear, GEAR, type Venture } from '../../sim/sys/ventures9';
import type { GameState } from '../../sim/types';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { registerArea } from '../registry';
import { tabs } from '../vis';

const btn = (label: L, fn: () => void, cls = 'btn small', dis = false) => h('button', { class: cls, disabled: dis, onclick: fn }, t(label));
const say = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };

// ---- demos de som (WebAudio, minúsculas): cada estilo tem um timbre característico
let ctx: AudioContext | null = null;
export function playDemo(style: Style): void {
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    const c = ctx, t0 = c.currentTime + 0.02, notes = [220, 277.2, 329.6, 277.2, 220, 196];
    const cfg: Record<Style, { type: OscillatorType; cut: number; len: number; wob: number; noise: number }> = {
      raw: { type: 'sawtooth', cut: 2500, len: 0.18, wob: 0, noise: 0.05 }, warm: { type: 'triangle', cut: 900, len: 0.3, wob: 4, noise: 0.015 },
      polished: { type: 'sine', cut: 6000, len: 0.22, wob: 0, noise: 0 }, experimental: { type: 'square', cut: 1500, len: 0.14, wob: 9, noise: 0.03 },
    };
    const k = cfg[style], master = c.createGain(); master.gain.value = 0.15; master.connect(c.destination);
    notes.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(), at = t0 + i * k.len;
      o.type = k.type; o.frequency.value = style === 'experimental' ? f * (i % 2 ? 1.5 : 1) : f; lp.type = 'lowpass'; lp.frequency.value = k.cut;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(1, at + 0.01); g.gain.exponentialRampToValueAtTime(0.001, at + k.len * 1.6);
      if (k.wob) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = k.wob; lg.gain.value = 6; lfo.connect(lg); lg.connect(o.detune); lfo.start(at); lfo.stop(at + k.len * 1.7); }
      o.connect(lp); lp.connect(g); g.connect(master); o.start(at); o.stop(at + k.len * 1.7);
    });
    if (k.noise) { const n = c.createBufferSource(), len = Math.floor(c.sampleRate * notes.length * k.len), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * k.noise; n.buffer = buf; n.connect(master); n.start(t0); }
  } catch { /* sem áudio: tudo bem */ }
}
const demos = (): HTMLElement => h('div', { class: 'row wrap small' }, t(l('Ouvir o timbre:', 'Hear the sound:')), ' ', ...STYLES.map((x) => btn(STYLE_NAME[x], () => playDemo(x), 'btn tiny')));

// ================================================================== estúdio

function studioCard(s: GameState, v: Venture): HTMLElement {
  const x = studioOf(s, v), sp = specialty(x), gap = maxGear(s) - v.gear!;
  const props = x.jobs.filter((j) => j.state === 'proposal'), booked = x.jobs.filter((j) => j.state === 'booked'), done = x.jobs.filter((j) => j.state === 'done').slice(-4);
  return h('div', { class: 'card' },
    h('h4', null, v.name, ' ', pill(`${t(l('Tecnologia', 'Tech'))}: ${t(GEAR[v.gear!].name)}`, gap ? 'bad' : 'good'), ' ', sp ? pill(`${t(l('Especialista', 'Specialist'))}: ${t(SPEC_NAME[sp])}`, 'good') : pill(t(l('sem especialização', 'no specialization')), '')),
    h('div', { class: 'row wrap small' }, ...(['rel', 'vibe', 'res'] as const).map((k) => h('span', null, t(k === 'rel' ? l('Confiabilidade', 'Reliability') : k === 'vibe' ? l('Clima', 'Vibe') : l('Resultados', 'Results')), ' ', bar(x.rep[k]), ` ${Math.round(x.rep[k])}  `))),
    h('h5', null, `${t(l('Salas', 'Rooms'))} (${x.rooms.length}/${roomLimit(v)})`),
    h('ul', { class: 'small' }, x.rooms.map((r) => h('li', null, h('b', null, t(ROOMS[r.kind].name)), ` — ${t(ROOMS[r.kind].note)} (${t(l('estilos', 'styles'))}: ${ROOMS[r.kind].best.map((b) => t(STYLE_NAME[b])).join(', ')})`))),
    x.rooms.length < roomLimit(v) ? h('div', { class: 'row wrap small' }, t(l('Construir', 'Build')), ' ', ...Object.keys(ROOMS).map((k) => btn(l(`${ROOMS[k].name.pt} (${$(roomCost(s, x))})`, `${ROOMS[k].name.en} (${$(roomCost(s, x))})`), () => say(addRoom(s, v.id, k), l('Sala construída.', 'Room built.')), 'btn tiny'))) : null,
    h('h5', null, t(l('Equipamento', 'Gear'))),
    h('ul', { class: 'small' }, x.gear.map((g) => h('li', null, t(gearName(s, g)), ' · ', t(SPEC_NAME[g.spec]), ' ', bar(g.cond), ` ${Math.round(g.cond)}% `, g.cond < 95 ? btn(l(`Manutenção (${$(maintainCost(s))})`, `Maintain (${$(maintainCost(s))})`), () => say(maintain(s, v.id, g.id), l('Revisado.', 'Serviced.')), 'btn tiny') : null))),
    h('div', { class: 'row wrap small' }, t(l('Comprar', 'Buy')), ' ', ...(['analog', 'digital', 'vintage'] as Spec[]).map((k) => btn(l(`${SPEC_NAME[k].pt} (${$(gearCost(s))})`, `${SPEC_NAME[k].en} (${$(gearCost(s))})`), () => say(buyGear(s, v.id, k), l('Equipamento instalado.', 'Gear installed.')), 'btn tiny'))),
    h('p', { class: 'small muted' }, t(l('Equipamento gasto perde takes e derruba a qualidade; especializar (muito do mesmo tipo) atrai clientes de um estilo.', 'Worn gear loses takes and drags quality; specializing (lots of one kind) attracts one style of client.'))),
    h('h5', null, `${t(l('Engenheiros', 'Engineers'))} (${x.engs.length})`),
    h('ul', { class: 'small' }, x.engs.map((e) => h('li', null, `${e.name} · ${t(l('habilidade', 'skill'))} ${e.skill} · ${t(STYLE_NAME[e.style])} · ${$(e.wage)}/${t(l('mês', 'mo'))} `, x.engs.length > 1 ? btn(l('Dispensar', 'Let go'), () => { fire(s, v.id, e.id); rerender(); }, 'btn tiny ghost') : null))),
    x.engs.length < 1 + v.level ? h('div', { class: 'small' }, t(l('Candidatos:', 'Candidates:')), ' ', ...engCandidates(s).filter((c) => !x.engs.some((e) => e.id === c.id)).map((c) => btn(l(`${c.name} (${c.skill}, ${STYLE_NAME[c.style].pt})`, `${c.name} (${c.skill}, ${STYLE_NAME[c.style].en})`), () => say(hire(s, v.id, c.id), l('Contratado.', 'Hired.')), 'btn tiny'))) : null,
    h('h5', null, `${t(l('Propostas', 'Proposals'))} (${props.length})`),
    props.length ? h('div', null, ...props.map((b) => jobRow(s, v, b))) : h('p', { class: 'muted small' }, t(l('Nenhuma proposta agora. Reputação, clima e especialização trazem clientes.', 'No proposals right now. Reputation, vibe and specialization bring clients.'))),
    booked.length ? h('div', null, h('h5', null, t(l('Em andamento', 'In progress'))), h('ul', { class: 'small' }, booked.map((b) => h('li', null, `${b.client} · ${t(STYLE_NAME[b.style])} · ${b.left} ${t(l('mês(es) restantes', 'month(s) left'))}`)))) : null,
    done.length ? h('div', null, h('h5', null, t(l('Concluídos', 'Finished'))), ...done.map((b) => h('div', { class: 'small' }, h('b', null, `${b.client}: ${Math.round(b.q ?? 0)}`), ' — ', (b.why ?? []).map((w) => t(w)).join(' · ')))) : null,
    demos());
}

const picks: Record<string, { e: string; r: string }> = {};
function jobRow(s: GameState, v: Venture, b: ReturnType<typeof studioOf>['jobs'][number]): HTMLElement {
  const x = studioOf(s, v), p = (picks[b.id] ??= { e: x.engs[0]?.id ?? '', r: x.rooms[0]?.id ?? '' });
  const rep = fitReport(s, v, x, b, x.engs.find((e) => e.id === p.e), x.rooms.find((r) => r.id === p.r));
  return h('div', { class: 'card', style: 'padding:8px' },
    h('div', null, h('b', null, b.client), ` · ${t(STYLE_NAME[b.style])} · ${b.units} ${t(unitName(b.contract))} (${t(b.contract === 'hourly' ? l('por hora', 'hourly') : b.contract === 'daily' ? l('por diária', 'daily') : l('por projeto', 'per project'))}) · ${t(l('paga', 'pays'))} ${$(b.pay ?? 0)} · ${months(b)} ${t(l('mês(es)', 'mo'))}`),
    h('div', { class: 'small muted' }, `${t(l('Prazo até', 'Deadline'))}: ${b.deadline % 12 + 1}/${Math.floor(b.deadline / 12)} · ${b.contract === 'hourly' ? t(l('Horas extras são cobradas, mas ninguém gosta de atraso.', 'Overtime is billed, but nobody likes lateness.')) : b.contract === 'project' ? t(l('Fechado: se estourar, o prejuízo é seu.', 'Fixed: if it overruns, the loss is yours.')) : t(l('Diárias: previsível, mas dias extras para fechar saem de graça.', 'Day rate: predictable, but extra days to finish are on you.'))}`),
    h('div', { class: 'row wrap small' },
      select<string>(p.e, x.engs.map((e) => ({ value: e.id, label: `${e.name} (${e.skill}, ${t(STYLE_NAME[e.style])})` })), (e) => { p.e = e; rerender(); }),
      select<string>(p.r, x.rooms.map((r) => ({ value: r.id, label: t(ROOMS[r.kind].name) })), (r) => { p.r = r; rerender(); }),
      h('b', null, `${t(l('Qualidade esperada', 'Expected quality'))}: ${Math.round(rep.q)}`),
      btn(l('Aceitar', 'Accept'), () => say(acceptJob(s, v.id, b.id, p.e, p.r), l('Sessão confirmada.', 'Session confirmed.')), 'btn small primary'),
      btn(l('Recusar', 'Decline'), () => { declineJob(s, v.id, b.id); rerender(); }, 'btn small ghost')),
    h('ul', { class: 'small muted' }, rep.lines.map((w) => h('li', null, t(w)))));
}

function studioTab(s: GameState): HTMLElement {
  const list = studios(s);
  if (!list.length) return h('p', { class: 'muted' }, t(l('Você não tem estúdio. Funde um em Empreendimentos > Estúdio e produção: o dono do estúdio gerencia salas, equipe e agenda; é outra carreira que a de produtor.', 'You have no studio. Found one under Ventures > Studio: the owner manages rooms, staff and bookings — a different career from the producer\'s.')));
  return h('div', null, ...list.map((v) => studioCard(s, v)));
}

// ================================================================== produtor

function projView(s: GameState, pr: Proj): HTMLElement {
  const P = prod(s), a = s.acts[pr.job.actId], hot = hotStyle(s), c = pr.sc;
  const meters = h('div', { class: 'row wrap small' }, ...([['prec', l('Precisão', 'Precision')], ['emo', l('Emoção', 'Emotion')], ['com', l('Apelo comercial', 'Commercial')], ['art', l('Artista', 'Artist')], ['lab', pr.job.own ? l('Seu selo', 'Your label') : l('Selo/cliente', 'Label/client')]] as [keyof Proj['sc'], L][]).map(([k, n]) => h('span', null, t(n), ' ', bar(clamp100(c[k])), '  ')));
  const log = pr.ev.length ? h('ul', { class: 'small' }, pr.ev.map((e) => h('li', null, t(e)))) : null;
  const head = h('div', null, h('h4', null, t(l('Projeto com', 'Project with')), ' ', actLink(s, a.id), pr.cost ? ` · ${t(l('custos seus', 'your costs'))}: ${$(pr.cost)}` : ''), meters, log);
  const opt = (label: L, sub: L, fn: () => void) => h('button', { class: 'btn', style: 'display:block;text-align:left;margin:4px 0', onclick: fn }, h('b', null, t(label)), h('div', { class: 'small muted' }, t(sub)));
  if (pr.done) {
    const d = pr.done;
    return h('div', null, head, h('h4', null, `${t(l('Entregue', 'Delivered'))}: ${Math.round(d.q)}/100`), h('p', null, `${t(l('Artista', 'Artist'))}: ${Math.round(d.art)} · ${t(l('Selo/cliente', 'Label/client'))}: ${Math.round(d.lab)} · ${t(l('Você recebe', 'You earn'))}: ${$(d.pay)}${pr.terms === 'points' ? ` (${t(l('em 12 meses', 'in 12 months'))})` : ''}`),
      h('ul', { class: 'small' }, d.why.map((w) => h('li', null, t(w)))), btn(l('Fechar projeto', 'Close project'), () => { closeProject(s); rerender(); }, 'btn primary'));
  }
  if (pr.step === 0) {
    const refs: Style[] = [hot, P.sig, ...STYLES.filter((x) => x !== hot && x !== P.sig)].filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 3);
    return h('div', null, head, h('h5', null, t(l('1. Conversa inicial: referências e intenção', '1. First talk: references and intent'))),
      h('p', { class: 'small muted' }, t(l('O artista traz referências. Qual som perseguir, e com que ambição?', 'The act brings references. Which sound to chase, and with what ambition?'))),
      ...refs.flatMap((st) => (['faithful', 'reinvent', 'commercial'] as const).map((it) => opt(
        l(`Referência: ${STYLE_NAME[st].pt}${st === hot ? ' (em alta)' : st === P.sig ? ' (sua assinatura)' : ''} · ${it === 'faithful' ? 'fiel' : it === 'reinvent' ? 'reinventar' : 'radiofônico'}`, `Reference: ${STYLE_NAME[st].en}${st === hot ? ' (hot)' : st === P.sig ? ' (your signature)' : ''} · ${it === 'faithful' ? 'faithful' : it === 'reinvent' ? 'reinvent' : 'radio-ready'}`),
        it === 'faithful' ? l('Fiel ao que o artista queria ouvir.', 'True to what the act wanted to hear.') : it === 'reinvent' ? l('Arriscar uma cara nova (renova sua assinatura).', 'Risk a new face (refreshes your signature).') : l('Mirar o rádio; o selo gosta.', 'Aim at radio; the label likes it.'), () => { stepIntent(s, it, st); rerender(); }))));
  }
  if (pr.step === 1) {
    const x = studios(s).flatMap((v) => studioOf(s, v).rooms.map((r) => ({ id: `${v.id}:${r.kind}`, name: `${v.name} — ${t(ROOMS[r.kind].name)}` })));
    let mus: 'band' | 'session' | 'synth' = 'band', app: 'live' | 'overdub' | 'hybrid' = 'hybrid', room = 'rent';
    return h('div', null, head, h('h5', null, t(l('2. Músicos, arranjo e sala', '2. Musicians, arrangement and room'))),
      h('div', { class: 'row wrap' },
        select<string>(mus, [{ value: 'band', label: t(l('A banda do artista (emoção)', 'The act\'s own band (emotion)')) }, { value: 'session', label: t(l('Músicos de estúdio (precisão, custo)', 'Session players (precision, cost)')) }, ...(synthOpen(s) ? [{ value: 'synth', label: t(l('Programado (moderno, frio)', 'Programmed (modern, cold)')) }] : [])], (v) => (mus = v as typeof mus)),
        select<string>(app, [{ value: 'live', label: t(l('Tudo ao vivo na sala', 'Everything live in the room')) }, { value: 'overdub', label: t(l('Camadas e overdubs', 'Layers and overdubs')) }, { value: 'hybrid', label: t(l('Híbrido', 'Hybrid')) }], (v) => (app = v as typeof app)),
        select<string>(room, [{ value: 'rent', label: t(l('Estúdio alugado', 'Rented studio')) }, ...x.map((r) => ({ value: r.id, label: r.name }))], (v) => (room = v))),
      btn(l('Gravar', 'Record'), () => { stepBand(s, mus, app, room); rerender(); }, 'btn primary'));
  }
  if (pr.step === 2) {
    const k = conflictKind(s, pr);
    const T = {
      single: { q: l('O selo quer uma versão de rádio; o artista jura que a faixa é para ser ouvida inteira.', 'The label wants a radio edit; the act swears the track is meant to be heard whole.'), o: [['label', l('Dar a versão de rádio ao selo', 'Give the label its radio edit'), l('Selo feliz, artista magoado.', 'Label happy, artist hurt.')], ['artist', l('Defender a versão do artista', 'Back the artist\'s cut'), l('Artista feliz, selo ameaça cortar verba.', 'Artist happy, label threatens funding.')], ['both', l('Fazer as duas mixagens', 'Do both mixes'), l('Custa um dia de prazo.', 'Costs a day of deadline.')]] },
      deadline: { q: l('O selo marcou o lançamento e o prazo apertou.', 'The label fixed the release date and the deadline is tight.'), o: [['cut', l('Cortar sessões', 'Cut sessions'), l('Cumpre o prazo, perde precisão.', 'Hits the date, loses precision.')], ['extend', l('Pedir mais prazo', 'Ask for more time'), l('Mais precisão, selo desconfia.', 'More precision, label wary.')], ['night', l('Virar as noites (custo seu)', 'Pull all-nighters (your cost)'), l('Funciona, a equipe sofre.', 'Works, the crew suffers.')]] },
      budget: { q: l('O artista quer mais dias de estúdio; o orçamento acabou.', 'The act wants more studio days; the budget is gone.'), o: [['grant', l('Bancar dias extras do seu bolso', 'Cover extra days from your pocket'), l('Artista adora, você paga.', 'The act loves it, you pay.')], ['refuse', l('Recusar', 'Refuse'), l('Orçamento salvo, artista emburrado.', 'Budget saved, act sulking.')], ['split', l('Dividir o custo', 'Split the cost'), l('Meio-termo.', 'Middle ground.')]] },
    }[k];
    return h('div', null, head, h('h5', null, t(l('3. Conflito: artista x selo x prazo', '3. Conflict: artist vs label vs deadline'))), h('p', null, t(T.q)), ...T.o.map(([id, a, b]) => opt(a as L, b as L, () => { stepConflict(s, id as string); rerender(); })));
  }
  const chance = takeChance(P, 40);
  return h('div', null, head, h('h5', null, t(l('4. O take imperfeito', '4. The imperfect take')), ' ', pill(t(l('cena', 'scene')), 'good')),
    h('p', null, t(l('O melhor take da música tem uma nota desafinada e o tempo escorregou no refrão, mas a interpretação é extraordinária: o estúdio inteiro parou de respirar.', 'The best take of the song has one flat note and the tempo slips in the chorus, but the performance is extraordinary: the whole room stopped breathing.'))),
    h('ul', { class: 'small' }, h('li', null, h('b', null, t(l('Artista: ', 'Artist: '))), t(l('"É essa. Se refizer, morre."', '"That\'s the one. Redo it and it dies."'))), h('li', null, h('b', null, t(pr.job.own ? l('Seu selo: ', 'Your label: ') : l('Selo/cliente: ', 'Label/client: '))), t(l('"Dá para consertar? Rádio não perdoa afinação."', '"Can it be fixed? Radio doesn\'t forgive pitch."'))), h('li', null, h('b', null, t(l('Seu ouvido: ', 'Your ear: '))), t(l('"Nunca vou conseguir isso de novo... mas puristas vão reparar."', '"I\'ll never get that again... but purists will notice."')))),
    opt(l('Manter o take', 'Keep the take'), l('+emoção, −precisão. Artista adora.', '+emotion, −precision. The act loves it.'), () => { stepTake(s, rngOf(s), 'keep'); rerender(); }),
    opt(l('Refazer para acertar', 'Redo it right'), l('+precisão, −emoção, perde um dia. O selo respira.', '+precision, −emotion, costs a day. The label breathes.'), () => { stepTake(s, rngOf(s), 'redo'); rerender(); }),
    opt(l('Editar/colar (cirúrgico)', 'Edit/splice (surgical)'), fmtChance(chance), () => { stepTake(s, rngOf(s), 'comp'); rerender(); }));
}
const fmtChance = (c: number): L => l(`Chance de dar certo: ${Math.round(c * 100)}%. Falhando, soa costurado.`, `Chance it works: ${Math.round(c * 100)}%. If it fails it sounds stitched.`);
const clamp100 = (x: number) => Math.max(0, Math.min(100, x));

function producerTab(s: GameState): HTMLElement {
  const P = prod(s);
  if (!P.on) return h('div', null, h('p', null, t(l('Produtor é uma carreira só sua: seu nome nos créditos, seu cachê (ou pontos) no seu patrimônio pessoal, independente de quem é dono do estúdio.', 'Producer is a career of your own: your name in the credits, your fee (or points) in your personal wealth, independent of who owns the studio.'))), btn(l('Começar a produzir', 'Start producing'), () => { startProducer(s); rerender(); }, 'btn primary'));
  if (P.proj) {
    const pr = P.proj;
    if (pr.done || pr.step >= 4) { if (!pr.done && pr.step === 4) deliver(s, rngOf(s)); }
    return projView(s, pr);
  }
  const hot = hotStyle(s);
  return h('div', null,
    section(t(l('Seu perfil de produtor', 'Your producer profile')),
      h('div', { class: 'row wrap small' }, ...([['ear', l('Ouvido', 'Ear')], ['arr', l('Arranjo', 'Arrangement')], ['people', l('Trato com artistas', 'People skills')]] as const).map(([k, n]) => h('span', null, t(n), ' ', bar(P.skill[k]), ` ${Math.round(P.skill[k])}  `))),
      h('p', null, `${t(l('Reputação', 'Reputation'))}: ${Math.round(P.rep)} · ${t(l('Patrimônio pessoal', 'Personal wealth'))}: ${$(ownerOf(s).wealth)} · ${t(l('Ganhos acumulados', 'Total earned'))}: ${$(P.total)}`),
      h('p', null, `${t(l('Assinatura', 'Signature'))}: `, h('b', null, t(STYLE_NAME[P.sig])), ' · ', t(l('Frescor', 'Freshness')), ' ', bar(P.fresh), ` ${Math.round(P.fresh)} `, dated(P) ? pill(t(l('datado', 'dated')), 'bad') : P.sig === hot ? pill(t(l('em alta', 'in demand')), 'good') : null, P.learning ? pill(`${t(l('aprendendo o novo som', 'learning the new sound'))}: ${P.learning}`, '') : null),
      h('p', { class: 'small muted' }, t(l(`Som em alta nesta época: ${STYLE_NAME[hot].pt}. Repetir a mesma fórmula envelhece a assinatura; reinventar custa reputação e algumas produções menos seguras.`, `Hot sound right now: ${STYLE_NAME[hot].en}. Repeating the formula ages your signature; reinventing costs reputation and a few shaky productions.`))),
      h('div', { class: 'row wrap small' }, t(l('Reinventar assinatura:', 'Reinvent signature:')), ' ', ...STYLES.filter((x) => x !== P.sig).map((x) => btn(STYLE_NAME[x], () => say(reinvent(s, x), l('Nova assinatura.', 'New signature.')), 'btn tiny'))), demos()),
    section(t(l('Propostas de trabalho', 'Job offers')), P.offers.length ? h('div', null, ...P.offers.map((o) => {
      const a = s.acts[o.actId];
      return h('div', { class: 'card', style: 'padding:8px' }, h('div', null, actLink(s, a.id), ` · ${t(l('fama', 'fame'))} ${Math.round(a.fame)} ${o.own ? '· ' + t(l('seu selo', 'your label')) : ''}`),
        h('div', { class: 'small' }, `${t(l('Cachê fixo', 'Flat fee'))}: ${$(o.fee)} · ${t(l('ou', 'or'))} ${(o.pts * 100).toFixed(1)}% ${t(l('de pontos (pago em 12 meses; esperado em qualidade 60: ', 'points (paid in 12 months; expected at quality 60: '))}${$(pointsEV(s, a, o.pts, 60))}${t(l(', em 80: ', ', at 80: '))}${$(pointsEV(s, a, o.pts, 80))})`),
        h('div', { class: 'row wrap' }, btn(l('Aceitar com cachê fixo', 'Accept, flat fee'), () => say(takeJob(s, o.id, 'flat'), l('Projeto aberto.', 'Project opened.')), 'btn small primary'), btn(l('Aceitar com pontos', 'Accept, points'), () => say(takeJob(s, o.id, 'points'), l('Projeto aberto.', 'Project opened.')), 'btn small')));
    })) : h('p', { class: 'muted small' }, t(l('Sem propostas. Créditos bons e uma assinatura fresca atraem trabalho.', 'No offers. Good credits and a fresh signature attract work.')))),
    P.credits.length ? section(t(l('Créditos', 'Credits')), h('table', { class: 'tbl compact' }, h('tbody', null, P.credits.slice(-10).reverse().map((c) => h('tr', null, h('td', null, String(c.y)), h('td', null, c.act), h('td', null, t(STYLE_NAME[c.style])), h('td', null, String(Math.round(c.q)))))))) : null,
    P.pending.length ? h('p', { class: 'small' }, `${t(l('Pontos a receber', 'Points pending'))}: ${$(P.pending.reduce((a, p) => a + p.amt, 0))}`) : null);
}
void offerFee;

function area(s: GameState): HTMLElement {
  return h('div', { class: 'hub studio12' }, tabs('studio12', [
    { id: 'studio', label: t(l('Dono do estúdio', 'Studio owner')), icon: 'cd', render: () => studioTab(s) },
    { id: 'producer', label: t(l('Produtor', 'Producer')), icon: 'note', render: () => producerTab(s) },
  ], rerender));
}
registerArea({ id: 'studio12', label: l('Estúdio e produtor', 'Studio & producer'), icon: 'cd', key: ']', render: area, visible: (s) => s.year >= 1920, badge: (s) => prod(s).offers.length || undefined });
