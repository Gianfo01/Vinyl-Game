// Rodada 19 (Frente 8): calendário único de prazos, boletim semanal/orçamento de notificações, carta na fila e pulso explicado.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { simulatePlayer } from '../src/sim/playbot16';
import '../src/sim/sys';
import { calendar19, crunch19, deadlineProviders19, noteDeadline19, registerDeadline } from '../src/sim/calendar19';
import { explain18 } from '../src/sim/explain18';
import { pushInbox18 } from '../src/sim/inbox18';
import { follow18 } from '../src/sim/sys/echoes18';
import { Fx18 } from '../src/sim/decide18';
import { Rng } from '../src/core/rng';
import { answerMsg, inboxItems } from '../src/sim/sys/people/inbox';
import { P } from '../src/sim/sys/people/state';
import { l } from '../src/data/world';
import { playerActs } from '../src/sim/util';
import { ATTN, attn, bulletinOf } from '../src/sim/attention';

describe('r19 calendar19 + notify19', () => {
  // meio ano já enche o calendário; BALANCE_FULL=1 joga o ano inteiro (como antes)
  const YEARS = process.env.BALANCE_FULL ? 1 : 0.5;
  const { state: s } = simulatePlayer(defaultConfig('r19cal', { startYear: 1975 }), YEARS, 'balanced');

  it('todos os sistemas com data registram provedores e o calendário ordena e recorta a janela', () => {
    for (const id of ['decide18', 'inbox', 'contracts', 'artist18', 'release', 'live', 'campus18', 'court', 'loans', 'awards', 'note19']) expect(deadlineProviders19()).toContain(id);
    registerDeadline('t19', (st) => [{ id: 't19:a', w: st.week + 3, kind: 'other', t: l('A', 'A') }, { id: 't19:b', w: st.week + 1, kind: 'court', t: l('B', 'B'), tone: 'bad', act: true }, { id: 't19:far', w: st.week + 80, kind: 'other', t: l('C', 'C') }]);
    const xs = calendar19(s, { weeks: 6 });
    const a = xs.findIndex((d) => d.id === 't19:a'), b = xs.findIndex((d) => d.id === 't19:b');
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(a);
    expect(xs.some((d) => d.id === 't19:far')).toBe(false);
    for (let i = 1; i < xs.length; i++) expect(xs[i].w).toBeGreaterThanOrEqual(xs[i - 1].w);
    noteDeadline19(s, { id: 'n19', w: s.week + 1, kind: 'clause', t: l('X', 'X'), act: true });
    noteDeadline19(s, { id: 'n19b', w: s.week + 1, kind: 'clause', t: l('Y', 'Y'), act: true });
    expect(crunch19(s, 6, 3).some((c) => c.w === s.week + 1)).toBe(true);
    expect(explain18(s, 'cal19.week', { w: s.week + 1 })?.parts.length).toBeGreaterThanOrEqual(3);
    // o jogo real já gera prazos (lançamento, mensagem, eco, contrato, prêmio…)
    expect(calendar19(s, { weeks: 26 }).filter((d) => !d.id.startsWith('t19') && !d.id.startsWith('n19')).length).toBeGreaterThan(0);
  });

  // r31 (UNI-1): o boletim é uma vista da fila única (itens dobrados da semana + um item-cabeça que a caixa mostra como
  // carta) e o orçamento é o único da fila (antes: carta 'bulletin19' em P.inbox e cota por categoria no ib19).
  it('boletim semanal: relatórios e excedente do orçamento viram um item; o que pede resposta nunca', () => {
    const n0 = P(s).inbox.length;
    pushInbox18(s, 'review18', { from: 'x', subject: l('Pós', 'Post'), body: l('a', 'a') });
    pushInbox18(s, 'market18', { from: 'x', subject: l('Mercado', 'Market'), body: l('b', 'b') });
    const bul = inboxItems(s).filter((it) => it.msg?.ref?.k18 === 'bulletin19' && it.msg.ref.bw === s.week);
    expect(bul.length).toBe(1);
    expect(Number(bul[0].msg!.ref!.n)).toBeGreaterThanOrEqual(2);
    expect(bul[0].body.pt).toContain('Mercado');
    expect(bulletinOf(s, s.week).map((x) => x.k18)).toEqual(expect.arrayContaining(['review18', 'market18']));
    const asks = pushInbox18(s, 'review18', { from: 'x', subject: l('Q', 'Q'), body: l('?', '?'), actions: [{ id: 'y', label: l('Sim', 'Yes') }] });
    expect(P(s).inbox).toContain(asks);
    // orçamento único: com o mês quase cheio, o primeiro ainda entra sozinho e o segundo vai para o boletim
    attn(s).bm = s.year * 12 + s.month; attn(s).bn = ATTN.notes - 1;
    const a = pushInbox18(s, 'zz19_other', { from: 'x', subject: l('um', 'one'), body: l('1', '1') });
    const b = pushInbox18(s, 'zz19_other', { from: 'x', subject: l('dois', 'two'), body: l('2', '2') });
    expect(P(s).inbox).toContain(a);
    expect(P(s).inbox.some((m) => m.id === b.id)).toBe(false);
    expect(bulletinOf(s, s.week).some((x) => x.k18 === 'zz19_other' && x.title.pt === 'dois')).toBe(true);
    expect(P(s).inbox.length).toBeLessThanOrEqual(n0 + 2);
  });

  it('carta perdida (mesa cheia) vira mensagem com prazo no calendário; ao vencer vale o padrão', () => {
    const act = playerActs(s)[0];
    const keep = s.decisions.splice(0);
    for (let i = 0; i < 6; i++) s.decisions.push({ ...(keep[0] ?? { id: '', eventId: 'x', cat: 'band', title: l('d', 'd'), text: l('d', 'd'), options: [], ctx: {}, week: s.week, defaultOption: 'a' }), id: `dz${i}` } as never);
    const f = new Fx18(s, { act }, Rng.fromSeed('r19'));
    expect(follow18(f, 'boycott', { act })).toBe(true);
    const m = P(s).inbox.find((x) => x.ref?.k18 === 'follow19' && !x.resolved)!;
    expect(m).toBeTruthy();
    expect(calendar19(s).some((d) => d.id === `fol:${m.id}`)).toBe(true);
    const n = s.decisions.length;
    answerMsg(s, m.id, 'auto');
    expect(s.decisions.length).toBe(n); // emitido e resolvido na hora (padrão)
    expect(calendar19(s).some((d) => d.id === `fol:${m.id}`)).toBe(false);
    s.decisions.splice(0, s.decisions.length, ...keep);
  });

  it('pulso: ▲▼ têm explicação com o resultado do mês e cadeia de causas', () => {
    const w = explain18(s, 'pulse19', { k: 'cash' });
    expect(w).toBeTruthy();
    expect(w!.parts[0].why?.key).toBe('cash.month');
    expect(explain18(s, 'pulse19', { k: 'fans' })).toBeTruthy();
  });

  it('artista: no máximo 3 ofertas de selo abertas', async () => {
    const { a18 } = await import('../src/sim/sys/artist18');
    const { state: x } = simulatePlayer(defaultConfig('r19art', { startYear: 1965, role: 'artist' }), YEARS, 'balanced');
    const open = a18(x).offers.filter((o) => o.st === 'open' && o.until >= x.week && (o.k === 'record' || o.k === 'dist' || o.k === 'dev'));
    expect(open.length).toBeLessThanOrEqual(3);
  });
});
