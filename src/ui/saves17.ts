// Rodada 17 — vários saves, de qualquer tamanho, e cada pessoa com os seus:
// - Local (IndexedDB, sem limite prático): autosave por partida em rodízio de 3 anos (ironman: um só), saves com
//   nome, renomear, duplicar, apagar, exportar (arquivo/texto VTN1) e importar para um slot novo.
// - Perfis locais: várias pessoas no mesmo navegador, cada uma vê só os próprios saves (trava leve por PIN).
// - Nuvem por pessoa (artifact no claude.ai): capacidades `db` + `user`; caminho privado data/users/<id>/ — nem o
//   dono do artifact lê. Sem login próprio: o claude.ai já identifica quem está jogando. Sem db/usuário → só local,
//   com o motivo à vista.

import { cloudDelete17, cloudList17, cloudLoad17, cloudRename17, cloudSave17, cloudSlot, type CloudMeta, type DbLike } from '../core/cloud17';
import { formatMoney } from '../core/money';
import { l, type L } from '../data/world';
import { locale, t } from '../i18n/strings';
import type { GameState } from '../sim/types';
import { modal, toast } from './common';
import { h } from './dom';
import {
  afterSave17, copyText, deleteSave, gunzip, gzip, gzipB64, importSaveText, listSaves, loadGame, openDb, profileId17, runId17, saveGame, store, tryDownload, type SaveMeta,
} from './store';
import './start17.css';

// ---------------------------------------------------------------- armazenamento local cru

const STORE = 'saves';
interface Rec { meta: SaveMeta; payload: Blob | string }

async function getRec(slot: string): Promise<Rec | undefined> {
  const db = await openDb();
  return new Promise((res, rej) => { const q = db.transaction(STORE, 'readonly').objectStore(STORE).get(slot); q.onsuccess = () => res(q.result as Rec | undefined); q.onerror = () => rej(q.error); });
}
async function putRec(slot: string, rec: Rec): Promise<void> {
  const db = await openDb();
  await new Promise<void>((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(rec, slot); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
const recJson = async (slot: string): Promise<string | null> => { const r = await getRec(slot); return r ? gunzip(r.payload) : null; };

function metaOf(g: GameState, slot: string, extra: Partial<SaveMeta> = {}): SaveMeta {
  const pp = Object.values(g.persons).find((p) => p.isPlayer);
  return { slot, signature: g.signature, company: g.config.companyName, year: g.year, month: g.month, role: g.config.role, savedAt: Date.now(), version: g.version,
    profile: profileId17(), kind: 'manual', player: pp?.name, cash: Math.round(g.player.cash), ironman: !!g.config.ironman, run: runId17(g), ...extra };
}

/** Grava um jogo num slot novo (importado, baixado da nuvem, duplicado). */
async function storeGame(g: GameState, slot: string, name?: string): Promise<void> {
  const payload = await gzip(JSON.stringify(g));
  await putRec(slot, { meta: { ...metaOf(g, slot, { name }), size: typeof payload === 'string' ? payload.length : payload.size }, payload });
}

export async function renameLocal17(slot: string, name: string): Promise<void> {
  const r = await getRec(slot);
  if (r) await putRec(slot, { ...r, meta: { ...r.meta, name: name.slice(0, 60) } });
}
export async function duplicateLocal17(slot: string): Promise<string> {
  const r = await getRec(slot);
  if (!r) throw new Error('missing');
  const ns = `copy-${Date.now().toString(36)}`;
  await putRec(ns, { payload: r.payload, meta: { ...r.meta, slot: ns, kind: 'manual', savedAt: Date.now(), name: `${r.meta.name || r.meta.company} (${t(l('cópia', 'copy'))})` } });
  return ns;
}
export async function exportText17(slot: string): Promise<string> {
  const j = await recJson(slot);
  if (!j) throw new Error('missing');
  return 'VTN1:' + (await gzipB64(j));
}
export async function importToSlot17(text: string, name?: string): Promise<GameState> {
  const g = await importSaveText(text);
  await storeGame(g, `imp-${Date.now().toString(36)}`, name);
  return g;
}

// ---------------------------------------------------------------- perfis locais

export interface Profile17 { id: string; name: string; pin?: string }
const PKEY = 'vtn:profiles17';
const readJ = <T>(k: string, d: T): T => { try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : d; } catch { return d; } };
const writeJ = (k: string, v: unknown) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch { /* sem armazenamento */ } };
export const profiles17 = (): Profile17[] => { const ps = readJ<Profile17[]>(PKEY, []); return ps.some((p) => p.id === 'default') ? ps : [{ id: 'default', name: t(l('Jogador 1', 'Player 1')) }, ...ps]; };
const pinHash = (pin: string) => { let x = 5381; for (const c of `masters|${pin}`) x = ((x * 33) ^ c.charCodeAt(0)) >>> 0; return x.toString(36); };
export function addProfile17(name: string, pin?: string): Profile17 {
  const p: Profile17 = { id: `p${Date.now().toString(36)}`, name: name.slice(0, 30) || '?', pin: pin ? pinHash(pin) : undefined };
  writeJ(PKEY, [...profiles17(), p]);
  return p;
}
export function switchProfile17(id: string): boolean {
  const p = profiles17().find((x) => x.id === id);
  if (!p) return false;
  if (p.pin) { const v = window.prompt(t(l('PIN de {n}:', 'PIN for {n}:'), { n: p.name })); if (v === null || pinHash(v) !== p.pin) { toast(t(l('PIN errado.', 'Wrong PIN.')), 'bad'); return false; } }
  writeJ('vtn:profile17', id);
  return true;
}
export const curProfile17 = (): Profile17 => profiles17().find((p) => p.id === profileId17()) ?? profiles17()[0];
export const mySaves17 = async (): Promise<SaveMeta[]> => (await listSaves()).filter((m) => (m.profile ?? 'default') === profileId17());

// ---------------------------------------------------------------- nuvem (runtime do claude.ai)

type UserLike = { id(): Promise<string | null>; me(): Promise<{ name: string }> };
type RT = { use?: (n: string) => Promise<unknown> };
export type Cloud17 = { db: DbLike; uid: string; name: string } | { why: L };
let CL: Promise<Cloud17> | null = null;
/** Banco e identidade do visitante (uma vez por carga de página); sem eles, o motivo para mostrar. */
export function cloud17(): Promise<Cloud17> {
  return (CL ??= (async (): Promise<Cloud17> => {
    const rt = typeof window !== 'undefined' ? (window as unknown as { claude?: RT }).claude : undefined;
    if (!rt?.use) return { why: l('Nuvem indisponível: o jogo não está aberto como artifact do claude.ai. Os saves ficam só neste navegador (exporte para levar a outro lugar).', 'Cloud unavailable: the game is not open as a claude.ai artifact. Saves stay in this browser only (export them to take elsewhere).') };
    const [db, user] = await Promise.all([rt.use('db').catch(() => null), rt.use('user').catch(() => null)]) as [DbLike | null, UserLike | null];
    if (!db) return { why: l('O claude.ai não liberou o armazenamento para você (sem login, acesso só de leitura ou permissão negada). Os saves ficam neste navegador.', 'claude.ai did not grant storage to you (signed out, view-only access or permission denied). Saves stay in this browser.') };
    const uid = user ? await user.id().catch(() => null) : null;
    if (!uid) return { why: l('O claude.ai não identificou quem está jogando, então não há pasta privada na nuvem. Os saves ficam neste navegador.', 'claude.ai did not identify who is playing, so there is no private cloud folder. Saves stay in this browser.') };
    let name = '';
    try { name = (await user!.me()).name || ''; } catch { /* sem nome */ }
    return { db, uid, name };
  })());
}
const isCloud = (c: Cloud17): c is { db: DbLike; uid: string; name: string } => 'db' in c;

function cloudErr(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === 'quota_exceeded') return t(l('A nuvem está cheia: apague saves antigos da nuvem.', 'Cloud is full: delete old cloud saves.'));
  if (code === 'invalid_argument' || code === 'not_granted') return t(l('Seu acesso a este jogo é só de leitura: peça ao dono acesso de colaborador para salvar na nuvem.', 'Your access to this game is view-only: ask the owner for contributor access to save to the cloud.'));
  if (code === 'resource_exhausted' || code === 'unavailable') return t(l('A nuvem está ocupada; tente de novo em instantes.', 'The cloud is busy; try again in a moment.'));
  if ((e as Error)?.message === 'incomplete') return t(l('Save da nuvem incompleto (gravação interrompida). Tente de novo.', 'Incomplete cloud save (interrupted write). Try again.'));
  return t(l('Erro na nuvem.', 'Cloud error.'));
}

export async function uploadGame17(g: GameState, name?: string): Promise<CloudMeta> {
  const c = await cloud17();
  if (!isCloud(c)) throw new Error('nocloud');
  const pp = Object.values(g.persons).find((p) => p.isPlayer);
  return cloudSave17(c.db, c.uid, cloudSlot(runId17(g)), JSON.stringify(g), { name: name ?? g.config.companyName, year: g.year, label: g.config.companyName, run: runId17(g), player: pp?.name });
}

// sincronização automática (opcional, por visitante): no máximo a cada 5 minutos, depois de um autosave
const SYNC = 'vtn:cloudsync17';
let lastSync = 0;
let syncing = false;
export const autoSync17 = (): boolean => readJ<boolean>(SYNC, false);
afterSave17.push((g, slot) => {
  if (!slot.startsWith('auto-') || !autoSync17() || syncing || Date.now() - lastSync < 5 * 60e3) return;
  syncing = true;
  lastSync = Date.now();
  void uploadGame17(g).catch(() => undefined).finally(() => { syncing = false; });
});

// ---------------------------------------------------------------- gerenciador de saves

const ago = (ts: number) => new Date(ts).toLocaleString(locale());
const kb = (n?: number) => (n ? `${Math.max(1, Math.round(n / 1024))} KB` : '');
const monthName = (m: number) => new Date(2000, m, 1).toLocaleString(locale(), { month: 'short' });

/** Painel completo (tela inicial e menu do jogo). `play` recebe o jogo carregado. */
export function saveManager17(play: (g: GameState) => void, o: { profiles?: boolean } = {}): HTMLElement {
  const box = h('div', { class: 'sv17' });
  const localBox = h('div', { class: 'sv17-list' }, h('p', { class: 'muted small' }, '…'));
  const cloudBox = h('div', { class: 'sv17-list' }, h('p', { class: 'muted small' }, '…'));
  const ask = (q: L, v = '') => window.prompt(t(q), v);
  const act = (label: string, fn: () => unknown, cls = 'btn small ghost', title?: string) => h('button', { type: 'button', class: cls, title, onclick: async () => { try { await fn(); } catch (e) { toast((e as Error)?.message === 'nocloud' ? t(l('Nuvem indisponível.', 'Cloud unavailable.')) : String((e as Error)?.message || e), 'bad'); } } }, label);
  const drawLocal = async () => {
    const list = await mySaves17();
    if (!list.length) { localBox.replaceChildren(h('p', { class: 'muted small' }, t(l('Nenhum save neste perfil ainda.', 'No saves in this profile yet.')))); return; }
    // agrupa por partida (autosaves em rodízio + saves manuais da mesma run)
    const groups = new Map<string, SaveMeta[]>();
    for (const m of list) { const k = m.run ?? m.signature; groups.set(k, [...(groups.get(k) ?? []), m]); }
    localBox.replaceChildren(...[...groups.values()].map((ms) => {
      const top = ms[0];
      return h('article', { class: 'sv17-run card' },
        h('header', null, h('b', null, top.company), ' ', h('span', { class: 'muted small' }, `${top.player ? `${top.player} · ` : ''}${top.ironman ? '☠ ironman · ' : ''}${ms.length} ${t(l('save(s)', 'save(s)'))}`)),
        ...ms.map((m) => h('div', { class: 'sv17-row' },
          h('button', { type: 'button', class: 'btn small', onclick: async () => { const g = await loadGame(m.slot); if (!g) return toast(t(l('Não foi possível carregar.', 'Could not load.')), 'bad'); play(g); } },
            `▶ ${m.name || (m.kind === 'auto' || m.slot.startsWith('auto') ? t(l('Autosave', 'Autosave')) : t(l('Save', 'Save')))} — ${monthName(m.month)} ${m.year}`),
          h('small', { class: 'muted' }, `${m.cash !== undefined ? formatMoney(m.cash, locale()) + ' · ' : ''}${kb(m.size)} · ${ago(m.savedAt)}`),
          h('span', { class: 'sv17-acts' },
            act('✎', async () => { const n = ask(l('Nome do save:', 'Save name:'), m.name || m.company); if (n !== null) { await renameLocal17(m.slot, n); void drawLocal(); } }, 'btn small ghost', t(l('Renomear', 'Rename'))),
            m.ironman ? null : act('⧉', async () => { await duplicateLocal17(m.slot); void drawLocal(); toast(t(l('Cópia criada.', 'Copy created.')), 'good'); }, 'btn small ghost', t(l('Duplicar', 'Duplicate'))),
            act('⇩', async () => { const tx = await exportText17(m.slot); if (!tryDownload(`masters-${m.company.replace(/[^\w-]+/g, '_')}-${m.year}.vtn.txt`, tx, 'text/plain')) { await copyText(tx); toast(t(l('Download bloqueado: texto copiado.', 'Download blocked: text copied.')), 'good'); } }, 'btn small ghost', t(l('Exportar (arquivo)', 'Export (file)'))),
            act('⎘', async () => { const ok = await copyText(await exportText17(m.slot)); toast(ok ? t(l('Save copiado como texto.', 'Save copied as text.')) : t(l('Não deu para copiar.', 'Could not copy.')), ok ? 'good' : 'bad'); }, 'btn small ghost', t(l('Copiar como texto', 'Copy as text'))),
            act('☁', async () => { const j = await recJson(m.slot); if (!j) return; await uploadGame17(JSON.parse(j) as GameState, m.name).catch((e) => { if ((e as Error).message === 'nocloud') throw e; throw new Error(cloudErr(e)); }); toast(t(l('Enviado para a sua nuvem.', 'Sent to your cloud.')), 'good'); void drawCloud(); }, 'btn small ghost', t(l('Enviar para a nuvem', 'Send to cloud'))),
            act('🗑', async () => { if (!window.confirm(t(l('Apagar este save?', 'Delete this save?')))) return; await deleteSave(m.slot); void drawLocal(); }, 'btn small ghost', t(l('Apagar', 'Delete'))),
          ))));
    }));
  };
  const drawCloud = async () => {
    const c = await cloud17();
    if (!isCloud(c)) { cloudBox.replaceChildren(h('p', { class: 'muted small' }, '☁ ', t(c.why))); return; }
    let list: CloudMeta[] = [];
    try { list = await cloudList17(c.db, c.uid); } catch (e) { cloudBox.replaceChildren(h('p', { class: 'bad small' }, cloudErr(e))); return; }
    const sync = h('input', { type: 'checkbox', checked: autoSync17(), onchange: (e: Event) => writeJ(SYNC, (e.target as HTMLInputElement).checked) });
    cloudBox.replaceChildren(
      h('p', { class: 'small' }, '☁ ', t(l('Nuvem privada de {n}: só você vê estes saves, em qualquer computador em que abrir o jogo pelo claude.ai.', '{n}\'s private cloud: only you see these saves, on any computer where you open the game through claude.ai.'), { n: c.name || t(l('você', 'you')) })),
      h('label', { class: 'check small' }, sync, t(l('Enviar o autosave para a nuvem sozinho (no máximo a cada 5 minutos)', 'Send the autosave to the cloud automatically (at most every 5 minutes)'))),
      ...(list.length ? list.map((m) => h('div', { class: 'sv17-row' },
        h('button', { type: 'button', class: 'btn small', onclick: async () => { try { const j = await cloudLoad17(c.db, c.uid, m.slot); if (!j) return; const g = await importSaveText(j); await storeGame(g, `cloud-${m.slot}`, m.name); play(g); } catch (e) { toast(cloudErr(e), 'bad'); } } }, `▶ ${m.name} — ${m.year}`),
        h('small', { class: 'muted' }, `${m.player ? m.player + ' · ' : ''}${kb(m.size)} · ${m.chunks} ${t(l('parte(s)', 'part(s)'))} · ${ago(m.ts)}`),
        h('span', { class: 'sv17-acts' },
          act('✎', async () => { const n = ask(l('Nome do save:', 'Save name:'), m.name); if (n !== null) { await cloudRename17(c.db, c.uid, m.slot, n).catch((e) => { throw new Error(cloudErr(e)); }); void drawCloud(); } }, 'btn small ghost', t(l('Renomear', 'Rename'))),
          act('🗑', async () => { if (!window.confirm(t(l('Apagar este save da nuvem?', 'Delete this cloud save?')))) return; await cloudDelete17(c.db, c.uid, m.slot).catch((e) => { throw new Error(cloudErr(e)); }); void drawCloud(); }, 'btn small ghost', t(l('Apagar', 'Delete')))))) : [h('p', { class: 'muted small' }, t(l('Nada na nuvem ainda: use ☁ num save local.', 'Nothing in the cloud yet: use ☁ on a local save.')))]),
    );
  };
  const file = h('input', { type: 'file', style: 'display:none', onchange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try { await importToSlot17(await f.text(), f.name.replace(/\.(json|txt|vtn)+$/g, '')); toast(t(l('Save importado para um slot novo.', 'Save imported into a new slot.')), 'good'); void drawLocal(); } catch { toast(t(l('Arquivo inválido.', 'Invalid file.')), 'bad'); }
  } }) as HTMLInputElement;
  box.append(
    o.profiles === false ? '' : profileBar17(() => { void drawLocal(); }),
    h('h4', null, t(l('Neste navegador', 'In this browser'))),
    h('p', { class: 'muted small' }, t(l('Sem limite de tamanho nem de quantidade. Cada partida guarda 3 autosaves (o último de cada um dos 3 anos mais recentes; ironman: só 1).', 'No size or count limit. Each run keeps 3 autosaves (the last of each of the 3 most recent years; ironman: just 1).'))),
    h('div', { class: 'row wrap' },
      store.game && !store.game.config.ironman ? act(t(l('Salvar como novo…', 'Save as new…')), async () => { const n = ask(l('Nome do save:', 'Save name:'), `${store.game!.config.companyName} ${store.game!.year}`); if (n === null) return; const ok = await saveGame(`man-${Date.now().toString(36)}`, n); toast(ok ? t(l('Salvo.', 'Saved.')) : 'Erro', ok ? 'good' : 'bad'); void drawLocal(); }, 'btn small') : null,
      act(t(l('Importar arquivo', 'Import file')), () => file.click()),
      act(t(l('Colar texto de save', 'Paste save text')), async () => { const tx = ask(l('Cole o texto do save (JSON ou VTN1:...)', 'Paste the save text (JSON or VTN1:...)')); if (!tx) return; try { await importToSlot17(tx); toast(t(l('Save importado.', 'Save imported.')), 'good'); void drawLocal(); } catch { toast(t(l('Texto de save inválido.', 'Invalid save text.')), 'bad'); } }),
      file),
    localBox,
    h('h4', null, t(l('Na nuvem (sua conta do claude.ai)', 'In the cloud (your claude.ai account)'))),
    cloudBox,
  );
  void drawLocal();
  void drawCloud();
  return box;
}

/** Seletor de perfil (várias pessoas no mesmo navegador). */
export function profileBar17(onSwitch: () => void): HTMLElement {
  const bar = h('div', { class: 'sv17-prof row wrap' });
  const draw = () => {
    const cur = curProfile17();
    bar.replaceChildren(
      h('span', { class: 'small' }, '👤 ', t(l('Perfil:', 'Profile:')), ' '),
      ...profiles17().map((p) => h('button', { type: 'button', class: `btn small ${p.id === cur.id ? 'primary' : 'ghost'}`, 'aria-pressed': String(p.id === cur.id), onclick: () => { if (p.id !== cur.id && switchProfile17(p.id)) { draw(); onSwitch(); } } }, `${p.name}${p.pin ? ' 🔒' : ''}`)),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => {
        const n = window.prompt(t(l('Nome da pessoa:', 'Person\'s name:')));
        if (!n) return;
        const pin = window.prompt(t(l('PIN opcional (deixe vazio para nenhum). É uma trava leve contra cliques por engano, não uma senha forte.', 'Optional PIN (leave empty for none). A light lock against accidental clicks, not a strong password.'))) || undefined;
        const p = addProfile17(n, pin);
        writeJ('vtn:profile17', p.id);
        draw(); onSwitch();
      } }, '+ ', t(l('Pessoa', 'Person'))),
      h('small', { class: 'muted' }, t(l('Cada perfil vê só os próprios saves neste navegador. No claude.ai, cada conta já tem a sua nuvem privada.', 'Each profile sees only its own saves in this browser. On claude.ai, each account already has its own private cloud.'))),
    );
  };
  draw();
  return bar;
}

export function saveManagerModal17(play: (g: GameState) => void): void {
  let close = () => {};
  close = modal(t(l('Saves', 'Saves')), saveManager17((g) => { close(); play(g); }), { wide: true });
}

/** "Continuar" da tela inicial: o save mais recente do perfil. */
export async function lastSave17(): Promise<SaveMeta | undefined> {
  return (await mySaves17())[0];
}
