// Rodada 27 (INBOX) — modelo puro da Caixa de entrada estilo e-mail / Football Manager (sem DOM; testado em
// tests/r27-inbox.test.ts). A lista mostra uma linha curta por conversa (remetente, assunto, uma linha de prévia,
// data e categoria); o painel de leitura mostra o e-mail INTEIRO: cabeçalho (de, para, data, assunto), saudação e
// despedida na voz de quem escreve, o texto em parágrafos com nomes clicáveis (ato, pessoa, disco, selo, cidade —
// data-ent/data-id do ctx27), um quadro de detalhes (valores, prazo, padrão) e as ações da própria mensagem.
// Os modelos de texto são por TIPO (pedido, reclamação, saúde, proposta, demo, lance, eco, boletim, aviso…) com
// queda por categoria, então todo tipo registrado (registerInboxKind) tem e-mail completo em PT e EN.
// Nada aqui sorteia nem escreve no jogo, exceto os marcadores de interface (lido/estrela/arquivo) via sim/inbox18.

import { alertCat29, type AlertCat29 } from '../ps/alerts29model'; // r29 (M44)
import { STAFF_ROLES } from '../../data/rules';
import { cityById, genreById, l, type L } from '../../data/world';
import { ib18, inboxKind18, isStarred18, type InboxCat18 } from '../../sim/inbox18';
import { items18, type Item18 } from '../../sim/sys/inbox18';
import { thread18 } from '../../sim/sys/decide18';
import { playerPerson } from '../../sim/sys/life';
import { per13 } from '../../sim/sys/persona13';
import { MEDIUM_NAME, type InboxMsg } from '../../sim/sys/people/state';
import type { Decision, GameState } from '../../sim/types';
import { dateOfDay, fmtL, playerActs } from '../../sim/util';
import type { Ent27 } from '../ps/ent27';
import { relOf } from '../../sim/opinion';

// ---------------------------------------------------------------- categorias (rótulo curto de chip, ícone, tom)

export const CAT27: Record<InboxCat18, { name: L; icon: string; tone: 'good' | 'bad' | 'warn' | 'info' | 'accent' | 'neutral' }> = {
  decision: { name: l('Decisões', 'Decisions'), icon: 'calendar', tone: 'warn' },
  deals: { name: l('Contratos', 'Deals'), icon: 'contract', tone: 'accent' },
  people: { name: l('Artistas', 'Artists'), icon: 'fans', tone: 'info' },
  press: { name: l('Imprensa', 'Press'), icon: 'newspaper', tone: 'info' },
  money: { name: l('Finanças', 'Finance'), icon: 'money', tone: 'good' },
  world: { name: l('Mundo', 'World'), icon: 'globe', tone: 'neutral' },
  staff: { name: l('Equipe', 'Staff'), icon: 'handshake', tone: 'neutral' },
  life: { name: l('Pessoal', 'Personal'), icon: 'heart', tone: 'neutral' },
  analyst: { name: l('Relatórios', 'Reports'), icon: 'chart-up', tone: 'neutral' },
  other: { name: l('Outros', 'Other'), icon: 'key', tone: 'neutral' },
};
export const CAT_ORDER27: InboxCat18[] = ['decision', 'deals', 'people', 'press', 'money', 'world', 'staff', 'life', 'analyst', 'other'];

const MONTH_LONG: L[] = [
  l('janeiro', 'January'), l('fevereiro', 'February'), l('março', 'March'), l('abril', 'April'), l('maio', 'May'), l('junho', 'June'),
  l('julho', 'July'), l('agosto', 'August'), l('setembro', 'September'), l('outubro', 'October'), l('novembro', 'November'), l('dezembro', 'December'),
];
const MONTH_SHORT: L[] = [
  l('jan', 'Jan'), l('fev', 'Feb'), l('mar', 'Mar'), l('abr', 'Apr'), l('mai', 'May'), l('jun', 'Jun'),
  l('jul', 'Jul'), l('ago', 'Aug'), l('set', 'Sep'), l('out', 'Oct'), l('nov', 'Nov'), l('dez', 'Dec'),
];
const dt = (s: GameState, week: number) => dateOfDay(s.config.startYear, week * 7);
/** Data curta da lista: "12 mar" (com o ano quando não é o ano corrente). */
export function shortDate27(s: GameState, week: number): L {
  const d = dt(s, week);
  const y = d.year !== s.year ? ` ${d.year}` : '';
  return { pt: `${d.dom} ${MONTH_SHORT[d.month].pt}${y}`, en: `${MONTH_SHORT[d.month].en} ${d.dom}${y}` };
}
/** Data completa do cabeçalho: "12 de março de 1967". */
export function longDate27(s: GameState, week: number): L {
  const d = dt(s, week);
  return { pt: `${d.dom} de ${MONTH_LONG[d.month].pt} de ${d.year}`, en: `${MONTH_LONG[d.month].en} ${d.dom}, ${d.year}` };
}

// ---------------------------------------------------------------- texto: segmentos com entidades

/** Pedaço de texto: string simples ou nome clicável (data-ent/data-id). */
export type Seg27 = string | { e: Ent27; id: string; t: string };
export interface LS27 { pt: Seg27[]; en: Seg27[] }
interface EntRef { e: Ent27; id: string; name: string; /** nome em inglês, quando difere (cidades) */ alt?: string }

const clean = (x: string): string => x.replace(/\s+/g, ' ').trim();
/** Primeira letra maiúscula (alguns textos do jogo começam em minúscula, como continuação de frase). */
const ucfirst = (x: string): string => x.replace(/^(\P{L}*)(\p{Ll})/u, (_m, a: string, c: string) => a + c.toUpperCase());
/** Frases (corta depois de . ! ? … seguido de espaço e maiúscula/aspas). */
export function sentences27(x: string): string[] {
  return clean(x).split(/(?<=[.!?…])\s+(?=["“'(\p{Lu}\d$])/u).filter(Boolean);
}
const isWord = (c: string | undefined): boolean => !!c && /[\p{L}\p{N}]/u.test(c);

/** Corta o texto nos nomes conhecidos (mais longos primeiro, palavra inteira, sem sobreposição). */
export function segment27(text: string, ents: EntRef[]): Seg27[] {
  if (!text) return [];
  const hits: { a: number; b: number; r: EntRef }[] = [];
  const taken = (a: number, b: number) => hits.some((x) => a < x.b && b > x.a);
  const names = ents.flatMap((r) => [...new Set([r.name, r.alt ?? r.name])].map((n) => ({ n, r }))).sort((x, y) => y.n.length - x.n.length);
  for (const { n, r } of names) {
    if (n.length < 3) continue;
    let i = text.indexOf(n);
    while (i >= 0) {
      const j = i + n.length;
      if (!isWord(text[i - 1]) && !isWord(text[j]) && !taken(i, j)) hits.push({ a: i, b: j, r });
      i = text.indexOf(n, j);
    }
  }
  hits.sort((x, y) => x.a - y.a);
  const out: Seg27[] = [];
  let at = 0;
  for (const x of hits) {
    if (x.a > at) out.push(text.slice(at, x.a));
    out.push({ e: x.r.e, id: x.r.id, t: text.slice(x.a, x.b) });
    at = x.b;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}
const segL = (x: L, ents: EntRef[]): LS27 => ({ pt: segment27(x.pt, ents), en: segment27(x.en, ents) });
/** Texto corrido de um LS27 (para testes, busca e leitores de tela). */
export const plain27 = (x: Seg27[]): string => x.map((g) => (typeof g === 'string' ? g : g.t)).join('');

// ---------------------------------------------------------------- remetente

export interface Sender27 {
  kind: 'person' | 'act' | 'label' | 'desk' | 'org';
  name: string;
  /** nome traduzível (setores internos: "Financeiro"/"Finance", "Mesa de decisões"/"Decision desk") */
  nameL?: L;
  /** chave de pessoa (persona13: 'p:id', 'l:id'…) quando há retrato */
  person?: string;
  act?: string;
  label?: string;
  icon: string;
  /** linha da assinatura (papel / organização) */
  role: L;
}

const refStr = (m: InboxMsg | undefined, k: string): string => (m?.ref?.[k] !== undefined ? String(m.ref[k]) : '');
/** Setor interno que assina avisos do selo, por categoria (e o cargo da equipe que responde por ele). */
const DESK: Record<InboxCat18, { name: L; role: string }> = {
  decision: { name: l('Secretaria executiva', 'Executive office'), role: 'admin' },
  deals: { name: l('Comercial', 'Business affairs'), role: 'manager' },
  people: { name: l('A&R e elenco', 'A&R and roster'), role: 'anr' },
  press: { name: l('Assessoria de imprensa', 'Press office'), role: 'publicist' },
  money: { name: l('Financeiro', 'Finance'), role: 'admin' },
  world: { name: l('Inteligência de mercado', 'Market intelligence'), role: 'analyst' },
  staff: { name: l('Recursos humanos', 'Human resources'), role: 'admin' },
  life: { name: l('Secretaria pessoal', 'Personal office'), role: 'admin' },
  analyst: { name: l('Análise', 'Analysis'), role: 'analyst' },
  other: { name: l('Secretaria', 'Front office'), role: 'admin' },
};
const roleName = (id: string): L => STAFF_ROLES.find((r) => r.id === id)?.name ?? l(id, id);

function actOfName(s: GameState, name: string, m: InboxMsg | undefined): string {
  const ids = [refStr(m, 'act'), refStr(m, 'host'), refStr(m, 'guest')].filter(Boolean);
  return ids.find((id) => s.acts[id]?.name === name) ?? '';
}

/** Quem escreve: pessoa (retrato), ato (logo), selo (logo), setor interno (ícone) ou organização (ícone do tipo). */
export function sender27(s: GameState, it: Item18): Sender27 {
  const m = it.msg;
  const k = m?.ref?.k18 ? inboxKind18(String(m.ref.k18)) : undefined;
  if (it.source === 'notification' || it.source === 'decision') {
    const D = DESK[it.cat];
    const st = s.player.staff.find((x) => x.role === D.role);
    const nm = it.source === 'decision' ? l('Mesa de decisões', 'Decision desk') : D.name;
    return { kind: 'desk', name: st?.name ?? nm.pt, ...(st ? {} : { nameL: nm }), icon: it.source === 'decision' ? 'calendar' : CAT27[it.cat].icon,
      role: st ? { pt: `${roleName(st.role).pt} · ${nm.pt}`, en: `${roleName(st.role).en} · ${nm.en}` } : l(s.config.companyName, s.config.companyName) };
  }
  const from = m?.from ?? it.from;
  const kindL = k?.label ?? (m ? MSG_KIND[m.kind] : l('Mensagem', 'Message'));
  // pessoa citada pela mensagem e com o mesmo nome do remetente → retrato
  const pid = refStr(m, 'person') || refStr(m, 'pid');
  if (pid && s.persons[pid] && (s.persons[pid].name === from || m?.kind !== 'deal')) return { kind: 'person', name: from, person: `p:${pid}`, icon: 'person', role: kindL };
  const pk = refStr(m, 'p');
  if (pk && s.persons[pk]?.name === from) return { kind: 'person', name: from, person: `p:${pk}`, icon: 'person', role: kindL };
  const aid = actOfName(s, from, m);
  if (aid) return { kind: 'act', name: from, act: aid, icon: 'disc', role: kindL };
  const lb = refStr(m, 'lb') || refStr(m, 'label');
  if (lb && s.labels[lb] && (s.labels[lb].name === from || s.labels[lb].ceo === from)) return { kind: 'label', name: from, label: lb, icon: 'building', role: s.labels[lb].ceo === from ? { pt: `CEO · ${s.labels[lb].name}`, en: `CEO · ${s.labels[lb].name}` } : kindL };
  const staff = m?.kind === 'staff' ? s.player.staff.find((x) => x.id === refStr(m, 'staff')) : undefined;
  if (staff) return { kind: 'person', name: from, person: `s:${staff.id}`, icon: 'person', role: roleName(staff.role) };
  // nome de pessoa da partida? (membros dos atos citados)
  const actRef = s.acts[refStr(m, 'act')];
  const mem = actRef?.members.map((x) => s.persons[x]).find((p) => p?.name === from);
  if (mem) return { kind: 'person', name: from, person: `p:${mem.id}`, icon: 'person', role: { pt: `${kindL.pt} · ${actRef!.name}`, en: `${kindL.en} · ${actRef!.name}` } };
  const desk = DESK_FROM.find((x) => x.pt === from);
  if (desk) return { kind: 'desk', name: from, nameL: desk, icon: k?.icon ?? CAT27[it.cat].icon, role: { pt: `${kindL.pt} · ${s.config.companyName}`, en: `${kindL.en} · ${s.config.companyName}` } };
  return { kind: 'org', name: from, icon: k?.icon ?? CAT27[it.cat].icon, role: kindL };
}
/** Remetentes internos que os sistemas gravam como texto em PT (boletim, ecos, mesa…). */
const DESK_FROM: L[] = [l('Boletim', 'Bulletin'), l('Consequências', 'Consequences'), l('Mesa de decisões', 'Decision desk'), l('Desenvolvimento', 'Development'), l('Assessoria', 'Advisory desk')];
const MSG_KIND: Record<InboxMsg['kind'], L> = {
  request: l('Pedido', 'Request'), complaint: l('Conversa', 'Talk'), promise: l('Promessa', 'Promise'), health: l('Saúde', 'Health'), staff: l('Equipe', 'Staff'),
  owner: l('Vida pessoal', 'Personal life'), secret: l('Confidencial', 'Confidential'), info: l('Aviso', 'Notice'), fan: l('Carta de fã', 'Fan letter'), deal: l('Proposta', 'Proposal'),
};

// ---------------------------------------------------------------- voz do remetente (relação e traços) — sem sorteio

export interface Voice18 { cls: 'warm' | 'cold' | 'angry' | 'flat'; tag: L; open: L }
/** Como a pessoa escreve para você: relação (rel/confiança) e traços (persona13). Sem sorteio. */
export function voice18(s: GameState, m: InboxMsg): Voice18 | null {
  const pid = m.ref?.person ? String(m.ref.person) : '';
  const p = pid ? s.persons[pid] : undefined;
  const a = m.ref?.act ? s.acts[String(m.ref.act)] : p ? Object.values(s.acts).find((x) => x.members.includes(p.id)) : undefined;
  if (!p && !a) return null;
  const me = playerPerson(s);
  const rv = p && me ? relOf(s, p.id, me.id) : undefined;
  const rel = rv !== undefined ? rv : a ? (a.trust - 50) * 1.6 : 0;
  const P = p ? per13(s, `p:${p.id}`) : null;
  const ego = P?.facets.ego ?? 50, emp = P?.facets.empatia ?? 50, hum = P?.facets.humor ?? 50, res = p?.resentment ?? 0;
  const nm = me?.name.split(' ')[0] ?? l('chefe', 'boss').pt;
  if (res > 45 || rel < -35) return { cls: 'angry', tag: l('irritado', 'irritated'), open: ego > 60 ? l('Vou direto ao ponto, já que ninguém me ouve.', 'Straight to the point, since no one listens to me.') : l('Preciso falar, e não é bom.', 'I need to say this, and it isn\'t good.') };
  if (rel > 35) return { cls: 'warm', tag: l('caloroso', 'warm'), open: hum > 60 ? fmtL(l('Fala, {n}! Senta que lá vem história.', 'Hey {n}! Grab a seat, here\'s a story.'), { n: nm }) : fmtL(l('{n}, obrigado por tudo até aqui.', '{n}, thanks for everything so far.'), { n: nm }) };
  if (rel < -10 || emp < 30) return { cls: 'cold', tag: l('seco', 'curt'), open: l('Segue o assunto.', 'Here\'s the matter.') };
  return { cls: 'flat', tag: l('cordial', 'cordial'), open: fmtL(l('Oi, {n}.', 'Hi, {n}.'), { n: nm }) };
}

// ---------------------------------------------------------------- entidades citadas

function addEnt(out: EntRef[], e: Ent27, id: string, name: string | undefined, alt?: string): void {
  if (!id || !name || out.some((x) => x.e === e && x.id === id)) return;
  out.push({ e, id, name, ...(alt && alt !== name ? { alt } : {}) });
}
/** Entidades da mensagem: as do `ref`/`ctx` e os nomes conhecidos que aparecem no texto (atos, selos, seus discos, cidades). */
export function ents27(s: GameState, it: Item18): EntRef[] {
  const out: EntRef[] = [];
  const d = it.decisionId ? s.decisions.find((x) => x.id === it.decisionId) : undefined;
  const ref: Record<string, string | number> = { ...(d?.ctx ?? {}), ...(it.msg?.ref ?? {}) };
  for (const k of ['act', 'host', 'guest', 'mine', 'other', 'actId']) { const a = s.acts[String(ref[k] ?? '')]; if (a) addEnt(out, 'act', a.id, a.name); }
  for (const k of ['person', 'pid', 'p']) { const p = s.persons[String(ref[k] ?? '')]; if (p) addEnt(out, 'person', `p:${p.id}`, p.name); }
  for (const k of ['A', 'T']) {
    const key = String(ref[k] ?? '');
    if (!key.includes(':')) continue;
    if (key.startsWith('a:')) { const a = s.acts[key.slice(2)]; if (a) addEnt(out, 'act', a.id, a.name); continue; }
    const P = per13(s, key);
    if (P) addEnt(out, 'person', key, P.name);
  }
  for (const k of ['rel', 'release']) { const r = s.releases[String(ref[k] ?? '')]; if (r) addEnt(out, 'release', r.id, r.title); }
  for (const k of ['lb', 'label']) { const b = s.labels[String(ref[k] ?? '')]; if (b) addEnt(out, 'label', b.id, b.name); }
  const c = cityById[String(ref.city ?? '')];
  if (c) addEnt(out, 'city', c.id, c.name.pt, c.name.en);
  // nomes conhecidos no texto (palavra inteira): atos, selos, discos dos seus atos e cidades
  const txt = `${it.subject.pt} ${it.body.pt}`, txtEn = `${it.subject.en} ${it.body.en}`;
  for (const a of Object.values(s.acts)) if (a.name.length >= 4 && txt.includes(a.name)) addEnt(out, 'act', a.id, a.name);
  for (const b of Object.values(s.labels)) if (b.name.length >= 4 && txt.includes(b.name)) addEnt(out, 'label', b.id, b.name);
  for (const id of playerActs(s)) for (const rid of s.acts[id]?.releases ?? []) { const r = s.releases[rid]; if (r && r.title.length >= 4 && txt.includes(`"${r.title}"`)) addEnt(out, 'release', r.id, r.title); }
  for (const cy of Object.values(cityById)) if (cy.name.pt.length >= 5 && (txt.includes(cy.name.pt) || txtEn.includes(cy.name.en))) addEnt(out, 'city', cy.id, cy.name.pt, cy.name.en);
  // pessoas: membros dos atos citados cujo nome aparece
  for (const e of [...out]) if (e.e === 'act') for (const pid of s.acts[e.id]?.members ?? []) { const p = s.persons[pid]; if (p && txt.includes(p.name)) addEnt(out, 'person', `p:${p.id}`, p.name); }
  return out;
}

// ---------------------------------------------------------------- assunto e prévia (curtos: a lista lê só isto)

const MONEY_RX = /−?\$\s?\d[\d.,]*(?:\s?(?:mil|mi|bi)\b|[kMB]\b)?|US\$\s?\d[\d.,]*(?:\s?(?:mil|mi|bi)\b|[kMB]\b)?/g;
/** Valores em dinheiro citados no texto (na ordem, sem repetir). */
export const amounts27 = (x: string): string[] => [...new Set((x.match(MONEY_RX) ?? []).map((v) => v.replace(/[.,]+$/, '')))].slice(0, 4);

/** Corta no limite de palavra (≤ n) com reticências. */
function clipW(x: string, n: number): string {
  if (x.length <= n) return x;
  const cut = x.slice(0, n - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:—-]+$/, '')}…`;
}
/** Assunto de um aviso: a 1ª frase (sem o que vem depois de " — ", até 96 caracteres; a lista corta com reticências)
 *  e a prévia: o que vem depois do travessão e as frases seguintes. */
function noteParts(x: string): { subj: string; rest: string } {
  const ss = sentences27(x.split('\n')[0]);
  const f = (ss[0] ?? clean(x)).replace(/[.]$/, '');
  const dash = f.indexOf(' — ');
  const head = dash >= 12 ? f.slice(0, dash) : f;
  return { subj: clipW(head, 96), rest: [dash >= 12 ? f.slice(dash + 3) : '', ...ss.slice(1)].filter(Boolean).join(' ') };
}
const stripArrow = (x: string): string => x.replace(/^↳\s*/, '');

/** Assunto curto (lista e cabeçalho). Avisos do selo (antes "Aviso"/"Alerta") viram a primeira frase. */
export function subject27(it: Item18): L {
  if (it.source === 'notification') return { pt: noteParts(it.body.pt).subj, en: noteParts(it.body.en).subj };
  return { pt: stripArrow(it.subject.pt), en: stripArrow(it.subject.en) };
}
/** Prévia de uma linha (≤ 110 caracteres): o começo do texto, sem repetir o assunto. */
export function snippet27(it: Item18): L {
  const one = (body: string, subj: string, fallback: string): string => {
    if (it.source === 'notification') { const r = noteParts(body).rest; return clipW(r || fallback, 110); }
    const lines = body.split('\n').map((x) => x.replace(/^•\s*/, '').trim()).filter(Boolean);
    const ss = sentences27(lines[0] ?? '');
    let f = ss[0] ?? '';
    if (clean(f).replace(/[.!]$/, '') === clean(subj).replace(/[.!]$/, '') && ss[1]) f = ss[1];
    return ucfirst(clipW(f.replace(/^["“]|["”]$/g, '') || fallback, 110));
  };
  const D = DESK[it.cat];
  const NOTE_TONE: Record<string, L> = { bad: l('Alerta', 'Alert'), good: l('Boa notícia', 'Good news'), event: l('Acontecimento', 'Event'), info: l('Aviso interno', 'Internal note') };
  const fb: L = it.source === 'notification' ? fmtL(l('{t} · {d}', '{t} · {d}'), { t: NOTE_TONE[it.tone] ?? NOTE_TONE.info, d: D.name }) : l('Abra para ler.', 'Open to read.');
  const sj = subject27(it);
  return { pt: one(it.body.pt, sj.pt, fb.pt), en: one(it.body.en, sj.en, fb.en) };
}

// ---------------------------------------------------------------- fios (conversas)

const PEOPLE_KINDS = new Set<InboxMsg['kind']>(['request', 'complaint', 'promise', 'health', 'owner']);
/** Conversa da mensagem: o mesmo assunto (fio de decisão, a mesma pessoa, ou o mesmo tipo de negócio com o mesmo ato). */
export function threadId27(it: Item18): string | null {
  const m = it.msg;
  if (!m || it.source !== 'msg') return null;
  const r = m.ref ?? {};
  if (r.thr) return `t:${r.thr}`;
  if (PEOPLE_KINDS.has(m.kind) && r.person) return `p:${r.person}`;
  const k18 = r.k18 ? String(r.k18) : '';
  if (k18 === 'bulletin19' || k18 === 'analyst') return null;
  const fam = k18 ? k18.split('_')[0] : String(r.sys ?? '');
  const ent = r.act ?? r.host ?? r.other ?? r.mv ?? r.p ?? r.lb ?? r.person;
  return fam && ent !== undefined ? `${fam}:${ent}` : null;
}

// ---------------------------------------------------------------- linhas da lista

export interface Mail27 {
  key: string;
  it: Item18;
  subject: L;
  snippet: L;
  sender: Sender27;
  date: L;
  week: number;
  cat: InboxCat18;
  unread: boolean;
  starred: boolean;
  /** pede resposta (mensagem com botões em aberto ou decisão na mesa) */
  reply: boolean;
  /** pede resposta e o prazo vence em até 2 semanas */
  due: boolean;
  prio: number;
  tone: 'good' | 'bad' | 'info' | 'event' | 'neutral';
}
export interface Thread27 { id: string; mails: Mail27[]; head: Mail27; n: number; unread: boolean; starred: boolean; reply: boolean; due: boolean; prio: number; week: number; cat: InboxCat18 }

export const needsReply27 = (it: Item18): boolean => it.source === 'decision' || !!(it.msg?.actions?.length && !it.msg.resolved);
/** Prazo curto: mensagem que vence em ≤ 2 semanas ou decisão com relógio (dl18) vencendo em ≤ 1 semana. */
function due27(s: GameState, it: Item18): boolean {
  if (!needsReply27(it)) return false;
  if (it.msg?.expires) return it.msg.expires - s.week <= 2;
  const d = it.decisionId ? s.decisions.find((x) => x.id === it.decisionId) : undefined;
  const dl = Number(d?.ctx.dl18 ?? 0);
  return !!dl && dl - s.week <= 1;
}
export function mail27(s: GameState, it: Item18): Mail27 {
  const tone = (it.msg?.ref?.tone ?? it.tone) as string;
  return {
    key: it.key, it, subject: subject27(it), snippet: snippet27(it), sender: sender27(s, it), date: shortDate27(s, it.week), week: it.week, cat: it.cat,
    unread: it.unread, starred: isStarred18(s, it.key), reply: needsReply27(it), due: due27(s, it), prio: it.prio,
    tone: tone === 'bad' || tone === 'good' || tone === 'info' || tone === 'event' ? tone : 'neutral',
  };
}

export type Box27 = 'inbox' | 'snoozed' | 'archived';
export type Sort27 = 'date' | 'prio';
export interface Filter27 { box: Box27; cats: InboxCat18[]; unread: boolean; reply: boolean; starred: boolean; q: string; sort: Sort27; /** r29 (M44): categoria de alerta */ alert?: AlertCat29 }
export const FILTER0_27 = (): Filter27 => ({ box: 'inbox', cats: [], unread: false, reply: false, starred: false, q: '', sort: 'date' });

/** Adiar (some da Entrada até a semana; fica em "Adiadas"). Estado no save (ib18.snooze, chave m:…). */
export const snoozed27 = (s: GameState, key: string): boolean => (ib18(s).snooze[`m:${key}`] ?? -1) > s.week;
export function snooze27(s: GameState, key: string, weeks: number): void {
  if (weeks) ib18(s).snooze[`m:${key}`] = s.week + weeks; else delete ib18(s).snooze[`m:${key}`];
}

const norm = (x: string): string => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const pickTh = (ms: Mail27[]): Mail27 => ms.find((x) => x.reply) ?? ms[0];

/** Agrupa em conversas (mais nova primeiro dentro e fora). */
export function threads27(mails: Mail27[]): Thread27[] {
  const by = new Map<string, Mail27[]>();
  const order: string[] = [];
  for (const m of [...mails].sort((a, b) => b.week - a.week || b.prio - a.prio)) {
    const id = threadId27(m.it) ?? `k:${m.key}`;
    if (!by.has(id)) { by.set(id, []); order.push(id); }
    by.get(id)!.push(m);
  }
  return order.map((id) => {
    const ms = by.get(id)!;
    const head = pickTh(ms);
    return { id, mails: ms, head, n: ms.length, unread: ms.some((x) => x.unread), starred: ms.some((x) => x.starred), reply: ms.some((x) => x.reply), due: ms.some((x) => x.due),
      prio: Math.max(...ms.map((x) => x.prio)), week: ms[0].week, cat: head.cat };
  });
}

/** r29 (M44): categoria de alerta de uma conversa (assunto + corpo da mensagem principal + categoria da caixa). */
export const threadAlert27 = (x: Thread27): AlertCat29 => alertCat29(`${x.head.subject.pt} ${x.head.it.body.pt} ${x.head.subject.en}`, x.cat);
export interface Box27Model { threads: Thread27[]; cats: InboxCat18[]; total: number }
/** A caixa filtrada e ordenada: caixa (entrada/adiadas/arquivadas), categorias, não lidas, pedem resposta, estrela, busca. */
export function mailbox27(s: GameState, f: Filter27): Box27Model {
  let xs = items18(s, { archived: f.box === 'archived' });
  if (f.box === 'snoozed') xs = xs.filter((x) => snoozed27(s, x.key));
  else if (f.box === 'inbox') xs = xs.filter((x) => !snoozed27(s, x.key));
  const all = threads27(xs.map((it) => mail27(s, it)));
  const cats = CAT_ORDER27.filter((c) => all.some((x) => x.cat === c));
  const q = norm(f.q.trim());
  let th = all.filter((x) => (!f.cats.length || f.cats.includes(x.cat)) && (!f.unread || x.unread) && (!f.reply || x.reply) && (!f.starred || x.starred)
    && (!f.alert || threadAlert27(x) === f.alert));
  if (q) th = th.filter((x) => x.mails.some((m) => norm(`${m.subject.pt} ${m.subject.en} ${m.it.body.pt} ${m.it.body.en} ${m.sender.name}`).includes(q)));
  th.sort(f.sort === 'prio'
    ? (a, b) => b.prio - a.prio || Number(b.reply) - Number(a.reply) || b.week - a.week
    : (a, b) => b.week - a.week || b.prio - a.prio);
  return { threads: th, cats, total: all.length };
}

// ---------------------------------------------------------------- o e-mail completo

export interface Fact27 { label: L; value: LS27; tone?: 'good' | 'bad' | 'warn' }
export interface Para27 { k: 'p' | 'li'; s: LS27 }
export interface Letter27 {
  key: string;
  subject: L;
  from: Sender27;
  to: L;
  date: L;
  /** semana da partida e meio da época (carta, telegrama, telefonema, fax, e-mail, mensagem) */
  meta: L;
  greeting: L;
  intro: L | null;
  paras: Para27[];
  facts: Fact27[];
  closing: L | null;
  signoff: L;
  /** sua resposta, quando já respondeu */
  replied: L | null;
  voice: Voice18 | null;
}

type V = Record<string, string | number | L>;
/** Modelos por tipo: abertura em uma frase na voz de quem escreve. Queda: tipo → família → categoria. */
const INTRO_KIND: Record<string, L> = {
  // pessoas (people/*)
  request: l('Queria te pedir uma coisa — e não é fácil pedir.', 'I want to ask you something — and it isn\'t easy to ask.'),
  complaint: l('Precisamos conversar, e prefiro ser direto.', 'We need to talk, and I\'d rather be direct.'),
  promise: l('Passando para lembrar de uma promessa que você me fez.', 'Just a reminder of a promise you made me.'),
  health: l('Escrevo sobre a minha saúde. Não está fácil.', 'I\'m writing about my health. It isn\'t easy.'),
  staff: l('Queria conversar sobre o meu salário.', 'I\'d like to talk about my salary.'),
  owner: l('Um assunto da sua vida fora do escritório.', 'A matter from your life outside the office.'),
  secret: l('Tenho em mãos uma informação que pode lhe interessar — ou preocupar.', 'I have some information that may interest you — or worry you.'),
  fan: l('Sou fã do selo e precisava escrever.', 'I\'m a fan of the label and had to write.'),
  info: l('Para seu conhecimento.', 'For your information.'),
  // sistemas de negócio (ref.sys) e tipos registrados (k18, por família)
  feat8: l('Estou preparando uma faixa nova e penso em {act} para dividir o microfone.', 'I\'m working on a new track and I\'m thinking of {act} to share the mic.'),
  // R29 (feat de pessoa): o convite é para UMA pessoa do seu ato, não para a banda inteira
  featp29: l('Estou preparando uma faixa nova e quero {person} nela — só {person}, sem o resto de {act}.', 'I\'m working on a new track and I want {person} on it — just {person}, not the rest of {act}.'),
  bond9: l('Acho que temos interesses em comum. Que tal formalizar?', 'I think we have common interests. Shall we make it formal?'),
  mov9: l('Um grupo de artistas está se juntando em torno de uma ideia — e queremos {act} junto.', 'A group of artists is gathering around an idea — and we want {act} with us.'),
  echo18: l('Sobre "{thr}": a história teve desdobramento.', 'About "{thr}": the story has moved on.'),
  bulletin19: l('Os avisos menores da semana, reunidos num lugar só:', 'This week\'s minor notices, gathered in one place:'),
  analyst: l('Separei o que mais pede a sua atenção agora:', 'Here is what needs your attention most right now:'),
  follow19: l('Um cartão ficou na fila porque a mesa de decisões estava cheia.', 'A card was queued because the decision desk was full.'),
  disc18: l('Chegou material novo de um artista sem contrato.', 'New material arrived from an unsigned artist.'),
  mb19: l('Temos interesse e viemos com uma proposta firme.', 'We are interested and come with a firm offer.'),
  r21: l('Tenho uma proposta para {act} e prefiro tratar direto com você.', 'I have a proposal for {act} and I\'d rather deal with you directly.'),
  wr19: l('Tenho uma canção que pode ser a cara do seu elenco.', 'I have a song that could suit your roster.'),
  a18: l('Do seu selo, sobre a sua carreira:', 'From your label, about your career:'),
  traj18: l('Depois do que aconteceu, queria te dizer como estou encarando as coisas.', 'After what happened, I wanted to tell you how I\'m taking it.'),
  ability18: l('O balanço de quem cresceu e de quem estacionou no elenco:', 'Who grew and who stalled in the roster:'),
  agency18: l('Uma movimentação nos bastidores que envolve gente sua.', 'A backstage move that involves your people.'),
  press18: l('Da redação — melhor você saber antes de sair.', 'From the newsroom — better you hear it before it runs.'),
  ct19: l('As inscrições estão abertas e o seu selo foi lembrado.', 'Entries are open and your label came to mind.'),
  tv18: l('A emissora está montando a próxima temporada.', 'The network is putting together the next season.'),
  ad19: l('Uma marca quer a música do seu elenco numa campanha.', 'A brand wants your roster\'s music in a campaign.'),
  exch20: l('Um convite para trocar experiência com outra cena.', 'An invitation to trade experience with another scene.'),
  r21_fest: l('Queremos {act} na escalação deste ano.', 'We want {act} on this year\'s line-up.'),
  r21_mgr: l('Quero cuidar da carreira de {act} — e acho que posso ajudar vocês dois.', 'I want to manage {act} — and I think I can help you both.'),
  r21_fin: l('Tenho capital e bom ouvido; quero entrar no próximo disco de {act}.', 'I have capital and a good ear; I want in on {act}\'s next record.'),
  r21_war: l('Vou ser franco: tenho interesse em {act} e prefiro que você saiba por mim.', 'I\'ll be frank: I\'m interested in {act} and I\'d rather you heard it from me.'),
  r21_sponsor: l('Nossa marca procura artistas para uma parceria.', 'Our brand is looking for artists to partner with.'),
  r21_client: l('Estou procurando quem cuide da minha carreira — e pensei no seu selo.', 'I\'m looking for someone to look after my career — and I thought of your label.'),
  mb19_mgr: l('Quero ser o empresário de {act} — de tudo.', 'I want to manage {act} — everything.'),
  mb19_revolt: l('{act} está em pé de guerra com o empresário.', '{act} is at war with their manager.'),
  mb19_junk: l('O contrato de {act} está no fim e ainda falta um disco.', '{act}\'s contract is ending and one record is still owed.'),
  mb19_klein: l('A gestão de {act} virou briga.', '{act}\'s management has turned into a fight.'),
  sc19: l('Estamos montando a trilha e uma música do seu catálogo caiu como uma luva.', 'We are putting the soundtrack together and a song from your catalog fits like a glove.'),
  cx19_wave: l('A internet resolveu cancelar alguém do seu elenco — e a onda está crescendo.', 'The internet has decided to cancel someone on your roster — and the wave is growing.'),
  cx19_back: l('A poeira baixou; talvez seja a hora do retorno.', 'The dust has settled; it may be time for a comeback.'),
  ins19: l('Sobre o seguro dos seus shows e estúdios:', 'About the insurance on your shows and studios:'),
  m19_call: l('O banco quer conversar sobre a sua dívida — com urgência.', 'The bank wants to talk about your debt — urgently.'),
  m19_auc: l('Vai a leilão um catálogo que pode interessar.', 'A catalog that may interest you is going to auction.'),
  soc18: l('Recebemos um ofício das autoridades.', 'We received an official notice from the authorities.'),
  supply: l('Notícias da fábrica e da distribuição.', 'News from the pressing plant and distribution.'),
  st18: l('Os números do streaming chegaram — e chamam atenção.', 'The streaming numbers are in — and they stand out.'),
  rights18: l('Sobre os direitos das suas músicas:', 'About the rights to your songs:'),
  zn19: l('Da redação — melhor você saber antes de sair.', 'From the newsroom — better you hear it before it runs.'),
  trib19: l('Estamos preparando um tributo e o seu catálogo está na conversa.', 'We are preparing a tribute and your catalog is part of it.'),
  fk19: l('Há algo estranho com uma banda no mercado — e pode respingar em você.', 'Something is off with a band on the market — and it may splash on you.'),
  rev19: l('Uma música antiga voltou a tocar do nada.', 'An old song is suddenly playing again.'),
  aw18: l('Os indicados saíram — e há um problema.', 'The nominations are out — and there is a problem.'),
  reg19: l('Notícias da região que mexem com o seu elenco.', 'Regional news that affects your roster.'),
  union20: l('O sindicato pede uma conversa.', 'The union asks for a talk.'),
  gear19: l('Queremos o seu artista tocando os nossos instrumentos.', 'We want your artist playing our instruments.'),
  deal: l('Temos uma proposta de parceria para a {company}.', 'We have a partnership proposal for {company}.'),
  l19b: l('Uma movimentação nos bastidores do mercado.', 'A backstage move in the market.'),
  ai18: l('Sobre inteligência artificial e o seu catálogo:', 'About artificial intelligence and your catalog:'),
  camps18: l('Da sala de composição:', 'From the songwriting room:'),
};
const INTRO_CAT: Record<InboxCat18, L> = {
  decision: l('Preciso de uma decisão sua sobre o assunto abaixo.', 'I need a decision from you on the matter below.'),
  deals: l('Escrevo em nome de {from} com uma proposta para a {company}.', 'I\'m writing on behalf of {from} with a proposal for {company}.'),
  people: l('Notícias do elenco que pedem a sua atenção.', 'Roster news that needs your attention.'),
  press: l('Isto deve circular na imprensa — melhor você saber antes.', 'This will be in the press — better you hear it first.'),
  money: l('Um assunto de dinheiro que pede a sua atenção.', 'A money matter that needs your attention.'),
  world: l('Uma movimentação no mercado que vale acompanhar.', 'A market move worth following.'),
  staff: l('Um assunto da equipe.', 'A staff matter.'),
  life: l('Um assunto pessoal.', 'A personal matter.'),
  analyst: l('Segue o resumo que preparei.', 'Here is the summary I prepared.'),
  other: l('Para seu conhecimento.', 'For your information.'),
};
const INTRO_NOTE: Record<string, L> = {
  bad: l('Um alerta da operação — vale olhar logo:', 'An alert from operations — worth a look soon:'),
  good: l('Uma boa notícia da operação:', 'Good news from operations:'),
  event: l('Aconteceu algo que você precisa saber:', 'Something happened you should know about:'),
  info: l('Um aviso da operação, para o seu registro:', 'A note from operations, for your records:'),
};
const INTRO_DECISION = l('Este assunto está na mesa de decisões e precisa de uma escolha sua.', 'This is on the decision desk and needs your call.');

function introOf(it: Item18, snd: Sender27, vars: V): L {
  if (it.source === 'notification') return INTRO_NOTE[it.tone] ?? INTRO_NOTE.info;
  if (it.source === 'decision') return INTRO_DECISION;
  const m = it.msg!;
  const k18 = m.ref?.k18 ? String(m.ref.k18) : '';
  const sys = m.ref?.sys && m.ref.sys !== 'k18' ? String(m.ref.sys) : '';
  const base = INTRO_KIND[k18] ?? INTRO_KIND[k18.split('_')[0]] ?? (sys ? INTRO_KIND[sys] : undefined) ?? (m.kind !== 'deal' ? INTRO_KIND[m.kind] : undefined)
    ?? (it.cat === 'deals' && snd.kind !== 'org' && snd.kind !== 'label' ? l('Tenho uma proposta para você.', 'I have a proposal for you.') : INTRO_CAT[it.cat]);
  // modelo que cita algo ausente (ex.: {act} sem ato) cai para o da categoria
  const ok = (x: L) => (x.pt.match(/\{(\w+)\}/g) ?? []).every((k) => vars[k.slice(1, -1)] !== undefined && vars[k.slice(1, -1)] !== '');
  return fmtL(ok(base) ? base : INTRO_CAT[it.cat], vars);
}

function greetingOf(s: GameState, it: Item18, snd: Sender27, v: Voice18 | null, you: string): L {
  if (snd.kind === 'desk') return fmtL(l('{y},', '{y},'), { y: you });
  if (v) {
    if (v.cls === 'warm') return fmtL(l('Fala, {y}!', 'Hey {y}!'), { y: you });
    if (v.cls === 'angry') return fmtL(l('{y}.', '{y}.'), { y: you });
    if (v.cls === 'cold') return fmtL(l('{y},', '{y},'), { y: you });
    return fmtL(l('Oi, {y},', 'Hi {y},'), { y: you });
  }
  switch (it.medium) {
    case 'letter': return fmtL(l('Prezado(a) {y},', 'Dear {y},'), { y: you });
    case 'telegram': return fmtL(l('A/C {y} —', 'ATTN {y} —'), { y: you.toUpperCase() });
    case 'phone': return fmtL(l('Alô, {y}? Aqui é {f}.', 'Hello, {y}? {f} here.'), { y: you, f: snd.name });
    case 'fax': return fmtL(l('A/C: {y} — {c}', 'Attn: {y} — {c}'), { y: you, c: s.config.companyName });
    case 'email': return fmtL(l('Olá, {y},', 'Hello {y},'), { y: you });
    default: return fmtL(l('Oi, {y}!', 'Hi {y}!'), { y: you });
  }
}
function signoffOf(snd: Sender27, v: Voice18 | null): L {
  if (snd.kind === 'desk') return l('Sigo acompanhando,', 'Keeping an eye on it,');
  if (v?.cls === 'warm') return l('Um abraço,', 'Big hug,');
  if (v?.cls === 'cold') return l('Att.,', 'Regards,');
  if (v?.cls === 'angry') return l('Sem mais,', 'That\'s all,');
  if (v) return l('Abraços,', 'Cheers,');
  return l('Atenciosamente,', 'Sincerely,');
}

/** Parágrafos do corpo: linhas "• …" viram itens; "Resumo: a · b · c" vira lista; texto longo quebra a cada 2 frases. */
function parasOf(body: L, ents: EntRef[]): Para27[] {
  const split = (x: string): { k: 'p' | 'li'; t: string }[] => {
    const out: { k: 'p' | 'li'; t: string }[] = [];
    for (const raw of x.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      if (/^[•·-]\s/.test(line)) { out.push({ k: 'li', t: line.replace(/^[•·-]\s*/, '') }); continue; }
      const dash = line.indexOf(' — ');
      const rest = dash >= 0 ? line.slice(dash + 3) : '';
      if (rest.split(' · ').length >= 2) {
        out.push({ k: 'p', t: line.slice(0, dash).replace(/[:.]?$/, ':') });
        for (const x2 of rest.split(' · ')) out.push({ k: 'li', t: x2.trim() });
        continue;
      }
      const ss = sentences27(line);
      if (line.length <= 240 || ss.length <= 2) { out.push({ k: 'p', t: line }); continue; }
      for (let i = 0; i < ss.length; i += 2) out.push({ k: 'p', t: ss.slice(i, i + 2).join(' ') });
    }
    return out;
  };
  const pt = split(ucfirst(body.pt)), en = split(ucfirst(body.en));
  // as duas línguas quase sempre têm a mesma forma; se não tiverem, cai para um parágrafo por língua
  if (pt.length !== en.length || pt.some((x, i) => x.k !== en[i].k)) return [{ k: 'p', s: segL({ pt: clean(body.pt.replace(/\n•\s*/g, ' · ')), en: clean(body.en.replace(/\n•\s*/g, ' · ')) }, ents) }];
  return pt.map((x, i) => ({ k: x.k, s: segL({ pt: x.t, en: en[i].t }, ents) }));
}

const plainLS = (x: L): LS27 => ({ pt: [x.pt], en: [x.en] });
const entLS = (r: EntRef, extra?: L): LS27 => ({ pt: [{ e: r.e, id: r.id, t: r.name }, ...(extra ? [extra.pt] : [])], en: [{ e: r.e, id: r.id, t: r.alt ?? r.name }, ...(extra ? [extra.en] : [])] });

/** Quadro de detalhes: quem/o quê (clicável), valores, prazo e o que vale sem resposta. */
function factsOf(s: GameState, it: Item18, ents: EntRef[], d: Decision | undefined): Fact27[] {
  const out: Fact27[] = [];
  const act = ents.find((x) => x.e === 'act');
  if (act) {
    const a = s.acts[act.id];
    const g = a ? genreById[a.genre]?.name : undefined;
    const own = a?.owner === 'player' ? l('seu elenco', 'your roster') : a?.owner ? l('com contrato', 'signed') : l('sem contrato', 'unsigned');
    out.push({ label: l('Artista', 'Act'), value: entLS(act, a ? { pt: ` · ${g?.pt ?? a.genre} · ${own.pt} · fama ${Math.round(a.fame)}`, en: ` · ${g?.en ?? a.genre} · ${own.en} · fame ${Math.round(a.fame)}` } : undefined) });
  }
  const per = ents.find((x) => x.e === 'person' && !(act && s.acts[act.id]?.name === x.name));
  if (per) out.push({ label: l('Pessoa', 'Person'), value: entLS(per) });
  const rel = ents.find((x) => x.e === 'release');
  if (rel) out.push({ label: l('Disco', 'Release'), value: entLS(rel) });
  const lb = ents.find((x) => x.e === 'label');
  if (lb) out.push({ label: l('Selo', 'Label'), value: entLS(lb) });
  const cy = ents.find((x) => x.e === 'city');
  if (cy) out.push({ label: l('Cidade', 'City'), value: entLS(cy) });
  const $pt = amounts27(it.body.pt), $en = amounts27(it.body.en);
  if ($pt.length) out.push({ label: l('Valores', 'Amounts'), value: { pt: [$pt.join(' · ')], en: [($en.length ? $en : $pt).join(' · ')] } });
  const m = it.msg;
  if (m?.actions?.length && !m.resolved && m.expires) {
    const n = Math.max(0, m.expires - s.week);
    const dl = longDate27(s, m.expires);
    out.push({ label: l('Prazo', 'Deadline'), value: plainLS(fmtL(l('{d} ({n} sem.)', '{d} ({n} wk)'), { d: dl, n })), tone: n <= 2 ? 'bad' : 'warn' });
    out.push({ label: l('Sem resposta', 'If unanswered'), value: plainLS(m.actions[m.actions.length - 1].label) });
  }
  if (d) {
    const def = d.options.find((o) => o.id === d.defaultOption);
    const dl = Number(d.ctx.dl18 ?? 0);
    if (dl) out.push({ label: l('Prazo', 'Deadline'), value: plainLS(fmtL(l('{d} ({n} sem.)', '{d} ({n} wk)'), { d: longDate27(s, dl), n: Math.max(0, dl - s.week) })), tone: dl - s.week <= 1 ? 'bad' : 'warn' });
    if (def) out.push({ label: l('Sem resposta', 'If unanswered'), value: plainLS(fmtL(l('{o} (ao avançar o mês)', '{o} (when the month advances)'), { o: def.label })) });
  }
  return out;
}

function closingOf(s: GameState, it: Item18, snd: Sender27, v: Voice18 | null): L | null {
  const m = it.msg;
  if (it.source === 'decision') return l('A escolha é sua — os botões estão logo abaixo.', 'The call is yours — the buttons are right below.');
  if (m?.actions?.length && !m.resolved) {
    return m.expires ? fmtL(l('Fico no aguardo da sua resposta até {d}.', 'I look forward to your answer by {d}.'), { d: longDate27(s, m.expires) }) : l('Fico no aguardo da sua resposta.', 'I look forward to your answer.');
  }
  if (m?.resolved) return null;
  if (snd.kind === 'desk') return it.goto ? l('O atalho para o assunto está logo abaixo.', 'The shortcut to the matter is right below.') : null;
  if (v?.cls === 'warm') return l('Conto com você.', 'Counting on you.');
  if (v?.cls === 'angry') return l('Espero que desta vez você ouça.', 'I hope you listen this time.');
  if (v?.cls === 'cold') return null;
  return snd.kind === 'org' || snd.kind === 'label' ? l('Seguimos à disposição.', 'We remain at your disposal.') : l('Até breve.', 'Talk soon.');
}

/** Nome de tratamento do jogador (primeiro nome) e o "Para:" (você e o selo). */
export function you27(s: GameState): { first: string; to: L } {
  const me = playerPerson(s);
  const first = me?.name.split(' ')[0] ?? l('chefe', 'boss').pt;
  const nm = me?.name ?? s.config.companyName;
  return { first, to: { pt: `${nm} · ${s.config.companyName}`, en: `${nm} · ${s.config.companyName}` } };
}

/** O e-mail completo de um item (mensagem, decisão ou aviso). */
export function letter27(s: GameState, it: Item18): Letter27 {
  const m = it.msg;
  const d = it.decisionId ? s.decisions.find((x) => x.id === it.decisionId) : undefined;
  const snd = sender27(s, it);
  const ents = ents27(s, it);
  const v = m && it.source === 'msg' && snd.kind !== 'org' && snd.kind !== 'label' ? voice18(s, m) : null;
  const Y = you27(s);
  // {act} dos modelos: de preferência um ato seu (o convidado do feat, o ato do convite…)
  const act = ents.find((x) => x.e === 'act' && s.acts[x.id]?.owner === 'player') ?? ents.find((x) => x.e === 'act');
  const thr = m?.ref?.thr ? thread18(s, String(m.ref.thr)) : undefined;
  const pRef = m?.ref?.pid ? s.persons[String(m.ref.pid)] : undefined; // R29: {person} dos modelos (convite a uma pessoa)
  const vars: V = { from: snd.name, company: s.config.companyName, you: Y.first, act: act?.name ?? '', thr: thr?.t ?? '', person: pRef?.name ?? '' };
  const intro = introOf(it, snd, vars);
  const paras = parasOf(it.body, ents); // decisão: as opções (com agora × depois) ficam nos botões, sem repetir no texto
  const replied = m?.resolved ? (m.actions?.find((a) => a.id === m.resolved)?.label ?? l('Respondida', 'Answered')) : null;
  const kindL = m?.ref?.k18 ? inboxKind18(String(m.ref.k18))?.label : undefined;
  const med = MEDIUM_NAME[it.medium];
  return {
    key: it.key,
    subject: subject27(it),
    from: snd,
    to: Y.to,
    date: longDate27(s, it.week),
    meta: fmtL(l('Semana {w} · {m} · {c}', 'Week {w} · {m} · {c}'), { w: it.week, m: med, c: kindL ?? CAT27[it.cat].name }),
    greeting: greetingOf(s, it, snd, v, Y.first),
    intro: v && (v.cls === 'angry' || v.cls === 'cold') ? v.open : intro,
    paras,
    facts: factsOf(s, it, ents, d),
    closing: closingOf(s, it, snd, v),
    signoff: signoffOf(snd, v),
    replied,
    voice: v,
  };
}

// ---------------------------------------------------------------- ações da mensagem (as mesmas de sempre)

/** Botão de resposta: `reply` = uma das ações da mensagem (answerMsg → tratador do sistema que a criou);
 *  `decide` = opção da decisão na mesa (resolveDecision). O último/padrão é o que vale sem resposta. */
export interface Act27 { kind: 'reply' | 'decide'; id: string; label: L; hint?: L; primary: boolean; def: boolean }
export function actions27(s: GameState, it: Item18): Act27[] {
  const m = it.msg;
  if (m?.actions?.length && !m.resolved) return m.actions.map((a, i) => ({ kind: 'reply', id: a.id, label: a.label, primary: i === 0, def: i === m.actions!.length - 1 }));
  const d = it.decisionId ? s.decisions.find((x) => x.id === it.decisionId) : undefined;
  return d ? d.options.map((o) => ({ kind: 'decide', id: o.id, label: o.label, hint: o.hint, primary: o.id !== d.defaultOption, def: o.id === d.defaultOption })) : [];
}

/** Todo o texto do e-mail numa língua (testes e leitores de tela). */
export function letterText27(x: Letter27, lang: 'pt' | 'en'): string {
  const lines = [x.subject[lang], x.greeting[lang], x.intro?.[lang] ?? '', ...x.paras.map((p) => plain27(p.s[lang])), ...x.facts.map((f) => `${f.label[lang]}: ${plain27(f.value[lang])}`), x.closing?.[lang] ?? '', x.signoff[lang], x.from.name, x.from.role[lang]];
  return lines.filter(Boolean).join('\n');
}
