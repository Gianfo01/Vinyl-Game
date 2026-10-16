// Masters 31 — fila única de atenção. W0-AT: contrato da fila; pendências contam uma vez só.
// UNI-1 (31.1): a fila é a FONTE — `notify`, mensagens da caixa (addMsg/pushInbox18) e cenas viram itens; um orçamento
// só (substitui NOTIFY19/budget19, o orçamento por categoria do notify19 e o de atenção do story28); boletim da semana e
// álbum de cenas são vistas; a caixa de entrada lista pela fila.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { l } from '../src/data/world';
import {
  ATTN, ATTN_BUDGET, ATTN_CAP, attn, attnQueue, attnSeq, bulletinOf, foldedSince, notes, onAttnPush, pendingCount, pushAttn, quietScene, resolveAttn,
  sceneAlbum, type AttnItem,
} from '../src/sim/attention';
import { notify } from '../src/sim/util';
import { pushInbox18 } from '../src/sim/inbox18';
import { queueCutscene } from '../src/sim/ext4';
import { answerMsg, inboxItems, markRead, unreadCount } from '../src/sim/sys/people/inbox';
import { addMsg, P } from '../src/sim/sys/people/state';
import { playMonth } from '../src/sim/playbot16';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';

const game = () => createGame(defaultConfig('r31attn', { startYear: 1975 }));
const fullMonth = (s: GameState) => { attn(s).bm = s.year * 12 + s.month; attn(s).bn = 0; };

describe('r31 W0-AT · fila única de avisos', () => {
  it('o item tem os campos do contrato', () => {
    const s = game();
    const it0: AttnItem = pushAttn(s, { cat: 'money', prio: 2, title: l('A', 'A'), body: l('b', 'b'), from: 'r31', pendId: 'p1', dest: { area: 'finance', tab: 'loans', id: 'x' } });
    expect(it0.id).toMatch(/^a\d+$/);
    expect(it0.at).toBe(s.week);
    expect(it0.seen).toBe(false);
    expect(attnQueue(s).some((x) => x.id === it0.id)).toBe(true);
  });

  it('notify grava só na fila (s.notifications deixou de existir)', () => {
    const s = game();
    const q0 = attnSeq(s);
    notify(s, l('Aviso r31', 'r31 notice'), 'bad');
    expect('notifications' in s).toBe(false);
    expect(attnSeq(s)).toBe(q0 + 1);
    expect(attn(s).q[attn(s).q.length - 1]).toMatchObject({ cat: 'bad', prio: 2, tone: 'bad' });
    expect(notes(s, { after: q0 }).map((n) => n.text.pt)).toEqual(['Aviso r31']);
    notify(s, l('Pendência r31', 'r31 pending'), 'info', { cat: 'deadline', prio: 3, pendId: 'r31:dl', dest: { area: 'calendar19' } });
    expect(attnQueue(s)[0].pendId).toBe('r31:dl');
  });

  it('pendingCount conta pendências únicas por pendId, sem duplicar', () => {
    const s = game();
    const p0 = pendingCount(s);
    pushAttn(s, { cat: 'decision', prio: 2, title: l('X', 'X'), pendId: 'dup' });
    pushAttn(s, { cat: 'people', prio: 1, title: l('X de novo', 'X again'), pendId: 'dup' });
    pushAttn(s, { cat: 'decision', prio: 1, title: l('Y', 'Y'), pendId: 'other' });
    pushAttn(s, { cat: 'info', prio: 0, title: l('Z', 'Z') });
    expect(pendingCount(s)).toBe(p0 + 2);
    expect(attn(s).q.filter((x) => x.pendId === 'dup').length).toBe(1); // o novo atualiza o antigo
    expect(attn(s).q.find((x) => x.pendId === 'dup')!.prio).toBe(2); // a prioridade não cai
    expect(resolveAttn(s, 'dup')).toBe(1);
    expect(pendingCount(s)).toBe(p0 + 1);
  });

  it('orçamento único do mês e teto da fila', () => {
    const s = game();
    fullMonth(s);
    for (let i = 0; i < ATTN_BUDGET + 5; i++) pushAttn(s, { cat: 'info', prio: 0, title: l(`r${i}`, `r${i}`) });
    pushAttn(s, { cat: 'bad', prio: 2, title: l('grave', 'serious') });
    const mine = attn(s).q.filter((x) => /^r\d+$/.test(x.title.pt));
    expect(mine.filter((x) => x.fold).length).toBe(5);
    expect(attn(s).q.find((x) => x.title.pt === 'grave')!.fold).toBeUndefined();
    for (let i = 0; i < ATTN_CAP * 2; i++) pushAttn(s, { cat: 'info', prio: 0, title: l('x', 'x') });
    expect(attn(s).q.length).toBeLessThanOrEqual(ATTN_CAP);
    expect(attn(s).q.some((x) => x.title.pt === 'grave')).toBe(true); // importante sai por último
  });
});

describe('r31 UNI-1 · uma fila, um orçamento, uma caixa', () => {
  it('avisos e mensagens dividem o MESMO orçamento; o excedente e a rotina viram o boletim da semana', () => {
    const s = game();
    fullMonth(s);
    for (let i = 0; i < ATTN.notes - 1; i++) notify(s, l(`n${i}`, `n${i}`), 'info');
    const a = pushInbox18(s, 'zz31', { from: 'x', subject: l('carta', 'letter'), body: l('1', '1') }); // último lugar do mês
    const b = pushInbox18(s, 'zz31', { from: 'x', subject: l('carta 2', 'letter 2'), body: l('2', '2') });
    notify(s, l('depois do teto', 'over the cap'), 'good');
    notify(s, l('A banda gravou 3 faixa(s).', 'The band recorded 3 track(s).'), 'info'); // rotina
    expect(P(s).inbox).toContain(a);
    expect(P(s).inbox.some((m) => m.id === b.id)).toBe(false);
    const bul = bulletinOf(s, s.week).map((x) => x.title.pt);
    expect(bul).toEqual(expect.arrayContaining(['carta 2', 'depois do teto', 'A banda gravou 3 faixa(s).']));
    const head = inboxItems(s).find((it) => it.msg?.ref?.k18 === 'bulletin19' && it.msg.ref.bw === s.week)!;
    expect(head).toBeTruthy();
    expect(head.body.pt).toContain('carta 2');
    expect(foldedSince(s, s.week).length).toBe(bul.length);
  });

  it('o que pede resposta, o ruim e o urgente nunca vão para o boletim', () => {
    const s = game();
    fullMonth(s);
    attn(s).bn = 999;
    const ask = pushInbox18(s, 'zz31', { from: 'x', subject: l('pergunta', 'question'), body: l('?', '?'), actions: [{ id: 'y', label: l('Sim', 'Yes') }] });
    const bad = pushInbox18(s, 'zz31', { from: 'x', subject: l('ruim', 'bad'), body: l('!', '!'), tone: 'bad' });
    notify(s, l('alerta', 'alert'), 'bad');
    expect(P(s).inbox).toContain(ask);
    expect(P(s).inbox).toContain(bad);
    expect(notes(s).find((n) => n.text.pt === 'alerta')!.fold).toBeUndefined();
    expect(attn(s).q.find((x) => x.msg === ask.id)).toMatchObject({ pendId: `msg:${ask.id}` });
  });

  it('a caixa lista pela fila: mensagem respondida resolve a pendência; ler marca visto', () => {
    const s = game();
    const p0 = pendingCount(s);
    const m = addMsg(s, { from: 'Fulano', kind: 'request', subject: l('Pedido', 'Request'), body: l('b', 'b'), ref: { person: 'x', amount: 1 }, actions: [{ id: 'no', label: l('Não', 'No') }] });
    notify(s, l('nota r31', 'r31 note'), 'good');
    expect(pendingCount(s)).toBe(p0 + 1);
    const it = inboxItems(s);
    expect(it.some((x) => x.msg?.id === m.id)).toBe(true);
    const note = it.find((x) => x.source === 'notification' && x.body.pt === 'nota r31')!;
    expect(note.unread).toBe(true);
    const u0 = unreadCount(s);
    markRead(s, note.key);
    expect(inboxItems(s).find((x) => x.key === note.key)!.unread).toBe(false);
    expect(unreadCount(s)).toBe(u0 - 1);
    answerMsg(s, m.id, 'no');
    expect(pendingCount(s)).toBe(p0);
  });

  it('cenas viram itens; as que não interrompem vão para o álbum (vista da fila)', () => {
    const s = game();
    const cs = queueCutscene(s, 'moment16', { title: l('Cena r31', 'r31 scene') });
    const it = attn(s).q.find((x) => x.scene === cs.id)!;
    expect(it).toBeTruthy();
    expect(it.cat).toBe('scene');
    expect(inboxItems(s).some((x) => x.key === it.id)).toBe(false); // cena não é carta
    expect(sceneAlbum(s).some((c) => c.id === cs.id)).toBe(false);
    quietScene(s, cs);
    expect(sceneAlbum(s)[0].id).toBe(cs.id);
  });

  it('24 meses de playbot: nenhum aviso de prioridade alta se perde; os de baixo valor seguem agrupados; determinístico', () => {
    const run = (seed: string) => {
      const s = createGame(defaultConfig(seed, { startYear: 1975, realNames: true }));
      const high: AttnItem[] = [];
      const off = onAttnPush((g, x) => { if (g === s && x.prio >= 2 && x.cat !== 'scene') high.push(x); });
      let folded = 0, lostHigh = 0, foldedHigh = 0, visLowMax = 0;
      try {
        for (let m = 0; m < 24 && !s.ended; m++) {
          const w0 = s.week;
          playMonth(s, 'balanced');
          advanceMonth(s);
          const q = new Set(attn(s).q);
          for (const x of high) { if (!q.has(x)) lostHigh++; if (x.fold) foldedHigh++; }
          high.length = 0;
          const fresh = attn(s).q.filter((x) => x.at >= w0 && x.cat !== 'scene' && x.bw === undefined);
          folded += fresh.filter((x) => x.fold).length;
          visLowMax = Math.max(visLowMax, fresh.filter((x) => !x.fold && !x.pendId && x.prio < 2 && x.tone).length);
        }
      } finally { off(); }
      return { s, folded, lostHigh, foldedHigh, visLowMax, sig: JSON.stringify(attn(s).q.map((x) => [x.id, x.prio, x.fold ?? 0, x.title.pt])) };
    };
    const a = run('r16pb-10');
    expect(a.lostHigh).toBe(0);
    expect(a.foldedHigh).toBe(0);
    expect(a.folded).toBeGreaterThan(0); // baixo valor agrupado no boletim
    expect(a.visLowMax).toBeLessThanOrEqual(ATTN.notes * 2); // um mês de avanço cobre no máximo dois meses de orçamento
    expect(attn(a.s).q.some((x) => x.bw !== undefined)).toBe(true);
    const b = run('r16pb-10');
    expect(b.sig).toBe(a.sig);
  }, 600_000);
});
