// Rivais expandidos (GDD §16, §35 + pedido do criador): arquétipos com CEO, rivalidades pessoais
// longas, aliciamento (poaching) do elenco, espionagem e contraespionagem, aquisições entre rivais
// e o relatório mensal explicável "o que meus rivais fizeram".

import { clamp, type Rng } from '../core/rng';
import { l, type L } from '../data/world';
import { endContract, signWithRival } from './contracts';
import { personName } from './people';
import { emitEvent, registerEvents, type EventDef } from './events';
import type { GameState, Label, Release } from './types';
import type { RivalReportItem } from './xtypes';
import { fmtL, money, playerActs, post, remember } from './util';

export const ARCHETYPES: Record<NonNullable<Label['archetype']>, { name: L; desc: L }> = {
  empire: { name: l('Império', 'Empire'), desc: l('Compra estrelas e concorrentes; evita risco artístico.', 'Buys stars and competitors; avoids artistic risk.') },
  scene_hunter: { name: l('Caçador de cenas', 'Scene hunter'), desc: l('Descobre cedo, paga pouco, perde talentos para os grandes.', 'Finds talent early, pays little, loses acts to majors.') },
  hitmaker: { name: l('Fábrica de hits', 'Hit factory'), desc: l('Compositores profissionais, campanhas fortes, contratos duros.', 'Pro songwriters, big campaigns, tough contracts.') },
  catalog: { name: l('Guardião de catálogo', 'Catalog keeper'), desc: l('Compra masters de quem está em crise.', 'Buys masters from labels in distress.') },
  boutique: { name: l('Boutique', 'Boutique'), desc: l('Pequena, respeitada pela crítica, fiel a um nicho.', 'Small, critic-darling, loyal to a niche.') },
};

export function archetypeOf(lb: Label): NonNullable<Label['archetype']> {
  if (lb.archetype) return lb.archetype;
  lb.archetype = lb.family === 'A' ? 'empire' : lb.family === 'B' ? 'scene_hunter' : lb.family === 'C' ? 'hitmaker' : 'catalog';
  if (lb.family === 'B' && lb.roster.length < 5) lb.archetype = 'boutique';
  return lb.archetype;
}

function report(items: RivalReportItem[], lb: Label, text: L): void {
  items.push({ labelId: lb.id, text });
}

const RIVAL_EVENTS: EventDef[] = [
  {
    id: 'poach_attempt', cat: 'contract', tone: 'bad', tags: [], cooldown: 6, forcedOnly: true,
    title: l('{labelName} quer {act}', '{labelName} wants {act}'),
    text: l('{labelName} ofereceu pagar a multa de saída de {act} e dobrar o adiantamento. O artista está balançado.', '{labelName} offered to pay {act}\'s exit fee and double their advance. The artist is tempted.'),
    options: [
      { id: 'match', label: l('Cobrir a oferta (bônus e royalty)', 'Match the offer (bonus and royalty)'), hint: l('Custa caro; mantém o artista.', 'Expensive; keeps the artist.'), apply: (s, _r, c) => { const a = s.acts[String(c.act)]; const k = a.contractId ? s.contracts[a.contractId] : undefined; post(s, `poachmatch:${a.id}`, -money(s, 4000 + a.fame * 300), 'advances', `Contraproposta ${a.name}`); if (k) k.royalty = Math.min(0.5, k.royalty + 0.03); a.trust = clamp(a.trust + 10, 0, 100); s.rivalries[String(c.label)] = (s.rivalries[String(c.label)] ?? 0) + 10; } },
      { id: 'sell', label: l('Vender o contrato', 'Sell the contract'), hint: l('Entra dinheiro; perde o ato.', 'Cash in; lose the act.'), apply: (s, r, c) => { const a = s.acts[String(c.act)]; const fee = money(s, 8000 + a.fame * a.fame * 30); post(s, `poachsell:${a.id}`, fee, 'asset_sales', `Venda do contrato de ${a.name}`); endContract(s, a, 'terminated'); const lb = s.labels[String(c.label)]; if (lb) { lb.cash -= fee; signWithRival(s, a, lb.id, r); } } },
      { id: 'hold', label: l('Segurar pelo contrato', 'Hold them to the contract'), hint: l('Grátis; confiança despenca.', 'Free; trust plummets.'), apply: (s, _r, c) => { const a = s.acts[String(c.act)]; a.trust = clamp(a.trust - 15, 0, 100); s.rivalries[String(c.label)] = (s.rivalries[String(c.label)] ?? 0) + 15; } },
    ],
  },
  {
    id: 'spy_caught', cat: 'business', tone: 'bad', tags: [], cooldown: 12, forcedOnly: true,
    title: l('Espião de {labelName}', 'A {labelName} spy'),
    text: l('Um estagiário passava datas de lançamento para {labelName}. Eles marcaram um disco para a mesma semana que o seu.', 'An intern was leaking release dates to {labelName}. They scheduled a record for the same week as yours.'),
    options: [
      { id: 'sue', label: l('Processar', 'Sue'), hint: l('Custos jurídicos; reputação institucional.', 'Legal costs; institutional reputation.'), apply: (s, _r, c) => { post(s, `spysue:${c.label}`, -money(s, 5000), 'legal', 'Ação por espionagem'); s.player.reputation.institutional = clamp(s.player.reputation.institutional + 3, 0, 100); s.rivalries[String(c.label)] = (s.rivalries[String(c.label)] ?? 0) + 20; } },
      { id: 'move', label: l('Mudar a data do lançamento', 'Move the release date'), apply: (s, _r, c) => { const pr = s.pendingReleases.find((x) => x.id === c.pending); if (pr) pr.week += 3; } },
      { id: 'quiet', label: l('Demitir em silêncio', 'Fire them quietly'), apply: () => {} },
    ],
  },
];
registerEvents(RIVAL_EVENTS);

/** Contraespionagem: segurança reduz vazamentos por 12 meses. */
export function buySecurity(s: GameState): L | null {
  const cost = money(s, 6000);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, 'security', -cost, 'admin', 'Segurança da informação');
  s.flags.securityUntil = s.week + 52;
  return null;
}

/** Espionar um rival: descobre a próxima jogada (e arrisca escândalo). */
export function spyOnRival(s: GameState, r: Rng, labelId: string): L {
  const lb = s.labels[labelId];
  if (!lb) return l('Inválido.', 'Invalid.');
  const cost = money(s, 4000);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `spy:${labelId}:${s.week}`, -cost, 'admin', 'Informação de mercado');
  if (r.chance(0.2)) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 8, 0, 100);
    s.rivalries[labelId] = (s.rivalries[labelId] ?? 0) + 25;
    remember(s, 'spy_exposed', fmtL(l('{c} é flagrada espionando {b}.', '{c} is caught spying on {b}.'), { c: s.config.companyName, b: lb.name }), { important: true });
    return l('Flagrado! A imprensa noticiou a espionagem.', 'Caught! The press reported the espionage.');
  }
  const targets = Object.values(s.acts).filter((a) => !a.owner && a.fame > 6).sort((a, b) => b.fame - a.fame).slice(0, 3).map((a) => a.name);
  s.flags[`intel:${labelId}`] = s.week;
  return fmtL(l('{b}: caixa {c}, estratégia {st}, de olho em {t}.', '{b}: cash {c}, strategy {st}, eyeing {t}.'), { b: lb.name, c: String(Math.round(lb.cash / 100)), st: archetypeOf(lb), t: targets.join(', ') || '—' });
}

export function rivals2Month(s: GameState, r: Rng): void {
  const items: RivalReportItem[] = [];
  const mine = playerActs(s).map((id) => s.acts[id]);
  const recentByOwner = new Map<string, Release[]>();
  for (const x of Object.values(s.releases)) {
    if (s.week - x.week >= 5) continue;
    const list = recentByOwner.get(x.owner) ?? [];
    list.push(x);
    recentByOwner.set(x.owner, list);
  }
  for (const lb of Object.values(s.labels)) {
    if (!lb.active) continue;
    archetypeOf(lb);
    lb.ceo ??= personName(r, 'en');
    // decisões registradas pela IA base viram linhas do relatório
    const key = `lastDec:${lb.id}`;
    const dec = lb.lastDecision ? lb.lastDecision.pt : '';
    if (dec && s.flags[key] !== dec.length + lb.roster.length) {
      s.flags[key] = dec.length + lb.roster.length;
      report(items, lb, fmtL(l('{d}.', '{d}.'), { d: lb.lastDecision! }));
    }
    const rel = recentByOwner.get(lb.id) ?? [];
    if (rel.length) report(items, lb, fmtL(l('lançou {n} obra(s), destaque "{t}".', 'released {n} work(s), led by "{t}".'), { n: rel.length, t: rel[0].title }));
    // rivalidade pessoal decai devagar, mas nunca some sozinha
    if (s.rivalries[lb.id]) s.rivalries[lb.id] = Math.max(5, s.rivalries[lb.id] * 0.99);
    // aliciamento: artista do jogador nos últimos meses de contrato ou com confiança baixa
    const rivalry = s.rivalries[lb.id] ?? 0;
    const aggr = lb.aggression + rivalry / 200 + (archetypeOf(lb) === 'empire' ? 0.15 : 0);
    if (mine.length && lb.cash > money(s, 200000) && r.chance(0.01 + aggr * 0.02)) {
      const target = mine.filter((a) => !a.playerBand && a.fame > 20 && (a.trust < 45 || (a.contractId && s.contracts[a.contractId].endWeek - s.week < 26))).sort((a, b) => b.fame - a.fame)[0];
      if (target && !s.decisions.some((d) => d.eventId === 'poach_attempt')) {
        emitEvent(s, r, 'poach_attempt', { act: target.id, label: lb.id });
        report(items, lb, fmtL(l('tentou aliciar {a}.', 'tried to poach {a}.'), { a: target.name }));
      }
    }
    // espionagem: rival hostil cola um lançamento na semana do seu
    if (rivalry > 30 && s.pendingReleases.length && !(s.flags.securityUntil > s.week) && r.chance(0.04)) {
      const pr = s.pendingReleases[0];
      s.flags[`spied:${pr.id}`] = 1;
      emitEvent(s, r, 'spy_caught', { label: lb.id, pending: pr.id });
      report(items, lb, l('descobriu sua data de lançamento.', 'found out your release date.'));
    }
  }
  // falências entre rivais criam oportunidade de compra; aquisições entre eles já acontecem em rivals.ts
  s.rivalReport = { month: s.year * 12 + s.month, items: items.slice(0, 14) };
}

