// Rodada 19 (Frente 2/10 WP-H, onda 3 — T9) — EVENTOS REGIONALIZADOS a partir dos dados (≈135 cartões novos): festival da
// canção na TV, show em estádio, sociedade local cobrando execução, gravar num estúdio lendário, sample sem crédito,
// banda cover que vira atração, casa histórica ameaçada, boicote cultural, rádio pirata, cota de rádio, turnê pelo bloco
// do Leste, cena local, capa de revista e programa de TV. Cada cartão cita um item de dados (festival, casa, estúdio,
// sociedade, cena, veículo, programa) e cada opção tem eco escrito (decide18). Registro por deferEvents (sem TDZ).
// Regras: nada do futuro (janelas por ano), modo exato sem inventar destino de gente real; as vítimas nunca aparecem.

import { clamp, type Rng } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { SOCS18 } from '../../data/rights18';
import { STUDIOS19 } from '../../data/more19/index';
import { SCENES17 } from '../../data/heritage17';
import { OUTLETS17 } from '../../data/media17';
import { SHOWS19, type Show19 } from '../../data/media19';
import { cityById, familyOf, l, type FamilyId, type L, type MarketId } from '../../data/world';
import { registerConseq18, type Conseq18, type Fx18 } from '../decide18';
import type { EventDef } from '../events';
import { deferEvents } from '../ext4';
import { emitFact } from '../facts17';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { mimeRisk19 } from './fakes19';
import { addHype } from './hype12';
import { homeMk19, showName19 } from './media19';
import { FR18 } from './tv18';
import { VENUES17 } from './venues17';

type Ctx = Record<string, string | number>;
const N = (pt: string, en: string): L => l(pt, en);
const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split' && a.members.length);
const top = (s: GameState, f: (a: Act) => boolean = () => true): Act | undefined => mine(s).filter(f).sort((a, b) => b.fame - a.fame)[0];
const pay = (s: GameState, k: string, real: number, cat: string, memo: string) => post(s, `m19:${k}:${s.week}`, -money(s, real), cat, memo);
const F = (f: Fx18, x: L): L => fmtL(x, { a: f.act?.name ?? l('o selo', 'the label'), x: String(f.c.x ?? ''), c: cityById[String(f.c.city ?? '')]?.name ?? String(f.c.city ?? '') });
const famOk = (a: Act, fam?: FamilyId[]) => !fam || fam.includes(familyOf(a.genre));
const mkOfCity = (c: string): MarketId | undefined => cityById[c]?.market as MarketId | undefined;

export const MEDIA19_EVENTS: EventDef[] = [];
interface Opt19 { id: string; label: L; hint: L; apply?: (s: GameState, r: Rng, c: Ctx) => void; c: Conseq18 }
function ev(id: string, cat: EventDef['cat'], tone: EventDef['tone'], cd: number, find: (s: GameState, r: Rng) => Ctx | null, title: L, text: L, opts: Opt19[], tag: string, weight = 0.3): void {
  MEDIA19_EVENTS.push({ id, cat, tone, tags: ['media19', tag], cooldown: cd, weight, find, title, text,
    options: opts.map((o) => ({ id: o.id, label: o.label, hint: o.hint, apply: o.apply ?? (() => {}) })) });
  for (const o of opts) registerConseq18(`ev:${id}:${o.id}`, o.c);
}

// ================================================================ A. festivais da canção na TV/rádio (FR19 + Kōhaku)
const FEST_M: Record<string, number> = { sanremo: 1, melodifestivalen: 2, vina: 1, sopot: 7, festival_cancao: 2, record_mpb: 9, fic: 9, yamaha_fest: 10, oti: 10, op_triunfo: 0 };
for (const [fid, mo] of Object.entries(FEST_M)) {
  const fr = () => FR18.find((x) => x.id === fid);
  ev(`m19f_${fid}`, 'career', 'good', 11, (s, r) => {
    const d = fr(); if (!d || s.month !== mo || s.year < d.from || s.year > d.to || !d.mk.includes(homeMk19(s))) return null;
    if (!r.chance(0.35)) return null;
    const a = top(s, (x) => x.fame >= 15); return a ? { act: a.id, x: s.config.realNames ? d.real : d.alt.pt } : null;
  }, N('{x}: inscrever {act}?', '{x}: enter {act}?'),
  N('A seleção de {x} está aberta. Canção inédita, orquestra e o país inteiro olhando: vencer abre portas; perder pode virar piada.', '{x} is taking entries. A new song, an orchestra and the whole country watching: winning opens doors; losing can become a joke.'), [
    { id: 'enter', label: N('Inscrever e caprichar', 'Enter and go all out'), hint: N('Arranjo e figurino agora; a noite decide.', 'Arrangement and costumes now; the night decides.'), apply: (s) => pay(s, `f_${fid}`, 1200, 'marketing', 'Festival da canção: arranjo e figurino'),
      c: { odds: (s, c) => { const a = s.acts[String(c.act)]; return { p: clamp(0.15 + (a?.fame ?? 20) / 200 + s.player.reputation.artistic / 400, 0.1, 0.6), why: [N('Base 15% + fama do ato + reputação artística', 'Base 15% + act fame + artistic reputation')] }; },
        later: [{ in: [1, 2], p: (s, c) => clamp(0.15 + (s.acts[String(c.act)]?.fame ?? 20) / 200 + s.player.reputation.artistic / 400, 0.1, 0.6), tone: 'mixed', hint: N('Uma noite decide.', 'One night decides.'),
          fx: (f) => { f.fame(5).fans(8).cash(2000, 'Festival da canção: discos vendidos', 'sales'); return F(f, N('{a} venceu {x}: a canção toca em todas as rádios.', '{a} won {x}: the song is on every radio.')); },
          miss: (f) => { f.mood('morale', -5).fame(1); return F(f, N('{a} ficou fora do pódio em {x}; a canção vendeu um pouco mesmo assim.', '{a} missed the podium at {x}; the song sold a little anyway.')); } }] } },
    { id: 'song', label: N('Ceder a canção a outro intérprete', 'Give the song to another singer'), hint: N('Sem vexame; a edição pode render.', 'No embarrassment; publishing may pay.'),
      c: { later: [{ in: [2, 6], p: 0.5, tone: 'good', hint: N('Canção no festival, crédito no selo.', 'A song at the festival, credit at the label.'), fx: (f) => { f.cash(1000, 'Edição: canção de festival', 'publishing'); return F(f, N('A canção cedida para {x} foi regravada: a edição rende.', 'The song you gave to {x} was re-recorded: publishing pays.')); } }] } },
    { id: 'skip', label: N('Não é a nossa praia', 'Not our thing'), hint: N('Nada agora.', 'Nothing now.'),
      c: { later: [{ in: [2, 6], p: 0.3, tone: 'mixed', hint: N('O país assiste sem você.', 'The country watches without you.'), fx: (f) => { f.momentum(-2); return F(f, N('Um ato rival brilhou em {x} enquanto {a} ficou de fora.', 'A rival act shone at {x} while {a} sat it out.')); } }] } },
  ], 'songfest');
}

// ================================================================ B. show em estádio (casas ≥ 30 mil lugares)
const STADIA = ['maracana', 'wembley', 'tokyo_dome', 'orlando_stadium', 'kingston_national_stadium', 'stade_20_mai', 'gelora_bung_karno', 'black_star_square', 'cape_town_stadium'];
for (const vid of STADIA) {
  const v = () => VENUES17.find((x) => x.id === vid);
  ev(`m19s_${vid}`, 'stage', 'good', 24, (s, r) => {
    const d = v(); if (!d || s.year < d.from || (d.to && s.year > d.to)) return null;
    const a = top(s, (x) => x.fame >= 60); if (!a || !r.chance(0.05)) return null;
    return { act: a.id, x: d.name };
  }, N('{act} no {x}?', '{act} at {x}?'),
  N('Um promotor oferece o {x} — dezenas de milhares de lugares. Encher dá história e dinheiro; meia casa vira manchete do jeito errado.', 'A promoter offers {x} — tens of thousands of seats. Filling it makes history and money; a half-empty stadium makes the wrong headline.'), [
    { id: 'book', label: N('Fechar o estádio por nossa conta', 'Book the stadium ourselves'), hint: N('Custo alto agora; a bilheteria decide.', 'High cost now; the gate decides.'), apply: (s) => pay(s, `s_${vid}`, 6000, 'live', 'Estádio: aluguel, palco e segurança'),
      c: { odds: (s, c) => ({ p: clamp(0.3 + (s.acts[String(c.act)]?.fame ?? 50) / 150, 0.3, 0.85), why: [N('Base 30% + fama do ato', 'Base 30% + act fame')] }),
        later: [{ in: [1, 3], p: (s, c) => clamp(0.3 + (s.acts[String(c.act)]?.fame ?? 50) / 150, 0.3, 0.85), tone: 'mixed', hint: N('Estádio cheio ou manchete ruim.', 'A full stadium or a bad headline.'),
          fx: (f) => { f.cash(14000, 'Estádio: bilheteria', 'live').fans(10).fame(3); return F(f, N('{a} lotou o {x}: a foto aérea rodou o mundo.', '{a} packed {x}: the aerial photo went around the world.')); },
          miss: (f) => { f.cash(3000, 'Estádio: bilheteria parcial', 'live').mood('morale', -6); return F(f, N('Meio {x} vazio: a imprensa mostrou as arquibancadas, não o show de {a}.', 'Half of {x} empty: the press showed the stands, not {a}\'s show.')); } }] } },
    { id: 'copro', label: N('Coproduzir com o promotor local', 'Co-promote with the local promoter'), hint: N('Sem custo; divide a bilheteria.', 'No cost; split the gate.'),
      c: { later: [{ in: [1, 3], p: 0.7, tone: 'good', hint: N('Menos risco, menos lucro.', 'Less risk, less profit.'), fx: (f) => { f.cash(5000, 'Estádio: parte da bilheteria', 'live').fans(5); return F(f, N('O {x} com o promotor local: casa boa, conta dividida.', '{x} with the local promoter: a good crowd, a split bill.')); } }] } },
    { id: 'decline', label: N('Cedo demais para estádio', 'Too early for stadiums'), hint: N('Nada agora.', 'Nothing now.'),
      c: { later: [{ in: [2, 6], p: 0.3, tone: 'mixed', hint: N('Outro pode pegar a data.', 'Someone else may take the date.'), fx: (f) => { f.momentum(-2); return F(f, N('Outro ato pegou a data do {x}.', 'Another act took the {x} date.')); } }] } },
  ], 'stadium');
}

// ================================================================ C. sociedade local cobra execução pública
const SOCS = ['ascap', 'bmi', 'prs', 'gema', 'sacem', 'ecad', 'jasrac', 'sadaic', 'komca', 'samro', 'apra', 'siae'];
for (const sid of SOCS) {
  const so = () => SOCS18.find((x) => x.id === sid);
  ev(`m19c_${sid}`, 'business', 'neutral', 36, (s, r) => {
    const d = so(); if (!d || s.year < d.from || (d.to && s.year > d.to) || d.mk !== homeMk19(s)) return null;
    if (Object.values(s.releases).filter((x) => x.owner === 'player').length < 3 || !r.chance(0.04)) return null;
    const a = top(s); return a ? { act: a.id, x: d.name } : null;
  }, N('A {x} bate à porta', '{x} comes knocking'),
  N('A sociedade {x} diz que seus shows e lançamentos tocam obras do repertório dela sem licença — e oferece a filiação do selo (que também arrecada para você).', 'The {x} society says your shows and releases use works from its repertoire unlicensed — and offers to sign up the label (which also collects for you).'), [
    { id: 'join', label: N('Filiar o selo e acertar', 'Join and settle'), hint: N('Taxa agora; arrecadação atrasada depois.', 'A fee now; back royalties later.'), apply: (s) => pay(s, `c_${sid}`, 400, 'admin', 'Filiação a sociedade de autores'),
      c: { later: [{ in: [3, 9], p: 0.8, tone: 'good', hint: N('A sociedade também paga.', 'The society pays too.'), fx: (f) => { f.cash(2500, 'Sociedade: arrecadação atrasada', 'royalties').rep('institutional', 1); return F(f, N('A {x} repassou a arrecadação atrasada das execuções do seu catálogo.', '{x} passed on the back royalties from your catalogue\'s performances.')); } }] } },
    { id: 'haggle', label: N('Negociar a tabela', 'Haggle over the rate'), hint: N('Aposta: desconto ou multa.', 'A gamble: a discount or a fine.'),
      c: { odds: () => ({ p: 0.5, why: [N('Sociedades raramente cedem; 50%.', 'Societies rarely yield; 50%.')] }),
        later: [{ in: [2, 6], p: 0.5, tone: 'mixed', hint: N('Ou desconto, ou multa.', 'Either a discount or a fine.'), fx: (f) => { f.cash(1200, 'Sociedade: acordo com desconto', 'royalties'); return F(f, N('Acordo com a {x}: tabela menor e repasse em dia.', 'A deal with {x}: a lower rate and payments on time.')); },
          miss: (f) => { f.cash(-800, 'Sociedade: multa por atraso', 'legal'); return F(f, N('A {x} não cedeu: multa por atraso.', '{x} did not yield: a late fine.')); } }] } },
    { id: 'refuse', label: N('Recusar: "tocamos o que é nosso"', 'Refuse: "we play our own stuff"'), hint: N('Nada agora; processo possível.', 'Nothing now; a lawsuit is possible.'),
      c: { later: [{ in: [3, 12], p: 0.55, tone: 'bad', hint: N('Sociedade tem advogado.', 'Societies have lawyers.'), fx: (f) => { f.cash(-2500, 'Processo: execução pública sem licença', 'legal').rep('institutional', -2); return F(f, N('A {x} processou: execução pública sem licença.', '{x} sued: unlicensed public performance.')); } }] } },
  ], 'society');
}

// ================================================================ D. gravar num estúdio lendário (STUDIOS19)
const STUDIOS = ['compass_point', 'fame_studios', 'muscle_shoals_sound', 'abbey_road', 'hansa_berlin', 'studio_one', 'electric_lady', 'sun_studio', 'air_montserrat', 'polar_studios', 'criteria', 'sigma_sound'];
for (const tid of STUDIOS) {
  const st = () => STUDIOS19.find((x) => x.id === tid);
  ev(`m19t_${tid}`, 'career', 'good', 24, (s, r) => {
    const d = st(); if (!d || s.year < d.from || (d.to && s.year > d.to)) return null;
    const a = top(s, (x) => x.fame >= 30); if (!a || !r.chance(0.05)) return null;
    return { act: a.id, x: d.name };
  }, N('Gravar no {x}?', 'Record at {x}?'),
  N('Abriu uma janela no {x}: a sala, os técnicos e o som que fizeram discos lendários. {act} quer ir; a viagem e as diárias não saem barato.', 'A slot opened at {x}: the room, the engineers and the sound behind legendary records. {act} wants to go; travel and day rates are not cheap.'), [
    { id: 'book', label: N('Reservar duas semanas', 'Book two weeks'), hint: N('Custo agora; inspiração e prestígio depois.', 'Cost now; inspiration and prestige later.'), apply: (s) => pay(s, `t_${tid}`, 3000, 'recording', 'Estúdio lendário: sala e viagem'),
      c: { later: [{ in: [2, 5], p: 0.65, tone: 'good', hint: N('A sala tem alma — ou só conta alta.', 'The room has soul — or just a high bill.'),
        fx: (f) => { f.mood('inspiration', 12).fame(2).momentum(4); return F(f, N('{a} voltou do {x} com o melhor material da carreira; a crítica fala do "som da sala".', '{a} came back from {x} with career-best material; critics talk about "the room sound".')); },
        miss: (f) => { f.mood('stress', 8).cash(-1000, 'Estúdio lendário: dias extras', 'recording'); return F(f, N('No {x}, {a} brigou com o técnico da casa e estourou as diárias.', 'At {x}, {a} clashed with the house engineer and blew the day rates.')); } }] } },
    { id: 'demo', label: N('Só gravar as demos lá', 'Just cut the demos there'), hint: N('Barato; um gostinho.', 'Cheap; a taste.'), apply: (s) => pay(s, `td_${tid}`, 600, 'recording', 'Estúdio lendário: demos'),
      c: { later: [{ in: [1, 4], p: 0.5, tone: 'good', hint: N('As demos podem render.', 'The demos may pay off.'), fx: (f) => { f.mood('inspiration', 6); return F(f, N('As demos de {a} no {x} viraram a base do próximo disco.', '{a}\'s demos at {x} became the base of the next record.')); } }] } },
    { id: 'home', label: N('Gravar em casa mesmo', 'Record at home'), hint: N('Nada agora.', 'Nothing now.'),
      c: { later: [{ in: [2, 6], p: 0.25, tone: 'mixed', hint: N('A banda pode ficar frustrada.', 'The band may be frustrated.'), fx: (f) => { f.mood('morale', -3); return F(f, N('{a} ainda fala do {x} que não aconteceu.', '{a} still talks about the {x} session that never happened.')); } }] } },
  ], 'studio');
}

// ================================================================ E. sample sem crédito (por época e família)
const SAMP: [string, number, number, FamilyId[], L][] = [
  ['hh_old', 1979, 1991, ['hiphop'], N('um break de bateria de um disco de funk antigo', 'a drum break from an old funk record')],
  ['hh_new', 1992, 2040, ['hiphop'], N('um refrão de soul dos anos 70', 'a 1970s soul hook')],
  ['dance', 1988, 2040, ['electronic'], N('a voz de uma diva de disco', 'a disco diva\'s vocal')],
  ['pop', 2000, 2040, ['pop', 'rnb'], N('a melodia de um clássico dos anos 80', 'the melody of an 1980s classic')],
  ['latin', 2005, 2040, ['latin', 'caribbean'], N('um riddim de dancehall jamaicano', 'a Jamaican dancehall riddim')],
  ['afro', 2015, 2040, ['africa'], N('um sample de highlife dos anos 70', 'a 1970s highlife sample')],
];
for (const [k, y0, y1, fam, what] of SAMP) {
  ev(`m19p_${k}`, 'contract', 'neutral', 18, (s, r) => {
    if (s.year < y0 || s.year > y1 || !r.chance(0.04)) return null;
    const a = top(s, (x) => famOk(x, fam)); return a ? { act: a.id } : null;
  }, N('Sample sem liberação na faixa de {act}', 'Uncleared sample on {act}\'s track'),
  fmtL(N('A faixa nova de {act} é construída sobre {w}. O produtor jura que "ninguém vai notar". Liberar custa; regravar muda o som; lançar assim é aposta.', '{act}\'s new track is built on {w}. The producer swears "no one will notice". Clearing costs; replaying changes the sound; releasing as is, is a gamble.'), { w: what }), [
    { id: 'clear', label: N('Liberar o sample', 'Clear the sample'), hint: N('Custo e parte da edição; zero risco.', 'Cost and a share of publishing; zero risk.'), apply: (s) => pay(s, `p_${k}`, 1500, 'rights', 'Liberação de sample'),
      c: { later: [{ in: [2, 6], p: 0.4, tone: 'good', hint: N('Créditos limpos abrem portas.', 'Clean credits open doors.'), fx: (f) => { f.cash(800, 'Sync: faixa com créditos limpos', 'licensing').fame(1); return F(f, N('Créditos limpos: a faixa de {a} entrou num comercial sem dor de cabeça.', 'Clean credits: {a}\'s track landed in an ad with no headache.')); } }] } },
    { id: 'replay', label: N('Regravar o trecho (interpolação)', 'Replay the part (interpolation)'), hint: N('Mais barato; o som muda.', 'Cheaper; the sound changes.'), apply: (s) => pay(s, `pr_${k}`, 900, 'recording', 'Interpolação: músicos de estúdio'),
      c: { later: [{ in: [2, 6], p: 0.5, tone: 'mixed', hint: N('Pode ficar melhor ou perder a mágica.', 'It may improve or lose the magic.'), fx: (f) => { f.mood('inspiration', 4); return F(f, N('A versão regravada deu personalidade à faixa de {a}.', 'The replayed version gave {a}\'s track its own character.')); } }] } },
    { id: 'asis', label: N('Lançar assim', 'Release as is'), hint: N('Nada agora; processo possível (bem mais provável depois de 1991).', 'Nothing now; a lawsuit is possible (far likelier after 1991).'),
      c: { later: [{ in: [3, 12], p: (s) => (s.year >= 1992 ? 0.6 : 0.15), tone: 'bad', hint: N('Os donos do original costumam ouvir rádio.', 'Owners of the original tend to listen to the radio.'),
        fx: (f) => { f.cash(f.s.year >= 1992 ? -6000 : -1500, 'Processo por sample sem liberação', 'legal').rep('institutional', -2); emitFact(f.s, { kind: 'case_ruling', actors: ['player', ...(f.act ? [f.act.id] : [])], severity: 40, visibility: 'public', tags: ['bad', 'rights', 'sample', 'media19'], src: 'media19ev', text: F(f, N('Os donos do original processaram {a} pelo sample sem liberação.', 'The owners of the original sued {a} over the uncleared sample.')) }); return F(f, N('Processo pelo sample de {a}: acordo caro e edição dividida.', 'Lawsuit over {a}\'s sample: a costly settlement and split publishing.')); } }] } },
  ], 'sample');
}

// ================================================================ F. banda cover vira atração (circuitos)
const COVC: [string, number, MarketId | null, L][] = [
  ['uk_pubs', 1960, 'eu', N('nos pubs britânicos', 'in British pubs')], ['vegas', 1956, 'na', N('em Las Vegas', 'in Las Vegas')], ['japan', 1966, 'asia', N('nos clubes do Japão', 'in Japanese clubs')],
  ['bailes', 1950, 'br', N('nos bailes do interior', 'at country dances')], ['cruise', 1975, null, N('nos cruzeiros', 'on cruise ships')], ['youtube', 2006, null, N('num canal de covers na internet', 'on an online cover channel')],
];
for (const [k, y0, mk, where] of COVC) {
  ev(`m19v_${k}`, 'market', 'neutral', 24, (s, r) => {
    if (s.year < y0 || (mk && mk !== homeMk19(s)) || !r.chance(0.03)) return null;
    const a = top(s, (x) => x.fame >= 45); return a ? { act: a.id } : null;
  }, N('Uma banda cover de {act} lota casas', 'A {act} cover band is packing venues'),
  fmtL(N('Uma banda que só toca {act} virou atração {w}. Ela paga pouco ou nada pelo repertório — e às vezes enche mais que o original.', 'A band that only plays {act} has become an attraction {w}. It pays little or nothing for the repertoire — and sometimes draws more than the original.'), { w: where }), [
    { id: 'license', label: N('Licenciar o repertório', 'License the repertoire'), hint: N('Renda pequena e estável.', 'Small, steady income.'),
      c: { later: [{ in: [2, 8], p: 0.8, tone: 'good', hint: N('Licença paga todo mês.', 'A licence pays monthly.'), fx: (f) => { f.cash(900, 'Licença de banda cover', 'licensing'); return F(f, N('A banda cover de {a} paga em dia e mantém o catálogo vivo.', 'The {a} cover band pays on time and keeps the catalogue alive.')); } }] } },
    { id: 'sue', label: N('Processar', 'Sue'), hint: N('Aposta: indenização ou custas.', 'A gamble: damages or costs.'),
      c: { odds: () => ({ p: 0.5, why: [N('Repertório é licenciável por sociedade; o nome é que dá processo. 50%.', 'Repertoire is licensable via societies; the name is what gets you a case. 50%.')] }),
        later: [{ in: [3, 9], p: 0.5, tone: 'mixed', hint: N('Juiz pode dar razão a qualquer lado.', 'The judge may side with either.'), fx: (f) => { f.cash(1500, 'Indenização: uso do nome', 'legal'); return F(f, N('A banda cover de {a} perdeu o direito de usar o nome.', 'The {a} cover band lost the right to use the name.')); },
          miss: (f) => { f.cash(-1200, 'Custas: processo contra banda cover', 'legal').fans(-1); return F(f, N('O juiz deu razão à banda cover; fãs acharam o processo mesquinho.', 'The judge sided with the cover band; fans found the suit petty.')); } }] } },
    { id: 'stage', label: N('Subir ao palco com eles', 'Join them on stage'), hint: N('Gesto simpático; fãs adoram.', 'A friendly gesture; fans love it.'),
      c: { later: [{ in: [1, 3], p: 0.6, tone: 'good', hint: N('Pode virar vídeo famoso.', 'It may become a famous clip.'), fx: (f) => { f.fans(4).fame(1); return F(f, N('{a} subiu de surpresa no palco da própria banda cover: o vídeo rodou o mundo.', '{a} surprised their own cover band on stage: the clip went around the world.')); } }] } },
  ], 'coverband');
}

// ================================================================ G. casa histórica ameaçada (VENUES17 com data de fechamento)
const OLDV = ['cavern', 'marquee', 'cbgb', 'canecao', 'hacienda', 'aeroanta', 'cotton_club', 'savoy_ballroom', 'fillmore_east', 'maxs_kansas_city', 'paradise_garage', 'palomino', 'rainbow_theatre', 'star_club', 'studio54'];
for (const vid of OLDV) {
  const v = () => VENUES17.find((x) => x.id === vid);
  ev(`m19h_${vid}`, 'culture', 'neutral', 999, (s, r) => {
    const d = v(); if (!d?.to || s.year < d.to - 2 || s.year > d.to || !r.chance(0.08)) return null;
    const a = top(s, (x) => x.fame >= 20); return a ? { act: a.id, x: d.name } : null;
  }, N('{x} está ameaçado de fechar', '{x} may be about to close'),
  N('Aluguel, dívidas, vizinhos e a prefeitura: o {x}, onde tanta gente começou, pode fechar. A cena pede ajuda; {act} foi convidado para um show beneficente.', 'Rent, debts, neighbours and city hall: {x}, where so many started, may close. The scene asks for help; {act} is invited to a benefit show.'), [
    { id: 'benefit', label: N('Tocar no show beneficente', 'Play the benefit'), hint: N('Custo de produção; prestígio na cena.', 'Production cost; scene prestige.'), apply: (s) => pay(s, `h_${vid}`, 800, 'live', 'Show beneficente: produção'),
      c: { later: [{ in: [1, 4], p: 0.7, tone: 'good', hint: N('A cena lembra quem apareceu.', 'The scene remembers who showed up.'), fx: (f) => { f.fans(4).rep('artistic', 2); return F(f, N('O show de {a} pelo {x} virou lenda — com ou sem a casa no fim.', '{a}\'s show for {x} became legend — with or without the venue at the end.')); } }] } },
    { id: 'petition', label: N('Assinar o abaixo-assinado', 'Sign the petition'), hint: N('Sem custo; gesto pequeno.', 'No cost; a small gesture.'),
      c: { later: [{ in: [2, 6], p: 0.5, tone: 'mixed', hint: N('Um nome na lista ajuda pouco.', 'One name on a list helps a little.'), fx: (f) => { f.rep('institutional', 1); return F(f, N('O abaixo-assinado pelo {x} chegou à prefeitura com o nome do selo.', 'The petition for {x} reached city hall with the label\'s name on it.')); } }] } },
    { id: 'ignore', label: N('Não é problema nosso', 'Not our problem'), hint: N('Nada agora.', 'Nothing now.'),
      c: { later: [{ in: [3, 9], p: 0.3, tone: 'bad', hint: N('O circuito lembra quem sumiu.', 'The circuit remembers who vanished.'), fx: (f) => { f.rep('artists', -1); return F(f, N('Quando o {x} fechou, os músicos lembraram quem não apareceu.', 'When {x} closed, musicians remembered who did not show up.')); } }] } },
  ], 'venue');
}

// ================================================================ H. boicote cultural (só casos documentados)
const BOY: [string, number, number, string, L, L][] = [
  ['rhodesia', 1966, 1979, 'ZWE', N('Sanções da ONU à Rodésia', 'UN sanctions on Rhodesia'), N('um cassino em Salisbury', 'a casino in Salisbury')],
  ['sun_city', 1980, 1991, 'ZAF', N('Boicote cultural da ONU ao apartheid', 'UN cultural boycott of apartheid'), N('um resort de luxo num bantustão', 'a luxury resort in a bantustan')],
  ['russia22', 2022, 2040, 'RUS', N('Boicote depois da invasão da Ucrânia (2022)', 'Boycott after the invasion of Ukraine (2022)'), N('uma arena em Moscou', 'an arena in Moscow')],
];
for (const [k, y0, y1, a3, what, where] of BOY) {
  ev(`m19b_${k}`, 'world', 'neutral', 36, (s, r) => {
    if (s.year < y0 || s.year > y1 || !r.chance(0.04)) return null;
    const a = top(s, (x) => x.fame >= 40); return a ? { act: a.id, x: a3 } : null;
  }, fmtL(N('Proposta milionária sob boicote: {w}', 'A lucrative offer under boycott: {w}'), { w: what }),
  fmtL(N('Oferecem a {act} um cachê enorme para tocar em {p}. Vários artistas recusam em protesto; outros vão e são cobrados por anos.', '{act} is offered a huge fee to play {p}. Many artists refuse in protest; others go and are held to account for years.'), { p: where }), [
    { id: 'play', label: N('Aceitar o cachê', 'Take the fee'), hint: N('Dinheiro agora; reputação em jogo.', 'Money now; reputation at stake.'), apply: (s) => { post(s, `m19:b_${k}:${s.week}`, money(s, 6000), 'live', 'Show sob boicote: cachê'); },
      c: { later: [{ in: [1, 6], p: 0.75, tone: 'bad', hint: N('A lista dos que foram circula.', 'The list of those who went circulates.'), fx: (f) => { f.rep('artists', -4).rep('artistic', -2).fans(-3); return F(f, N('{a} entrou na lista de quem furou o boicote; fãs e colegas cobram.', '{a} landed on the list of boycott-breakers; fans and peers hold them to account.')); } }] } },
    { id: 'refuse', label: N('Recusar em público', 'Refuse publicly'), hint: N('Sem cachê; prestígio entre artistas.', 'No fee; prestige among artists.'),
      c: { later: [{ in: [1, 4], p: 0.7, tone: 'good', hint: N('A recusa pode virar notícia.', 'The refusal may become news.'), fx: (f) => { f.rep('artistic', 3).rep('artists', 3); return F(f, N('A recusa de {a} virou manchete e símbolo da campanha.', '{a}\'s refusal made headlines and became a symbol of the campaign.')); } }] } },
    { id: 'quiet', label: N('Recusar sem alarde', 'Decline quietly'), hint: N('Nada agora.', 'Nothing now.'),
      c: { later: [{ in: [2, 6], p: 0.3, tone: 'mixed', hint: N('Ninguém fica sabendo — ou fica.', 'No one finds out — or they do.'), fx: (f) => { f.rep('artists', 1); return F(f, N('Soube-se depois que {a} recusou a oferta: respeito discreto.', 'It later emerged {a} turned the offer down: quiet respect.')); } }] } },
  ], 'boycott', 0.2);
}

// ================================================================ I. rádio pirata (estações documentadas)
const PIR: [string, number, number, string, L][] = [
  ['mercur', 1958, 1962, 'copenhagen', N('a Radio Mercur, num navio no Øresund', 'Radio Mercur, on a ship in the Øresund')],
  ['veronica', 1960, 1974, 'amsterdam', N('a Radio Veronica, num navio no Mar do Norte', 'Radio Veronica, on a North Sea ship')],
  ['nordsee', 1970, 1974, 'hamburg', N('a Radio Nordsee International, num navio', 'Radio Nordsee International, on a ship')],
  ['libres', 1977, 1981, 'paris', N('as "rádios livres" de Paris, antes da legalização de 1981', 'Paris\'s "free radios", before the 1981 legalisation')],
  ['kiss', 1985, 1990, 'london', N('uma rádio pirata de soul e house em Londres', 'a London soul and house pirate station')],
  ['grime', 2002, 2010, 'london', N('as rádios piratas de grime nos telhados do leste de Londres', 'the grime pirate stations on East London rooftops')],
];
for (const [k, y0, y1, city, who] of PIR) {
  ev(`m19r_${k}`, 'market', 'neutral', 18, (s, r) => {
    if (s.year < y0 || s.year > y1 || mkOfCity(city) !== homeMk19(s) || !r.chance(0.05)) return null;
    const a = top(s); return a ? { act: a.id } : null;
  }, N('Rádio pirata pede os discos de {act}', 'A pirate station wants {act}\'s records'),
  fmtL(N('{w} toca o que a rádio oficial não toca e quer o novo de {act} antes de todo mundo. É ilegal, ou quase.', '{w} plays what official radio won\'t and wants {act}\'s new record before anyone else. It is illegal, or nearly.'), { w: who }), [
    { id: 'supply', label: N('Mandar os discos', 'Send the records'), hint: N('Alcance jovem; risco legal.', 'Young reach; legal risk.'), apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (a) { a.fans.casual += Math.round(150 + a.fame * 15); addHype(s, `a:${a.id}`, 'm19pirate', l('Rádio pirata', 'Pirate radio'), 4); } },
      c: { later: [{ in: [3, 12], p: 0.35, tone: 'bad', hint: N('A fiscalização pode chegar.', 'The regulator may arrive.'), fx: (f) => { f.cash(-700, 'Multa: abastecer rádio pirata', 'legal').rep('institutional', -2); return F(f, N('A fiscalização pegou a rádio pirata — e a lista de selos que a abasteciam.', 'The regulator raided the pirate station — and found the list of labels supplying it.')); },
        miss: (f) => { f.fans(3); return F(f, N('A rádio pirata tocou {a} sem parar: a juventude sabe as letras de cor.', 'The pirate station played {a} nonstop: the young know the lyrics by heart.')); } }] } },
    { id: 'ads', label: N('Comprar anúncios na pirata', 'Buy ads on the pirate'), hint: N('Custo; holofote total.', 'Cost; full spotlight.'), apply: (s) => pay(s, `r_${k}`, 1000, 'marketing', 'Anúncios em rádio pirata'),
      c: { later: [{ in: [1, 4], p: 0.6, tone: 'mixed', hint: N('Holofote — e uma ficha.', 'A spotlight — and a record.'), fx: (f) => { f.momentum(5); return F(f, N('Os anúncios na pirata deram a {a} o verão inteiro.', 'The pirate ads gave {a} the whole summer.')); } }] } },
    { id: 'official', label: N('Ficar com a rádio oficial', 'Stick with official radio'), hint: N('Ficha limpa; alcance menor.', 'A clean record; less reach.'),
      c: { later: [{ in: [3, 9], p: 0.4, tone: 'mixed', hint: N('Ficha limpa, alcance curto.', 'A clean record, short reach.'), fx: (f) => { f.rep('institutional', 1).momentum(-2); return F(f, N('Ficha limpa — mas os rivais tocaram na pirata o ano todo.', 'A clean record — but rivals were on the pirate all year.')); } }] } },
  ], 'pirate');
}

// ================================================================ J. cota de rádio (leis documentadas)
const QUOTA: [string, number, string, L][] = [
  ['cancon', 1971, 'CAN', N('A CRTC exige 30% de música canadense nas rádios AM (MAPL).', 'The CRTC requires 30% Canadian music on AM radio (MAPL).')],
  ['opm', 1973, 'PHL', N('Decreto obriga as rádios filipinas a tocar música filipina (OPM) toda hora.', 'A decree requires Philippine radio to play Filipino music (OPM) every hour.')],
  ['toubon', 1996, 'FRA', N('Lei: 40% de canções em francês nas rádios, metade de artistas novos.', 'Law: 40% French-language songs on radio, half from new artists.')],
  ['za_local', 1997, 'ZAF', N('Cota de conteúdo local nas rádios sul-africanas.', 'Local-content quota on South African radio.')],
  ['pt_quota', 2006, 'PRT', N('Lei portuguesa fixa uma cota mínima de música portuguesa nas rádios.', 'Portuguese law sets a minimum quota of Portuguese music on radio.')],
];
for (const [k, y, a3, what] of QUOTA) {
  ev(`m19q_${k}`, 'world', 'neutral', 999, (s, r) => {
    if (s.year < y || s.year > y + 2 || countryOfCity(s.config.homeCity) !== a3 || !r.chance(0.25)) return null;
    const a = top(s); return a ? { act: a.id } : null;
  }, N('Cota de rádio: o que fazer?', 'Radio quota: what now?'),
  fmtL(N('{w} Artistas locais ganham rotação garantida; o repertório estrangeiro perde espaço.', '{w} Local artists get guaranteed airplay; foreign repertoire loses room.'), { w: what }), [
    { id: 'locals', label: N('Correr atrás de artistas locais', 'Chase local artists'), hint: N('Custo de A&R; rotação garantida.', 'A&R cost; guaranteed airplay.'), apply: (s) => pay(s, `q_${k}`, 1500, 'admin', 'A&R: artistas locais pela cota'),
      c: { later: [{ in: [3, 9], p: 0.7, tone: 'good', hint: N('A cota abre a porta.', 'The quota opens the door.'), fx: (f) => { for (const a of f.mine) a.momentum = clamp(a.momentum + 4, -100, 100); f.fans(4); return F(f, N('Com a cota, os artistas locais do selo entraram na rotação.', 'With the quota, the label\'s local artists got into rotation.')); } }] } },
    { id: 'lobby', label: N('Fazer lobby contra', 'Lobby against it'), hint: N('Custo; chance pequena.', 'Cost; a small chance.'), apply: (s) => pay(s, `ql_${k}`, 1000, 'admin', 'Lobby contra cota de rádio'),
      c: { odds: () => ({ p: 0.2, why: [N('Leis culturais raramente caem; 20%.', 'Cultural laws rarely fall; 20%.')] }),
        later: [{ in: [3, 12], p: 0.2, tone: 'mixed', hint: N('A lei raramente cai.', 'The law rarely falls.'), fx: (f) => { f.rep('commercial', 2); return F(f, N('O lobby conseguiu brechas na regra da cota.', 'The lobby won loopholes in the quota rule.')); },
          miss: (f) => { f.rep('institutional', -2); return F(f, N('O lobby contra a cota pegou mal: o selo virou "inimigo da cultura nacional".', 'The anti-quota lobby backfired: the label became "an enemy of national culture".')); } }] } },
    { id: 'ignore', label: N('Seguir igual', 'Carry on as before'), hint: N('Nada agora; rotação cai.', 'Nothing now; airplay drops.'),
      c: { later: [{ in: [2, 6], p: 0.6, tone: 'bad', hint: N('As rádios vão cumprir a lei.', 'Radio will follow the law.'), fx: (f) => { f.momentum(-3); return F(f, N('As rádios cumpriram a cota e as faixas estrangeiras de {a} perderam espaço.', 'Radio met the quota and {a}\'s foreign-sounding tracks lost room.')); } }] } },
  ], 'quota', 0.5);
}

// ================================================================ K. turnê pelo bloco do Leste (agências estatais)
const EAST: [string, string, number, number, L][] = [
  ['ussr', 'moscow', 1957, 1990, N('a Goskontsert, agência estatal soviética', 'Goskontsert, the Soviet state agency')],
  ['poland', 'warsaw', 1958, 1989, N('a Pagart, agência estatal polonesa', 'Pagart, the Polish state agency')],
  ['czech', 'prague', 1960, 1989, N('a Pragokoncert, agência tchecoslovaca', 'Pragokoncert, the Czechoslovak agency')],
  ['hungary', 'budapest', 1960, 1989, N('a agência de concertos húngara', 'the Hungarian concert agency')],
  ['gdr', 'leipzig', 1960, 1989, N('a Künstleragentur da Alemanha Oriental', 'East Germany\'s Künstleragentur')],
  ['bulgaria', 'sofia', 1960, 1989, N('a agência de concertos búlgara', 'the Bulgarian concert agency')],
  ['romania', 'bucharest', 1965, 1989, N('a agência romena de espetáculos', 'the Romanian entertainment agency')],
  ['yugo', 'belgrade', 1955, 1991, N('um promotor de Belgrado (a Iugoslávia não alinhada é mais aberta)', 'a Belgrade promoter (non-aligned Yugoslavia is more open)')],
  ['cuba', 'havana', 1961, 1991, N('o Ministério da Cultura cubano', 'the Cuban Ministry of Culture')],
];
for (const [k, city, y0, y1, who] of EAST) {
  ev(`m19e_${k}`, 'stage', 'neutral', 30, (s, r) => {
    if (s.year < y0 || s.year > y1 || !r.chance(0.02)) return null;
    const a = top(s, (x) => x.fame >= 35); return a ? { act: a.id, city } : null;
  }, N('Convite: turnê de {act} em {cityName}', 'Invitation: {act} on tour in {cityName}'),
  fmtL(N('{w} convida {act}: estádios cheios de fãs que só conheciam os discos contrabandeados. O cachê vem em moeda local, e um censor quer ver as letras.', '{w} invites {act}: stadiums full of fans who only knew the smuggled records. The fee comes in local currency, and a censor wants to see the lyrics.'), { w: who }), [
    { id: 'accept', label: N('Aceitar como está', 'Accept as is'), hint: N('Fãs novos; censura imprevisível.', 'New fans; unpredictable censors.'),
      c: { later: [{ in: [1, 4], p: 0.6, tone: 'mixed', hint: N('Fãs fanáticos; burocracia também.', 'Fanatical fans; bureaucracy too.'), fx: (f) => { f.fans(8).fame(2).cash(1500, 'Turnê no Leste (convertido)', 'live'); return F(f, N('{a} tocou em {c} para multidões que choravam; os discos piratas viraram ouro.', '{a} played {c} to crowds in tears; the bootlegs turned to gold.')); },
        miss: (f) => { f.mood('stress', 10).fans(3); return F(f, N('Em {c}, o censor cortou metade do repertório de {a}; o público cantou mesmo assim.', 'In {c}, the censor cut half of {a}\'s set; the crowd sang along anyway.')); } }] } },
    { id: 'negotiate', label: N('Negociar o repertório antes', 'Negotiate the set first'), hint: N('Mais segurança; fama menor.', 'Safer; less fame.'),
      c: { later: [{ in: [1, 4], p: 0.75, tone: 'good', hint: N('Combinado não sai caro.', 'Agreed terms cost less.'), fx: (f) => { f.fans(5).cash(1000, 'Turnê no Leste (convertido)', 'live'); return F(f, N('Repertório combinado em {c}: turnê tranquila para {a}.', 'An agreed set in {c}: a smooth tour for {a}.')); } }] } },
    { id: 'decline', label: N('Recusar', 'Decline'), hint: N('Nada agora.', 'Nothing now.'),
      c: { later: [{ in: [2, 8], p: 0.3, tone: 'mixed', hint: N('Outro ato pode ir.', 'Another act may go.'), fx: (f) => { f.momentum(-1); return F(f, N('Outro ato foi a {c} e voltou como herói da Guerra Fria.', 'Another act went to {c} and came back a Cold War hero.')); } }] } },
  ], 'eastbloc', 0.25);
}

// ================================================================ L. cena local chama (SCENES17/19)
const SCN = ['hamburg_beat', 'yeye_paris', 'kingston_rocksteady', 'kinshasa_rumba', 'cairo_golden', 'lagos_afrobeat', 'nuyorican_salsa', 'two_tone', 'rai_oran', 'movida', 'dunedin', 'berlin_techno'];
for (const id of SCN) {
  const sc = () => SCENES17.find((x) => x[0] === id);
  ev(`m19n_${id}`, 'scouting', 'good', 999, (s, r) => {
    const d = sc(); if (!d || s.year < d[3] || s.year > d[4] || !r.chance(0.04)) return null;
    const a = top(s); return a ? { act: a.id, city: d[1], genre: d[2] } : null;
  }, N('A cena de {genreName} chama em {cityName}', 'The {genreName} scene calls in {cityName}'),
  N('Em {cityName}, a cena de {genreName} ferve: clubes lotados, selos pequenos e talentos sem contrato. Dá para chegar antes dos grandes.', 'In {cityName}, the {genreName} scene is boiling: packed clubs, small labels and unsigned talent. You can get there before the majors.'), [
    { id: 'office', label: N('Abrir um escritório de A&R lá', 'Open an A&R office there'), hint: N('Custo; pistas de talento local.', 'Cost; local talent leads.'), apply: (s) => pay(s, `n_${id}`, 2500, 'admin', 'Escritório de A&R numa cena local'),
      c: { later: [{ in: [2, 8], p: 0.65, tone: 'good', hint: N('Quem chega primeiro escolhe.', 'First in gets to choose.'), fx: (f) => { f.rep('artistic', 2); addHype(f.s, `s:${String(f.c.city)}:${String(f.c.genre)}`, 'm19office', l('Escritório do selo', 'Label office'), 6); return F(f, N('O escritório do selo em {c} virou ponto de encontro da cena: o selo ouve tudo primeiro.', 'The label\'s office in {c} became the scene\'s hangout: the label hears everything first.')); } }] } },
    { id: 'night', label: N('Patrocinar uma noite no clube da cena', 'Sponsor a night at the scene\'s club'), hint: N('Barato; nome do selo na cena.', 'Cheap; the label\'s name in the scene.'), apply: (s) => pay(s, `nn_${id}`, 800, 'marketing', 'Noite patrocinada numa cena local'),
      c: { later: [{ in: [1, 4], p: 0.6, tone: 'good', hint: N('A noite pode virar lenda.', 'The night may become legend.'), fx: (f) => { f.fans(3); addHype(f.s, `s:${String(f.c.city)}:${String(f.c.genre)}`, 'm19night', l('Noite patrocinada', 'Sponsored night'), 4); return F(f, N('A noite do selo em {c} lotou e saiu nos fanzines.', 'The label\'s night in {c} sold out and made the fanzines.')); } }] } },
    { id: 'ignore', label: N('Deixar para os outros', 'Leave it to others'), hint: N('Nada agora.', 'Nothing now.'),
      c: { later: [{ in: [3, 9], p: 0.4, tone: 'mixed', hint: N('Um rival pode chegar antes.', 'A rival may get there first.'), fx: (f) => { f.rep('artistic', -1); return F(f, N('Um rival assinou os nomes da cena de {c} enquanto você olhava.', 'A rival signed the {c} scene\'s names while you watched.')); } }] } },
  ], 'scene', 0.4);
}

// ================================================================ M. capa de revista / matéria (OUTLETS19)
const OUTS = ['nme', 'rolling_stone', 'the_face', 'smash_hits', 'bravo', 'slc', 'oricon', 'filmfare', 'revista_radio', 'bizz', 'drum_za', 'pitchfork'];
for (const oid of OUTS) {
  const od = () => OUTLETS17.find((x) => x.id === oid);
  ev(`m19o_${oid}`, 'market', 'good', 18, (s, r) => {
    const d = od(); if (!d || s.year < d.from || s.year > d.to || (d.market !== 'global' && d.market !== homeMk19(s)) || !r.chance(0.04)) return null;
    const a = top(s, (x) => x.fame >= 30 && (!d.fav.length || d.fav.includes(familyOf(x.genre)))); return a ? { act: a.id, x: s.config.realNames && d.real ? d.real : d.name } : null;
  }, N('{x} quer {act} na capa', '{x} wants {act} on the cover'),
  N('A {x} oferece capa e entrevista longa com {act}. O repórter tem fama de arrancar frases que viram manchete — boas ou ruins.', '{x} offers {act} a cover and a long interview. The reporter is known for pulling quotes that become headlines — good or bad.'), [
    { id: 'cover', label: N('Topar a capa e a entrevista', 'Take the cover and interview'), hint: N('Fama e embalo; risco de frase infeliz.', 'Fame and momentum; risk of an unfortunate quote.'),
      c: { odds: (s) => ({ p: clamp(0.55 + s.player.reputation.artistic / 300, 0.5, 0.85), why: [N('Base 55% + reputação artística', 'Base 55% + artistic reputation')] }),
        later: [{ in: [1, 3], p: (s) => clamp(0.55 + s.player.reputation.artistic / 300, 0.5, 0.85), tone: 'mixed', hint: N('A capa pode consagrar ou queimar.', 'The cover may crown or burn.'),
          fx: (f) => { f.fame(3).momentum(5); return F(f, N('A capa da {x} com {a} esgotou nas bancas.', 'The {x} cover with {a} sold out at the newsstands.')); },
          miss: (f) => { f.trust(-4).momentum(2); return F(f, N('Uma frase de {a} na {x} saiu do contexto e virou polêmica.', 'A quote from {a} in {x} was taken out of context and became a controversy.')); } }] } },
    { id: 'ads', label: N('Fechar um pacote de anúncios junto', 'Bundle an ad package'), hint: N('Custo; espaço garantido.', 'Cost; guaranteed space.'), apply: (s) => pay(s, `o_${oid}`, 1200, 'marketing', 'Pacote de anúncios em revista'),
      c: { later: [{ in: [1, 3], p: 0.6, tone: 'mixed', hint: N('Espaço pago, leitor desconfiado.', 'Paid space, a suspicious reader.'), fx: (f) => { f.momentum(4); return F(f, N('O pacote na {x} deu a {a} o mês inteiro de vitrine.', 'The {x} package gave {a} a whole month in the window.')); },
        miss: (f) => { f.rep('artistic', -1); return F(f, N('Leitores da {x} notaram: "capa comprada" com {a}.', '{x} readers noticed: a "bought cover" with {a}.')); } }] } },
    { id: 'decline', label: N('Recusar', 'Decline'), hint: N('Nada agora; mística.', 'Nothing now; mystique.'),
      c: { later: [{ in: [2, 6], p: 0.3, tone: 'mixed', hint: N('Recusar também é notícia.', 'Declining is news too.'), fx: (f) => { f.rep('artistic', 1); return F(f, N('"{a} recusou a {x}": a recusa virou nota — e mística.', '"{a} turned down {x}": the refusal became a story — and mystique.')); } }] } },
  ], 'outlet');
}

// ================================================================ N. programa de TV/rádio (SHOWS19): ao vivo ou dublando
for (const sh of SHOWS19) {
  const show = (): Show19 => sh;
  ev(`m19w_${sh.id}`, 'market', 'good', 12, (s, r) => {
    const d = show(); if (s.year < d.from || s.year > d.to || !d.mk.includes(homeMk19(s)) || !r.chance(0.05)) return null;
    const a = top(s, (x) => x.fame >= 25 && famOk(x, d.fam)); return a ? { act: a.id, x: showName19(s, d) } : null;
  }, N('{act} convidado para o {x}', '{act} booked on {x}'),
  N('O {x} quer {act} no próximo programa. Ao vivo mostra quem sabe tocar; dublando é seguro — até o playback falhar.', '{x} wants {act} on the next show. Live shows who can really play; miming is safe — until the playback fails.'), [
    { id: 'live', label: N('Tocar ao vivo', 'Play live'), hint: N('Aposta: consagração ou desafinada em rede nacional.', 'A gamble: triumph or a bum note on national TV.'),
      c: { odds: (s, c) => ({ p: clamp(0.55 + (s.acts[String(c.act)]?.fame ?? 30) / 250, 0.5, 0.9), why: [N('Base 55% + fama (experiência de palco)', 'Base 55% + fame (stage experience)')] }),
        later: [{ in: [1, 2], p: (s, c) => clamp(0.55 + (s.acts[String(c.act)]?.fame ?? 30) / 250, 0.5, 0.9), tone: 'mixed', hint: N('Ao vivo não tem segunda chance.', 'Live has no second take.'),
          fx: (f) => { f.fame(3).fans(6); return F(f, N('{a} tocou ao vivo no {x} e virou assunto da semana.', '{a} played live on {x} and became the talk of the week.')); },
          miss: (f) => { f.mood('morale', -6).fame(-1); return F(f, N('{a} desafinou ao vivo no {x}; o vídeo não morre.', '{a} hit a bum note live on {x}; the clip never dies.')); } }] } },
    { id: 'mime', label: N('Dublar o playback', 'Mime to playback'), hint: N('Seguro agora; quem dubla sempre pode ser pego.', 'Safe now; whoever mimes can always get caught.'), apply: (s, _r, c) => { mimeRisk19(s, String(c.act), 4); },
      c: { later: [{ in: [1, 2], p: 0.75, tone: 'good', hint: N('Ninguém percebe — quase sempre.', 'No one notices — almost always.'), fx: (f) => { f.fame(2).fans(4); return F(f, N('{a} dublou impecável no {x}: milhões viram.', '{a} mimed flawlessly on {x}: millions watched.')); },
        miss: (f) => { f.fame(-1); if (f.act) mimeRisk19(f.s, f.act.id, 10); return F(f, N('O playback de {a} no {x} pulou: a câmera pegou a boca parada.', '{a}\'s playback on {x} skipped: the camera caught the mouth not moving.')); } }] } },
    { id: 'decline', label: N('Recusar', 'Decline'), hint: N('Nada agora.', 'Nothing now.'),
      c: { later: [{ in: [2, 6], p: 0.25, tone: 'mixed', hint: N('Outro ocupa o lugar.', 'Someone else takes the slot.'), fx: (f) => { f.momentum(-2); return F(f, N('Um rival ocupou o lugar de {a} no {x}.', 'A rival took {a}\'s slot on {x}.')); } }] } },
  ], 'show');
}

deferEvents<EventDef>(MEDIA19_EVENTS);
