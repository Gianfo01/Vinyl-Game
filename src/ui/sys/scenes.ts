// Interface das cenas da rodada 4: cada local em pixel art (premiação, TV, rádio, tribunal, pregão,
// estrada, clínica, mansão, rua, feira, loja, fábrica, clube...) com as escolhas da simulação,
// a galeria "Lugares" e os botões para dar entrevista e visitar a rádio.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Cutscene } from '../../sim/ext4';
import { awardSpeech, type SpeechChoice } from '../../sim/sys/scenes/awards';
import { agmVote, type AgmChoice } from '../../sim/sys/scenes/board';
import { appealVerdict, courtChoice, expertFee, type CourtChoice } from '../../sim/sys/scenes/court';
import { TONES, TONE_NAMES, autoAnswers, canInterview, reaction, resolveInterview, startInterview, type Question, type Tone } from '../../sim/sys/scenes/interview';
import { BOOTH_COST, CLUB_NIGHTS, clubNight, factoryOvertime, fairChoice, farewellChoice, mansionParty, streetChoice, type BoothSize } from '../../sim/sys/scenes/life';
import { MOOD_NAMES, canVisitRadio, radioFit, resolveRadio, startRadioVisit, type DjMood } from '../../sim/sys/scenes/radio';
import { sc, type PlaceKind } from '../../sim/sys/scenes/state';
import { resolveVignette, vignetteOptions, type VignetteKind } from '../../sim/sys/scenes/tour';
import type { GameState } from '../../sim/types';
import { money, playerActs, rngOf } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { randomLook, lookOf } from '../pixel/avatar';
import { PLACE_NAMES, placeView, placesOfYear, type Actor, type PlaceFx } from '../pixel/places';
import { openCutscene, openScene, registerCutscene, registerSection } from '../registry';
import { store } from '../store';
import { ic, lineChart, scoreBadge } from '../vis';
import './scenes.css';

// ------------------------------------------------------------------ peças comuns

function actorsFor(s: GameState, actId: unknown, hostSeed?: string): Actor[] {
  const out: Actor[] = [];
  const act = typeof actId === 'string' ? s.acts[actId] : undefined;
  const members = act ? act.members.map((id) => s.persons[id]).filter((p) => p?.alive) : [];
  const spots = ['main', 'side', 'extra'];
  members.slice(0, 3).forEach((p, i) => out.push({ look: lookOf(p), role: p.role, spot: spots[i], mark: i === 0 }));
  if (hostSeed) out.push({ look: randomLook(hostSeed), spot: 'host', dir: 'SW' });
  return out;
}

function stage(s: GameState, cs: Cutscene, opts: { fx?: PlaceFx; energy?: number; host?: string } = {}): HTMLElement {
  const place = (cs.data.place as PlaceKind) ?? 'street';
  return placeView(place, { year: s.year, actors: actorsFor(s, cs.data.actId, opts.host ?? `host:${cs.id}`), fx: opts.fx, energy: opts.energy, alt: `${t(PLACE_NAMES[place])}: ${t(cs.data.title as L)}`, cls: 'scene-stage' });
}

function textOf(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return t(v as L);
}

/** Moldura comum: local animado, texto e uma área de escolhas que vira o resultado. */
function frame(s: GameState, cs: Cutscene, close: () => void, body: HTMLElement | null, opts: { fx?: PlaceFx; energy?: number } = {}): HTMLElement {
  return h('div', { class: 'scene-frame' },
    stage(s, cs, opts),
    cs.data.text ? h('p', { class: 'scene-text' }, textOf(cs.data.text)) : null,
    body,
    h('div', { class: 'row scene-close' }, h('button', { class: 'btn ghost', onclick: close }, t(l('Fechar', 'Close')))),
  );
}

/** Lista de escolhas: ao clicar, aplica e troca os botões pelo resultado. */
function choices(opts: { label: L | string; hint?: L; run: () => L | string }[]): HTMLElement {
  const box = h('div', { class: 'scene-choices' });
  const done = (msg: L | string) => box.replaceChildren(h('p', { class: 'scene-result', role: 'status' }, typeof msg === 'string' ? msg : t(msg)));
  box.append(...opts.map((o) => h('button', { class: 'btn', onclick: () => { done(o.run()); rerender(); } }, typeof o.label === 'string' ? o.label : t(o.label), o.hint ? h('small', { class: 'muted' }, ` ${t(o.hint)}`) : null)));
  return box;
}

function already(cs: Cutscene): HTMLElement | null {
  const res = cs.data.result as L | undefined;
  return cs.data.done || res ? h('p', { class: 'scene-result' }, res ? t(res) : t(l('Já resolvido.', 'Already resolved.'))) : null;
}

// ------------------------------------------------------------------ premiação

type Cat = { id: string; name: L; nominees: { name: string; mine: boolean }[]; winner: number; mine: boolean };

registerCutscene('awards', (s, cs, close) => {
  const cats = (cs.data.cats as Cat[]) ?? [];
  const list = h('div', { class: 'aw-cats' });
  let i = 0;
  const speech = h('div');
  const reveal = () => {
    if (i >= cats.length) return;
    const c = cats[i++];
    const card = h('div', { class: 'aw-cat' }, h('b', null, textOf(c.name)), h('ul', null, c.nominees.map((n) => h('li', { class: n.mine ? 'mine' : '' }, n.name))), h('p', { class: 'aw-env' }, ic('contract'), ` ${t(l('Abrindo o envelope…', 'Opening the envelope…'))}`));
    list.appendChild(card);
    setTimeout(() => {
      const w = c.nominees[c.winner];
      card.querySelector('.aw-env')?.replaceWith(h('p', { class: `aw-win ${w?.mine ? 'good' : ''}` }, ic('trophy'), ` ${w?.name ?? '—'}`));
      if (i >= cats.length) showSpeech();
    }, document.documentElement.classList.contains('reduced-motion') ? 0 : 700);
  };
  const showSpeech = () => {
    if (!cs.data.won) return speech.replaceChildren(h('p', { class: 'muted' }, t(l('Desta vez o troféu foi para outros. Ano que vem tem mais.', 'This time the trophy went to others. There is always next year.'))));
    if (cs.data.speech) return speech.replaceChildren(already(cs) ?? h('span'));
    const sp: { id: SpeechChoice; label: L; hint: L }[] = [
      { id: 'team', label: l('Agradecer a equipe', 'Thank the team'), hint: l('Moral e confiança.', 'Morale and trust.') },
      { id: 'rival', label: l(`Provocar ${cs.data.rivalName ?? 'o rival'}`, `Taunt ${cs.data.rivalName ?? 'the rival'}`), hint: l('Manchetes e rivalidade.', 'Headlines and rivalry.') },
      { id: 'political', label: l('Discurso político', 'Political speech'), hint: l('Prestígio; censores atentos.', 'Prestige; censors take note.') },
      { id: 'short', label: l('Curto e elegante', 'Short and elegant'), hint: l('Seguro.', 'Safe.') },
    ];
    speech.replaceChildren(h('h4', null, t(l('Seu discurso', 'Your speech'))), choices(sp.map((o) => ({ label: o.label, hint: o.hint, run: () => awardSpeech(s, rngOf(s), cs.id, o.id) }))));
  };
  setTimeout(reveal, 0);
  return frame(s, cs, close, h('div', null,
    list,
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: reveal }, t(l('Próxima categoria', 'Next category'))), h('button', { class: 'btn ghost', onclick: () => { while (i < cats.length) reveal(); } }, t(l('Revelar todas', 'Reveal all')))),
    speech,
  ), { fx: cs.data.won ? 'confetti' : 'spot', energy: 0.8 });
});

// ------------------------------------------------------------------ entrevista / coletiva

registerCutscene('interview', (s, cs, close) => {
  const qs = (cs.data.questions as Question[]) ?? [];
  if (cs.data.done) return frame(s, cs, close, already(cs));
  const answers: (Tone | null)[] = [];
  const box = h('div', { class: 'iv-box' });
  let timer = 0;
  const finish = () => {
    clearInterval(timer);
    const res = resolveInterview(s, rngOf(s), cs.id, answers);
    if ('pt' in res) { box.replaceChildren(h('p', null, t(res))); return; }
    box.replaceChildren(...([
      h('p', null, t(l('Nota da entrevista: ', 'Interview grade: ')), scoreBadge(res.grade / 10)),
      res.transcript ? h('ol', { class: 'iv-transcript' }, res.transcript.map((x) => h('li', { class: x.mood },
        h('div', { class: 'muted small' }, `“${t(x.q)}”`),
        h('div', null, x.a ? `— ${t(x.a)}` : t(l('— (silêncio)', '— (silence)'))),
        h('small', null, t(x.r))))) : null,
      h('ul', null, res.lines.map((x) => h('li', null, t(x))))] as (HTMLElement | null)[]).filter((x): x is HTMLElement => !!x));
    rerender();
  };
  const ask = (k: number) => {
    clearInterval(timer);
    if (k >= qs.length) return finish();
    let left = 15;
    const clock = h('span', { class: 'iv-clock', 'aria-live': 'off' }, `${left}s`);
    const q = qs[k];
    const choose = (tn: Tone | null) => {
      clearInterval(timer);
      answers[k] = tn;
      const re = reaction(q, tn);
      box.replaceChildren(h('p', { class: 'iv-q' }, `“${t(q.text)}”`), tn && q.answers ? h('p', { class: 'iv-a' }, `— ${t(q.answers[tn])}`) : '', h('p', { class: `iv-react ${re.mood}` }, t(re.text)));
      setTimeout(() => ask(k + 1), document.documentElement.classList.contains('reduced-motion') ? 0 : 1100);
    };
    const order = [...TONES].sort((a, b) => ((q.text.pt.length * 7 + a.length * 3) % 5) - ((q.text.pt.length * 7 + b.length * 3) % 5));
    box.replaceChildren(
      h('p', { class: 'iv-q' }, h('small', { class: 'muted' }, `${k + 1}/${qs.length} · ${String((cs.data.venue as { host?: string })?.host ?? '')}`), h('br'), `“${t(q.text)}”`),
      h('div', { class: 'iv-answers' }, order.map((tn) => h('button', { class: 'btn iv-ans', onclick: () => choose(tn) },
        h('span', null, q.answers ? t(q.answers[tn]) : t(TONE_NAMES[tn])), q.answers ? h('small', { class: 'muted' }, t(TONE_NAMES[tn])) : null))),
      clock,
    );
    if (!document.documentElement.classList.contains('reduced-motion')) {
      timer = window.setInterval(() => {
        left -= 1;
        clock.textContent = `${left}s`;
        if (left <= 0) choose(null);
      }, 1000);
    }
  };
  const start = h('div', { class: 'row' },
    h('button', { class: 'btn primary', onclick: () => ask(0) }, t(l('Começar a entrevista', 'Start the interview'))),
    h('button', { class: 'btn ghost', onclick: () => { const a = autoAnswers(s, rngOf(s), cs.id); a.forEach((x, i) => (answers[i] = x)); finish(); } }, t(l('Resolver automático', 'Auto-resolve'))));
  box.append(h('p', { class: 'muted small' }, t(l('Escolha a resposta para cada pergunta. O tom de cada uma aparece embaixo; sem resposta em 15 segundos, conta como silêncio.', 'Pick the answer to each question. Each one\'s tone is shown below it; no answer in 15 seconds counts as silence.'))), start);
  if (store.prefs.minigames === 'auto') setTimeout(() => (start.lastChild as HTMLButtonElement)?.click(), 0);
  return frame(s, cs, () => { clearInterval(timer); close(); }, box, { fx: 'flash' });
});

// ------------------------------------------------------------------ rádio

registerCutscene('radio', (s, cs, close) => {
  const dj = cs.data.dj as { name: string; family: string; mood: DjMood; audience: string };
  const opts = ((cs.data.options as string[]) ?? []).map((id) => s.releases[id]).filter(Boolean);
  if (cs.data.done) return frame(s, cs, close, already(cs));
  let payola = false;
  const body = h('div', null,
    h('p', null, `${dj?.name ?? 'DJ'} · ${t(MOOD_NAMES[dj?.mood] ?? l('?', '?'))} · ${dj?.audience ?? ''}`),
    h('p', { class: 'muted small' }, t(l('Escolha o disco certo para o perfil do programa.', 'Pick the right record for the show profile.'))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e: Event) => { payola = (e.target as HTMLInputElement).checked; } }), t(l('Deixar um envelope (jabá)', 'Leave an envelope (payola)'))),
    choices(opts.map((rel) => ({ label: `"${rel.title}" (${Math.round(radioFit(s, dj as never, rel) * 100)}%)`, run: () => resolveRadio(s, rngOf(s), cs.id, rel.id, payola) }))),
  );
  return frame(s, cs, close, body, { fx: 'spot' });
});

// ------------------------------------------------------------------ tribunal

registerCutscene('court', (s, cs, close) => {
  if (cs.data.done) return frame(s, cs, close, already(cs));
  const opts: { id: CourtChoice; label: L; hint?: L }[] = [
    { id: 'settle', label: l('Propor acordo', 'Offer a settlement'), hint: l('Encerra já, paga parte.', 'Ends now, pays part.') },
    { id: 'expert', label: l('Chamar perito musical', 'Call a music expert'), hint: l(`Custa ${$(expertFee(s))}; melhora as chances.`, `Costs ${$(expertFee(s))}; better odds.`) },
    { id: 'witness', label: l('Testemunha surpresa', 'Surprise witness'), hint: l('Pode virar o jogo ou piorar.', 'May turn the tables or backfire.') },
    { id: 'trust', label: l('Confiar nos advogados', 'Trust the lawyers'), hint: l('Sem custo extra.', 'No extra cost.') },
  ];
  return frame(s, cs, close, h('div', null,
    h('p', null, `${textOf(cs.data.plaintiff)} × ${textOf(cs.data.defendant)} · ${t(l('chance estimada', 'estimated odds'))} ${Math.round(Number(cs.data.odds ?? 0.5) * 100)}%`),
    choices(opts.map((o) => ({ label: o.label, hint: o.hint, run: () => courtChoice(s, rngOf(s), cs.id, o.id) }))),
  ));
});

registerCutscene('appeal', (s, cs, close) => {
  if (cs.data.done) return frame(s, cs, close, already(cs));
  return frame(s, cs, close, h('div', null,
    h('p', null, `${t(l('Condenação', 'Damages'))}: ${$(Number(cs.data.claim ?? 0))} · ${t(l('custo do recurso', 'appeal cost'))}: ${$(Number(cs.data.fee ?? 0))}`),
    choices([
      { label: l('Recorrer', 'Appeal'), run: () => appealVerdict(s, rngOf(s), cs.id, true) },
      { label: l('Aceitar a sentença', 'Accept the verdict'), run: () => appealVerdict(s, rngOf(s), cs.id, false) },
    ]),
  ));
});

// ------------------------------------------------------------------ bolsa e conselho

registerCutscene('ipo', (s, cs, close) => frame(s, cs, close, h('div', null,
  h('p', null, `${textOf(cs.data.company)} · ${t(l('preço de abertura', 'opening price'))}: ${$(Number(cs.data.price ?? 0))}`),
  ((cs.data.history as number[]) ?? []).length > 1 ? lineChart(cs.data.history as number[]) : null,
), { fx: 'bell' }));

registerCutscene('agm', (s, cs, close) => {
  if (cs.data.done) return frame(s, cs, close, already(cs));
  const sh = (cs.data.shareholders as { name: string; weight: number; mood: number }[]) ?? [];
  const opts: { id: AgmChoice; label: L }[] = [
    { id: 'dividend', label: l('Propor dividendos', 'Propose dividends') },
    { id: 'expand', label: l('Propor expansão', 'Propose expansion') },
    { id: 'mission', label: l('Defender a missão artística', 'Defend the artistic mission') },
  ];
  return frame(s, cs, close, h('div', null,
    h('ul', { class: 'small agm-list' }, sh.map((x) => h('li', null, `${x.name} · ${x.weight}% · `, pill(x.mood > 0.2 ? t(l('satisfeito', 'pleased')) : x.mood < -0.2 ? t(l('irritado', 'annoyed')) : t(l('neutro', 'neutral')), x.mood > 0.2 ? 'good' : x.mood < -0.2 ? 'bad' : '')))),
    choices(opts.map((o) => ({ label: o.label, run: () => agmVote(s, rngOf(s), cs.id, o.id) }))),
  ));
});

registerCutscene('sublabel', (s, cs, close) => frame(s, cs, close, null));

// ------------------------------------------------------------------ estrada

registerCutscene('vignette', (s, cs, close) => {
  if (cs.data.done) return frame(s, cs, close, already(cs));
  const k = cs.data.vkind as VignetteKind;
  const extra = cs.data.rider ? h('p', { class: 'small' }, `${t(l('Pedido do camarim', 'Rider request'))}: ${textOf(cs.data.rider)}`) : null;
  return frame(s, cs, close, h('div', null, extra, choices(vignetteOptions(k).map((o) => ({ label: o.label, hint: o.hint, run: () => resolveVignette(s, rngOf(s), cs.id, o.id) })))));
});

// ------------------------------------------------------------------ vida

registerCutscene('farewell', (s, cs, close) => {
  if (cs.data.done) return frame(s, cs, close, already(cs));
  return frame(s, cs, close, choices([
    { label: l('Prestar homenagem pública', 'Pay public tribute'), hint: l('Comoção e respeito; lançamentos do catálogo vendem mais.', 'Grief and respect; catalog sells more.'), run: () => farewellChoice(s, cs.id, true) },
    { label: l('Despedida discreta', 'A quiet goodbye'), hint: l('Respeito à família.', 'Respect for the family.'), run: () => farewellChoice(s, cs.id, false) },
  ]));
});

for (const kind of ['clinic', 'hall', 'hologram', 'number1', 'busfx', 'store', 'videoset', 'sublabel_info']) {
  const fx: PlaceFx = kind === 'number1' ? 'confetti' : kind === 'busfx' ? 'bus' : kind === 'hall' ? 'spot' : kind === 'hologram' ? 'flash' : 'none';
  registerCutscene(kind, (s, cs, close) => frame(s, cs, close, cs.data.actId ? h('p', null, actLink(s, String(cs.data.actId))) : null, { fx, energy: kind === 'number1' ? 1 : 0.5 }));
}

registerCutscene('goldfx', (s, cs, close) => frame(s, cs, close, h('p', { class: 'scene-gold' }, ic('trophy', 3), ' ', String(cs.data.level ?? 'gold').toUpperCase()), { fx: 'gold' }));

registerCutscene('mansion', (s, cs, close) => {
  if (cs.data.done) return frame(s, cs, close, already(cs));
  return frame(s, cs, close, choices([
    { label: l('Dar uma festa', 'Throw a party'), hint: l('Contatos e fofoca; custa caro.', 'Contacts and gossip; pricey.'), run: () => mansionParty(s, cs.id, true) },
    { label: l('Aproveitar em paz', 'Enjoy it quietly'), hint: l('Menos estresse.', 'Less stress.'), run: () => mansionParty(s, cs.id, false) },
  ]));
});

registerCutscene('street', (s, cs, close) => {
  if (cs.data.done) return frame(s, cs, close, already(cs));
  return frame(s, cs, close, choices([
    { label: l('Parar e conversar', 'Stop and talk'), hint: l('O olheiro anota tudo.', 'Your scout takes notes.'), run: () => streetChoice(s, cs.id, true) },
    { label: l('Seguir caminho', 'Walk on'), run: () => streetChoice(s, cs.id, false) },
  ]), { energy: 0.6 });
});

registerCutscene('fair', (s, cs, close) => {
  if (cs.data.done) return frame(s, cs, close, already(cs));
  const sizes: BoothSize[] = ['none', 'small', 'medium', 'large'];
  const names: Record<BoothSize, L> = { none: l('Só visitar', 'Just visit'), small: l('Estande pequeno', 'Small booth'), medium: l('Estande médio', 'Medium booth'), large: l('Estande grande', 'Large booth') };
  return frame(s, cs, close, h('div', null,
    h('p', { class: 'small' }, `${textOf(cs.data.city)} · ${t(l('rivais presentes', 'rivals attending'))}: ${((cs.data.rivals as { name: string }[]) ?? []).map((x) => x.name).join(', ')}`),
    choices(sizes.map((z) => ({ label: `${t(names[z])}${z !== 'none' ? ` (${$(money(s, BOOTH_COST[z]))})` : ''}`, run: () => fairChoice(s, rngOf(s), cs.id, z) }))),
  ));
});

registerCutscene('factory', (s, cs, close) => {
  if (cs.data.done) return frame(s, cs, close, already(cs));
  return frame(s, cs, close, choices([
    { label: l('Pagar hora extra na fábrica', 'Pay plant overtime'), hint: l('Discos chegam antes; custa caro.', 'Records arrive sooner; costly.'), run: () => factoryOvertime(s, cs.id, true) },
    { label: l('Esperar a fila', 'Wait for the queue'), run: () => factoryOvertime(s, cs.id, false) },
  ]));
});

registerCutscene('club', (s, cs, close) => {
  if (cs.data.done) return frame(s, cs, close, already(cs));
  return frame(s, cs, close, choices(CLUB_NIGHTS.map((n) => ({ label: n.name, run: () => clubNight(s, rngOf(s), cs.id, n.id) }))), { energy: 0.9 });
});

// ------------------------------------------------------------------ ações: entrevista e rádio

registerSection('artists', {
  id: 'scenes-actions',
  order: 54,
  render: (s) => {
    const id = store.selectedAct && playerActs(s).includes(store.selectedAct) ? store.selectedAct : playerActs(s)[0];
    if (!id) return null;
    const ivErr = canInterview(s, id);
    const rdErr = canVisitRadio(s, id);
    return section(t(l('Imprensa e rádio', 'Press and radio')),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn', disabled: !!ivErr, title: ivErr ? t(ivErr) : '', onclick: () => { const cs = startInterview(s, rngOf(s), id); if ('pt' in cs && !('kind' in cs)) toast(t(cs as L), 'bad'); else openCutscene(s, cs as Cutscene, rerender); } }, ic('tv'), ` ${t(l('Dar entrevista', 'Give an interview'))}`),
        h('button', { class: 'btn', disabled: !!rdErr, title: rdErr ? t(rdErr) : '', onclick: () => { const cs = startRadioVisit(s, rngOf(s), id); if ('pt' in cs && !('kind' in cs)) toast(t(cs as L), 'bad'); else openCutscene(s, cs as Cutscene, rerender); } }, ic('radio'), ` ${t(l('Visitar uma rádio', 'Visit a radio station'))}`)),
      ivErr || rdErr ? h('p', { class: 'muted small' }, [ivErr, rdErr].filter(Boolean).map((x) => t(x as L)).join(' · ')) : null,
    );
  },
});

// ------------------------------------------------------------------ galeria "Lugares"

registerSection('world', {
  id: 'scenes-gallery',
  order: 70,
  render: (s) => {
    const st = sc(s);
    const places = placesOfYear(s.year);
    return section(t(l('Lugares', 'Places')),
      h('p', { class: 'muted small' }, t(l('Os locais da sua época e as cenas que você viveu. Clique para rever.', 'The places of your era and the scenes you lived. Click to revisit.'))),
      h('div', { class: 'place-strip' }, places.map((p) => h('button', { class: 'place-thumb', onclick: () => openScene(PLACE_NAMES[p], () => placeView(p, { year: s.year, alt: t(PLACE_NAMES[p]), energy: 0.6 })) }, t(PLACE_NAMES[p])))),
      st.archive.length ? h('ul', { class: 'small scene-archive' }, st.archive.slice(-14).reverse().map((a) => h('li', null,
        h('button', { class: 'link', onclick: () => { const data = st.archiveData[a.id] ?? { title: a.title, place: a.place }; openScene(a.title, (close) => frame(s, { id: a.id, kind: a.kind, week: a.week, data: { ...data, place: a.place, done: true } }, close, null)); } }, `${a.year} · ${t(a.title)}`), ' ', h('small', { class: 'muted' }, t(PLACE_NAMES[a.place]))))) : null,
    );
  },
});
