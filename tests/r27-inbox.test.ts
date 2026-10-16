// r27 (INBOX): Caixa de entrada estilo e-mail / FM (src/ui/sys/mail27model.ts + inbox27.ts). Todo tipo de mensagem tem
// assunto, prévia e e-mail completo em PT e EN; as ações são as mesmas de antes (num lugar só); filtros e conversas
// funcionam; saves antigos (sem estrela/aberto) carregam; os marcadores de interface não mexem no sorteio.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { botMonth, defaultConfig } from '../src/sim/bot';
import { archive18, inboxKinds18, isStarred18, pushInbox18, seen18, star18 } from '../src/sim/inbox18';
import { items18 } from '../src/sim/sys/inbox18';
import { answerMsg, unreadCount } from '../src/sim/sys/people/inbox';
import { P, addMsg, type InboxMsg } from '../src/sim/sys/people/state';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { notify, playerActs } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import { migrate } from '../src/ui/store';
import {
  CAT27, FILTER0_27, actions27, letter27, letterText27, mail27, mailbox27, plain27, segment27, snippet27, snooze27, subject27, threadId27, threads27,
} from '../src/ui/sys/mail27model';
import '../src/sim/sys';
import { notes } from '../src/sim/attention';
import { attn, seeAttn } from '../src/sim/attention';

const fresh = (seed: string): GameState => createGame(defaultConfig(seed, { dbSize: 'small' } as Parameters<typeof defaultConfig>[1]));
const BAD = /undefined|\[object|NaN|\{[a-z]\w*\}/;

function checkText(x: string, what: string): void {
  expect(x.trim().length, what).toBeGreaterThan(0);
  expect(x, what).not.toMatch(BAD);
}
/** Cada item da caixa: assunto, prévia (≤ 1 linha) e o e-mail inteiro, nas duas línguas. */
function checkItem(s: GameState, key: string): void {
  const it = items18(s).find((x) => x.key === key) ?? items18(s, { archived: true }).find((x) => x.key === key);
  expect(it, key).toBeTruthy();
  const sj = subject27(it!), sn = snippet27(it!);
  const L = letter27(s, it!);
  for (const lg of ['pt', 'en'] as const) {
    checkText(sj[lg], `assunto ${lg} ${key}`);
    checkText(sn[lg], `prévia ${lg} ${key}`);
    expect(sn[lg]).not.toContain('\n');
    expect(sn[lg].length).toBeLessThanOrEqual(110);
    const full = letterText27(L, lg);
    checkText(full, `e-mail ${lg} ${key}`);
    checkText(L.greeting[lg], `saudação ${lg}`);
    checkText(L.signoff[lg], `despedida ${lg}`);
    checkText(L.from.role[lg], `assinatura ${lg}`);
    expect(L.paras.length).toBeGreaterThan(0);
    // o e-mail diz mais que a lista: cabeçalho + saudação + corpo + assinatura
    expect(full.length).toBeGreaterThan(sj[lg].length + sn[lg].length);
  }
}

describe('r27 (INBOX) — caixa estilo e-mail', () => {
  const s = fresh('r27-inbox-1');
  for (let i = 0; i < 3; i++) { botMonth(s); advanceMonth(s); }
  const mine = playerActs(s).map((id) => s.acts[id])[0] ?? Object.values(s.acts)[0];
  const npc = Object.values(s.acts).find((a) => a.owner !== 'player' && a.members.length)!;
  const person = s.persons[npc.members[0]];
  const label = Object.values(s.labels)[0];

  it('todo tipo registrado (registerInboxKind) e todo tipo base renderiza assunto, prévia e e-mail em PT e EN', () => {
    const kinds = inboxKinds18();
    expect(kinds.length).toBeGreaterThan(100);
    for (const k of kinds) {
      // direto na caixa (sem passar pelo boletim), com um ato, uma pessoa, um selo e dinheiro no texto; metade pede resposta
      const m = addMsg(s, {
        from: k.length % 2 ? person.name : label.name, kind: 'deal', tone: 'info',
        subject: l(`Assunto de ${k} sobre ${npc.name}`, `Subject of ${k} about ${npc.name}`),
        body: l(`${npc.name} e ${label.name} querem $1.200 agora. Segunda frase com detalhe. Terceira frase.`, `${npc.name} and ${label.name} want $1,200 now. Second sentence with detail. Third sentence.`),
        ref: { sys: 'k18', k18: k, act: npc.id, person: person.id, lb: label.id, city: npc.city },
        ...(k.length % 3 ? { actions: [{ id: 'a', label: l('Aceitar', 'Accept') }, { id: 'b', label: l('Recusar', 'Refuse') }], expires: s.week + 4 } : {}),
      });
      checkItem(s, m.id);
      P(s).inbox.splice(P(s).inbox.indexOf(m), 1); // a caixa guarda 60 (e descarta antes o que não pede resposta)
    }
    // tipos base das pessoas (pedido, reclamação, saúde, equipe, segredo, fã…) — sem ref de sistema
    for (const kind of ['request', 'complaint', 'promise', 'health', 'staff', 'owner', 'secret', 'info', 'fan', 'deal'] as InboxMsg['kind'][]) {
      const m = addMsg(s, { from: person.name, kind, subject: l('Precisamos conversar', 'We need to talk'), body: l(`${person.name} pede uma conversa.`, `${person.name} asks for a talk.`), ref: { person: person.id }, tone: 'bad' });
      checkItem(s, m.id);
      P(s).inbox.splice(P(s).inbox.indexOf(m), 1);
    }
    // ecos (fio de decisão), avisos do selo e decisões da mesa
    notify(s, l(`Caixa negativo: antecipamos $561 de recebíveis — ${mine?.name ?? 'x'} segue firme.`, `Negative cash: we advanced $561 — ${mine?.name ?? 'x'} holds on.`), 'bad');
    notify(s, l('Resumo do mês: 3 avisos agrupados — Um. · Dois. · Três.', 'Monthly summary: 3 grouped notices — One. · Two. · Three.'), 'info');
    for (const it of items18(s).filter((x) => x.source !== 'msg')) checkItem(s, it.key);
    // e tudo o que o jogo de verdade gerou em 3 meses
    for (const it of items18(s)) checkItem(s, it.key);
  });

  it('nomes viram links de entidade (data-ent/data-id) e o quadro traz valores, prazo e o padrão', () => {
    const m = pushInbox18(s, 'mb19_bid', { from: label.name, subject: l(`${label.name} quer o contrato de ${npc.name}`, `${label.name} wants ${npc.name}'s contract`), body: l(`Oferta: $9.086 pelo contrato de ${npc.name}.`, `Offer: $9,086 for ${npc.name}'s contract.`), actions: [{ id: 'sell', label: l('Vender', 'Sell') }, { id: 'keep', label: l('Segurar', 'Keep') }], ref: { act: npc.id, lb: label.id } });
    const it = items18(s).find((x) => x.key === m.id)!;
    const L = letter27(s, it);
    const segs = L.paras.flatMap((p) => p.s.pt);
    expect(segs.some((g) => typeof g !== 'string' && g.e === 'act' && g.id === npc.id)).toBe(true);
    expect(L.facts.map((f) => f.label.pt)).toEqual(expect.arrayContaining(['Artista', 'Selo', 'Valores', 'Prazo', 'Sem resposta']));
    expect(plain27(L.facts.find((f) => f.label.pt === 'Sem resposta')!.value.pt)).toBe('Segurar');
    expect(L.from.kind).toBe('label');
    // segmentação: palavra inteira, mais longo primeiro, sem sobreposição
    const sg = segment27('Ana e Ana Lima tocaram; Analia não.', [{ e: 'person', id: 'p:1', name: 'Ana' }, { e: 'person', id: 'p:2', name: 'Ana Lima' }]);
    expect(sg.filter((g) => typeof g !== 'string').map((g) => (g as { id: string }).id)).toEqual(['p:1', 'p:2']);
    expect(plain27(sg)).toBe('Ana e Ana Lima tocaram; Analia não.');
  });

  it('ações: as mesmas da mensagem/decisão, e responder passa pelo tratador do sistema (answerMsg)', () => {
    let got = '';
    const m = pushInbox18(s, 'disc18_demo', { from: npc.name, subject: l('Demo', 'Demo'), body: l('Uma fita.', 'A tape.'), actions: [{ id: 'listen', label: l('Ouvir', 'Listen') }, { id: 'more', label: l('Pedir mais', 'More') }, { id: 'pass', label: l('Passar', 'Pass') }], ref: { act: npc.id } });
    const it = items18(s).find((x) => x.key === m.id)!;
    const A = actions27(s, it);
    expect(A.map((a) => [a.kind, a.id])).toEqual([['reply', 'listen'], ['reply', 'more'], ['reply', 'pass']]);
    expect(A.find((a) => a.def)!.id).toBe('pass');
    got = answerMsg(s, m.id, 'pass').pt;
    expect(got).toMatch(/passou/);
    expect(actions27(s, items18(s).find((x) => x.key === m.id)!)).toEqual([]);
    expect(letter27(s, items18(s).find((x) => x.key === m.id)!).replied?.pt).toBe('Passar');
    const d = s.decisions[0];
    if (d) {
      const di = items18(s).find((x) => x.decisionId === d.id)!;
      expect(actions27(s, di).map((a) => a.id)).toEqual(d.options.map((o) => o.id));
      expect(actions27(s, di).find((a) => a.def)!.id).toBe(d.defaultOption);
    }
    // um lugar só: na interface, só inbox27.ts responde mensagens e decisões da caixa
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []; });
    const ui = walk(new URL('../src/ui', import.meta.url).pathname);
    expect(ui.filter((f) => /\banswerMsg\(/.test(readFileSync(f, 'utf8'))).map((f) => f.split('/src/ui/')[1])).toEqual(['sys/inbox27.ts']);
    const src = readFileSync(new URL('../src/ui/sys/inbox27.ts', import.meta.url), 'utf8');
    expect(src.match(/answerMsg\(/g)?.length).toBe(1);
    expect(src.match(/resolveDecision\(/g)?.length).toBe(1);
    expect(src).toMatch(/decLocked18\(s, d, o\)\) return;/); // o portão de opção travada continua valendo
  });

  it('conversas: mesmo negócio com o mesmo ato vira um fio; outro ato, outro fio; ecos seguem o fio da decisão', () => {
    const t = fresh('r27-inbox-2');
    const [a1, a2] = Object.values(t.acts).filter((a) => a.members.length).slice(0, 2);
    const mk = (k: string, act: string, extra: Record<string, string> = {}) => pushInbox18(t, k, { from: 'X', subject: l(`s ${k}`, `s ${k}`), body: l('b.', 'b.'), actions: [{ id: 'ok', label: l('Ok', 'Ok') }], ref: { act, ...extra } });
    const x1 = mk('disc18_demo', a1.id), x2 = mk('disc18_more', a1.id), x3 = mk('disc18_demo', a2.id);
    const e1 = mk('echo18', a1.id, { thr: 't9' }), e2 = mk('echo18', a2.id, { thr: 't9' });
    const ms = items18(t).filter((x) => [x1.id, x2.id, x3.id, e1.id, e2.id].includes(x.key)).map((it) => mail27(t, it));
    expect(threadId27(ms.find((m) => m.key === x1.id)!.it)).toBe(threadId27(ms.find((m) => m.key === x2.id)!.it));
    expect(threadId27(ms.find((m) => m.key === x1.id)!.it)).not.toBe(threadId27(ms.find((m) => m.key === x3.id)!.it));
    const th = threads27(ms);
    expect(th.length).toBe(3);
    const demo = th.find((x) => x.mails.some((m) => m.key === x1.id))!;
    expect(demo.n).toBe(2);
    expect(th.find((x) => x.id === 't:t9')!.n).toBe(2);
    // avisos do selo e decisões não se agrupam
    notify(t, l('Um aviso.', 'A notice.'), 'info');
    notify(t, l('Outro aviso.', 'Another notice.'), 'info');
    for (const it of items18(t).filter((x) => x.source !== 'msg')) expect(threadId27(it)).toBeNull();
  });

  it('filtros (categoria, não lidas, pedem resposta, estrela, busca, pasta) e ordem', () => {
    const t = fresh('r27-inbox-3');
    for (let i = 0; i < 2; i++) { botMonth(t); advanceMonth(t); }
    const a = Object.values(t.acts).find((x) => x.members.length)!;
    const m1 = pushInbox18(t, 'mb19_bid', { from: 'Selo Ômega', subject: l('Lance pelo contrato de Ávila', 'Bid for Ávila'), body: l('Oferta firme.', 'Firm offer.'), actions: [{ id: 'y', label: l('Sim', 'Yes') }, { id: 'n', label: l('Não', 'No') }], ref: { act: a.id } });
    const m2 = addMsg(t, { from: 'Analista', kind: 'deal', subject: l('Relatório', 'Report'), body: l('Números do mês.', 'Monthly numbers.'), ref: { sys: 'k18', k18: 'market18' } });
    const F = FILTER0_27();
    const all = mailbox27(t, F);
    expect(all.threads.length).toBeGreaterThan(2);
    // busca sem acento e sem caixa
    expect(mailbox27(t, { ...F, q: 'avila' }).threads.map((x) => x.head.key)).toEqual([m1.id]);
    // categoria
    const deals = mailbox27(t, { ...F, cats: ['deals'] });
    expect(deals.threads.every((x) => x.cat === 'deals')).toBe(true);
    expect(deals.threads.some((x) => x.head.key === m1.id)).toBe(true);
    expect(all.cats).toContain('deals');
    for (const c of all.cats) expect(CAT27[c].name.pt.length).toBeGreaterThan(0);
    // pedem resposta / não lidas
    expect(mailbox27(t, { ...F, reply: true }).threads.every((x) => x.reply)).toBe(true);
    P(t).inbox.find((x) => x.id === m2.id)!.read = true;
    expect(mailbox27(t, { ...F, unread: true }).threads.some((x) => x.head.key === m2.id)).toBe(false);
    // estrela
    star18(t, m2.id);
    expect(isStarred18(t, m2.id)).toBe(true);
    expect(mailbox27(t, { ...F, starred: true }).threads.map((x) => x.head.key)).toEqual([m2.id]);
    // arquivo e adiadas (pastas)
    archive18(t, m2.id);
    expect(mailbox27(t, F).threads.some((x) => x.mails.some((m) => m.key === m2.id))).toBe(false);
    expect(mailbox27(t, { ...F, box: 'archived' }).threads.some((x) => x.head.key === m2.id)).toBe(true);
    snooze27(t, m1.id, 4);
    expect(mailbox27(t, F).threads.some((x) => x.head.key === m1.id)).toBe(false);
    expect(mailbox27(t, { ...F, box: 'snoozed' }).threads.map((x) => x.head.key)).toContain(m1.id);
    snooze27(t, m1.id, 0);
    // ordem: por prioridade, o mais urgente primeiro; por data, o mais novo primeiro
    const byP = mailbox27(t, { ...F, sort: 'prio' }).threads;
    for (let i = 1; i < byP.length; i++) expect(byP[i - 1].prio).toBeGreaterThanOrEqual(byP[i].prio);
    const byD = mailbox27(t, F).threads;
    for (let i = 1; i < byD.length; i++) expect(byD[i - 1].week).toBeGreaterThanOrEqual(byD[i].week);
  });

  it('abrir um aviso/decisão marca como visto e baixa o contador (um contador só)', () => {
    const t = fresh('r27-inbox-4');
    botMonth(t); advanceMonth(t);
    notify(t, l('Alerta importante do mês.', 'Important alert this month.'), 'bad');
    const n0 = unreadCount(t);
    // r31 (UNI-1): o aviso é um item da fila única (chave = id do item); abrir marca o item como visto
    const it = items18(t).find((x) => x.source === 'notification' && x.unread && x.tone === 'bad')!;
    expect(it.key).toBe(attn(t).q.find((x) => x.title.pt === 'Alerta importante do mês.')!.id);
    seeAttn(t, it.key);
    expect(unreadCount(t)).toBe(n0 - 1);
    expect(items18(t).find((x) => x.key === it.key)!.unread).toBe(false);
  });

  it('saves antigos (sem estrela/aberto, ou sem o estado da caixa) carregam e funcionam', () => {
    const t = fresh('r27-inbox-5');
    botMonth(t); advanceMonth(t);
    const raw = JSON.parse(JSON.stringify(t)) as GameState & { x4: Record<string, unknown> };
    raw.x4.inbox18 = { arch: {}, snooze: {}, rep: -1 }; // formato r18
    const g = migrate(raw);
    expect(() => mailbox27(g, FILTER0_27())).not.toThrow();
    expect(unreadCount(g)).toBeGreaterThanOrEqual(0);
    const k = items18(g)[0]?.key;
    if (k) { star18(g, k); seen18(g, k); expect(isStarred18(g, k)).toBe(true); }
    const raw2 = JSON.parse(JSON.stringify(t)) as GameState & { x4: Record<string, unknown> };
    delete (raw2.x4 as Record<string, unknown>).inbox18; // sem nada
    const g2 = migrate(raw2);
    expect(mailbox27(g2, FILTER0_27()).total).toBe(mailbox27(t, FILTER0_27()).total);
  });

  it('estrela/aberto são só de interface: não mudam o sorteio', () => {
    const a = fresh('r27-inbox-6'), b = fresh('r27-inbox-6');
    botMonth(a); advanceMonth(a); botMonth(b); advanceMonth(b);
    for (const it of items18(b)) { star18(b, it.key); seen18(b, it.key); }
    botMonth(a); advanceMonth(a); botMonth(b); advanceMonth(b);
    expect(b.player.cash).toBe(a.player.cash);
    expect(notes(b).map((n) => n.text.pt)).toEqual(notes(a).map((n) => n.text.pt));
    expect(P(b).inbox.map((m) => m.id)).toEqual(P(a).inbox.map((m) => m.id));
  });
});
