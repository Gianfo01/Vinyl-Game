// Artistas: elenco, carreira em 3 eixos, estados, agenda de 4 slots, contrato (GDD §9, §11).

import { AGENDA_ACTIONS, agendaById } from '../../data/people';
import { APPROACHES, CONTRACT_MODELS, STUDIO_TIERS, VENUE_TIERS } from '../../data/rules';
import { l } from '../../data/world';
import { S, t } from '../../i18n/strings';
import { defaultAgenda, slotCost, slotsFor, usedSlots } from '../../sim/agenda';
import { raiseRoyalty, renewContract } from '../../sim/contracts';
import { maxVenueTier } from '../../sim/live';
import { actState } from '../../sim/people';
import type { AgendaSlot, GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { $, N, actLink, genreName, cityName, kv, logo, pill, promiseName, rerender, section, statusName, toast } from '../common';
import { h, select } from '../dom';
import { openAct } from '../ficha';
import { store } from '../store';
import { playPreview } from '../audio';
import { EXTRA_ACTIONS } from '../../data/actions';
import { agendaLoad, slotLoad } from '../../sim/capacity';
import { freeCapacity } from '../../sim/agenda';
import { loadBar, meter, portrait, stat } from '../vis';
import { contractExtra, fandomSection, membersSection, reunionSection } from './people';

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
    const def = agendaById[slot.action] ?? EXTRA_ACTIONS.find((x) => x.id === slot.action);
    return h('li', { class: 'slot' },
      h('b', null, t(def?.name)), slotCost(slot.action) > 1 ? pill(`×${slotCost(slot.action)}`) : null,
      def?.cost ? h('span', { class: 'muted small' }, ` ${$(money(s, def.cost))}`) : null,
      ...params,
      h('small', { class: 'muted' }, t(def?.desc)),
      h('button', { class: 'icon', 'aria-label': 'remover', onclick: () => commit(slots.filter((_, i) => i !== idx)) }, '✕'),
    );
  };
  const free = max - usedSlots(slots);
  const capLeft = freeCapacity(s, a) - agendaLoad(slots);
  const addSel = select('', [{ value: '', label: `+ ${t(S.addAction)}` }, ...[...AGENDA_ACTIONS, ...EXTRA_ACTIONS].filter((x) => slotLoad({ action: x.id }) <= capLeft && (slotCost(x.id) <= free || EXTRA_ACTIONS.includes(x as never))).map((x) => ({ value: x.id, label: `${t(x.name)} · ${slotLoad({ action: x.id })}%` }))], (v) => {
    if (!v) return;
    const p: AgendaSlot = { action: v };
    if (v === 'gigs') p.params = { tier: Math.min(maxVenueTier(s, a), 2), dates: 4 };
    if (v === 'record') p.params = { tier: s.player.hq >= 1 ? 0 : 1, approach: 'balanced' };
    if (EXTRA_ACTIONS.find((x) => x.id === v)?.scope === 'person') p.params = { person: a.members[0] };
    commit([...slots, p]);
  }, { disabled: capLeft <= 0 });
  const unrec = a.songs.filter((id) => s.songs[id] && !s.songs[id].recorded).length;
  const ready = a.songs.filter((id) => s.songs[id]?.recorded && !s.songs[id].releaseId).length;
  return h('div', { class: 'panel artists' },
    h('aside', { class: 'col-side' }, section(`${t(S.roster)} (${ids.length})`, list), reunionSection(s)),
    h('div', { class: 'col-main' },
      section(a.name,
        h('div', { class: 'ficha-head' }, logo(a, 64),
          h('div', null,
            h('div', null, `${genreName(a.genre)} · ${cityName(a.city)} · `, pill(statusName(a.status))),
            h('div', null, h('button', { class: 'link', onclick: () => openAct(a.id) }, t(S.inspect)), ' · ', h('button', { class: 'link', onclick: () => playPreview(a.logoSeed, a.genre, s.year) }, t(S.preview))),
          ),
        ),
        h('div', { class: 'row wrap portraits' }, a.members.map((id) => portrait(s.persons[id], 44))),
        h('div', { class: 'grid3' },
          meter('fame', S.fame, a.fame),
          meter('fire', S.momentum, a.momentum),
          meter('globe', S.positioning, a.positioning),
          meter('heart', S.morale, st.morale),
          meter('sleep', S.fatigue, st.fatigue, 100, true),
          meter('stress', S.stress, st.stress, 100, true),
          meter('sparkle', S.inspiration, st.inspiration),
          a.playerBand ? null : meter('handshake', S.trust, a.trust),
          stat('fans', `${N(a.fans.casual)} / ${N(a.fans.active)} / ${N(a.fans.core)}`, S.fans),
        ),
        h('p', { class: 'small muted' }, t(l('Músicas escritas: {u} · gravadas inéditas: {r} · lançamentos: {n}', 'Written songs: {u} · recorded unreleased: {r} · releases: {n}'), { u: unrec, r: ready, n: a.releases.length })),
      ),
      section(`${t(S.agenda)} — ${t(l('capacidade', 'capacity'))} ${agendaLoad(slots)}%`,
        loadBar(slots.map((x) => ({ label: t(agendaById[x.action]?.name ?? EXTRA_ACTIONS.find((e) => e.id === x.action)?.name), load: slotLoad(x) }))),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: delegated, onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; s.delegated[a.id] = on ? true : false; if (!on) s.agenda[a.id] = defaultAgenda(s, a); rerender(); } }), t(S.delegate)),
        h('ul', { class: 'slots' }, delegated ? slots.map((x) => h('li', { class: 'slot muted' }, t(agendaById[x.action]?.name ?? EXTRA_ACTIONS.find((e) => e.id === x.action)?.name))) : slots.map(slotEditor)),
        delegated ? null : addSel,
        h('p', { class: 'muted small' }, t(l('Ações repetidas no mês rendem menos (retorno decrescente). Artistas com controle criativo podem trocar uma ação.', 'Repeated actions in a month yield less (diminishing returns). Artists with creative control may swap an action.'))),
      ),
      c ? section(t(S.contract),
        kv(t(S.model), c.party === 'player' ? t(CONTRACT_MODELS.find((m) => m.id === c.model)?.name) : `${t(CONTRACT_MODELS.find((m) => m.id === c.model)?.name)} — ${s.labels[c.party]?.name ?? ''}`),
        kv(t(S.royalty), `${Math.round(c.royalty * 100)}%`),
        kv(t(S.recoup), $(c.recoupBalance)),
        kv(t(S.ends), `${Math.max(0, Math.round((c.endWeek - s.week) / 4.35))} ${t(l('meses', 'months'))}`),
        kv(t(S.releasesOwed), `${c.releasesDone}/${c.releasesOwed}`),
        c.promises.length ? kv(t(S.promises), h('span', null, c.promises.map((p) => pill(`${promiseName(p.kind)}${p.kept === undefined ? '' : p.kept ? ' ✓' : ' ✗'}`, p.kept === false ? 'bad' : '')))) : null,
        c.party === 'player' && !a.playerBand ? h('div', { class: 'actions' },
          h('button', { class: 'btn', onclick: () => { const bonus = money(s, 1500 + a.fame * a.fame * 15); if (!renewContract(s, a.id, 36, bonus)) toast(t(l('Renovação recusada ou sem caixa.', 'Renewal refused or no cash.')), 'bad'); rerender(); } }, `${t(S.renew)} (36m, ${$(money(s, 1500 + a.fame * a.fame * 15))})`),
          h('button', { class: 'btn ghost', onclick: () => { raiseRoyalty(s, a.id, 0.02); rerender(); } }, t(S.raiseRoyalty)),
        ) : null,
      ) : a.playerBand ? section(t(S.contract), h('p', { class: 'muted' }, s.config.role === 'hybrid' ? t(l('Sua banda lança pelo seu próprio selo.', 'Your band releases on your own label.')) : t(l('Independente: distribuição por agregador (taxa) e só nos seus territórios. Selos podem fazer propostas quando o alcance crescer.', 'Independent: aggregator distribution (fee) and only in your territories. Labels may approach you as your reach grows.')))) : null,
      contractExtra(s, a),
      membersSection(s, a),
      fandomSection(s, a),
      h('p', null, actLink(s, a.id)),
    ),
  );
}
