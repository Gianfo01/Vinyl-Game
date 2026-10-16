// R31 · onda 1 (EDT) — EDITOR DENTRO DA PARTIDA: registro de editáveis e executáveis + operações de teste.
//
// Todo sistema registra aqui o que pode ser editado ou rodado (briefing, regra 10):
//
//   registerEditable({ id: 'money.company', area: 'money', label: l('Caixa', 'Cash'), kind: 'money',
//     get: (s) => s.player.cash, set: (s, v) => { ... } });
//   registerEditable({ id: 'person.morale', area: 'people', target: 'person', label: …, kind: 'number', min: 0, max: 100,
//     get: (s, id) => s.persons[id!].morale, set: (s, v, id) => { … } });
//   registerRunnable({ id: 'tools.reveal', area: 'tools', label: …, run: (s) => { … } });
//
// A interface (ui/editor31.ts) só lista o registro e chama `applyEdit` / `runEdit`. Cada alteração:
//   • só acontece com o editor ligado nesta partida (`setEditorOn`); desligado, nada muda (teste garante);
//   • marca a partida como editada (`isEdited31`) — não conta para conquistas e recordes;
//   • entra no diário ("Editado pelo editor: …") por `emitFact` e no registro de edições (`edit31(s).log`).
// Sempre que possível a edição usa as funções do jogo (dinheiro passa por `post`, opinião por `setOpinion`, empresa
// por `transferLabel`, relíquia pela lista de donos); quando não há, o editável declara `raw: true` ("edição crua").

import { Rng, clamp } from '../../core/rng';
import { GENRES, genreById, l, type L } from '../../data/world';
import { labelValuation, transferLabel } from '../business';
import { EVENTS, emitEvent, eventById } from '../events';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { setOpinion, opinionOf } from '../opinion';
import { relicDef17 } from '../relics17';
import { stress17 } from '../stress17';
import { careerDef, careerDefs, careers, registerLoad, startCareer } from '../sys/careers12';
import { cine18, logShot18, board18, type Kind18 } from '../sys/cine18';
import { dm18, PHASE18, type Phase18 } from '../sys/dm18';
import { ownerOf } from '../sys/people/owner';
import { RELIC_KIND, relics, addRelic, type RelicKind } from '../sys/relics9';
import { queueScene, type PlaceKind } from '../sys/scenes/state';
import { SITS, forceSituation17 } from '../sys/situations17';
import type { GameState, Person } from '../types';
import { fmtL, playerActs, post } from '../util';
import { KNOW_REVEAL31 } from '../know';

// ---------------------------------------------------------------- tipos do registro

export type EditArea = 'money' | 'people' | 'companies' | 'careers' | 'items' | 'scenes' | 'world' | 'tools' | (string & {});
/** Alvo de um editável por entidade: a interface escolhe a pessoa/ato/selo/relíquia/gênero antes de editar. */
export type EditTarget = 'person' | 'act' | 'label' | 'relic' | 'genre';
export type EditKind = 'number' | 'money' | 'text' | 'bool' | 'select';
export type EditVal = number | string | boolean;

export interface Editable {
  id: string;
  area: EditArea;
  label: L;
  kind: EditKind;
  get: (s: GameState, target?: string) => EditVal;
  /** grava; devolve texto de erro para recusar (nada muda) */
  set: (s: GameState, v: EditVal, target?: string) => L | void;
  target?: EditTarget;
  min?: number;
  max?: number;
  step?: number;
  options?: (s: GameState) => { value: string; label: L }[];
  help?: L;
  /** edição crua: não passa por função do jogo (fica marcada no registro) */
  raw?: boolean;
  /** some quando falso (ex.: alvo sem o campo) */
  when?: (s: GameState, target?: string) => boolean;
}

export interface Runnable {
  id: string;
  area?: EditArea;
  label: L;
  /** devolve o resultado para mostrar; texto começando por "!" não é usado — use `{ ok: false }` via throw */
  run: (s: GameState, target?: string, arg?: EditVal) => L | { ok: boolean; text: L } | void;
  target?: EditTarget;
  /** argumento livre (ex.: número de meses) */
  arg?: { kind: 'number' | 'select' | 'text'; label: L; def?: EditVal; options?: (s: GameState) => { value: string; label: L }[] };
  help?: L;
  raw?: boolean;
  when?: (s: GameState, target?: string) => boolean;
}

const EDITABLES = new Map<string, Editable>();
const RUNNABLES = new Map<string, Runnable>();

/** Registra (ou substitui) um editável. */
export function registerEditable(e: Editable): void { EDITABLES.set(e.id, e); }
/** Registra (ou substitui) um executável. */
export function registerRunnable(r: Runnable): void { RUNNABLES.set(r.id, { area: 'tools', ...r }); }
export const editables = (area?: EditArea, target?: EditTarget | null): Editable[] =>
  [...EDITABLES.values()].filter((e) => (!area || e.area === area) && (target === undefined || (target === null ? !e.target : e.target === target)));
export const runnables = (area?: EditArea, target?: EditTarget | null): Runnable[] =>
  [...RUNNABLES.values()].filter((r) => (!area || r.area === area) && (target === undefined || (target === null ? !r.target : r.target === target)));
export const editableById = (id: string): Editable | undefined => EDITABLES.get(id);
export const runnableById = (id: string): Runnable | undefined => RUNNABLES.get(id);

// ---------------------------------------------------------------- estado

export interface EditLog31 { w: number; y: number; m: number; id: string; target?: string; text: L; raw?: 1 }
export interface Edit31State {
  /** editor ligado nesta partida (modo de testes) */
  on: boolean;
  /** a partida já foi editada (não conta para conquistas e recordes) */
  edited: boolean;
  /** contador de edições (chave dos lançamentos e da sorte pura por edição) */
  n: number;
  /** trapaças de teste ligadas */
  cheats: { noExhaust?: boolean; reveal?: boolean; freeze?: boolean };
  log: EditLog31[];
}
declare module '../ext4' { interface Ext4 { edit31: Edit31State } }
const fresh = (): Edit31State => ({ on: false, edited: false, n: 0, cheats: {}, log: [] });
registerExt4('edit31', fresh);

export function edit31(s: GameState): Edit31State {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.edit31 ??= fresh()) as Edit31State;
  st.cheats ??= {}; st.log ??= [];
  return st;
}
/** Leitura sem criar estado (para quem só olha). */
const ro = (s: GameState): Edit31State | undefined => (s as unknown as { x4?: { edit31?: Edit31State } }).x4?.edit31;
export const editorOn31 = (s: GameState): boolean => !!ro(s)?.on;
/** A partida foi mexida pelo editor (ou começou com uma base editada). */
export const isEdited31 = (s: GameState): boolean => !!ro(s)?.edited || !!s.config.base31;
export const cheat31 = (s: GameState, k: keyof Edit31State['cheats']): boolean => !!ro(s)?.on && !!ro(s)?.cheats[k];

/** Liga/desliga o editor nesta partida. Ligar não marca a partida; só editar marca. */
export function setEditorOn(s: GameState, on: boolean): void { edit31(s).on = on; }

export const LOG31_MAX = 200;
const OFF_MSG = l('O editor está desligado nesta partida.', 'The editor is off in this game.');

function mark(s: GameState, id: string, target: string | undefined, text: L, raw?: boolean): void {
  const st = edit31(s);
  st.edited = true;
  st.log.push({ w: s.week, y: s.year, m: s.month, id, ...(target ? { target } : {}), text, ...(raw ? { raw: 1 as const } : {}) });
  if (st.log.length > LOG31_MAX) st.log.splice(0, st.log.length - LOG31_MAX);
  const full = fmtL(l('Editado pelo editor: {t}{r}', 'Edited with the editor: {t}{r}'), { t: text, r: raw ? l(' (edição crua)', ' (raw edit)') : '' });
  emitFact(s, { kind: 'editor', actors: ['player', ...(target && (s.persons[target] || s.acts[target] || s.labels[target]) ? [target] : [])], severity: 0, visibility: 'secret', tags: ['editor31'], text: full, src: 'editor31', diary: { kind: 'editor' } });
}

/** Nome legível do alvo (pessoa, ato, selo, relíquia, gênero). */
export function targetName(s: GameState, t: EditTarget | undefined, id: string | undefined): string {
  if (!t || !id) return '';
  if (t === 'person') return s.persons[id]?.name ?? '';
  if (t === 'act') return s.acts[id]?.name ?? '';
  if (t === 'label') return s.labels[id]?.name ?? '';
  if (t === 'relic') { const rl = relics(s).list.find((x) => x.id === id); return rl ? rl.n.pt : ''; }
  if (t === 'genre') return genreById[id]?.name.pt ?? '';
  return '';
}
const targetOk = (s: GameState, t: EditTarget | undefined, id: string | undefined): boolean => !t || (!!id && targetName(s, t, id) !== '');

const moneyTxt = (c: number): string => `$ ${Math.round(c / 100).toLocaleString('pt-BR')}`;
function valText(e: Editable, v: EditVal): L {
  if (e.kind === 'bool') return v ? l('ligado', 'on') : l('desligado', 'off');
  if (e.kind === 'money') return l(moneyTxt(Number(v)), moneyTxt(Number(v)));
  if (e.kind === 'select' && e.options) return l(String(v), String(v));
  return l(String(v), String(v));
}

export interface EditResult { ok: boolean; text: L }

/** Aplica uma edição registrada. Desligado, recusa sem mexer em nada. */
export function applyEdit(s: GameState, id: string, v: EditVal, target?: string): EditResult {
  if (!editorOn31(s)) return { ok: false, text: OFF_MSG };
  const e = EDITABLES.get(id);
  if (!e) return { ok: false, text: l('Campo desconhecido.', 'Unknown field.') };
  if (!targetOk(s, e.target, target)) return { ok: false, text: l('Escolha quem editar.', 'Choose what to edit.') };
  if (e.when && !e.when(s, target)) return { ok: false, text: l('Este campo não vale para esta escolha.', 'This field does not apply here.') };
  if (e.kind === 'number' || e.kind === 'money') {
    let n = Number(v);
    if (!Number.isFinite(n)) return { ok: false, text: l('Digite um número.', 'Type a number.') };
    if (e.min !== undefined) n = Math.max(e.min, n);
    if (e.max !== undefined) n = Math.min(e.max, n);
    v = e.kind === 'money' ? Math.round(n) : n;
  } else if (e.kind === 'bool') v = !!v;
  else v = String(v);
  const err = e.set(s, v, target);
  if (err) return { ok: false, text: err };
  const who = targetName(s, e.target, target);
  const text = fmtL(l('{w}{f} → {v}', '{w}{f} → {v}'), { w: who ? `${who} · ` : '', f: e.label, v: valText(e, e.get(s, target)) });
  mark(s, id, target, text, e.raw);
  return { ok: true, text };
}

/** Roda um executável registrado. */
export function runEdit(s: GameState, id: string, target?: string, arg?: EditVal): EditResult {
  if (!editorOn31(s)) return { ok: false, text: OFF_MSG };
  const r = RUNNABLES.get(id);
  if (!r) return { ok: false, text: l('Ação desconhecida.', 'Unknown action.') };
  if (!targetOk(s, r.target, target)) return { ok: false, text: l('Escolha o alvo.', 'Choose the target.') };
  if (r.when && !r.when(s, target)) return { ok: false, text: l('Esta ação não vale para esta escolha.', 'This action does not apply here.') };
  edit31(s).n++;
  const out = r.run(s, target, arg);
  const res: EditResult = !out ? { ok: true, text: r.label } : 'pt' in out ? { ok: true, text: out } : out;
  if (!res.ok) return res;
  const who = targetName(s, r.target, target);
  mark(s, id, target, fmtL(l('{w}{a}: {t}', '{w}{a}: {t}'), { w: who ? `${who} · ` : '', a: r.label, t: res.text }), r.raw);
  return res;
}

/** Sorte pura por edição (não toca nos fluxos do jogo). */
const luck = (s: GameState, k: string): Rng => Rng.fromSeed(`${s.config.seed}|editor31|${k}|${edit31(s).n}`);

// ---------------------------------------------------------------- busca (a interface lista; não muda nada)

export function searchPeople31(s: GameState, q: string, max = 30): Person[] {
  const qq = q.trim().toLowerCase();
  if (qq.length < 2) return [];
  const out: Person[] = [];
  for (const p of Object.values(s.persons)) { if (p.name.toLowerCase().includes(qq)) { out.push(p); if (out.length >= max) break; } }
  return out;
}
export function searchActs31(s: GameState, q: string, max = 30) {
  const qq = q.trim().toLowerCase();
  return Object.values(s.acts).filter((a) => qq.length >= 2 && a.name.toLowerCase().includes(qq)).slice(0, max);
}
export const myPersonId31 = (s: GameState): string | undefined => ownerOf(s).personId ?? Object.values(s.persons).find((p) => p.isPlayer)?.id;
const mainActOf = (s: GameState, pid: string) => Object.values(s.acts).filter((a) => a.members.includes(pid)).sort((a, b) => b.fame - a.fame)[0];

// ================================================================ registros de base (sistemas existentes)

// ---------------------------------------------------------------- dinheiro
registerEditable({
  id: 'money.company', area: 'money', kind: 'money', label: l('Caixa da empresa', 'Company cash'),
  help: l('A diferença entra no livro-caixa como aporte do dono (o resto do jogo vê o dinheiro).', 'The difference goes into the ledger as owner capital (the rest of the game sees the money).'),
  get: (s) => s.player.cash,
  set: (s, v) => { const d = Number(v) - s.player.cash; if (d) post(s, `editor31:${++edit31(s).n}`, d, 'owner_capital', 'Editor: ajuste de caixa'); },
});
registerEditable({
  id: 'money.personal', area: 'money', kind: 'money', label: l('Dinheiro pessoal', 'Personal money'), raw: true,
  get: (s) => ownerOf(s).wealth,
  set: (s, v) => { ownerOf(s).wealth = Math.max(0, Number(v)); },
});
registerRunnable({
  id: 'money.clearDebts', area: 'money', label: l('Quitar todas as dívidas', 'Clear all debts'), raw: true,
  run: (s) => { const n = s.player.loans.length; s.player.loans = []; s.player.insolvencyMonths = 0; return fmtL(l('{n} empréstimos quitados.', '{n} loans cleared.'), { n }); },
});
for (const k of ['artistic', 'commercial', 'artists', 'institutional'] as const) registerEditable({
  id: `money.rep.${k}`, area: 'money', kind: 'number', min: 0, max: 100, raw: true,
  label: { artistic: l('Reputação artística', 'Artistic reputation'), commercial: l('Reputação comercial', 'Commercial reputation'), artists: l('Reputação com artistas', 'Reputation with artists'), institutional: l('Reputação institucional', 'Institutional reputation') }[k],
  get: (s) => Math.round(s.player.reputation[k]), set: (s, v) => { s.player.reputation[k] = Number(v); },
});

// ---------------------------------------------------------------- pessoas
const SKILL_L: Record<string, L> = {
  comp: l('Composição', 'Songwriting'), lyr: l('Letras', 'Lyrics'), voice: l('Voz', 'Voice'), instr: l('Instrumento', 'Instrument'),
  prod: l('Produção', 'Production'), stage: l('Palco', 'Stage'), biz: l('Negócios', 'Business'),
};
for (const [k, lab] of Object.entries(SKILL_L)) registerEditable({
  id: `person.skill.${k}`, area: 'people', target: 'person', kind: 'number', min: 0, max: 100, label: lab, raw: true,
  get: (s, id) => Math.round((s.persons[id!].skills as Record<string, number>)[k] ?? 0),
  set: (s, v, id) => { (s.persons[id!].skills as Record<string, number>)[k] = Number(v); },
});
const P_NUM: [keyof Person & ('potential' | 'morale' | 'inspiration' | 'fatigue' | 'stress' | 'resentment'), L][] = [
  ['potential', l('Potencial', 'Potential')], ['morale', l('Humor', 'Mood')], ['inspiration', l('Inspiração', 'Inspiration')],
  ['fatigue', l('Cansaço', 'Fatigue')], ['stress', l('Estresse', 'Stress')], ['resentment', l('Mágoa', 'Resentment')],
];
for (const [k, lab] of P_NUM) registerEditable({
  id: `person.${k}`, area: 'people', target: 'person', kind: 'number', min: 0, max: 100, label: lab, raw: true,
  get: (s, id) => Math.round(s.persons[id!][k] as number), set: (s, v, id) => { (s.persons[id!] as unknown as Record<string, number>)[k] = Number(v); },
});
registerEditable({
  id: 'person.health', area: 'people', target: 'person', kind: 'select', label: l('Saúde', 'Health'), raw: true,
  options: () => [['ok', l('Bem', 'Fine')], ['voice_strain', l('Voz cansada', 'Voice strain')], ['burnout', l('Esgotamento', 'Burnout')], ['addiction', l('Dependência', 'Addiction')], ['recovering', l('Em recuperação', 'Recovering')], ['ill', l('Doente', 'Ill')]].map(([value, label]) => ({ value: value as string, label: label as L })),
  get: (s, id) => s.persons[id!].health, set: (s, v, id) => { s.persons[id!].health = String(v) as Person['health']; },
});
registerEditable({
  id: 'person.opinion', area: 'people', target: 'person', kind: 'number', min: -100, max: 100, label: l('Opinião sobre você', 'Opinion of you'),
  help: l('Passa pela fonte única de opinião (o resto do jogo reage).', 'Goes through the single opinion source (the rest of the game reacts).'),
  when: (s, id) => !!id && id !== myPersonId31(s),
  get: (s, id) => opinionOf(s, `p:${id}`),
  set: (s, v, id) => { if (!myPersonId31(s)) return l('Sua pessoa ainda não existe nesta partida.', 'Your person does not exist yet in this game.'); setOpinion(s, `p:${id}`, Number(v), l('Mudado pelo editor', 'Changed with the editor')); },
});
registerEditable({
  id: 'person.fame', area: 'people', target: 'person', kind: 'number', min: 0, max: 100, label: l('Fama (artista principal)', 'Fame (main act)'), raw: true,
  when: (s, id) => !!id && !!mainActOf(s, id),
  get: (s, id) => Math.round(mainActOf(s, id!)?.fame ?? 0), set: (s, v, id) => { const a = mainActOf(s, id!); if (!a) return l('Sem artista.', 'No act.'); a.fame = Number(v); },
});
registerEditable({
  id: 'person.known', area: 'people', target: 'person', kind: 'number', min: 0, max: 5, label: l('Quanto você sabe (0 a 5)', 'How much you know (0 to 5)'), raw: true,
  when: (s, id) => !!id && !!mainActOf(s, id),
  get: (s, id) => s.knowledge[mainActOf(s, id!)?.id ?? '']?.degree ?? 0,
  set: (s, v, id) => {
    const a = mainActOf(s, id!); if (!a) return l('Sem artista.', 'No act.');
    const n = Math.round(Number(v));
    if (n <= 0) { delete s.knowledge[a.id]; return; }
    const k = (s.knowledge[a.id] ??= { actId: a.id, degree: n, stage: 'monitoring', bias: 0, updatedWeek: s.week, source: 'editor31' });
    k.degree = n; k.updatedWeek = s.week;
  },
});

// atos (artistas e bandas)
const A_NUM: ['fame' | 'momentum' | 'trust' | 'potential' | 'positioning', L][] = [
  ['fame', l('Fama', 'Fame')], ['momentum', l('Momento', 'Momentum')], ['trust', l('Confiança em você', 'Trust in you')],
  ['potential', l('Potencial', 'Potential')], ['positioning', l('Posição (underground → massa)', 'Positioning (underground → mainstream)')],
];
for (const [k, lab] of A_NUM) registerEditable({
  id: `act.${k}`, area: 'people', target: 'act', kind: 'number', min: 0, max: 100, label: lab, raw: true,
  get: (s, id) => Math.round(s.acts[id!][k]), set: (s, v, id) => { s.acts[id!][k] = Number(v); },
});
registerEditable({
  id: 'act.cash', area: 'people', target: 'act', kind: 'money', label: l('Dinheiro do artista', 'Act\'s money'), raw: true,
  get: (s, id) => s.acts[id!].cash, set: (s, v, id) => { s.acts[id!].cash = Number(v); },
});

// ---------------------------------------------------------------- empresas
registerEditable({
  id: 'label.cash', area: 'companies', target: 'label', kind: 'money', label: l('Caixa do selo', 'Label cash'), raw: true,
  get: (s, id) => s.labels[id!].cash, set: (s, v, id) => { s.labels[id!].cash = Number(v); },
});
registerEditable({
  id: 'label.reputation', area: 'companies', target: 'label', kind: 'number', min: 0, max: 100, label: l('Reputação do selo', 'Label reputation'), raw: true,
  get: (s, id) => Math.round(s.labels[id!].reputation), set: (s, v, id) => { s.labels[id!].reputation = Number(v); },
});
registerEditable({
  id: 'label.aggression', area: 'companies', target: 'label', kind: 'number', min: 0, max: 1, step: 0.05, label: l('Agressividade', 'Aggressiveness'), raw: true,
  get: (s, id) => s.labels[id!].aggression, set: (s, v, id) => { s.labels[id!].aggression = Number(v); },
});
registerRunnable({
  id: 'label.takeover', area: 'companies', target: 'label', label: l('Assumir o controle', 'Take control'),
  help: l('Elenco, contratos e catálogo passam a ser seus (mesma transferência da compra); o caixa do selo entra no seu.', 'Roster, contracts and catalog become yours (same transfer as a purchase); the label\'s cash joins yours.'),
  when: (s, id) => !!id && !!s.labels[id]?.active,
  run: (s, id) => {
    const lb = s.labels[id!];
    const n = lb.roster.length;
    const cash = Math.max(0, lb.cash);
    transferLabel(s, lb, labelValuation(s, lb), 0);
    if (cash) post(s, `editor31:${edit31(s).n}:tk`, cash, 'acquisitions', `Editor: caixa de ${lb.name}`);
    return fmtL(l('{n} agora é sua ({r} atos no elenco).', '{n} is now yours ({r} acts on the roster).'), { n: lb.name, r: n });
  },
});

// ---------------------------------------------------------------- carreiras e trapaças
registerRunnable({
  id: 'careers.all', area: 'careers', label: l('Liberar todas as carreiras', 'Unlock every career'),
  run: (s) => {
    const got: L[] = [];
    for (const d of careerDefs(s)) if (!careers(s).active.includes(d.id) && startCareer(s, d.id).ok) got.push(d.name);
    return got.length ? fmtL(l('Agora também: {c}.', 'Now also: {c}.'), { c: { pt: got.map((x) => x.pt).join(', '), en: got.map((x) => x.en).join(', ') } }) : l('Você já segue todas as carreiras desta época.', 'You already follow every career of this era.');
  },
});
const cheatEd = (k: keyof Edit31State['cheats'], label: L, help: L): void => registerEditable({
  id: `cheat.${k}`, area: k === 'reveal' ? 'tools' : 'careers', kind: 'bool', label, help, raw: true,
  get: (s) => !!edit31(s).cheats[k], set: (s, v) => { edit31(s).cheats[k] = !!v; if (k === 'noExhaust' && v) rest(s); },
});
cheatEd('noExhaust', l('Sem esgotamento (agenda, cansaço e estresse sem limite para você)', 'No exhaustion (no schedule, fatigue or stress limit for you)'),
  l('Suas carreiras não pesam na agenda e seu estresse e cansaço zeram toda semana.', 'Your careers weigh nothing on the schedule and your stress and fatigue reset every week.'));
cheatEd('reveal', l('Revelar tudo (sem névoa de conhecimento)', 'Reveal everything (no knowledge fog)'),
  l('Você vê os números exatos de todo mundo enquanto estiver ligado.', 'You see everyone\'s exact numbers while this is on.'));

function rest(s: GameState): void {
  const o = ownerOf(s);
  o.stress = 0;
  const pid = myPersonId31(s);
  const p = pid ? s.persons[pid] : undefined;
  if (p) { p.stress = 0; p.fatigue = 0; const st = stress17(s); if (st.l[p.id]) st.l[p.id] = 0; }
}
registerSimHook('week', 'editor31', (s) => { if (cheat31(s, 'noExhaust')) rest(s); });
registerLoad('editor31', (s) => (cheat31(s, 'noExhaust') ? -careers(s).active.reduce((t, id) => t + (careerDef(id)?.load ?? 0.25), 0) : 0));
KNOW_REVEAL31.f = (s) => cheat31(s, 'reveal');

// ---------------------------------------------------------------- itens e relíquias
registerRunnable({
  id: 'relic.give', area: 'items', target: 'relic', label: l('Dar para você', 'Give to you'),
  when: (s, id) => relics(s).list.some((x) => x.id === id && x.st !== 'player'),
  run: (s, id) => {
    const rl = relics(s).list.find((x) => x.id === id)!;
    rl.st = 'player'; delete rl.au; delete rl.bid;
    rl.own.push([s.config.companyName, s.year, 'editor']);
    return fmtL(l('{n} entra no seu acervo.', '{n} joins your collection.'), { n: rl.n });
  },
});
registerRunnable({
  id: 'relic.take', area: 'items', target: 'relic', label: l('Tirar de você', 'Take from you'),
  when: (s, id) => relics(s).list.some((x) => x.id === id && x.st === 'player'),
  run: (s, id) => {
    const rl = relics(s).list.find((x) => x.id === id)!;
    const prev = rl.own.length > 1 ? rl.own[rl.own.length - 2][0] : rl.own[0]?.[0] ?? '?';
    rl.st = 'kept'; delete rl.ex;
    rl.own.push([prev, s.year, 'editor']);
    return fmtL(l('{n} volta para {o}.', '{n} goes back to {o}.'), { n: rl.n, o: prev });
  },
});
registerRunnable({
  id: 'relic.create', area: 'items', label: l('Criar relíquia no seu acervo', 'Create a relic in your collection'),
  arg: { kind: 'select', label: l('Tipo', 'Kind'), def: 'guitar', options: () => (Object.keys(RELIC_KIND) as RelicKind[]).map((k) => ({ value: k, label: RELIC_KIND[k] })) },
  run: (s, _t, arg) => {
    const k = (RELIC_KIND[String(arg) as RelicKind] ? String(arg) : 'guitar') as RelicKind;
    const n = fmtL(l('{k} feita no editor', '{k} made in the editor'), { k: RELIC_KIND[k] });
    const rl = addRelic(s, k, n, undefined, undefined, 20000, s.year, `rl-ed31-${edit31(s).n}`);
    rl.st = 'player';
    rl.own.push([s.config.companyName, s.year, 'editor']);
    return n;
  },
});
export const relicName31 = (s: GameState, id: string): L | undefined => { const rl = relics(s).list.find((x) => x.id === id); return rl ? (rl.rr ? relicDef17(rl.rr)?.name ?? rl.n : rl.n) : undefined; };

// ---------------------------------------------------------------- cenas e eventos
registerRunnable({
  id: 'scene.event', area: 'scenes', label: l('Disparar evento', 'Fire event'),
  arg: { kind: 'select', label: l('Evento', 'Event'), options: () => EVENTS.filter((e) => !e.id.startsWith('sit17:')).map((e) => ({ value: e.id, label: e.title })) },
  run: (s, _t, arg) => {
    const def = eventById[String(arg)];
    if (!def) return { ok: false, text: l('Escolha um evento.', 'Choose an event.') };
    const r = luck(s, `ev:${def.id}`);
    const ctx = def.find ? def.find(s, r) : {};
    if (!ctx) return { ok: false, text: l('Ninguém se encaixa neste evento agora (faltam artistas ou condições).', 'Nobody fits this event right now (missing acts or conditions).') };
    const before = s.decisions.length;
    emitEvent(s, r, def.id, ctx);
    return s.decisions.length > before ? l('Virou uma decisão na sua mesa.', 'It became a decision on your desk.') : l('Aconteceu (veja os avisos).', 'It happened (see notices).');
  },
});
registerRunnable({
  id: 'scene.situation', area: 'scenes', label: l('Disparar situação', 'Fire situation'),
  arg: { kind: 'select', label: l('Situação', 'Situation'), options: () => SITS.map((d) => ({ value: d.id, label: l(d.id.replace(/_/g, ' '), d.id.replace(/_/g, ' ')) })) },
  run: (s, _t, arg) => {
    const r = forceSituation17(s, String(arg), luck(s, `sit:${arg}`));
    return r ?? { ok: false, text: l('Ninguém se encaixa nesta situação agora.', 'Nobody fits this situation right now.') };
  },
});
const KINDS18: [Kind18, PlaceKind, L][] = [
  ['number1', 'tv_chart', l('Número 1', 'Number one')], ['signing', 'boardroom', l('Assinatura de contrato', 'Contract signing')],
  ['soldout', 'venue_stadium', l('Show esgotado', 'Sold-out show')], ['festival', 'venue_festival', l('Festival', 'Festival')],
  ['premiere', 'venue_theatre', l('Estreia', 'Premiere')], ['verdict', 'court', l('Veredito', 'Verdict')], ['musicshow', 'tv_chart', l('Programa musical', 'Music show')],
];
registerRunnable({
  id: 'scene.storyboard', area: 'scenes', label: l('Abrir storyboard', 'Open storyboard'),
  arg: { kind: 'select', label: l('Momento', 'Moment'), options: () => KINDS18.map(([k, , n]) => ({ value: k, label: n })) },
  run: (s, _t, arg) => {
    const k = KINDS18.find((x) => x[0] === arg) ?? KINDS18[0];
    const act = playerActs(s)[0];
    const sh = logShot18(s, { k: k[0], act, text: k[2] });
    cine18(s).seen[`ed31:${sh.id}`] = s.week;
    const cs = queueScene(s, 'cine18', k[1], { title: board18(s, sh).title, shot: sh.id, actId: act ?? null }, { prio: true });
    return cs ? l('Storyboard na fila (abre ao fechar o editor).', 'Storyboard queued (opens when you leave the editor).') : l('Gravado no álbum de cenas.', 'Saved to the scene album.');
  },
});
registerEditable({
  id: 'scene.dmPhase', area: 'scenes', kind: 'select', label: l('Fase do mestre de drama', 'Drama master phase'), raw: true,
  options: () => (Object.keys(PHASE18) as Phase18[]).map((k) => ({ value: k, label: PHASE18[k].name })),
  get: (s) => dm18(s).ph, set: (s, v) => { const st = dm18(s); if (!PHASE18[v as Phase18]) return l('Fase inválida.', 'Invalid phase.'); st.ph = v as Phase18; st.phW = s.week; st.t = PHASE18[st.ph].target; },
});

// ---------------------------------------------------------------- mundo
registerEditable({
  id: 'world.trend', area: 'world', target: 'genre', kind: 'number', min: 0, max: 2, step: 0.05, label: l('Popularidade do gênero (0 a 2)', 'Genre popularity (0 to 2)'), raw: true,
  get: (s, g) => Math.round((s.genrePop[g!] ?? 0) * 100) / 100, set: (s, v, g) => { s.genrePop[g!] = clamp(Number(v), 0, 2); },
});
export const genres31 = (s: GameState) => GENRES.filter((g) => g.born <= s.year);
registerRunnable({
  id: 'world.tech', area: 'world', label: l('Liberar todas as tecnologias e formatos já', 'Unlock every technology and format now'), raw: true,
  run: (s) => { let n = 0; for (const k of Object.keys(s.techDates)) if (s.techDates[k] > s.year) { s.techDates[k] = s.year; n++; } return fmtL(l('{n} tecnologias adiantadas para {y}.', '{n} technologies moved up to {y}.'), { n, y: s.year }); },
});
registerEditable({
  id: 'world.recession', area: 'world', kind: 'bool', label: l('Recessão', 'Recession'), raw: true,
  get: (s) => !!s.economy.recession, set: (s, v) => { s.economy.recession = !!v; s.economy.recessionUntil = v ? s.week + 52 : 0; },
});
