// r27 (M2) — NEGOCIAÇÃO JOGÁVEL (interface): a mesa de proposta ↔ contraproposta para assinar um ato e para o
// pedido de renegociação de quem já é seu. O motor (src/sim/sys/nego27.ts) guarda o mínimo escondido; aqui
// aparecem só a faixa revelada (mais estreita com olheiro/pesquisa/analista/jurídico/empresário), a ambição e os
// traços conhecidos, a paciência e as táticas. O fecho é um contrato normal (makeOffer → acceptOffer) ou o
// mesmo ajuste da renegociação de sempre (settleDemand).

import { ambitionName, traitById } from '../../data/people';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { defaultOffer } from '../../sim/contracts';
import { defaultRights, rst } from '../../sim/rights';
import {
  acceptRenegTheirs27, acceptTheirs27, bringRival27, copyDraft27, insight27, proposeReneg27, propose27, read27, renegValue27, startNego27, startReneg27, walk27, walkReneg27,
  type Draft27, type Line27, type Nego27, type Reneg27, type RenegTerms27, type Tactic27,
} from '../../sim/sys/nego27';
import { $, modal, pill, rerender, toast } from '../common';
import { h } from '../dom';
import { pending29 } from '../../sim/contracts';
import { clearDraft29, loadDraft29, saveDraft29 } from '../ps/draft29';
import { store } from '../store';
import { settleMember29 } from '../../sim/sys/member29';
import { meter } from '../vis';
import { promiseChecks28 } from '../sys/promises28';
import { CONTRACT_MODELS, type ContractModel } from '../../data/rules';
import { offerEligible29 } from '../../sim/contracts';
import { HOW29, applyModel29, isSide29, isSpecial29, termLabel29, termTxt29 } from '../../sim/terms29';
import { x29Fields } from '../sys/contracts29';
import './negotiate27.css';

/** Termômetro: faixa revelada do mínimo (sombreada) e onde a sua proposta cai. */
function thermo(lo: number, hi: number, v: number, d0: number, d1: number, label: L): HTMLElement {
  const pc = (x: number) => Math.max(0, Math.min(100, ((x - d0) / (d1 - d0)) * 100));
  const band = v < lo ? l('abaixo da faixa — tende a irritar', 'below the range — likely to annoy') : v > hi ? l('acima da faixa — tende a fechar', 'above the range — likely to close') : l('dentro da faixa — pode fechar ou não', 'inside the range — may or may not close');
  return h('div', { class: 'n27-thermo', role: 'img', 'aria-label': `${t(label)}: ${t(band)}` },
    h('div', { class: 'n27-track' },
      h('span', { class: 'n27-band', style: `left:${pc(lo)}%;width:${Math.max(2, pc(hi) - pc(lo))}%` }),
      h('span', { class: `n27-mark ${v < lo ? 'bad' : v > hi ? 'good' : 'warn'}`, style: `left:${pc(v)}%` })),
    h('small', null, t(label), ': ', h('b', null, t(band))));
}

function logView(log: Line27[]): HTMLElement {
  return h('ol', { class: 'n27-log', 'aria-live': 'polite' }, [...log].reverse().map((x) => h('li', { class: `${x.who} ${x.tone ?? ''}` }, h('small', null, t({ you: l('Você', 'You'), them: l('Eles', 'Them'), rival: l('Rival', 'Rival'), note: l('Mesa', 'Table') }[x.who])), ' ', t(x.t))));
}

const num = (value: number, step: number, set: (v: number) => void, min = 0, max?: number) =>
  h('input', { type: 'number', value, step, min, max, oninput: (e: Event) => set(Number((e.target as HTMLInputElement).value)) });

// ---------------------------------------------------------------- assinar um ato

/** A mesa de negociação. Entrada única: a tela da oferta (ficha → Fazer proposta) abre a mesa quando a atividade
 *  é jogável (flow27.ts); `quick` = caminho rápido (a proposta única de sempre). */
export function openNego27(actId: string, base?: Draft27, quick?: () => void): void {
  const s = store.game;
  if (!s) return;
  const act = s.acts[actId];
  if (!act) return;
  // r29 REORG (M42): rascunho da última mesa com este ato (preferência deste navegador; expira em 8 semanas de jogo)
  const dr = base ? null : loadDraft29<Draft27>(s.signature, 'nego', actId, s.week);
  const d0 = base ? copyDraft27(base) : dr ? copyDraft27(dr.v) : (() => { const o = defaultOffer(s, act); o.rights = defaultRights(o.model, o.publishing); return o; })();
  const st = startNego27(s, actId, d0);
  if (!('actId' in st)) { toast(t(st), 'bad'); return; }
  const n: Nego27 = st;
  const o = copyDraft27(n.ours);
  const root = h('div', { class: 'n27' });
  let close = () => {};
  const draw = () => {
    const rd = read27(s, n, o);
    const open = n.status === 'open';
    const play = (tac: Tactic27) => { propose27(s, n, o, tac); draw(); };
    // R29 (contratos+): o modelo escolhe-se antes da 1ª proposta (empresariamento, produção e JV também)
    const started = n.log.some((x) => x.who === 'you');
    const model29 = h('label', null, t(l('Modelo', 'Model')), h('select', { disabled: started || !open, 'data-c29': 'model', onchange: (e: Event) => { const v = (e.target as HTMLSelectElement).value as ContractModel; applyModel29(o, v); o.rights = defaultRights(o.model, o.publishing); n.ours = copyDraft27(o); draw(); } },
      ...CONTRACT_MODELS.filter((m) => m.available).map((m) => { const el = m.id === o.model ? { ok: true } : offerEligible29(s, act, m.id); return h('option', { value: m.id, selected: m.id === o.model, disabled: !el.ok, title: el.ok ? undefined : t(el.why ?? l('Indisponível.', 'Unavailable.')) }, t(m.name)); })));
    const fields = h('div', { class: 'n27-fields' },
      model29,
      h('label', null, t(l('Adiantamento ($)', 'Advance ($)')), num(Math.round(o.advance / 100), 100, (v) => { o.advance = Math.max(0, Math.round(v * 100)); live(); })),
      o.model === 'management' || o.model === 'jv'
        ? x29Fields(s, o, () => live())
        : o.model === 'distribution'
        ? h('label', null, t(l('Taxa de distribuição (%)', 'Distribution fee (%)')), num(Math.round((o.distributionFee ?? 0.2) * 100), 1, (v) => { o.distributionFee = v / 100; live(); }, 5, 40))
        : h('label', null, t(termLabel29(o.model)), num(Math.round(o.royalty * 100), 1, (v) => { o.royalty = v / 100; live(); }, 1, o.model === 'production' ? 70 : 50)),
      h('label', null, t(l('Prazo (meses)', 'Term (months)')), num(o.termMonths, 6, (v) => { o.termMonths = Math.max(6, v); live(); }, 6, 120)),
      h('label', null, t(l('Discos devidos', 'Records owed')), num(o.releasesOwed, 1, (v) => { o.releasesOwed = Math.max(1, v); live(); }, 1, 10)),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: o.creativeControl, onchange: (e: Event) => { o.creativeControl = (e.target as HTMLInputElement).checked; live(); } }), ' ', t(l('Controle criativo', 'Creative control'))),
    );
    const proms = promiseChecks28(s, act, o, () => live()); // r28 (C7): promessas com verba, prazo e multa
    const thermoBox = h('div');
    const live = () => { const r2 = read27(s, n, o); thermoBox.replaceChildren(thermo(r2.lo, r2.hi, r2.score, 0.1, 1.2, l('Sua proposta × o mínimo deles', 'Your offer × their minimum'))); };
    live();
    const know = h('div', { class: 'n27-know' },
      h('p', null, t(l('Ambição: ', 'Ambition: ')), h('b', null, rd.ambition ? t(ambitionName[rd.ambition as keyof typeof ambitionName] ?? l(rd.ambition, rd.ambition)) : '?'),
        rd.traits.length ? [' · ', t(l('Traços: ', 'Traits: ')), rd.traits.map((x) => pill(t(traitById[x]?.name ?? l(x, x)))) ] : null),
      h('p', { class: 'small muted' }, t(l('Leitura do outro lado: {p}% (olheiro e pesquisa no ato, analista, jurídico, empresário).', 'Read on the other side: {p}% (scouting and research on the act, analyst, legal, manager).'), { p: Math.round(insight27(s, act) * 100) })),
      meter('heart', l('Paciência deles', 'Their patience'), Math.max(0, n.patience)),
      h('p', { class: 'small' }, t(l('Rodada {r} de {m}', 'Round {r} of {m}'), { r: Math.min(n.round + 1, n.maxRounds), m: n.maxRounds })),
      n.rival ? h('p', { class: 'n27-rival' }, pill(t(n.rival.out ? l('rival no limite', 'rival maxed out') : l('disputa', 'bidding war')), n.rival.out ? 'good' : 'warn'), ' ', t(l('{l} oferece {a} de adiantamento.', '{l} offers a {a} advance.'), { l: n.rival.name, a: $(n.rival.terms.advance) }),
        n.rival.counters ? h('small', { class: 'muted' }, ' ', t(l('(subiu o lance {n}×; o limite dele é segredo)', '(raised {n}×; their limit is secret)'), { n: n.rival.counters })) : null) : null,
    );
    const theirs = n.theirs && open ? h('div', { class: 'n27-theirs' },
      h('b', null, t(l('Contraproposta deles', 'Their counter'))),
      h('p', { class: 'small' }, isSpecial29(n.theirs.model) ? `${$(n.theirs.advance)} · ${t(termTxt29(n.theirs))} · ${n.theirs.termMonths}m` : `${$(n.theirs.advance)} · ${Math.round((n.theirs.model === 'distribution' ? 1 - (n.theirs.distributionFee ?? 0.2) : n.theirs.royalty) * 100)}% · ${n.theirs.termMonths}m · ${n.theirs.releasesOwed} ${t(l('disco(s)', 'record(s)'))}${n.theirs.creativeControl ? ' · ' + t(l('controle criativo', 'creative control')) : ''}`),
      h('div', { class: 'row' },
        h('button', { class: 'btn small primary', onclick: () => { acceptTheirs27(s, n); draw(); } }, t(l('Aceitar a contraproposta', 'Accept their counter'))),
        h('button', { class: 'btn small ghost', onclick: () => { Object.assign(o, copyDraft27(n.theirs!)); draw(); } }, t(l('Usar como base', 'Use as a base'))))) : null;
    const tactics = open ? h('div', { class: 'n27-tactics' },
      h('button', { class: 'btn primary', onclick: () => play('plain') }, t(l('Propor', 'Propose'))),
      h('button', { class: 'btn', title: t(l('"Temos outro artista na mira." Se colar, eles baixam a pedida; se não, confiança e paciência caem.', '"We have another act lined up." If it lands they lower the ask; if not, trust and patience drop.')), onclick: () => play('bluff') }, t(l('Blefar e propor', 'Bluff and propose'))),
      h('button', { class: 'btn', title: t(l('Resposta agora: fecha se estiver perto do mínimo; senão eles saem.', 'Answer now: closes if near their minimum; otherwise they leave.')), onclick: () => play('deadline') }, t(l('Propor com prazo', 'Propose with a deadline'))),
      // R29: banda em montagem (pending29) não tem rival — o botão fica desativado com o motivo
      h('button', { class: 'btn', disabled: !!n.rival || isSide29(o) || (!!s.acts[n.actId] && pending29(s, s.acts[n.actId])), title: isSide29(o) ? t(l('No empresariamento não há leilão de selos: o ato continua onde está.', 'Management has no label auction: the act stays where it is.')) : s.acts[n.actId] && pending29(s, s.acts[n.actId]) ? t(l('Nenhum selo disputa uma banda que ainda está sendo montada.', 'No label bids on a band that is still being put together.')) : t(l('Abre a disputa: +1 rodada e paciência, mas o mínimo sobe acima do lance rival.', 'Opens the bidding: +1 round and patience, but their minimum rises above the rival bid.')), onclick: () => { bringRival27(s, n, true); draw(); } }, t(l('Chamar um rival', 'Bring in a rival'))),
      h('button', { class: 'btn ghost', onclick: () => { walk27(s, n); draw(); } }, t(l('Sair da mesa', 'Walk away'))),
      quick && !n.log.some((x) => x.who === 'you') ? h('button', { class: 'btn ghost', title: t(l('O formulário de sempre: uma proposta, uma resposta.', 'The usual form: one offer, one answer.')), onclick: () => { close(); quick(); } }, t(l('Resolver rápido: proposta única', 'Resolve quickly: single offer'))) : null) : null;
    const end = !open ? h('div', { class: `n27-end ${n.status === 'deal' ? 'good' : 'bad'}` },
      h('b', null, t(n.status === 'deal' ? (o.model === 'management' ? l('Contrato assinado: você é o empresário.', 'Contract signed: you are the manager.') : l('Contrato assinado.', 'Contract signed.')) : n.status === 'sniped' ? l('O rival levou o ato.', 'The rival signed the act.') : l('Sem acordo.', 'No deal.'))),
      h('button', { class: 'btn primary', onclick: () => close() }, t(l('Fechar', 'Close')))) : null;
    root.replaceChildren(
      h('div', { class: 'n27-cols' },
        h('div', null, h('h4', null, t(l('Sua proposta', 'Your offer'))), isSpecial29(o.model) ? h('p', { class: 'small muted' }, t(HOW29[o.model]!)) : null, fields, proms, thermoBox, theirs, tactics, end),
        h('div', null, h('h4', null, t(l('O que você sabe', 'What you know'))), know, h('h4', null, t(l('Mesa', 'Table'))), logView(n.log))),
    );
    if (!open) (root.querySelector('.n27-end button') as HTMLElement | null)?.focus();
  };
  draw();
  close = modal(t(l('Negociar com {a}', 'Negotiate with {a}'), { a: act.name }), root, { wide: true, onClose: () => {
    // r29 (M42): mesa fechada aberta → guarda o rascunho; acordo ou ruptura → apaga
    if (n.status === 'open') saveDraft29(s.signature, 'nego', actId, copyDraft27(o), s.week); else clearDraft29(s.signature, 'nego', actId);
    for (const x of settleMember29(s)) toast(t(x.t), x.ok ? 'good' : 'bad'); // R29 (integrante): solo-proposta assinado vira a saída da banda; sem acordo, some
    rerender();
  } });
  if (dr) toast(t(l('Rascunho da sua última proposta recuperado. A leitura da mesa usa a situação de agora.', 'Your last offer draft was restored. The table reading uses the current situation.')), 'info');
}

// ---------------------------------------------------------------- renegociar

/** A mesa da renegociação. Entrada única: o pedido do artista (Direitos); `quick` = aceitar o pedido como está. */
export function openReneg27(demandId: string, quick?: () => void): void {
  const s = store.game;
  if (!s) return;
  const st = startReneg27(s, demandId);
  if (!('demandId' in st)) { toast(t(st), 'bad'); return; }
  const n: Reneg27 = st;
  const act = s.acts[n.actId];
  const o: RenegTerms27 = { royalty: n.roy0, bonus: Math.round(n.bonusD / 2 / 100) * 100, rev: false };
  const root = h('div', { class: 'n27' });
  let close = () => {};
  const draw = () => {
    const open = n.status === 'open';
    const thermoBox = h('div');
    const live = () => thermoBox.replaceChildren(thermo(n.lo, n.hi, renegValue27(n, o), 0, 1.3, l('Parte do pedido atendida × o mínimo deles', 'Share of the request met × their minimum')));
    live();
    const fields = h('div', { class: 'n27-fields' },
      h('label', null, t(l('Royalty (%)', 'Royalty (%)')), num(Math.round(o.royalty * 100), 1, (v) => { o.royalty = Math.max(n.roy0, v / 100); live(); }, Math.round(n.roy0 * 100), 50)),
      h('label', null, t(l('Bônus ($)', 'Bonus ($)')), num(Math.round(o.bonus / 100), 100, (v) => { o.bonus = Math.max(0, Math.round(v * 100)); live(); })),
      n.revD ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: o.rev, onchange: (e: Event) => { o.rev = (e.target as HTMLInputElement).checked; live(); } }), ' ', t(l('Masters de volta em {y} anos', 'Masters back in {y} years'), { y: n.revD })) : null,
    );
    const theirs = n.theirs && open ? h('div', { class: 'n27-theirs' },
      h('b', null, t(l('Contraproposta deles', 'Their counter'))), h('p', { class: 'small' }, `${Math.round(n.theirs.royalty * 100)}% · ${$(n.theirs.bonus)}`),
      h('div', { class: 'row' },
        h('button', { class: 'btn small primary', onclick: () => { acceptRenegTheirs27(s, n); draw(); } }, t(l('Aceitar a contraproposta', 'Accept their counter'))),
        h('button', { class: 'btn small ghost', onclick: () => { Object.assign(o, n.theirs!); draw(); } }, t(l('Usar como base', 'Use as a base'))))) : null;
    const play = (tac: Tactic27) => { proposeReneg27(s, n, o, tac); draw(); };
    root.replaceChildren(
      h('div', { class: 'n27-cols' },
        h('div', null,
          h('h4', null, t(l('Sua resposta ao pedido', 'Your answer to the request'))),
          h('p', { class: 'small muted' }, t(l('Pedem royalty de {r}% (hoje {r0}%) e bônus de {b}. O bônus é recuperável.', 'They ask for a {r}% royalty (now {r0}%) and a {b} bonus. The bonus is recoupable.'), { r: Math.round(n.royD * 100), r0: Math.round(n.roy0 * 100), b: $(n.bonusD) })),
          fields, thermoBox, theirs,
          open ? h('div', { class: 'n27-tactics' },
            h('button', { class: 'btn primary', onclick: () => play('plain') }, t(l('Propor', 'Propose'))),
            h('button', { class: 'btn', onclick: () => play('bluff') }, t(l('Blefar e propor', 'Bluff and propose'))),
            h('button', { class: 'btn', onclick: () => play('deadline') }, t(l('Propor com prazo', 'Propose with a deadline'))),
            h('button', { class: 'btn ghost', onclick: () => { walkReneg27(s, n); draw(); } }, t(l('Recusar o pedido', 'Refuse the request'))),
            quick && n.round === 0 ? h('button', { class: 'btn ghost', onclick: () => { close(); quick(); } }, t(l('Resolver rápido: aceitar como está', 'Resolve quickly: accept as is'))) : null) : h('div', { class: `n27-end ${n.status === 'deal' ? 'good' : 'bad'}` },
            h('b', null, t(n.status === 'deal' ? l('Contrato renegociado.', 'Contract renegotiated.') : l('Sem acordo.', 'No deal.'))),
            h('button', { class: 'btn primary', onclick: () => close() }, t(l('Fechar', 'Close'))))),
        h('div', null,
          h('h4', null, t(l('O que você sabe', 'What you know'))),
          h('p', { class: 'small muted' }, t(l('Leitura do outro lado: {p}%.', 'Read on the other side: {p}%.'), { p: Math.round(insight27(s, act) * 100) })),
          meter('heart', l('Paciência deles', 'Their patience'), Math.max(0, n.patience)),
          h('p', { class: 'small' }, t(l('Rodada {r} de {m}', 'Round {r} of {m}'), { r: Math.min(n.round + 1, n.maxRounds), m: n.maxRounds })),
          h('h4', null, t(l('Mesa', 'Table'))), logView(n.log))),
    );
  };
  draw();
  close = modal(t(l('Renegociar com {a}', 'Renegotiate with {a}'), { a: act?.name ?? '?' }), root, { wide: true, onClose: () => rerender() });
}

export const hasDemand27 = (demandId: string): boolean => !!store.game && rst(store.game).demands.some((d) => d.id === demandId);
