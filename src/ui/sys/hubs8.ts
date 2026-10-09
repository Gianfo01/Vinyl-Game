// Interface da rodada 8: páginas de festivais (datas, line-up, histórico, negociação e convites),
// de premiações (indicados, campanhas, convite para tocar, vencedores) e de críticos (região, gosto,
// notas que deu, relação com o selo).

import { FESTIVALS } from '../../data/catalog';
import { COUNTRY_INFO, countryInfoByA3 } from '../../data/countries';
import { countryName } from '../../data/geo';
import { FAMILIES, MARKETS, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { CRIT_ACTIONS, criticAction, relWith } from '../../sim/criticrel';
import { allCritics, criticByName, type CriticDef } from '../../sim/media';
import { REGIONAL_AWARDS } from '../../sim/awards2';
import { CAMPAIGN_COST, CEREMONY_MONTH, GRAMO_CATS, NOMS_MONTH, answerPerform, campaignBonus, cer8, eligible, nominees, runCampaign, type GramoCat } from '../../sim/sys/ceremonies8';
import { AWARD_CATS, awardName, ch7 } from '../../sim/sys/charts7';
import { TIER_NAME, TIER_ORDER, acceptInvite, declineInvite, editionOf, fest8, festActive, festCapacity, festFee, festMonth, festTierFor, pitchAct, withdraw, type FestTier, type PitchResult } from '../../sim/sys/fests8';
import { festForecast12 } from './explain12';
import type { GameState } from '../../sim/types';
import { money, playerActs, rngOf } from '../../sim/util';
import { existsNow } from '../../sim/future';
import { $, N, actLink, cityName, kv, modal, pill, releaseLink, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { registerSection } from '../registry';
import { store } from '../store';
import { ficha13 } from './persona13';

const MONTHS = [l('jan', 'Jan'), l('fev', 'Feb'), l('mar', 'Mar'), l('abr', 'Apr'), l('mai', 'May'), l('jun', 'Jun'), l('jul', 'Jul'), l('ago', 'Aug'), l('set', 'Sep'), l('out', 'Oct'), l('nov', 'Nov'), l('dez', 'Dec')];
const famName = (id: string) => t(FAMILIES.find((f) => f.id === id)?.name ?? l(id));
const g = () => store.game!;
const mineAct = (s: GameState, id: string) => playerActs(s).includes(id);

// ================================================================ festivais

const fui = { filter: 'year' as 'year' | 'mine' | 'all', sort: 'date' as 'date' | 'prestige' };

export function festivalsTab(s: GameState): HTMLElement {
  const st = fest8(s);
  let list = FESTIVALS.map((f, fi) => ({ f, fi, ed: editionOf(s, fi) })).filter((x) => festActive(x.f, s.year) || (fui.filter === 'all' && existsNow(s, x.f.start)));
  if (fui.filter === 'mine') list = list.filter((x) => x.ed?.lineup.some((sl) => mineAct(s, sl.actId)) || st.invites.some((i) => i.fi === x.fi));
  list.sort((a, b) => fui.sort === 'prestige' ? b.f.prestige - a.f.prestige : festMonth(a.f, a.fi) - festMonth(b.f, b.fi));
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(t(l('Festivais de {y}', 'Festivals of {y}'), { y: s.year }),
        h('p', { class: 'muted small' }, t(l('Cada festival tem data, foco, prestígio e line-up montado com artistas do mundo todo. Ofereça seus artistas (a resposta é na hora) ou espere convites. Na data, quem toca ganha cachê, fama e fãs.', 'Each festival has a date, focus, prestige and a line-up built from artists worldwide. Pitch your acts (instant answer) or wait for invitations. On the date, performers earn a fee, fame and fans.'))),
        h('div', { class: 'row wrap' },
          select(fui.filter, [{ value: 'year', label: t(l('Edições deste ano', 'This year\'s editions')) }, { value: 'mine', label: t(l('Com artistas meus ou convites', 'With my acts or invitations')) }, { value: 'all', label: t(l('Todos (inclusive extintos)', 'All (incl. defunct)')) }], (v) => { fui.filter = v as typeof fui.filter; rerender(); }),
          select(fui.sort, [{ value: 'date', label: t(l('Por data', 'By date')) }, { value: 'prestige', label: t(l('Por prestígio', 'By prestige')) }], (v) => { fui.sort = v as typeof fui.sort; rerender(); }),
        ),
        h('table', { class: 'tbl compact' },
          h('thead', null, h('tr', null, h('th', null, t(l('Mês', 'Month'))), h('th', null, t(l('Festival', 'Festival'))), h('th', null, t(l('Cidade', 'City'))), h('th', null, t(l('Prestígio', 'Prestige'))), h('th', null, 'Headliners'), h('th', null, ''))),
          h('tbody', null, list.map(({ f, fi, ed }) => {
            const heads = ed?.lineup.filter((x) => x.tier === 'headline').map((x) => s.acts[x.actId]?.name).filter(Boolean) ?? [];
            const mine = ed?.lineup.filter((x) => mineAct(s, x.actId)) ?? [];
            return h('tr', { class: mine.length ? 'mine' : '' },
              h('td', null, t(MONTHS[festMonth(f, fi)])),
              h('td', null, h('button', { class: 'link', onclick: () => openFestivalPage(fi) }, f.name)),
              h('td', null, cityName(f.city)),
              h('td', null, bar(f.prestige, 100)),
              h('td', { class: 'small' }, heads.join(', ') || (festActive(f, s.year) ? '—' : t(l('extinto', 'defunct')))),
              h('td', null, ed?.done ? pill(t(l('aconteceu', 'happened'))) : mine.length ? pill(t(l('você toca', 'you play')), 'good') : st.invites.some((i) => i.fi === fi) ? pill(t(l('convite', 'invitation')), 'gold') : null),
            );
          })),
        ),
      ),
    ),
    h('aside', { class: 'col-side' }, invitesBox(s)),
  );
}

function invitesBox(s: GameState): HTMLElement {
  const st = fest8(s);
  return section(t(l('Convites de festivais', 'Festival invitations')),
    st.invites.length ? h('ul', { class: 'small' }, st.invites.map((inv) => h('li', null,
      h('button', { class: 'link', onclick: () => openFestivalPage(inv.fi) }, FESTIVALS[inv.fi]?.name), ': ', actLink(s, inv.actId), ` — ${t(TIER_NAME[inv.tier])} · ${$(inv.fee)} `,
      h('button', { class: 'btn small primary', onclick: () => { const e = acceptInvite(s, inv.id); toast(e ? t(e) : t(l('Confirmado no line-up.', 'Confirmed on the line-up.')), e ? 'bad' : 'good'); rerender(); } }, t(l('Aceitar', 'Accept'))),
      h('button', { class: 'btn small ghost', onclick: () => { declineInvite(s, inv.id); rerender(); } }, t(l('Recusar', 'Decline'))),
    ))) : h('p', { class: 'muted small' }, t(l('Nenhum convite agora. Festivais convidam de 1 a 4 meses antes da data, conforme fama, rede e o seu booking.', 'No invitations now. Festivals invite 1–4 months ahead, based on fame, network and your booking staff.'))),
  );
}

export function openFestivalPage(fi: number): void {
  const s = g();
  const f = FESTIVALS[fi];
  if (!f) return;
  let close = () => {};
  const draw = () => {
    const st = fest8(s);
    const ed = editionOf(s, fi);
    const past = st.past[fi] ?? [];
    const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
    const form = { actId: mine[0]?.id ?? '', tier: 'afternoon' as FestTier, fee: 0 };
    const reply = h('div', { class: 'eval' });
    const feeInput = h('input', { type: 'number', min: 0, step: 50 }) as HTMLInputElement;
    const refreshFee = () => { const a = s.acts[form.actId]; if (a) { form.fee = festFee(s, f, a, form.tier); feeInput.value = String(Math.round(form.fee / 100)); } };
    feeInput.oninput = () => { form.fee = Math.max(0, Math.round(Number(feeInput.value) * 100)); };
    refreshFee();
    const showReply = (res: PitchResult) => {
      reply.replaceChildren(h('p', { class: res.result === 'accepted' ? 'good' : res.result === 'rejected' ? 'bad' : '' }, t(res.text)),
        ...(res.result === 'counter' && res.tier && res.fee ? [h('button', { class: 'btn small primary', onclick: () => { const r2 = pitchAct(s, rngOf(s), fi, form.actId, res.tier!, res.fee!); toast(t(r2.text), r2.result === 'accepted' ? 'good' : 'bad'); close(); openFestivalPage(fi); rerender(); } }, t(l('Aceitar a contraproposta', 'Accept the counter-offer')))] : []));
    };
    const tierBlock = (tier: FestTier) => {
      const slots = ed?.lineup.filter((x) => x.tier === tier) ?? [];
      return h('div', null, h('h4', null, t(TIER_NAME[tier])), slots.length ? h('div', { class: 'chips' }, slots.map((x) => h('span', { class: `chip ${mineAct(s, x.actId) ? 'good' : ''}` }, actLink(s, x.actId), mineAct(s, x.actId) && !ed?.done ? h('button', { class: 'link small', title: t(l('Cancelar (multa de 25% do cachê)', 'Cancel (25% fee penalty)')), onclick: () => { if (confirm(t(l('Cancelar a participação? Multa de 25% do cachê e o festival não chama de novo tão cedo.', 'Cancel the appearance? 25% fee penalty and the festival will not call again soon.')))) { withdraw(s, fi, x.actId); close(); openFestivalPage(fi); rerender(); } } }, ' ✕') : null))) : h('p', { class: 'muted small' }, '—'));
    };
    const body = h('div', { class: 'ficha' },
      h('div', { class: 'grid2' },
        h('div', null,
          kv(t(l('Tipo', 'Type')), t(f.kind)),
          kv(t(l('Cidade', 'City')), cityName(f.city)),
          kv(t(l('Data', 'Date')), `${t(MONTHS[festMonth(f, fi)])} ${s.year}`),
          kv(t(l('Desde', 'Since')), `${f.start}${f.end ? `–${f.end}` : ''}`),
          kv(t(l('Público por edição', 'Crowd per edition')), N(festCapacity(f))),
        ),
        h('div', null,
          kv(t(l('Prestígio', 'Prestige')), h('span', null, bar(f.prestige, 100), ` ${f.prestige}`)),
          f.reputation !== undefined ? kv(t(l('Reputação com o público', 'Public reputation')), f.reputation) : null,
          kv(t(l('Foco', 'Focus')), f.focus.length ? f.focus.map(famName).join(', ') : t(l('todos os gêneros', 'all genres'))),
          f.realRef && !s.config.realNames ? kv(t(l('Inspirado em', 'Inspired by')), f.realRef) : null,
          f.scouting ? kv(t(l('Vitrine', 'Showcase')), t(l('bom para descobrir e mostrar artistas novos', 'good to discover and show new acts'))) : null,
        ),
      ),
      f.identity ? h('p', { class: 'small' }, t(f.identity)) : null,
      ed ? section(t(l('Line-up {y}', 'Line-up {y}'), { y: s.year }) + (ed.done ? ` — ${t(l('público', 'crowd'))} ${N(ed.crowd ?? 0)}` : ''), ...TIER_ORDER.map(tierBlock)) : h('p', { class: 'muted' }, t(l('Sem edição neste ano.', 'No edition this year.'))),
      ed && !ed.done && ed.month > s.month && mine.length ? section(t(l('Oferecer um artista seu', 'Pitch one of your acts')),
        h('div', { class: 'form' },
          h('label', null, t(l('Artista', 'Act')), select(form.actId, mine.map((a) => ({ value: a.id, label: `${a.name} (★${Math.round(a.fame)}) — ${festTierFor(s, f, fi, a) ? t(TIER_NAME[festTierFor(s, f, fi, a)!]) : t(l('fora do perfil', 'not a fit'))}` })), (v) => { form.actId = v; refreshFee(); })),
          h('label', null, t(l('Faixa pedida', 'Slot requested')), select(form.tier, TIER_ORDER.map((x) => ({ value: x, label: t(TIER_NAME[x]) })), (v) => { form.tier = v; refreshFee(); })),
          h('label', null, t(l('Cachê pedido ($)', 'Fee requested ($)')), feeInput),
          h('button', { class: 'btn primary', onclick: () => showReply(pitchAct(s, rngOf(s), fi, form.actId, form.tier, form.fee)) }, t(l('Negociar', 'Negotiate'))),
          festForecast12(s, fi, form),
          reply,
          h('small', { class: 'muted' }, t(l('O festival olha fama, rede, seu booking e se o artista já tocou lá. Pedir faixa acima do possível gera contraproposta; cachê muito alto, recusa.', 'The festival weighs fame, network, your booking staff and past appearances. Asking for a higher slot brings a counter-offer; a very high fee, a refusal.'))),
        )) : null,
      past.length ? section(t(l('Edições anteriores', 'Past editions')), h('table', { class: 'tbl compact' }, h('tbody', null, past.map((p) => h('tr', null, h('td', null, p.year), h('td', null, p.head.join(', ')), h('td', null, N(p.crowd)), h('td', null, p.mine.length ? pill(p.mine.join(', '), 'good') : '')))))) : null,
    );
    close = modal(f.name, body, { wide: true });
  };
  draw();
}

// ================================================================ premiações

interface CeremonyRow { id: string; name: string; month: number; kind: L; cats: string[]; desc: L; country?: string }

function ceremonies(s: GameState): CeremonyRow[] {
  const out: CeremonyRow[] = [
    { id: 'gramo', name: s.config.realNames ? 'Grammy Awards' : t(l('Gramófonos de Ouro', 'Golden Gramophones')), month: CEREMONY_MONTH, kind: l('Principal (mundo)', 'Main (world)'), cats: GRAMO_CATS.map((c) => c.id), desc: l('Indicados anunciados em outubro; a cerimônia é em dezembro. Campanhas podem ajudar.', 'Nominees announced in October; the ceremony is in December. Campaigns can help.') },
    { id: 'critics', name: t(l('Prêmio da Crítica', 'Critics\' Prize')), month: 11, kind: l('Crítica', 'Critics'), cats: ['critics'], desc: l('Vai para o disco com a melhor média de resenhas do ano.', 'Goes to the record with the best review average of the year.') },
    { id: 'industry', name: t(l('Prêmios da Indústria', 'Industry Awards')), month: 11, kind: l('Indústria', 'Industry'), cats: ['label_year', 'producer_year', 'live_act'], desc: l('Selo do ano (receita), produtor do ano (hits) e ato ao vivo do ano (público em turnê).', 'Label of the year (revenue), producer of the year (hits) and live act of the year (tour crowds).') },
  ];
  for (const m of MARKETS) {
    const def = REGIONAL_AWARDS[m.id];
    if (def) out.push({ id: def.id, name: s.config.realNames && def.realRef ? def.realRef : t(def.name), month: 11, kind: l('Regional', 'Regional'), cats: [def.id], desc: l('Vai para quem lidera a parada da região no fim do ano.', 'Goes to the region\'s chart leader at year end.') });
  }
  for (const c of COUNTRY_INFO) if (c.award && c.award[2] <= s.year) out.push({ id: `nat_${c.a3}`, name: awardName(s, c), month: 11, kind: fmtKind(c.a3), cats: [], desc: l('Artista, música, álbum e revelação do ano pelo consumo no país.', 'Artist, song, album and newcomer of the year by consumption in the country.'), country: c.a3 });
  return out;
}

const fmtKind = (a3: string): L => ({ pt: `Nacional — ${countryName(a3).pt}`, en: `National — ${countryName(a3).en}` });

const cui = { filter: 'main' as 'main' | 'national' | 'mine' };

export function ceremoniesTab(s: GameState): HTMLElement {
  const all = ceremonies(s);
  const myWins = (c: CeremonyRow) => c.country ? ch7(s).awards.filter((a) => a.a3 === c.country && a.byPlayer).length : s.awards.filter((a) => c.cats.includes(a.category) && a.byPlayer).length;
  const list = all.filter((c) => cui.filter === 'main' ? !c.country : cui.filter === 'national' ? !!c.country : myWins(c) > 0);
  return section(t(l('Premiações', 'Award ceremonies')),
    h('p', { class: 'muted small' }, t(l('Cada premiação tem data, regras e histórico. Nos Gramófonos de Ouro os indicados saem em outubro e você pode fazer campanha.', 'Each ceremony has a date, rules and history. For the Golden Gramophones, nominees come out in October and you can campaign.'))),
    h('div', { class: 'row wrap' }, select(cui.filter, [{ value: 'main', label: t(l('Mundiais, crítica, indústria e regionais', 'World, critics, industry and regional')) }, { value: 'national', label: t(l('Nacionais (por país)', 'National (by country)')) }, { value: 'mine', label: t(l('Onde já ganhei', 'Where I have won')) }], (v) => { cui.filter = v as typeof cui.filter; rerender(); })),
    h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(l('Premiação', 'Ceremony'))), h('th', null, t(l('Tipo', 'Type'))), h('th', null, t(l('Mês', 'Month'))), h('th', null, t(l('Seus prêmios', 'Your awards'))))),
      h('tbody', null, list.map((c) => h('tr', null, h('td', null, h('button', { class: 'link', onclick: () => openCeremonyPage(c.id) }, c.name)), h('td', null, t(c.kind)), h('td', null, t(MONTHS[c.month])), h('td', null, myWins(c) || '—'))))),
  );
}

export function openCeremonyPage(id: string): void {
  const s = g();
  const c = ceremonies(s).find((x) => x.id === id);
  if (!c) return;
  let close = () => {};
  const draw = () => {
    const blocks: (HTMLElement | null)[] = [kv(t(l('Tipo', 'Type')), t(c.kind)), kv(t(l('Cerimônia', 'Ceremony')), `${t(MONTHS[c.month])} ${s.year}`), h('p', { class: 'small' }, t(c.desc))];
    if (c.id === 'gramo') {
      const st = cer8(s);
      const announced = st.noms?.year === s.year;
      blocks.push(h('p', { class: 'small muted' }, announced ? t(l('Indicados de {y} anunciados.', '{y} nominees announced.'), { y: s.year }) : t(l('Os indicados saem em {m}. Até lá, uma campanha melhora as chances de indicação.', 'Nominees come out in {m}. Until then, a campaign improves nomination chances.'), { m: t(MONTHS[NOMS_MONTH]) })));
      for (const cat of GRAMO_CATS) {
        const ids = nominees(s, cat.id) ?? [];
        blocks.push(section(`${t(cat.name)} — ${t(cat.rule)}`,
          ids.length ? h('ol', { class: 'small' }, ids.map((rid) => { const r = s.releases[rid]; return r ? h('li', { class: mineAct(s, r.actId) || r.owner === 'player' ? 'mine' : '' }, releaseLink(s, rid), ' — ', actLink(s, r.actId), campaignBonus(s, rid, cat.id) ? pill(t(l('em campanha', 'campaigning')), 'gold') : null) : null; })) : h('p', { class: 'muted small' }, announced ? '—' : t(l('Indicados ainda não anunciados.', 'Nominees not announced yet.'))),
          campaignBox(s, cat.id, () => { close(); draw(); }),
        ));
      }
      const perf = st.perform.find((p) => p.year === s.year);
      if (perf) blocks.push(section(t(l('Convite para tocar na cerimônia', 'Invitation to play at the ceremony')),
        h('p', { class: 'small' }, actLink(s, perf.actId), ' ', perf.accepted === undefined ? t(l('foi convidado. Tocar ao vivo dá fama e fãs, mas cansa.', 'was invited. Playing live brings fame and fans, but is tiring.')) : perf.accepted ? t(l('vai tocar.', 'will play.')) : t(l('recusou.', 'declined.'))),
        perf.accepted === undefined ? h('div', { class: 'row' }, h('button', { class: 'btn small primary', onclick: () => { answerPerform(s, perf.actId, true); close(); draw(); rerender(); } }, t(l('Aceitar', 'Accept'))), h('button', { class: 'btn small ghost', onclick: () => { answerPerform(s, perf.actId, false); close(); draw(); } }, t(l('Recusar', 'Decline')))) : null));
    }
    if (c.country) {
      const a3 = c.country;
      const yu = ch7(s).yearUnits[a3] ?? {};
      const fav = Object.entries(yu).map(([rid, u]) => ({ rid, u })).filter((x) => s.releases[x.rid]).sort((a, b) => b.u - a.u).slice(0, 5);
      blocks.push(section(t(l('Favoritos até agora ({y})', 'Front-runners so far ({y})'), { y: s.year }), fav.length ? h('ol', { class: 'small' }, fav.map((x) => h('li', null, releaseLink(s, x.rid), ' — ', actLink(s, s.releases[x.rid].actId), ` (${N(x.u)})`))) : h('p', { class: 'muted small' }, '—')));
      const hist = ch7(s).awards.filter((a) => a.a3 === a3).slice(-40).reverse();
      blocks.push(section(t(l('Vencedores', 'Winners')), hist.length ? h('table', { class: 'tbl compact' }, h('tbody', null, hist.map((a) => h('tr', { class: a.byPlayer ? 'mine' : '' }, h('td', null, a.year), h('td', null, t(AWARD_CATS[a.cat])), h('td', null, a.actId ? actLink(s, a.actId, a.relId ? ` — ${s.releases[a.relId]?.title ?? ''}` : '') : a.winner))))) : h('p', { class: 'muted small' }, t(l('Ainda sem vencedores na partida.', 'No winners yet in this run.')))));
      const info = countryInfoByA3[a3];
      if (info?.award) blocks.push(h('p', { class: 'muted small' }, t(l('Criado em {y}.', 'Created in {y}.'), { y: info.award[2] })));
    } else {
      const hist = s.awards.filter((a) => (c.id === 'gramo' ? GRAMO_CATS.some((x) => x.id === a.category) : c.cats.includes(a.category))).slice(-48).reverse();
      blocks.push(section(t(l('Vencedores', 'Winners')), hist.length ? h('table', { class: 'tbl compact' }, h('tbody', null, hist.map((a) => h('tr', { class: a.byPlayer ? 'mine' : '' }, h('td', null, a.year), h('td', null, t(GRAMO_CATS.find((x) => x.id === a.category)?.name ?? l(''))), h('td', null, a.releaseId && s.releases[a.releaseId] ? releaseLink(s, a.releaseId) : a.name), h('td', null, a.actId ? actLink(s, a.actId) : ''))))) : h('p', { class: 'muted small' }, t(l('Ainda sem vencedores na partida.', 'No winners yet in this run.')))));
    }
    close = modal(c.name, h('div', { class: 'ficha' }, ...blocks), { wide: true });
  };
  draw();
}

function campaignBox(s: GameState, cat: GramoCat, redraw: () => void): HTMLElement | null {
  if (s.month >= CEREMONY_MONTH) return null;
  const mine = Object.values(s.releases).filter((r) => (r.owner === 'player' || s.acts[r.actId]?.playerBand) && eligible(s, cat, r));
  if (!mine.length) return h('p', { class: 'muted small' }, t(l('Nenhum lançamento seu concorre aqui este ano.', 'None of your releases is eligible here this year.')));
  const pick = { rel: mine[0].id, lv: 1 };
  return h('div', { class: 'row wrap small' },
    t(l('Campanha:', 'Campaign:')), ' ',
    select(pick.rel, mine.map((r) => ({ value: r.id, label: r.title })), (v) => (pick.rel = v)),
    select('1', CAMPAIGN_COST.map((c, i) => ({ value: String(i + 1), label: `${[t(l('Discreta', 'Low-key')), t(l('Forte', 'Strong')), t(l('Agressiva (risco de crítica)', 'Aggressive (backlash risk)'))][i]} · ${$(money(s, c))}` })), (v) => (pick.lv = Number(v))),
    h('button', { class: 'btn small', onclick: () => { const e = runCampaign(s, rngOf(s), pick.rel, cat, pick.lv); toast(e ? t(e) : t(l('Campanha no ar.', 'Campaign running.')), e ? 'bad' : 'good'); if (!e) { redraw(); rerender(); } } }, t(l('Fazer campanha', 'Run campaign'))),
  );
}

// ================================================================ críticos

const kui = { region: 'all', era: 'now' as 'now' | 'all' };

const regionName = (r: CriticDef['region']) => (!r || r === 'global' ? t(l('Internacional', 'International')) : t(MARKETS.find((m) => m.id === r)?.name ?? l(r)));

function reviewsBy(s: GameState, name: string) {
  const out: { relId: string; score: number }[] = [];
  for (const [relId, list] of Object.entries(s.reviews)) for (const rv of list) if (rv.critic === name) out.push({ relId, score: rv.score });
  return out;
}

export function criticsTab(s: GameState): HTMLElement {
  const list = allCritics().filter((c) => c.from <= s.year && (kui.era === 'all' || c.to >= s.year) && (kui.region === 'all' || (c.region ?? 'global') === kui.region)).sort((a, b) => b.prestige - a.prestige);
  return section(t(l('Críticos', 'Critics')),
    h('p', { class: 'muted small' }, t(l('Cada região tem seus veículos e críticos, com gostos próprios. Quem resenha um disco depende de onde o artista é e onde o disco saiu. Sua relação com cada crítico pesa um pouco nas notas.', 'Each region has its outlets and critics with their own tastes. Who reviews a record depends on where the act is from and where it came out. Your relationship with each critic slightly affects scores.'))),
    h('div', { class: 'row wrap' },
      select(kui.region, [{ value: 'all', label: t(l('Todas as regiões', 'All regions')) }, { value: 'global', label: t(l('Internacional', 'International')) }, ...MARKETS.map((m) => ({ value: m.id, label: t(m.name) }))], (v) => { kui.region = v; rerender(); }),
      select(kui.era, [{ value: 'now', label: t(l('Ativos agora', 'Active now')) }, { value: 'all', label: t(l('Inclusive os aposentados', 'Including retired')) }], (v) => { kui.era = v as typeof kui.era; rerender(); }),
    ),
    h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(l('Crítico', 'Critic'))), h('th', null, t(l('Veículo', 'Outlet'))), h('th', null, t(l('Região', 'Region'))), h('th', null, t(l('Gosta de', 'Likes'))), h('th', null, t(l('Rigor', 'Harshness'))), h('th', null, t(l('Relação', 'Relationship'))))),
      h('tbody', null, list.map((c) => h('tr', null,
        h('td', null, h('button', { class: 'link', onclick: () => openCriticPage(c.name) }, c.name)),
        h('td', { class: 'small' }, outletName(s, c)),
        h('td', { class: 'small' }, regionName(c.region)),
        h('td', { class: 'small' }, c.favors.map(famName).join(', ')),
        h('td', null, bar(c.harsh * 100, 100)),
        h('td', null, relPill(relWith(s, c.name))),
      ))),
    ),
  );
}

const outletName = (s: GameState, c: CriticDef) => (s.config.realNames && c.realRef ? `${c.outlet} (≈ ${c.realRef})` : c.outlet);
const relPill = (v: number) => pill(v >= 20 ? t(l('simpatia', 'friendly')) : v <= -20 ? t(l('inimizade', 'hostile')) : t(l('neutra', 'neutral')), v >= 20 ? 'good' : v <= -20 ? 'bad' : '');

export function openCriticPage(name: string): void {
  const s = g();
  const c = criticByName(name);
  if (!c) return;
  let close = () => {};
  const draw = () => {
    const given = reviewsBy(s, name);
    const avg = given.length ? given.reduce((t0, x) => t0 + x.score, 0) / given.length : 0;
    const mine = given.filter((x) => { const r = s.releases[x.relId]; return r && (r.owner === 'player' || s.acts[r.actId]?.playerBand); });
    const body = h('div', { class: 'ficha' },
      h('div', { class: 'grid2' },
        h('div', null,
          kv(t(l('Veículo', 'Outlet')), outletName(s, c)),
          kv(t(l('Região', 'Region')), regionName(c.region)),
          kv(t(l('Na ativa', 'Active')), `${c.from}–${c.to}`),
          kv(t(l('Prestígio', 'Prestige')), h('span', null, bar(c.prestige, 100), ` ${c.prestige}`)),
        ),
        h('div', null,
          kv(t(l('Gosta de', 'Likes')), c.favors.map(famName).join(', ') || '—'),
          kv(t(l('Não gosta de', 'Dislikes')), c.dislikes.map(famName).join(', ') || '—'),
          kv(t(l('Perfil', 'Profile')), c.mainstream > 0.3 ? t(l('popular, gosta de sucesso', 'mainstream, likes hits')) : c.mainstream < -0.3 ? t(l('underground, desconfia de hits', 'underground, wary of hits')) : t(l('equilibrado', 'balanced'))),
          kv(t(l('Rigor', 'Harshness')), h('span', null, bar(c.harsh * 100, 100))),
        ),
      ),
      section(t(l('Relação com o seu selo', 'Relationship with your label')),
        h('p', null, relPill(relWith(s, name)), ` ${relWith(s, name) > 0 ? '+' : ''}${relWith(s, name)}`),
        h('div', { class: 'row wrap' }, CRIT_ACTIONS.map((a) => h('button', { class: 'btn small', title: t(a.desc), onclick: () => { const e = criticAction(s, rngOf(s), name, a.id); toast(e ? t(e) : t(l('Feito.', 'Done.')), e ? 'bad' : 'good'); if (!e) { close(); draw(); rerender(); } } }, `${t(a.name)}${a.cost ? ` · ${$(money(s, a.cost))}` : ''}`))),
      ),
      section(t(l('Ficha completa', 'Full profile')), ficha13(s, `c:${name}`, () => { close(); draw(); })),
      section(t(l('Notas que deu', 'Scores given')) + (given.length ? ` — ${t(l('média', 'average'))} ${avg.toFixed(1)}` : ''),
        given.length ? h('table', { class: 'tbl compact' }, h('tbody', null, given.slice(-25).reverse().map((x) => h('tr', { class: mine.includes(x) ? 'mine' : '' }, h('td', null, releaseLink(s, x.relId)), h('td', null, actLink(s, s.releases[x.relId]?.actId)), h('td', null, h('b', null, x.score.toFixed(1))))))) : h('p', { class: 'muted small' }, t(l('Nenhuma resenha guardada ainda.', 'No stored reviews yet.'))),
      ),
    );
    close = modal(name, body, { wide: true });
  };
  draw();
}

// ================================================================ registro


// convites pendentes também aparecem na mesa
registerSection('desk', { id: 'invites8', order: 20, render: (s) => {
  const st = fest8(s);
  const perf = cer8(s).perform.find((p) => p.year === s.year && p.accepted === undefined);
  if (!st.invites.length && !perf) return null;
  return section(t(l('Convites', 'Invitations')),
    st.invites.length ? invitesBox(s) : null,
    perf ? h('p', { class: 'small' }, actLink(s, perf.actId), ' ', t(l('foi convidado para tocar nos Gramófonos de Ouro.', 'was invited to play at the Golden Gramophones.')), ' ', h('button', { class: 'btn small', onclick: () => openCeremonyPage('gramo') }, t(l('Responder', 'Respond')))) : null,
  );
} });

