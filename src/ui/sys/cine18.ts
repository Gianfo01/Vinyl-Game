// Rodada 18 (cine18) — interface: cerimônia de premiação como storyboard (tapete vermelho com escolha de figurino,
// indicados com retrato, apresentador, envelope, vencedor e reações, subida, discurso com balão do tema escolhido,
// festa), os grandes momentos (nº 1, Hall, funeral, holograma, estádio lotado, festival, estreia, veredito, programa
// musical) como storyboards, cenas interativas do scene17 com quadros que refletem a escolha, a Cinemateca no Álbum
// de cenas e a aba "Legado póstumo" em Lendas (espólios, hologramas, avatares, IA, cofre, filmes, tributos).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Cutscene } from '../../sim/ext4';
import { FIT18, awOfCs18, awardBoard18, board18, boardOfScene18, chooseFit18, cine18, fitsNow18, shot18, type Board18, type Frame18, type Kind18, type Shot18 } from '../../sim/sys/cine18';
import { PK18, SHARE18, STANCE18, ask18, back18, block18, cands18, estate18, forecast18, kindsNow18, mediate18, mediateCost18, post18, projOf18, REAL18, start18, tech18, type PK18 as PKind, type Share18, type Style18 } from '../../sim/sys/post18';
import { result17 } from '../../sim/sys/scene17';
import { farewellChoice } from '../../sim/sys/scenes/life';
import { exactHist } from '../../sim/history15';
import type { GameState } from '../../sim/types';
import { $, actLink, monthName, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { boardView18 } from '../pixel/cine18';
import { openScene, registerCutscene } from '../registry';
import { ic } from '../vis';
import { ALBUM17_X, VIEW17_X, awardChoices17 } from './scene17';
import { personLink16 } from './people16';

const T = (x: L | string | undefined) => (x === undefined ? '' : typeof x === 'string' ? x : t(x));
const close1 = (close: () => void) => h('div', { class: 'row scene-close' }, h('button', { class: 'btn ghost', onclick: close }, t(l('Fechar', 'Close'))));

/** Observa cliques numa decisão do scene17 e remonta o storyboard quando ela termina. */
function watch(el: HTMLElement, done: () => boolean, refresh: () => void): HTMLElement {
  el.addEventListener('click', () => setTimeout(() => { if (done()) refresh(); }, 0));
  return el;
}

// ---------------------------------------------------------------- cerimônia de premiação

function awardsScene(s: GameState, cs: Cutscene, close: () => void): HTMLElement {
  const aw = awOfCs18(s, cs);
  const key = `aw:${cs.id}`;
  const cat = aw.cats.find((c) => c.nominees.some((n) => n.mine)) ?? aw.cats[0];
  const actId = (aw.won ? aw.actId : undefined) ?? cat?.nominees.find((n) => n.mine)?.actId ?? aw.actId ?? undefined;
  const slot = (f: Frame18, refresh: () => void): HTMLElement | null => {
    if (f.slot === 'outfit') {
      if (cine18(s).fit[key] || !actId) return null;
      return h('div', null, h('h4', null, t(l('Figurino do tapete vermelho', 'Red carpet outfit'))), h('div', { class: 'scene-choices' }, fitsNow18(aw.year).map((k) => h('button', { class: 'btn', type: 'button', onclick: () => {
        const r = chooseFit18(s, key, k, actId);
        if (r) toast(`${t(r.out)} ${r.lines.map((x) => t(x)).join(' · ')}`, 'good');
        refresh();
      } }, h('span', null, t(FIT18[k].name)), h('small', { class: 'muted' }, t(FIT18[k].hint))))));
    }
    if ((f.slot === 'speech' || f.slot === 'reaction') && !result17(s, key)) {
      const x = awardChoices17(s, cs);
      return x ? watch(h('div', null, h('h4', null, t(f.slot === 'speech' ? l('Seu discurso', 'Your speech') : l('Sua reação', 'Your reaction'))), x), () => !!result17(s, key), refresh) : null;
    }
    return null;
  };
  const others = aw.cats.filter((c) => c !== cat);
  return h('div', { class: 'scene-frame c18-scene' },
    boardView18(s, awardBoard18(s, aw), { slot, rebuild: () => awardBoard18(s, aw) }),
    others.length ? h('details', null, h('summary', null, t(l('Outras categorias da noite', 'Other categories of the night'))),
      h('ul', { class: 'small' }, others.map((c) => h('li', null, h('b', null, T(c.name)), ': ', c.nominees.map((n, i) => h('span', { class: i === c.winner ? (n.mine ? 'good' : '') : 'muted' }, i === c.winner ? `★ ${n.name}` : n.name, i < c.nominees.length - 1 ? ', ' : '')))))) : null,
    ((cs.data.regional as { name: string; mine: boolean }[] | undefined) ?? []).length ? h('p', { class: 'small muted' }, `${t(l('Prêmios regionais', 'Regional awards'))}: `, ((cs.data.regional as { name: string; mine: boolean }[]) ?? []).map((x, i, xs) => h('span', { class: x.mine ? 'good' : '' }, x.name, i < xs.length - 1 ? ' · ' : ''))) : null,
    result17(s, key) ? h('ul', { class: 'small s17-fx' }, result17(s, key)!.lines.map((x) => h('li', null, T(x)))) : null,
    close1(close));
}
registerCutscene('awards', awardsScene);

// ---------------------------------------------------------------- grandes momentos

const shotOf = (cs: Cutscene, k: Kind18, s: GameState, extra: Partial<Shot18> = {}): Shot18 => {
  const actId = cs.data.actId ? String(cs.data.actId) : undefined;
  return { id: cs.id, k, y: s.year, m: s.month, w: cs.week, act: actId, city: actId ? s.acts[actId]?.city : undefined, text: cs.data.text as L | undefined, ...extra };
};
const simple = (k: Kind18, pick?: (s: GameState, cs: Cutscene) => Partial<Shot18>) => (s: GameState, cs: Cutscene, close: () => void) =>
  h('div', { class: 'scene-frame c18-scene' }, boardView18(s, board18(s, shotOf(cs, k, s, pick?.(s, cs)))), cs.data.actId ? h('p', null, actLink(s, String(cs.data.actId))) : null, close1(close));
registerCutscene('number1', simple('number1'));
registerCutscene('hall', simple('hall'));
registerCutscene('hologram', simple('hologram', (s, cs) => { const a = cs.data.actId ? s.acts[String(cs.data.actId)] : undefined; return { pid: a?.members.find((id) => !s.persons[id]?.alive) ?? a?.members[0], d: { q: s.year >= 2027 ? 0.92 : 0.6, back: 40 } }; }));
registerCutscene('cine18', (s, cs, close) => {
  const sh = shot18(s, String(cs.data.shot ?? ''));
  return h('div', { class: 'scene-frame c18-scene' }, sh ? boardView18(s, board18(s, sh)) : h('p', { class: 'muted' }, T(cs.data.title as L)), sh?.act ? h('p', null, actLink(s, sh.act)) : null, close1(close));
});
registerCutscene('farewell', (s, cs, close) => {
  const a = cs.data.actId ? s.acts[String(cs.data.actId)] : undefined;
  const pid = a?.members.find((id) => !s.persons[id]?.alive);
  const res = cs.data.result as L | undefined;
  const box = h('div', { class: 'scene-choices' });
  const done = (m: L) => { box.replaceChildren(h('p', { class: 'scene-result', role: 'status' }, t(m))); rerender(); };
  if (res || cs.data.done) box.append(h('p', { class: 'scene-result' }, T(res ?? l('Já resolvido.', 'Already resolved.'))));
  else box.append(
    h('button', { class: 'btn', onclick: () => done(farewellChoice(s, cs.id, true)) }, t(l('Prestar homenagem pública', 'Pay public tribute')), h('small', { class: 'muted' }, ` ${t(l('Comoção e respeito; o catálogo vende mais.', 'Grief and respect; the catalog sells more.'))}`)),
    h('button', { class: 'btn', onclick: () => done(farewellChoice(s, cs.id, false)) }, t(l('Despedida discreta', 'A quiet goodbye')), h('small', { class: 'muted' }, ` ${t(l('Respeito à família.', 'Respect for the family.'))}`)));
  return h('div', { class: 'scene-frame c18-scene' }, boardView18(s, board18(s, shotOf(cs, 'funeral', s, { pid }))), box, close1(close));
});

// cenas interativas (scene17): o quadro vira storyboard quando o tipo tem um, e se remonta depois da escolha
VIEW17_X.push((s, key) => {
  const b = boardOfScene18(s, key);
  if (!b) return null;
  const el = boardView18(s, b, { small: true, rebuild: () => boardOfScene18(s, key) ?? b });
  return el;
});

// ---------------------------------------------------------------- Cinemateca (no Álbum de cenas)

const KIND_NAME: Record<Kind18, L> = {
  awards: l('Premiação', 'Awards'), number1: l('Nº 1', 'No. 1'), signing: l('Assinatura', 'Signing'), soldout: l('Casa lotada', 'Sold out'), premiere: l('Estreia', 'Premiere'),
  verdict: l('Veredito', 'Verdict'), funeral: l('Funeral', 'Funeral'), musicshow: l('Programa musical', 'Music show'), festival: l('Festival', 'Festival'), hall: l('Hall da Fama', 'Hall of Fame'),
  hologram: l('Holograma', 'Hologram'), avatar: l('Avatares', 'Avatars'), ghost: l('Ilusão de palco', 'Stage illusion'), tribute: l('Tributo', 'Tribute'),
};
export function play18(s: GameState, b: Board18): void {
  openScene(b.title, (close) => h('div', { class: 'scene-frame c18-scene' }, boardView18(s, b),
    b.why.length ? h('details', null, h('summary', null, t(l('Por que a cena ficou assim', 'Why the scene looks like this'))), h('ul', { class: 'small' }, b.why.map((w) => h('li', null, T(w))))) : null,
    close1(close)), { wide: true });
}
ALBUM17_X.push((s) => {
  const log = cine18(s).log.slice().reverse().slice(0, 40);
  return section(t(l('Cinemateca', 'Cinematheque')),
    h('p', { class: 'muted small' }, t(l('Os grandes momentos viram storyboards montados pelo que aconteceu: figurino, discurso, reação, tamanho e humor da plateia, protestos, lesões, formação, clima e época. Reveja quando quiser — e pule quando quiser.', 'Big moments become storyboards assembled from what happened: outfit, speech, reaction, crowd size and mood, protests, injuries, lineup, weather and era. Rewatch any time — and skip any time.'))),
    log.length ? h('ul', { class: 'c18-list' }, log.map((x) => h('li', null, ic(x.k === 'awards' ? 'trophy' : x.k === 'hologram' || x.k === 'avatar' || x.k === 'ghost' ? 'hologram' : 'film'), ' ',
      h('b', null, t(KIND_NAME[x.k])), ` · ${monthName(x.m)} ${x.y}`, x.act && s.acts[x.act] ? h('span', null, ' · ', actLink(s, x.act)) : null, x.text ? h('small', { class: 'muted' }, ` — ${T(x.text)}`) : null, ' ',
      h('button', { class: 'link small', onclick: () => play18(s, board18(s, x)) }, t(l('assistir', 'watch')))))) : h('p', { class: 'muted small' }, t(l('Nada ainda: prêmios, nº 1, estádios, festivais, estreias, vereditos e funerais entram aqui.', 'Nothing yet: awards, No. 1s, stadiums, festivals, premieres, verdicts and funerals land here.'))));
});

// ---------------------------------------------------------------- Legado póstumo (Lendas)

let sel = '';
const styles = (k: PKind): Style18[] => (k === 'tribute' ? ['charity', 'ticketed'] : k === 'biopic' ? ['faithful', 'glossy'] : k === 'ai_album' ? ['restore', 'clone'] : ['']);
const STYLE_N: Record<string, L> = { charity: l('beneficente', 'charity'), ticketed: l('com ingresso', 'ticketed'), faithful: l('fiel', 'faithful'), glossy: l('glamourizado', 'glossy'), restore: l('restaurar voz da demo', 'restore demo voice'), clone: l('clonar a voz', 'clone the voice') };
const choice: Record<string, { share: Share18; style: Style18 }> = {};
const usd = (c: number) => $(c);

function projCard(s: GameState, pid: string, k: PKind, dead: boolean): HTMLElement {
  const ck = `${pid}:${k}`;
  const c = (choice[ck] ??= { share: 'fair', style: styles(k)[0] });
  const bl = block18(s, pid, k);
  const od = ask18(s, pid, k, c.share, c.style);
  const bk = back18(s, pid, k, c.style);
  const fc = forecast18(s, pid, k, c.style);
  const te = tech18(s.year, k);
  const sel_ = (opts: string[], cur: string, name: (x: string) => string, on: (x: string) => void) => h('select', { onchange: (e: Event) => { on((e.target as HTMLSelectElement).value); rerender(); } }, opts.map((x) => h('option', { value: x, selected: x === cur }, name(x))));
  return h('div', { class: 'card c18-proj' },
    h('b', null, t(PK18[k].name)), h('small', { class: 'muted' }, t(PK18[k].desc)),
    h('div', { class: 'row wrap small' },
      styles(k)[0] ? sel_(styles(k), c.style, (x) => t(STYLE_N[x]), (x) => { c.style = x as Style18; }) : null,
      dead && od.p < 1 ? sel_(Object.keys(SHARE18), c.share, (x) => t(SHARE18[x as Share18].name), (x) => { c.share = x as Share18; }) : null),
    h('div', { class: 'small' },
      `${t(l('Custo', 'Cost'))} ${usd(fc.cost)} · ${t(l('receita prevista', 'expected revenue'))} ~${usd(fc.rev)}${dead && od.p < 1 ? ` (${t(l('menos', 'minus'))} ${Math.round(SHARE18[c.share].v * 100)}% ${t(l('ao espólio', 'to the estate'))})` : ''}`),
    h('div', { class: 'small' },
      h('span', { class: 'c18-chance', title: od.why.map((w) => t(w)).join('\n') }, `${t(l('Chance de aprovar', 'Approval chance'))}: ${Math.round(od.p * 100)}%`), ' · ',
      h('span', { title: bk.why.map((w) => t(w)).join('\n'), class: bk.v >= 55 ? 'bad' : '' }, `${t(l('Polêmica', 'Controversy'))}: ${bk.v}/100`), ' · ',
      h('span', { title: t(te.why) }, `${t(l('Qualidade técnica', 'Tech quality'))}: ${Math.round(te.q * 100)}%`)),
    h('details', { class: 'small' }, h('summary', null, t(l('Por quê', 'Why'))), h('ul', null, [...od.why, ...bk.why, te.why].map((w) => h('li', null, T(w))))),
    h('button', { class: 'btn small primary', disabled: !!bl, title: bl ? t(bl) : '', onclick: () => {
      const r = start18(s, pid, k, c.share, c.style);
      toast(t(r.text), r.ok ? 'good' : 'bad');
      rerender();
      const sh = r.shot ? shot18(s, r.shot) : undefined;
      if (sh) play18(s, board18(s, sh));
    } }, bl ? T(bl) : t(l('Propor', 'Propose'))));
}

export function post18Tab(s: GameState): HTMLElement {
  const cs = cands18(s);
  if (!cs.length) return h('div', { class: 'panel' }, h('p', { class: 'muted' }, t(l('Ninguém para homenagear ainda: quando uma lenda morrer (ou um ato seu quiser virar avatar), os projetos aparecem aqui.', 'No one to honor yet: when a legend dies (or one of your acts wants to become avatars), projects show up here.'))));
  if (!cs.some((x) => x.pid === sel)) sel = cs[0].pid;
  const c = cs.find((x) => x.pid === sel)!;
  const p = s.persons[c.pid];
  const e = c.dead ? estate18(s, c.pid) : null;
  const st = post18(s);
  const projs = projOf18(s, c.pid).slice().reverse();
  const real = REAL18.filter((x) => x.y < s.year || (x.y === s.year && x.m <= s.month));
  return h('div', { class: 'panel c18-post' },
    h('p', { class: 'muted small' }, t(l('A morte não encerra a carreira. O espólio aprova (ou veta) homenagens, caixas, remasters, discos do cofre, filmes e — conforme a época — ilusões de palco, hologramas, avatares e IA. Cada projeto tem custo, qualidade técnica da época, polêmica e efeito no legado; herdeiros podem brigar e travar tudo.', 'Death does not end the career. The estate approves (or vetoes) tributes, box sets, remasters, vault albums, films and — depending on the era — stage illusions, holograms, avatars and AI. Each project has a cost, era tech quality, controversy and a legacy effect; heirs may fight and freeze everything.'))),
    exactHist(s) ? h('p', { class: 'small' }, pill(t(l('história exata', 'exact history')), 'warn'), ' ', t(l('Com artistas reais, só a crônica real acontece; projetos valem para seus atos e fictícios.', 'With real artists only the real chronicle happens; projects apply to your own and fictional acts.'))) : h('p', { class: 'small muted' }, t(l('História alternativa: qualquer lenda pode ganhar holograma ou filme — inclusive pelas mãos de rivais.', 'Alternate history: any legend can get a hologram or a film — including from rivals.'))),
    h('label', { class: 'row small' }, t(l('Artista', 'Artist')), ' ', h('select', { onchange: (ev: Event) => { sel = (ev.target as HTMLSelectElement).value; rerender(); } },
      cs.map((x) => h('option', { value: x.pid, selected: x.pid === sel }, `${s.persons[x.pid]?.name ?? '?'} — ${x.act.name}${x.dead ? ` (✝${s.persons[x.pid]?.died ?? ''})` : ` · ${t(l('vivo(a)', 'living'))}`}`)))),
    e ? section(t(l('Espólio', 'Estate')),
      h('ul', { class: 'small' }, e.heirs.map((hh) => h('li', null, hh.pid ? personLink16(s, `p:${hh.pid}`, hh.name) : h('b', null, hh.name), ` · ${t(hh.rel)} · ${t(STANCE18[hh.st])}`))),
      h('p', { class: 'small' },
        `${t(l('União', 'Unity'))}: ${e.unity}/100 · ${t(l('Legado', 'Legacy'))}: ${e.legacy}/100 · ${t(l('Desejo do artista', 'Artist\'s wish'))}: `,
        e.known ? t(e.wish === 'never' ? l('"nunca me transformem em holograma"', '"never turn me into a hologram"') : e.wish === 'open' ? l('"quero tocar para sempre"', '"I want to play forever"') : l('ninguém sabe', 'nobody knows')) : t(l('descubra ao propor algo', 'find out by pitching something'))),
      e.dispute > s.week ? h('p', { class: 'small bad' }, t(l('Disputa na justiça entre herdeiros: aprovações travadas, receitas pela metade.', 'Court fight among heirs: approvals frozen, revenue halved.')), ' ',
        h('button', { class: 'btn small', onclick: () => { toast(t(mediate18(s, c.pid)), 'info'); rerender(); } }, `${t(l('Mediar', 'Mediate'))} (${usd(mediateCost18(s))})`)) : null) : h('p', { class: 'small' }, pill(t(l('artista vivo', 'living artist'))), ' ', t(l('Para vivos: caixa, remaster, filme e residência de avatares (com consentimento da banda).', 'For the living: box set, remaster, film and avatar residency (with the band\'s consent).'))),
    section(t(l('Projetos possíveis em {y}', 'Possible projects in {y}')).replace('{y}', String(s.year)),
      h('div', { class: 'cards' }, kindsNow18(s, c.dead).map((k) => projCard(s, c.pid, k, c.dead)))),
    projs.length ? section(t(l('Projetos de {p}', '{p}\'s projects')).replace('{p}', p?.name ?? ''), h('ul', { class: 'small' }, projs.map((x) => h('li', null,
      `${x.y} · ${t(PK18[x.k].name)}${x.style ? ` (${t(STYLE_N[x.style])})` : ''} · ${x.st === 'run' ? t(l('em cartaz', 'running')) : t(l('encerrado', 'done'))} · ${t(l('receita', 'revenue'))} ${usd(x.rev)} · ${t(l('polêmica', 'controversy'))} ${x.back}`,
      x.shot && shot18(s, x.shot) ? h('button', { class: 'link small', onclick: () => play18(s, board18(s, shot18(s, x.shot!)!)) }, ` ${t(l('assistir', 'watch'))}`) : null)))) : null,
    st.log.length ? section(t(l('Crônica póstuma', 'Posthumous chronicle')), h('ul', { class: 'small' }, st.log.slice().reverse().slice(0, 20).map(([y, m, x]) => h('li', null, `${monthName(m)} ${y} — ${T(x)}`)))) : null,
    exactHist(s) && real.length ? null : h('details', { class: 'small muted' }, h('summary', null, t(l('Referência: como foi na história real', 'Reference: how it went in real history'))), h('ul', null, real.map((x) => h('li', null, `${x.y}: ${T(x.t)}`)))),
  );
}
