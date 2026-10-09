// Criação: repertório, Q por componentes, e planejador de lançamento
// (formatos por era, tiragem, marketing com retorno decrescente, territórios). GDD §12–14.

import { coverById, coverCost, coverOptions, type CoverStyle } from '../../sim/covers';
import { coverUrl } from '../art';
import { FORMATS, type FormatId } from '../../data/rules';
import { MARKETS, l, type MarketId } from '../../data/world';
import { S, t } from '../../i18n/strings';
import { availableChannels, coverage, forecastUnits, marketingE } from '../../sim/market';
import { availableFormats, cancelRelease, labelFunded, physicalShare, pressingCost, scheduleRelease, suggestedPress, unrecorded, unreleasedRecorded, type ReleasePlan } from '../../sim/production';
import type { GameState } from '../../sim/types';
import { money, playerActs, rngOf } from '../../sim/util';
import { $, N, actLink, kv, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { store } from '../store';
import { hasSinger, hireSessionSinger, sessionSingerCost, voiceLabel } from '../../sim/sys/vocals10';

export function creationPanel(s: GameState): HTMLElement {
  const ids = playerActs(s);
  if (!ids.length) return h('div', { class: 'panel' }, section(t(S.areaCreation), h('p', null, t(S.noActs))));
  if (!store.selectedAct || !ids.includes(store.selectedAct)) store.selectedAct = ids[0];
  const a = s.acts[store.selectedAct];
  const written = unrecorded(s, a);
  const ready = unreleasedRecorded(s, a).sort((x, y) => y.q - x.q);
  const plan: ReleasePlan = {
    actId: a.id,
    type: ready.length >= 7 ? 'lp' : ready.length >= 3 ? 'ep' : 'single',
    songs: [],
    formats: availableFormats(s),
    press: 0,
    marketing: [],
    territories: [...s.player.territories],
    weeksAhead: 2,
  };
  plan.songs = ready.slice(0, plan.type === 'single' ? 1 : plan.type === 'ep' ? 4 : 10).map((x) => x.id);
  plan.press = suggestedPress(s, a, plan.type, ready[0]?.q ?? 50);
  const channels = availableChannels(s);
  if (channels.length) plan.marketing = [{ channel: channels[0].id, budget: money(s, 1500) }];
  const costBox = h('div', { class: 'eval' });
  const updateCost = () => {
    const press = labelFunded(s, a.id) ? 0 : pressingCost(s, plan.formats, plan.press);
    const mk = plan.marketing.reduce((t2, m) => t2 + m.budget, 0);
    const E = marketingE(s, plan.marketing, 'player');
    const cov = coverage(plan.territories, a.genre, s.year, a.positioning);
    const qs = plan.songs.map((id) => s.songs[id]?.q ?? 0).sort((x, y) => y - x);
    const q = qs.length ? (qs.length === 1 ? qs[0] : qs[0] * 0.5 + (qs.reduce((t2, x) => t2 + x, 0) / qs.length) * 0.5) : 0;
    const fc = forecastUnits(s, a, plan.type, q, plan.marketing, plan.territories);
    costBox.replaceChildren(
      kv(t(l('Previsão (10 semanas)', 'Forecast (10 weeks)')), `${N(fc.lo)}–${N(fc.hi)} ${t(l('unid.', 'units'))}`),
      kv(t(l('Demanda física estimada', 'Estimated physical demand')), `~${N(Math.round(fc.mid * physicalShare(s)))}`),
      kv(t(S.press), $(press)),
      ...(plan.cover ? [kv(t(l('Capa', 'Cover')), `${t(coverById[plan.cover.style as CoverStyle]?.name ?? l('?'))} · ${$(coverCost(s, plan.cover.style))}`)] : []),
      kv(t(S.marketing), `${$(mk)} · E = ${(E * 100).toFixed(0)}%`),
      kv(t(l('Cobertura de mercado', 'Market coverage')), `${(cov * 100).toFixed(0)}%`),
      kv(t(S.totalCost), h('b', null, $(press + mk + coverCost(s, plan.cover?.style)))),
      h('p', { class: 'muted small' }, t(l('E = 1 − exp(−investimento/custo de alcance): dobrar a verba não dobra o efeito.', 'E = 1 − exp(−spend/reach cost): doubling the budget does not double the effect.'))),
    );
  };
  const songList = h('div', { class: 'songpick' });
  const renderSongs = () => {
    songList.replaceChildren(...ready.map((so) => h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: plan.songs.includes(so.id), onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; plan.songs = on ? [...plan.songs, so.id] : plan.songs.filter((x) => x !== so.id); } }),
      `${so.title} `, pill(`Q ${Math.round(so.q)}`, so.q >= 60 ? 'good' : so.q < 40 ? 'bad' : ''), voiceLabel(so) ? pill(t(voiceLabel(so)!), so.instrumental ? 'warn' : '') : '',
    )));
  };
  renderSongs();
  const mkRows = h('div', null);
  const renderMk = () => {
    mkRows.replaceChildren(...plan.marketing.map((m, i) => h('div', { class: 'row' },
      select(m.channel, channels.map((c) => ({ value: c.id, label: `${t(c.name)} (${t(l('alcance', 'reach'))} ~${$(money(s, c.reachCost))})` })), (v) => { m.channel = v; updateCost(); }),
      h('input', { type: 'number', min: 0, step: 50, value: Math.round(m.budget / 100), oninput: (e: Event) => { m.budget = Math.max(0, Math.round(Number((e.target as HTMLInputElement).value) * 100)); updateCost(); } }),
      h('button', { class: 'icon', onclick: () => { plan.marketing.splice(i, 1); renderMk(); updateCost(); } }, '✕'),
    )), h('button', { class: 'btn small ghost', onclick: () => { plan.marketing.push({ channel: channels[0]?.id ?? 'press', budget: money(s, 1000) }); renderMk(); updateCost(); } }, `+ ${t(S.channel)}`));
  };
  renderMk();
  updateCost();
  const formats = availableFormats(s);
  const titleInput = h('input', { type: 'text', placeholder: t(l('(automático)', '(automatic)')), oninput: (e: Event) => (plan.title = (e.target as HTMLInputElement).value) });
  // rodada 8: três propostas de capa, cada uma com custo e consequência
  let coverRound = 0;
  const coverBox = h('div', { class: 'cover-pick' });
  const renderCovers = () => {
    const opts = coverOptions(s, a.id, coverRound);
    if (!plan.cover || !opts.some((o) => o.seed === plan.cover!.seed)) plan.cover = { ...opts[0] };
    const title = plan.title?.trim() || (plan.type === 'single' ? s.songs[plan.songs[0]]?.title ?? a.name : a.name);
    coverBox.replaceChildren(...opts.map((o) => {
      const def = coverById[o.style];
      return h('button', { class: `pick cover-opt ${plan.cover?.seed === o.seed ? 'on' : ''}`, onclick: () => { plan.cover = { ...o }; renderCovers(); updateCost(); } },
        h('img', { class: 'cover', src: coverUrl(o.seed, title, a.name, a.genre, s.year, 0.6, 160, o.style), width: 96, height: 96, alt: '' }),
        h('b', null, t(def.name)), h('small', null, t(def.effect)), h('small', { class: 'muted' }, def.cost ? $(coverCost(s, o.style)) : t(l('grátis', 'free'))));
    }), h('button', { class: 'btn small ghost', onclick: () => { coverRound += 1; plan.cover = undefined; renderCovers(); updateCost(); } }, '🎲 ', t(l('Outras propostas', 'Other proposals'))));
  };
  renderCovers();
  updateCost();
  const pressInput = h('input', { type: 'number', min: 0, step: 100, value: plan.press, oninput: (e: Event) => { plan.press = Math.max(0, Number((e.target as HTMLInputElement).value)); updateCost(); } });
  return h('div', { class: 'panel creation' },
    h('aside', { class: 'col-side' },
      section(t(S.roster), h('ul', { class: 'roster' }, ids.map((id) => h('li', { class: id === a.id ? 'sel' : '', onclick: () => { store.selectedAct = id; rerender(); } }, s.acts[id].name)))),
      section(t(S.scheduled), s.pendingReleases.length ? h('ul', null, s.pendingReleases.map((p) => h('li', null, `${p.title} (${p.type}) — ${t(S.week)} ${p.week} `, actLink(s, p.actId), ' ', h('button', { class: 'btn small ghost', onclick: () => { cancelRelease(s, p.id); rerender(); } }, t(S.cancel))))) : h('p', { class: 'muted' }, '—')),
    ),
    h('div', { class: 'col-main' },
      section(`${a.name}: ${t(S.unrecorded)} (${written.length})`,
        written.length ? h('table', { class: 'tbl compact' },
          h('thead', null, h('tr', null, h('th', null, t(S.title)), h('th', null, t(S.melody)), h('th', null, t(S.lyrics)), h('th', null, t(S.originality)), h('th', null, ''))),
          h('tbody', null, written.map((so) => h('tr', null, h('td', null, so.title, ' ', voiceLabel(so) ? pill(t(voiceLabel(so)!), so.instrumental ? 'warn' : '') : ''),
            h('td', null, Math.round(so.melody)), h('td', { class: so.instrumental ? 'muted' : '' }, so.instrumental ? `— (${Math.round(so.lyrics)})` : Math.round(so.lyrics)), h('td', null, Math.round(so.originality)),
            h('td', null, so.instrumental ? h('button', { class: 'btn small ghost', title: t(l('Um cantor contratado grava a voz: a letra passa a contar.', 'A hired singer records the vocals: the lyrics start to count.')), onclick: () => { toast(t(hireSessionSinger(s, so.id))); rerender(); } }, t(l('Cantor de estúdio', 'Session singer')), ` ${$(sessionSingerCost(s))}`) : '')))),
        ) : h('p', { class: 'muted' }, t(l('Nenhuma. Coloque "Compor" na agenda do artista.', 'None. Add "Write songs" to the artist agenda.'))),
        hasSinger(s, a) ? '' : h('p', { class: 'warn small' }, '🎤 ', t(l(
          'Ninguém canta neste ato: as músicas saem instrumentais (a letra não conta na nota). Para ter voz: participação (feat.) de quem canta, um cantor de estúdio por faixa, ou contrate/ensine um vocalista (voz como instrumento).',
          'Nobody sings in this act: songs come out instrumental (lyrics do not count). To get vocals: a feature (feat.) by a singer, a session singer per track, or hire/teach a vocalist (voice as an instrument).'))),
        h('p', { class: 'muted small' }, t(l('Gravar acontece pela agenda ("Gravar", 2 slots): estúdio, abordagem e salas da sede definem performance e produção.', 'Recording happens through the agenda ("Record", 2 slots): studio, approach and HQ rooms set performance and production.'))),
      ),
      section(`${t(S.planRelease)} — ${t(S.recordedUnreleased)} (${ready.length})`,
        ready.length ? h('div', { class: 'form' },
          h('label', null, t(S.type), select(plan.type, [{ value: 'single', label: 'Single' }, { value: 'ep', label: 'EP (3+)' }, { value: 'lp', label: 'LP (7+)' }] as { value: 'single' | 'ep' | 'lp'; label: string }[], (v) => { plan.type = v; plan.press = suggestedPress(s, a, v, ready[0]?.q ?? 50); pressInput.value = String(plan.press); updateCost(); })),
          h('label', null, t(S.title), titleInput),
          songList,
          h('fieldset', null, h('legend', null, t(l('Capa (escolha uma das três propostas)', 'Cover (pick one of three proposals)'))), coverBox),
          h('fieldset', null, h('legend', null, t(S.formats)), formats.map((f) => h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: plan.formats.includes(f), onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; plan.formats = on ? [...plan.formats, f] : plan.formats.filter((x) => x !== f); updateCost(); } }),
            t(FORMATS.find((x) => x.id === f)?.name)))),
          h('label', null, `${t(S.press)} (${t(S.suggested)} ${N(plan.press)})`, pressInput),
          h('fieldset', null, h('legend', null, t(S.marketing)), mkRows),
          h('fieldset', null, h('legend', null, t(S.territories)), MARKETS.map((m) => h('label', { class: 'check' },
            h('input', { type: 'checkbox', disabled: !s.player.territories.includes(m.id), checked: plan.territories.includes(m.id), onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; plan.territories = on ? [...plan.territories, m.id] : plan.territories.filter((x) => x !== m.id); updateCost(); } }),
            t(m.name)))),
          h('label', null, t(S.weeksAhead), h('input', { type: 'number', min: 1, max: 26, value: plan.weeksAhead, oninput: (e: Event) => (plan.weeksAhead = Number((e.target as HTMLInputElement).value)) })),
          costBox,
          h('button', { class: 'btn primary', onclick: () => {
            const res = scheduleRelease(s, rngOf(s), plan);
            if ('pt' in res) toast(t(res), 'bad');
            else { toast(t(l('Lançamento programado.', 'Release scheduled.')), 'good'); rerender(); }
          } }, t(S.schedule)),
        ) : h('p', { class: 'muted' }, t(l('Sem faixas gravadas inéditas.', 'No unreleased recorded tracks.'))),
      ),
    ),
  );
}

export type { FormatId, MarketId };
