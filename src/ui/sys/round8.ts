// Interface da rodada 8: herdeiros e aposentadoria (aba do dono), participações em selos rivais
// (ficha do selo e aba de Negócios), relações entre artistas de atos diferentes (páginas do integrante
// e do artista) e feats negociados (modal com resposta na hora, negociações abertas e convites).

import { l, type L } from '../../data/world';
import { S, t } from '../../i18n/strings';
import type { Act, GameState, Label } from '../../sim/types';
import { playerActs, rngOf } from '../../sim/util';
import { $, actLink, labelLink, modal, pill, rerender, section, strategyName, toast } from '../common';
import { bar, h, select } from '../dom';
import { LABEL_EXTRAS } from '../ficha';
import { ACT_TABS, PERSON_TABS, openPersonPage } from '../pages';
import { registerCutscene, registerSection, registerTab } from '../registry';
import { portrait } from '../vis';
import { OWNER_EXTRAS } from './people/area';
import { playerPerson } from '../../sim/sys/life';
import { REL_NAME, heirCandidates, heirs, inheritancePreview, retireOwner } from '../../sim/sys/heirs8';
import {
  BOARD_SEAT, CONTROL, absorbLabel, acceptStakeCounter, antitrust, directLabel, dropStakeTalk, fairStakePrice, founderShare, holdings, labelValue, makeSubLabel,
  pressStake, proposeStake, sellStake, squeezeCost, stakeChance, stakeOf, stakes, type StakeResult,
} from '../../sim/sys/stakes8';
import { SRC_NAME, TIE_NAME, actTies, otherOf, social, tiesOf, type Tie } from '../../sim/sys/social8';
import { acceptFeatCounter, clearance, dropFeatDeal, fairFeat, featChance, featSongs, featTargets, feats, pressFeat, proposeFeat, type FeatResult } from '../../sim/sys/feats8';
import { actOfPerson } from '../../sim/sys/social8';

const say = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const band = (p: number) => (p >= 0.6 ? 'likely' : p >= 0.3 ? 'uncertain' : 'unlikely') as 'likely' | 'uncertain' | 'unlikely';
const pct = (x: number) => `${Math.round(x * 100)}%`;

// ================================================================== herdeiros e aposentadoria

function heirSection(s: GameState): HTMLElement {
  const cands = heirCandidates(s);
  const st = heirs(s);
  let pick = cands[0]?.key ?? '';
  const retire = () => {
    const body = h('div', null,
      cands.length
        ? h('div', null,
          h('p', null, t(l('Você passa o selo em vida: o herdeiro recebe 60% do seu patrimônio (sem imposto) e assume a empresa. A run continua com ele.', 'You hand over the label while alive: the heir receives 60% of your wealth (tax free) and takes over the company. The run continues with them.'))),
          h('label', null, t(l('Herdeiro: ', 'Heir: ')), select(pick, cands.map((c) => ({ value: c.key, label: `${c.name} — ${t(REL_NAME[c.rel])}, ${s.year - c.born}` })), (v) => { pick = v; })),
          h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { const e = retireOwner(s, rngOf(s), pick); close(); say(e, l('O selo tem um novo comando.', 'The label has new leadership.')); } }, t(l('Aposentar-se e passar o selo', 'Retire and hand over the label')))))
        : h('div', null,
          h('p', { class: 'bad' }, t(l('Você não tem herdeiros vivos e adultos. Aposentar-se agora encerra a run (final: Aposentadoria Tranquila).', 'You have no living adult heirs. Retiring now ends the run (ending: Quiet Retirement).'))),
          h('button', { class: 'btn danger', onclick: () => { const e = retireOwner(s, rngOf(s), 'none'); close(); say(e, l('Fim de carreira.', 'Career over.')); window.dispatchEvent(new Event('vtn-ended')); } }, t(l('Aposentar e encerrar a run', 'Retire and end the run')))),
    );
    const close = modal(t(l('Aposentadoria', 'Retirement')), body);
  };
  return section(t(l('Herdeiros e aposentadoria', 'Heirs and retirement')),
    h('p', { class: 'muted small' }, t(l('Se você morrer (idade, saúde, vícios) ou se aposentar, a run continua com um herdeiro vivo: filho(a) adulto(a), cônjuge ou parente. Ele tem idade, atributos e traços próprios e herda o patrimônio (menos o imposto de herança da época), a sua parte da empresa e parte da reputação. Sem herdeiros, a run termina.', 'If you die (age, health, vices) or retire, the run continues with a living heir: an adult child, spouse or relative. They have their own age, attributes and traits and inherit your wealth (minus the era\'s inheritance tax), your stake in the company and part of the reputation. With no heirs, the run ends.'))),
    st.pending ? h('p', null, pill(t(l('sucessão em andamento — veja a mesa de decisões', 'succession under way — see the decision desk')), 'warn')) : null,
    cands.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(l('Herdeiro', 'Heir'))), h('th', null, t(l('Parentesco', 'Relation'))), h('th', null, t(l('Idade', 'Age'))), h('th', null, t(l('Aptidão', 'Aptitude'))), h('th', null, t(l('Herdaria (morte)', 'Would inherit (death)'))))),
      h('tbody', null, cands.map((c) => {
        const pv = inheritancePreview(s, c, 'death');
        return h('tr', null,
          h('td', null, c.personId ? h('button', { class: 'link', onclick: () => openPersonPage(c.personId!) }, c.name) : c.name),
          h('td', null, t(REL_NAME[c.rel])), h('td', null, s.year - c.born), h('td', null, bar(c.aptitude), ` ${Math.round(c.aptitude)}`),
          h('td', null, `${$(pv.wealth)}${pv.tax ? ` (−${pct(pv.tax)})` : ''}`));
      }))) : h('p', { class: 'bad small' }, t(l('Nenhum herdeiro vivo e adulto. Case-se, tenha filhos ou espere eles crescerem.', 'No living adult heir. Marry, have children or wait for them to grow up.'))),
    st.relatives.length ? h('p', { class: 'small' }, t(l('Parentes: ', 'Relatives: ')), st.relatives.map((r) => `${r.name} (${t(REL_NAME[r.rel])}, ${s.year - r.born})`).join(' · ')) : null,
    st.lineage.length ? h('p', { class: 'small muted' }, t(l('Linhagem: ', 'Lineage: ')), st.lineage.map((x) => `${x.name} ${x.from}–${x.to}${x.heir ? ` → ${x.heir}` : ''}`).join(' · ')) : null,
    h('div', { class: 'row' }, h('button', { class: 'btn', disabled: !!st.pending || !!s.ended, onclick: retire }, t(l('Aposentar-se…', 'Retire…')))),
  );
}

OWNER_EXTRAS.push(heirSection);

registerCutscene('people_succession', (s, cs, close) => {
  const p = playerPerson(s);
  return h('div', { class: 'lf-scene' },
    p ? portrait(p, 96) : null,
    h('h3', null, t(cs.data.title as L)),
    h('p', { class: 'lf-scene-text' }, t(cs.data.text as L)),
    h('button', { class: 'btn primary', onclick: close }, t(l('Continuar com a nova geração', 'Carry on with the new generation'))),
  );
});

// ================================================================== participações em selos

function openStakeModal(s: GameState, labelId: string, onDone: () => void): void {
  const lb = s.labels[labelId];
  if (!lb) return;
  const max = Math.max(0.02, founderShare(s, labelId));
  const o = { share: Math.min(0.2, max), price: 0, mode: 'friendly' as 'friendly' | 'hostile' };
  o.price = fairStakePrice(s, labelId, o.share, o.mode);
  const info = h('div', { class: 'eval' });
  const reply = h('div', { class: 'offer-reply' });
  const priceInput = h('input', { type: 'number', min: 1, step: 1000, value: Math.round(o.price / 100), oninput: (e: Event) => { o.price = Math.round(Number((e.target as HTMLInputElement).value) * 100); update(); } }) as HTMLInputElement;
  const update = () => {
    const fair = fairStakePrice(s, labelId, o.share, o.mode);
    const p = stakeChance(s, labelId, o.share, o.price, o.mode);
    const at = antitrust(s, labelId, o.share);
    const after = stakeOf(s, labelId) + o.share;
    info.replaceChildren(...([
      h('div', null, t(l('Preço justo', 'Fair price')), ': ', h('b', null, $(fair)), ' · ', t(S.chance), ': ', pill(t(S[band(p)]), band(p))),
      h('div', { class: 'small' }, t(l('Depois da compra: ', 'After the deal: ')), h('b', null, pct(after)), after > CONTROL ? pill(t(l('controle', 'control')), 'gold') : after >= BOARD_SEAT ? pill(t(l('assento no conselho', 'board seat')), 'good') : null),
      at.text ? h('p', { class: at.blocked ? 'bad small' : 'warn small' }, t(at.text)) : null,
      o.mode === 'hostile' ? h('p', { class: 'bad small' }, t(l('Compra hostil: paga prêmio aos acionistas por cima do CEO. Rivalidade, reputação e o elenco deles sofrem; o selo pode reagir (pílula de veneno, cavaleiro branco).', 'Hostile buy: pays shareholders a premium over the CEO\'s head. Rivalry, reputation and their roster suffer; the label may react (poison pill, white knight).'))) : null,
      h('p', { class: 'muted small' }, t(l('Pesa: preço, aperto de caixa do selo, perfil (impérios não vendem), agressividade, rivalidade com você, sua reputação institucional e sua negociação.', 'What matters: price, the label\'s cash squeeze, profile (empires do not sell), aggression, rivalry with you, your institutional reputation and your negotiation.'))),
    ] as (HTMLElement | null)[]).filter((x): x is HTMLElement => !!x));
  };
  const shareSel = h('input', { type: 'number', min: 2, max: Math.round(max * 100), step: 1, value: Math.round(o.share * 100), oninput: (e: Event) => { o.share = Math.max(0.02, Math.min(max, Number((e.target as HTMLInputElement).value) / 100)); o.price = fairStakePrice(s, labelId, o.share, o.mode); priceInput.value = String(Math.round(o.price / 100)); update(); } });
  const show = (res: { result: StakeResult; text: L; talk?: { id: string } }) => {
    if (res.result === 'accepted') { toast(t(res.text), 'good'); close(); onDone(); rerender(); return; }
    if (res.result === 'thinking' && res.talk) {
      const id = res.talk.id;
      reply.replaceChildren(h('p', null, pill(t(l('pensando', 'thinking')), 'warn'), ' ', t(res.text)), h('div', { class: 'row' },
        h('button', { class: 'btn small', onclick: () => show(pressStake(s, rngOf(s), id)) }, t(l('Pressionar por uma resposta', 'Push for an answer'))),
        h('button', { class: 'btn small ghost', onclick: () => { close(); rerender(); } }, t(l('Esperar', 'Wait')))));
      return;
    }
    if (res.result === 'counter' && res.talk) {
      const id = res.talk.id;
      reply.replaceChildren(h('p', null, pill(t(l('contraproposta', 'counter')), 'warn'), ' ', t(res.text)), h('div', { class: 'row' },
        h('button', { class: 'btn small primary', onclick: () => { const e = acceptStakeCounter(s, rngOf(s), id); if (e) toast(t(e), 'bad'); else { toast(t(l('Fechado!', 'Deal!')), 'good'); close(); onDone(); rerender(); } } }, t(l('Aceitar', 'Accept'))),
        h('button', { class: 'btn small ghost', onclick: () => { dropStakeTalk(s, id); reply.replaceChildren(h('p', { class: 'muted small' }, t(l('Ajuste a proposta e envie de novo.', 'Adjust the offer and send it again.')))); } }, t(l('Ajustar e reenviar', 'Adjust and resend')))));
      return;
    }
    reply.replaceChildren(h('p', { class: res.result === 'invalid' ? 'warn' : 'bad' }, t(res.text)));
    rerender();
  };
  const form = h('div', { class: 'form' },
    h('p', null, t(l('Avaliação do selo inteiro', 'Whole-label valuation')), ': ', h('b', null, $(labelValue(s, lb).value)), ` · ${t(l('à venda', 'available'))}: ${pct(founderShare(s, labelId))}`),
    h('label', null, `${t(l('Fatia', 'Stake'))} (%)`, shareSel),
    h('label', null, `${t(l('Preço oferecido', 'Price offered'))} ($)`, priceInput),
    h('label', null, t(l('Abordagem', 'Approach')), select(o.mode, [{ value: 'friendly', label: t(l('Amigável (negocia com o CEO)', 'Friendly (deal with the CEO)')) }, { value: 'hostile', label: t(l('Hostil (compra dos acionistas)', 'Hostile (buy from shareholders)')) }], (v) => { o.mode = v as 'friendly' | 'hostile'; o.price = fairStakePrice(s, labelId, o.share, o.mode); priceInput.value = String(Math.round(o.price / 100)); update(); })),
    info,
  );
  update();
  const close = modal(`${t(l('Comprar participação', 'Buy a stake'))}: ${lb.name}`, h('div', null, form, h('div', { class: 'actions' },
    h('button', { class: 'btn primary', onclick: () => show(proposeStake(s, rngOf(s), labelId, o.share, o.price, o.mode)) }, t(l('Propor e ouvir a resposta', 'Propose and hear the answer'))), reply)));
}

function ownershipBlock(s: GameState, labelId: string, close: () => void): HTMLElement | null {
  const lb = s.labels[labelId];
  if (!lb) return null;
  const list = holdings(s, labelId);
  const mine = stakeOf(s, labelId);
  const canBuy = lb.active && s.config.role !== 'artist';
  const v = labelValue(s, lb);
  let strat: Label['strategy'] = lb.strategy;
  return h('div', null,
    h('h4', null, t(l('Acionistas', 'Shareholders'))),
    h('table', { class: 'tbl compact' }, h('tbody', null,
      h('tr', null, h('td', null, lb.ceo ? `${lb.ceo} (${t(l('fundador/CEO', 'founder/CEO'))})` : t(l('Fundadores', 'Founders'))), h('td', null, pct(founderShare(s, labelId)))),
      ...list.map((x) => h('tr', null, h('td', null, x.holder === 'player' ? h('b', null, s.config.companyName) : labelLink(s, x.holder)), h('td', null, pct(x.share)))))),
    h('p', { class: 'small' }, t(l('Avaliação', 'Valuation')), `: ${$(v.value)} · ${t(l('passivos', 'liabilities'))} ${$(v.liabilities)}`, mine >= BOARD_SEAT ? ` · ${t(l('caixa', 'cash'))} ${$(lb.cash)}` : ''),
    mine > 0 ? h('p', null, pill(`${t(l('Sua fatia', 'Your stake'))}: ${pct(mine)}`, mine > CONTROL ? 'gold' : mine >= BOARD_SEAT ? 'good' : ''), ' ',
      h('small', { class: 'muted' }, t(mine > CONTROL ? l('Controle: você manda no selo.', 'Control: you run the label.') : mine >= BOARD_SEAT ? l('Assento no conselho: o selo não alicia seu elenco e libera feats.', 'Board seat: the label will not poach your roster and clears features.') : l('Minoritário: dividendos anuais.', 'Minority: annual dividends.')))) : null,
    canBuy ? h('div', { class: 'row wrap' },
      h('button', { class: 'btn small primary', disabled: founderShare(s, labelId) < 0.02, onclick: () => openStakeModal(s, labelId, () => { close(); }) }, t(l('Negociar participação', 'Negotiate a stake'))),
      mine > 0 ? h('button', { class: 'btn small ghost', onclick: () => { const e = sellStake(s, labelId); close(); say(e, l('Fatia vendida.', 'Stake sold.')); } }, `${t(l('Vender fatia', 'Sell stake'))} ≈ ${$(Math.round(v.value * mine * 0.85))}`) : null) : null,
    mine > CONTROL && lb.active ? h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', onclick: () => { const e = absorbLabel(s, rngOf(s), labelId); close(); say(e, l('Selo absorvido: elenco e catálogo agora são seus.', 'Label absorbed: roster and catalog are now yours.')); } }, `${t(l('Absorver', 'Absorb'))} (${t(l('minoritários', 'minority'))} ${$(squeezeCost(s, labelId))})`),
      h('button', { class: 'btn small', onclick: () => { const e = makeSubLabel(s, labelId); close(); say(e, l('Agora é um subselo seu.', 'It is now your sub-label.')); } }, t(l('Transformar em subselo', 'Turn into a sub-label'))),
      select(strat, (['develop', 'buy_catalog', 'niche', 'stars'] as const).map((x) => ({ value: x, label: strategyName(x) })), (x) => { strat = x; }),
      h('button', { class: 'btn small ghost', onclick: () => say(directLabel(s, labelId, strat), l('Nova estratégia imposta.', 'New strategy imposed.')) }, t(l('Mandar na estratégia', 'Set its strategy')))) : null,
  );
}

LABEL_EXTRAS.push(ownershipBlock);

function stakesTab(s: GameState): HTMLElement {
  const st = stakes(s);
  const active = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.revenueLastYear - a.revenueLastYear);
  const talks = st.talks;
  return h('div', null,
    section(t(l('Participações em selos concorrentes', 'Stakes in rival labels')),
      h('p', { class: 'muted small' }, t(l('Compre uma fatia (ou o selo inteiro) negociando com o dono. 25% dá assento no conselho; mais de 50%, o controle (absorver, subselo ou mandar na estratégia). Fatias pagam dividendos todo ano. Abra a ficha do selo para negociar.', 'Buy a slice (or the whole label) by negotiating with the owner. 25% gives a board seat; over 50%, control (absorb, sub-label or run its strategy). Stakes pay dividends every year. Open the label page to negotiate.'))),
      talks.length ? h('ul', { class: 'small' }, talks.map((x) => h('li', null, labelLink(s, x.labelId), ` ${pct(x.share)} · ${$(x.price)} · `,
        x.status === 'thinking' ? h('span', null, pill(t(l('pensando', 'thinking')), 'warn'), ' ', h('button', { class: 'btn small', onclick: () => { const res = pressStake(s, rngOf(s), x.id); toast(t(res.text), res.result === 'accepted' ? 'good' : 'bad'); rerender(); } }, t(l('Pressionar', 'Push'))))
          : h('span', null, pill(`${t(l('contraproposta', 'counter'))}: ${pct(x.counter?.share ?? 0)} ${$(x.counter?.price ?? 0)}`, 'warn'), ' ',
            h('button', { class: 'btn small primary', onclick: () => say(acceptStakeCounter(s, rngOf(s), x.id), l('Fechado!', 'Deal!')) }, t(l('Aceitar', 'Accept'))),
            h('button', { class: 'btn small ghost', onclick: () => { dropStakeTalk(s, x.id); rerender(); } }, t(l('Recusar', 'Decline'))))))) : null,
      h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, h('th', null, t(l('Selo', 'Label'))), h('th', null, t(l('Receita (ano passado)', 'Revenue (last year)'))), h('th', null, t(S.roster)), h('th', null, t(l('Sua fatia', 'Your stake'))), h('th', null, t(l('Outros acionistas', 'Other shareholders'))))),
        h('tbody', null, active.slice(0, 30).map((lb) => {
          const others = holdings(s, lb.id).filter((x) => x.holder !== 'player');
          return h('tr', null, h('td', null, labelLink(s, lb.id)), h('td', null, $(lb.revenueLastYear)), h('td', null, lb.roster.length),
            h('td', null, stakeOf(s, lb.id) ? pill(pct(stakeOf(s, lb.id)), stakeOf(s, lb.id) > CONTROL ? 'gold' : 'good') : '—'),
            h('td', { class: 'small' }, others.map((x) => `${s.labels[x.holder]?.name ?? x.holder} ${pct(x.share)}`).join(', ') || '—'));
        }))),
    ),
    st.news.length ? section(t(l('Movimentos acionários', 'Shareholding moves')), h('ul', { class: 'small' }, st.news.slice().reverse().slice(0, 15).map((n) => h('li', null, `${n.y} · `, t(n.t))))) : null,
  );
}

registerTab('business', { id: 'stakes8', label: l('Participações em selos', 'Label stakes'), icon: 'bank', order: 7, render: stakesTab, badge: (s) => stakes(s).talks.filter((x) => x.status === 'counter').length || undefined });

// ================================================================== relações entre artistas

const KIND_CLS: Record<string, string> = { friend: 'good', collab: 'good', mentor: 'gold', romance: 'gold', rival: 'warn', feud: 'bad' };

function tieRow(s: GameState, t0: Tie, me: string, closeAll: () => void): HTMLElement {
  const other = otherOf(t0, me);
  const p = s.persons[other];
  const act = actOfPerson(s, other);
  return h('li', null,
    p ? h('button', { class: 'link', onclick: () => { closeAll(); openPersonPage(other); } }, p.name) : '?',
    act ? h('span', null, ' (', actLink(s, act.id), ')') : null, ' ',
    pill(t(TIE_NAME[t0.k]), KIND_CLS[t0.k] ?? ''), t0.m === other ? pill(t(l('mentor(a)', 'mentor')), 'gold') : t0.m === me ? pill(t(l('aprendiz', 'mentee'))) : null, ' ',
    bar(Math.abs(t0.v), 100, t0.v >= 0 ? 'good' : 'bad'),
    h('small', { class: 'muted' }, ` ${t0.v > 0 ? '+' : ''}${Math.round(t0.v)} · ${t(SRC_NAME[t0.src])} · ${t(l('desde', 'since'))} ${t0.y}`));
}

PERSON_TABS.push((s, p, closeAll) => {
  const ts = tiesOf(s, p.id);
  if (!ts.length) return null;
  return {
    id: 'circle8', label: l('Círculo', 'Circle'), icon: 'fans',
    render: () => h('div', null,
      h('p', { class: 'muted small' }, t(l('Amizades, rivalidades, romances, mentorias e parcerias com gente de outras bandas e selos.', 'Friendships, rivalries, romances, mentorships and collaborations with people from other bands and labels.'))),
      h('ul', { class: 'attr-list' }, ts.slice(0, 20).map((x) => tieRow(s, x, p.id, closeAll)))),
  };
});

ACT_TABS.push((s, a, close) => {
  const ts = actTies(s, a);
  const mine = a.owner === 'player' || !!a.playerBand;
  const canFeat = playerActs(s).length > 0 && (a.status === 'active' || a.status === 'emerging');
  if (!ts.length && !canFeat) return null;
  return {
    id: 'rel8', label: l('Relações', 'Relationships'), icon: 'handshake',
    render: () => h('div', null,
      canFeat ? h('div', { class: 'row' }, h('button', { class: 'btn small primary', onclick: () => { close(); openFeatModal(s, mine ? { host: a.id } : { guest: a.id }); } }, mine ? t(l('Convidar alguém para um feat', 'Invite someone to feature')) : t(l('Convidar para um feat', 'Invite to a feature')))) : null,
      ts.length ? h('ul', { class: 'attr-list' }, ts.slice(0, 24).map(({ t: x, me }) => h('div', null, h('small', { class: 'muted' }, `${s.persons[me]?.name ?? ''} ↔ `), tieRow(s, x, me, close)))) : h('p', { class: 'muted small' }, t(l('Ainda sem laços fora da banda.', 'No ties outside the band yet.'))),
    ),
  };
});

// ================================================================== feats negociados

export function openFeatModal(s: GameState, pre: { host?: string; guest?: string; song?: string } = {}): void {
  const hosts = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.members.length > 0);
  if (!hosts.length) { toast(t(l('Você precisa de um artista no elenco.', 'You need an act on your roster.')), 'bad'); return; }
  const o = { host: pre.host && hosts.some((x) => x.id === pre.host) ? pre.host : hosts[0].id, song: pre.song ?? '', guest: pre.guest ?? '', fee: 0, split: 0.1 };
  const box = h('div');
  const reply = h('div', { class: 'offer-reply' });
  let close = () => {};
  const resetTerms = () => { if (o.guest) { const f = fairFeat(s, o.host, o.guest); o.fee = f.fee; o.split = f.split; } };
  const draw = () => {
    const songs = featSongs(s, o.host);
    if (!songs.some((x) => x.id === o.song)) o.song = songs[0]?.id ?? '';
    let targets = featTargets(s, o.host, 40);
    if (o.guest && !targets.some((x) => x.id === o.guest) && s.acts[o.guest]) targets = [s.acts[o.guest], ...targets];
    if (!o.guest) { o.guest = targets[0]?.id ?? ''; resetTerms(); }
    const fair = o.guest ? fairFeat(s, o.host, o.guest) : { fee: 0, split: 0 };
    const cl = o.guest ? clearance(s, o.guest, o.fee) : undefined;
    const p = o.song && o.guest ? featChance(s, o.song, o.guest, { fee: o.fee, split: o.split }) : 0;
    box.replaceChildren(h('div', { class: 'form' },
      h('label', null, t(l('Seu artista', 'Your act')), select(o.host, hosts.map((a) => ({ value: a.id, label: a.name })), (v) => { o.host = v; o.song = ''; resetTerms(); draw(); })),
      songs.length ? h('label', null, t(l('Música', 'Song')), select(o.song, songs.map((x) => ({ value: x.id, label: `${x.title} (Q ${Math.round(x.q)})` })), (v) => { o.song = v; draw(); }))
        : h('p', { class: 'warn small' }, t(l('Este artista não tem música inédita livre. Componha antes.', 'This act has no free unreleased song. Write one first.'))),
      h('label', null, t(l('Convidado', 'Guest')), select(o.guest, targets.map((a) => ({ value: a.id, label: `${a.name} · ${t(l('fama', 'fame'))} ${Math.round(a.fame)}${a.owner && s.labels[a.owner] ? ` · ${s.labels[a.owner].name}` : ''}` })), (v) => { o.guest = v; resetTerms(); draw(); })),
      h('label', null, `${t(l('Cachê', 'Fee'))} ($)`, h('input', { type: 'number', min: 0, step: 100, value: Math.round(o.fee / 100), onchange: (e: Event) => { o.fee = Math.max(0, Math.round(Number((e.target as HTMLInputElement).value) * 100)); draw(); } })),
      h('label', null, `${t(l('Royalties da faixa para o convidado', 'Track royalties to the guest'))} (%)`, h('input', { type: 'number', min: 0, max: 50, step: 1, value: Math.round(o.split * 100), onchange: (e: Event) => { o.split = Math.max(0, Math.min(0.5, Number((e.target as HTMLInputElement).value) / 100)); draw(); } })),
      h('div', { class: 'eval' },
        h('div', null, t(l('Referência', 'Reference')), `: ${$(fair.fee)} · ${pct(fair.split)} — `, t(S.chance), ': ', pill(t(S[band(p)]), band(p))),
        cl ? h('p', { class: cl.blocked ? 'bad small' : 'small' }, t(cl.text), cl.cost ? ` ${$(cl.cost)}` : '') : null,
        h('p', { class: 'muted small' }, t(l('Pesa: amizade ou rixa entre os artistas, diferença de fama, qualidade da música, gênero, sua reputação com artistas e os termos. Feats cruzam públicos e ajudam nas paradas.', 'What matters: friendship or feud between the artists, fame gap, song quality, genre, your reputation with artists and the terms. Features cross audiences and help on the charts.'))),
      ),
    ));
  };
  const show = (res: { result: FeatResult; text: L; deal?: { id: string } }) => {
    if (res.result === 'accepted') { toast(t(res.text), 'good'); close(); rerender(); return; }
    if (res.result === 'thinking' && res.deal) {
      const id = res.deal.id;
      reply.replaceChildren(h('p', null, pill(t(l('pensando', 'thinking')), 'warn'), ' ', t(res.text)), h('div', { class: 'row' },
        h('button', { class: 'btn small', onclick: () => show(pressFeat(s, rngOf(s), id)) }, t(l('Pressionar por uma resposta', 'Push for an answer'))),
        h('button', { class: 'btn small ghost', onclick: () => { close(); rerender(); } }, t(l('Esperar', 'Wait')))));
      return;
    }
    if (res.result === 'counter' && res.deal) {
      const id = res.deal.id;
      reply.replaceChildren(h('p', null, pill(t(l('contraproposta', 'counter')), 'warn'), ' ', t(res.text)), h('div', { class: 'row' },
        h('button', { class: 'btn small primary', onclick: () => { const e = acceptFeatCounter(s, id); if (e) toast(t(e), 'bad'); else { toast(t(l('Fechado! Participação gravada.', 'Deal! Feature recorded.')), 'good'); close(); rerender(); } } }, t(l('Aceitar', 'Accept'))),
        h('button', { class: 'btn small ghost', onclick: () => { dropFeatDeal(s, id); reply.replaceChildren(h('p', { class: 'muted small' }, t(l('Ajuste a proposta e envie de novo.', 'Adjust the offer and send it again.')))); } }, t(l('Ajustar e reenviar', 'Adjust and resend')))));
      return;
    }
    reply.replaceChildren(h('p', { class: res.result === 'invalid' ? 'warn' : 'bad' }, t(res.text)));
  };
  draw();
  close = modal(t(l('Negociar feat', 'Negotiate a feature')), h('div', null, box, h('div', { class: 'actions' },
    h('button', { class: 'btn primary', onclick: () => { if (!o.song || !o.guest) return toast(t(l('Escolha música e convidado.', 'Pick a song and a guest.')), 'bad'); show(proposeFeat(s, rngOf(s), o.song, o.guest, { fee: o.fee, split: o.split })); } }, t(l('Propor e ouvir a resposta', 'Propose and hear the answer'))), reply)), { wide: true });
}

function featsSection(s: GameState): HTMLElement | null {
  const mine = playerActs(s);
  if (!mine.length) return null;
  const st = feats(s);
  const open = st.deals.filter((d) => d.status !== 'done');
  const done = st.deals.filter((d) => d.status === 'done').slice(-8).reverse();
  const ties = mine.flatMap((id) => (s.acts[id] ? actTies(s, s.acts[id]) : [])).slice(0, 10);
  const soc = social(s);
  return section(t(l('Feats e relações', 'Features and relationships')),
    h('div', { class: 'row' }, h('button', { class: 'btn small primary', onclick: () => openFeatModal(s) }, t(l('Negociar um feat', 'Negotiate a feature')))),
    open.length ? h('ul', { class: 'small' }, open.map((d) => h('li', null, `"${d.title}" + `, actLink(s, d.guestActId), ' ',
      d.status === 'thinking' ? h('span', null, pill(t(l('pensando', 'thinking')), 'warn'), ' ', h('button', { class: 'btn small', onclick: () => { const res = pressFeat(s, rngOf(s), d.id); toast(t(res.text), res.result === 'accepted' ? 'good' : 'bad'); rerender(); } }, t(l('Pressionar', 'Push'))))
        : h('span', null, pill(`${t(l('contraproposta', 'counter'))}: ${$(d.counter?.fee ?? 0)} · ${pct(d.counter?.split ?? 0)}`, 'warn'), ' ',
          h('button', { class: 'btn small primary', onclick: () => say(acceptFeatCounter(s, d.id), l('Participação gravada.', 'Feature recorded.')) }, t(l('Aceitar', 'Accept'))),
          h('button', { class: 'btn small ghost', onclick: () => { dropFeatDeal(s, d.id); rerender(); } }, t(l('Recusar', 'Decline'))))))) : null,
    done.length ? h('ul', { class: 'small' }, done.map((d) => h('li', null, d.side === 'host' ? h('span', null, actLink(s, d.hostActId), ` "${d.title}" feat. `, actLink(s, d.guestActId)) : h('span', null, actLink(s, d.guestActId), ` ${t(l('em', 'on'))} "${d.title}" ${t(l('de', 'by'))} `, actLink(s, d.hostActId)),
      ` · ${$(d.fee)} · ${pct(d.split)}`, d.paid ? ` · ${t(l('royalties', 'royalties'))} ${$(d.paid)}` : ''))) : null,
    ties.length ? h('div', null, h('h4', null, t(l('Laços do seu elenco fora do selo', 'Your roster\'s ties outside the label'))),
      h('ul', { class: 'attr-list' }, ties.map(({ t: x, me }) => h('div', null, h('small', { class: 'muted' }, `${s.persons[me]?.name ?? ''} ↔ `), tieRow(s, x, me, () => {}))))) : null,
    soc.news.length ? h('div', null, h('h4', null, t(l('Na cena', 'On the scene'))), h('ul', { class: 'small' }, soc.news.slice().reverse().slice(0, 6).map((n) => h('li', null, `${n.y} · `, t(n.t))))) : null,
    h('p', { class: 'muted small' }, t(l('Convites de outros artistas chegam na caixa de entrada (tecla E).', 'Invites from other artists arrive in the inbox (E key).'))),
  );
}

registerSection('artists', { id: 'feats8', order: 56, render: featsSection });

