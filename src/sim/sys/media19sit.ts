// Rodada 19 (Frente 2/10 WP-H, onda 3 — T9) — SITUAÇÕES DO DIRETOR citando dados (44 novas): casa histórica em risco,
// DJ de rádio pirata, fiscal da sociedade de autores, briga num estúdio lendário, disputa de sample por época, censor do
// bloco do Leste, pressão de boicote cultural, crítico de fanzine e banda-fantasma na cidade. NPCs escolhem pelos traços
// (persona13); quando o elenco é seu, vira cartão com eco escrito em cada opção (`ev:sit17:<id>:<opção>`).
// Modo exato: atos reais intocados ficam fora do elenco (nada inventado com gente real).

import type { Rng } from '../../core/rng';
import { clamp } from '../../core/rng';
import { SOCS18 } from '../../data/rights18';
import { STUDIOS19 } from '../../data/more19/index';
import { cityById, familyOf, l, type FamilyId, type L, type MarketId } from '../../data/world';
import { registerConseq18, type Fx18 } from '../decide18';
import type { Fact } from '../facts17';
import { histMode } from '../history15';
import type { Act, GameState } from '../types';
import { fmtL, money, post } from '../util';
import type { P13 } from './persona13';
import { registerSituation, type Pressure, type SitCtx, type SitOption } from './situations17';
import { VENUES17 } from './venues17';
import { actsNow27 } from '../tickcache27';

const N = (pt: string, en: string): L => l(pt, en);
const mkOf = (c: string): MarketId | undefined => cityById[c]?.market as MarketId | undefined;
const isMine = (a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);
const ok = (s: GameState, a: Act) => a.status !== 'retired' && a.status !== 'split' && a.members.length > 0 && !(histMode(s) === 'strict' && a.catalogNo && !isMine(a));
const pickAct = (s: GameState, r: Rng, f: (a: Act) => boolean): Act | undefined => { const xs = actsNow27(s).filter((a) => ok(s, a) && f(a)); return xs.length ? r.pick(xs.slice(0, 200)) : undefined; };
const nm = (s: GameState, c: SitCtx) => s.acts[c.act ?? c.hero]?.name ?? '?';
const X = (c: SitCtx) => String(c.data.x ?? '');
const fac = (k: string) => (P: P13 | null) => ((P?.facets as Record<string, number> | undefined)?.[k] ?? 50) / 50 + 0.2;
/** efeito comum: mexe no ato (NPC ou seu) e, se for seu, no caixa */
function hit(s: GameState, c: SitCtx, o: { fame?: number; mom?: number; fans?: number; cash?: number; trust?: number; memo?: string; cat?: string }): void {
  const a = s.acts[c.act ?? c.hero]; if (!a) return;
  if (o.fame) a.fame = clamp(a.fame + o.fame, 0, 100);
  if (o.mom) a.momentum = clamp(a.momentum + o.mom, -100, 100);
  if (o.fans) a.fans.casual = Math.max(0, Math.round(a.fans.casual * (1 + o.fans / 100)));
  if (o.trust) a.trust = clamp(a.trust + o.trust, 0, 100);
  if (o.cash && isMine(a)) post(s, `m19sit:${o.memo ?? 'x'}:${a.id}:${s.week}`, money(s, o.cash), o.cat ?? (o.cash > 0 ? 'other_income' : 'misc'), o.memo ?? 'Situação');
}
const FX = (f: Fx18, x: L): L => fmtL(x, { a: f.act?.name ?? l('o ato', 'the act'), x: String(f.c.d_x ?? '') });
interface SOpt { id: string; label: L; hint: L; w: (P: P13 | null) => number; apply: (s: GameState, c: SitCtx, r: Rng) => L | void; echo: { in: [number, number]; p: number; tone: 'good' | 'bad' | 'mixed'; hint: L; fx: (f: Fx18) => L } }
let n19 = 0;
function sit(id: string, pressure: Pressure, cost: number, cd: number, when: (s: GameState) => boolean, pick: (s: GameState, r: Rng, f?: Fact) => SitCtx | null, title: L, text: L, opts: SOpt[], trigger?: string[], tone: 'good' | 'bad' | 'mixed' = 'mixed'): void {
  n19++;
  registerSituation({ id, pressure, cost, cooldown: cd, tone, ...(trigger ? { trigger } : {}), when: (s) => when(s), actorsPick: (s, c, r) => pick(s, r, c.fact),
    title: (s, c) => fmtL(title, { a: nm(s, c), x: X(c) }), text: (s, c) => fmtL(text, { a: nm(s, c), x: X(c) }),
    options: opts.map((o): SitOption => ({ id: o.id, label: o.label, hint: o.hint, weightByTraits: (P) => o.w(P), apply: (s, c, r) => o.apply(s, c, r) })) });
  for (const o of opts) registerConseq18(`ev:sit17:${id}:${o.id}`, { later: [{ in: o.echo.in, p: o.echo.p, tone: o.echo.tone, hint: o.echo.hint, fx: o.echo.fx }] });
}
const ctxOf = (a: Act, data: Record<string, string | number>): SitCtx => ({ hero: a.id, act: a.id, cast: {}, data });

// ---------------------------------------------------------------- S1. casa histórica em risco (8)
for (const vid of ['cavern', 'marquee', 'cbgb', 'canecao', 'hacienda', 'cotton_club', 'savoy_ballroom', 'star_club']) {
  const v = () => VENUES17.find((x) => x.id === vid);
  sit(`m19v_${vid}`, 'money', 1, 24, (s) => { const d = v(); return !!d?.to && s.year >= d.to - 3 && s.year <= d.to; },
    (s, r) => { const d = v(); if (!d) return null; const a = pickAct(s, r, (x) => x.city === d.city && x.fame >= 15); return a ? ctxOf(a, { x: d.name, v: vid }) : null; },
    N('{x} em risco: {a} vai ajudar?', '{x} at risk: will {a} help?'),
    N('O {x}, onde {a} cresceu tocando, pode fechar. A cena organiza shows beneficentes e uma campanha; cada banda decide o quanto se mete.', '{x}, where {a} grew up playing, may close. The scene is organising benefit shows and a campaign; each band decides how involved to get.'), [
      { id: 'benefit', label: N('Show beneficente', 'Benefit show'), hint: N('Custo; fãs e respeito da cena.', 'Cost; fans and scene respect.'), w: fac('empatia'), apply: (s, c) => { hit(s, c, { fans: 3, mom: 3, cash: -500, memo: 'Show beneficente', cat: 'live' }); },
        echo: { in: [2, 6], p: 0.6, tone: 'good', hint: N('A cena lembra quem tocou.', 'The scene remembers who played.'), fx: (f) => { f.fans(3).rep('artistic', 1); return FX(f, N('O show de {a} pelo {x} virou parte da história da casa.', '{a}\'s show for {x} became part of the venue\'s history.')); } } },
      { id: 'campaign', label: N('Assinar a campanha', 'Sign the campaign'), hint: N('Sem custo; gesto pequeno.', 'No cost; a small gesture.'), w: fac('lealdade'), apply: (s, c) => { hit(s, c, { mom: 1 }); },
        echo: { in: [2, 8], p: 0.4, tone: 'mixed', hint: N('Uma assinatura ajuda um pouco.', 'A signature helps a little.'), fx: (f) => { f.rep('institutional', 1); return FX(f, N('A campanha pelo {x} citou {a} na imprensa.', 'The {x} campaign named {a} in the press.')); } } },
      { id: 'shrug', label: N('Deixar quieto', 'Stay out of it'), hint: N('Nada agora; a cena repara.', 'Nothing now; the scene notices.'), w: fac('ambicao'), apply: (s, c) => { hit(s, c, { trust: -1 }); },
        echo: { in: [3, 9], p: 0.35, tone: 'bad', hint: N('O circuito lembra quem sumiu.', 'The circuit remembers who vanished.'), fx: (f) => { f.momentum(-2); return FX(f, N('Quando o {x} fechou, perguntaram onde estava {a}.', 'When {x} closed, people asked where {a} had been.')); } } },
    ]);
}

// ---------------------------------------------------------------- S2. DJ de rádio pirata (4)
const PIRATE: [string, number, number, string, L][] = [
  ['veronica', 1960, 1974, 'amsterdam', N('Radio Veronica', 'Radio Veronica')], ['nordsee', 1970, 1974, 'hamburg', N('Radio Nordsee', 'Radio Nordsee')],
  ['kiss', 1985, 1990, 'london', N('a pirata de soul de Londres', 'the London soul pirate')], ['grime', 2002, 2010, 'london', N('a pirata de grime do leste de Londres', 'the East London grime pirate')],
];
for (const [k, y0, y1, city, name] of PIRATE) {
  sit(`m19r_${k}`, 'law', 1, 18, (s) => s.year >= y0 && s.year <= y1,
    (s, r) => { const a = pickAct(s, r, (x) => mkOf(x.city) === mkOf(city) && x.fame >= 10 && x.fame <= 60); return a ? ctxOf(a, { x: name.pt }) : null; },
    N('O DJ da {x} quer {a} ao vivo no navio', 'The {x} DJ wants {a} live on the ship'),
    N('Um DJ da {x} convida {a} para tocar ao vivo na transmissão. Alcance enorme entre os jovens — e a fiscalização anda de olho.', 'A {x} DJ invites {a} to play live on air. Huge reach among the young — and the regulator is watching.'), [
      { id: 'onair', label: N('Ir ao ar', 'Go on air'), hint: N('Fãs jovens; risco de multa.', 'Young fans; risk of a fine.'), w: fac('coragem'), apply: (s, c) => { hit(s, c, { fans: 6, mom: 4 }); },
        echo: { in: [3, 9], p: 0.4, tone: 'mixed', hint: N('A fiscalização pode chegar.', 'The regulator may arrive.'), fx: (f) => { f.cash(-500, 'Multa: transmissão pirata', 'legal').fans(2); return FX(f, N('A fiscalização multou quem tocou na {x}; {a} ganhou fama de rebelde.', 'The regulator fined those who played on {x}; {a} earned a rebel reputation.')); } } },
      { id: 'tape', label: N('Mandar só uma fita', 'Just send a tape'), hint: N('Meio-termo.', 'A middle way.'), w: fac('disciplina'), apply: (s, c) => { hit(s, c, { fans: 3 }); },
        echo: { in: [2, 6], p: 0.5, tone: 'good', hint: N('A fita pode tocar sem parar.', 'The tape may play nonstop.'), fx: (f) => { f.fans(2); return FX(f, N('A fita de {a} tocou a semana toda na {x}.', '{a}\'s tape played all week on {x}.')); } } },
      { id: 'pass', label: N('Recusar', 'Decline'), hint: N('Nada agora.', 'Nothing now.'), w: fac('paciencia'), apply: () => {},
        echo: { in: [2, 6], p: 0.3, tone: 'mixed', hint: N('A pirata escolhe outro.', 'The pirate picks someone else.'), fx: (f) => { f.momentum(-1); return FX(f, N('A {x} lançou outra banda no lugar de {a}.', '{x} broke another band instead of {a}.')); } } },
    ]);
}

// ---------------------------------------------------------------- S3. fiscal da sociedade de autores (6)
for (const sid of ['prs', 'gema', 'sacem', 'ecad', 'jasrac', 'ascap']) {
  const so = () => SOCS18.find((x) => x.id === sid);
  sit(`m19c_${sid}`, 'money', 1, 24, (s) => { const d = so(); return !!d && s.year >= d.from; },
    (s, r) => { const d = so(); if (!d) return null; const a = pickAct(s, r, (x) => mkOf(x.city) === d.mk && x.fame >= 20); return a ? ctxOf(a, { x: d.name }) : null; },
    N('Fiscal da {x} no show de {a}', '{x} inspector at {a}\'s show'),
    N('Um fiscal da {x} anota o repertório do show de {a} e quer saber quem paga a execução pública das músicas de outros autores.', 'A {x} inspector writes down {a}\'s set and wants to know who pays the public performance of other writers\' songs.'), [
      { id: 'pay', label: N('Pagar a guia', 'Pay the fee'), hint: N('Custo pequeno; tudo em ordem.', 'A small cost; all in order.'), w: fac('disciplina'), apply: (s, c) => { hit(s, c, { cash: -300, memo: 'Execução pública: guia', cat: 'rights' }); },
        echo: { in: [3, 9], p: 0.5, tone: 'good', hint: N('Em dia com a sociedade.', 'Square with the society.'), fx: (f) => { f.cash(500, 'Sociedade: repasse das próprias músicas', 'royalties'); return FX(f, N('A {x} repassou a {a} a execução das músicas próprias.', '{x} paid {a} for performances of their own songs.')); } } },
      { id: 'argue', label: N('"Só tocamos músicas nossas"', '"We only play our own songs"'), hint: N('Aposta: o setlist confirma ou não.', 'A gamble: the setlist confirms it or not.'), w: fac('coragem'), apply: () => {},
        echo: { in: [2, 6], p: 0.5, tone: 'mixed', hint: N('O fiscal confere.', 'The inspector checks.'), fx: (f) => { f.cash(-400, 'Sociedade: multa', 'legal'); return FX(f, N('O fiscal achou três covers no setlist de {a}: multa da {x}.', 'The inspector found three covers in {a}\'s set: a {x} fine.')); } } },
      { id: 'hide', label: N('Trocar o setlist na hora', 'Swap the setlist on the spot'), hint: N('Esperto; arriscado.', 'Clever; risky.'), w: fac('impulsividade'), apply: (s, c) => { hit(s, c, { mom: -1 }); },
        echo: { in: [3, 9], p: 0.35, tone: 'bad', hint: N('O público viu a troca.', 'The crowd saw the swap.'), fx: (f) => { f.rep('institutional', -1); return FX(f, N('A {x} soube da troca de setlist de {a} e passou a fiscalizar todos os shows.', '{x} heard about {a}\'s setlist swap and now inspects every show.')); } } },
    ]);
}

// ---------------------------------------------------------------- S4. briga num estúdio lendário (6)
for (const tid of ['abbey_road', 'hansa_berlin', 'compass_point', 'fame_studios', 'studio_one', 'electric_lady']) {
  const st = () => STUDIOS19.find((x) => x.id === tid);
  sit(`m19t_${tid}`, 'heart', 2, 24, (s) => { const d = st(); return !!d && s.year >= d.from && (!d.to || s.year <= d.to); },
    (s, r) => { const d = st(); if (!d) return null; const a = pickAct(s, r, (x) => x.fame >= 30 && x.members.length >= 2); return a ? ctxOf(a, { x: d.name }) : null; },
    N('Briga no {x}: {a} contra o produtor', 'Fight at {x}: {a} vs the producer'),
    N('Três semanas no {x} e nada pronto: o produtor quer o "som da casa"; {a} quer o próprio som. A conta das diárias cresce.', 'Three weeks at {x} and nothing finished: the producer wants "the house sound"; {a} wants their own. The day-rate bill grows.'), [
      { id: 'walk', label: N('Sair do estúdio', 'Walk out'), hint: N('Perde as diárias; banda unida.', 'Lose the day rates; the band stays united.'), w: fac('impulsividade'), apply: (s, c) => { hit(s, c, { cash: -800, memo: 'Diárias perdidas', cat: 'recording', trust: 2 }); },
        echo: { in: [2, 6], p: 0.5, tone: 'mixed', hint: N('Disco feito em outro lugar.', 'A record made elsewhere.'), fx: (f) => { f.mood('inspiration', 5); return FX(f, N('{a} terminou o disco em casa, com raiva do {x} — e ficou melhor.', '{a} finished the record at home, angry at {x} — and it came out better.')); } } },
      { id: 'compromise', label: N('Meio a meio', 'Meet halfway'), hint: N('Disco sai; ninguém fica feliz.', 'The record comes out; nobody is happy.'), w: fac('paciencia'), apply: (s, c) => { hit(s, c, { mom: 1 }); },
        echo: { in: [2, 6], p: 0.5, tone: 'mixed', hint: N('Acordo morno.', 'A lukewarm deal.'), fx: (f) => { f.mood('morale', -2).fame(1); return FX(f, N('O disco de {a} no {x} saiu correto, sem alma — dizem os críticos.', '{a}\'s {x} record came out tidy, soulless — say the critics.')); } } },
      { id: 'fire', label: N('Demitir o produtor', 'Fire the producer'), hint: N('Controle total; risco de passar do ponto.', 'Full control; risk of overdoing it.'), w: fac('ambicao'), apply: (s, c) => { hit(s, c, { trust: 1 }); },
        echo: { in: [2, 6], p: 0.5, tone: 'mixed', hint: N('Ou obra-prima, ou bagunça.', 'Either a masterpiece or a mess.'), fx: (f) => { f.mood('inspiration', 8).mood('stress', 6); return FX(f, N('Sem produtor, {a} reinventou o próprio som no {x}.', 'Without a producer, {a} reinvented its sound at {x}.')); } } },
    ]);
}

// ---------------------------------------------------------------- S5. disputa de sample por época (4)
const SAMPLE: [string, number, number, FamilyId[], L][] = [
  ['80s', 1982, 1991, ['hiphop', 'electronic'], N('um break de funk', 'a funk break')], ['90s', 1992, 1999, ['hiphop', 'electronic', 'rnb'], N('um refrão de soul', 'a soul hook')],
  ['00s', 2000, 2012, ['hiphop', 'pop', 'rnb'], N('um riff de rock', 'a rock riff')], ['10s', 2013, 2040, ['hiphop', 'pop', 'latin', 'africa'], N('a "sensação" de uma canção antiga', 'the "feel" of an old song')],
];
for (const [k, y0, y1, fam, what] of SAMPLE) {
  sit(`m19p_${k}`, 'law', 2, 30, (s) => s.year >= y0 && s.year <= y1,
    (s, r) => { const a = pickAct(s, r, (x) => x.fame >= 30 && fam.includes(familyOf(x.genre))); return a ? ctxOf(a, { x: what.pt }) : null; },
    N('Herdeiros dizem que {a} copiou', 'Heirs say {a} copied'),
    fmtL(N('Os herdeiros de um compositor antigo dizem que o sucesso de {a} usa {w} sem crédito. Advogados pedem uma parte da edição.', 'The heirs of an old songwriter say {a}\'s hit uses {w} without credit. Lawyers want a share of the publishing.'), { w: what }), [
      { id: 'settle', label: N('Acordo e crédito', 'Settle and credit'), hint: N('Perde parte da edição; acaba logo.', 'Lose part of the publishing; over quickly.'), w: fac('paciencia'), apply: (s, c) => { hit(s, c, { cash: -1200, memo: 'Acordo de sample', cat: 'rights' }); },
        echo: { in: [3, 9], p: 0.4, tone: 'good', hint: N('Créditos limpos abrem sync.', 'Clean credits open sync.'), fx: (f) => { f.cash(600, 'Sync após acordo', 'licensing'); return FX(f, N('Com o crédito acertado, a faixa de {a} entrou num filme.', 'With credits settled, {a}\'s track landed in a film.')); } } },
      { id: 'fight', label: N('Ir ao tribunal', 'Go to court'), hint: N('Aposta cara; precedente.', 'A costly gamble; a precedent.'), w: fac('coragem'), apply: (s, c) => { hit(s, c, { cash: -800, memo: 'Advogados: sample', cat: 'legal' }); },
        echo: { in: [6, 18], p: 0.5, tone: 'mixed', hint: N('O júri decide.', 'The jury decides.'), fx: (f) => { f.cash(-3000, 'Sentença: sample', 'legal'); return FX(f, N('O júri deu razão aos herdeiros contra {a}.', 'The jury sided with the heirs against {a}.')); } } },
      { id: 'credit', label: N('Dar o crédito de graça e pedir desculpas', 'Credit them for free and apologise'), hint: N('Edição dividida; imagem limpa.', 'Split publishing; a clean image.'), w: fac('empatia'), apply: (s, c) => { hit(s, c, { trust: 1 }); },
        echo: { in: [2, 6], p: 0.5, tone: 'good', hint: N('Gesto raro na indústria.', 'A rare gesture in the industry.'), fx: (f) => { f.rep('artists', 2); return FX(f, N('{a} creditou os autores antigos sem processo: colegas elogiaram.', '{a} credited the old writers without a lawsuit: peers praised it.')); } } },
    ]);
}

// ---------------------------------------------------------------- S6. censor do bloco do Leste (6)
const CENSOR: [string, string, number, number][] = [['ussr', 'moscow', 1957, 1990], ['poland', 'warsaw', 1958, 1989], ['czech', 'prague', 1960, 1989], ['gdr', 'leipzig', 1960, 1989], ['hungary', 'budapest', 1960, 1989], ['cuba', 'havana', 1961, 1991]];
for (const [k, city, y0, y1] of CENSOR) {
  sit(`m19e_${k}`, 'power', 2, 30, (s) => s.year >= y0 && s.year <= y1,
    (s, r) => { const a = pickAct(s, r, (x) => x.fame >= 35); return a ? ctxOf(a, { x: cityById[city]?.name.pt ?? city }) : null; },
    N('O censor de {x} quer cortar letras de {a}', 'The {x} censor wants to cut {a}\'s lyrics'),
    N('Na turnê por {x}, o representante do ministério devolve o setlist de {a} com metade das letras riscadas. O show é amanhã.', 'On the {x} tour, the ministry representative returns {a}\'s setlist with half the lyrics crossed out. The show is tomorrow.'), [
      { id: 'cut', label: N('Cantar a versão aprovada', 'Sing the approved version'), hint: N('Show seguro; fãs locais decepcionados.', 'A safe show; local fans disappointed.'), w: fac('disciplina'), apply: (s, c) => { hit(s, c, { fans: 2 }); },
        echo: { in: [2, 6], p: 0.4, tone: 'mixed', hint: N('Os fãs perceberam o corte.', 'Fans noticed the cut.'), fx: (f) => { f.rep('artistic', -1); return FX(f, N('Em {x}, os fãs cantaram as letras cortadas por cima de {a}.', 'In {x}, fans sang the cut lyrics over {a}.')); } } },
      { id: 'defy', label: N('Cantar tudo', 'Sing everything'), hint: N('Lenda local; risco de expulsão.', 'Local legend; risk of expulsion.'), w: fac('coragem'), apply: (s, c) => { hit(s, c, { fans: 8, mom: 4 }); },
        echo: { in: [1, 4], p: 0.5, tone: 'mixed', hint: N('Expulsão vira notícia no Ocidente.', 'Expulsion becomes news in the West.'), fx: (f) => { f.fame(3).cash(-800, 'Turnê interrompida no Leste', 'live'); return FX(f, N('{a} foi posto num avião depois do show em {x} — e virou manchete no mundo.', '{a} was put on a plane after the {x} show — and made world headlines.')); } } },
      { id: 'cancel', label: N('Cancelar o show', 'Cancel the show'), hint: N('Perde o cachê; mantém a obra.', 'Lose the fee; keep the work intact.'), w: fac('lealdade'), apply: (s, c) => { hit(s, c, { cash: -600, memo: 'Show cancelado no Leste', cat: 'live' }); },
        echo: { in: [2, 8], p: 0.4, tone: 'good', hint: N('Recusar a censura tem valor.', 'Refusing censorship has value.'), fx: (f) => { f.rep('artistic', 2); return FX(f, N('O cancelamento de {a} em {x} virou símbolo para os fãs de lá.', '{a}\'s cancellation in {x} became a symbol for fans there.')); } } },
    ]);
}

// ---------------------------------------------------------------- S7. pressão de boicote cultural (4)
const BOY: [string, number, number, L][] = [
  ['rhodesia', 1966, 1979, N('as sanções contra a Rodésia', 'the sanctions on Rhodesia')], ['sun_city', 1980, 1991, N('o boicote cultural ao apartheid', 'the cultural boycott of apartheid')],
  ['aaaa', 1985, 1986, N('o disco coletivo contra o resort de Sun City', 'the collective record against the Sun City resort')], ['russia22', 2022, 2040, N('o boicote depois da invasão da Ucrânia', 'the boycott after the invasion of Ukraine')],
];
for (const [k, y0, y1, what] of BOY) {
  sit(`m19b_${k}`, 'faith', 2, 36, (s) => s.year >= y0 && s.year <= y1,
    (s, r) => { const a = pickAct(s, r, (x) => x.fame >= 40); return a ? ctxOf(a, { x: what.pt }) : null; },
    N('{a} pressionado por {x}', '{a} under pressure over {x}'),
    fmtL(N('Ativistas e colegas cobram {a} publicamente por causa de {w}. Ficar em cima do muro também é uma resposta.', 'Activists and peers publicly press {a} over {w}. Sitting on the fence is an answer too.'), { w: what }), [
      { id: 'join', label: N('Aderir em público', 'Join publicly'), hint: N('Prestígio; perde mercados.', 'Prestige; lose markets.'), w: fac('empatia'), apply: (s, c) => { hit(s, c, { mom: 3, fans: 2 }); },
        echo: { in: [2, 6], p: 0.6, tone: 'good', hint: N('A história costuma lembrar.', 'History tends to remember.'), fx: (f) => { f.rep('artists', 2).rep('artistic', 1); return FX(f, N('A adesão de {a} foi citada quando a campanha venceu.', '{a}\'s stand was cited when the campaign won.')); } } },
      { id: 'quiet', label: N('Ficar quieto', 'Stay quiet'), hint: N('Nada agora; cobranças crescem.', 'Nothing now; pressure grows.'), w: fac('paciencia'), apply: () => {},
        echo: { in: [2, 8], p: 0.4, tone: 'bad', hint: N('Silêncio também é lido.', 'Silence is read too.'), fx: (f) => { f.fans(-2); return FX(f, N('O silêncio de {a} virou cobrança nas redes e nas entrevistas.', '{a}\'s silence became a demand in interviews and online.')); } } },
      { id: 'against', label: N('Criticar o boicote', 'Criticise the boycott'), hint: N('Polêmica; base dividida.', 'Controversy; a split base.'), w: fac('impulsividade'), apply: (s, c) => { hit(s, c, { mom: -2, fame: 1 }); },
        echo: { in: [1, 6], p: 0.6, tone: 'bad', hint: N('Polêmica tem custo.', 'Controversy has a cost.'), fx: (f) => { f.rep('artists', -3).fans(-3); return FX(f, N('{a} entrou em choque com colegas por causa de {x}.', '{a} clashed with peers over {x}.')); } } },
    ]);
}

// ---------------------------------------------------------------- S8. crítico de fanzine (3, gatilho zine_founded)
const ZK: [string, number, number, FamilyId[]][] = [['punk', 1976, 1995, ['rock']], ['rap', 1985, 2008, ['hiphop', 'rnb']], ['blog', 2000, 2040, ['rock', 'electronic', 'pop', 'hiphop']]];
for (const [k, y0, y1, fam] of ZK) {
  sit(`m19z_${k}`, 'fame', 1, 18, (s) => s.year >= y0 && s.year <= y1,
    (s, r, f) => { const a = pickAct(s, r, (x) => x.fame >= 10 && x.fame <= 60 && fam.includes(familyOf(x.genre)) && (!f?.place || x.city === f.place)); return a ? ctxOf(a, { x: cityById[a.city]?.name.pt ?? a.city }) : null; },
    N('Um fanzine de {x} detonou {a}', 'A {x} fanzine trashed {a}'),
    N('O fanzine mais lido da cena de {x} chamou {a} de "vendidos". Na cena, isso pega.', 'The most-read fanzine in the {x} scene called {a} "sellouts". In the scene, that sticks.'), [
      { id: 'invite', label: N('Convidar o crítico para o ensaio', 'Invite the critic to rehearsal'), hint: N('Pode virar aliado.', 'May become an ally.'), w: fac('empatia'), apply: (s, c) => { hit(s, c, { mom: 1 }); },
        echo: { in: [1, 4], p: 0.55, tone: 'good', hint: N('Crítico de fanzine muda de ideia às vezes.', 'Fanzine critics change their minds sometimes.'), fx: (f) => { f.fans(3); return FX(f, N('O crítico de {x} voltou do ensaio de {a} convertido.', 'The {x} critic came back from {a}\'s rehearsal converted.')); } } },
      { id: 'letter', label: N('Mandar uma carta furiosa', 'Send a furious letter'), hint: N('Rixa pública; atenção.', 'A public feud; attention.'), w: fac('impulsividade'), apply: (s, c) => { hit(s, c, { mom: 3, trust: -1 }); },
        echo: { in: [1, 4], p: 0.5, tone: 'mixed', hint: N('Briga com fanzine vende fanzine.', 'Fighting a fanzine sells the fanzine.'), fx: (f) => { f.momentum(2).rep('artistic', -1); return FX(f, N('A carta de {a} saiu publicada — com comentários irônicos.', '{a}\'s letter was printed — with sarcastic notes.')); } } },
      { id: 'ignore', label: N('Ignorar', 'Ignore it'), hint: N('Nada agora.', 'Nothing now.'), w: fac('paciencia'), apply: () => {},
        echo: { in: [2, 6], p: 0.3, tone: 'mixed', hint: N('O rótulo pode colar.', 'The label may stick.'), fx: (f) => { f.momentum(-1); return FX(f, N('O apelido de "vendidos" acompanhou {a} pela cena de {x}.', 'The "sellouts" tag followed {a} around the {x} scene.')); } } },
    ], ['zine_founded']);
}

// ---------------------------------------------------------------- S9. banda-fantasma na cidade (3, gatilho ghost_band / ai_voice_fake)
const GH: [string, number, number, string, L][] = [
  ['70s', 1965, 1989, 'ghost_band', N('uma banda falsa com o nome de um grupo famoso', 'a fake band using a famous group\'s name')],
  ['90s', 1990, 2019, 'ghost_band', N('um "tributo" que se anuncia como a banda original', 'a "tribute" billed as the original band')],
  ['ai', 2020, 2040, 'ai_voice_fake', N('uma faixa com a voz clonada por IA', 'a track with an AI-cloned voice')],
];
for (const [k, y0, y1, trig, what] of GH) {
  sit(`m19g_${k}`, 'fame', 1, 18, (s) => s.year >= y0 && s.year <= y1,
    (s, r, f) => { const a = pickAct(s, r, (x) => x.fame >= 25 && !f?.actors.includes(x.id) && (!f?.place || mkOf(x.city) === mkOf(f.place))); return a ? ctxOf(a, { x: what.pt }) : null; },
    N('{a} e {x}', '{a} and {x}'),
    fmtL(N('Na mesma cidade da turnê de {a} aparece {w}. Jornalistas perguntam o que {a} acha — e se algum dia vai fazer igual.', 'In the same city as {a}\'s tour appears {w}. Journalists ask what {a} thinks — and whether they would ever do the same.'), { w: what }), [
      { id: 'condemn', label: N('Condenar a fraude', 'Condemn the fraud'), hint: N('Imagem limpa; pressão por lei.', 'A clean image; pressure for a law.'), w: fac('disciplina'), apply: (s, c) => { hit(s, c, { mom: 1 }); },
        echo: { in: [2, 8], p: 0.5, tone: 'good', hint: N('A posição pode virar lei.', 'The stance may become law.'), fx: (f) => { f.rep('institutional', 1); return FX(f, N('{a} foi chamado a depor numa audiência sobre {x}.', '{a} was called to testify at a hearing about {x}.')); } } },
      { id: 'joke', label: N('Fazer piada', 'Make a joke of it'), hint: N('Simpatia; nada muda.', 'Likeable; nothing changes.'), w: fac('impulsividade'), apply: (s, c) => { hit(s, c, { fans: 1 }); },
        echo: { in: [1, 4], p: 0.5, tone: 'good', hint: N('Humor viraliza.', 'Humour goes viral.'), fx: (f) => { f.fans(2); return FX(f, N('A piada de {a} sobre {x} rodou mais que a própria fraude.', '{a}\'s joke about {x} spread further than the fraud itself.')); } } },
      { id: 'cash', label: N('"Também tenho minha versão"', '"I have my own version too"'), hint: N('Polêmica; dinheiro fácil.', 'Controversy; easy money.'), w: fac('ambicao'), apply: (s, c) => { hit(s, c, { cash: 600, memo: 'Versão oportunista', cat: 'licensing', trust: -2 }); },
        echo: { in: [2, 6], p: 0.5, tone: 'bad', hint: N('Fãs não perdoam oportunismo.', 'Fans do not forgive opportunism.'), fx: (f) => { f.fans(-3).rep('artistic', -2); return FX(f, N('A "versão" oportunista de {a} pegou mal: chamaram de fraude também.', '{a}\'s opportunistic "version" backfired: it was called a fraud too.')); } } },
    ], [trig]);
}

/** quantas situações este módulo registrou (teste/arquivo) */
export const MEDIA19_SITS = (): number => n19;
