// Rodada 17 — interface da vida pessoal: Coração (orientação, armário, traição, ciúme, pré-nupcial, divórcio,
// pensões, ex), Filhos (crescem, mudam, escolhem caminho), Aparência (efeitos de época/país com o porquê) e
// Fé e cuidado (retiro, terapia/clínica para o elenco). Também: linha "vida íntima" na página de pessoa e o
// resolvedor de idade que envelhece os retratos.

import { countryOfCity } from '../../data/geo';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { RELS, viewsOf, type RelId } from '../../sim/beliefs';
import { castRehab, castTherapy, ex17, faithRetreat, REHAB17, THERAPY17 } from '../../sim/sys/extras17';
import { kidLook, kidOf, PATH17, stageOf, TEMPER17, temperOf } from '../../sim/sys/kids17';
import { life } from '../../sim/sys/life';
import { lookEffects17, ownerLook17 } from '../../sim/sys/looks17';
import { candMarried, candSex, confess, divorce17, divorceTerms, endAffair, love17, playerFame, reconcile, setPrenup, startAffair } from '../../sim/sys/love17';
import { ownerOf } from '../../sim/sys/people/owner';
import { healthOf } from '../../sim/sys/people/state';
import { per13 } from '../../sim/sys/persona13';
import { acceptance, climate17, comeOut, declareAlly, isQueer, lavender, marriageLegal, orientName, outingRisk, sexOf, sx17, visibleSex, CLOSET17 } from '../../sim/sys/sex17';
import { stressOf } from '../../sim/stress17';
import type { GameState, Person } from '../../sim/types';
import { fmtL, money, playerActs, rngOf } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { PERSON_HEAD_EXTRAS } from '../pages';
import { setAgeResolver } from '../pixel/age17';
import { portraitCanvas } from '../pixel/avatar';
import { store } from '../store';
import { meter } from '../vis';

const isL = (x: unknown): x is L => !!x && typeof x === 'object' && 'pt' in (x as object) && 'en' in (x as object);
function run(res: unknown, ok?: L): void {
  if (res === null || res === undefined) { if (ok) toast(t(ok), 'good'); }
  else if (isL(res)) toast(t(res), ok ? 'good' : 'bad');
  else if (typeof res === 'object' && res && 'text' in res) toast(t((res as { text: L }).text), (res as { ok?: boolean }).ok === false ? 'info' : 'good');
  rerender();
}
const btn = (label: L, onclick: () => void, o: { primary?: boolean; disabled?: boolean; title?: L; danger?: boolean } = {}) =>
  h('button', { class: `btn small ${o.primary ? 'primary' : ''} ${o.danger ? 'danger' : ''}`, disabled: o.disabled, title: o.title ? t(o.title) : undefined, onclick }, t(label));
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
const why = (x: L) => h('small', { class: 'muted' }, t(x));

// ---------------------------------------------------------------- idade nos retratos

const AGE_CACHE = new Map<string, { age: number; sx?: 'm' | 'f' | 'x' }>();
let ageY = 0;
setAgeResolver((p) => {
  const s = store.game;
  if (!s) return undefined;
  if (ageY !== s.year) { AGE_CACHE.clear(); ageY = s.year; }
  const hit = AGE_CACHE.get(p.id);
  if (hit) return hit;
  const q = s.persons[p.id];
  const born = q?.born ?? p.born;
  if (born === undefined) return undefined;
  const v = { age: s.year - born, sx: q ? per13(s, q.isPlayer ? 'player' : `p:${q.id}`)?.sex : undefined };
  if (AGE_CACHE.size > 6000) AGE_CACHE.clear();
  AGE_CACHE.set(p.id, v);
  return v;
});

// ---------------------------------------------------------------- Coração

function identityBox(s: GameState): HTMLElement {
  const me = sexOf(s, 'player');
  const a3 = countryOfCity(s.config.homeCity);
  const acc = acceptance(a3, s.year, s.config.homeCity);
  const rec = sx17(s).p.player;
  const risk = outingRisk(s, 'player');
  return section(t(l('Quem você é', 'Who you are')),
    h('p', null, pill(t(orientName(s, 'player', me))), ' ', isQueer(me) ? pill(t(CLOSET17[me.c]), me.c === 'out' ? 'good' : 'warn') : null, me.lav ? pill(t(l('casamento de fachada', 'lavender marriage'))) : null),
    h('p', { class: 'small' }, t(climate17(a3, s.year, s.config.homeCity))),
    isQueer(me) && me.c === 'closet' ? h('div', null,
      h('p', { class: 'small warn' }, t(fmtL(l('No armário: +1,5 de estresse por mês e risco de exposição de {r}/mês (sobe com sua fama, com casos do mesmo sexo e com quem sabe; casamento de fachada corta 65%).', 'In the closet: +1.5 stress per month and an outing risk of {r}/month (rises with fame, same-sex affairs and people who know; a lavender marriage cuts it by 65%).'), { r: pct(risk) }))),
      h('div', { class: 'row wrap' },
        btn(l('Sair do armário', 'Come out'), () => { if (confirm(t(acc < 0.55 ? l('Clima hostil: espere reação negativa (reputação e boatos). Continuar?', 'Hostile climate: expect backlash (reputation and rumors). Continue?') : l('Assumir publicamente?', 'Come out publicly?')))) run(comeOut(s, 'player', 'chose'), l('ok', 'ok')); }, { primary: true }),
        !me.lav && !life(s).partner ? btn(l('Casamento de fachada ($8.000)', 'Lavender marriage ($8,000)'), () => { const o = ownerOf(s); const c = money(s, 8000); if (o.wealth < c) return run(l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.')); o.wealth -= c; run(lavender(s, 'player', rngOf(s)), l('ok', 'ok')); }) : null,
      )) : null,
    h('div', { class: 'row wrap' }, btn(l('Declarar apoio à causa LGBT', 'Publicly back LGBT rights'), () => run(declareAlly(s), l('ok', 'ok')), { disabled: (rec?.ally ?? 0) >= s.year - 1, title: l('Artistas LGBT do seu selo ganham moral e propostas a artistas LGBT melhoram por 6 anos; religiosos estritos se ressentem; em país hostil, a reputação institucional cai.', 'LGBT acts on your label gain morale and offers to LGBT acts improve for 6 years; strict religious acts resent it; in a hostile country, institutional reputation drops.') })),
    h('p', { class: 'small muted' }, t(l('A orientação vem da ficha de criação. Ela pesa em: reação a sair do armário (religião, censura e imprensa do país na época), casamento igualitário (antes da lei, a união é simbólica: sem partilha nem herança garantida), propostas de artistas LGBT ou religiosos e boatos.', 'Orientation comes from character creation. It weighs on: reaction to coming out (country religion, censorship and press at the time), marriage equality (before the law, a union is symbolic: no split nor guaranteed inheritance), offers from LGBT or religious acts, and rumors.'))),
  );
}

function partnerBox(s: GameState): HTMLElement | null {
  const L0 = life(s);
  const L7 = love17(s);
  const pt = L0.partner;
  if (!pt) return null;
  const legal = marriageLegal(countryOfCity(s.config.homeCity), s.year);
  const am = divorceTerms(s, 'amicable');
  const ct = divorceTerms(s, 'court');
  const terms = (x: typeof am) => `${t(l('partilha', 'split'))} ${$(x.share)} · ${t(l('custas', 'fees'))} ${$(x.fees)}${x.alimony ? ` · ${t(l('pensão', 'support'))} ${$(x.alimony)}/${t(l('mês', 'mo'))} × ${x.years}a` : ''}${x.kids ? ` · ${t(l('filhos', 'kids'))} ${$(x.child)}/${t(l('mês', 'mo'))} × ${x.kids}` : ''}${x.custodyRisk ? ` · ${t(l('risco de perder a guarda', 'custody risk'))} ${Math.round(x.custodyRisk * 100)}%` : ''}`;
  return section(t(l('Relacionamento (profundidade)', 'Relationship (depth)')),
    h('p', null, h('b', null, pt.name), ' ', pill(L7.psx === 'f' ? '♀' : '♂'), L7.ss ? pill(t(l('mesmo sexo', 'same sex'))) : null, L7.pm ? pill(t(l('casado(a) com outra pessoa — você é o(a) amante', 'married to someone else — you are the lover')), 'warn') : null, L7.sym ? pill(t(l('união simbólica', 'symbolic union')), 'warn') : null, L7.prenup ? pill(t(l('pré-nupcial', 'prenup')), 'good') : null),
    meter('fire', l('Ciúme', 'Jealousy'), L7.jeal, 100, true),
    why(l('Ciúme sobe com festas da indústria, fama e casos; encontros e tempo em família baixam. Acima de 70, a afinidade cai todo mês.', 'Jealousy rises with industry parties, fame and affairs; dates and family time lower it. Above 70, affinity drops every month.')),
    L7.ss && pt.stage !== 'married' ? h('p', { class: 'small' }, t(legal ? l('Casamento igualitário já é lei no seu país.', 'Marriage equality is already law in your country.') : l('Seu país ainda não reconhece o casamento entre pessoas do mesmo sexo: casar será uma cerimônia simbólica.', 'Your country does not yet recognize same-sex marriage: a wedding will be a symbolic ceremony.'))) : null,
    pt.stage === 'engaged' ? h('div', { class: 'row wrap' }, btn(l('Assinar pré-nupcial ($1.500)', 'Sign a prenup ($1,500)'), () => run(setPrenup(s), l('Assinado.', 'Signed.')), { disabled: !!L7.prenup, title: l('Limita a partilha a 10% e elimina a pensão ao ex-cônjuge. Par "pé no chão" aprova; os outros acham frio (−6 afinidade).', 'Caps the split at 10% and removes spousal support. A down-to-earth partner approves; others find it cold (−6 affinity).') })) : null,
    pt.stage === 'married' ? h('div', null,
      h('p', { class: 'small' }, h('b', null, t(l('Amigável: ', 'Amicable: '))), terms(am)),
      h('p', { class: 'small' }, h('b', null, t(l('Litigioso: ', 'Contested: '))), terms(ct)),
      am.why.length ? h('ul', { class: 'small muted' }, am.why.map((w) => h('li', null, t(w)))) : null,
      h('div', { class: 'row wrap' },
        btn(l('Divórcio amigável', 'Amicable divorce'), () => { if (confirm(t(l('Confirmar divórcio amigável?', 'Confirm amicable divorce?')))) run(divorce17(s, 'amicable', rngOf(s)), l('Divórcio feito.', 'Divorce done.')); }, { disabled: pt.affinity < 15, title: l('Exige afinidade ≥ 15.', 'Needs affinity ≥ 15.') }),
        btn(l('Divórcio litigioso', 'Contested divorce'), () => { if (confirm(t(l('Confirmar divórcio na justiça?', 'Confirm a court divorce?')))) run(divorce17(s, 'court', rngOf(s)), l('Divórcio feito.', 'Divorce done.')); }, { danger: true }),
      )) : null,
  );
}

function affairBox(s: GameState): HTMLElement | null {
  const L0 = life(s);
  const L7 = love17(s);
  const a = L7.affair;
  if (a) {
    const months = (s.week - a.since) / 4.3;
    const risk = Math.min(0.2, 0.03 + (100 - a.disc) / 1500 + playerFame(s) / 2500 + months * 0.002 + (L7.jeal > 60 ? 0.02 : 0));
    return section(t(l('Caso secreto', 'Secret affair')),
      h('p', null, h('b', null, a.name), ' ', pill(a.sx === 'f' ? '♀' : '♂'), a.married ? pill(t(l('casado(a)', 'married')), 'warn') : null, a.pid ? pill(t(l('artista conhecido(a)', 'known artist')), 'warn') : null),
      h('p', { class: 'small' }, t(fmtL(l('Discrição {d}/100 · risco de descoberta {r}/mês (cresce com o tempo, sua fama e o ciúme). {c} guarda o segredo (obrigação contra você). Gravidez possível.', 'Discretion {d}/100 · discovery risk {r}/month (grows with time, your fame and jealousy). {c} holds the secret (an obligation against you). Pregnancy possible.'), { d: Math.round(a.disc), r: pct(risk), c: a.name }))),
      h('div', { class: 'row wrap' }, btn(l('Terminar o caso', 'End the affair'), () => run(endAffair(s, rngOf(s)), l('ok', 'ok'))), btn(l('Confessar ao par', 'Confess to your partner'), () => run(confess(s), l('ok', 'ok')), { danger: true })));
  }
  if (!L0.partner || s.config.contentFilters.includes('romance')) return null;
  const cands = L0.candidates;
  return section(t(l('Tentação', 'Temptation')),
    cands.length ? h('div', { class: 'cards' }, cands.map((c) => h('article', { class: 'tile' }, h('div', { class: 'tile-body' },
      h('b', null, c.name, ' ', pill(candSex(s, c) === 'f' ? '♀' : '♂'), candMarried(s, c) ? pill(t(l('casado(a)', 'married')), 'warn') : null),
      h('small', null, `${s.year - c.born} ${t(l('anos', 'yrs'))} · ${t(c.job)}`),
      btn(l('Ter um caso', 'Have an affair'), () => run(startAffair(s, c.id), l('Começou...', 'It began...')), { danger: true, title: l('Custa 1 tempo livre. O(a) amante passa a guardar um segredo seu; descoberta derruba a afinidade (−40), vira boato se você for famoso(a) e pode gerar escândalo e filho fora do casamento.', 'Costs 1 free time. The lover holds a secret of yours; discovery crushes affinity (−40), becomes a rumor if you are famous and may lead to a scandal and a child outside the marriage.') }),
    )))) : h('p', { class: 'small muted' }, t(l('Ninguém em vista. Sair para conhecer gente (aba Amor e família) ou ir a uma festa da indústria traz pretendentes — e tentação.', 'Nobody in sight. Going out (Love and family tab) or to an industry party brings suitors — and temptation.'))),
  );
}

function exesBox(s: GameState): HTMLElement | null {
  const L7 = love17(s);
  const pays = L7.pay;
  const sec = L7.sec.filter((x) => !x.claim).length;
  if (!L7.exes.length && !pays.length && !sec) return null;
  const tot = pays.reduce((x, p) => x + p.amt, 0);
  return section(t(l('Ex, pensões e segredos', 'Exes, support and secrets')),
    L7.exes.length ? h('table', { class: 'tbl compact' }, h('tbody', null, L7.exes.map((e, i) => h('tr', null,
      h('td', null, e.name, e.married ? pill(t(l('ex-cônjuge', 'ex-spouse'))) : null, e.bitter ? pill(t(l('ressentido(a)', 'bitter')), 'bad') : null),
      h('td', null, meter('heart', l('Afeto', 'Affection'), e.aff)),
      h('td', null, btn(l('Tentar reatar', 'Try to reconcile'), () => run(reconcile(s, i, rngOf(s))), { disabled: !!life(s).partner, title: l('Chance = afeto, menos se ressentido(a). Ex muito magoado(a) e você famoso(a): risco de livro-bomba.', 'Chance = affection, less if bitter. A very hurt ex and you famous: risk of a tell-all book.') })))))) : null,
    pays.length ? h('div', null, h('p', { class: 'small' }, h('b', null, t(l('Pensões: ', 'Support: '))), `${$(tot)}/${t(l('mês', 'mo'))} ${t(l('do seu patrimônio pessoal', 'from your personal wealth'))}`),
      h('ul', { class: 'small' }, pays.map((p) => h('li', null, `${t(p.kind === 'alimony' ? l('ex-cônjuge', 'ex-spouse') : l('filho(a)', 'child'))} ${p.kid ?? ''} → ${p.to}: ${$(p.amt)}/${t(l('mês', 'mo'))} ${t(l('até', 'until'))} ${p.until}`))),
      why(l('Atrasar pensão gera mágoa, processo e manchete.', 'Late support causes grudges, lawsuits and headlines.'))) : null,
    sec ? h('p', { class: 'small warn' }, t(fmtL(l('{n} filho(a) fora do casamento que só você e o(a) ex-amante conhecem. Um dia o teste de DNA chega.', '{n} child(ren) from outside the marriage that only you and your ex-lover know about. One day the DNA test arrives.'), { n: sec }))) : null,
  );
}

export function heartTab(s: GameState): HTMLElement {
  const L7 = love17(s);
  return h('div', null, identityBox(s), partnerBox(s), affairBox(s), exesBox(s),
    L7.log.length ? section(t(l('Histórico do coração', 'Heart history')), h('ul', { class: 'small' }, L7.log.slice(0, 10).map(([y, x]) => h('li', null, h('span', { class: 'muted' }, `${y} · `), t(x))))) : null);
}

// ---------------------------------------------------------------- Filhos

export function kidsTab(s: GameState): HTMLElement {
  const o = ownerOf(s);
  const L0 = life(s);
  if (!o.kids.length) return section(t(l('Filhos', 'Children')), h('p', { class: 'muted' }, t(l('Sem filhos. Dá para começar o jogo com filhos na ficha de criação, ter ou adotar na aba Amor e família.', 'No children. You can start the game with children in character creation, or have/adopt them in the Love and family tab.'))));
  return section(t(l('Filhos que crescem', 'Children growing up')),
    h('p', { class: 'small muted' }, t(l('Todo ano o temperamento muda: vínculo baixo, casa tensa, divórcio e sua fama empurram para a rebeldia; conservatório puxa para a arte; internato, para o estudo. Na adolescência, a fase rebelde vira decisão sua. Aos 18 escolhem um caminho — magoados, podem assinar com a concorrência.', 'Every year the temperament shifts: low bond, a tense home, divorce and your fame push towards rebellion; conservatory pulls towards art; boarding school, towards study. In adolescence, the rebel phase becomes your decision. At 18 they choose a path — if hurt, they may sign with the competition.'))),
    h('div', { class: 'cards' }, o.kids.map((k, i) => {
      const x = kidOf(s, k);
      const kx = L0.kidsX[i];
      const age = s.year - k.born;
      const look = kidLook(s, k);
      return h('article', { class: 'tile' }, h('div', { class: 'tile-body' },
        h('div', { class: 'row' }, portraitCanvas({ id: `kid17:${k.name}:${k.born}`, look, born: k.born }, s, 2),
          h('div', null, h('b', null, k.name), h('br'), h('small', null, `${age} ${t(l('anos', 'yrs'))} · ${t(stageOf(age))} · ${t(TEMPER17[temperOf(x)])}`))),
        meter('fire', l('Rebeldia', 'Rebellion'), x.reb, 100, true), meter('pen', l('Estudo', 'Study'), x.stu), meter('guitar', l('Arte', 'Art'), x.art), meter('fans', l('Sociabilidade', 'Sociability'), x.soc),
        age >= 6 && age < 18 ? h('small', null, `${t(l('Notas', 'Grades'))}: ${Math.round(x.grade)}/100 · ${t(l('vínculo', 'bond'))} ${Math.round(kx?.bond ?? 50)}`) : null,
        x.inh.length ? h('small', null, `${t(l('Herdou de você', 'Inherited from you'))}: ${x.inh.join(', ')}`) : null,
        x.path ? h('p', null, pill(t(PATH17[x.path]), x.path === 'rival' || x.path === 'estranged' ? 'bad' : 'good')) : null,
        kx?.actId && s.acts[kx.actId] ? h('p', null, t(l('Carreira: ', 'Career: ')), actLink(s, kx.actId)) : null,
        x.hist.length ? h('ul', { class: 'small muted' }, x.hist.slice(0, 3).map(([y, w]) => h('li', null, `${y} · ${t(w)}`))) : null,
      ));
    })));
}

// ---------------------------------------------------------------- Aparência

export function looksTab(s: GameState): HTMLElement {
  const own = ownerLook17(s);
  const acts = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  const row = (e: { m: number; why: L; niche?: L; fought?: L }) => h('li', null, pill(`×${e.m.toFixed(2)}`, e.m >= 1 ? 'good' : 'bad'), ' ', t(e.why), e.niche ? h('small', { class: 'muted' }, ` ${t(e.niche)}`) : null, e.fought ? h('small', { class: 'good' }, ` ${t(e.fought)}`) : null);
  return h('div', null,
    section(t(l('Aparência no jogo', 'Appearance in play')),
      h('p', { class: 'small' }, t(l('A aparência não é só visual. Sexo, tom de pele, visual e idade pesam conforme o país e a época — como pesaram na história: rádio segregada nos EUA até os anos 60, apartheid na África do Sul, MTV dos primeiros anos, machismo em gêneros "de homem", etarismo na era da imagem e, a partir de meados dos anos 2010, a busca por diversidade em curadorias, festivais e prêmios. Os números abaixo mostram cada efeito e o porquê; você pode enfrentar as barreiras (página do ato).', 'Appearance is not only visual. Sex, skin tone, style and age weigh by country and era — as they did in history: segregated US radio until the 60s, South African apartheid, early MTV, sexism in "male" genres, ageism in the image era and, from the mid-2010s, the diversity push in playlists, festivals and awards. The numbers below show each effect and why; you can fight the barriers (act page).'))),
      h('p', { class: 'small muted' }, t(l('Os retratos envelhecem com cada pessoa: grisalho, entradas e calvície, rugas e uns quilos a mais — sem perder o rosto.', 'Portraits age with each person: greying, receding hair and baldness, wrinkles and a few extra pounds — keeping the face.')))),
    section(t(l('Você como dono(a) do selo', 'You as label owner')), own.length ? h('ul', { class: 'small' }, own.map(row)) : h('p', { class: 'small muted' }, t(l('Nenhuma barreira nem vantagem pela sua aparência neste país e época.', 'No barrier nor advantage from your appearance in this country and era.')))),
    ...acts.map((a) => { const fx = lookEffects17(s, a); return section(a.name, fx.length ? h('ul', { class: 'small' }, fx.map(row)) : h('p', { class: 'small muted' }, t(l('Sem efeitos de aparência agora.', 'No appearance effects right now.')))); }),
  );
}

// ---------------------------------------------------------------- Fé e cuidado

export function careTab(s: GameState): HTMLElement {
  let rel: RelId | '' = '';
  const mine = playerActs(s).flatMap((id) => (s.acts[id]?.members ?? []).map((m) => [m, id] as const)).filter(([m]) => s.persons[m]?.alive && !s.persons[m]?.isPlayer);
  const conv = ex17(s).conv;
  return h('div', null,
    section(t(l('Fé', 'Faith')),
      h('p', { class: 'small' }, t(fmtL(l('Sua religião hoje: {r}. Um retiro alivia o desgaste de longo prazo (−18) e o estresse; converter-se muda a afinidade com artistas, equipe e parceiros (visões parecidas aproximam).', 'Your religion today: {r}. A retreat relieves long-term wear (−18) and stress; converting changes affinity with artists, staff and partners (similar views bring people closer).'), { r: RELS.find((x) => x.id === viewsOf(s, 'player').rel)?.name ?? l('—') }))),
      h('div', { class: 'row wrap' }, select<RelId | ''>('', [{ value: '', label: t(l('(manter a fé atual)', '(keep current faith)')) }, ...RELS.map((r) => ({ value: r.id, label: t(r.name) }))], (v) => (rel = v)),
        btn(l('Retiro espiritual ($500, 2 de tempo)', 'Spiritual retreat ($500, 2 free time)'), () => run(faithRetreat(s, rel || undefined), l('Volta em paz.', 'Back at peace.'))))),
    section(t(l('Cuidar do elenco', 'Care for your roster')),
      h('p', { class: 'small muted' }, t(fmtL(l('Terapia ({a}, 1×/mês): −15 estresse, −10 desgaste, −4 dependência, +confiança. Clínica ({b}): −45 dependência, afasta 8 semanas, vira boato se o ato for conhecido.', 'Therapy ({a}, 1×/month): −15 stress, −10 wear, −4 dependency, +trust. Rehab ({b}): −45 dependency, 8 weeks off, becomes a rumor if the act is known.'), { a: $(money(s, THERAPY17)), b: $(money(s, REHAB17)) }))),
      mine.length ? h('table', { class: 'tbl compact' }, h('tbody', null, mine.map(([m, aid]) => {
        const p = s.persons[m] as Person;
        const x = stressOf(s, m);
        const dep = healthOf(s, m).dependency;
        return h('tr', null, h('td', null, p.name, ' ', h('small', { class: 'muted' }, s.acts[aid]?.name ?? ''), conv[m] ? pill(t(l('convertido(a)', 'converted'))) : null),
          h('td', null, meter('stress', l('Estresse', 'Stress'), x.short, 100, true)), h('td', null, h('small', null, `${t(l('desgaste', 'wear'))} ${Math.round(x.long)} · ${t(l('dependência', 'dependency'))} ${Math.round(dep)}`)),
          h('td', null, btn(l('Terapia', 'Therapy'), () => run(castTherapy(s, m), l('Sessão paga.', 'Session paid.'))), ' ', btn(l('Clínica', 'Rehab'), () => run(castRehab(s, m), l('Internado(a).', 'Checked in.')), { disabled: dep < 25 && p.health !== 'addiction' })));
      }))) : h('p', { class: 'small muted' }, t(l('Sem artistas no selo.', 'No artists on the label.')))),
  );
}

// ---------------------------------------------------------------- página de pessoa: vida íntima

PERSON_HEAD_EXTRAS.push((s, p) => {
  const x = visibleSex(s, p.id);
  const fam = s.families[p.id];
  const conv = ex17(s).conv[p.id];
  const bits: string[] = [];
  if (x.o !== 'private' && x.o !== 'het') bits.push(`${t(orientName(s, p.id, x))}${x.c === 'closet' ? ` (${t(CLOSET17.closet)} — ${t(l('risco', 'risk'))} ${pct(outingRisk(s, p.id))}/${t(l('mês', 'mo'))})` : ''}`);
  else if (x.o === 'private' && x.real) bits.push(t(l('Vida íntima: não declarada publicamente', 'Private life: not publicly disclosed')));
  if (x.note) bits.push(x.note);
  if (x.lav) bits.push(t(l('casamento de fachada', 'lavender marriage')));
  if (fam?.partner) bits.push(`${t(fam.separated ? l('separado(a) de', 'separated from') : l('com', 'with'))} ${fam.partner.name}`);
  if (fam?.kids.length) bits.push(`${fam.kids.length} ${t(l('filho(s)', 'child(ren)'))}`);
  if (conv) bits.push(t(fmtL(l('convertido(a) em {y}', 'converted in {y}'), { y: conv })));
  return bits.length ? h('p', { class: 'small muted' }, `♥ ${bits.join(' · ')}`) : null;
});
