// Ficha de direitos (rodada 8, §3.3): formulário na oferta, ficha "Direitos" de cada contrato e
// ações ligadas a ela (estender masters, comprar autorizações, responder a renegociações).

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { distributionFee } from '../sim/market';
import {
  EXPLOIT_NAME, MASTER_NAME, SCOPE_NAME, annualRevenue, artistPower, buyExploitPermission, defaultRights, extendMasters, extendPrice, hasExploit, marketsName,
  permissionPrice, releasesOfDeal, respondDemand, revertWeek, rightsOf, rst, splitPreview, type ExploitKind,
} from '../sim/rights';
import type { ContractModel } from '../data/rules';
import type { Contract, GameState, Offer, RightsTerms } from '../sim/types';
import { rngOf, yearOfWeek } from '../sim/util';
import { $, actLink, kv, pill, releaseLink, rerender, toast } from './common';
import { h, select } from './dom';

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
const say = (e: L | null, ok?: L) => { if (e) toast(t(e), 'bad'); else if (ok) toast(t(ok), 'good'); };
const KINDS: ExploitKind[] = ['sync', 'reissue', 'remaster', 'license'];

/** Barra horizontal com a divisão da receita bruta de um disco. */
export function splitBar(parts: { label: string; v: number; cls: string }[]): HTMLElement {
  return h('div', { class: 'r8-split' },
    h('div', { class: 'r8-split-bar', role: 'img', 'aria-label': parts.map((p) => `${p.label} ${pct(p.v)}`).join(', ') },
      parts.filter((p) => p.v > 0.001).map((p) => h('span', { class: p.cls, style: `width:${Math.max(0, p.v * 100)}%`, title: `${p.label}: ${pct(p.v)}` }))),
    h('div', { class: 'r8-split-legend small' }, parts.map((p) => h('span', null, h('i', { class: p.cls }), ` ${p.label} ${pct(p.v)}`))),
  );
}

function splitParts(s: GameState, c: Parameters<typeof splitPreview>[0]) {
  const sp = splitPreview(c, distributionFee(s));
  return [
    { label: t(l('Selo', 'Label')), v: sp.label, cls: 'lab' },
    { label: t(l('Artista', 'Artist')), v: sp.artist, cls: 'art' },
    { label: t(l('Produtor', 'Producer')), v: sp.producer, cls: 'pro' },
    { label: t(l('Convidados', 'Guests')), v: sp.guests, cls: 'gst' },
    { label: t(l('Distribuição', 'Distribution')), v: sp.distributor, cls: 'dst' },
  ];
}

function reversionText(t0: RightsTerms): L {
  if (t0.master === 'shared') return l('Co-propriedade: o master é dos dois para sempre.', 'Co-ownership: the master belongs to both forever.');
  if (t0.master === 'artist') return t0.reversionYears ? l(`Volta ao artista ${t0.reversionYears} ano(s) após o fim do contrato.`, `Returns to the artist ${t0.reversionYears} year(s) after the deal ends.`) : l('Volta ao artista no fim do contrato.', 'Returns to the artist when the deal ends.');
  if (!t0.reversionYears) return l('Perpétuo: o selo fica com o master.', 'Perpetual: the label keeps the master.');
  return l(`Volta ao artista ${t0.reversionYears} anos após o fim do contrato.`, `Returns to the artist ${t0.reversionYears} years after the deal ends.`);
}

const PRESETS: { id: string; name: L; hint: L; make: (m: ContractModel) => RightsTerms }[] = [
  { id: 'friendly', name: l('Amigável ao artista', 'Artist-friendly'), hint: l('Margem menor, mais confiança e chance de renovar.', 'Lower margin, more trust and renewal odds.'), make: (m) => ({ ...defaultRights(m), pubShare: 0, pointsFromLabel: true, scope: 'region', sync: false, reversionYears: m === 'licensing' || m === 'distribution' ? 0 : 10, reversionNeedsRecoup: false }) },
  { id: 'standard', name: l('Padrão do modelo', 'Model standard'), hint: l('O que o mercado espera para este modelo.', 'What the market expects for this model.'), make: (m) => defaultRights(m) },
  { id: 'hard', name: l('Duro (margem máxima)', 'Hard (max margin)'), hint: l('Mais participação e por mais tempo — exige pagar mais agora.', 'Bigger, longer share — you must pay more now.'), make: (m) => ({ ...defaultRights(m), master: m === 'distribution' ? 'artist' : 'label', pubShare: 0.5, options: 2, reversionYears: 0, sync: true, reissue: true, remaster: true, license: true }) },
];

/** Campos da ficha de direitos dentro da oferta. `o.rights` é editado no lugar. */
export function rightsFieldset(s: GameState, o: Omit<Offer, 'id' | 'week' | 'status'>, onChange: () => void): HTMLElement {
  o.rights ??= defaultRights(o.model, o.publishing);
  const box = h('fieldset', { class: 'r8-form' });
  const draw = () => {
    const r = o.rights!;
    const set = (fn: () => void) => { fn(); o.publishing = r.pubShare > 0 || o.model === 'publishing' || o.model === '360'; draw(); onChange(); };
    const chk = (label: L, key: 'pointsFromLabel' | 'exclusive' | 'sync' | 'reissue' | 'remaster' | 'license' | 'reversionNeedsRecoup') =>
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: r[key], onchange: (e: Event) => set(() => { r[key] = (e.target as HTMLInputElement).checked; }) }), t(label));
    box.replaceChildren(
      h('legend', null, t(l('Direitos e cláusulas', 'Rights and clauses'))),
      h('p', { class: 'muted small' }, t(l('Pagar mais agora (adiantamento) compra uma participação maior e mais longa; aceitar margem menor rende confiança e facilita renovar.', 'Paying more now (advance) buys a bigger, longer share; accepting a lower margin earns trust and eases renewal.'))),
      h('div', { class: 'row wrap' }, PRESETS.map((p) => h('button', { class: 'btn small ghost', title: t(p.hint), onclick: (e: Event) => { e.preventDefault(); o.rights = p.make(o.model); set(() => {}); } }, t(p.name)))),
      h('div', { class: 'r8-grid' },
        h('label', null, t(l('Master', 'Master')), select(r.master, (['label', 'shared', 'artist'] as const).map((v) => ({ value: v, label: t(MASTER_NAME[v]) })), (v) => set(() => { r.master = v; }))),
        h('label', null, t(l('Edição (fatia do selo)', 'Publishing (label share)')), select(String(r.pubShare), ['0', '0.25', '0.5'].map((v) => ({ value: v, label: v === '0' ? t(l('nenhuma — fica com o artista', 'none — artist keeps it')) : pct(Number(v)) + ' ' + t(l('do bolo de edição', 'of the publishing pot')) })), (v) => set(() => { r.pubShare = Number(v); }))),
        h('label', null, t(l('Pontos do produtor', 'Producer points')), select(String(r.producerPts), ['0', '0.02', '0.03', '0.04', '0.06'].map((v) => ({ value: v, label: pct(Number(v)) })), (v) => set(() => { r.producerPts = Number(v); }))),
        h('label', null, t(l('Pontos de convidados', 'Guest points')), select(String(r.guestPts), ['0', '0.02', '0.04'].map((v) => ({ value: v, label: pct(Number(v)) })), (v) => set(() => { r.guestPts = Number(v); }))),
        h('label', null, t(l('Territórios', 'Territories')), select(r.scope, (['home', 'region', 'world'] as const).map((v) => ({ value: v, label: t(SCOPE_NAME[v]) })), (v) => set(() => { r.scope = v; }))),
        h('label', null, t(l('Opções de discos futuros', 'Options on future records')), select(String(r.options), ['0', '1', '2', '3'].map((v) => ({ value: v, label: v === '0' ? t(l('nenhuma', 'none')) : `${v} × 1 ${t(l('ano', 'year'))}` })), (v) => set(() => { r.options = Number(v); }))),
        h('label', null, t(l('Reversão do master', 'Master reversion')), select(String(r.reversionYears), ['0', '2', '5', '10', '15', '20', '30'].map((v) => ({ value: v, label: v === '0' ? (r.master === 'artist' ? t(l('no fim do contrato', 'at the end of the deal')) : t(l('nunca (perpétuo)', 'never (perpetual)'))) : `${v} ${t(l('anos após o fim', 'years after the end'))}` })), (v) => set(() => { r.reversionYears = Number(v); }))),
      ),
      h('div', { class: 'row wrap' },
        chk(l('Selo paga os pontos (desde o 1º disco)', 'Label pays the points (from record one)'), 'pointsFromLabel'),
        chk(l('Exclusividade', 'Exclusivity'), 'exclusive'),
        chk(l('Reversão só após recoupment', 'Reversion only once recouped'), 'reversionNeedsRecoup'),
      ),
      h('div', { class: 'row wrap' }, h('span', { class: 'small muted' }, t(l('O selo controla:', 'The label controls:'))), ...KINDS.map((k) => chk(EXPLOIT_NAME[k], k))),
      splitBar(splitParts(s, { model: o.model, royalty: o.royalty, distributionFee: o.distributionFee, publishing: o.publishing, rights: r })),
      h('p', { class: 'small' }, t(reversionText(r))),
    );
  };
  draw();
  return box;
}

/** Ficha "Direitos" de um contrato do selo. */
export function rightsSheet(s: GameState, c: Contract, refresh: () => void = rerender): HTMLElement {
  const r0 = rightsOf(c);
  const act = s.acts[c.actId];
  const rw = revertWeek(c);
  const rels = c.party === 'player' ? releasesOfDeal(s, c) : [];
  const annual = rels.reduce((tt, x) => tt + annualRevenue(x), 0);
  const demand = rst(s).demands.find((d) => d.contractId === c.id);
  const power = artistPower(s, c);
  const active = c.endWeek > s.week && act?.contractId === c.id;
  const status = c.reverted ? pill(t(l('masters revertidos', 'masters reverted')), 'bad') : active ? pill(t(l('ativo', 'active')), 'good') : pill(t(l('encerrado', 'ended')));
  const missing = rels.filter((x) => !x.reissueOf).flatMap((x) => KINDS.filter((k) => !hasExploit(s, x, k)).map((k) => ({ rel: x, k })));
  return h('div', { class: 'r8-sheet' },
    h('h4', null, t(l('Direitos', 'Rights')), ' ', status),
    h('div', { class: 'grid2' },
      h('div', null,
        kv(t(l('Master', 'Master')), t(MASTER_NAME[r0.master])),
        kv(t(l('Edição (composição)', 'Publishing (composition)')), r0.pubShare ? `${pct(r0.pubShare)} ${t(l('do bolo de edição para o selo', 'of the publishing pot to the label'))}` : t(l('fica com o artista e autores', 'stays with artist and writers'))),
        kv(t(l('Reversão', 'Reversion')), c.reverted ? t(l('já voltou ao artista', 'already back with the artist')) : rw === Infinity ? t(reversionText(r0)) : `${t(reversionText(r0))} (${yearOfWeek(s, rw)}${r0.reversionNeedsRecoup && c.recoupBalance > 0 ? ' — ' + t(l('se recuperado', 'if recouped')) : ''})`),
        kv(t(l('Prazo', 'Term')), `${yearOfWeek(s, c.startWeek)}–${yearOfWeek(s, c.endWeek)} (${c.termMonths} ${t(l('meses', 'months'))})`),
        kv(t(l('Territórios', 'Territories')), `${t(SCOPE_NAME[r0.scope])}${c.territories?.length ? ` · ${marketsName(c.territories)}` : ''}`),
        kv(t(l('Opções e exclusividade', 'Options and exclusivity')), `${c.options ?? r0.options} ${t(l('opção(ões)', 'option(s)'))} · ${r0.exclusive ? t(l('exclusivo', 'exclusive')) : t(l('não exclusivo', 'non-exclusive'))}`),
      ),
      h('div', null,
        kv(t(l('Adiantamento', 'Advance')), $(c.advance)),
        kv(t(l('Recuperado', 'Recouped')), $(c.recouped ?? Math.max(0, c.advance - c.recoupBalance))),
        kv(t(l('Saldo não recuperado', 'Unrecouped balance')), h('span', { class: c.recoupBalance > 0 ? 'bad' : 'good' }, $(c.recoupBalance))),
        kv(t(l('Royalty do artista', 'Artist royalty')), `${Math.round(c.royalty * 100)}%`),
        kv(t(l('Exploração com o selo', 'Exploitation with the label')), KINDS.map((k) => `${r0[k] ? '✓' : '✗'} ${t(EXPLOIT_NAME[k])}`).join(' · ')),
        kv(t(l('Poder de barganha do artista', 'Artist bargaining power')), power < 0.2 ? t(l('igual ao da assinatura', 'same as at signing')) : power < 0.5 ? t(l('cresceu', 'has grown')) : t(l('muito maior — vai cobrar', 'much bigger — they will push'))),
      ),
    ),
    h('p', { class: 'small muted' }, t(l('Divisão da receita bruta de cada disco:', 'Split of each record\'s gross revenue:'))),
    splitBar(splitParts(s, c)),
    c.party === 'player' ? kv(t(l('Masters cobertos', 'Masters covered')), `${rels.length} · ${$(annual)}/${t(l('ano', 'yr'))}`) : null,
    demand ? h('div', { class: 'r8-demand' },
      h('p', null, pill(t(l('renegociação', 'renegotiation')), 'warn'), ' ', t(l('Pedem royalty de {r}% e bônus de {b}{rev}.', 'They ask for a {r}% royalty and a {b} bonus{rev}.'), { r: Math.round(demand.royalty * 100), b: $(demand.bonus), rev: demand.reversionYears ? t(l(', com reversão dos masters em {y} anos', ', with masters reverting in {y} years'), { y: demand.reversionYears }) : '' })),
      h('div', { class: 'row' },
        h('button', { class: 'btn small primary', onclick: () => { say(respondDemand(s, rngOf(s), demand.id, 'accept'), l('Renegociado. A relação sai fortalecida.', 'Renegotiated. The relationship is stronger.')); refresh(); } }, t(l('Aceitar', 'Accept'))),
        h('button', { class: 'btn small', onclick: () => { say(respondDemand(s, rngOf(s), demand.id, 'counter')); refresh(); } }, t(l('Propor meio-termo', 'Offer middle ground'))),
        h('button', { class: 'btn small ghost', onclick: () => { say(respondDemand(s, rngOf(s), demand.id, 'refuse'), l('Recusado. A confiança caiu.', 'Refused. Trust dropped.')); refresh(); } }, t(l('Recusar', 'Refuse')))),
    ) : null,
    c.party === 'player' && !c.reverted && rw !== Infinity && rels.length ? h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', onclick: () => { say(extendMasters(s, c.id), l('Masters estendidos por mais 10 anos.', 'Masters extended 10 more years.')); refresh(); } }, `${t(l('Estender masters +10 anos', 'Extend masters +10 years'))} (${$(extendPrice(s, c))})`),
    ) : null,
    missing.length && !c.reverted ? h('details', null, h('summary', { class: 'small' }, t(l('Autorizações que faltam ({n})', 'Missing permissions ({n})'), { n: missing.length })),
      h('ul', { class: 'small' }, missing.slice(0, 12).map(({ rel, k }) => h('li', null, releaseLink(s, rel.id), ` · ${t(EXPLOIT_NAME[k])} `,
        h('button', { class: 'btn small ghost', onclick: () => { say(buyExploitPermission(s, rel.id, k), l('Autorizado pelo artista.', 'Allowed by the artist.')); refresh(); } }, `${t(l('Pedir', 'Ask'))} ${$(permissionPrice(s, rel, k))}`)))))
      : null,
    act ? h('p', { class: 'muted small' }, actLink(s, act.id), ' · ', t(l('confiança', 'trust')), ` ${Math.round(act.trust)}`) : null,
  );
}
