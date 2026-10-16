// Masters 31 — FILA ÚNICA DE ATENÇÃO (W0-AT; fonte única desde a 31.1, UNI-1). Tudo que pede a atenção do jogador entra
// aqui como um item priorizado: aviso (`notify`), mensagem da caixa (`people/state.addMsg`, `pushInbox18`) e cena
// (`queueCutscene`). Um ORÇAMENTO só, com três faixas:
//   - avisos/mensagens de prioridade 0–1 sem pendência: até `ATTN.notes` por mês aparecem; o resto (e a rotina, `low`)
//     é dobrado (`fold`) e vira linha do "Boletim da semana" — um item-cabeça por semana, que a caixa mostra como carta;
//   - cenas que interrompem: até `ATTN.sceneAdvance` por avanço e `ATTN.sceneMonth` por mês (decisões sempre passam);
//     as que sobram vão para o álbum (item de cena dobrado);
//   - dicas de 1ª vez: até `ATTN.tipsMonth` por mês e nunca no avanço em que uma cena abriu.
// Prioridade ≥ 2 e pendências (pendId) nunca são dobradas nem saem antes dos outros quando a fila enche.
// Vistas: `attnQueue` (lista), `notes` (avisos), `bulletinOf` (boletim), `foldedSince` (agrupados), `sceneAlbum`.
// Módulo puro: sem sistemas, sem sorteio (não importa nada que registre ganchos).
//
//   pushAttn(s, { cat: 'money', prio: 2, title: l('Caixa negativo', 'Negative cash'), pendId: 'cash<0', dest: { area: 'finance' } });
//   attnQueue(s)        // itens visíveis, mais urgentes primeiro
//   pendingCount(s)     // pendências únicas (por pendId), sem duplicar
//   resolveAttn(s, 'cash<0')

import type { L } from '../data/world';
import { CS_PUSH31, registerExt4, type Cutscene } from './ext4';
import { interruptOf23 } from './interrupt23';
import type { GameState, Notification } from './types';

/** Categoria do aviso (aberta; as fixas abaixo são as que a interface agrupa). */
export type AttnCat = 'info' | 'good' | 'bad' | 'event' | 'money' | 'people' | 'career' | 'world' | 'deadline' | 'decision' | 'scene' | 'bulletin' | (string & {});
/** 0 = rotina · 1 = normal · 2 = importante · 3 = urgente (pede ação agora). */
export type AttnPrio = 0 | 1 | 2 | 3;
/** Destino de navegação (objeto simples; a interface resolve). */
export interface AttnDest { area: string; tab?: string; id?: string }

export interface AttnItem {
  /** estável: `a<seq>` (contador da própria fila, não depende de outros sistemas) */
  id: string;
  cat: AttnCat;
  prio: AttnPrio;
  title: L;
  body?: L;
  /** quem manda (id de pessoa/ato/selo, ou nome do sistema) */
  from?: string;
  /** semana absoluta em que entrou (ou foi atualizado) */
  at: number;
  /** pendência única: itens com o mesmo pendId são a MESMA pendência (o novo atualiza o antigo) */
  pendId?: string;
  dest?: AttnDest;
  seen: boolean;
  /** passou do orçamento (ou é rotina): fica no registro e no boletim, não aparece na lista principal */
  fold?: 1;
  /** pendência resolvida */
  done?: 1;
  /** aviso (`notify`): o tom de sempre */
  tone?: Notification['kind'];
  /** mensagem da caixa: id em `P(s).inbox` (o corpo com botões e respostas mora lá) */
  msg?: string;
  /** tipo registrado da mensagem (inbox18) */
  k18?: string;
  /** rótulo curto para a linha do boletim ("Rádio", "Aviso"...) */
  label?: L;
  /** cena: id em `s.cutscenes` */
  scene?: string;
  /** cabeça do boletim: semana e quantos itens */
  bw?: number;
  n?: number;
}
export type AttnIn = Omit<AttnItem, 'id' | 'at' | 'seen' | 'fold' | 'done'> & Partial<Pick<AttnItem, 'at' | 'seen'>> & {
  /** rotina: vai direto para o boletim (se não for importante nem pendência) */
  low?: boolean;
  /** já decidido por quem chama (1 = boletim, 0 = aparece sem gastar o orçamento) */
  fold?: 0 | 1;
};

export interface AttnState {
  q: AttnItem[];
  seq: number;
  /** mês do orçamento (ano*12+mês) e quantos itens de prioridade 0–1 já entraram nele */
  bm: number;
  bn: number;
  /** cenas: semana/mês do avanço e quantas abriram; dicas do mês */
  sw: number; sn: number; sm: number; smn: number; tm: number; tn: number;
}
declare module './ext4' { interface Ext4 { attn: AttnState } }
const fresh = (): AttnState => ({ q: [], seq: 0, bm: -1, bn: 0, sw: -1, sn: 0, sm: -1, smn: 0, tm: -1, tn: 0 });
registerExt4('attn', fresh);
export function attn(s: GameState): AttnState {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.attn ??= fresh()) as AttnState;
  st.q ??= []; st.seq ??= 0; st.bm ??= -1; st.bn ??= 0;
  st.sw ??= -1; st.sn ??= 0; st.sm ??= -1; st.smn ??= 0; st.tm ??= -1; st.tn ??= 0;
  return st;
}

/** Teto da fila (itens resolvidos, dobrados e vistos saem primeiro; importantes e pendências por último). */
export const ATTN_CAP = 240;
/** O orçamento único de atenção (r31 UNI-1: substitui NOTIFY19/budget19, o orçamento por categoria do notify19 e o
 *  orçamento de atenção do story28). */
export const ATTN = {
  /** avisos e mensagens de prioridade 0–1 sem pendência que aparecem por mês (o resto vai para o boletim) */
  notes: 18,
  /** cenas que interrompem (classe 'milestone'), por avanço e por mês; 'always' (decisão) não conta */
  sceneAdvance: 2, sceneMonth: 3,
  /** dicas de 1ª vez por mês (e nenhuma no avanço em que uma cena abriu) */
  tipsMonth: 3,
};
/** Compatibilidade de nome (W0-AT): o teto mensal de avisos de baixa prioridade. */
export const ATTN_BUDGET = ATTN.notes;
/** Avisos de rotina: sempre no boletim (era o ROUTINE19 do budget19). */
export const ROUTINE_ATTN = /gravou \d+ faixa|Por que deu nisso\?|entregou a encomenda|programad[oa] para a semana|pontos de habilidade|Leilão da massa falida/;

const monthKey = (s: GameState): number => s.year * 12 + s.month;
const isHead = (x: Pick<AttnItem, 'bw'>): boolean => x.bw !== undefined;

/** Gasta o orçamento do mês para um item de prioridade 0–1; true = vai para o boletim (dobrado). */
export function takeAttnBudget(s: GameState, prio: number, low = false): boolean {
  if (prio >= 2) return false;
  if (low) return true;
  const st = attn(s), mk = monthKey(s);
  if (st.bm !== mk) { st.bm = mk; st.bn = 0; }
  return ++st.bn > ATTN.notes;
}

/** Põe um item na fila. Com `pendId`, atualiza a pendência aberta de mesmo id em vez de criar outra. */
export function pushAttn(s: GameState, it: AttnIn): AttnItem {
  const st = attn(s);
  const at = it.at ?? s.week;
  const { low, fold, ...rest } = it;
  if (rest.pendId) {
    const o = st.q.find((x) => x.pendId === rest.pendId && !x.done);
    if (o) {
      const p0 = o.prio;
      Object.assign(o, rest, { at, seen: rest.seen ?? false });
      o.prio = Math.max(p0, rest.prio) as AttnPrio;
      delete o.fold;
      return o;
    }
  }
  const item: AttnItem = { ...rest, id: `a${++st.seq}`, at, seen: rest.seen ?? false };
  if (fold !== undefined) { if (fold && !rest.pendId && rest.prio < 2) item.fold = 1; }
  else if (!rest.pendId && rest.cat !== 'scene' && !isHead(rest) && takeAttnBudget(s, rest.prio, low)) item.fold = 1;
  st.q.push(item);
  if (item.fold && item.cat !== 'scene') addToBulletin(s, item);
  if (st.q.length > ATTN_CAP) prune(st);
  for (const f of LISTEN) f(s, item);
  return item;
}
const LISTEN: ((s: GameState, it: AttnItem) => void)[] = [];
/** Ouvinte de itens novos (interface: toasts; testes: auditoria). Só leitura — não mude o item. */
export function onAttnPush(f: (s: GameState, it: AttnItem) => void): () => void {
  LISTEN.push(f);
  return () => { const i = LISTEN.indexOf(f); if (i >= 0) LISTEN.splice(i, 1); };
}

const clip = (x: string, n = 150): string => (x.length > n ? `${x.slice(0, n - 1)}…` : x);
const NOTE_LABEL: Record<Notification['kind'], L> = {
  info: { pt: 'Aviso', en: 'Notice' }, good: { pt: 'Boa notícia', en: 'Good news' }, bad: { pt: 'Alerta', en: 'Alert' }, event: { pt: 'Acontecimento', en: 'Event' },
};
/** Linha do boletim de um item dobrado. */
export function bulletinLine(x: AttnItem): L {
  const lab = x.label ?? NOTE_LABEL[x.tone ?? 'info'];
  const body = x.body ? { pt: ` — ${clip(x.body.pt)}`, en: ` — ${clip(x.body.en)}` } : { pt: '', en: '' };
  return { pt: `• ${lab.pt}: ${x.title.pt}${body.pt}`, en: `• ${lab.en}: ${x.title.en}${body.en}` };
}
/** O boletim da semana é uma VISTA dos itens dobrados; a cabeça (um item por semana) é o que a caixa mostra. */
function addToBulletin(s: GameState, item: AttnItem): void {
  const st = attn(s), w = item.at;
  const line = bulletinLine(item);
  const head = st.q.find((x) => x.bw === w && !x.done);
  if (head) {
    const n = (head.n ?? 1) + 1;
    head.n = n;
    head.title = { pt: `Boletim da semana (${n} itens)`, en: `Weekly bulletin (${n} items)` };
    head.body = { pt: `${head.body?.pt ?? ''}\n${line.pt}`, en: `${head.body?.en ?? ''}\n${line.en}` };
    head.seen = false;
    return;
  }
  st.q.push({ id: `a${++st.seq}`, cat: 'bulletin', prio: 0, at: w, seen: false, bw: w, n: 1, k18: 'bulletin19', from: 'bulletin',
    title: { pt: 'Boletim da semana (1 item)', en: 'Weekly bulletin (1 item)' }, body: line });
}

function prune(st: AttnState): void {
  // sai primeiro o resolvido, depois o dobrado, o visto, o mais antigo; importantes e pendências abertas ficam por último
  const score = (x: AttnItem): number => (x.done ? 0 : x.fold ? 1 : x.seen ? 2 : x.pendId ? 5 : x.prio >= 2 ? 4 : 3);
  while (st.q.length > ATTN_CAP) {
    let k = 0;
    for (let i = 1; i < st.q.length; i++) if (score(st.q[i]) < score(st.q[k])) k = i;
    st.q.splice(k, 1);
  }
}

// ---------------------------------------------------------------- vistas

/** Itens visíveis (sem dobrados nem resolvidos), mais urgentes e mais novos primeiro. */
export function attnQueue(s: GameState, o: { unseen?: boolean; folded?: boolean; done?: boolean; cat?: AttnCat; limit?: number } = {}): AttnItem[] {
  const xs = attn(s).q.filter((x) => (o.folded || !x.fold) && (o.done || !x.done) && (!o.unseen || !x.seen) && (!o.cat || x.cat === o.cat));
  xs.sort((a, b) => b.prio - a.prio || b.at - a.at || (a.id < b.id ? 1 : -1));
  return o.limit ? xs.slice(0, o.limit) : xs;
}

/** Avisos (`notify`) na ordem em que entraram, no formato de sempre. `after`: só os com número de série maior. */
export function notes(s: GameState, o: { after?: number; since?: number } = {}): Notification[] {
  const out: Notification[] = [];
  for (const x of attn(s).q) {
    if (!x.tone) continue;
    if (o.after !== undefined && Number(x.id.slice(1)) <= o.after) continue;
    if (o.since !== undefined && x.at < o.since) continue;
    out.push(x.fold ? { week: x.at, text: x.title, kind: x.tone, fold: 1 } : { week: x.at, text: x.title, kind: x.tone });
  }
  return out;
}
/** Número de série atual da fila (para "o que entrou depois de agora"). */
export const attnSeq = (s: GameState): number => attn(s).seq;

/** Itens dobrados (de qualquer origem, sem as cenas) desde a semana `w`. */
export const foldedSince = (s: GameState, w: number): AttnItem[] => attn(s).q.filter((x) => x.fold && x.cat !== 'scene' && x.at >= w);
/** Itens do boletim de uma semana (vista). */
export const bulletinOf = (s: GameState, w: number): AttnItem[] => attn(s).q.filter((x) => x.fold && x.cat !== 'scene' && x.at === w);

/** Pendências abertas únicas (por pendId): o mesmo assunto vindo de dois lugares conta uma vez. */
export function pendingCount(s: GameState): number {
  const ids = new Set<string>();
  for (const x of attn(s).q) if (x.pendId && !x.done) ids.add(x.pendId);
  return ids.size;
}

/** Marca a pendência como resolvida (todos os itens com esse pendId). */
export function resolveAttn(s: GameState, pendId: string): number {
  let n = 0;
  for (const x of attn(s).q) if (x.pendId === pendId && !x.done) { x.done = 1; x.seen = true; n++; }
  return n;
}

/** Marca itens como vistos (um id de item, um id de mensagem, ou todos). */
export function seeAttn(s: GameState, id?: string): void {
  for (const x of attn(s).q) if (!id || x.id === id || x.msg === id) x.seen = true;
}

// ---------------------------------------------------------------- cenas (faixa de cenas do orçamento; álbum)

CS_PUSH31.f = (s, cs) => {
  const k = interruptOf23(cs);
  const t = cs.data.title as L | string | undefined;
  const title: L = !t ? { pt: cs.kind, en: cs.kind } : typeof t === 'string' ? { pt: t, en: t } : t;
  pushAttn(s, { cat: 'scene', prio: k === 'always' ? 3 : k === 'milestone' ? 2 : 0, title, scene: cs.id, at: cs.week });
};
/** A cena não interrompeu (rotina, orçamento ou repetida): fica vista, marcada para rever e vai para o álbum. */
export function quietScene(s: GameState, cs: Cutscene): void {
  cs.seen = true;
  cs.data.quiet23 = true;
  for (const x of attn(s).q) if (x.scene === cs.id) { x.fold = 1; x.seen = true; }
}
/** Álbum de cenas (vista da fila): cenas guardadas sem interromper, mais recentes primeiro. */
export function sceneAlbum(s: GameState): Cutscene[] {
  const by = new Map((s.cutscenes ?? []).map((c) => [c.id, c]));
  const out: Cutscene[] = [];
  const seen = new Set<string>();
  for (const x of attn(s).q) {
    const c = x.scene ? by.get(x.scene) : undefined;
    if (c && x.fold && !seen.has(c.id)) { seen.add(c.id); out.push(c); }
  }
  // cenas marcadas para rever cujo item já saiu da fila continuam no álbum
  for (const c of s.cutscenes ?? []) if (c.data.quiet23 && !seen.has(c.id)) { seen.add(c.id); out.push(c); }
  return out.sort((a, b) => b.week - a.week);
}

export interface SceneLike { id: string; kind: string; data: Record<string, unknown> }
/** Puro: das cenas que interromperiam, quais abrem (ids), dado o que já abriu neste avanço e neste mês. */
export const TOP_SCENES = new Set(['awards', 'hall', 'number1', 'ipo', 'hologram', 'long18year']);
export function pickScenes(list: SceneLike[], usedAdv: number, usedMonth: number, caps = ATTN): string[] {
  const out: string[] = [];
  // ordem: grandes marcos (prêmio, Hall, nº 1) → "você escolheu X" → o resto, na ordem em que chegaram
  const rank = (c: SceneLike): number => (TOP_SCENES.has(c.kind) ? 0 : c.data.echo28 ? 1 : 2);
  const ord = list.map((c, i) => [c, i] as const).sort((x, y) => rank(x[0]) - rank(y[0]) || x[1] - y[1]).map((x) => x[0]);
  let a = usedAdv, m = usedMonth;
  for (const c of ord) {
    if (interruptOf23(c) === 'always') { out.push(c.id); continue; }
    if (a >= caps.sceneAdvance || m >= caps.sceneMonth) continue;
    out.push(c.id); a++; m++;
  }
  return list.filter((c) => out.includes(c.id)).map((c) => c.id);
}
const rollScenes = (s: GameState): AttnState => {
  const st = attn(s), mk = monthKey(s);
  if (st.sw !== s.week) { st.sw = s.week; st.sn = 0; }
  if (st.sm !== mk) { st.sm = mk; st.smn = 0; }
  if (st.tm !== mk) { st.tm = mk; st.tn = 0; }
  return st;
};
/** Com estado: decide uma vez por cena (marca `data.att28`) e gasta a faixa de cenas do avanço e do mês. */
export function attnScenes(s: GameState, list: SceneLike[]): string[] {
  const st = rollScenes(s);
  const fresh = list.filter((c) => c.data.att28 === undefined);
  const ok = new Set(pickScenes(fresh, st.sn, st.smn));
  for (const c of fresh) {
    c.data.att28 = ok.has(c.id) ? 1 : 0;
    if (ok.has(c.id) && interruptOf23(c) !== 'always') { st.sn++; st.smn++; }
  }
  return list.filter((c) => c.data.att28 === 1).map((c) => c.id);
}
/** Uma dica de 1ª vez pode aparecer agora? */
export function attnTip(s: GameState): boolean {
  const st = rollScenes(s);
  return st.sn === 0 && st.tn < ATTN.tipsMonth;
}
export const spendTip = (s: GameState): void => { rollScenes(s).tn++; };
