// Ficha unificada com cadeia de inspeção por IDs estáveis (GDD §24) + modal de oferta.

import { AMBITIONS, ORIGINS, SKILLS, traitById } from '../data/people';
import { CONTRACT_MODELS, type ContractModel } from '../data/rules';
import { S, t } from '../i18n/strings';
import { defaultOffer, evaluateOffer, makeOffer } from '../sim/contracts';
import { actState } from '../sim/people';
import { DEGREES, estimate, sourceName, visibleFields } from '../sim/scouting';
import type { Act, GameState, Offer } from '../sim/types';
import { $, N, actLink, cityName, cover, genreName, inspect, kv, labelLink, logo, modal, monthName, ownerName, pill, rerender, sparkline, strategyName, toast } from './common';
import { bar, h, rangeBar, select } from './dom';
import { playPreview, stopPreview } from './audio';
import { store } from './store';
import { money } from '../sim/util';
import { l } from '../data/world';
import { portraitCanvas, portraitDataUrl } from './pixel/avatar';
import { appearanceEditor } from './pixel/editor';
import { personActivity } from './pixel/activity';
import { icon } from './pixel/icons';

function g(): GameState {
  return store.game!;
}

export function openAct(id: string): void {
  const s = g();
  const a = s.acts[id];
  if (!a) return;
  const k = s.knowledge[id];
  const mine = a.owner === 'player';
  const deg = mine ? 5 : k?.degree ?? 0;
  const vis = visibleFields(deg);
  const st = actState(s, a);
  const pot = estimate(s, id, 'potential');
  const fame = estimate(s, id, 'fame');
  const body = h('div', { class: 'ficha' },
    h('div', { class: 'ficha-head' }, logo(a, 72),
      h('div', null,
        h('h3', null, a.name, a.catalogNo ? pill('★', 'gold') : null, a.legend ? pill(t(l('Lenda', 'Legend')), 'gold') : null, a.archetype === 'synthetic' ? pill('AI', 'neural') : null),
        h('div', { class: 'muted' }, `${genreName(a.genre)} · ${cityName(a.city)} · ${t(l('desde', 'since'))} ${a.formed}`),
        h('div', null, t(S.owner), ': ', labelLink(s, a.owner)),
        h('div', null, t(S.knownAs), ': ', pill(t(DEGREES[Math.max(0, deg - 1)])), k ? h('span', { class: 'muted' }, ` · ${t(S.source)}: ${t(sourceName(k.source))}`) : null),
      ),
      h('button', { class: 'btn small', onclick: () => playPreview(a.logoSeed, a.genre, s.year) }, t(S.preview)),
      h('button', { class: 'btn small ghost', onclick: () => stopPreview() }, t(S.stop)),
    ),
    h('div', { class: 'grid2' },
      h('div', null,
        kv(t(S.fame), fame ? h('span', null, mine ? Math.round(a.fame) : `${fame.lo}–${fame.hi}`, ' ', bar(a.fame)) : '?'),
        kv(t(S.momentum), deg >= 2 ? bar(a.momentum) : '?'),
        kv(t(S.positioning), h('span', null, t(S.underground), ' ', deg >= 2 ? bar(a.positioning) : '?', ' ', t(S.crossover))),
        kv(t(S.potential), pot ? h('span', null, `${pot.lo}–${pot.hi} `, rangeBar(pot.lo, pot.hi)) : h('span', { class: 'muted' }, t(S.hidden))),
        kv(t(S.fans), deg >= 2 ? `${N(a.fans.casual)} ${t(S.casual)} · ${N(a.fans.active)} ${t(S.active)} · ${N(a.fans.core)} ${t(S.core)}` : '?'),
        mine && !a.playerBand ? kv(t(S.trust), bar(a.trust)) : null,
        vis.private ? kv(`${t(S.morale)} / ${t(S.fatigue)} / ${t(S.stress)}`, h('span', null, bar(st.morale, 100, 'good'), bar(st.fatigue, 100, 'warn'), bar(st.stress, 100, 'bad'))) : null,
        kv(t(l('Recordes', 'Records')), `#${a.peakChart < 999 ? a.peakChart : '—'} · ${a.hits} top 10 · ${a.number1s}× #1 · ${a.awards} 🏆`),
        !mine && !a.owner && s.config.role !== 'artist' ? h('button', { class: 'btn primary', onclick: () => openOffer(a.id) }, t(S.makeOffer)) : null,
      ),
      h('div', null,
        h('h4', null, t(S.members)),
        h('table', { class: 'tbl compact' },
          h('tbody', null, a.members.map((pid) => {
            const p = s.persons[pid];
            if (!p) return null;
            return h('tr', null,
              h('td', null, h('img', { class: 'px', src: portraitDataUrl(p, 32, s.year), width: 28, height: 28, alt: '', style: 'vertical-align:middle;border-radius:4px;margin-right:4px' }), h('button', { class: 'link', onclick: () => openPerson(pid) }, p.name)),
              h('td', { class: 'muted' }, p.role),
              h('td', null, vis.ambition ? t(AMBITIONS.find((x) => x.id === p.ambition)?.name) : ''),
              h('td', null, vis.traits ? p.traits.map((tr) => pill(t(traitById[tr]?.name))) : h('span', { class: 'muted' }, '…')),
            );
          })),
        ),
      ),
    ),
    h('h4', null, t(S.releases)),
    h('div', { class: 'cover-row' }, a.releases.slice(-10).reverse().map((rid) => {
      const r = s.releases[rid];
      if (!r) return null;
      return h('div', { class: 'cover-item', onclick: () => openRelease(rid) }, cover(s, r, 64), h('small', null, r.title), h('small', { class: 'muted' }, `${r.year} · #${r.peak < 999 ? r.peak : '—'}`));
    })),
    h('h4', null, t(S.history)),
    h('ul', { class: 'memory' }, a.history.slice(-12).reverse().map((mid) => {
      const m = s.memory.find((x) => x.id === mid);
      return m ? h('li', null, h('span', { class: 'muted' }, `${monthName(m.month)} ${m.year} · `), t(m.text)) : null;
    })),
  );
  modal(a.name, body, { wide: true, onClose: stopPreview });
}

const ROLE_NAMES: Record<string, ReturnType<typeof l>> = {
  vocal: l('voz', 'vocals'), guitar: l('guitarra', 'guitar'), bass: l('baixo', 'bass'), drums: l('bateria', 'drums'), keys: l('teclados', 'keys'),
  horns: l('sopros', 'horns'), dj: l('DJ', 'DJ'), producer: l('produção', 'producer'), mc: l('MC', 'MC'), strings: l('cordas', 'strings'), synthetic: l('voz sintética', 'synthetic voice'),
};

export function openPerson(id: string): void {
  const s = g();
  const p = s.persons[id];
  if (!p) return;
  const act = Object.values(s.acts).find((a) => a.members.includes(id));
  const mine = act?.owner === 'player';
  const deg = mine ? 5 : act ? s.knowledge[act.id]?.degree ?? 0 : 0;
  const vis = visibleFields(deg);
  const portraitBox = h('div', null, portraitCanvas(p, s, 3));
  const activity = mine ? personActivity(s, id) : null;
  const editLook = () => {
    const editor = appearanceEditor(p, (look) => {
      if (look) p.look = look;
      else delete p.look;
      portraitBox.replaceChildren(portraitCanvas(p, s, 3));
    }, s.year);
    modal(t(l('Editar aparência', 'Edit look')) + ` — ${p.name}`, editor, { wide: true, onClose: () => rerender() });
  };
  const body = h('div', { class: 'ficha' },
    h('div', { class: 'person-head' }, portraitBox,
      h('div', null,
        h('div', null, pill(t(ROLE_NAMES[p.role] ?? l(p.role)))),
        activity ? h('div', { class: 'small' }, icon(activity.icon, 1), ' ', t(activity.label)) : null,
        h('button', { class: 'btn small', onclick: editLook }, t(l('Editar aparência', 'Edit look'))),
      ),
    ),
    kv(t(S.age), s.year - p.born),
    kv(t(S.origin), t(ORIGINS.find((o) => o.id === p.origin)?.name)),
    act ? kv(t(l('Ato', 'Act')), actLink(s, act.id)) : null,
    vis.ambition ? kv(t(S.ambition), t(AMBITIONS.find((x) => x.id === p.ambition)?.name)) : null,
    vis.traits ? kv(t(S.traits), h('span', null, p.traits.map((tr) => pill(t(traitById[tr]?.name), 'trait')))) : null,
    vis.private ? kv(t(S.health), p.health) : null,
    h('h4', null, t(S.skills)),
    vis.skills
      ? h('table', { class: 'tbl compact' }, h('tbody', null, SKILLS.map((sk) => {
        const v = p.skills[sk.id];
        const w = mine ? 0 : [0, 26, 15, 8, 3][Math.max(0, deg - 1)];
        return h('tr', null, h('td', null, t(sk.name)), h('td', null, mine ? Math.round(v) : `${Math.max(0, Math.round(v - w / 2))}–${Math.min(100, Math.round(v + w / 2))}`), h('td', null, mine ? bar(v) : rangeBar(Math.max(0, v - w / 2), Math.min(100, v + w / 2))));
      })))
      : h('p', { class: 'muted' }, t(l('Habilidades aparecem a partir de Observação.', 'Skills appear from Observation onward.'))),
  );
  modal(p.name, body);
}

export function openRelease(id: string): void {
  const s = g();
  const r = s.releases[id];
  if (!r) return;
  const mine = r.owner === 'player' || s.acts[r.actId]?.playerBand;
  const body = h('div', { class: 'ficha' },
    h('div', { class: 'ficha-head' }, cover(s, r, 120),
      h('div', null,
        h('h3', null, r.title, ' ', pill(r.type.toUpperCase()), r.certified ? pill(r.certified, 'gold') : null, r.reissueOf ? pill(t(l('reedição', 'reissue'))) : null),
        h('div', null, actLink(s, r.actId), ' · ', labelLink(s, r.owner), ` · ${r.year}`),
        kv(t(S.peak), r.peak < 999 ? `#${r.peak}` : '—'),
        kv(t(S.totalUnits), N(r.totalUnits)),
        mine ? kv(t(S.revenue), $(r.revenue)) : null,
        mine && r.pressed ? kv(t(S.stock), `${N(Math.max(0, r.stock))} / ${N(r.pressed)}`) : null,
        mine && r.shortage ? kv(t(S.shortage), N(r.shortage)) : null,
        h('div', null, sparkline(r.weekly.slice(-40), 220, 40)),
      ),
    ),
    r.songs.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(S.title)), h('th', null, 'Q'), h('th', null, t(S.melody)), h('th', null, t(S.lyrics)), h('th', null, t(S.performance)), h('th', null, t(S.production)), h('th', null, t(S.originality)))),
      h('tbody', null, r.songs.map((sid) => {
        const so = s.songs[sid];
        if (!so) return null;
        const show = (v: number) => (mine ? Math.round(v) : '~' + Math.round(v / 10) * 10);
        return h('tr', null, h('td', null, so.title), h('td', null, h('b', null, show(so.q))), h('td', null, show(so.melody)), h('td', null, show(so.lyrics)), h('td', null, show(so.performance)), h('td', null, show(so.production)), h('td', null, show(so.originality)));
      })),
    ) : null,
    mine && r.autopsy ? h('div', null,
      h('h4', null, t(S.autopsy)),
      h('p', { class: 'muted small' }, t(S.autopsyNote)),
      h('table', { class: 'tbl compact' }, h('tbody', null, r.autopsy.map((f) => h('tr', null,
        h('td', null, t(f.label)),
        h('td', { class: f.value >= 1.1 ? 'good' : f.value <= 0.9 ? 'bad' : '' }, `×${f.value.toFixed(2)}`),
        h('td', null, pill(f.confidence === 'high' ? t(l('confiança alta', 'high confidence')) : f.confidence === 'medium' ? t(l('média', 'medium')) : t(l('baixa', 'low')))),
      )))),
      r.shortage > 0 ? h('p', { class: 'bad' }, t(l('Falta de estoque custou vendas: aumente a tiragem ou reprense.', 'Stock-outs cost sales: press more or repress.'))) : null,
    ) : null,
  );
  modal(r.title, body, { wide: true });
}

export function openLabel(id: string): void {
  const s = g();
  const lb = s.labels[id];
  if (!lb) return;
  const roster = lb.roster.map((x) => s.acts[x]).filter(Boolean).sort((a, b) => b.fame - a.fame);
  const body = h('div', { class: 'ficha' },
    kv(t(l('Família', 'Family')), lb.family),
    kv(t(l('Estratégia', 'Strategy')), strategyName(lb.strategy)),
    kv(t(S.city), cityName(lb.city)),
    kv(t(l('Fundação', 'Founded')), lb.founded),
    kv(t(l('Receita do último ano (pública)', 'Last year revenue (public)')), $(lb.revenueLastYear)),
    kv(t(l('Última decisão', 'Last decision')), t(lb.lastDecision) || '—'),
    h('h4', null, `${t(S.roster)} (${roster.length})`),
    h('div', { class: 'chips' }, roster.slice(0, 40).map((a) => actLink(s, a.id))),
  );
  modal(lb.name, body);
}

export function registerInspect(): void {
  inspect.act = openAct;
  inspect.person = openPerson;
  inspect.release = openRelease;
  inspect.label = openLabel;
}

// ---------- Oferta ----------
export function openOffer(actId: string): void {
  const s = g();
  const a = s.acts[actId];
  if (!a) return;
  const o: Omit<Offer, 'id' | 'week' | 'status'> = defaultOffer(s, a);
  const evalBox = h('div', { class: 'eval' });
  const update = () => {
    const ev = evaluateOffer(s, a, o);
    evalBox.replaceChildren(
      h('div', null, t(S.chance), ': ', pill(t(S[ev.band]), ev.band)),
      h('ul', { class: 'small' }, ev.reasons.map((x) => h('li', null, t(x)))),
      h('p', { class: 'muted small' }, (s.knowledge[actId]?.degree ?? 0) < 3 ? t(l('Você ainda não conhece as ambições do ato: a leitura é grosseira.', 'You do not yet know the act\'s ambitions: this read is rough.')) : ''),
    );
  };
  const num = (value: number, step: number, set: (v: number) => void, min = 0) =>
    h('input', { type: 'number', value, step, min, oninput: (e: Event) => { set(Number((e.target as HTMLInputElement).value)); update(); } });
  const unit = money(s, 1);
  const form = h('div', { class: 'form' },
    h('label', null, t(S.model), select(o.model, CONTRACT_MODELS.map((m) => ({ value: m.id, label: t(m.name) + (m.available ? '' : ' ' + t(S.phaseLater)), disabled: !m.available })), (v: ContractModel) => { o.model = v; update(); })),
    h('p', { class: 'muted small' }, t(CONTRACT_MODELS.find((m) => m.id === o.model)?.desc)),
    h('label', null, `${t(S.advanceAmt)} ($)`, num(Math.round(o.advance / 100), Math.max(10, Math.round(unit * 100 / 100)), (v) => (o.advance = Math.round(v * 100)))),
    h('label', null, `${t(S.royalty)} (%)`, num(Math.round(o.royalty * 100), 1, (v) => (o.royalty = v / 100))),
    h('label', null, `${t(S.distFee)} (%)`, num(Math.round((o.distributionFee ?? 0.2) * 100), 1, (v) => (o.distributionFee = v / 100))),
    h('label', null, `${t(S.share360)} (%)`, num(Math.round(o.share360 * 100), 5, (v) => (o.share360 = v / 100))),
    h('label', null, t(S.term), num(o.termMonths, 6, (v) => (o.termMonths = v), 6)),
    h('label', null, t(S.releasesOwed), num(o.releasesOwed, 1, (v) => (o.releasesOwed = v), 1)),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: o.creativeControl, onchange: (e: Event) => { o.creativeControl = (e.target as HTMLInputElement).checked; update(); } }), t(S.creativeControl)),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: o.publishing, onchange: (e: Event) => { o.publishing = (e.target as HTMLInputElement).checked; update(); } }), t(S.publishing)),
    h('fieldset', null, h('legend', null, t(S.promises)),
      (['priority', 'tour', 'freedom'] as const).map((p) => h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; o.promises = on ? [...o.promises, p] : o.promises.filter((x) => x !== p); update(); } }), t(p === 'priority' ? S.promisePriority : p === 'tour' ? S.promiseTour : S.promiseFreedom))),
    ),
    evalBox,
  );
  update();
  let close = () => {};
  const actions = h('div', { class: 'actions' },
    h('button', { class: 'btn primary', onclick: () => {
      if (s.player.cash < o.advance) return toast(t(l('Caixa insuficiente para o adiantamento.', 'Not enough cash for the advance.')), 'bad');
      const res = makeOffer(s, o);
      if (res) {
        toast(t(l('Oferta enviada. Resposta no fechamento do mês.', 'Offer sent. Answer at month close.')), 'info');
        close();
        rerender();
      } else toast(t(l('Já existe oferta pendente.', 'There is already a pending offer.')), 'bad');
    } }, t(S.send)),
  );
  close = modal(`${t(S.offerTitle)}: ${a.name}`, h('div', null, form, actions));
}

export function actRow(s: GameState, a: Act): HTMLElement {
  return h('div', { class: 'act-row' }, logo(a, 28), actLink(s, a.id), h('span', { class: 'muted small' }, ` ${genreName(a.genre)} · ${ownerName(s, a.owner)}`));
}

