// Rodada 27 (E2) — HISTÓRIA REAL COMO CARTÃO DE DECISÃO DA ÉPOCA. O inventário (r27) mostrou:
//   • 1942–44 proibição Petrillo (AFM): já jogável (world4 'w4_strike' + regions19 greves 1942/1948) — mantido;
//   • 1999 Napster: já jogável ('w4_napster': processar, licenciar, anticópia, baixar preço + ecos) — mantido;
//   • 1959 audiências do jabá (payola59): só texto + multa automática → vira cartão (abrir os livros, "consultoria"
//     de promotor independente, negar tudo);
//   • 1968 AI-5 (h19_tropicalia): cartão genérico de "crise" → cartão próprio só para quem tem pé no Brasil
//     (linguagem cifrada, bancar o exílio em Londres, jingles do "Brasil grande", censura prévia), ligado à censura
//     do society18 (CENSOR_ADJ18) até 1978 e com a conta do ufanismo cobrada na abertura (1985);
//   • 1979 Disco Demolition Night (disco_demolition): só texto + queda automática → cartão para quem tem ato de disco
//     (rebatizar como "dance", exportar para Europa/Brasil, largar a disco, ir para a pista subterrânea);
//   • 2008 streaming (h19_spotify): cartão genérico de "negócio" → cartão próprio (ações em troca do catálogo — com a
//     abertura de capital de 2018 —, janela de lançamento, ficar de fora, contrato padrão).
// Cada escolha: efeito agora, efeito que dura (estado `h27.st`), ecos escritos (decide18) e fato `real_history`
// (Diário + cartão "A história real" do history19). Sem sorteio próprio fora dos ecos.

import { clamp } from '../../core/rng';
import { cityById, familyOf, l, type L } from '../../data/world';
import { countryOfCity } from '../../data/geo';
import { registerConseq18 } from '../decide18';
import type { EventDef } from '../events';
import { deferEvents, registerDecisionListener, registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { scandal } from '../scandal17';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { hist19 } from './history19';
import { CENSOR_ADJ18, exileChoice18 } from './society18';
import { DISCO, MILESTONES } from './world4/milestones';
import { w4 } from './world4/state';

export type Stance27 = 'books' | 'consult' | 'deny' | 'code' | 'exile' | 'brasil' | 'submit' | 'rebrand' | 'export' | 'underground' | 'drop' | 'equity' | 'window' | 'refuse' | 'sign';
export interface H27State { st: Record<string, Stance27>; done: Record<string, number> }
declare module '../ext4' { interface Ext4 { h27: H27State } }
const init = (): H27State => ({ st: {}, done: {} });
registerExt4('h27', init);
export function h27(s: GameState): H27State {
  const x = s.x4 as unknown as { h27?: H27State };
  const st = (x.h27 ??= init());
  st.st ??= {}; st.done ??= {};
  return st;
}

const N = l;
const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && !a.deceased);
const inBR = (a: Act) => countryOfCity(a.city) === 'BRA';
const isDisco = (a: Act) => DISCO.includes(a.genre);
const pay = (s: GameState, k: string, real: number, cat: string, memo: string) => post(s, `h27:${k}:${s.week}`, -money(s, real), cat, memo);
const rep = (s: GameState, k: keyof GameState['player']['reputation'], v: number) => { s.player.reputation[k] = clamp(s.player.reputation[k] + v, 0, 100); };

// ---------------------------------------------------------------- cartões

export const EVS27: EventDef[] = [
  {
    id: 'h27_payola', cat: 'world', tone: 'bad', tags: ['history27'], cooldown: 999, forcedOnly: true,
    title: N('Audiências do jabá: os investigadores batem à porta', 'Payola hearings: investigators come knocking'),
    text: N('Novembro de 1959: o Congresso dos EUA abre audiências sobre o "jabá" — dinheiro e presentes a DJs para tocar discos. Um DJ famoso de Nova York é demitido; o apresentador de TV mais visto do país vende suas participações em gravadoras. A partir de 1960, pagar para tocar sem avisar o público vira crime. O que o selo faz com os próprios livros?',
      'November 1959: the US Congress opens hearings on "payola" — cash and gifts to DJs to spin records. A famous New York DJ is fired; the country\'s most-watched TV host sells his stakes in record companies. From 1960, paying for airplay without telling listeners becomes a crime. What does the label do with its own books?'),
    options: [
      { id: 'books', label: N('Abrir os livros e cooperar', 'Open the books and cooperate'), hint: N('Advogados agora; ficha limpa, os DJs esfriam com você.', 'Lawyers now; a clean record, DJs cool on you.'),
        apply: (s) => { pay(s, 'books', 1500, 'legal', 'Auditoria do jabá (cooperação)'); const p = w4(s).payola; p.heat = 0; p.level = 0; p.dj = Math.max(0, p.dj - 20); rep(s, 'institutional', 3); h27(s).st.payola = 'books'; } },
      { id: 'consult', label: N('Trocar o envelope por "consultoria" (promotor independente)', 'Swap the envelope for "consulting" (independent promoter)'), hint: N('Custa; o rádio continua seu, o risco muda de endereço.', 'Costs; radio stays yours, the risk changes address.'),
        apply: (s) => { pay(s, 'consult', 1000, 'marketing', 'Promotor independente (consultoria)'); const p = w4(s).payola; p.heat = Math.round(p.heat * 0.6); h27(s).st.payola = 'consult'; } },
      { id: 'deny', label: N('Negar tudo e esperar passar', 'Deny everything and wait it out'), hint: N('Nada agora. Se houve envelope, ele aparece.', 'Nothing now. If there was an envelope, it will surface.'),
        apply: (s) => { h27(s).st.payola = 'deny'; } },
    ],
  },
  {
    id: 'h27_ai5', cat: 'world', tone: 'bad', tags: ['history27'], cooldown: 999, forcedOnly: true,
    title: N('AI-5: a censura fecha o cerco', 'AI-5: censorship closes in'),
    text: N('13 de dezembro de 1968: o regime militar baixa o Ato Institucional nº 5. Toda letra passa pela censura federal, programas são tirados do ar e, em 1969, dois líderes da Tropicália são presos e partem para o exílio em Londres. {act} está na mira. Como o selo atravessa os anos de chumbo (até 1978)?',
      'December 13, 1968: Brazil\'s military regime issues Institutional Act No. 5. Every lyric goes through federal censors, shows are pulled off the air and, in 1969, two Tropicália leaders are jailed and leave for exile in London. {act} is in the crosshairs. How does the label get through the lead years (until 1978)?'),
    options: [
      { id: 'code', label: N('Linguagem cifrada: metáforas que passam no censor', 'Coded language: metaphors that slip past the censor'), hint: N('Censura um pouco menor; o público decifra (+5% no Brasil para o som de protesto). Uma metáfora pode ser decifrada.', 'Slightly less censorship; audiences decode it (+5% in Brazil for protest sounds). A metaphor may be decoded.'),
        apply: (s) => { h27(s).st.ai5 = 'code'; rep(s, 'artistic', 2); } },
      { id: 'exile', label: N('Bancar o exílio em Londres', 'Fund exile in London'), hint: N('Custo de mudança; o ato some de casa e cresce lá fora — volta herói quando o regime cair.', 'Moving costs; the act vanishes from home and grows abroad — returns a hero when the regime falls.'),
        apply: (s, r, c) => { pay(s, 'exile', 4000, 'misc', 'Exílio em Londres: passagens e moradia'); h27(s).st.ai5 = 'exile'; rep(s, 'artists', 3); if (c.act && s.acts[String(c.act)]) exileChoice18(s, String(c.act), cityById.london ? 'london' : 'paris', 'exile', r); } },
      { id: 'brasil', label: N('Cantar o "Brasil grande": jingles e festivais oficiais', 'Sing "Great Brazil": official jingles and festivals'), hint: N('Dinheiro do governo agora; artistas e crítica torcem o nariz — e a conta chega na abertura.', 'Government money now; artists and critics sneer — and the bill arrives with redemocratization.'),
        apply: (s) => { post(s, `h27:brasil:${s.week}`, money(s, 3000), 'other_income', 'Campanhas oficiais (jingles)'); h27(s).st.ai5 = 'brasil'; rep(s, 'institutional', 3); rep(s, 'artistic', -4); rep(s, 'artists', -3); } },
      { id: 'submit', label: N('Submeter tudo à censura prévia', 'Submit everything to prior censorship'), hint: N('Discos saem (bem menos vetos até 1978); o elenco se sente amordaçado.', 'Records come out (far fewer vetoes until 1978); the roster feels gagged.'),
        apply: (s) => { h27(s).st.ai5 = 'submit'; rep(s, 'artistic', -3); for (const a of mine(s)) if (inBR(a)) a.trust = clamp(a.trust - 4, 0, 100); } },
    ],
  },
  {
    id: 'h27_disco', cat: 'culture', tone: 'bad', tags: ['history27'], cooldown: 999, forcedOnly: true,
    title: N('"Disco sucks": a noite da demolição', '"Disco sucks": demolition night'),
    text: N('12 de julho de 1979, Chicago: entre dois jogos de beisebol, uma caixa de discos de disco music explode no gramado e a torcida invade o campo. Rádios trocam de formato, lojas devolvem estoque e "disco" vira palavrão nos EUA. {act} é do estilo. E agora?',
      'July 12, 1979, Chicago: between two baseball games a crate of disco records is blown up on the field and the crowd storms the pitch. Stations switch formats, stores return stock and "disco" becomes a dirty word in the US. {act} plays that style. Now what?'),
    options: [
      { id: 'rebrand', label: N('Rebatizar: "dance", "boogie", capa sem bola espelhada', 'Rebrand: "dance", "boogie", no mirror ball on the cover'), hint: N('Custo de reembalagem; seus atos de disco perdem bem menos até 1982.', 'Repackaging cost; your disco acts lose much less until 1982.'),
        apply: (s) => { pay(s, 'rebrand', 1500, 'marketing', 'Reembalagem: de disco para dance'); h27(s).st.disco = 'rebrand'; } },
      { id: 'export', label: N('Exportar: Europa e Brasil ainda dançam', 'Export: Europe and Brazil still dance'), hint: N('Custo de licenças; +15% de público em Europa/América Latina/Brasil e +6% nos discos com esses territórios até 1983.', 'Licensing cost; +15% audience in Europe/Latin America/Brazil and +6% on records in those territories until 1983.'),
        apply: (s) => { pay(s, 'export', 1000, 'marketing', 'Licenças de disco no exterior'); h27(s).st.disco = 'export'; } },
      { id: 'drop', label: N('Largar a disco: mudar o som do elenco', 'Drop disco: change the roster\'s sound'), hint: N('Reputação comercial +; os artistas de disco se sentem traídos.', 'Commercial reputation +; disco artists feel betrayed.'),
        apply: (s) => { h27(s).st.disco = 'drop'; rep(s, 'commercial', 1); for (const a of mine(s)) if (isDisco(a)) a.trust = clamp(a.trust - 8, 0, 100); } },
      { id: 'underground', label: N('Ir para a pista subterrânea: clubes, 12 polegadas e DJs', 'Go underground: clubs, 12-inches and DJs'), hint: N('Sem custo; o elenco agradece. O subterrâneo tem memória.', 'No cost; the roster is grateful. The underground has a long memory.'),
        apply: (s) => { h27(s).st.disco = 'underground'; rep(s, 'artistic', 2); for (const a of mine(s)) if (isDisco(a)) a.trust = clamp(a.trust + 4, 0, 100); } },
    ],
  },
  {
    id: 'h27_stream', cat: 'business', tone: 'neutral', tags: ['history27'], cooldown: 999, forcedOnly: true,
    title: N('O streaming pede o seu catálogo', 'Streaming asks for your catalog'),
    text: N('Outubro de 2008: um serviço sueco de streaming abre em alguns países da Europa. Para ter os discos, oferece às gravadoras adiantamentos e uma fatia da empresa. O download pago ainda cresce; a pirataria ainda manda. O que o selo assina?',
      'October 2008: a Swedish streaming service launches in a few European countries. To get the records it offers labels advances and a slice of the company. Paid downloads are still growing; piracy still rules. What does the label sign?'),
    options: [
      { id: 'equity', label: N('Licenciar o catálogo em troca de ações', 'License the catalog for equity'), hint: N('Pouco dinheiro agora; uma fatia da empresa (se ela abrir capital, vale muito).', 'Little cash now; a slice of the company (worth a lot if it goes public).'),
        apply: (s) => { post(s, `h27:equity:${s.week}`, money(s, 800), 'other_income', 'Streaming: adiantamento + ações'); h27(s).st.stream = 'equity'; } },
      { id: 'window', label: N('Janela: álbum novo primeiro nas lojas, streaming depois', 'Windowing: new albums in stores first, streaming later'), hint: N('Álbuns em formato físico +5% até 2013; singles −3% (fora das playlists).', 'Albums with physical formats +5% until 2013; singles −3% (off the playlists).'),
        apply: (s) => { h27(s).st.stream = 'window'; rep(s, 'artistic', 1); } },
      { id: 'refuse', label: N('Ficar de fora e brigar contra o "grátis"', 'Stay out and fight "free"'), hint: N('Puristas aplaudem; seus lançamentos perdem 5% até 2011 e você entra depois, com termos piores.', 'Purists applaud; your releases lose 5% until 2011 and you join later on worse terms.'),
        apply: (s) => { h27(s).st.stream = 'refuse'; rep(s, 'artistic', 1); rep(s, 'institutional', -1); } },
      { id: 'sign', label: N('Assinar o contrato padrão (adiantamento)', 'Sign the standard deal (advance)'), hint: N('Dinheiro agora, sem fatia da empresa.', 'Cash now, no slice of the company.'),
        apply: (s) => { post(s, `h27:sign:${s.week}`, money(s, 2000), 'other_income', 'Streaming: adiantamento de licença'); h27(s).st.stream = 'sign'; } },
    ],
  },
];
deferEvents<EventDef>(EVS27);

// ecos escritos à mão (decide18)
registerConseq18('ev:h27_payola:books', { later: [{ in: [3, 9], p: 0.6, tone: 'good', hint: N('Ficha limpa abre portas em Washington.', 'A clean record opens doors in Washington.'),
  fx: (f) => { f.rep('institutional', 2); return N('A comissão cita o selo como exemplo de transparência.', 'The committee cites the label as a model of transparency.'); } }] });
registerConseq18('ev:h27_payola:consult', { later: [{ in: [12, 30], p: 0.35, tone: 'bad', hint: N('A "consultoria" pode virar manchete.', 'The "consulting" may make headlines.'),
  fx: (f) => { f.cash(-4000, 'Multa: promoção independente era jabá', 'legal').rep('institutional', -3); return N('A imprensa descobre que a "consultoria" do selo era jabá com outro nome.', 'The press finds the label\'s "consulting" was payola by another name.'); } }] });
registerConseq18('ev:h27_payola:deny', { later: [{ in: [3, 12], p: (s) => (w4(s).payola.spent > 0 ? 0.55 : 0.1), tone: 'bad', hint: N('Se houve envelope, ele aparece.', 'If there was an envelope, it will surface.'),
  fx: (f) => { f.cash(-3000, 'Multa do jabá (negou e foi pego)', 'legal').rep('institutional', -2); return N('Um DJ depõe e mostra os envelopes do selo.', 'A DJ testifies and shows the label\'s envelopes.'); } }] });
registerConseq18('ev:h27_ai5:code', { later: [{ in: [4, 14], p: 0.35, tone: 'bad', hint: N('Um censor esperto pode decifrar.', 'A clever censor may decode it.'),
  fx: (f) => { f.trust(-3).mood('stress', 6); return N('O censor decifra uma metáfora e o disco é recolhido das lojas.', 'The censor decodes a metaphor and the record is pulled from stores.'); } }] });
registerConseq18('ev:h27_ai5:exile', { later: [{ in: [12, 30], p: 0.6, tone: 'good', hint: N('Disco de exílio pode virar cult.', 'An exile record may become a cult classic.'),
  fx: (f) => { f.fame(4).fans(5); return N('O disco gravado no exílio vira cult entre brasileiros e ingleses.', 'The record made in exile becomes a cult classic among Brazilians and Britons.'); } }] });
registerConseq18('ev:h27_ai5:brasil', { later: [{ in: [6, 18], p: 0.5, tone: 'bad', hint: N('Artistas lembram de quem cantou para o regime.', 'Artists remember who sang for the regime.'),
  fx: (f) => { f.rep('artists', -2); return N('Compositores recusam o selo: "chapa-branca".', 'Songwriters turn the label down: "a government lapdog".'); } }] });
registerConseq18('ev:h27_ai5:submit', { later: [{ in: [6, 18], p: 0.45, tone: 'mixed', hint: N('Sobrevive — mas a que preço?', 'It survives — but at what cost?'),
  fx: (f) => { f.mood('morale', -6); return N('O elenco grava discos mansos; o selo sobrevive, a crítica boceja.', 'The roster records tame albums; the label survives, critics yawn.'); } }] });
registerConseq18('ev:h27_disco:rebrand', { later: [{ in: [4, 12], p: 0.5, tone: 'good', hint: N('A pista não morreu — só mudou de nome.', 'The dance floor did not die — it changed its name.'),
  fx: (f) => { f.momentum(6); return N('"Dance music" toca nas mesmas pistas: o novo rótulo pegou.', '"Dance music" plays on the same floors: the new label stuck.'); } }] });
registerConseq18('ev:h27_disco:export', { later: [{ in: [6, 18], p: 0.55, tone: 'good', hint: N('Lá fora a bola espelhada ainda gira.', 'Abroad the mirror ball still spins.'),
  fx: (f) => { f.fans(6).cash(1500, 'Licenças de disco no exterior', 'licensing'); return N('As licenças na Europa e no Brasil pagam bem.', 'Licensing in Europe and Brazil pays well.'); } }] });
registerConseq18('ev:h27_disco:drop', { later: [{ in: [3, 10], p: 0.4, tone: 'bad', hint: N('Quem foi largado conta para os outros.', 'Whoever was dropped tells the others.'),
  fx: (f) => { f.rep('artists', -2); return N('Os artistas de disco reclamam que o selo os largou na primeira vaia.', 'Disco artists complain the label dumped them at the first boo.'); } }] });
registerConseq18('ev:h27_disco:underground', { later: [{ in: [36, 72], p: 0.5, tone: 'good', hint: N('O subterrâneo tem memória.', 'The underground has a long memory.'),
  fx: (f) => { f.fame(3).momentum(6); return N('A pista subterrânea vira house: os DJs lembram de quem segurou o som.', 'The underground floor turns into house: DJs remember who kept the sound alive.'); } }] });
registerConseq18('ev:h27_stream:equity', { later: [{ in: [12, 36], p: 0.5, tone: 'mixed', hint: N('Ações não pagam aluguel — por enquanto.', 'Shares do not pay rent — for now.'),
  fx: (f) => { f.rep('commercial', 1); return N('O serviço cresce; as ações do selo ainda não valem nada no caixa.', 'The service grows; the label\'s shares are still worth nothing in cash.'); } }] });
registerConseq18('ev:h27_stream:window', { later: [{ in: [12, 30], p: 0.4, tone: 'mixed', hint: N('Fã de vinil aplaude; fã de playlist esquece.', 'Vinyl fans cheer; playlist fans forget.'),
  fx: (f) => { f.rep('artistic', 1).momentum(-2); return N('A janela segura as lojas, mas a geração da playlist nem percebe o álbum.', 'Windowing props up stores, but the playlist generation barely notices the album.'); } }] });
registerConseq18('ev:h27_stream:refuse', { later: [{ in: [24, 40], p: 0.7, tone: 'bad', hint: N('Quem entra tarde aceita o que sobrou.', 'Latecomers take what is left.'),
  fx: (f) => { f.cash(-1500, 'Streaming: entrada tardia (termos piores)', 'misc'); return N('O selo entra no streaming tarde, com termos piores que os da concorrência.', 'The label joins streaming late, on worse terms than its rivals.'); } }] });
registerConseq18('ev:h27_stream:sign', { later: [{ in: [24, 60], p: 0.35, tone: 'mixed', hint: N('Adiantamento é dinheiro; fatia é futuro.', 'An advance is money; a stake is the future.'),
  fx: (f) => { f.rep('commercial', -1); return N('Os selos que pegaram ações riem por último.', 'The labels that took equity laugh last.'); } }] });

// ---------------------------------------------------------------- ligar aos marcos (cartão específico no lugar do genérico)

function bind(id: string, ev: string, ctx: (s: GameState) => Record<string, string | number> | null): void {
  const m = MILESTONES.find((x) => x.id === id);
  if (m) { m.event = ev; m.ctx = ctx; }
}
const topBy = (s: GameState, f: (a: Act) => boolean): Act | undefined => mine(s).filter(f).sort((a, b) => b.fame - a.fame || a.id.localeCompare(b.id))[0];
bind('payola59', 'h27_payola', (s) => (s.config.role === 'artist' && !mine(s).length ? null : {}));
bind('h19_tropicalia', 'h27_ai5', (s) => {
  const a = topBy(s, (x) => inBR(x) && ['brazil', 'rock', 'latin'].includes(familyOf(x.genre))) ?? topBy(s, inBR);
  if (a) return { act: a.id };
  const none: Record<string, string | number> = {};
  return countryOfCity(s.config.homeCity) === 'BRA' ? none : null;
});
bind('disco_demolition', 'h27_disco', (s) => { const a = topBy(s, isDisco); return a ? { act: a.id } : null; });
bind('h19_spotify', 'h27_stream', (s) => (s.config.role === 'artist' ? null : {}));

const H19_OF: Record<string, string> = { h27_ai5: 'h19_tropicalia', h27_stream: 'h19_spotify' };
registerDecisionListener('hist27', (s, eventId, opt) => {
  const ev = EVS27.find((e) => e.id === eventId);
  if (!ev) return;
  const o = ev.options.find((x) => x.id === opt);
  const pick = o?.label ?? l(opt, opt);
  if (H19_OF[eventId]) hist19(s).run[H19_OF[eventId]] = { y: s.year, opt, pick };
  emitFact(s, { kind: 'real_history', actors: ['player'], severity: 28, visibility: 'public', tags: ['history27', eventId, opt], src: 'hist27', text: fmtL(l('{t}: o selo escolheu "{o}".', '{t}: the label chose "{o}".'), { t: ev.title, o: pick }) });
});

// ---------------------------------------------------------------- efeitos que duram

CENSOR_ADJ18.push((s, _a, reg) => {
  const k = h27(s).st.ai5;
  if (!k || reg.id !== 'br' || s.year > 1978) return null;
  return k === 'submit' ? [l('Selo submete tudo à censura prévia', 'Label submits everything to prior censorship'), -0.15]
    : k === 'code' ? [l('Linguagem cifrada', 'Coded language'), -0.05]
      : k === 'brasil' ? [l('Selo amigo do regime', 'A regime-friendly label'), -0.08] : null;
});

/** fator de apelo de um lançamento do jogador pelas posturas históricas (pura; interface e teste) */
export function hist27Mult(s: GameState, a: Act, rel: { type: string; formats: string[]; territories: string[] }): { k: number; why: L } | null {
  const st = h27(s).st;
  if (st.disco === 'rebrand' && isDisco(a) && s.year <= 1982) return { k: 1.12, why: l('Disco rebatizada de "dance"', 'Disco rebranded as "dance"') };
  if (st.disco === 'export' && isDisco(a) && s.year <= 1983 && rel.territories.some((t) => t === 'eu' || t === 'br' || t === 'latam')) return { k: 1.06, why: l('Disco exportada (Europa e Brasil ainda dançam)', 'Disco exported (Europe and Brazil still dance)') };
  if (st.ai5 === 'code' && s.year <= 1978 && inBR(a) && ['brazil', 'rock', 'latin'].includes(familyOf(a.genre))) return { k: 1.05, why: l('Linguagem cifrada: o público decifra', 'Coded language: audiences decode it') };
  if (st.stream === 'window' && s.year <= 2013) {
    if (rel.type !== 'single' && rel.formats.some((f) => f === 'lp' || f === 'cd')) return { k: 1.05, why: l('Janela: álbum primeiro nas lojas', 'Windowing: album in stores first') };
    if (rel.type === 'single') return { k: 0.97, why: l('Janela: single fora das playlists', 'Windowing: single off the playlists') };
  }
  if (st.stream === 'refuse' && s.year >= 2009 && s.year <= 2011) return { k: 0.95, why: l('Fora do streaming', 'Off streaming') };
  return null;
}
registerMod('appeal', 'hist27', (s, v, c) => {
  const a = c.act, rel = c.release;
  if (!a || !rel || !(rel.owner === 'player' || a.playerBand)) return null;
  const m = hist27Mult(s, a, rel);
  return m ? { value: v * m.k, label: m.why } : null;
});
registerMod('cityDemand', 'hist27', (s, v, c) => {
  if (h27(s).st.disco !== 'export' || s.year > 1983 || !c.act || !isDisco(c.act) || !(c.act.owner === 'player' || c.act.playerBand) || !c.cityId) return null;
  const mk = cityById[c.cityId]?.market;
  return mk === 'eu' || mk === 'br' || mk === 'latam' ? { value: v * 1.15, label: l('Disco ainda dança aqui', 'Disco still dances here') } : null;
});

// contas que chegam anos depois: ações na abertura de capital (abril de 2018) e o ufanismo na abertura política (1985)
export function hist27Month(s: GameState): void {
  const st = h27(s);
  if (st.st.stream === 'equity' && !st.done.ipo && (s.year > 2018 || (s.year === 2018 && s.month >= 3))) {
    st.done.ipo = s.year;
    const n = Object.values(s.releases).filter((r) => r.owner === 'player').length;
    const real = clamp(3000 + n * 400, 3000, 60000);
    post(s, `h27:ipo:${s.week}`, money(s, real), 'asset_sales', 'Venda das ações do streaming (abertura de capital)');
    emitFact(s, { kind: 'real_history', actors: ['player'], severity: 40, visibility: 'public', tags: ['history27', 'h27_stream', 'ipo', 'good'], src: 'hist27',
      text: fmtL(l('Abril de 2018: o serviço de streaming abre capital em Nova York. As ações que o selo pegou em 2008 viram {v}.', 'April 2018: the streaming service lists in New York. The shares the label took in 2008 become {v}.'), { v: `$${Math.round(money(s, real) / 100).toLocaleString('en-US')}` }) });
  }
  if (st.st.ai5 === 'brasil' && !st.done.abertura && s.year >= 1985) {
    st.done.abertura = s.year;
    rep(s, 'artists', -3);
    const a = mine(s).filter(inBR).sort((x, y) => y.fame - x.fame)[0];
    const t = l('Com a abertura, a imprensa lembra dos jingles do selo para o regime.', 'With redemocratization, the press recalls the label\'s jingles for the regime.');
    if (a) scandal(s, a.id, 'politics', 40, t, { tags: ['history27'] });
    else emitFact(s, { kind: 'real_history', actors: ['player'], severity: 35, visibility: 'public', tags: ['history27', 'h27_ai5', 'bad'], src: 'hist27', text: t });
  }
}
registerSimHook('month', 'hist27', (s) => hist27Month(s));

