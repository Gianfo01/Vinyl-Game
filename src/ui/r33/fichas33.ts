// R33 · FICHAS33 — as fichas (artista, pessoa, disco, selo) no padrão de PAPEL da casca nova (mocks aprovados em
// docs/r33/mocks/mock33-ficha-*.png): pasta manila com a foto presa por clipe, letreiro do artista, carimbos de estado
// (situação, dono, conhecimento, fonte/certeza), barras no estilo do jogo, potencial escondido como tarja preta,
// recordes como etiquetas, recortes como recortes de jornal, discos como capas; MARCADORES no alto (as categorias das
// abas de antes, com o número de assuntos) e TODAS as ações no CARTÃO DE AÇÕES numerado (paper33.card33 = EXP-13).
// Só apresentação: os MESMOS dados e as MESMAS funções da página antiga (actItems/personItems/releaseParts/labelItems13
// e os botões dos cabeçalhos, colhidos e clicados como antes). Nada é inventado: ato solo mostra "artista solo" (sem
// aba de banda), integrantes e retratos vêm da base, e o que o conhecimento esconde continua escondido.
// Sem a casca nova (exp5.nav desligado) a ficha é o mesmo papel em tela cheia.

import './fichas33.css';
import { l } from '../../data/world';
import { S, t } from '../../i18n/strings';
import { lockOf31 } from '../../sim/r31/lock';
import { nav5On, pocketIds5 } from '../../sim/r31/exp5';
import { estimate, DEGREES, sourceName } from '../../sim/scouting';
import { HINT15, canSee, fameText, knownLevel } from '../../sim/sys/fame15';
import { actState } from '../../sim/people';
import { actAffinity, affinityLabel, genreFamilyName } from '../../sim/sys/temper';
import { hasOpinion, opinionOf } from '../../sim/opinion';
import { form, overall } from '../../sim/sys/talent';
import { roleLine27 } from '../../sim/sys/roles27';
import { trackList } from '../../sim/relinfo';
import { isPlayerLabel, labelName13, labelRoster13 } from '../../sim/sys/dossier13';
import { leaderOf } from '../../sim/sys/leaders10';
import { STAND_KEYS, STAND_NAME, standingOf } from '../../sim/sys/standing9';
import { ORIGINS } from '../../data/people';
import { band, bandText, know, seen } from '../../sim/know';
import type { Act, GameState, Person, Release } from '../../sim/types';
import { $, N, actGenre23, actLink, cityName, cover, inspect, labelLink, logo, monthName, ownerName, pill, statusName } from '../common';
import { h } from '../dom';
import { OPEN33, ACT_HEAD_EXTRAS, ACT_OVERVIEW_EXTRAS, PERSON_HEAD_EXTRAS, actItems, formIcon, fuzz, hid15, openActPage, personDegree, personItems, shown, valueShown, type PageTab } from '../pages';
import { openDossier } from '../dossierView';
import { openOffer, openRelease, releaseParts } from '../ficha';
import { ARCH, labelItems13 } from '../sys/dossier13';
import { appearanceEditor } from '../pixel/editor';
import { portraitCanvas } from '../pixel/avatar';
import { wordmarkImg28 } from '../pixel/logo28';
import { labelMarkImg28 } from '../pixel/extras28';
import { catCount17, groupTabs17 } from '../popcat17';
import { pin5 } from '../r31/nav5';
import { store } from '../store';
import { modal } from '../common';
import { POCKET33, paperSheet33, type Mark33, type Open33, type Row33 } from './paper33';

// ---------------------------------------------------------------- bolso da casca

POCKET33.on = () => !!store.game && nav5On(store.game);
POCKET33.has = (obj) => !!store.game && pocketIds5(store.game).includes(obj);
POCKET33.toggle = (obj) => (store.game ? pin5(store.game, obj) : undefined);

// ---------------------------------------------------------------- peças do papel

const txt33 = (el: Element): string => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Botões e blocos "Ações" dos cabeçalhos de antes viram linhas do cartão (clicam o MESMO botão); o resto (empresário,
 *  produtor, fonte/certeza…) fica no papel como informação. */
function harvest33(els: (HTMLElement | null)[], rows: Row33[], info: HTMLElement[]): void {
  for (const el of els) {
    if (!el) continue;
    if (el instanceof HTMLButtonElement) {
      const why = el.disabled ? el.getAttribute('title') || t(l('Indisponível agora.', 'Unavailable now.')) : '';
      rows.push({ label: txt33(el), lock: why ? lockOf31(l(why, why)) : null, run: () => el.click() });
    } else if (el instanceof HTMLDetailsElement) {
      const sum = el.querySelector(':scope > summary');
      const label = sum ? txt33(sum) : t(l('Ações', 'Actions'));
      rows.push({ label, panel: () => { if (!el.open) el.open = true; return el; } });
    } else info.push(el);
  }
}

function polaroid33(img: Node, caption: string, clip = true): HTMLElement {
  return h('figure', { class: 'f33-pol' }, clip ? h('i', { class: 'f33-clip', 'aria-hidden': 'true' }) : null, h('div', { class: 'f33-ph' }, img), h('figcaption', null, caption));
}
type Tone33 = 'green' | 'red' | 'blue' | 'ink';
const stamp33 = (text: string, tone: Tone33, title?: string): HTMLElement => h('span', { class: `f33-stamp t-${tone}`, title }, text);
const sec33 = (title: string, ...kids: (Node | null | false)[]): HTMLElement => h('section', { class: 'f33-sec' }, h('h4', { class: 'f33-h' }, title), ...kids.filter((x): x is Node => !!x));
/** Barra do jogo (trilho claro, preenchimento por tom, valor em fonte de pixel). */
function meter33(label: string, v: number | null, o: { tone?: 'g' | 'o' | 'b' | 'r'; text?: string | Node; max?: number; why?: string } = {}): HTMLElement {
  const max = o.max ?? 100;
  return h('div', { class: 'f33-row' }, h('span', { class: 'f33-k' }, label),
    v === null ? h('span', { class: 'f33-v' }, o.text ?? hid15()) : h('span', { class: `f33-bar t-${o.tone ?? 'g'}`, role: 'meter', 'aria-label': label, 'aria-valuenow': Math.round(v), 'aria-valuemin': 0, 'aria-valuemax': max }, h('i', { style: `width:${Math.max(0, Math.min(100, (v / max) * 100))}%` })),
    v === null ? null : h('b', { class: 'f33-n', title: o.why }, o.text ?? String(Math.round(v))));
}
const line33 = (label: string, value: Node | string): HTMLElement => h('div', { class: 'f33-row f33-line' }, h('span', { class: 'f33-k' }, label), h('span', { class: 'f33-v' }, value));
const tag33 = (label: string, value: string | number): HTMLElement => h('span', { class: 'f33-tag' }, label, ' ', h('b', null, String(value)));
const clipping33 = (date: string, text: string): HTMLElement => h('div', { class: 'f33-cut' }, h('small', null, date), h('p', null, text));

/** "GONZAGA, LUIZ" na orelha da pasta (só para nome de pessoa; banda fica como está). */
function filed33(name: string, person: boolean): string {
  const w = name.trim().split(/\s+/);
  return person && w.length >= 2 ? `${w[w.length - 1]}, ${w.slice(0, -1).join(' ')}` : name;
}

/** Marcadores = as categorias das abas de antes (Resumo, Integrantes, Música…), com o número de assuntos. */
function marks33(items: (PageTab & { count?: number })[], over: Record<string, (it: PageTab) => HTMLElement | null> = {}, rename: Record<string, string> = {}, head: Record<string, () => HTMLElement | null> = {}): Mark33[] {
  return groupTabs17(items).map((g) => ({
    id: g.cat.id,
    label: rename[g.cat.id] ?? t(g.cat.label),
    count: catCount17(g.items),
    render: () => {
      const top = head[g.cat.id]?.() ?? null;
      const one = (it: PageTab) => (over[it.id] ? over[it.id](it) : it.render());
      if (g.items.length === 1 && !top) return one(g.items[0]);
      return h('div', { class: 'f33-stack' }, top, ...g.items.map((it) => (it.id === 'overview' && over[it.id] ? one(it) : sec33(t(it.label), one(it))))); // o resumo novo já tem as próprias seções
    },
  }));
}
const markOf33 = (items: { id: string }[], tab?: string): string | undefined => {
  if (!tab) return undefined;
  const g = groupTabs17(items).find((x) => x.items.some((i) => i.id === tab || i.id === `x-${tab}`));
  return g?.cat.id;
};

const KNOW33 = (s: GameState, id: string): string => {
  const kl = knownLevel(s, id);
  if (kl.mine) return t(l('Seu', 'Yours'));
  const deg = kl.priv;
  return t(deg >= 1 ? DEGREES[deg - 1] : kl.pub >= 2 ? l('Pela imprensa', 'From the press') : l('Só o nome', 'Name only'));
};
const opinion33 = (v: number): string => t(v >= 30 ? l('boa', 'good') : v <= -30 ? l('ruim', 'bad') : l('neutra', 'neutral'));

// ================================================================== artista

function actSummary33(s: GameState, a: Act, info: HTMLElement[]): HTMLElement {
  const kl = knownLevel(s, a.id);
  const mine = kl.mine;
  const deg = mine ? 5 : kl.priv;
  const k = s.knowledge[a.id];
  const ms = a.members.map((x) => s.persons[x]).filter((p): p is Person => !!p);
  const solo = ms.length === 1;
  const st = actState(s, a);
  const pot = estimate(s, a.id, 'potential');
  const fame = estimate(s, a.id, 'fame');
  const pub2 = mine || deg >= 2 || canSee(s, a.id, 'fans');
  const img = a.image;
  const bio = canSee(s, a.id, 'bio');
  // foto: o retrato do próprio jogo (ato solo: a pessoa; banda: os integrantes quando conhecidos; senão o logo)
  const photo = solo && (bio || ms[0].alive !== undefined)
    ? portraitCanvas(ms[0], s, 5)
    : bio && ms.length ? h('div', { class: 'f33-band' }, ms.slice(0, 4).map((p) => portraitCanvas(p, s, ms.length > 2 ? 2 : 3))) : logo(a, 150);
  // carimbos: situação, dono, conhecimento, fonte/certeza
  const prov = info.find((x) => x.classList.contains('prov27'));
  const provTxt = prov ? txt33(prov.querySelector('span:not(.muted)') ?? prov) : '';
  const stamps = h('div', { class: 'f33-stamps' },
    stamp33(statusName(a.status), a.status === 'active' ? 'green' : 'red'),
    stamp33(a.owner === 'player' ? s.config.companyName : ownerName(s, a.owner), a.owner === 'player' ? 'green' : 'red', t(S.owner)),
    stamp33(KNOW33(s, a.id), 'blue', t(S.knownAs)),
    k ? stamp33(t(sourceName(k.source)), 'blue', t(S.source)) : null,
    provTxt ? stamp33(provTxt, 'blue', t(l('Fonte/certeza', 'Source/certainty'))) : null);
  const rest = info.filter((x) => x !== prov);
  const recs = a.history.slice(-2).reverse().map((mid) => s.memory.find((x) => x.id === mid)).filter((m): m is NonNullable<typeof m> => !!m);
  return h('div', { class: 'f33-sum' },
    h('div', { class: 'f33-side' },
      polaroid33(photo, a.name),
      h('div', { class: 'f33-wm' }, wordmarkImg28(a.logoSeed, a.name, a.genre, a.formed, 220)),
      stamps),
    h('div', { class: 'f33-main' },
      h('h2', { class: 'f33-name' }, a.name, a.legend ? pill(t(l('Lenda', 'Legend')), 'gold') : null, a.archetype === 'synthetic' ? pill('AI', 'neural') : null),
      h('p', { class: 'f33-subl' }, `${actGenre23(s, a)} · ${cityName(a.city)} · ${t(l('desde', 'since'))} ${a.formed} · ${t(S.owner).toLowerCase()}: `, labelLink(s, a.owner),
        solo ? h('span', null, ` · ${t(l('artista solo', 'solo artist'))}`) : null),
      rest.length ? h('div', { class: 'f33-info' }, ...rest) : null,
      h('div', { class: 'f33-cols' },
        sec33(t(l('Visão geral', 'Overview')),
          meter33(t(l('Alcance', 'Reach')), fame || mine ? a.fame : null, { text: fame || mine ? fameText(s, a.id) : undefined }),
          meter33(t(l('Embalo', 'Momentum')), pub2 ? a.momentum : null, { tone: 'o' }),
          h('div', { class: 'f33-row' }, h('span', { class: 'f33-k' }, t(l('Posição', 'Position'))),
            pub2 ? h('span', { class: 'f33-pos' }, h('small', null, t(S.underground)), h('span', { class: 'f33-track' }, h('i', { style: `left:${Math.max(0, Math.min(100, a.positioning))}%` })), h('small', null, t(S.crossover))) : hid15()),
          h('div', { class: 'f33-row' }, h('span', { class: 'f33-k' }, t(S.potential)),
            pot ? h('span', { class: 'f33-pot' }, h('span', { class: 'f33-track f33-range' }, h('i', { style: `left:${pot.lo}%;width:${Math.max(2, pot.hi - pot.lo)}%` })), h('b', { class: 'f33-n' }, `${pot.lo}–${pot.hi}`))
              : h('span', { class: 'f33-pot' }, h('i', { class: 'f33-redact', 'aria-hidden': 'true' }), h('small', null, mine || s.config.role === 'artist' ? t(S.hidden) : `${t(l('oculto', 'hidden'))} · ${t(l('dossiê A&R revela', 'A&R dossier reveals'))}`))),
          line33(t(S.fans), pub2 ? `${N(a.fans.casual)} ${t(S.casual)} · ${N(a.fans.active)} ${t(S.active)} · ${N(a.fans.core)} ${t(S.core)}` : hid15()),
          mine && !a.playerBand ? meter33(t(S.trust), a.trust) : null,
          deg >= 4 || mine ? meter33(t(S.morale), st.morale) : null,
          deg >= 4 || mine ? meter33(t(S.fatigue), st.fatigue, { tone: 'o' }) : null,
          deg >= 4 || mine ? meter33(t(S.stress), st.stress, { tone: 'r' }) : null,
          mine ? line33(t(l('Caixa próprio do ato', 'Act\'s own cash')), $(a.cash)) : null,
          deg >= 4 || mine ? line33(t(l('Temperamento × gênero', 'Temperament × genre')), h('span', null, pill(t(affinityLabel(actAffinity(s, a))), actAffinity(s, a) > 0.2 ? 'good' : actAffinity(s, a) < -0.2 ? 'bad' : ''), h('small', { class: 'muted' }, ` ${t(genreFamilyName(a.genre))}`))) : null),
        sec33(t(l('Reputação', 'Reputation')),
          ...(img && pub2 ? [
            meter33(t(l('Artística', 'Artistic')), img.artistic, { tone: 'g' }),
            meter33(t(l('Popularidade', 'Popularity')), img.popularity, { tone: 'g' }),
            meter33(t(l('Profissional', 'Professional')), img.professionalism, { tone: 'g' }),
            meter33(t(l('Imagem', 'Image')), img.publicImage, { tone: 'g' }),
          ] : [h('p', { class: 'muted small' }, t(HINT15))]))),
      sec33(t(l('Recordes', 'Records')), h('div', { class: 'f33-tags' },
        tag33(t(l('Melhor posição', 'Best position')), a.peakChart < 999 ? `#${a.peakChart}` : '—'),
        tag33(t(l('Top 10', 'Top 10')), a.hits), tag33(t(l('Nº 1', 'No. 1')), a.number1s), tag33(t(l('Prêmios', 'Awards')), a.awards),
        tag33(t(l('Lançamentos', 'Releases')), a.releases.length))),
      recs.length && bio ? sec33(t(l('Recortes', 'Clippings')), h('div', { class: 'f33-cuts' }, recs.map((m) => clipping33(`${monthName(m.month)} ${m.year}`, t(m.text))))) : null,
      ...ACT_OVERVIEW_EXTRAS.map((f) => f(s, a, deg, mine)),
    ));
}

/** Discos como capas (clique abre a ficha do disco). */
function discs33(s: GameState, a: Act, mine: boolean): HTMLElement {
  const rels = a.releases.map((id) => s.releases[id]).filter(Boolean).sort((x, y) => y.year - x.year || y.week - x.week);
  if (!rels.length) return h('p', { class: 'muted' }, t(l('Ainda sem lançamentos.', 'No releases yet.')));
  return h('div', { class: 'f33-discs' }, rels.map((r) => h('button', { type: 'button', class: 'f33-disc', 'data-ent': 'release', 'data-id': r.id, onclick: () => openRelease(r.id) },
    cover(s, r, 112),
    h('b', null, r.title, r.certified ? ` · ${r.certified}` : ''),
    h('small', null, `${r.year} · ${r.type.toUpperCase()}${r.peak < 999 ? ` · nº ${r.peak}` : ''}${mine ? ` · ${$(r.revenue)}` : ''}`))));
}

function actRows33(s: GameState, a: Act, harvested: Row33[], close: () => void): Row33[] {
  const kl = knownLevel(s, a.id);
  const mine = kl.mine;
  const rows: Row33[] = [];
  if (!mine && s.config.role !== 'artist') {
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    const months = c ? Math.max(0, Math.round((c.endWeek - s.week) / 4.35)) : 0;
    const lock = a.status === 'retired' || a.status === 'split'
      ? lockOf31(l(`${a.name} não está em atividade (${statusName(a.status)}).`, `${a.name} is not active (${statusName(a.status)}).`), l('Libera se voltar à ativa.', 'Unlocks if they return.'))
      : a.owner
        ? lockOf31(c ? l(`Contrato com ${ownerName(s, a.owner)} por mais ${months} meses.`, `Under contract with ${ownerName(s, a.owner)} for ${months} more months.`) : l(`Está com ${ownerName(s, a.owner)}.`, `With ${ownerName(s, a.owner)}.`),
          l('Libera quando o contrato acabar.', 'Unlocks when the contract ends.'))
        : null;
    rows.push({ id: 'offer', label: t(S.makeOffer), lock, run: () => { close(); openOffer(a.id); } });
  }
  rows.push(...harvested);
  if (!mine && s.config.role !== 'artist' && a.status !== 'retired' && a.status !== 'split') rows.push({ id: 'dossier', label: t(l('Dossiê de A&R (revela o potencial)', 'A&R dossier (reveals the potential)')), run: () => { close(); openDossier(a.id); } });
  // a 1ª ação liberada é a principal; os quadros ("Ações ▸") vão para o fim
  const out = [...rows.filter((r) => !r.panel), ...rows.filter((r) => r.panel)];
  const first = out.find((r) => !r.lock && !r.panel);
  if (first) first.primary = true;
  return out;
}

export function openAct33(id: string, tab?: string): boolean {
  const s = store.game;
  const a = s?.acts[id];
  if (!s || !a) return false;
  let sh: Open33 | undefined;
  const close = () => sh?.close();
  const items = actItems(s, a, close);
  const harvested: Row33[] = [];
  const info: HTMLElement[] = [];
  harvest33(ACT_HEAD_EXTRAS.map((f) => f(s, a, close)), harvested, info);
  const rows = actRows33(s, a, harvested, close);
  const kl = knownLevel(s, a.id);
  const mine = kl.mine;
  const ms = a.members.filter((x) => s.persons[x]);
  const solo = ms.length === 1;
  const lead = a.leaderId ?? ms[0];
  const marks = marks33(items, {
    overview: () => actSummary33(s, a, info),
    disco: () => discs33(s, a, mine),
  }, solo ? { members: t(l('Artista solo', 'Solo artist')) } : {});
  sh = paperSheet33({
    plate: t(l('Pasta do artista', 'Artist folder')),
    sub: `${t(l('Arquivo de aço', 'Steel filing cabinet'))} · ${a.name} · ${s.year}`,
    label: a.name,
    folder: filed33(a.name, solo),
    marks, mark: markOf33(items, tab),
    big: true, wide: true, pin: 'arquivoaco',
    card: () => ({
      title: a.name,
      nums: [
        { label: t(l('Contrato com', 'Contract with')), value: a.owner ? (a.owner === 'player' ? s.config.companyName : ownerName(s, a.owner)) : t(l('ninguém', 'nobody')) },
        { label: t(l('Conhecimento', 'Knowledge')), value: KNOW33(s, a.id) },
        ...(!mine && lead && hasOpinion(s, `p:${lead}`) ? [{ label: t(l('Opinião sobre você', 'Opinion of you')), value: opinion33(opinionOf(s, `p:${lead}`)) }] : []),
      ],
      rows,
    }),
  });
  return true;
}

// ================================================================== pessoa

function personSummary33(s: GameState, p: Person, info: HTMLElement[]): HTMLElement {
  const { act, mine, deg } = personDegree(s, p);
  const w = fuzz(deg, mine);
  const ovr = overall(s, p);
  const prov = info.find((x) => x.classList.contains('prov27'));
  const provTxt = prov ? txt33(prov.querySelector('span:not(.muted)') ?? prov) : '';
  // potencial pela regra única (know.ts), a mesma da página de antes (faixa com desvio; de terceiros só no grau 3)
  const pot = bandText(band(s, p.id, 'potential', p.potential, know(s, p.id).width('potential')));
  const age = !seen(s, p.id, 'bio') ? '?' : p.real27?.bornEst ? `~${s.year - p.born}` : String(s.year - p.born);
  return h('div', { class: 'f33-sum' },
    h('div', { class: 'f33-side' },
      polaroid33(portraitCanvas(p, s, 5), p.name),
      h('div', { class: 'f33-stamps' },
        stamp33(p.alive ? t(roleLine27(s, p, 2)) : t(l('falecido(a)', 'deceased')), p.alive ? 'green' : 'red'),
        p.isPlayer ? stamp33(t(l('você', 'you')), 'ink') : stamp33(KNOW33(s, p.id), 'blue', t(S.knownAs)),
        provTxt ? stamp33(provTxt, 'blue', t(l('Fonte/certeza', 'Source/certainty'))) : null)),
    h('div', { class: 'f33-main' },
      h('h2', { class: 'f33-name' }, p.name, mine && !p.isPlayer ? h('span', { class: 'f33-form' }, formIcon(form(p))) : null),
      h('p', { class: 'f33-subl' }, t(roleLine27(s, p)), ' · ', act ? actLink(s, act.id) : h('span', { class: 'muted' }, t(l('sem banda', 'no band'))), ` · ${age} ${t(l('anos', 'yrs'))}`),
      info.filter((x) => x !== prov).length ? h('div', { class: 'f33-info' }, ...info.filter((x) => x !== prov)) : null,
      h('div', { class: 'f33-cols' },
        sec33(t(l('Ficha', 'Record')),
          line33(t(l('Nota geral', 'Overall')), w >= 99 ? hid15() : (w ? shown(s, p.id, 'ovr', ovr, w) : String(ovr))),
          line33(t(S.potential), pot === '?' ? h('span', { class: 'f33-pot' }, h('i', { class: 'f33-redact', 'aria-hidden': 'true' }), h('small', null, t(S.hidden))) : pot),
          mine || seen(s, p.id, 'value') ? line33(t(l('Valor de mercado', 'Market value')), valueShown(s, p, act, mine)) : null,
          line33(t(l('Formação', 'Background')), seen(s, p.id, 'bio') ? t(ORIGINS.find((o) => o.id === p.origin)?.name) || '—' : '?')),
        mine ? sec33(t(l('Como está', 'How they are')),
          meter33(t(S.morale), p.morale), meter33(t(S.inspiration), p.inspiration, { tone: 'b' }),
          meter33(t(S.fatigue), p.fatigue, { tone: 'o' }), meter33(t(S.stress), p.stress, { tone: 'r' })) : null),
    ));
}

export function openPerson33(id: string, tab?: string): boolean {
  const s = store.game;
  const p = s?.persons[id];
  if (!s || !p) return false;
  let sh: Open33 | undefined;
  const closeAll = () => sh?.close();
  const { act, mine } = personDegree(s, p);
  const harvested: Row33[] = [];
  const info: HTMLElement[] = [];
  harvest33(PERSON_HEAD_EXTRAS.map((f) => f(s, p)), harvested, info);
  const rows: Row33[] = [...harvested];
  if (mine) rows.push({ id: 'look', label: t(l('Editar aparência', 'Edit look')), run: () => {
    const editor = appearanceEditor(p, (look) => { if (look) p.look = look; else delete p.look; sh?.redraw(); }, s.year);
    modal(t(l('Editar aparência', 'Edit look')) + ` — ${p.name}`, editor, { wide: true });
  } });
  if (act) rows.push({ id: 'act', label: t(l('Pasta do artista', 'Artist folder')), open: true, run: () => { closeAll(); openActPage(act.id); } });
  const out = [...rows.filter((r) => !r.panel), ...rows.filter((r) => r.panel)];
  const first = out.find((r) => !r.lock && !r.panel && !r.open);
  if (first) first.primary = true;
  let items = personItems(s, p, closeAll, () => sh?.redraw());
  const marks = () => marks33(items, {}, {}, { sum: () => personSummary33(s, p, info) });
  sh = paperSheet33({
    plate: t(l('Ficha da pessoa', 'Person record')),
    sub: `${t(l('Fichário de contatos', 'Rolodex'))} · ${p.name} · ${s.year}`,
    label: p.name,
    folder: filed33(p.name, true),
    marks: marks(), mark: markOf33(items, tab) ?? 'sum',
    big: true, wide: true, pin: 'fichario',
    onClose: () => { items = []; },
    card: () => ({
      title: p.name,
      nums: [
        { label: t(l('Função', 'Role')), value: t(roleLine27(s, p, 2)) },
        { label: t(l('Conhecimento', 'Knowledge')), value: p.isPlayer ? t(l('você', 'you')) : KNOW33(s, p.id) },
        ...(!p.isPlayer && hasOpinion(s, `p:${p.id}`) ? [{ label: t(l('Opinião sobre você', 'Opinion of you')), value: opinion33(opinionOf(s, `p:${p.id}`)) }] : []),
      ],
      rows: out,
    }),
  });
  return true;
}

// ================================================================== disco

const TYPE33: Record<string, ReturnType<typeof l>> = { single: l('Single', 'Single'), ep: l('EP', 'EP'), lp: l('Álbum (LP)', 'Album (LP)') };

/** Resumo do disco: a capa presa na pasta, carimbos (tipo, certificado, reedição, antes da run) e o miolo de antes. */
function releaseSummary33(s: GameState, r: Release, head: HTMLElement, grid: HTMLElement): HTMLElement {
  const info = head.children[1] as HTMLElement | undefined; // [capa, informações] da ficha de antes
  const keep = info ? [...info.children].slice(2) as HTMLElement[] : []; // sem o título e a linha artista · selo · ano (vão no papel)
  return h('div', { class: 'f33-sum' },
    h('div', { class: 'f33-side' },
      polaroid33(cover(s, r, 186), r.title),
      h('div', { class: 'f33-stamps' },
        stamp33(t(TYPE33[r.type] ?? l(r.type, r.type)), 'ink'),
        r.certified ? stamp33(r.certified, 'green') : null,
        r.reissueOf ? stamp33(t(l('reedição', 'reissue')), 'blue') : null,
        r.hist ? stamp33(t(l('antes da run', 'before the run')), 'blue') : null)),
    h('div', { class: 'f33-main' },
      h('h2', { class: 'f33-name' }, r.title),
      h('p', { class: 'f33-subl' }, actLink(s, r.actId), ' · ', labelLink(s, r.owner), ` · ${r.year}`),
      ...keep,
      grid));
}

export function openRelease33(id: string): boolean {
  const s = store.game;
  const r: Release | undefined = s?.releases[id];
  if (!s || !r) return false;
  let sh: Open33 | undefined;
  const x = releaseParts(s, r);
  const act = s.acts[r.actId];
  const extras = x.extras.filter((e): e is HTMLElement => !!e);
  const n = (s.reviews[r.id] ?? []).length;
  const marks: Mark33[] = [
    { id: 'sum', label: t(l('Resumo', 'Summary')), render: () => releaseSummary33(s, r, x.head, x.grid) },
    { id: 'tracks', label: t(l('Faixas', 'Tracklist')), count: trackList(s, r).length, render: () => h('div', null, ...x.tracks) },
    extras.length ? { id: 'more', label: t(l('Som e resultado', 'Sound and results')), count: extras.length, render: () => h('div', { class: 'f33-stack' }, ...extras) } : null,
    x.reviews ? { id: 'reviews', label: t(l('Críticas', 'Reviews')), count: n, render: () => x.reviews } : null,
    x.autopsy ? { id: 'autopsy', label: t(S.autopsy), render: () => x.autopsy } : null,
  ].filter((m): m is Mark33 => !!m);
  const rows: Row33[] = [];
  if (act) rows.push({ id: 'act', label: t(l('Pasta do artista', 'Artist folder')), open: true, run: () => { sh?.close(); inspect.act(act.id); } });
  if (r.owner && s.labels[r.owner]) rows.push({ id: 'label', label: t(l('Pasta do selo', 'Label folder')), open: true, run: () => { sh?.close(); inspect.label(r.owner); } });
  sh = paperSheet33({
    plate: t(l('Ficha do disco', 'Record sheet')),
    sub: `${t(l('Arquivo de aço', 'Steel filing cabinet'))} · ${r.title} · ${r.year}`,
    label: r.title,
    folder: act ? act.name : r.title,
    marks, big: true, wide: true, pin: 'arquivoaco',
    card: () => ({
      title: r.title,
      nums: [
        { label: t(S.peak), value: r.peak < 999 ? `#${r.peak}` : '—' },
        { label: t(l('Semanas na parada', 'Weeks on chart')), value: String(r.weeksOnChart || '—') },
        { label: t(S.totalUnits), value: N(r.totalUnits) },
      ],
      rows,
    }),
  });
  return true;
}

// ================================================================== selo

function labelSummary33(s: GameState, id: string, base: PageTab | undefined): HTMLElement {
  const me = isPlayerLabel(id);
  const lb = s.labels[id];
  const st = standingOf(s, id);
  const ld = me ? undefined : leaderOf(s, id);
  const roster = labelRoster13(s, id);
  const name = labelName13(s, id);
  const founded = me ? s.config.startYear : lb?.founded ?? s.year;
  const face = (a: Act) => {
    const ms = a.members.map((m) => s.persons[m]).filter((p): p is Person => !!p);
    return h('button', { type: 'button', class: 'f33-face', 'data-ent': 'act', 'data-id': a.id, onclick: () => inspect.act(a.id) },
      h('span', { class: 'f33-fph' }, ms.length === 1 ? portraitCanvas(ms[0], s, 2) : logo(a, 72)), h('b', null, a.name));
  };
  return h('div', { class: 'f33-sum' },
    h('div', { class: 'f33-side' },
      polaroid33(labelMarkImg28(id, name, founded, 150), name),
      h('div', { class: 'f33-stamps' },
        stamp33(me ? t(l('seu selo', 'your label')) : t(l('rival', 'rival')), me ? 'green' : 'red'),
        lb?.archetype ? stamp33(`${t(ARCH[lb.archetype])} · ${founded}`, 'blue') : null,
        lb && !lb.active ? stamp33(`${t(l('fechado', 'closed'))}${lb.closedYear ? ` ${lb.closedYear}` : ''}`, 'red') : null,
        lb?.parentLabel ? stamp33(`${t(l('subselo de', 'sub-label of'))} ${labelName13(s, lb.parentLabel)}`, 'ink') : null)),
    h('div', { class: 'f33-main' },
      h('h2', { class: 'f33-name' }, name),
      h('p', { class: 'f33-subl' }, `${cityName(me ? s.config.homeCity : lb.city)} · ${t(l('desde', 'since'))} ${founded}${ld ? ` · ${t(l('líder', 'leader'))}: ${ld.name}` : lb?.ceo ? ` · CEO ${lb.ceo}` : ''}`),
      h('div', { class: 'f33-cols' },
        sec33(t(l('Força', 'Strength')), ...STAND_KEYS.map((k) => meter33(t(STAND_NAME[k]), st[k], { tone: k === 'mom' ? 'o' : 'g' }))),
        sec33(t(l('Elenco em destaque', 'Roster highlights')), roster.length ? h('div', { class: 'f33-faces' }, ...roster.slice(0, 4).map(face), roster.length > 4 ? h('span', { class: 'f33-more' }, `+${roster.length - 4}`) : null) : h('p', { class: 'muted small' }, '—'))),
      base ? sec33(t(l('Visão geral', 'Overview')), base.render()) : null));
}

export function openLabel33(id: string, tab?: string): boolean {
  const s = store.game;
  if (!s || (!isPlayerLabel(id) && !s.labels[id])) return false;
  let sh: Open33 | undefined;
  const close = () => sh?.close();
  const me = isPlayerLabel(id);
  const items = labelItems13(s, id, close);
  const name = labelName13(s, id);
  const marks = marks33(items, { overview: (it) => labelSummary33(s, id, it) });
  const markOfTab = (tabId: string) => markOf33(items, tabId);
  const feud = Math.round(s.rivalries?.[id] ?? 0);
  const ld = me ? undefined : leaderOf(s, id);
  const roster = labelRoster13(s, id).length;
  const rows: Row33[] = [];
  const goRow = (tabId: string, label: string) => { const m = markOfTab(tabId); if (m) rows.push({ id: `go-${tabId}`, label, open: true, run: () => sh?.go(m) }); };
  goRow('money', t(l('Finanças e ações', 'Finances and stock')));
  if (!me) goRow('you', t(l('Relação com você', 'Relationship with you')));
  goRow('roster', t(l('Elenco', 'Roster')));
  goRow('history', t(l('História', 'History')));
  sh = paperSheet33({
    plate: t(l('Pasta do selo', 'Label folder')),
    sub: `${t(l('Arquivo de aço', 'Steel filing cabinet'))} · ${name} · ${me ? t(l('você', 'you')) : t(l('rival', 'rival'))} · ${s.year}`,
    label: name,
    folder: name,
    marks, mark: markOf33(items, tab),
    big: true, wide: true, pin: 'arquivoaco',
    card: () => ({
      title: name,
      nums: [
        { label: t(l('Relação', 'Relationship')), value: me ? t(l('seu selo', 'your label')) : t(l('rival', 'rival')) },
        { label: t(l('Artistas no elenco', 'Acts on the roster')), value: String(roster) },
        ...(!me ? [{ label: t(l('Rixa com você', 'Feud with you')), value: String(feud) }] : []),
        ...(ld && hasOpinion(s, `l:${ld.id}`) ? [{ label: t(l('Opinião sobre você', 'Opinion of you')), value: opinion33(opinionOf(s, `l:${ld.id}`)) }] : []),
      ],
      rows,
    }),
  });
  return true;
}

// ---------------------------------------------------------------- liga

OPEN33.act = openAct33;
OPEN33.person = openPerson33;
OPEN33.release = openRelease33;
OPEN33.label = openLabel33;
