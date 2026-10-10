// Rodada 17 (H) — interface da agenda: bolinhas com o porquê de cada uma (dica ao passar o mouse), confirmação
// antes de gastar bolinha, página "Agenda e contratações" (envolvimento por carreira, diretores, chefe de gabinete,
// relatórios de delegação, painel do Você, candidatos com negociação, freelancers por ação, músicos de estúdio)
// e blocos pequenos para Equipe (Pessoas) e Novo Jogo.

import './agenda17.css';
import { l, type L } from '../../data/world';
import { STAFF_ROLES } from '../../data/rules';
import { t } from '../../i18n/strings';
import { STRESS_LEVEL, stressOf } from '../../sim/stress17';
import type { GameState } from '../../sim/types';
import { hqCaps } from '../../sim/branches';
import { careerDef, careers } from '../../sim/sys/careers12';
import { energyLeft, maxEnergy, playerPerson } from '../../sim/sys/life';
import { ownerOf } from '../../sim/sys/people/owner';
import { ventures } from '../../sim/sys/ventures9';
import { liveOf } from '../../sim/sys/live/state';
import {
  CAREER_KIND, FL, INV_DESC, INV_NAME, OFFICE, PAYOLA_ERA, SECTORS, acceptChance, ag17, balls, bookCrew, careerBalls, crewById, careerQ, chiefCands, crewFee, crewFit, crewName, crewsNow, crunch,
  fireHead, freelancers, headCands, hireableActs, hireFreelancer, invOf, mentorStaff, negotiate, netOf, network, officeCap, overbooked, overflow, restDay, setInv, setSpendTag, staffCands, vacation,
  type Ball, type Cand, type FlKind, type Inv,
} from '../../sim/sys/agenda17';
import { $, modal, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerArea } from '../registry';
import { store } from '../store';
import { tabs } from '../vis';

const say = (r: { ok: boolean; text: L }) => { toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); };
const pct = (v: number) => `${Math.round(v * 100)}%`;
const qName = (q: number): L => (q >= 0.8 ? l('excelente', 'excellent') : q >= 0.6 ? l('bom', 'good') : q >= 0.4 ? l('regular', 'average') : l('fraco', 'weak'));
const roleName = (id: string) => t(STAFF_ROLES.find((x) => x.id === id)?.name ?? l(id, id));
const B = '⏱';

// ================================================================ bolinhas

const dot = (b: Ball) => h('i', { class: `ag17-b ${b.k}`, title: t(b.tip), 'aria-label': t(b.tip) });
/** Barra de bolinhas do mês: expediente (carreiras) | pessoais | sobrecarga. Passe o mouse para ver o porquê. */
export function ballsEl(s: GameState, big = false): HTMLElement {
  const b = balls(s);
  return h('span', { class: `ag17-balls ${big ? 'big' : ''}` },
    h('span', { class: 'ag17-grp office', title: t(l('Expediente: horas de trabalho que só as carreiras usam', 'Office hours: work time only careers use')) }, b.office.map(dot)),
    h('span', { class: 'ag17-sep' }, '|'),
    h('span', { class: 'ag17-grp' }, b.personal.map(dot)),
    b.over.length ? h('span', { class: 'ag17-grp over' }, b.over.map(dot)) : null,
    h('small', { class: 'muted' }, ` ${energyLeft(s)}/${maxEnergy(s)} ${t(l('livres', 'free'))}`));
}

// ================================================================ confirmação antes de gastar bolinha

let bypass: Element | null = null;
let noAsk = false;
try { noAsk = localStorage.getItem('ag17.noask') === '1'; } catch { /* sem armazenamento */ }
function intercept(e: MouseEvent): void {
  const b = (e.target as Element | null)?.closest?.('button') as HTMLButtonElement | null;
  if (!b || b.disabled || !store.game) return;
  const raw = (b.textContent ?? '').trim();
  const n = (raw.match(/⏱/g) ?? []).length;
  const clean = raw.replace(/⏱/g, '').replace(/\s+/g, ' ').trim().slice(0, 70);
  setSpendTag(clean ? l(clean, clean) : null);
  setTimeout(() => setSpendTag(null), 0);
  if (b === bypass) { bypass = null; return; }
  if (!n || noAsk || b.closest('.overlay')) return;
  const s = store.game;
  e.preventDefault(); e.stopImmediatePropagation();
  const left = energyLeft(s);
  let close = () => {};
  const chk = h('input', { type: 'checkbox' }) as HTMLInputElement;
  const body = h('div', null,
    h('p', null, t(l('Esta ação gasta {n} bolinha(s) do seu tempo pessoal deste mês:', 'This action spends {n} ball(s) of your personal time this month:'), { n }), ' ', h('b', null, clean)),
    ballsEl(s, true),
    h('p', { class: `small ${left < n ? 'bad' : 'muted'}` }, left < n ? t(l('Você não tem bolinhas livres suficientes: a ação vai falhar.', 'You do not have enough free balls: the action will fail.')) : t(l('Depois sobram {k}.', '{k} left afterwards.'), { k: left - n })),
    h('label', { class: 'small' }, chk, ' ', t(l('Não perguntar de novo', 'Do not ask again'))),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: () => { if (chk.checked) { noAsk = true; try { localStorage.setItem('ag17.noask', '1'); } catch { /* */ } } close(); bypass = b; b.click(); } }, t(l('Confirmar', 'Confirm'))),
      h('button', { class: 'btn ghost', onclick: () => close() }, t(l('Cancelar', 'Cancel')))));
  close = modal(t(l('Gastar tempo pessoal?', 'Spend personal time?')), body);
}
if (typeof document !== 'undefined') document.addEventListener('click', intercept, true);
export const resetAsk17 = () => { noAsk = false; try { localStorage.removeItem('ag17.noask'); } catch { /* */ } };

// ================================================================ aba Agenda

let hireFor = '';
function candTable(s: GameState, cs: Cand[], short = false): HTMLElement {
  if (!cs.length) return h('p', { class: 'muted small' }, t(l('Ninguém disponível neste trimestre com esses filtros.', 'Nobody available this quarter with these filters.')));
  return h('table', { class: 'tbl compact' },
    h('thead', null, h('tr', null, ...[l('Nome', 'Name'), l('Função', 'Role'), l('Habilidade', 'Skill'), l('Pede/mês', 'Asks/mo'), l('Oferta (chance)', 'Offer (odds)')].map((x) => h('th', null, t(x))))),
    h('tbody', null, cs.map((c) => h('tr', null,
      h('td', null, h('b', null, c.name), c.note ? h('div', { class: 'small muted' }, t(c.note)) : null, short ? null : h('div', { class: 'small muted' }, c.trait)),
      h('td', null, c.role.startsWith('head:') ? t(l('Diretor(a)', 'Director')) : c.role === 'chief' ? t(l('Chefe de gabinete', 'Chief of staff')) : roleName(c.role)),
      h('td', null, String(c.skill)), h('td', null, $(c.ask)),
      h('td', null, h('div', { class: 'row wrap' }, [0.85, 1, 1.2].map((p) => h('button', {
        class: `btn tiny ${p === 1 ? 'primary' : ''}`,
        title: t(l('Oferece {p} do pedido. Recusa: some da lista no trimestre. Luvas = meio salário.', 'Offers {p} of the ask. If refused they leave the list this quarter. Signing fee = half a salary.'), { p: pct(p) }),
        onclick: () => say(negotiate(s, c.id, p)),
      }, `${pct(p)} · ${pct(acceptChance(s, c, p))}`))))))));
}

function careerRows(s: GameState): HTMLElement {
  const st = careers(s), a = ag17(s);
  const vs = ventures(s);
  const extra = Object.entries(CAREER_KIND).filter(([c, k]) => !st.active.includes(c) && vs.list.some((v) => v.kind === k)).map(([c]) => c);
  if (!st.active.includes('manager') && vs.mg.clients.length) extra.push('manager');
  if (!st.active.includes('venue') && liveOf(s).venue) extra.push('venue');
  for (const k of Object.keys(a.heads)) if (!st.active.includes(k) && !extra.includes(k)) extra.push(k);
  const cb = careerBalls(s);
  const row = (id: string, on: boolean) => {
    const d = careerDef(id); if (!d) return null;
    const q = careerQ(s, id), hd = a.heads[id], inv = invOf(s, id), c = on ? crunch(s, id) : null;
    const n = cb.find((x) => x.id === id)?.n ?? 0;
    return h('tr', { class: on ? 'me' : '' },
      h('td', null, h('b', null, t(d.name)), on ? null : h('div', { class: 'small bad' }, t(l('sem a carreira: só anda com diretor', 'no career: runs only with a director')))),
      h('td', null, on ? select<Inv>(inv, (['lead', 'normal', 'deleg'] as Inv[]).map((v) => ({ value: v, label: `${t(INV_NAME[v])} (${v === 'lead' ? 2 : v === 'normal' ? 1 : 0} ${B})`, disabled: v === 'deleg' && !hd })), (v) => say(setInv(s, id, v)), { title: t(INV_DESC[inv]) }) : '—'),
      h('td', null, on ? `${B.repeat(n) || '0'}${c ? ` (${t(l('pico', 'peak'))}: ${t(c)})` : ''}` : '0'),
      h('td', { class: q.f >= 1.05 ? 'good' : q.f < 0.95 ? 'bad' : '' }, pct(q.f), h('div', { class: 'small muted' }, t(q.why))),
      h('td', null, hd ? h('div', null, `${hd.name} · ${hd.skill} · ${$(hd.salary)}/${t(l('mês', 'mo'))} `, h('button', { class: 'btn tiny ghost', onclick: () => { if (confirm(t(l('Demitir {n}? Rescisão de um salário.', 'Fire {n}? One salary severance.'), { n: hd.name }))) say(fireHead(s, id)); } }, t(l('Demitir', 'Fire'))))
        : h('button', { class: 'btn tiny', onclick: () => { hireFor = hireFor === id ? '' : id; rerender(); } }, hireFor === id ? t(l('Fechar', 'Close')) : t(l('Contratar diretor', 'Hire director')))));
  };
  const ids = [...st.active, ...extra];
  return h('div', null,
    h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, ...[l('Frente', 'Front'), l('Envolvimento', 'Involvement'), l('Bolinhas', 'Balls'), l('Resultado', 'Result'), l('Diretor', 'Director')].map((x) => h('th', null, t(x))))),
      h('tbody', null, ids.map((id) => row(id, st.active.includes(id))))),
    hireFor ? section(t(l('Diretores para {c}', 'Directors for {c}'), { c: t(careerDef(hireFor)?.name ?? l(hireFor, hireFor)) }),
      h('p', { class: 'small muted' }, t(l('Um diretor toca a frente sem você (0 bolinha). Habilidade 40 rende ~86% do seu ritmo; 90 rende ~100%. Erra às vezes (relatório abaixo). Não ocupa vaga na sede.', 'A director runs the front without you (0 balls). Skill 40 yields ~86% of your pace; 90 yields ~100%. Sometimes errs (reports below). Takes no HQ seat.'))),
      candTable(s, headCands(s, hireFor), true)) : null);
}

function agendaTab(s: GameState): HTMLElement {
  const a = ag17(s), ob = overbooked(s), of = overflow(s);
  return h('div', null,
    section(t(l('Seu mês em bolinhas', 'Your month in balls')),
      ballsEl(s, true),
      h('p', { class: 'small' }, t(l('Você tem {o} bolinhas de EXPEDIENTE (só carreiras) e {p} PESSOAIS (vida, viagens, reuniões e scouting em pessoa) — a banda não ocupa nenhuma; tocar é a carreira "Músico". Cada carreira ativa ocupa 1 (normal), 2 (à frente) ou 0 (delegada a um diretor). O que passar do expediente come as pessoais; o que passar das pessoais é sobrecarga.', 'You have {o} OFFICE balls (careers only) and {p} PERSONAL ones (life, travel, in-person meetings and scouting) — the band takes none; playing is the "Musician" career. Each active career takes 1 (normal), 2 (hands-on) or 0 (delegated to a director). Whatever exceeds office hours eats personal balls; beyond that is overbooking.'), { o: officeCap(s), p: maxEnergy(s) })),
      of ? h('p', { class: 'small warn' }, t(l('{n} bolinha(s) de carreira estão comendo seu tempo pessoal.', '{n} career ball(s) are eating your personal time.'), { n: Math.min(of, maxEnergy(s)) })) : null,
      ob ? h('p', { class: 'small bad' }, pill(t(l('SOBRECARGA', 'OVERBOOKED')), 'bad'), ' ', t(l('+{n} além do possível: estresse todo mês e −10% em todas as frentes. Delegue ou largue uma carreira.', '+{n} beyond capacity: stress every month and −10% on every front. Delegate or drop a career.'), { n: ob })) : null),
    section(t(l('Carreiras e negócios', 'Careers and businesses')), careerRows(s),
      h('p', { class: 'small muted' }, t(l('Sem a carreira você ainda pode ter o negócio (ex.: abrir um festival em Empreendimentos): contrate um diretor para tocá-lo, senão a reputação cai todo mês.', 'Without the career you can still own the business (e.g. found a festival in Ventures): hire a director to run it, otherwise its reputation slips every month.')))),
    section(t(l('Chefe de gabinete', 'Chief of staff')),
      a.chief ? h('div', null, h('p', null, `${a.chief.name} · ${t(l('habilidade', 'skill'))} ${a.chief.skill} · ${$(a.chief.salary)}/${t(l('mês', 'mo'))} — `, t(l('+1 bolinha de expediente; segura a rotina (−2 de estresse em {p}% dos meses).', '+1 office ball; handles routine (−2 stress in {p}% of months).'), { p: a.chief.skill })),
        h('button', { class: 'btn small ghost', onclick: () => say(fireHead(s, 'chief')) }, t(l('Dispensar', 'Let go'))))
        : h('div', null, h('p', { class: 'small muted' }, t(l('Um chefe de gabinete organiza sua agenda: expediente {a} → {b}. Os fracos às vezes esquecem reuniões.', 'A chief of staff runs your calendar: office {a} → {b}. Weak ones sometimes forget meetings.'), { a: OFFICE, b: OFFICE + 1 })), candTable(s, chiefCands(s), true))),
    section(t(l('Relatórios de delegação', 'Delegation reports')),
      a.rep.length ? h('ul', { class: 'small' }, a.rep.slice(0, 12).map((x) => h('li', { class: x.tone === 'bad' ? 'bad' : x.tone === 'good' ? 'good' : '' }, `${(x.mk % 12) + 1}/${Math.floor(x.mk / 12)} — ${t(x.t)}`)))
        : h('p', { class: 'muted small' }, t(l('Nada ainda. Diretores mandam relatório a cada trimestre; erros e acertos aparecem aqui.', 'Nothing yet. Directors report every quarter; mistakes and wins show up here.')))));
}

// ================================================================ aba Você

let mentorId = '';
function youTab(s: GameState): HTMLElement {
  const p = playerPerson(s), o = ownerOf(s), a = ag17(s), R = s.player.reputation;
  const sr = p ? stressOf(s, p.id) : null;
  const heads = Object.values(a.heads).reduce((x, y) => x + y.salary, 0) + (a.chief?.salary ?? 0);
  return h('div', null,
    section(t(l('Energia', 'Energy')), ballsEl(s, true),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small', onclick: () => say(restDay(s)) }, t(l('Dia de folga (−10 estresse)', 'Day off (−10 stress)')), ` ${B}`),
        h('button', { class: 'btn small', disabled: energyLeft(s) < 3, title: t(l('Gasta todas as bolinhas livres (mín. 3): alivia o desgaste de longo prazo.', 'Spends all free balls (min. 3): eases long-term wear.')), onclick: () => say(vacation(s)) }, t(l('Tirar férias', 'Take a holiday')), ` ${B.repeat(Math.max(3, energyLeft(s)))}`))),
    section(t(l('Saúde e estresse', 'Health and stress')),
      sr ? h('div', null, pill(t(STRESS_LEVEL[sr.level]), sr.level === 'ok' ? 'good' : sr.level === 'tense' ? '' : 'bad'), ` ${t(l('curto', 'short'))} ${Math.round(sr.short)} · ${t(l('longo', 'long'))} ${Math.round(sr.long)}`,
        sr.why.length ? h('ul', { class: 'small' }, sr.why.slice(0, 5).map((w) => h('li', null, t(w)))) : null) : h('p', { class: 'muted' }, '—'),
      h('p', { class: 'small muted' }, t(l('Sobrecarga de agenda, escândalos e perdas sobem o estresse; folga, férias, família e terapia descem. Curto > 65 com longo > 45 = risco de colapso.', 'Overbooking, scandals and losses raise stress; days off, holidays, family and therapy lower it. Short > 65 with long > 45 = breakdown risk.')))),
    section(t(l('Reputação', 'Reputation')),
      h('p', { class: 'small' }, `${t(l('Artística', 'Artistic'))} ${Math.round(R.artistic)} · ${t(l('Comercial', 'Commercial'))} ${Math.round(R.commercial)} · ${t(l('Com artistas', 'With artists'))} ${Math.round(R.artists)} · ${t(l('Institucional', 'Institutional'))} ${Math.round(R.institutional)}`),
      h('p', { class: 'small muted' }, t(l('A reputação puxa a qualidade de candidatos e freelancers que aceitam trabalhar com você.', 'Reputation lifts the quality of candidates and freelancers willing to work with you.')))),
    section(t(l('Rede de contatos', 'Network')),
      h('table', { class: 'tbl compact' }, h('tbody', null, SECTORS.map((x) => h('tr', null, h('td', null, t(x.name)), h('td', null, String(netOf(s, x.id))),
        h('td', null, h('button', { class: 'btn tiny', onclick: () => say(network(s, x.id)) }, t(l('Networking', 'Networking')), ` ${B}`)))))),
      h('p', { class: 'small muted' }, t(l('Rede alta = candidatos melhores e mais chance de aceitarem sua oferta. Esfria ~1,5% ao mês.', 'High network = better candidates and better odds they accept. Cools ~1.5% a month.')))),
    section(t(l('Habilidades em uso', 'Skills at work')),
      h('p', { class: 'small' }, `${t(l('Carisma', 'Charisma'))} ${o.attrs.charisma} (${t(l('rende networking', 'boosts networking'))}) · ${t(l('Gestão', 'Management'))} ${o.attrs.management} (${t(l('rende mentoria', 'boosts mentoring'))}) · ${t(l('Negociação', 'Negotiation'))} ${o.attrs.negotiation} · ${t(l('Ouvido', 'Ear'))} ${o.attrs.ear}`),
      s.player.staff.length ? h('div', { class: 'row wrap' }, select(mentorId || s.player.staff[0].id, s.player.staff.map((x) => ({ value: x.id, label: `${x.name} (${roleName(x.role)} ${x.skill})` })), (v) => { mentorId = v; }),
        h('button', { class: 'btn small', onclick: () => say(mentorStaff(s, mentorId || s.player.staff[0].id)) }, t(l('Mentorar', 'Mentor')), ` ${B}`)) : null),
    section(t(l('Finanças pessoais', 'Personal finances')),
      h('p', { class: 'small' }, `${t(l('Patrimônio', 'Wealth'))}: ${$(o.wealth)} · ${t(l('Caixa do selo', 'Label cash'))}: ${$(s.player.cash)} · ${t(l('Diretores e gabinete', 'Directors and office'))}: ${$(heads)}/${t(l('mês', 'mo'))}`),
      h('p', { class: 'small muted' }, t(l('Rotinas automáticas (academia, terapia, família) ficam em Você → Rotinas e usam as bolinhas que sobrarem no fim do mês.', 'Automatic routines (gym, therapy, family) live in You → Routines and use the balls left at month end.')))));
}

// ================================================================ aba Contratar

let fRole = '', fText = '', fMin = 0;
export function hireBlock(s: GameState, short = false): HTMLElement {
  const roles = STAFF_ROLES.map((r) => ({ value: r.id, label: t(r.name) }));
  let cs = staffCands(s, fRole || undefined).filter((c) => c.skill >= fMin && (!fText || c.name.toLowerCase().includes(fText.toLowerCase())));
  cs = cs.sort((a, b) => b.skill - a.skill);
  if (short) cs = cs.slice(0, 6);
  const search = h('input', { type: 'search', value: fText, placeholder: t(l('buscar nome', 'search name')), 'aria-label': t(l('buscar nome', 'search name')), onchange: (e: Event) => { fText = (e.target as HTMLInputElement).value; rerender(); } });
  return section(`${t(l('Contratar', 'Hire'))} · ${t(l('equipe', 'staff'))} ${s.player.staff.length}/${hqCaps(s).staff}`,
    h('div', { class: 'row wrap' }, select(fRole, [{ value: '', label: t(l('Todas as funções', 'All roles')) }, ...roles], (v) => { fRole = v; rerender(); }), search,
      select(String(fMin), ['0', '40', '55', '70'].map((v) => ({ value: v, label: v === '0' ? t(l('qualquer habilidade', 'any skill')) : `≥ ${v}` })), (v) => { fMin = Number(v); rerender(); })),
    h('p', { class: 'small muted' }, t(l('Candidatos do trimestre: a qualidade sobe com a reputação do selo e a sua rede no setor. Empresários e produtores reais aparecem só nos anos em que atuaram e se tiverem agenda. Ofereça menos e arrisque a recusa.', 'This quarter\'s candidates: quality rises with label reputation and your network in the field. Real managers and producers show up only in their active years and if they have room. Offer less and risk a refusal.'))),
    candTable(s, cs, short),
    short ? h('button', { class: 'linkish small', onclick: () => { store.area = 'agenda17'; rerender(); } }, t(l('Mais candidatos, freelancers e músicos de estúdio →', 'More candidates, freelancers and session players →'))) : null);
}

// ================================================================ aba Freelancers

let flAct = '';
function freeTab(s: GameState): HTMLElement {
  const acts = hireableActs(s);
  if (!acts.length) return section(t(l('Freelancers', 'Freelancers')), h('p', { class: 'muted' }, t(l('Sem atos no elenco para trabalhar.', 'No acts on the roster to work on.'))));
  const act = acts.find((x) => x.id === flAct) ?? acts[0];
  return h('div', null,
    section(t(l('Contratar por uma ação', 'Hire for a single action')),
      h('p', { class: 'small muted' }, t(l('Freelancers não ocupam vaga na sede nem bolinha sua: pagam-se por ação. A lista muda todo mês; alguns estão com rivais.', 'Freelancers take no HQ seat and none of your balls: you pay per action. The list changes monthly; some are busy with rivals.'))),
      h('div', { class: 'row' }, t(l('Para', 'For')), ' ', select(act.id, acts.map((x) => ({ value: x.id, label: x.name })), (v) => { flAct = v; rerender(); }))),
    ...(Object.keys(FL) as FlKind[]).filter((k) => s.year >= FL[k].from).map((k) => section(t(FL[k].name),
      h('p', { class: 'small muted' }, t(FL[k].desc), k === 'promo' && PAYOLA_ERA(s.year) ? h('span', { class: 'bad' }, ' ', t(l('Época de jabá: os fracos pagam rádio por fora (risco de escândalo até ~28%).', 'Payola era: weak ones pay stations off (scandal risk up to ~28%).'))) : null),
      h('table', { class: 'tbl compact' }, h('tbody', null, freelancers(s, k).map((f) => h('tr', null,
        h('td', null, f.name), h('td', null, `${t(qName(f.q))} (${Math.round(f.q * 100)})`), h('td', null, $(f.fee)),
        h('td', null, f.busy ? pill(t(f.busy), 'warn') : h('button', { class: 'btn tiny primary', onclick: () => say(hireFreelancer(s, f.id, act.id)) }, t(l('Contratar', 'Hire')))))))))));
}

// ================================================================ aba Músicos de estúdio

let ssAct = '';
function sessionTab(s: GameState): HTMLElement {
  const acts = hireableActs(s), a = ag17(s);
  if (!acts.length) return section(t(l('Músicos de estúdio', 'Session players')), h('p', { class: 'muted' }, t(l('Sem atos no elenco.', 'No acts on the roster.'))));
  const act = acts.find((x) => x.id === ssAct) ?? acts[0];
  const m = s.year * 12 + s.month;
  const active = a.sess.filter((x) => x.until >= m);
  return h('div', null,
    section(t(l('Músicos de estúdio, orquestra e banda de apoio', 'Session players, orchestra and backing band')),
      h('p', { class: 'small muted' }, t(l('Turmas de estúdio famosas só existem nos anos em que tocaram. Gênero que casa com o som delas rende o efeito cheio; fora da praia, metade.', 'Famous studio crews exist only in the years they played. A genre that fits their sound gets the full effect; off-turf, half.'))),
      h('div', { class: 'row' }, t(l('Ato', 'Act')), ' ', select(act.id, acts.map((x) => ({ value: x.id, label: x.name })), (v) => { ssAct = v; rerender(); })),
      h('table', { class: 'tbl compact' }, h('tbody', null, crewsNow(s).map((c) => {
        const fit = crewFit(s, c, act);
        const eff = c.kind === 'backing' ? `${t(l('receita/show', 'revenue/show'))} +${Math.round((0.04 + 0.1 * fit.q) * 100)}% · 3 ${t(l('meses', 'months'))}` : `${t(l('qualidade', 'quality'))} +${(0.4 + 1.6 * fit.q).toFixed(1)} · 6 ${t(l('meses', 'months'))}`;
        return h('tr', null, h('td', null, h('b', null, t(crewName(s, c))), c.snd ? h('div', { class: 'small' }, t(c.snd)) : null, h('div', { class: 'small muted' }, t(c.note))),
          h('td', { class: 'small' }, eff, h('div', { class: fit.q < c.q ? 'bad' : 'good' }, t(fit.why))),
          h('td', null, `${$(crewFee(s, c))}${c.kind === 'backing' ? `/${t(l('mês', 'mo'))}` : ''}`),
          h('td', null, h('button', { class: 'btn tiny primary', onclick: () => say(bookCrew(s, c.id, act.id)) }, t(l('Contratar', 'Book')))));
      })))),
    active.length ? section(t(l('Contratos em andamento', 'Running deals')), h('ul', { class: 'small' }, active.map((x) => h('li', null, `${s.acts[x.actId]?.name ?? '—'} · ${t((() => { const c = crewById(x.crew); return c ? crewName(s, c) : l(x.crew, x.crew); })())} · ${t(l('até', 'until'))} ${(x.until % 12) + 1}/${Math.floor(x.until / 12)}`)))) : null);
}

// ================================================================ área

function agendaArea(s: GameState): HTMLElement {
  return h('div', { class: 'hub agenda17' }, tabs('agenda17', [
    { id: 'agenda', label: t(l('Agenda', 'Schedule')), icon: 'clock', render: () => agendaTab(s) },
    { id: 'you', label: t(l('Você', 'You')), icon: 'star', render: () => youTab(s) },
    { id: 'hire', label: t(l('Contratar', 'Hire')), icon: 'contract', render: () => hireBlock(s) },
    { id: 'free', label: t(l('Freelancers', 'Freelancers')), icon: 'handshake', render: () => freeTab(s) },
    { id: 'session', label: t(l('Músicos de estúdio', 'Session players')), icon: 'guitar', render: () => sessionTab(s) },
  ], rerender));
}
registerArea({ id: 'agenda17', label: l('Agenda e contratações', 'Schedule and hiring'), icon: 'clock', key: '', render: agendaArea, badge: (s) => overbooked(s) || undefined });

// ================================================================ Novo Jogo: custo de tempo das carreiras

/** Linha do Novo Jogo: quantas bolinhas as carreiras escolhidas ocupam e o que sobra para você. */
export function ngBalls17(main: string[]): HTMLElement {
  const n = main.length, spill = Math.max(0, n - OFFICE), free = Math.max(0, 5 - spill);
  return h('p', { class: `small ${spill > 5 ? 'bad' : spill ? 'warn' : 'good'}` },
    t(l('Tempo: cada carreira ocupa 1 bolinha por mês (2 se você ficar à frente, 0 se delegar a um diretor contratado). Você tem 2 de expediente + 5 pessoais (a banda não ocupa nenhuma). Com {n} carreira(s): {f} pessoais livres por mês.', 'Time: each career takes 1 ball a month (2 if you go hands-on, 0 if delegated to a hired director). You get 2 office + 5 personal balls (the band takes none). With {n} career(s): {f} personal balls free each month.'), { n, f: free }),
    ' ', h('span', { class: 'ag17-balls' }, ...Array.from({ length: OFFICE }, (_, i) => h('i', { class: `ag17-b ${i < n ? 'career' : 'spare'}` })), h('span', { class: 'ag17-sep' }, '|'),
      ...Array.from({ length: 5 }, (_, i) => h('i', { class: `ag17-b ${i < spill ? 'career' : 'free'}` }))));
}
