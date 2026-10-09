// Sede isométrica em pixel art, habitada (GDD §1 "aquário gerencial", §21): salas por nível,
// mobília e equipamento por era, pessoas fazendo o que a agenda do mês manda.
// Renderiza num backbuffer de baixa resolução e amplia por zoom inteiro (pixels nítidos).

import { BRANCH_LEVELS, HQ_LEVELS, STAFF_ROLES } from '../data/rules';
import { cityById, l, type L } from '../data/world';
import { getLang, t } from '../i18n/strings';
import type { Appearance, GameState, Person } from '../sim/types';
import { playerActs } from '../sim/util';
import { badgePx, logoUrl, posterPx } from './art';
import { h } from './dom';
import { actActivity, isPresent, staffActivity, type Activity } from './pixel/activity';
import { avatarSprite, lookOf, lookKey, variantOf, type Dir, type Pose, type Role } from './pixel/avatar';
import { drawText, fitText } from './pixel/font';
import { icon } from './pixel/icons';
import { PALETTES, eraOf } from './pixel/palette';
import { C, Px, mix, shade, withAlpha, type Sprite } from './pixel/px';
import { BRANCH_LAYOUT, ROOM_NAMES, buildScene, findPath, freeTiles, roomAt, type Scene, type Spot } from './pixel/scene';
import { WALL_H, decalPx, floorAt, furniture, groundAt, rugAt, wallSprite, type DecalKind, type RoomKind } from './pixel/sprites';

const MARGIN = 3; // tiles de chão externo

// ---------- ganchos da sede-painel (rodada 8, ui/sys/hq8.ts) ----------

/** Estado visível de uma carreira na sede: o balão sobre a cabeça. */
export type BubbleKind = 'record' | 'write' | 'rehearse' | 'rest' | 'idle' | 'attention';
export interface RoomTag { room: RoomKind; text: string; tone: 'good' | 'warn' | 'bad' | 'info' }
export const hqHooks: {
  /** balão por carreira (null = nenhum) */
  bubble?: (s: GameState, actId: string) => BubbleKind | null;
  /** etiquetas sobre as salas: estúdio livre ou com fila, quem compõe, quem descansa… */
  roomTags?: (s: GameState) => RoomTag[];
  /** clique numa sala (ex.: estúdio → sessão em andamento) */
  onRoom?: (kind: RoomKind) => void;
  /** clique numa carreira (ex.: próxima decisão importante) */
  onAct?: (actId: string) => void;
  /** linhas extras no balão de dica da carreira */
  tip?: (s: GameState, actId: string) => string[];
  /** lista lateral (acesso direto, para quem prefere rapidez) */
  side?: (s: GameState) => HTMLElement;
} = {};
const FPS_MS = 33;

interface Agent {
  key: string;
  kind: 'member' | 'rep' | 'staff';
  personId?: string;
  staffId?: string;
  actId?: string;
  name: string;
  look: Appearance;
  role: Role | null;
  staffRole?: string;
  variant: number;
  activity: Activity;
  x: number;
  y: number;
  path: [number, number][];
  spot: Spot | null;
  dir: Dir;
  moving: boolean;
  dist: number;
  wait: number;
  phase: number;
  seen: boolean;
}

interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  key: number;
  agent?: Agent;
  actId?: string;
  label?: string;
  sub?: string;
  room?: RoomKind;
}

type Mode = 'overview' | string;

export class HqView {
  readonly canvas: HTMLCanvasElement;
  readonly toolbar: HTMLDivElement;
  readonly stage: HTMLDivElement;
  private tip: HTMLDivElement;
  private ctx: CanvasRenderingContext2D;
  private bb: HTMLCanvasElement;
  private bbx: CanvasRenderingContext2D;
  private raf = 0;
  private running = false;
  private lastDraw = 0;
  private lastCheck = 0;
  private t0 = performance.now();
  private time = 0;
  private dirty = true;
  private reduced = false;

  private scene: Scene | null = null;
  private sceneKey = '';
  /** 'main' = matriz; senão o id da filial mostrada */
  site = 'main';
  private agentKey = '';
  private staticCanvas: HTMLCanvasElement | null = null;
  private X0 = 0;
  private Y0 = 0;
  private agents = new Map<string, Agent>();
  private hits: Hit[] = [];
  private hover: Hit | null = null;
  private recording = false;
  /** balões e etiquetas calculados no sync (não a cada quadro) */
  private bubbles = new Map<string, BubbleKind>();
  private tags: RoomTag[] = [];
  private statusKey = '';
  /** camada de estado (balões e etiquetas das salas) ligada? */
  overlay = true;

  private zoom = 0; // 0 = automático
  private camX = 0;
  private camY = 0;
  private userCam = false;
  private drag: { x: number; y: number; cx: number; cy: number; moved: boolean; id: number } | null = null;
  private mode: Mode = 'overview';
  private cssW = 800;
  private cssH = 460;

  onSelect: (actId: string) => void = () => {};
  onSelectPerson: (personId: string) => void = () => {};
  onSelectStaff?: (staffId: string) => void;

  constructor(private getState: () => GameState | null) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hq-canvas px';
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'img');
    this.ctx = this.canvas.getContext('2d')!;
    this.bb = document.createElement('canvas');
    this.bbx = this.bb.getContext('2d')!;
    this.tip = h('div', { class: 'hq-tip', role: 'tooltip' });
    this.tip.hidden = true;
    this.stage = h('div', { class: 'hq-stage' }, this.canvas, this.tip);
    this.toolbar = h('div', { class: 'hq-toolbar' });
    this.bindInput();
  }

  // ---------- ciclo ----------

  start(): void {
    this.reduced = document.documentElement.classList.contains('reduced-motion');
    this.running = true;
    this.dirty = true;
    this.refreshToolbar();
    cancelAnimationFrame(this.raf);
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      if (now - this.lastDraw < FPS_MS) return;
      const dt = Math.min(0.1, (now - this.lastDraw) / 1000);
      this.lastDraw = now;
      if (now - this.lastCheck > 400) {
        this.lastCheck = now;
        this.reduced = document.documentElement.classList.contains('reduced-motion');
        this.sync();
      }
      if (!this.reduced) {
        this.time = (now - this.t0) / 1000;
        this.update(dt);
        this.dirty = true;
      }
      if (this.dirty) this.draw();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Troca entre a matriz e as filiais. */
  setSite(site: string): void {
    this.site = site;
    this.mode = 'overview';
    this.userCam = false;
    this.agents = new Map();
    this.agentKey = '';
    this.sync();
    this.refreshToolbar();
    this.dirty = true;
  }

  /** Muda o modo do seletor (visão geral ou uma banda). */
  setMode(mode: Mode): void {
    this.mode = mode;
    this.agentKey = '';
    this.sync();
    this.refreshToolbar();
    this.dirty = true;
  }

  // ---------- estado → cena e pessoas ----------

  private sync(): void {
    const s = this.getState();
    if (!s) return;
    if (this.site !== 'main' && !s.branches.some((b) => b.id === this.site)) this.site = 'main';
    const branch = s.branches.find((b) => b.id === this.site);
    const acts = siteActs(s, this.site);
    if (this.mode !== 'overview' && !acts.includes(this.mode)) this.mode = 'overview';
    const st = s.player.stats;
    const sk = `${this.site}:${branch?.level ?? ''}|${s.player.hq}|${eraOf(s.year)}|${s.player.equipment.join(',')}|${st.gold}/${st.platinum}/${st.awards}|${acts.join(',')}|${s.player.staff.length}|${s.config.seed}`;
    if (sk !== this.sceneKey) {
      this.sceneKey = sk;
      this.scene = buildScene(s, branch ? { level: BRANCH_LAYOUT[branch.level], seedKey: branch.id } : undefined);
      this.buildStatic(s);
      this.agentKey = '';
      if (!this.userCam) this.resetCam();
      this.refreshToolbar();
    }
    const ak = `${this.mode}|${s.week}|${acts.map((id) => `${id}:${(s.agenda[id] ?? []).map((x) => x.action).join('+')}:${s.acts[id].status}:${s.acts[id].members.map((m) => (s.persons[m]?.look ? lookKey(s.persons[m].look!) : m)).join('.')}`).join(',')}|${s.player.staff.map((x) => x.id + x.role).join(',')}`;
    // balões e etiquetas: baratos de recalcular a cada 400 ms
    const bub = new Map<string, BubbleKind>();
    if (hqHooks.bubble) for (const id of acts) { const k = hqHooks.bubble(s, id); if (k) bub.set(id, k); }
    const tags = hqHooks.roomTags?.(s) ?? [];
    const stk = `${[...bub].map(([a, b]) => a + b).join(',')}|${tags.map((x) => x.room + x.text + x.tone).join(',')}`;
    if (stk !== this.statusKey) {
      this.statusKey = stk;
      this.bubbles = bub;
      this.tags = tags;
      this.dirty = true;
    }
    if (ak !== this.agentKey) {
      const first = this.agentKey === '';
      this.agentKey = ak;
      this.buildAgents(s, first);
      this.refreshToolbar();
      this.dirty = true;
    }
  }

  private buildAgents(s: GameState, snap: boolean): void {
    const sc = this.scene;
    if (!sc) return;
    const want = new Map<string, Agent>();
    const mk = (key: string, base: Omit<Agent, 'x' | 'y' | 'path' | 'spot' | 'dir' | 'moving' | 'dist' | 'wait' | 'phase' | 'seen' | 'key'>): Agent => {
      const old = this.agents.get(key);
      const a: Agent = old ? { ...old, ...base } : { ...base, key, x: sc.entrance[0] + 0.5, y: sc.entrance[1] + 0.5, path: [], spot: null, dir: 'NE', moving: false, dist: 0, wait: 0, phase: Math.random() * 10, seen: false };
      want.set(key, a);
      return a;
    };
    const acts = siteActs(s, this.site).map((id) => s.acts[id]);
    for (const act of acts) {
      const activity = actActivity(s, act);
      if (!isPresent(activity)) continue;
      const members = act.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
      if (!members.length) continue;
      if (this.mode === 'overview') {
        const rep = members.find((p) => p.role === 'vocal' || p.role === 'mc') ?? members[0];
        mk(`rep:${act.id}`, { kind: 'rep', personId: rep.id, actId: act.id, name: act.name, look: lookOf(rep), role: rep.role, variant: variantOf(rep.id), activity });
      } else if (this.mode === act.id) {
        for (const p of members) mk(`m:${p.id}`, { kind: 'member', personId: p.id, actId: act.id, name: p.name, look: lookOf(p), role: p.role, variant: variantOf(p.id), activity });
      }
    }
    const staff = this.site === 'main' ? s.player.staff : [];
    for (const st of staff) mk(`s:${st.id}`, { kind: 'staff', staffId: st.id, name: st.name, look: lookOf({ id: st.id }), role: null, staffRole: st.role, variant: 0, activity: staffActivity(s, st.id) });
    this.agents = want;
    this.recording = [...want.values()].some((a) => a.activity.kind === 'record');
    this.assignSpots(snap);
  }

  private assignSpots(snap: boolean): void {
    const sc = this.scene!;
    const taken = new Set<Spot>();
    const take = (pred: (sp: Spot) => boolean): Spot | null => {
      const sp = sc.spots.find((x) => !taken.has(x) && pred(x));
      if (sp) taken.add(sp);
      return sp ?? null;
    };
    const agents = [...this.agents.values()];
    const pri = (a: Agent) => (a.kind === 'staff' ? 0 : a.activity.kind === 'record' ? 1 : a.activity.kind === 'rehearse' ? 2 : a.activity.kind === 'write' ? 3 : a.activity.kind === 'rest' ? 4 : 5);
    agents.sort((a, b) => pri(a) - pri(b) || a.key.localeCompare(b.key));
    for (const a of agents) {
      let sp: Spot | null = null;
      const k = a.activity.kind;
      if (a.kind === 'staff') {
        if (a.staffRole === 'producer' || a.staffRole === 'engineer') sp = take((x) => x.kind === 'console');
        sp ??= take((x) => x.kind === 'desk');
        sp ??= take((x) => x.kind === 'stand' && (x.room === 'office' || x.room === 'hall'));
      } else if (k === 'record' || k === 'rehearse') {
        const rooms = k === 'record' ? ['booth', 'rehearsal'] : ['rehearsal', 'booth'];
        for (const rm of rooms) {
          if (sp) break;
          if (a.role === 'drums') sp = take((x) => x.kind === 'drum' && x.room === rm);
          if (!sp && a.role === 'producer' && k === 'record') sp = take((x) => x.kind === 'console');
          if (!sp) sp = take((x) => x.kind === 'play' && x.room === rm);
        }
      } else if (k === 'write') {
        sp = take((x) => x.kind === 'sit' && x.room === 'writing') ?? take((x) => x.kind === 'sit' && x.room === 'meeting') ?? take((x) => x.kind === 'stand' && x.room === 'writing');
      } else if (k === 'rest') {
        sp = take((x) => x.kind === 'sit' && x.room === 'lounge') ?? take((x) => x.kind === 'stand' && x.room === 'lounge');
      }
      const changed = a.spot !== sp || !a.seen;
      a.spot = sp;
      if (snap || !a.seen || this.reduced) {
        const [tx, ty] = sp ? [sp.x, sp.y] : this.randomIdleTile(a);
        a.x = tx + 0.5;
        a.y = ty + 0.5;
        a.path = [];
        a.dir = sp?.dir ?? (Math.random() < 0.5 ? 'SE' : 'SW');
        a.seen = true;
        a.wait = 2 + Math.random() * 6;
      } else if (changed) {
        this.walkTo(a, sp ? [sp.x, sp.y] : this.randomIdleTile(a));
      }
    }
  }

  private randomIdleTile(a: Agent): [number, number] {
    const sc = this.scene!;
    const rooms = a.kind === 'staff' ? (['office', 'hall'] as const) : (['lounge', 'hall', 'writing', 'trophy', 'rehearsal'] as const);
    const tiles = freeTiles(sc, [...rooms]);
    if (!tiles.length) return sc.entrance;
    return tiles[Math.floor(Math.random() * tiles.length)];
  }

  private walkTo(a: Agent, to: [number, number]): void {
    const sc = this.scene!;
    const from: [number, number] = [Math.floor(a.x), Math.floor(a.y)];
    const p = findPath(sc, from, to);
    if (!p) {
      a.x = to[0] + 0.5;
      a.y = to[1] + 0.5;
      a.path = [];
      return;
    }
    a.path = p;
  }

  private update(dt: number): void {
    const speed = 2.1;
    for (const a of this.agents.values()) {
      if (a.path.length) {
        const [nx, ny] = a.path[0];
        const tx = nx + 0.5;
        const ty = ny + 0.5;
        const dx = tx - a.x;
        const dy = ty - a.y;
        const d = Math.hypot(dx, dy);
        const step = speed * dt;
        if (Math.abs(dx) > Math.abs(dy)) a.dir = dx > 0 ? 'SE' : 'NW';
        else if (Math.abs(dy) > 0.001) a.dir = dy > 0 ? 'SW' : 'NE';
        if (d <= step) {
          a.x = tx;
          a.y = ty;
          a.path.shift();
          if (!a.path.length) {
            a.wait = 3 + Math.random() * 8;
            if (a.spot) a.dir = a.spot.dir;
            else a.dir = Math.random() < 0.5 ? 'SE' : 'SW';
          }
        } else {
          a.x += (dx / d) * step;
          a.y += (dy / d) * step;
        }
        a.dist += Math.min(step, d);
        a.moving = true;
      } else {
        a.moving = false;
        if (!a.spot) {
          a.wait -= dt;
          if (a.wait <= 0) {
            a.wait = 4 + Math.random() * 8;
            this.walkTo(a, this.randomIdleTile(a));
          }
        }
      }
    }
  }

  // ---------- camada estática (piso, paredes do fundo, decalques) ----------

  private buildStatic(s: GameState): void {
    const sc = this.scene!;
    const { W, H, pal } = sc;
    const X0 = (H + MARGIN) * 16 + 4;
    const Y0 = WALL_H + 14;
    const sw = (W + H + 2 * MARGIN) * 16 + 8;
    const sh = Y0 + (W + H + 2 * MARGIN) * 8 + 8;
    this.X0 = X0;
    this.Y0 = Y0;
    const p = new Px(sw, sh);
    const lo = -MARGIN * 16;
    const hiX = (W + MARGIN) * 16;
    const hiY = (H + MARGIN) * 16;
    const seedOf = new Map(sc.rooms.map((r, i) => [r.id, i * 7 + 3]));
    for (let py = 0; py < sh; py++) {
      for (let px = 0; px < sw; px++) {
        const X = px + 0.5 - X0;
        const Y = py + 0.5 - Y0;
        const gx = Y + X / 2;
        const gy = Y - X / 2;
        if (gx < lo || gy < lo || gx >= hiX || gy >= hiY) continue;
        const tx = Math.floor(gx / 16);
        const ty = Math.floor(gy / 16);
        const room = gx >= 0 && gy >= 0 ? roomAt(sc, tx, ty) : null;
        let c: number;
        if (room) {
          const f = pal.floors[room.floor];
          c = floorAt(f.kind, f.a, f.b, gx, gy, seedOf.get(room.id) ?? 0);
          for (const rg of sc.rugs) {
            const u = gx - rg.x * 16 - 3;
            const v = gy - rg.y * 16 - 3;
            const rw = rg.w * 16 - 6;
            const rh = rg.h * 16 - 6;
            if (u >= 0 && v >= 0 && u < rw && v < rh) c = rugAt(pal, u, v, rw, rh, 3);
          }
          // oclusão perto das paredes do fundo e das internas
          const lx = gx - tx * 16;
          const ly = gy - ty * 16;
          let occ = 0;
          if (gx < 4 || gy < 4) occ = 0.22;
          else if ((lx < 2 && sc.edges.has(`E:${tx - 1}:${ty}`)) || (ly < 2 && sc.edges.has(`S:${tx}:${ty - 1}`))) occ = 0.16;
          if (occ) c = shade(c, -occ);
          for (const lt of sc.lights) if (gx >= lt.x && gy >= lt.y && gx < lt.x + lt.w && gy < lt.y + lt.h && (px + py) % 2 === 0) c = mix(c, pal.lamp, 0.16);
        } else {
          c = groundAt(pal, gx, gy);
          // sombra do prédio (luz do alto à esquerda)
          if ((gx >= W * 16 && gx < W * 16 + 14 && gy > -4 && gy < H * 16 + 14) || (gy >= H * 16 && gy < H * 16 + 10 && gx > -4 && gx < W * 16 + 14)) c = shade(c, -0.28);
          // escurece a borda do terreno
          const edge = Math.min(gx - lo, gy - lo, hiX - gx, hiY - gy);
          if (edge < 10) c = mix(c, pal.bg, (10 - edge) / 12);
        }
        p.put(px, py, c);
      }
    }
    const cv = p.canvas();
    const cx = cv.getContext('2d')!;
    // paredes do fundo
    const scr = (gx: number, gy: number): [number, number] => [X0 + gx - gy, Y0 + (gx + gy) / 2];
    const blitS = (sp: Sprite, gx: number, gy: number) => {
      const [x, y] = scr(gx, gy);
      cx.drawImage(sp.c, Math.round(x - sp.ax), Math.round(y - sp.ay));
    };
    blitS(wallSprite(sc.era, 'x', 'post'), -4, -4);
    for (let y = H - 1; y >= 0; y--) blitS(wallSprite(sc.era, 'y', 'back', y === H - 1), -4, y * 16);
    for (let x = 0; x < W; x++) blitS(wallSprite(sc.era, 'x', 'back', x === W - 1), x * 16, -4);
    // decalques
    const dl = new Px(sw, sh);
    for (const d of sc.decals) {
      if (d.dyn) continue;
      const src = this.decalSource(s, d.kind, d.variant ?? 0, d.actId);
      if (!src) continue;
      this.placeDecal(dl, src, d.wall, d.tile, d.z, d.span ?? 1);
    }
    cx.drawImage(dl.canvas(), 0, 0);
    // placa da empresa na entrada
    this.drawSign(cx, s);
    this.staticCanvas = cv;
  }

  private decalSource(s: GameState, kind: string, variant: number, actId?: string): Px | null {
    const sc = this.scene!;
    if (kind === 'poster') {
      const a = actId ? s.acts[actId] : undefined;
      if (!a) return decalPx('photo', sc.era, variant);
      return posterPx(a.logoSeed, a.name, a.genre, a.formed);
    }
    return decalPx(kind as DecalKind, sc.era, variant);
  }

  private decalPos(src: Px, wall: 'x' | 'y', tile: number, z: number, span: number): [number, number, 1 | -1] {
    const free = span * 16 - src.w;
    let off = Math.max(0, Math.round(free / 2));
    off -= off % 2;
    if (wall === 'x') {
      const g = tile * 16 + off;
      return [this.X0 + g, this.Y0 + Math.floor(g / 2) - z, 1];
    }
    let g1 = (tile + span) * 16 - off;
    g1 -= g1 % 2;
    return [this.X0 - g1, this.Y0 + Math.floor(g1 / 2) - z, -1];
  }

  private placeDecal(dl: Px, src: Px, wall: 'x' | 'y', tile: number, z: number, span: number): void {
    const [x, y, slope] = this.decalPos(src, wall, tile, z, span);
    dl.decal(src, x, y, slope);
  }

  private drawSign(cx: CanvasRenderingContext2D, s: GameState): void {
    const sc = this.scene!;
    const name = s.branches.find((b) => b.id === this.site)?.name ?? (s.config.companyName || 'HQ');
    const pal = sc.pal;
    const [ex] = sc.entrance;
    const gx = (ex + 1.6) * 16;
    const gy = (sc.H + 1.2) * 16;
    const x = this.X0 + gx - gy;
    const y = this.Y0 + (gx + gy) / 2;
    const lit = sc.era === '1980' || sc.era === '2030' || sc.era === '2020';
    // texto curto com fonte bitmap
    const txt = name.length > 14 ? name.slice(0, 14) : name;
    const w = Math.min(64, txt.length * 4 + 6);
    const p = new Px(w + 2, 22);
    p.vline(2, 8, 21, pal.metalDark);
    p.vline(w - 1, 8, 21, pal.metalDark);
    p.rect(0, 0, w + 1, 9, lit ? C('#14121a') : pal.woodDark);
    p.rect(1, 1, w - 1, 7, lit ? C('#1e1a28') : pal.wood);
    drawText(p, fitText(txt, w - 4), 3, 2, lit ? pal.glow : pal.paper);
    p.outline(pal.outline);
    cx.drawImage(p.canvas(), Math.round(x - w / 2), Math.round(y - 22));
  }

  // ---------- desenho ----------

  private resize(): void {
    const w = Math.max(280, Math.floor(this.stage.clientWidth || this.canvas.parentElement?.clientWidth || 800));
    const hh = Math.round(Math.min(680, Math.max(320, w * 0.62)));
    if (w !== this.cssW || hh !== this.cssH || this.canvas.width !== w) {
      this.cssW = w;
      this.cssH = hh;
      this.canvas.width = w;
      this.canvas.height = hh;
      this.canvas.style.height = `${hh}px`;
      if (!this.userCam) this.resetCam();
    }
  }

  private fitZoom(): number {
    const sc = this.scene;
    if (!sc) return 2;
    const bw = (sc.W + sc.H) * 16;
    const bh = (sc.W + sc.H) * 8 + WALL_H;
    return Math.max(1, Math.min(5, Math.floor(Math.min(this.cssW / bw, this.cssH / bh) + 0.45)));
  }

  private resetCam(): void {
    const sc = this.scene;
    if (!sc) return;
    this.zoom = this.fitZoom();
    this.camX = this.X0 + (sc.W - sc.H) * 8;
    this.camY = this.Y0 + (sc.W + sc.H) * 4 - WALL_H / 2 + 4;
    this.userCam = false;
    this.dirty = true;
    this.updateZoomLabel();
  }

  private screenOf(x: number, y: number): [number, number] {
    return [this.X0 + (x - y) * 16, this.Y0 + (x + y) * 8];
  }

  draw(): void {
    this.dirty = false;
    this.resize();
    const s = this.getState();
    const sc = this.scene;
    const z = this.zoom || 2;
    const bw = Math.ceil(this.cssW / z);
    const bh = Math.ceil(this.cssH / z);
    if (this.bb.width !== bw || this.bb.height !== bh) {
      this.bb.width = bw;
      this.bb.height = bh;
    }
    const b = this.bbx;
    b.imageSmoothingEnabled = false;
    const pal = sc?.pal ?? PALETTES['1960'];
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.fillStyle = cssCol(pal.bg);
    b.fillRect(0, 0, bw, bh);
    if (!s || !sc || !this.staticCanvas) {
      this.blitOut(bw, bh, z);
      return;
    }
    const ox = Math.round(bw / 2 - this.camX);
    const oy = Math.round(bh / 2 - this.camY);
    b.setTransform(1, 0, 0, 1, ox, oy);
    b.drawImage(this.staticCanvas, 0, 0);
    const frameAt = (fps: number, phase = 0) => (this.reduced ? 0 : Math.floor(this.time * fps + phase));
    // luz de gravação
    const onair = sc.decals.find((d) => d.dyn === 'onair');
    if (onair) {
      const lit = this.recording && (this.reduced || frameAt(1.6) % 5 !== 4);
      const src = decalPx(lit ? 'onair_lit' : 'onair', sc.era);
      const [x, y, slope] = this.decalPos(src, onair.wall, onair.tile, onair.z, 1);
      const tmp = new Px(src.w, src.h + Math.ceil(src.w / 2) + 1);
      tmp.decal(src, 0, slope === 1 ? 0 : Math.ceil(src.w / 2), slope);
      b.drawImage(getCanvas(`onair:${sc.era}:${lit}:${slope}`, () => tmp.canvas()), x, slope === 1 ? y : y - Math.ceil(src.w / 2));
      if (lit) {
        b.fillStyle = 'rgba(255,70,50,0.10)';
        b.beginPath();
        b.ellipse(x + src.w / 2, y + src.h / 2 + (slope === 1 ? src.w / 4 : -src.w / 4), 14, 8, 0, 0, Math.PI * 2);
        b.fill();
      }
    }
    // objetos ordenados por profundidade
    type Dr = { key: number; draw: () => void };
    const list: Dr[] = [];
    this.hits = [];
    for (const it of sc.items) {
      list.push({
        key: it.key,
        draw: () => {
          const sp = furniture(it.kind, sc.era, it.facing, it.variant, it.frames > 1 ? frameAt(it.kind === 'tape' || it.kind === 'gramophone' || it.kind === 'lathe' ? 6 : 3, it.x * 0.7 + it.y) : 0);
          const [x, y] = this.screenOf(it.x, it.y);
          const dx = Math.round(x - sp.ax);
          const dy = Math.round(y - sp.ay);
          b.drawImage(sp.c, dx, dy);
          if (it.label) this.hits.push({ x: dx, y: dy, w: sp.c.width, h: sp.c.height, key: it.key - 100, label: t(it.label) });
        },
      });
    }
    for (const w of sc.walls) {
      list.push({
        key: w.key,
        draw: () => {
          const sp = wallSprite(sc.era, w.orient, w.style);
          let gx = w.x * 16;
          let gy = w.y * 16;
          if (w.style === 'post') { gx -= 2; gy -= 2; }
          else if (w.orient === 'x') gy -= 2;
          else gx -= 2;
          const [x, y] = [this.X0 + gx - gy, this.Y0 + (gx + gy) / 2];
          b.drawImage(sp.c, Math.round(x - sp.ax), Math.round(y - sp.ay));
        },
      });
    }
    const shadow = getCanvas('shadow', () => {
      const p = new Px(14, 5);
      p.ellipse(7, 2.5, 6.5, 2, withAlpha(C('#000000'), 70));
      return p.canvas();
    });
    for (const a of this.agents.values()) {
      const seated = !a.moving && a.spot && (a.spot.kind === 'sit' || a.spot.kind === 'desk' || a.spot.kind === 'drum' || a.spot.kind === 'console');
      const key = !a.moving && a.spot?.seatKey !== undefined && Math.abs(a.x - (a.spot.x + 0.5)) < 0.05 && Math.abs(a.y - (a.spot.y + 0.5)) < 0.05 ? a.spot.seatKey : a.x + a.y;
      list.push({
        key,
        draw: () => {
          const pose = this.poseOf(a, !!seated);
          const fr = a.moving ? Math.floor(a.dist * 5) % 4 : pose === 'play' || pose === 'sitplay' ? frameAt(a.role === 'drums' ? 5 : 3, a.phase) : frameAt(0.6, a.phase) % 7 === 0 ? 3 : 0;
          const sp = avatarSprite(a.look, { year: s.year, role: a.role, pose, dir: a.dir, frame: fr, carry: a.kind === 'rep', variant: a.variant });
          const [x, y] = this.screenOf(a.x, a.y);
          const lift = seated ? (a.spot!.kind === 'drum' || a.spot!.kind === 'console' ? 2 : 4) : 0;
          b.drawImage(shadow, Math.round(x - 7), Math.round(y - 3));
          const dx = Math.round(x - sp.ax);
          const dy = Math.round(y - sp.ay - lift);
          b.drawImage(sp.c, dx, dy);
          const hit: Hit = { x: dx + 5, y: dy + 2, w: sp.c.width - 10, h: sp.c.height - 2, key: key + 1000, agent: a };
          this.hits.push(hit);
          if (a.kind === 'rep' && a.actId) {
            const act = s.acts[a.actId];
            if (act) {
              const badge = getCanvas(`badge:${act.id}:${eraOf(act.formed)}`, () => badgePx(act.logoSeed, act.name, act.genre, act.formed).canvas());
              const bob = this.reduced ? 0 : Math.round(Math.sin(this.time * 2 + a.phase));
              const bx = Math.round(x - badge.width / 2);
              const by = Math.round(dy - badge.height + 1 + bob);
              b.drawImage(badge, bx, by);
              this.hits.push({ x: bx, y: by, w: badge.width, h: badge.height, key: key + 2000, agent: a, actId: act.id });
            }
          }
          if (this.overlay && a.actId && (a.kind === 'rep' || (a.kind === 'member' && this.firstMember(s, a)))) {
            const bk = this.bubbles.get(a.actId);
            if (bk) {
              const bc = getCanvas(`bubble:${bk}:${sc.era}`, () => bubblePx(bk, pal).canvas());
              const bob = this.reduced || bk !== 'attention' ? 0 : frameAt(2, a.phase) % 2;
              const top = a.kind === 'rep' ? dy - 14 : dy - 2;
              const bx = Math.round(x + 5);
              const by = Math.round(top - bc.height + 2 - bob);
              b.drawImage(bc, bx, by);
              this.hits.push({ x: bx, y: by, w: bc.width, h: bc.height, key: key + 2500, agent: a, actId: a.actId });
            }
          }
          if (this.hover?.agent === a) {
            b.fillStyle = cssCol(pal.glow);
            const mx = Math.round(x);
            const my = dy - (a.kind === 'rep' ? 12 : 2);
            b.fillRect(mx - 2, my - 3, 5, 1);
            b.fillRect(mx - 1, my - 2, 3, 1);
            b.fillRect(mx, my - 1, 1, 1);
          }
        },
      });
    }
    list.sort((p, q) => p.key - q.key);
    for (const d of list) d.draw();
    if (this.overlay) this.drawTags(b, sc);
    this.blitOut(bw, bh, z);
  }

  /** Etiquetas em pixel art no centro de cada sala (mesma fonte 3×5 da placa da entrada). */
  private drawTags(b: CanvasRenderingContext2D, sc: Scene): void {
    for (const tg of this.tags) {
      const room = sc.rooms.find((r) => r.kind === tg.room);
      if (!room) continue;
      const gx = (room.x + room.w / 2) * 16;
      const gy = (room.y + room.h / 2) * 16;
      const x = this.X0 + gx - gy;
      const y = this.Y0 + (gx + gy) / 2;
      const cv = getCanvas(`tag:${tg.text}:${tg.tone}:${sc.era}`, () => tagPx(tg.text, tg.tone, sc.pal).canvas());
      const tx = Math.round(x - cv.width / 2);
      const ty = Math.round(y - 30);
      b.drawImage(cv, tx, ty);
      this.hits.push({ x: tx, y: ty, w: cv.width, h: cv.height, key: 500, label: t(ROOM_NAMES[tg.room]), sub: tg.text, room: tg.room });
    }
  }

  private firstMember(s: GameState, a: Agent): boolean {
    const act = a.actId ? s.acts[a.actId] : undefined;
    return !!act && act.members.find((id) => s.persons[id]?.alive) === a.personId;
  }

  private poseOf(a: Agent, seated: boolean): Pose {
    if (a.moving) return 'walk';
    const sp = a.spot;
    if (!sp || !seated) {
      if (sp && sp.kind === 'play') return 'play';
      return 'stand';
    }
    if (sp.kind === 'drum') return 'sitplay';
    if (sp.kind === 'console') return a.role === 'producer' || a.staffRole === 'producer' || a.staffRole === 'engineer' ? 'sitplay' : 'sit';
    return 'sit';
  }

  private blitOut(bw: number, bh: number, z: number): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bb, 0, 0, bw, bh, 0, 0, bw * z, bh * z);
  }

  // ---------- entrada ----------

  private toWorld(clientX: number, clientY: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    const z = this.zoom || 2;
    const mx = ((clientX - r.left) / r.width) * this.cssW;
    const my = ((clientY - r.top) / r.height) * this.cssH;
    const bw = Math.ceil(this.cssW / z);
    const bh = Math.ceil(this.cssH / z);
    return [mx / z - Math.round(bw / 2 - this.camX), my / z - Math.round(bh / 2 - this.camY)];
  }

  private hitAt(wx: number, wy: number): Hit | null {
    let best: Hit | null = null;
    for (const hh of this.hits) if (wx >= hh.x && wy >= hh.y && wx < hh.x + hh.w && wy < hh.y + hh.h && (!best || hh.key > best.key)) best = hh;
    return best;
  }

  private bindInput(): void {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      this.drag = { x: e.clientX, y: e.clientY, cx: this.camX, cy: this.camY, moved: false, id: e.pointerId };
    });
    cv.addEventListener('pointermove', (e) => {
      if (this.drag && this.drag.id === e.pointerId) {
        const z = this.zoom || 2;
        const dx = e.clientX - this.drag.x;
        const dy = e.clientY - this.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) this.drag.moved = true;
        if (this.drag.moved) {
          this.camX = this.drag.cx - dx / z;
          this.camY = this.drag.cy - dy / z;
          this.userCam = true;
          this.clampCam();
          this.dirty = true;
          this.hideTip();
          return;
        }
      }
      this.onHover(e.clientX, e.clientY);
    });
    const end = (e: PointerEvent) => {
      const d = this.drag;
      this.drag = null;
      if (!d || d.moved) return;
      const [wx, wy] = this.toWorld(e.clientX, e.clientY);
      const hit = this.hitAt(wx, wy);
      if ((!hit || (!hit.agent && !hit.actId)) && hqHooks.onRoom) {
        const room = hit?.room ?? this.roomKindAt(wx, wy);
        if (room && CLICK_ROOMS.includes(room)) { hqHooks.onRoom(room); return; }
      }
      this.activate(hit);
      if (e.pointerType !== 'mouse') this.onHover(e.clientX, e.clientY);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', () => { this.drag = null; });
    cv.addEventListener('pointerleave', () => { if (!this.drag) { this.hover = null; this.hideTip(); this.dirty = true; } });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomBy(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
    }, { passive: false });
    cv.addEventListener('keydown', (e) => {
      const z = this.zoom || 2;
      const step = 24 / z + 8;
      if (e.key === 'ArrowLeft') this.pan(-step, 0);
      else if (e.key === 'ArrowRight') this.pan(step, 0);
      else if (e.key === 'ArrowUp') this.pan(0, -step);
      else if (e.key === 'ArrowDown') this.pan(0, step);
      else if (e.key === '+' || e.key === '=') this.zoomBy(1);
      else if (e.key === '-' || e.key === '_') this.zoomBy(-1);
      else if (e.key === 'Home') this.resetCam();
      else return;
      e.preventDefault();
    });
  }

  private activate(hit: Hit | null): void {
    if (!hit) return;
    if (hit.actId) return this.onSelect(hit.actId);
    const a = hit.agent;
    if (!a) return;
    if (a.kind === 'rep' && a.actId) this.onSelect(a.actId);
    else if (a.kind === 'member' && a.personId) this.onSelectPerson(a.personId);
    else if (a.kind === 'staff' && a.staffId) this.onSelectStaff?.(a.staffId);
  }

  private pan(dx: number, dy: number): void {
    this.camX += dx;
    this.camY += dy;
    this.userCam = true;
    this.clampCam();
    this.dirty = true;
  }

  private clampCam(): void {
    if (!this.staticCanvas) return;
    this.camX = Math.max(0, Math.min(this.staticCanvas.width, this.camX));
    this.camY = Math.max(0, Math.min(this.staticCanvas.height, this.camY));
  }

  zoomBy(delta: number, clientX?: number, clientY?: number): void {
    const old = this.zoom || 2;
    const nz = Math.max(1, Math.min(6, old + delta));
    if (nz === old) return;
    if (clientX !== undefined && clientY !== undefined) {
      const [wx, wy] = this.toWorld(clientX, clientY);
      // mantém o ponto sob o cursor
      this.camX = wx + (this.camX - wx) * (old / nz);
      this.camY = wy + (this.camY - wy) * (old / nz);
    }
    this.zoom = nz;
    this.userCam = true;
    this.clampCam();
    this.dirty = true;
    this.updateZoomLabel();
  }

  private onHover(clientX: number, clientY: number): void {
    const [wx, wy] = this.toWorld(clientX, clientY);
    const hit = this.hitAt(wx, wy);
    const prev = this.hover;
    this.hover = hit;
    if (prev?.agent !== hit?.agent || prev?.label !== hit?.label) this.dirty = true;
    const clickRoom = !!hqHooks.onRoom && (!!hit?.room || (!hit?.agent && CLICK_ROOMS.includes(this.roomKindAt(wx, wy) as RoomKind)));
    this.canvas.style.cursor = hit?.agent || hit?.actId || clickRoom ? 'pointer' : this.drag ? 'grabbing' : 'grab';
    if (hit) this.showTip(hit, clientX, clientY);
    else {
      const room = this.roomUnder(wx, wy);
      if (room) this.showTipText(room[0], room[1], clientX, clientY);
      else this.hideTip();
    }
  }

  private roomKindAt(wx: number, wy: number): RoomKind | null {
    const sc = this.scene;
    if (!sc) return null;
    const X = wx - this.X0;
    const Y = wy - this.Y0;
    return roomAt(sc, Math.floor((Y + X / 2) / 16), Math.floor((Y - X / 2) / 16))?.kind ?? null;
  }

  private roomUnder(wx: number, wy: number): [string, string] | null {
    const sc = this.scene;
    const s = this.getState();
    if (!sc || !s) return null;
    const X = wx - this.X0;
    const Y = wy - this.Y0;
    const gx = Y + X / 2;
    const gy = Y - X / 2;
    const r = roomAt(sc, Math.floor(gx / 16), Math.floor(gy / 16));
    if (!r) return null;
    let sub = '';
    if (r.kind === 'trophy' || (sc.level === 0 && r.kind === 'rehearsal')) {
      const st = s.player.stats;
      sub = t(l(`Discos de ouro ${st.gold} · platina ${st.platinum} · prêmios ${st.awards}`, `Gold discs ${st.gold} · platinum ${st.platinum} · awards ${st.awards}`));
    }
    return [t(ROOM_NAMES[r.kind]), sub];
  }

  private showTip(hit: Hit, clientX: number, clientY: number): void {
    const a = hit.agent;
    if (!a) return this.showTipText(hit.label ?? '', hit.sub ?? '', clientX, clientY);
    const s = this.getState();
    let title = a.name;
    let sub = t(a.activity.label);
    if (a.kind === 'rep' && a.personId && s) title = `${a.name} — ${s.persons[a.personId]?.name ?? ''}`;
    if (a.kind === 'staff') sub = t(STAFF_ROLES.find((r) => r.id === a.staffRole)?.name) || sub;
    const hint = a.kind === 'staff' ? '' : t(a.kind === 'rep' ? (hqHooks.onAct ? l('Clique para ver a próxima decisão', 'Click to see the next decision') : l('Clique para abrir a ficha da banda', 'Click to open the band record')) : l('Clique para abrir a ficha', 'Click to open the record'));
    const rows: Node[] = [h('b', null, title), h('div', { class: 'hq-tip-row' }, icon(a.kind === 'staff' ? 'contract' : a.activity.icon, 1), ' ', sub)];
    if (a.actId && s && hqHooks.tip) for (const line of hqHooks.tip(s, a.actId)) rows.push(h('div', { class: 'hq-tip-row' }, line));
    if (hint) rows.push(h('div', { class: 'hq-tip-hint' }, hint));
    this.tip.replaceChildren(...rows);
    this.placeTip(clientX, clientY);
  }

  private showTipText(title: string, sub: string, clientX: number, clientY: number): void {
    if (!title) return this.hideTip();
    const rows: Node[] = [h('b', null, title)];
    if (sub) rows.push(h('div', { class: 'hq-tip-row' }, sub));
    if (hqHooks.onRoom && CLICK_ROOMS.some((k) => t(ROOM_NAMES[k]) === title)) rows.push(h('div', { class: 'hq-tip-hint' }, t(l('Clique para abrir', 'Click to open'))));
    this.tip.replaceChildren(...rows);
    this.placeTip(clientX, clientY);
  }

  private placeTip(clientX: number, clientY: number): void {
    const r = this.stage.getBoundingClientRect();
    this.tip.hidden = false;
    const x = clientX - r.left + 14;
    const y = clientY - r.top + 14;
    const maxX = r.width - this.tip.offsetWidth - 4;
    this.tip.style.left = `${Math.max(4, Math.min(maxX, x))}px`;
    this.tip.style.top = `${Math.min(r.height - this.tip.offsetHeight - 4, y)}px`;
  }

  private hideTip(): void {
    this.tip.hidden = true;
  }

  // ---------- barra acima do canvas ----------

  private zoomLabel: HTMLSpanElement | null = null;

  private updateZoomLabel(): void {
    if (this.zoomLabel) this.zoomLabel.textContent = `${this.zoom || 2}×`;
  }

  refreshToolbar(): void {
    const s = this.getState();
    if (!s) return;
    const acts = siteActs(s, this.site).map((id) => s.acts[id]);
    const lang = getLang();
    const branch = s.branches.find((b) => b.id === this.site);
    const siteName = branch ? `${t(BRANCH_LEVELS[branch.level].name)} · ${t(cityById[branch.city]?.name)}` : t(HQ_LEVELS[s.player.hq].name);
    const chip = (on: boolean, label: (Node | string)[], onclick: () => void, title?: string) =>
      h('button', { class: `hq-chip ${on ? 'on' : ''}`, 'aria-pressed': on ? 'true' : 'false', title: title ?? '', onclick }, ...label);
    const modes = h('div', { class: 'hq-modes', role: 'group', 'aria-label': t(l('Quem mostrar na sede', 'Who to show at HQ')) },
      chip(this.mode === 'overview', [icon('fans', 1), ' ', t(l('Visão geral · logos', 'Overview · logos'))], () => this.setMode('overview')),
      ...acts.map((a) => {
        const act = actActivity(s, a);
        const img = h('img', { class: 'px', src: logoUrl(a.logoSeed, a.name, a.genre, a.formed, 32), width: 18, height: 18, alt: '' });
        return chip(this.mode === a.id, [img, ' ', a.name, ' ', icon(act.icon, 1, t(act.label))], () => this.setMode(a.id), t(act.label));
      }),
    );
    const zoomLabel = h('span', { class: 'hq-zoom-val' }, `${this.zoom || 2}×`);
    this.zoomLabel = zoomLabel;
    const zoom = h('div', { class: 'hq-zoom' },
      h('button', { class: 'hq-chip', title: t(l('Afastar (−)', 'Zoom out (−)')), 'aria-label': t(l('Afastar', 'Zoom out')), onclick: () => this.zoomBy(-1) }, '−'),
      zoomLabel,
      h('button', { class: 'hq-chip', title: t(l('Aproximar (+)', 'Zoom in (+)')), 'aria-label': t(l('Aproximar', 'Zoom in')), onclick: () => this.zoomBy(1) }, '+'),
      h('button', { class: 'hq-chip', title: t(l('Centralizar (Home)', 'Recenter (Home)')), 'aria-label': t(l('Centralizar', 'Recenter')), onclick: () => this.resetCam() }, icon('house', 1)),
      hqHooks.bubble ? h('button', { class: `hq-chip ${this.overlay ? 'on' : ''}`, 'aria-pressed': this.overlay ? 'true' : 'false', title: t(l('Balões de estado e etiquetas das salas', 'Status bubbles and room tags')), onclick: () => { this.overlay = !this.overlay; this.dirty = true; this.refreshToolbar(); } }, icon('warning', 1), ' ', t(l('Estado', 'Status'))) : null,
    );
    let status: HTMLElement | null = null;
    if (this.mode !== 'overview' && s.acts[this.mode]) {
      const act = actActivity(s, s.acts[this.mode]);
      status = h('div', { class: 'hq-status' }, icon(act.icon, 1), ' ', t(act.label), !isPresent(act) ? h('span', { class: 'muted' }, ' · ', t(l('ninguém da banda está na sede agora', 'nobody from the band is at HQ right now'))) : null);
    } else {
      const counts = new Map<string, { n: number; label: L; icon: Activity['icon'] }>();
      for (const a of acts) {
        const act = actActivity(s, a);
        const c = counts.get(act.kind) ?? { n: 0, label: act.label, icon: act.icon };
        c.n++;
        counts.set(act.kind, c);
      }
      status = h('div', { class: 'hq-status' }, ...[...counts.values()].map((c) => h('span', { class: 'hq-count', title: t(c.label) }, icon(c.icon, 1, t(c.label)), `${c.n}`)),
        h('span', { class: 'muted' }, ` ${siteName} · ${s.year}`));
    }
    const sites = s.branches.length ? h('div', { class: 'hq-modes', role: 'group', 'aria-label': t(l('Sede mostrada', 'HQ shown')) },
      chip(this.site === 'main', [icon('house', 1), ' ', t(l('Matriz', 'Main HQ')), ` · ${t(cityById[s.config.homeCity]?.name)}`], () => this.setSite('main')),
      ...s.branches.map((b) => chip(this.site === b.id, [icon('building', 1), ' ', t(cityById[b.city]?.name)], () => this.setSite(b.id), t(BRANCH_LEVELS[b.level].name)))) : null;
    this.toolbar.replaceChildren(...[sites, h('div', { class: 'hq-bar' }, modes, zoom), status].filter((x): x is HTMLElement => !!x));
    this.canvas.setAttribute('aria-label', lang === 'pt' ? `Sede isométrica: ${siteName}` : `Isometric HQ: ${siteName}`);
  }
}

// ---------- utilidades ----------

/** Atos que trabalham numa sede: a matriz fica com quem não foi designado a uma filial. */
function siteActs(s: GameState, site: string): string[] {
  const all = playerActs(s);
  if (site === 'main') return all.filter((id) => !s.branchOf?.[id] || !s.branches.some((b) => b.id === s.branchOf[id]));
  return all.filter((id) => s.branchOf?.[id] === site);
}

const canvasCache = new Map<string, HTMLCanvasElement>();
function getCanvas(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = canvasCache.get(key);
  if (!c) {
    c = make();
    canvasCache.set(key, c);
  }
  return c;
}

/** Salas que abrem algo ao clicar. */
const CLICK_ROOMS: RoomKind[] = ['booth', 'control', 'rehearsal', 'writing', 'lounge', 'office', 'trophy', 'meeting'];

// glifos 5×5 dos balões (mesma escala da fonte 3×5 da sede)
const GLYPH: Record<BubbleKind, string> = {
  record: '.###.|#####|#####|#####|.###.',
  write: '...##|..##.|.##..|##...|#....',
  rehearse: '..##.|..#.#|..#..|###..|##...',
  rest: '####.|..#..|.#...|####.|.....',
  idle: '.....|.....|#.#.#|.....|.....',
  attention: '..#..|..#..|..#..|.....|..#..',
};

/** Balão de estado: papel e contorno da paleta da era, glifo colorido; atenção usa fundo dourado. */
function bubblePx(kind: BubbleKind, pal: { paper: number; outline: number; gold: number; accent: number }): Px {
  const p = new Px(11, 12);
  const bg = kind === 'attention' ? pal.gold : pal.paper;
  p.rect(1, 1, 9, 8, bg);
  p.rect(2, 0, 7, 1, bg);
  p.rect(4, 9, 3, 1, bg);
  p.put(5, 10, bg);
  const col = kind === 'record' ? C('#d83a32') : kind === 'attention' ? C('#9c2c2c') : kind === 'write' ? C('#3a5a9c') : kind === 'rest' ? C('#5c6c9c') : kind === 'rehearse' ? pal.accent : C('#7a7672');
  GLYPH[kind].split('|').forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') p.put(3 + i, 2 + j, col); }));
  p.outline(pal.outline);
  return p;
}

/** Etiqueta de sala (texto curto na fonte da placa). */
function tagPx(text: string, tone: RoomTag['tone'], pal: { paper: number; outline: number }): Px {
  const txt = fitText(text, 60);
  const w = Math.max(10, txt.length * 4 + 5);
  const p = new Px(w + 2, 10);
  const bg = tone === 'good' ? C('#3c8a4c') : tone === 'warn' ? C('#c08a1c') : tone === 'bad' ? C('#b0342c') : C('#3a4a6c');
  p.rect(1, 1, w, 7, bg);
  drawText(p, txt, 3, 2, pal.paper);
  p.outline(pal.outline);
  return p;
}

function cssCol(c: number): string {
  return `rgb(${c & 255},${(c >>> 8) & 255},${(c >>> 16) & 255})`;
}
