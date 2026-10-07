// Artistas: elenco, carreira em 3 eixos, estados, agenda de 4 slots, contrato (GDD §9, §11).

import { AGENDA_ACTIONS, agendaById } from '../../data/people';
import { APPROACHES, STUDIO_TIERS, VENUE_TIERS } from '../../data/rules';
import { l } from '../../data/world';
import { S, t } from '../../i18n/strings';
import { defaultAgenda, slotCost, slotsFor, usedSlots } from '../../sim/agenda';
import { raiseRoyalty, renewContract } from '../../sim/contracts';
import { maxVenueTier } from '../../sim/live';
import { actState } from '../../sim/people';
import type { AgendaSlot, GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { $, N, actLink, genreName, cityName, kv, logo, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { openAct } from '../ficha';
import { store } from '../store';
import { playPreview } from '../audio';

export function artistsPanel(s: GameState): HTMLElement {
  const ids = playerActs(s);
  if (!ids.length) return h('div', { class: 'panel' }, section(t(S.roster), h('p', null, t(S.noActs))));
  if (!store.selectedAct || !ids.includes(store.selectedAct)) store.selectedAct = ids[0];
  const a = s.acts[store.selectedAct];
  const list = h('ul', { class: 'roster' }, ids.map((id) => {
    const x = s.acts[id];
    return h('li', { class: id === a.id ? 'sel' : '', onclick: () => { store.selectedAct = id; rerender(); } },
      logo(x, 32), h('div', null, h('b', null, x.name), h('small', { class: 'muted' }, `${genreName(x.genre)} · ${t(S.fame)} ${Math.round(x.fame)}`)),
      x.status === 'hiatus' ? pill('⏸') : null,
    );
  }));
  const st = actState(s, a);
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  const delegated = s.delegated[a.id] !== false;
  const slots: AgendaSlot[] = delegated ? defaultAgenda(s, a) : [...(s.agenda[a.id] ?? [])];
  const max = slotsFor(a);
  const commit = (next: AgendaSlot[]) => {
    s.agenda[a.id] = next;
    s.delegated[a.id] = false;
    rerender();
  };
  const slotEditor = (slot: AgendaSlot, idx: number) => {
    const params: HTMLElement[] = [];
    if (slot.action === 'gigs') {
      const mt = maxVenueTier(s, a);
      params.push(select(Number(slot.params?.tier ?? 0), VENUE_TIERS.map((v) => ({ value: v.id, label: t(v.name), disabled: v.id > mt })), (v) => { slot.params = { ...slot.params, tier: v }; commit(slots); }));
      params.push(select(Number(slot.params?.dates ?? 4), [1, 2, 4, 6, 8, 12].map((d) => ({ value: d, label: `${d} ${t(S.dates).toLowerCase()}` })), (v) => { slot.params = { ...slot.params, dates: v }; commit(slots); }));
    }
    if (slot.action === 'record') {
      params.push(select(Number(slot.params?.tier ?? 0), STUDIO_TIERS.map((x) => ({ value: x.id, label: `${t(x.name)}${x.cost ? ' · ' + $(money(s, x.cost)) : ''}` })), (v) => { slot.params = { ...slot.params, tier: v }; commit(slots); }));
      params.push(select(String(slot.params?.approach ?? 'balanced'), APPROACHES.map((x) => ({ value: x.id, label: t(x.name) })), (v) => { slot.params = { ...slot.params, approach: v }; commit(slots); }));
    }
    if (slot.action === 'reposition') {
      params.push(select(String(slot.params?.target ?? 'crossover'), [{ value: 'crossover', label: t(S.crossover) }, { value: 'underground', label: t(S.underground) }], (v) => { slot.params = { ...slot.params, target: v }; commit(slots); }));
    }
    const def = agendaById[slot.action];
    return h('li', { class: 'slot' },
      h('b', null, t(def?.name)), slotCost(slot.action) > 1 ? pill(`×${slotCost(slot.action)}`) : null,
      def?.cost ? h('span', { class: 'muted small' }, ` ${$(money(s, def.cost))}`) : null,
      ...params,
      h('small', { class: 'muted' }, t(def?.desc)),
      h('button', { class: 'icon', 'aria-label': 'remover', onclick: () => commit(slots.filter((_, i) => i !== idx)) }, '✕'),
    );
  };
  const free = max - usedSlots(slots);
  const addSel = select('', [{ value: '', label: `+ ${t(S.addAction)}` }, ...AGENDA_ACTIONS.filter((x) => slotCost(x.id) <= free).map((x) => ({ value: x.id, label: t(x.name) }))], (v) => {
    if (!v) return;
    const p: AgendaSlot = { action: v };
    if (v === 'gigs') p.params = { tier: Math.min(maxVenueTier(s, a), 2), dates: 4 };
    if (v === 'record') p.params = { tier: s.player.hq >= 1 ? 0 : 1, approach: 'balanced' };
    commit([...slots, p]);
  }, { disabled: free <= 0 });
  const unrec = a.songs.filter((id) => s.songs[id] && !s.songs[id].recorded).length;
  const ready = a.songs.filter((id) => s.songs[id]?.recorded && !s.songs[id].releaseId).length;
  return h('div', { class: 'panel artists' },
    h('aside', { class: 'col-side' }, section(`${t(S.roster)} (${ids.length})`, list)),
    h('div', { class: 'col-main' },
      section(a.name,
        h('div', { class: 'ficha-head' }, logo(a, 64),
          h('div', null,
            h('div', null, `${genreName(a.genre)} · ${cityName(a.city)} · `, pill(a.status)),
            h('div', null, h('button', { class: 'link', onclick: () => openAct(a.id) }, t(S.inspect)), ' · ', h('button', { class: 'link', onclick: () => playPreview(a.logoSeed, a.genre, s.year) }, t(S.preview))),
          ),
        ),
        h('div', { class: 'grid3' },
          kv(t(S.fame), h('span', null, Math.round(a.fame), ' ', bar(a.fame))),
          kv(t(S.momentum), h('span', null, Math.round(a.momentum), ' ', bar(a.momentum))),
          kv(t(S.positioning), h('span', null, bar(a.positioning), h('small', { class: 'muted' }, a.positioning < 40 ? ` ${t(S.underground)}` : a.positioning > 60 ? ` ${t(S.crossover)}` : ''))),
          kv(t(S.morale), bar(st.morale, 100, 'good')),
          kv(t(S.fatigue), bar(st.fatigue, 100, 'warn')),
          kv(t(S.stress), bar(st.stress, 100, 'bad')),
          kv(t(S.inspiration), bar(st.inspiration)),
          a.playerBand ? null : kv(t(S.trust), bar(a.trust)),
          kv(t(S.fans), `${N(a.fans.casual)} / ${N(a.fans.active)} / ${N(a.fans.core)}`),
        ),
        h('p', { class: 'small muted' }, t(l('Músicas escritas: {u} · gravadas inéditas: {r} · lançamentos: {n}', 'Written songs: {u} · recorded unreleased: {r} · releases: {n}'), { u: unrec, r: ready, n: a.releases.length })),
      ),
      section(`${t(S.agenda)} — ${usedSlots(slots)}/${max} ${t(S.slots)}`,
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: delegated, onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; s.delegated[a.id] = on ? true : false; if (!on) s.agenda[a.id] = defaultAgenda(s, a); rerender(); } }), t(S.delegate)),
        h('ul', { class: 'slots' }, delegated ? slots.map((x) => h('li', { class: 'slot muted' }, t(agendaById[x.action]?.name))) : slots.map(slotEditor)),
        delegated ? null : addSel,
        h('p', { class: 'muted small' }, t(l('Ações repetidas no mês rendem menos (retorno decrescente). Artistas com controle criativo podem trocar uma ação.', 'Repeated actions in a month yield less (diminishing returns). Artists with creative control may swap an action.'))),
      ),
      c ? section(t(S.contract),
        kv(t(S.model), c.party === 'player' ? c.model : `${c.model} — ${s.labels[c.party]?.name ?? ''}`),
        kv(t(S.royalty), `${Math.round(c.royalty * 100)}%`),
        kv(t(S.recoup), $(c.recoupBalance)),
        kv(t(S.ends), `${Math.max(0, Math.round((c.endWeek - s.week) / 4.35))} ${t(l('meses', 'months'))}`),
        kv(t(S.releasesOwed), `${c.releasesDone}/${c.releasesOwed}`),
        c.promises.length ? kv(t(S.promises), h('span', null, c.promises.map((p) => pill(`${p.kind}${p.kept === undefined ? '' : p.kept ? ' ✓' : ' ✗'}`, p.kept === false ? 'bad' : '')))) : null,
        c.party === 'player' && !a.playerBand ? h('div', { class: 'actions' },
          h('button', { class: 'btn', onclick: () => { const bonus = money(s, 1500 + a.fame * a.fame * 15); if (!renewContract(s, a.id, 36, bonus)) toast(t(l('Renovação recusada ou sem caixa.', 'Renewal refused or no cash.')), 'bad'); rerender(); } }, `${t(S.renew)} (36m, ${$(money(s, 1500 + a.fame * a.fame * 15))})`),
          h('button', { class: 'btn ghost', onclick: () => { raiseRoyalty(s, a.id, 0.02); rerender(); } }, t(S.raiseRoyalty)),
        ) : null,
      ) : a.playerBand ? section(t(S.contract), h('p', { class: 'muted' }, s.config.role === 'hybrid' ? t(l('Sua banda lança pelo seu próprio selo.', 'Your band releases on your own label.')) : t(l('Independente: distribuição por agregador (taxa) e só nos seus territórios. Selos podem fazer propostas quando o alcance crescer.', 'Independent: aggregator distribution (fee) and only in your territories. Labels may approach you as your reach grows.')))) : null,
      h('p', null, actLink(s, a.id)),
    ),
  );
}
