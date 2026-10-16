// R31 · W0-ROLE — PESSOA E PAPÉIS. Uma pessoa é uma só (`s.persons`); o que muda ao longo do tempo é o PAPEL: artista,
// equipe, líder de selo, empresário, produtor, compositor, crítico, dono, família… Aposentadoria encerra papéis e abre
// o papel 'retired' — a identidade (id, nome, relações, histórico) continua a mesma.
//
// Construído por cima do que já existe (sem duplicar):
//  - `roles21` (`x4.r21.sp`, `spans21`) já guarda funções por pessoa com ano de início/fim e junta as fontes antigas
//    (integrante de ato, carreira nova do npc17, segunda carreira do world18, funções reais do acervo). `rolesOf` lê
//    `spans21` e traduz `Role21K` para `RoleKind`; `endRole` fecha também os períodos guardados em `x4.r21.sp`.
//  - `people16.roles16` resolve a IDENTIDADE (a mesma pessoa com chaves 'p:'/'pd:'/'e:'/'l:') — continua sendo a porta
//    para achar a chave canônica; aqui o `personId` é o id de `s.persons` (com ou sem 'p:') ou uma chave de ficha.
//  - Papéis que nenhum sistema antigo registra (equipe, líder, família, aposentado, dados do papel) ficam em
//    `x4.role31` (só os explícitos). Migrar líderes e equipe para cá é trabalho da 31.3 (B.20).

import { r21, spans21, type Role21K, type Span21 } from '../sys/roles21';
import { registerExt4 } from '../ext4';
import type { GameState } from '../types';

export type RoleKind = 'artist' | 'staff' | 'leader' | 'manager' | 'producer' | 'writer' | 'critic' | 'owner' | 'family' | 'exec' | 'festival'
  | 'financier' | 'publisher' | 'booking' | 'studio' | 'dj' | 'media' | 'venue' | 'teacher' | 'politics' | 'business' | 'retired';

export interface Role {
  /** estável: `${src}|${kind}|${org}|${from}` */
  id: string;
  /** id de `s.persons` (sem 'p:') ou chave de ficha ('l:…', 'e:…') */
  personId: string;
  kind: RoleKind;
  /** organização: selo, banda, festival, veículo… */
  org?: string;
  from: number;
  /** último ano no papel (ausente = em aberto) */
  to?: number;
  /** dados do papel (salário, cargo, departamento…) */
  data?: Record<string, string | number>;
  /** de onde veio: 'r31' (registrado aqui) ou 'r21' (roles21 e as fontes antigas que ele junta) */
  src: 'r31' | 'r21';
}

export const ROLE21_TO31: Record<Role21K, RoleKind> = {
  artist: 'artist', manager: 'manager', label_owner: 'owner', label_exec: 'exec', festival_founder: 'festival', producer: 'producer',
  financier: 'financier', publisher: 'publisher', booking: 'booking', studio_owner: 'studio', dj_radio: 'dj', media: 'media',
  venue_owner: 'venue', songwriter: 'writer', teacher: 'teacher', politics: 'politics', business: 'business',
};

export interface Role31St { list: Record<string, Role[]> }
declare module '../ext4' { interface Ext4 { role31: Role31St } }
const fresh = (): Role31St => ({ list: {} });
registerExt4('role31', fresh);
function st(s: GameState): Role31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  return (x.role31 ??= fresh()) as Role31St;
}

export const normPid = (pid: string): string => pid.replace(/^p:/, '');
const rid = (src: string, kind: string, org: string | undefined, from: number): string => `${src}|${kind}|${org ?? ''}|${from}`;
const open = (r: Pick<Role, 'to'>): boolean => r.to === undefined;
const activeIn = (r: Pick<Role, 'from' | 'to'>, y: number): boolean => r.from <= y && (r.to === undefined || r.to >= y);

function from21(pid: string, x: Span21): Role | null {
  if (x.ended) return null; // período antigo encerrado sem ano: não dá para situar no tempo
  const kind = ROLE21_TO31[x.k];
  return { id: rid('r21', kind, x.org, x.from), personId: pid, kind, ...(x.org ? { org: x.org } : {}), from: x.from, ...(x.to !== undefined ? { to: x.to } : {}), src: 'r21' };
}

/** Todos os papéis da pessoa (com `year`, só os ativos naquele ano), em ordem de início. */
export function rolesOf(s: GameState, personId: string, year?: number): Role[] {
  const pid = normPid(personId);
  const own = st(s).list[pid] ?? [];
  const seen = new Set(own.map((r) => `${r.kind}|${r.org ?? ''}|${r.from}`));
  const out: Role[] = [...own];
  if (!pid.includes(':')) {
    // aposentadoria em aberto: os papéis derivados ainda abertos (ex.: integrante de um ato que segue ativo) terminam
    // no ano anterior a ela — a fonte antiga não sabe da aposentadoria, mas a pessoa não está mais no papel
    const ret = own.find((r) => r.kind === 'retired' && open(r));
    for (const x of spans21(s, pid)) {
      const r = from21(pid, x);
      if (!r) continue;
      const k = `${r.kind}|${r.org ?? ''}|${r.from}`;
      if (seen.has(k)) continue;
      seen.add(k);
      // um papel aberto no próprio ano da aposentadoria também fecha (to < from: fica no histórico, sem ano ativo)
      if (ret && open(r) && r.from <= ret.from) r.to = ret.from - 1;
      out.push(r);
    }
  }
  return out.filter((r) => year === undefined || activeIn(r, year)).sort((a, b) => a.from - b.from || a.id.localeCompare(b.id));
}

export const hasRole = (s: GameState, personId: string, kind: RoleKind, year = s.year): boolean => rolesOf(s, personId, year).some((r) => r.kind === kind);

/** Abre um papel. Se já existe o mesmo papel aberto (tipo + organização), devolve o existente. */
export function addRole(s: GameState, personId: string, kind: RoleKind, opts: { org?: string; from?: number; data?: Record<string, string | number> } = {}): Role {
  const pid = normPid(personId);
  const dup = rolesOf(s, pid).find((r) => r.kind === kind && (r.org ?? '') === (opts.org ?? '') && open(r));
  if (dup) return dup;
  const from = opts.from ?? s.year;
  const r: Role = { id: rid('r31', kind, opts.org, from), personId: pid, kind, ...(opts.org ? { org: opts.org } : {}), from, ...(opts.data ? { data: { ...opts.data } } : {}), src: 'r31' };
  (st(s).list[pid] ??= []).push(r);
  return r;
}

/** Encerra os papéis abertos daquele tipo (e organização, se dada) no ano `year` (último ano no papel). Devolve
 *  quantos fechou. Fecha também os períodos de `x4.r21.sp`; os derivados de outras fontes (integrante de ato ativo,
 *  carreira do npc17) encerram pelo sistema dono. Um papel aberto DEPOIS de `year` (ex.: aberto no ano da aposentadoria,
 *  que fecha em `ano − 1`) fica com `to < from`: continua no histórico, mas não conta como ativo em ano nenhum. */
export function endRole(s: GameState, personId: string, kind: RoleKind, year = s.year, org?: string): number {
  const pid = normPid(personId);
  let n = 0;
  for (const r of st(s).list[pid] ?? []) if (r.kind === kind && open(r) && (org === undefined || r.org === org)) { r.to = year; n++; }
  for (const x of r21(s).sp[pid] ?? []) if (ROLE21_TO31[x.k] === kind && x.to === undefined && !x.ended && (org === undefined || x.org === org)) { x.to = year; n++; }
  return n;
}

/** Aposentadoria: fecha os papéis de trabalho e abre 'retired'. Família e dono (patrimônio) continuam. Mesma pessoa. */
export function retire(s: GameState, personId: string, year = s.year): Role {
  const pid = normPid(personId);
  const keep = new Set<RoleKind>(['family', 'owner', 'retired']);
  for (const r of rolesOf(s, pid, year)) if (!keep.has(r.kind)) endRole(s, pid, r.kind, year - 1, r.org); // último ano de trabalho: o anterior
  return addRole(s, pid, 'retired', { from: year });
}
