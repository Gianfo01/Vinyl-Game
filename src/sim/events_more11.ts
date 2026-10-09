// Eventos da rodada 11: escândalos, rompimentos, rixas, saúde e crises criativas de artistas; momentos virais;
// negócios do selo; e indústria/mundo por época (payola de promotores, guerras de formato, pirataria só depois
// do P2P, viralização só depois das redes). Mesmas regras de events_more.ts: find() só lê; a ÚLTIMA opção é a
// mais neutra (padrão e aplicada quando o evento é filtrado); tags sensíveis sempre com `act` no contexto.
// Registrados no mesmo diretor de histórias (EVENTS de events.ts): a frequência mensal é a do diretor, então
// mais eventos diluem o sorteio em vez de aumentar o volume; cada um ainda tem cooldown próprio.

import type { EventDef } from './events';
import { clamp, type Rng } from '../core/rng';
import { censorshipIn, platformsIn, type PlatformType } from '../data/content';
import type { Act, GameState, Person } from './types';
import { hasTech } from './util';
import { EH } from './events_more';

const {
  o, E, noop, pick, crew, fam, mkt, era, myRels, isLabel, active, traitIn, ambitionIn, lead,
  A, P, pay, gain, rep, fame, mom, trust, fans, fansMul, mood, pmood, hiatus, legal, winOdds, split, feeBy, log, appeal, latestRel, signal,
} = EH;

// ---------- leitura de estado ----------
const plat = (s: GameState, t: PlatformType) => platformsIn(s.year).some((p) => p.type === t && p.launch <= s.year);
const who = (s: GameState, a: Act, f: (p: Person) => boolean): Person | undefined => crew(s, a).find(f);
const label = (s: GameState) => isLabel(s);
// rivais famosos (não do jogador): cache por semana, o diretor chama find() várias vezes por mês
let starCache: { s: GameState; week: number; ids: string[] } | null = null;
const stars = (s: GameState): string[] => {
  if (!starCache || starCache.s !== s || starCache.week !== s.week) {
    const ids: string[] = [];
    for (const a of Object.values(s.acts)) if (!a.playerBand && a.owner !== 'player' && a.fame > 35 && (a.status === 'active' || a.status === 'emerging') && !a.deceased) ids.push(a.id);
    starCache = { s, week: s.week, ids };
  }
  return starCache.ids;
};
const star = (s: GameState, r: Rng, f: (a: Act) => boolean = () => true): Act | undefined => {
  const list = stars(s).map((id) => s.acts[id]).filter((a) => a && f(a));
  return list.length ? r.pick(list) : undefined;
};
const cash = (s: GameState) => s.player.cash;
const img = (a: Act, k: 'artistic' | 'popularity' | 'professionalism' | 'publicImage', v: number) => { if (a.image) a.image[k] = clamp(a.image[k] + v, 0, 100); };
const scandal = (a: Act) => { a.scandals += 1; };

// =====================================================================================
// 1. ARTISTAS: escândalos, saúde, rixas, rompimentos, crises criativas
// =====================================================================================
const ARTISTS: EventDef[] = [
  E('r11_drunk_tv', 'scandal', 'bad', ['drugs', 'controversy'], 18,
    (s, r) => {
      if (!hasTech(s, 'tv_music') && s.year < 1950) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 20 && (traitIn(s, x, 'impulsive') || traitIn(s, x, 'spendthrift') || traitIn(s, x, 'controversial')));
      const p = a && lead(s, a);
      return a && p && r.chance(0.25) ? { act: a.id, person: p.id } : null;
    },
    ['{person} bêbado ao vivo', '{person} drunk on live TV'],
    ['{person} ({act}) chegou ao programa de auditório trocando as pernas, xingou o apresentador e derrubou o microfone. O país inteiro viu.', '{person} ({act}) arrived at the variety show stumbling, swore at the host and knocked over the mic. The whole country saw it.'],
    [
      o('rehab', 'Nota pública e internação discreta', 'Public statement and quiet rehab', (s, _r, c) => { const a = A(s, c); pay(s, `r11rehab:${a.id}`, 4000, 'artist_dev', 'Clínica'); hiatus(s, a, 6); pmood(P(s, c), 'stress', -25); trust(a, 5); rep(s, 'institutional', 1); }, ['Custo e pausa; imagem se recupera.', 'Cost and a break; image recovers.']),
      o('spin', 'Vender como "rock\'n\'roll de verdade"', 'Spin it as "real rock\'n\'roll"', (s, r, c) => { const a = A(s, c); scandal(a); if (r.chance(0.5)) { fame(a, 4); fans(a, 15000, 2000); } else { rep(s, 'institutional', -5); img(a, 'publicImage', -10); } }, ['Aposta: notoriedade ou vexame.', 'Gamble: notoriety or disgrace.']),
      o('nothing', 'Não comentar', 'No comment', (s, _r, c) => { const a = A(s, c); scandal(a); img(a, 'professionalism', -6); mom(a, -3); }),
    ]),
  E('r11_hotel_trash', 'scandal', 'bad', ['controversy'], 16,
    (s, r) => {
      if (!era(s, 1958, 2012)) return null;
      const a = pick(s, r, (x) => active(x) && ['rock', 'hiphop'].includes(fam(x)) && x.fame > 15);
      return a && r.chance(0.25) ? { act: a.id, amount: Math.round(2500 + a.fame * 60) } : null;
    },
    ['{act} destrói quarto de hotel', '{act} trashes a hotel room'],
    ['A televisão saiu pela janela, o colchão foi parar na piscina. O hotel cobra {amountTxt} e ameaça banir a banda da rede inteira.', 'The TV went out the window, the mattress ended up in the pool. The hotel bills {amountTxt} and threatens to ban the band chain-wide.'],
    [
      o('pay', 'Pagar e abafar', 'Pay and hush it up', (s, _r, c) => { pay(s, `r11hotel:${c.act}`, Number(c.amount), 'touring', 'Danos de hotel'); }),
      o('charge', 'Cobrar da banda (desconta dos royalties)', 'Charge the band (recoup from royalties)', (s, _r, c) => { const a = A(s, c); a.cash -= Math.round(Number(c.amount) * 100); trust(a, -6); mood(s, a, 'resentment', 6); }, ['Sem custo ao selo; a banda se ressente.', 'No label cost; the band resents it.']),
      o('legend', 'Deixar vazar: lenda do rock', 'Let it leak: rock legend', (s, _r, c) => { const a = A(s, c); pay(s, `r11hotel:${c.act}`, Number(c.amount), 'touring', 'Danos de hotel'); fame(a, 2); fans(a, 8000, 1500, 200); scandal(a); rep(s, 'institutional', -3); }),
    ]),
  E('r11_border_bust', 'scandal', 'bad', ['drugs', 'crime'], 30,
    (s, r) => {
      if (s.year < 1955) return null;
      const a = pick(s, r, (x) => active(x) && crew(s, x).some((p) => p.health === 'addiction' || p.traits.includes('impulsive')));
      const p = a && who(s, a, (m) => m.health === 'addiction' || m.traits.includes('impulsive'));
      return a && p && r.chance(0.2) ? { act: a.id, person: p.id, fee: legal(s, 8000) } : null;
    },
    ['{person} preso na alfândega', '{person} arrested at customs'],
    ['Cães farejadores acharam algo na mala de {person} ({act}) no aeroporto. A turnê internacional está suspensa; o advogado pede {feeTxt}.', 'Sniffer dogs found something in {person}\'s ({act}) bag at the airport. The international tour is suspended; the lawyer asks {feeTxt}.'],
    [
      o('lawyer', 'Contratar o advogado', 'Hire the lawyer', (s, r, c) => { const a = A(s, c); pay(s, `r11bust:${c.person}`, Number(c.fee), 'legal', 'Defesa criminal'); if (r.chance(winOdds(s, 0.55))) { log(s, 'bust', '{p} é solto e a turnê retoma.', '{p} is released and the tour resumes.', { p: P(s, c).name }, a.id); } else { hiatus(s, a, 10); scandal(a); } }, ['A equipe jurídica aumenta as chances.', 'Legal staff improves the odds.']),
      o('drop_tour', 'Cancelar a turnê e cuidar da pessoa', 'Cancel the tour and look after them', (s, _r, c) => { const a = A(s, c); hiatus(s, a, 8); trust(a, 8); const p = P(s, c); if (p) p.health = 'recovering'; mom(a, -6); }),
      o('distance', 'Distanciar o selo do caso', 'Distance the label from the case', (s, _r, c) => { const a = A(s, c); hiatus(s, a, 12); scandal(a); trust(a, -15); rep(s, 'artists', -3); }),
    ]),
  E('r11_secret_marriage', 'scandal', 'neutral', [], 24,
    (s, r) => {
      if (!era(s, 1950, 2015)) return null;
      const a = pick(s, r, (x) => active(x) && fam(x) === 'pop' && x.fame > 25 && x.positioning > 50);
      const p = a && lead(s, a);
      return a && p && r.chance(0.2) ? { act: a.id, person: p.id } : null;
    },
    ['O ídolo casou escondido', 'The idol married in secret'],
    ['Uma revista descobriu que {person}, de {act}, casou-se há um ano. O fã-clube adolescente está em choque.', 'A magazine found out {person} of {act} married a year ago. The teenage fan club is in shock.'],
    [
      o('own', 'Assumir com uma sessão de fotos do casal', 'Own it with a couple photoshoot', (s, _r, c) => { const a = A(s, c); fansMul(a, 0.88, 1, 1.03); img(a, 'publicImage', 5); fame(a, 1); trust(a, 4); }, ['Perde fãs casuais; ganha maturidade.', 'Loses casual fans; gains maturity.']),
      o('deny', 'Negar até o fim', 'Deny it to the end', (s, r, c) => { const a = A(s, c); if (r.chance(0.5)) { scandal(a); fansMul(a, 0.8, 0.9); rep(s, 'institutional', -3); } trust(a, -6); }, ['Se provarem, o tombo é maior.', 'If proven, the fall is harder.']),
      o('wait', 'Deixar o artista decidir', 'Let the artist decide', (s, _r, c) => { const a = A(s, c); fansMul(a, 0.93); trust(a, 3); }),
    ]),
  E('r11_band_romance_split', 'band', 'bad', [], 20,
    (s, r) => {
      const a = pick(s, r, (x) => active(x) && x.members.length >= 2 && x.members.length <= 6);
      if (!a || !r.chance(0.18)) return null;
      const [p1, p2] = crew(s, a);
      return p1 && p2 ? { act: a.id, person: p1.id, partner: p2.id, partnerName: p2.name } : null;
    },
    ['Fim de romance dentro de {act}', 'Breakup inside {act}'],
    ['{person} e {partnerName} namoravam em segredo havia anos. Terminaram ontem e agora precisam dividir o palco, o ônibus e o estúdio.', '{person} and {partnerName} had been secretly dating for years. They split yesterday and now must share the stage, the bus and the studio.'],
    [
      o('album', 'Transformar a dor num disco (e pagar terapia)', 'Turn the pain into a record (and pay for therapy)', (s, _r, c) => { const a = A(s, c); pay(s, `r11rom:${a.id}`, 1800, 'artist_dev', 'Terapia de grupo'); mood(s, a, 'inspiration', 25); mood(s, a, 'stress', 10); log(s, 'romance', 'O rompimento em {a} vira matéria-prima de um disco.', 'The breakup in {a} becomes raw material for a record.', { a: a.name }, a.id); }, ['Inspiração alta, clima tenso (≈ Rumours).', 'High inspiration, tense mood (≈ Rumours).']),
      o('pause', 'Dar três meses de pausa', 'Give a three-month break', (s, _r, c) => { const a = A(s, c); hiatus(s, a, 13); mood(s, a, 'stress', -20); mom(a, -5); }),
      o('carry', 'Seguir a agenda', 'Carry on with the schedule', (s, _r, c) => { const a = A(s, c); mood(s, a, 'resentment', 12); mood(s, a, 'morale', -10); }),
    ]),
  E('r11_diss_track', 'scandal', 'neutral', ['controversy'], 14,
    (s, r) => {
      if (s.year < 1984) return null;
      const a = pick(s, r, (x) => active(x) && fam(x) === 'hiphop' && x.fame > 10);
      const b = a && star(s, r, (y) => fam(y) === 'hiphop' && y.id !== a.id);
      return a && b && r.chance(0.3) ? { act: a.id, other: b.id } : null;
    },
    ['{otherName} lança diss contra {act}', '{otherName} drops a diss track on {act}'],
    ['A faixa nova de {otherName} cita {act} pelo nome e zomba das vendas. As rádios e a internet esperam a resposta.', '{otherName}\'s new track names {act} and mocks their sales. Radio and the internet await the answer.'],
    [
      o('answer', 'Responder com uma faixa melhor', 'Answer with a better track', (s, r, c) => { const a = A(s, c); const skill = crew(s, a).reduce((t, p) => t + p.skills.comp, 0) / Math.max(1, crew(s, a).length); if (r.chance(clamp(skill / 100 + 0.15, 0.2, 0.8))) { fame(a, 5); fans(a, 30000, 5000, 600); mom(a, 10); log(s, 'diss', '{a} vence a guerra de diss.', '{a} wins the diss war.', { a: a.name }, a.id); } else { fame(a, 1); mood(s, a, 'morale', -10); img(a, 'popularity', -4); } }, ['Composição decide quem vence.', 'Songwriting decides who wins.']),
      o('peace', 'Propor trégua num feat', 'Offer a truce on a feature', (s, _r, c) => { const a = A(s, c); fame(a, 2); fans(a, 10000, 1500); const b = s.acts[String(c.other)]; if (b) b.fame = clamp(b.fame + 1, 0, 100); }),
      o('ignore', 'Ignorar', 'Ignore it', (s, _r, c) => { const a = A(s, c); mom(a, -3); }),
    ]),
  E('r11_award_rant', 'scandal', 'neutral', ['controversy'], 24,
    (s, r) => {
      if (!label(s) || s.year < 1960) return null;
      const a = pick(s, r, (x) => active(x) && x.awards > 0 && x.trust < 45);
      return a && r.chance(0.35) ? { act: a.id } : null;
    },
    ['{act} ataca o selo no palco do prêmio', '{act} attacks the label at the awards'],
    ['Ao receber a estatueta, {act} agradeceu aos fãs e chamou o seu selo de "ladrões de terno". A plateia aplaudiu de pé.', 'Accepting the trophy, {act} thanked the fans and called your label "thieves in suits". The room gave a standing ovation.'],
    [
      o('renegotiate', 'Chamar para renegociar royalties', 'Invite them to renegotiate royalties', (s, _r, c) => { const a = A(s, c); trust(a, 15); pay(s, `r11rant:${a.id}`, 3000, 'artist_dev', 'Bônus de royalties'); rep(s, 'artists', 3); }, ['Custo; confiança volta.', 'Cost; trust comes back.']),
      o('reply', 'Responder na imprensa', 'Respond in the press', (s, _r, c) => { const a = A(s, c); trust(a, -10); rep(s, 'artists', -4); rep(s, 'commercial', 1); }),
      o('silence', 'Engolir em silêncio', 'Swallow it in silence', (s) => { rep(s, 'institutional', -2); }),
    ]),
  E('r11_tinnitus', 'health', 'bad', ['health'], 30,
    (s, r) => {
      if (s.year < 1960) return null;
      const a = pick(s, r, (x) => active(x) && ['rock', 'electronic', 'hiphop'].includes(fam(x)));
      const p = a && who(s, a, (m) => m.role === 'drums' || m.role === 'guitar' || m.role === 'dj' || m.fatigue > 60);
      return a && p && r.chance(0.15) ? { act: a.id, person: p.id } : null;
    },
    ['Zumbido no ouvido de {person}', 'Tinnitus for {person}'],
    ['Anos de amplificador no talo cobraram a conta: {person} ({act}) ouve um apito constante e o médico fala em perda auditiva.', 'Years of cranked amps sent the bill: {person} ({act}) hears a constant whistle and the doctor talks of hearing loss.'],
    [
      o('protect', 'Monitores intra-auriculares e menos shows', 'In-ear monitors and fewer shows', (s, _r, c) => { const a = A(s, c); pay(s, `r11ear:${c.person}`, 2200, 'artist_dev', 'Monitores auriculares'); pmood(P(s, c), 'stress', -10); a.gigSat = (a.gigSat ?? 0) + 0.1; trust(a, 3); }),
      o('awareness', 'Fazer campanha de prevenção', 'Run an awareness campaign', (s, _r, c) => { const a = A(s, c); pay(s, `r11ear:${c.person}`, 1200, 'marketing', 'Campanha'); img(a, 'publicImage', 6); rep(s, 'institutional', 2); }),
      o('ignore', 'Seguir tocando alto', 'Keep playing loud', (s, _r, c) => { const p = P(s, c); if (p) { p.skills.stage = Math.max(5, p.skills.stage - 4); pmood(p, 'stress', 10); } }),
    ]),
  E('r11_hand_injury', 'health', 'bad', ['health'], 24,
    (s, r) => {
      const a = pick(s, r, (x) => active(x));
      const p = a && who(s, a, (m) => ['guitar', 'keys', 'bass', 'strings', 'drums'].includes(m.role));
      return a && p && r.chance(0.12) ? { act: a.id, person: p.id } : null;
    },
    ['{person} machuca a mão', '{person} injures their hand'],
    ['Uma porta de van, um tombo bobo: {person} ({act}) fraturou dois dedos às vésperas da temporada.', 'A van door, a silly fall: {person} ({act}) broke two fingers on the eve of the season.'],
    [
      o('sub', 'Contratar músico substituto', 'Hire a session substitute', (s, _r, c) => { const a = A(s, c); pay(s, `r11sub:${a.id}`, 1500, 'touring', 'Músico substituto'); mood(s, a, 'morale', -3); pmood(P(s, c), 'resentment', 6); }),
      o('rest', 'Parar até sarar', 'Stop until it heals', (s, _r, c) => { const a = A(s, c); hiatus(s, a, 7); trust(a, 4); }),
      o('play', 'Tocar com a mão enfaixada', 'Play with a bandaged hand', (s, r, c) => { const p = P(s, c); if (p && r.chance(0.4)) p.skills.instr = Math.max(5, p.skills.instr - 6); const a = A(s, c); fans(a, 3000, 600, 80); }),
    ]),
  E('r11_stage_fright', 'health', 'bad', ['health'], 18,
    (s, r) => {
      const a = pick(s, r, (x) => active(x) && x.fame > 25);
      const p = a && who(s, a, (m) => (m.traits.includes('anxious') || m.traits.includes('insecure') || m.traits.includes('shy')) && m.stress > 45);
      return a && p && r.chance(0.3) ? { act: a.id, person: p.id } : null;
    },
    ['Pânico de palco: {person}', 'Stage fright: {person}'],
    ['Quanto maior o público, pior: {person} ({act}) vomita antes de cada show e travou no meio da última música.', 'The bigger the crowd, the worse: {person} ({act}) throws up before every show and froze in the middle of the last song.'],
    [
      o('coach', 'Terapia e preparador de palco', 'Therapy and a stage coach', (s, _r, c) => { pay(s, `r11fright:${c.person}`, 2000, 'artist_dev', 'Preparação'); const p = P(s, c); if (p) { pmood(p, 'stress', -25); p.skills.stage = clamp(p.skills.stage + 3, 0, 100); } }),
      o('studio', 'Virar banda de estúdio por um tempo', 'Become a studio band for a while', (s, _r, c) => { const a = A(s, c); hiatus(s, a, 10); mood(s, a, 'inspiration', 15); mom(a, -6); }, ['Menos shows; mais canções.', 'Fewer shows; more songs.']),
      o('push', 'Seguir em frente', 'Push through', (s, _r, c) => { pmood(P(s, c), 'stress', 12); pmood(P(s, c), 'morale', -8); }),
    ]),
  E('r11_deadline_block', 'band', 'bad', [], 14,
    (s, r) => {
      const a = pick(s, r, (x) => active(x) && crew(s, x).every((p) => p.inspiration < 30) && (traitIn(s, x, 'blocked') || traitIn(s, x, 'perfectionist') || x.fame > 40));
      return a && r.chance(0.35) ? { act: a.id } : null;
    },
    ['{act} não consegue terminar o disco', '{act} cannot finish the record'],
    ['O prazo venceu. {act} tem três canções, nenhuma pronta, e o estúdio cobra por dia.', 'The deadline passed. {act} has three songs, none finished, and the studio charges by the day.'],
    [
      o('cowriters', 'Trazer compositores profissionais', 'Bring in pro songwriters', (s, _r, c) => { const a = A(s, c); pay(s, `r11cow:${a.id}`, 2500, 'production', 'Compositores'); mood(s, a, 'inspiration', 20); if (ambitionIn(s, a, 'art') || ambitionIn(s, a, 'critics')) trust(a, -6); }, ['Resolve rápido; artistas puristas detestam.', 'Fixes it fast; purist artists hate it.']),
      o('retreat', 'Mandar a banda para um sítio isolado', 'Send the band to a remote farmhouse', (s, _r, c) => { const a = A(s, c); pay(s, `r11ret:${a.id}`, 1600, 'production', 'Retiro criativo'); hiatus(s, a, 6); mood(s, a, 'inspiration', 35); mood(s, a, 'stress', -15); }),
      o('wait', 'Esperar a inspiração', 'Wait for inspiration', (s, _r, c) => { const a = A(s, c); mom(a, -4); mood(s, a, 'inspiration', 8); }),
    ]),
  E('r11_double_album_obsession', 'band', 'neutral', [], 30,
    (s, r) => {
      if (s.year < 1966) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 30 && (traitIn(s, x, 'perfectionist') || traitIn(s, x, 'experimental') || ambitionIn(s, x, 'legacy')));
      return a && r.chance(0.25) ? { act: a.id } : null;
    },
    ['{act} quer um disco duplo conceitual', '{act} wants a conceptual double album'],
    ['{act} apresentou um plano: uma ópera em quatro lados, orquestra, coral e dois anos de estúdio. "Vai mudar tudo", dizem.', '{act} pitched a plan: a four-sided opera, orchestra, choir and two years in the studio. "It will change everything," they say.'],
    [
      o('fund', 'Bancar a obra-prima', 'Fund the masterpiece', (s, r, c) => { const a = A(s, c); pay(s, `r11opus:${a.id}`, 9000, 'production', 'Disco duplo'); mood(s, a, 'inspiration', 30); trust(a, 10); if (r.chance(0.45)) { rep(s, 'artistic', 5); fame(a, 4); log(s, 'opus', '{a} entrega um disco duplo celebrado pela crítica.', '{a} delivers a critically adored double album.', { a: a.name }, a.id, true); } else { mom(a, -8); } }, ['Caro; pode virar clássico ou elefante branco.', 'Expensive; may become a classic or a white elephant.']),
      o('trim', 'Aprovar um disco simples com o melhor', 'Approve a single album with the best bits', (s, _r, c) => { const a = A(s, c); mood(s, a, 'inspiration', 10); trust(a, -3); }),
      o('refuse', 'Recusar', 'Refuse', (s, _r, c) => { const a = A(s, c); trust(a, -8); mood(s, a, 'morale', -6); }),
    ]),
  E('r11_sellout', 'culture', 'bad', [], 18,
    (s, r) => {
      const a = pick(s, r, (x) => active(x) && x.positioning > 70 && x.fans.core > 2000);
      return a && r.chance(0.25) ? { act: a.id } : null;
    },
    ['"Vendidos!": núcleo de fãs se revolta', '"Sellouts!": core fans revolt'],
    ['Os fãs antigos de {act} queimam camisetas na porta do show. Dizem que a banda trocou a alma por rádio e comercial.', '{act}\'s old fans burn T-shirts outside the gig. They say the band traded its soul for radio and ads.'],
    [
      o('club_show', 'Show surpresa num clube pequeno', 'Surprise show at a small club', (s, _r, c) => { const a = A(s, c); fans(a, 0, 800, 600); a.positioning = clamp(a.positioning - 8, 0, 100); mood(s, a, 'morale', 6); }),
      o('embrace', 'Abraçar o pop sem culpa', 'Embrace pop without guilt', (s, _r, c) => { const a = A(s, c); fansMul(a, 1.08, 1, 0.8); a.positioning = clamp(a.positioning + 6, 0, 100); }),
      o('ignore', 'Ignorar', 'Ignore', (s, _r, c) => { const a = A(s, c); fansMul(a, 1, 0.97, 0.9); }),
    ]),
  E('r11_ghostwriter', 'scandal', 'bad', ['controversy'], 24,
    (s, r) => {
      if (s.year < 1975) return null;
      const a = pick(s, r, (x) => active(x) && ['hiphop', 'pop', 'rnb'].includes(fam(x)) && x.fame > 30 && x.hits > 0);
      return a && r.chance(0.18) ? { act: a.id, fee: feeBy(a, 2000, 60, 9000) } : null;
    },
    ['O ghostwriter de {act} abre a boca', '{act}\'s ghostwriter speaks out'],
    ['Um compositor diz numa entrevista que escreveu os maiores hits de {act} e nunca recebeu crédito. Pede {feeTxt} e o nome na capa.', 'A songwriter says in an interview that they wrote {act}\'s biggest hits and never got credit. They ask {feeTxt} and their name on the sleeve.'],
    [
      o('credit', 'Dar crédito e pagar', 'Credit and pay them', (s, _r, c) => { const a = A(s, c); pay(s, `r11ghost:${a.id}`, Number(c.fee), 'publishing', 'Acordo de autoria'); img(a, 'artistic', -5); rep(s, 'artists', 2); }),
      o('fight', 'Contestar na Justiça', 'Fight it in court', (s, r, c) => { const a = A(s, c); pay(s, `r11ghostl:${a.id}`, legal(s, 4000), 'legal', 'Processo de autoria'); if (!r.chance(winOdds(s, 0.45))) { pay(s, `r11ghostd:${a.id}`, Number(c.fee) * 2, 'legal', 'Indenização'); scandal(a); img(a, 'artistic', -12); } }),
      o('deny', 'Negar e seguir', 'Deny and move on', (s, _r, c) => { const a = A(s, c); scandal(a); img(a, 'artistic', -8); rep(s, 'artists', -2); }),
    ]),
  E('r11_lipsync', 'scandal', 'bad', ['controversy'], 24,
    (s, r) => {
      if (s.year < 1962) return null;
      const a = pick(s, r, (x) => active(x) && ['pop', 'rnb', 'electronic'].includes(fam(x)) && x.fame > 25);
      return a && r.chance(0.18) ? { act: a.id } : null;
    },
    ['Playback desmascarado: {act}', 'Lip-sync exposed: {act}'],
    ['O som travou no meio do programa ao vivo e o refrão de {act} ficou repetindo enquanto ninguém mexia a boca.', 'The tape skipped mid live show and {act}\'s chorus kept looping while nobody moved their lips.'],
    [
      o('live_tour', 'Provar ao vivo: turnê sem playback', 'Prove it: a no-playback tour', (s, r, c) => { const a = A(s, c); pay(s, `r11live:${a.id}`, 2000, 'touring', 'Ensaios extras'); mood(s, a, 'fatigue', 15); if (r.chance(0.6)) { img(a, 'artistic', 8); fame(a, 2); } else { scandal(a); fansMul(a, 0.9); } }),
      o('joke', 'Rir de si mesmo na TV', 'Laugh at yourselves on TV', (s, _r, c) => { const a = A(s, c); img(a, 'publicImage', 3); img(a, 'artistic', -4); }),
      o('blame', 'Culpar o técnico de som', 'Blame the sound tech', (s, _r, c) => { const a = A(s, c); scandal(a); img(a, 'artistic', -10); fansMul(a, 0.93); }),
    ]),
  E('r11_charity_scandal', 'scandal', 'bad', ['controversy'], 30,
    (s, r) => {
      if (s.year < 1970) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 35 && (traitIn(s, x, 'engaged') || traitIn(s, x, 'big_ego')));
      return a && r.chance(0.15) ? { act: a.id } : null;
    },
    ['A fundação de {act} sob suspeita', '{act}\'s foundation under suspicion'],
    ['Auditores dizem que só 12% das doações à fundação de {act} chegaram a alguém. O resto virou jatinho e festa.', 'Auditors say only 12% of donations to {act}\'s foundation reached anyone. The rest became private jets and parties.'],
    [
      o('repay', 'Devolver tudo e abrir as contas', 'Repay everything and open the books', (s, _r, c) => { const a = A(s, c); pay(s, `r11char:${a.id}`, 5000, 'legal', 'Ressarcimento'); img(a, 'publicImage', -4); rep(s, 'institutional', 2); }),
      o('blame_manager', 'Culpar o administrador', 'Blame the administrator', (s, r, c) => { const a = A(s, c); if (r.chance(0.5)) img(a, 'publicImage', -3); else { scandal(a); img(a, 'publicImage', -14); fansMul(a, 0.9, 0.95); } }),
      o('quiet', 'Esperar a poeira baixar', 'Wait for the dust to settle', (s, _r, c) => { const a = A(s, c); scandal(a); img(a, 'publicImage', -10); rep(s, 'institutional', -3); }),
    ]),
  E('r11_artist_tax', 'business', 'bad', [], 30,
    (s, r) => {
      if (s.year < 1935) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 30 && traitIn(s, x, 'spendthrift'));
      return a && r.chance(0.25) ? { act: a.id, amount: feeBy(a, 4000, 120, 20000) } : null;
    },
    ['Receita federal cobra {act}', 'Tax authority goes after {act}'],
    ['{act} nunca declarou cachês de shows. O fisco cobra {amountTxt} e ameaça penhorar instrumentos e masters.', '{act} never declared gig fees. The taxman demands {amountTxt} and threatens to seize instruments and masters.'],
    [
      o('advance', 'Adiantar o valor (desconta dos royalties)', 'Advance the sum (recoup from royalties)', (s, _r, c) => { const a = A(s, c); pay(s, `r11tax:${a.id}`, Number(c.amount), 'artist_dev', 'Adiantamento fiscal'); a.cash -= Math.round(Number(c.amount) * 50); trust(a, 10); }, ['Custo agora; confiança alta.', 'Cost now; high trust.']),
      o('tour', 'Turnê de "pagar as dívidas"', '"Pay the debts" tour', (s, _r, c) => { const a = A(s, c); mood(s, a, 'fatigue', 20); mood(s, a, 'morale', -6); fans(a, 12000, 1500); }),
      o('their_problem', 'Problema deles', 'Their problem', (s, _r, c) => { const a = A(s, c); trust(a, -8); hiatus(s, a, 6); }),
    ]),
  E('r11_member_commune', 'people', 'neutral', [], 30,
    (s, r) => {
      if (!era(s, 1965, 1990) && !r.chance(0.3)) return null;
      const a = pick(s, r, (x) => active(x) && x.members.length >= 3);
      const p = a && who(s, a, (m) => m.traits.includes('spiritual') || (m.stress > 60 && m.traits.includes('melancholic')));
      return a && p && r.chance(0.2) ? { act: a.id, person: p.id } : null;
    },
    ['{person} quer viver numa comunidade espiritual', '{person} wants to join a spiritual commune'],
    ['{person} ({act}) voltou de um retiro dizendo que a fama é ilusão e que vai morar num ashram com um guru que pede "doações".', '{person} ({act}) came back from a retreat saying fame is an illusion and that they will live in an ashram with a guru asking for "donations".'],
    [
      o('blessing', 'Dar a bênção e uma licença', 'Give blessing and leave', (s, _r, c) => { const a = A(s, c); hiatus(s, a, 13); mood(s, a, 'inspiration', 20); trust(a, 6); }, ['Pausa; volta com outras ideias.', 'A break; returns with new ideas.']),
      o('intervene', 'Investigar o guru e intervir', 'Investigate the guru and intervene', (s, r, c) => { pay(s, `r11guru:${c.person}`, 1200, 'legal', 'Investigação'); const p = P(s, c); if (r.chance(0.6)) pmood(p, 'stress', -15); else pmood(p, 'resentment', 18); }),
      o('let_go', 'Deixar seguir o caminho', 'Let them go their way', (s, _r, c) => { pmood(P(s, c), 'morale', 8); const a = A(s, c); mom(a, -4); }),
    ]),
  E('r11_side_project', 'band', 'neutral', [], 24,
    (s, r) => {
      const a = pick(s, r, (x) => active(x) && x.members.length >= 3 && x.fame > 20);
      const p = a && who(s, a, (m) => m.traits.includes('ambitious') || m.traits.includes('prolific') || m.ambition === 'freedom');
      return a && p && r.chance(0.2) ? { act: a.id, person: p.id } : null;
    },
    ['O projeto paralelo de {person} explode', '{person}\'s side project blows up'],
    ['O disco paralelo que {person} gravou num fim de semana está vendendo mais que o último de {act}. O resto da banda finge que não viu.', 'The side record {person} cut in a weekend is outselling {act}\'s last one. The rest of the band pretends not to notice.'],
    [
      o('sign', 'Lançar pelo selo também', 'Release it on the label too', (s, _r, c) => { const a = A(s, c); gain(s, `r11side:${c.person}`, 2500, 'royalties', 'Projeto paralelo'); mood(s, a, 'resentment', 10); pmood(P(s, c), 'morale', 12); }),
      o('feature', 'Trazer o som novo para {act}', 'Bring the new sound into {act}', (s, _r, c) => { const a = A(s, c); mood(s, a, 'inspiration', 15); fame(a, 1); }),
      o('nothing', 'Deixar quieto', 'Leave it', (s, _r, c) => { const a = A(s, c); mood(s, a, 'resentment', 5); }),
    ]),
  E('r11_relapse', 'health', 'bad', ['drugs', 'health'], 18,
    (s, r) => {
      const a = pick(s, r, (x) => active(x) && crew(s, x).some((p) => p.health === 'recovering' && p.stress > 50));
      const p = a && who(s, a, (m) => m.health === 'recovering' && m.stress > 50);
      return a && p && r.chance(0.3) ? { act: a.id, person: p.id } : null;
    },
    ['Recaída: {person}', 'Relapse: {person}'],
    ['{person} ({act}) estava limpo havia meses. A turnê, a pressão e um velho amigo resolveram testar isso.', '{person} ({act}) had been clean for months. The tour, the pressure and an old friend put that to the test.'],
    [
      o('sober_tour', 'Turnê sóbria: acompanhante e camarim seco', 'Sober tour: companion and dry dressing room', (s, _r, c) => { const a = A(s, c); pay(s, `r11sober:${c.person}`, 2500, 'artist_dev', 'Acompanhante sóbrio'); const p = P(s, c); if (p) { p.stress = clamp(p.stress - 20, 0, 100); p.health = 'recovering'; } trust(a, 6); }),
      o('pause', 'Parar tudo e voltar à clínica', 'Stop everything, back to the clinic', (s, _r, c) => { const a = A(s, c); pay(s, `r11clin:${c.person}`, 5000, 'artist_dev', 'Clínica'); hiatus(s, a, 9); const p = P(s, c); if (p) p.health = 'recovering'; trust(a, 8); }),
      o('hope', 'Torcer pelo melhor', 'Hope for the best', (s, _r, c) => { const p = P(s, c); if (p) p.health = 'addiction'; pmood(p, 'morale', -10); }),
    ]),
  E('r11_paternity', 'scandal', 'bad', ['controversy'], 30,
    (s, r) => {
      if (s.year < 1950) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 35);
      const p = a && who(s, a, (m) => m.traits.includes('impulsive') || m.traits.includes('big_ego') || m.traits.includes('romantic'));
      return a && p && r.chance(0.12) ? { act: a.id, person: p.id, fee: legal(s, 3000) } : null;
    },
    ['Processo de paternidade contra {person}', 'Paternity suit against {person}'],
    ['Uma fã de uma turnê antiga diz que tem um filho de {person} ({act}). Os jornais já estão na porta.', 'A fan from an old tour says she has {person}\'s ({act}) child. The papers are already at the door.'],
    [
      o('test', 'Fazer o teste e assumir se for o caso', 'Take the test and own it if true', (s, r, c) => { const a = A(s, c); pay(s, `r11pat:${c.person}`, Number(c.fee), 'legal', 'Exame e acordo'); if (r.chance(0.5)) { img(a, 'publicImage', 4); pmood(P(s, c), 'stress', 10); } else img(a, 'publicImage', 2); }),
      o('settle', 'Acordo sigiloso', 'Confidential settlement', (s, _r, c) => { pay(s, `r11pats:${c.person}`, Number(c.fee) * 2, 'legal', 'Acordo sigiloso'); s.flags[`r11hush:${c.act}`] = s.week; }, ['Pode vazar depois.', 'May leak later.']),
      o('deny', 'Negar publicamente', 'Deny publicly', (s, _r, c) => { const a = A(s, c); scandal(a); img(a, 'publicImage', -8); }),
    ]),
  E('r11_stage_politics', 'culture', 'neutral', ['controversy'], 24,
    (s, r) => {
      const a = pick(s, r, (x) => active(x) && x.fame > 15 && (traitIn(s, x, 'engaged') || traitIn(s, x, 'rebel')));
      return a && r.chance(0.25) ? { act: a.id, censored: censorshipIn(s.year, mkt(a)).level > 0 ? 1 : 0 } : null;
    },
    ['{act} faz discurso político no palco', '{act} makes a political speech on stage'],
    ['No bis, {act} parou a música e falou cinco minutos contra o governo. Metade do público aplaudiu; a outra metade foi embora.', 'At the encore, {act} stopped the music and spoke for five minutes against the government. Half the crowd cheered; the other half walked out.'],
    [
      o('back', 'Apoiar publicamente', 'Back them publicly', (s, r, c) => { const a = A(s, c); fans(a, 0, 2000, 900); trust(a, 10); rep(s, 'artistic', 2); if (c.censored || r.chance(0.3)) { rep(s, 'institutional', -5); mom(a, -5); } }),
      o('neutral', 'Nota: "o selo não se posiciona"', 'Statement: "the label takes no side"', (s, _r, c) => { const a = A(s, c); trust(a, -4); }),
      o('nothing', 'Não dizer nada', 'Say nothing', (s, _r, c) => { const a = A(s, c); fansMul(a, 0.97, 1, 1.03); }),
    ]),
  E('r11_producer_feud', 'band', 'bad', [], 18,
    (s, r) => {
      const a = pick(s, r, (x) => active(x) && (traitIn(s, x, 'big_ego') || traitIn(s, x, 'quarrelsome') || traitIn(s, x, 'purist')));
      return a && latestRel(s, a, 12) && r.chance(0.2) ? { act: a.id } : null;
    },
    ['{act} expulsa o produtor do estúdio', '{act} throws the producer out of the studio'],
    ['Depois de discutir sobre um solo de bateria, {act} trocou a fechadura do estúdio. O produtor diz que vai levar as fitas.', 'After an argument about a drum fill, {act} changed the studio lock. The producer says he will take the tapes.'],
    [
      o('mediate', 'Mediar e pagar a diferença', 'Mediate and pay the difference', (s, _r, c) => { const a = A(s, c); pay(s, `r11prod:${a.id}`, 1500, 'production', 'Acordo com produtor'); mood(s, a, 'stress', -8); }),
      o('self', 'Deixar a banda se autoproduzir', 'Let the band self-produce', (s, r, c) => { const a = A(s, c); trust(a, 8); if (r.chance(0.5)) mood(s, a, 'inspiration', 15); else { const rel = latestRel(s, a, 12); if (rel) rel.appeal *= 0.92; } }),
      o('producer_side', 'Ficar do lado do produtor', 'Side with the producer', (s, _r, c) => { const a = A(s, c); trust(a, -10); mood(s, a, 'resentment', 10); }),
    ]),
  E('r11_impostor_band', 'scandal', 'bad', [], 30,
    (s, r) => {
      if (!era(s, 1960, 1995)) return null;
      const a = pick(s, r, (x) => x.fame > 40 && (x.status === 'hiatus' || x.status === 'active'));
      return a && r.chance(0.15) ? { act: a.id, city: a.city } : null;
    },
    ['Uma banda falsa de {act} está em turnê', 'A fake {act} is on tour'],
    ['Quatro desconhecidos com perucas estão tocando pelo interior como "{act}", vendendo ingresso caro e cantando mal.', 'Four strangers in wigs are touring small towns as "{act}", selling pricey tickets and singing badly.'],
    [
      o('sue', 'Processar e anunciar a farsa', 'Sue and expose the fraud', (s, r, c) => { const a = A(s, c); pay(s, `r11fake:${a.id}`, legal(s, 2500), 'legal', 'Ação de marca'); if (r.chance(winOdds(s, 0.6))) { gain(s, `r11fakeg:${a.id}`, 3000, 'legal', 'Indenização'); fame(a, 1); } }),
      o('real_tour', 'Mandar a banda verdadeira às mesmas cidades', 'Send the real band to the same towns', (s, _r, c) => { const a = A(s, c); mood(s, a, 'fatigue', 12); fans(a, 15000, 2500, 300); }),
      o('ignore', 'Ignorar', 'Ignore it', (s, _r, c) => { const a = A(s, c); img(a, 'publicImage', -4); }),
    ]),
  E('r11_vault_tapes', 'career', 'good', [], 36,
    (s, r) => {
      const a = pick(s, r, (x) => s.year - x.formed >= 12 && x.releases.length >= 3);
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Fitas perdidas de {act}', 'Lost {act} tapes'],
    ['Na reforma do depósito, apareceram caixas com sessões inéditas de {act} de uma década atrás.', 'Renovating the warehouse, boxes turned up with unreleased {act} sessions from a decade ago.'],
    [
      o('deluxe', 'Lançar edição de luxo com as sobras', 'Release a deluxe edition with the outtakes', (s, _r, c) => { const a = A(s, c); pay(s, `r11vault:${a.id}`, 1500, 'production', 'Restauração'); gain(s, `r11vaultg:${a.id}`, 4500, 'royalties', 'Edição de luxo'); fans(a, 5000, 800, 300); }),
      o('archive', 'Doar ao arquivo nacional', 'Donate to the national archive', (s) => { rep(s, 'institutional', 3); rep(s, 'artistic', 1); }),
      o('shelf', 'Guardar de volta', 'Put them back', noop),
    ]),
  E('r11_superstar_feat', 'career', 'good', [], 18,
    (s, r) => {
      const a = pick(s, r, (x) => active(x) && x.fame > 10 && x.fame < 60);
      const b = a && star(s, r, (y) => y.fame > a.fame + 15 && (fam(y) === fam(a) || r.chance(0.2)));
      return a && b && r.chance(0.2) ? { act: a.id, other: b.id, fee: feeBy(b, 2000, 80, 12000) } : null;
    },
    ['{otherName} quer gravar com {act}', '{otherName} wants to record with {act}'],
    ['{otherName} ouviu {act} num carro e quer uma parceria. O empresário pede {feeTxt} pelo feat.', '{otherName} heard {act} in a car and wants a collaboration. The manager asks {feeTxt} for the feature.'],
    [
      o('pay', 'Pagar o feat', 'Pay for the feature', (s, _r, c) => { const a = A(s, c); pay(s, `r11feat:${a.id}`, Number(c.fee), 'marketing', 'Participação especial'); fame(a, 5); fans(a, 40000, 5000, 400); a.feats += 1; mom(a, 8); }),
      o('swap', 'Propor troca: {act} participa no disco deles', 'Propose a swap: {act} guests on their record', (s, r, c) => { const a = A(s, c); if (r.chance(0.5)) { fame(a, 3); fans(a, 20000, 2000); a.feats += 1; } }),
      o('pass', 'Recusar', 'Decline', noop),
    ]),
  E('r11_unmasked', 'scandal', 'neutral', [], 36,
    (s, r) => {
      if (s.year < 1995) return null;
      const a = pick(s, r, (x) => active(x) && fam(x) === 'electronic' && x.fame > 25 && (traitIn(s, x, 'reserved') || traitIn(s, x, 'shy') || traitIn(s, x, 'loner')));
      return a && r.chance(0.15) ? { act: a.id } : null;
    },
    ['O rosto por trás de {act}', 'The face behind {act}'],
    ['Um paparazzo fotografou {act} sem a máscara. A mística do anonimato está por um fio.', 'A paparazzo shot {act} without the mask. The anonymous mystique hangs by a thread.'],
    [
      o('reveal', 'Revelar tudo numa capa de revista', 'Reveal all on a magazine cover', (s, _r, c) => { const a = A(s, c); fame(a, 4); fansMul(a, 1.1, 1, 0.9); }),
      o('injunction', 'Liminar contra a publicação', 'Injunction against publication', (s, r, c) => { pay(s, `r11mask:${c.act}`, legal(s, 2500), 'legal', 'Liminar'); if (!r.chance(winOdds(s, 0.5))) { const a = A(s, c); fansMul(a, 1, 1, 0.95); } }),
      o('decoy', 'Dizer que é um sósia', 'Say it is a lookalike', (s, _r, c) => { const a = A(s, c); fans(a, 0, 500, 300); }),
    ]),
  E('r11_reality_tv', 'contract', 'neutral', [], 24,
    (s, r) => {
      if (s.year < 2000 || s.year > 2030) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 15 && x.fame < 70);
      return a && r.chance(0.2) ? { act: a.id, fee: feeBy(a, 5000, 120, 20000) } : null;
    },
    ['Reality show quer {act}', 'Reality show wants {act}'],
    ['Uma emissora quer câmeras 24 horas na casa de {act} por uma temporada. Cachê: {feeTxt}.', 'A network wants 24-hour cameras in {act}\'s home for a season. Fee: {feeTxt}.'],
    [
      o('accept', 'Aceitar', 'Accept', (s, r, c) => { const a = A(s, c); split(s, a, `r11real:${a.id}`, Number(c.fee), 'sync', 'Reality show'); fame(a, 6); fans(a, 60000, 3000); img(a, 'artistic', -8); mood(s, a, 'stress', 15); if (r.chance(0.3)) scandal(a); }, ['Fama e dinheiro; credibilidade cai.', 'Fame and money; credibility drops.']),
      o('cameo', 'Só uma participação especial', 'Just a guest appearance', (s, _r, c) => { const a = A(s, c); fame(a, 1.5); fans(a, 12000, 500); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('r11_social_feud', 'scandal', 'neutral', ['controversy'], 12,
    (s, r) => {
      if (!plat(s, 'social') || s.year < 2006) return null;
      const a = pick(s, r, (x) => active(x) && (traitIn(s, x, 'controversial') || traitIn(s, x, 'big_ego') || traitIn(s, x, 'quarrelsome') || traitIn(s, x, 'impulsive')));
      const b = a && star(s, r);
      return a && b && r.chance(0.25) ? { act: a.id, other: b.id } : null;
    },
    ['Briga nas redes: {act} × {otherName}', 'Online feud: {act} vs {otherName}'],
    ['Às 3 da manhã, {act} postou que {otherName} "não sabe cantar nem no chuveiro". Os fãs dos dois estão em guerra nos comentários.', 'At 3 a.m., {act} posted that {otherName} "can\'t even sing in the shower". Both fanbases are at war in the comments.'],
    [
      o('double_down', 'Dobrar a aposta', 'Double down', (s, r, c) => { const a = A(s, c); fame(a, 3); fans(a, 20000, 2500); if (r.chance(0.4)) { scandal(a); img(a, 'publicImage', -8); } }),
      o('delete', 'Apagar e pedir desculpas', 'Delete and apologize', (s, _r, c) => { const a = A(s, c); img(a, 'publicImage', 2); mood(s, a, 'morale', -3); }),
      o('social_manager', 'Tirar a senha e contratar gestor de redes', 'Take the password, hire a social manager', (s, _r, c) => { const a = A(s, c); pay(s, `r11sm:${a.id}`, 900, 'marketing', 'Gestor de redes'); trust(a, -3); }),
    ]),
  E('r11_crypto_promo', 'scandal', 'bad', ['controversy'], 36,
    (s, r) => {
      if (!era(s, 2017, 2024)) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 25 && (traitIn(s, x, 'opportunist') || traitIn(s, x, 'spendthrift') || ambitionIn(s, x, 'money')));
      return a && r.chance(0.18) ? { act: a.id, fee: feeBy(a, 6000, 150, 30000) } : null;
    },
    ['{act} e a moeda milagrosa', '{act} and the miracle coin'],
    ['Uma "plataforma de investimentos" oferece {feeTxt} para {act} divulgar um token aos fãs. Os criadores moram num iate sem endereço.', 'An "investment platform" offers {feeTxt} for {act} to promote a token to fans. The founders live on a yacht with no address.'],
    [
      o('take', 'Aceitar o dinheiro', 'Take the money', (s, r, c) => { const a = A(s, c); split(s, a, `r11coin:${a.id}`, Number(c.fee), 'brand', 'Publicidade de token'); if (r.chance(0.6)) { scandal(a); fansMul(a, 0.85, 0.85, 0.9); rep(s, 'institutional', -5); log(s, 'coin', 'O token divulgado por {a} derrete; fãs perdem economias.', 'The token {a} promoted collapses; fans lose savings.', { a: a.name }, a.id, true); } }, ['Dinheiro rápido; grande risco de golpe.', 'Fast money; high scam risk.']),
      o('vet', 'Mandar o jurídico investigar', 'Have legal investigate', (s) => { pay(s, 'r11coinv', legal(s, 600), 'legal', 'Due diligence'); rep(s, 'institutional', 1); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('r11_age_lie', 'scandal', 'neutral', [], 36,
    (s, r) => {
      if (s.year < 1955) return null;
      const a = pick(s, r, (x) => active(x) && fam(x) === 'pop' && x.fame > 30);
      const p = a && lead(s, a);
      return a && p && r.chance(0.1) ? { act: a.id, person: p.id } : null;
    },
    ['A idade verdadeira de {person}', '{person}\'s real age'],
    ['Uma certidão antiga mostra que {person} ({act}) tem oito anos a mais do que diz o material de imprensa do selo.', 'An old certificate shows {person} ({act}) is eight years older than the label\'s press kit says.'],
    [
      o('laugh', 'Admitir com humor', 'Admit it with humor', (s, _r, c) => { const a = A(s, c); img(a, 'publicImage', 3); fansMul(a, 0.96); }),
      o('deny', 'Dizer que a certidão é falsa', 'Claim the certificate is fake', (s, r, c) => { const a = A(s, c); if (r.chance(0.5)) { scandal(a); img(a, 'publicImage', -8); rep(s, 'institutional', -2); } }),
      o('nothing', 'Não comentar', 'No comment', (s, _r, c) => { const a = A(s, c); fansMul(a, 0.95); }),
    ]),
  E('r11_mental_health', 'health', 'neutral', ['health'], 30,
    (s, r) => {
      if (s.year < 1985) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 20);
      const p = a && who(s, a, (m) => m.stress > 65 && (m.traits.includes('melancholic') || m.traits.includes('anxious')));
      return a && p && r.chance(0.3) ? { act: a.id, person: p.id } : null;
    },
    ['{person} quer falar sobre depressão', '{person} wants to talk about depression'],
    ['{person} ({act}) quer abrir o jogo em entrevista: depressão, remédios, a parte que ninguém mostra. O assessor está nervoso.', '{person} ({act}) wants to open up in an interview: depression, medication, the part nobody shows. The publicist is nervous.'],
    [
      o('support', 'Apoiar e pagar tratamento', 'Support and pay for care', (s, r, c) => { const a = A(s, c); pay(s, `r11mh:${c.person}`, 2000, 'artist_dev', 'Tratamento'); pmood(P(s, c), 'stress', -25); trust(a, 10); fans(a, 0, 1500, 800); if (s.year >= 2010 || r.chance(0.5)) img(a, 'publicImage', 8); else img(a, 'publicImage', -4); }, ['Antes de 2010 a reação é menos previsível.', 'Before 2010 reactions are less predictable.']),
      o('later', 'Sugerir esperar o fim da turnê', 'Suggest waiting until the tour ends', (s, _r, c) => { pmood(P(s, c), 'stress', 8); const a = A(s, c); trust(a, -3); }),
      o('quiet', 'Pedir discrição', 'Ask for discretion', (s, _r, c) => { pmood(P(s, c), 'morale', -8); pmood(P(s, c), 'stress', 6); }),
    ]),
  E('r11_coming_out', 'people', 'neutral', [], 60,
    (s, r) => {
      if (s.year < 1968) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 15);
      const p = a && lead(s, a);
      return a && p && r.chance(0.06) ? { act: a.id, person: p.id } : null;
    },
    ['{person} quer se assumir publicamente', '{person} wants to come out publicly'],
    ['{person} ({act}) está cansado de mentir em entrevistas sobre com quem divide a vida e quer falar abertamente.', '{person} ({act}) is tired of lying in interviews about who they share their life with and wants to speak openly.'],
    [
      o('support', 'Apoiar com tudo', 'Support them fully', (s, r, c) => { const a = A(s, c); trust(a, 15); pmood(P(s, c), 'stress', -25); pmood(P(s, c), 'morale', 15); fans(a, 0, 2000, 1200); rep(s, 'artists', 3); if (s.year < 1995 && r.chance(0.5)) { fansMul(a, 0.9); rep(s, 'commercial', -2); } }, ['Em décadas antigas há perdas comerciais.', 'In earlier decades there are commercial losses.']),
      o('timing', 'Apoiar, escolhendo o momento juntos', 'Support it, choosing the timing together', (s, _r, c) => { const a = A(s, c); trust(a, 8); pmood(P(s, c), 'stress', -10); }),
      o('artist_call', 'A decisão é do artista', 'It is the artist\'s call', (s, _r, c) => { const a = A(s, c); trust(a, 3); }),
    ]),
];

// =====================================================================================
// 2. VIRAIS (apenas quando as plataformas existem)
// =====================================================================================
const VIRAL: EventDef[] = [
  E('r11_viral_cover', 'market', 'good', [], 14,
    (s, r) => {
      if (!plat(s, 'video_site') && !plat(s, 'short_video')) return null;
      const rel = myRels(s, (x) => x.totalUnits > 1000 && s.week - x.week < 80)[0];
      return rel && r.chance(0.2) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Cover de "{releaseTitle}" viraliza', 'Cover of "{releaseTitle}" goes viral'],
    ['Uma adolescente gravou "{releaseTitle}" no violão do quarto e o vídeo passou de 20 milhões de visualizações. As pessoas estão procurando a original.', 'A teenager recorded "{releaseTitle}" on a bedroom guitar and the video passed 20 million views. People are hunting for the original.'],
    [
      o('duet', 'Convidar para um dueto oficial', 'Invite her to an official duet', (s, _r, c) => { const a = A(s, c); appeal(s, c, 1.25); fans(a, 30000, 3000, 300); fame(a, 2); pay(s, `r11duet:${c.release}`, 800, 'production', 'Dueto'); }),
      o('claim', 'Reivindicar a receita do vídeo', 'Claim the video revenue', (s, _r, c) => { gain(s, `r11claim:${c.release}`, 1200, 'royalties', 'Monetização'); appeal(s, c, 1.08); rep(s, 'artists', -1); }),
      o('enjoy', 'Só curtir', 'Just enjoy it', (s, _r, c) => { appeal(s, c, 1.12); }),
    ]),
  E('r11_meme_revival', 'market', 'good', [], 24,
    (s, r) => {
      if (s.year < 2010 || !plat(s, 'social')) return null;
      const rel = myRels(s, (x) => s.week - x.week > 520 && x.totalUnits > 2000)[0];
      return rel && r.chance(0.15) ? { release: rel.id, act: rel.actId } : null;
    },
    ['"{releaseTitle}" volta décadas depois', '"{releaseTitle}" returns decades later'],
    ['Uma série de streaming usou "{releaseTitle}" numa cena e uma geração inteira descobriu a música. Está nas paradas de novo.', 'A streaming series used "{releaseTitle}" in a scene and a whole generation found the song. It is charting again.'],
    [
      o('reissue', 'Relançar com clipe novo', 'Reissue with a new video', (s, _r, c) => { pay(s, `r11meme:${c.release}`, 1500, 'marketing', 'Clipe novo'); gain(s, `r11memeg:${c.release}`, 5000, 'royalties', 'Catálogo revivido'); const a = A(s, c); if (a) fans(a, 40000, 3000, 500); }),
      o('passive', 'Deixar o algoritmo trabalhar', 'Let the algorithm work', (s, _r, c) => { gain(s, `r11memep:${c.release}`, 2500, 'royalties', 'Catálogo revivido'); }),
    ]),
  E('r11_livestream_meltdown', 'scandal', 'bad', ['controversy'], 18,
    (s, r) => {
      if (!plat(s, 'live_stream')) return null;
      const a = pick(s, r, (x) => active(x) && crew(s, x).some((p) => p.stress > 70));
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Live de {act} sai do controle', '{act}\'s livestream goes off the rails'],
    ['Uma live que era para ser acústica virou duas horas de desabafo, choro e acusações contra o selo. Já tem cortes em todo lugar.', 'A livestream meant to be acoustic became two hours of venting, tears and accusations against the label. Clips are everywhere.'],
    [
      o('care', 'Ligar na hora e oferecer ajuda', 'Call right away and offer help', (s, _r, c) => { const a = A(s, c); mood(s, a, 'stress', -15); trust(a, 8); hiatus(s, a, 4); }),
      o('statement', 'Nota oficial contestando', 'Official statement disputing it', (s, _r, c) => { const a = A(s, c); trust(a, -10); rep(s, 'artists', -2); }),
      o('wait', 'Esperar passar', 'Wait it out', (s, _r, c) => { const a = A(s, c); scandal(a); img(a, 'professionalism', -6); }),
    ]),
  E('r11_deepfake', 'scandal', 'bad', ['controversy'], 24,
    (s, r) => {
      if (s.year < 2019) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 30);
      return a && r.chance(0.15) ? { act: a.id } : null;
    },
    ['Vídeo falso de {act}', 'Fake video of {act}'],
    ['Um deepfake mostra {act} dizendo coisas horríveis. É falso, mas já foi compartilhado milhões de vezes.', 'A deepfake shows {act} saying horrible things. It is fake, but already shared millions of times.'],
    [
      o('forensics', 'Perícia técnica e processo', 'Forensic analysis and lawsuit', (s, _r, c) => { const a = A(s, c); pay(s, `r11deep:${a.id}`, legal(s, 3000), 'legal', 'Perícia'); img(a, 'publicImage', 3); }),
      o('humor', 'Responder com um vídeo bem-humorado', 'Reply with a witty video', (s, r, c) => { const a = A(s, c); if (r.chance(0.6)) { fame(a, 2); fans(a, 15000, 1000); } else img(a, 'publicImage', -5); }),
      o('deny', 'Só desmentir', 'Simply deny it', (s, _r, c) => { const a = A(s, c); img(a, 'publicImage', -4); }),
    ]),
];

// =====================================================================================
// 3. SELO: negócios e operação
// =====================================================================================
const LABEL: EventDef[] = [
  E('r11_warehouse_fire', 'manufacturing', 'bad', [], 60,
    (s, r) => {
      if (!label(s)) return null;
      const rel = myRels(s, (x) => s.week - x.week < 40)[0];
      return rel && r.chance(0.04) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Incêndio no depósito', 'Warehouse fire'],
    ['Um curto-circuito incendiou o depósito do selo. O estoque de "{releaseTitle}" virou fumaça; algumas fitas master estavam lá.', 'A short circuit set the label warehouse ablaze. The "{releaseTitle}" stock went up in smoke; some master tapes were inside.'],
    [
      o('rebuild', 'Reconstruir com sprinklers e cofre', 'Rebuild with sprinklers and a vault', (s) => { pay(s, 'r11fire', 7000, 'hq', 'Reconstrução'); rep(s, 'institutional', 1); }),
      o('insurance', 'Acionar o seguro (se houver)', 'Claim insurance (if any)', (s, r, c) => { if (r.chance(0.6)) gain(s, 'r11firei', 4000, 'misc', 'Seguro'); appeal(s, c, 0.85); }),
      o('absorb', 'Absorver a perda', 'Absorb the loss', (s, _r, c) => { appeal(s, c, 0.75); }),
    ]),
  E('r11_counterfeit_plant', 'manufacturing', 'bad', ['crime'], 24,
    (s, r) => {
      if (!label(s) || !era(s, 1965, 2008)) return null;
      const rel = myRels(s, (x) => x.totalUnits > 20000 && s.week - x.week < 52)[0];
      return rel && r.chance(0.2) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Prensagem pirata de "{releaseTitle}"', 'Counterfeit pressing of "{releaseTitle}"'],
    ['Camelôs de três capitais vendem cópias de "{releaseTitle}" com capa xerocada a um terço do preço. A fábrica fica do outro lado da fronteira.', 'Street vendors in three capitals sell copies of "{releaseTitle}" with photocopied sleeves at a third of the price. The plant is across the border.'],
    [
      o('raid', 'Bancar operação com a polícia', 'Fund a police raid', (s, r, c) => { pay(s, `r11raid:${c.release}`, 3500, 'legal', 'Operação antipirataria'); if (r.chance(0.55)) { appeal(s, c, 1.1); rep(s, 'institutional', 2); } }),
      o('cheap', 'Lançar edição econômica oficial', 'Release an official budget edition', (s, _r, c) => { gain(s, `r11budget:${c.release}`, 2500, 'release', 'Edição econômica'); appeal(s, c, 0.95); }),
      o('ignore', 'Ignorar', 'Ignore it', (s, _r, c) => { appeal(s, c, 0.9); }),
    ]),
  E('r11_embezzler', 'business', 'bad', ['crime'], 60,
    (s, r) => {
      if (!label(s) || s.player.staff.length < 3) return null;
      const st = r.pick(s.player.staff);
      return st && r.chance(0.06) ? { staffId: st.id, staff: st.name, amount: Math.round(3000 + s.player.staff.length * 600) } : null;
    },
    ['Desvio no caixa', 'Embezzlement'],
    ['A conferência anual encontrou um rombo de {amountTxt}. Os rastros levam a {staff}, que cuida dos pagamentos há anos.', 'The annual audit found a hole of {amountTxt}. The trail leads to {staff}, who has handled payments for years.'],
    [
      o('police', 'Demitir e chamar a polícia', 'Fire them and call the police', (s, r, c) => { s.player.staff = s.player.staff.filter((x) => x.id !== c.staffId); pay(s, 'r11emb', Number(c.amount), 'misc', 'Desvio'); if (r.chance(0.4)) gain(s, 'r11embr', Number(c.amount) * 0.6, 'misc', 'Recuperado'); rep(s, 'institutional', 1); }),
      o('quiet', 'Demitir em silêncio', 'Fire them quietly', (s, _r, c) => { s.player.staff = s.player.staff.filter((x) => x.id !== c.staffId); pay(s, 'r11emb', Number(c.amount), 'misc', 'Desvio'); }),
      o('second_chance', 'Plano de devolução e segunda chance', 'Repayment plan and a second chance', (s, r, c) => { pay(s, 'r11emb', Number(c.amount) * (r.chance(0.5) ? 0.4 : 1), 'misc', 'Desvio'); }),
    ]),
  E('r11_office_flood', 'business', 'bad', [], 48,
    (s, r) => (label(s) && r.chance(0.05) ? { amount: 1500 + s.player.hq * 800 } : null),
    ['Enchente no escritório', 'Office flood'],
    ['Uma tempestade alagou o térreo da sede. Arquivos, mesas e um piano de cauda estão boiando. Conserto: {amountTxt}.', 'A storm flooded the HQ ground floor. Files, desks and a grand piano are floating. Repairs: {amountTxt}.'],
    [
      o('fix', 'Consertar tudo direito', 'Fix everything properly', (s, _r, c) => { pay(s, 'r11flood', Number(c.amount), 'hq', 'Reforma pós-enchente'); }),
      o('patch', 'Remendar e seguir', 'Patch it and carry on', (s, _r, c) => { pay(s, 'r11flood', Number(c.amount) * 0.4, 'hq', 'Remendos'); rep(s, 'artists', -1); }),
    ]),
  E('r11_distributor_bust', 'business', 'bad', [], 48,
    (s, r) => {
      if (!label(s) || s.player.revenueByYear[s.year - 1] === undefined) return null;
      return r.chance(0.05) ? { amount: Math.round(clamp(cash(s) / 100 * 0.08, 1500, 25000)) } : null;
    },
    ['Distribuidora quebra devendo', 'Distributor goes bust owing money'],
    ['A distribuidora que levava seus discos às lojas pediu falência. Ela te deve {amountTxt} e os credores fazem fila.', 'The distributor that took your records to stores filed for bankruptcy. It owes you {amountTxt} and creditors are queueing.'],
    [
      o('court', 'Brigar como credor na Justiça', 'Fight as a creditor in court', (s, r, c) => { pay(s, 'r11dist', legal(s, 1500), 'legal', 'Habilitação de crédito'); if (r.chance(winOdds(s, 0.4))) gain(s, 'r11distg', Number(c.amount) * 0.5, 'misc', 'Recuperação de crédito'); }),
      o('buy_stock', 'Recomprar o estoque parado', 'Buy back the idle stock', (s, _r, c) => { pay(s, 'r11distb', Number(c.amount) * 0.2, 'release', 'Recompra de estoque'); rep(s, 'commercial', 1); }),
      o('write_off', 'Dar baixa', 'Write it off', (s, _r, c) => { pay(s, 'r11distw', Number(c.amount) * 0.5, 'misc', 'Crédito perdido'); }),
    ]),
  E('r11_major_pd_deal', 'business', 'good', [], 36,
    (s, r) => {
      if (!label(s) || s.player.reputation.commercial < 35) return null;
      return r.chance(0.12) ? { advance: Math.round(5000 + s.player.reputation.commercial * 150) } : null;
    },
    ['Uma major quer distribuir você', 'A major wants to distribute you'],
    ['Uma das grandes oferece um contrato de prensagem e distribuição: adiantamento de {advanceTxt}, mas fica com uma fatia de tudo por anos.', 'One of the majors offers a pressing-and-distribution deal: an advance of {advanceTxt}, but it takes a cut of everything for years.'],
    [
      o('sign', 'Assinar', 'Sign', (s, _r, c) => { gain(s, 'r11pd', Number(c.advance), 'investment', 'Adiantamento de P&D'); rep(s, 'commercial', 3); rep(s, 'artistic', -2); s.flags.r11pd = s.week; }, ['Dinheiro agora; menos independência.', 'Money now; less independence.']),
      o('counter', 'Contrapropor prazo curto', 'Counter with a short term', (s, r, c) => { if (r.chance(0.5)) gain(s, 'r11pd', Number(c.advance) * 0.6, 'investment', 'Adiantamento de P&D'); }),
      o('indie', 'Seguir independente', 'Stay independent', (s) => { rep(s, 'artistic', 1); }),
    ]),
  E('r11_staff_raise', 'business', 'neutral', [], 24,
    (s, r) => {
      if (!label(s) || s.player.staff.length < 2) return null;
      const st = s.player.staff.find((x) => x.skill > 60 && s.week - x.hiredWeek > 100);
      return st && r.chance(0.2) ? { staffId: st.id, staff: st.name } : null;
    },
    ['{staff} pede aumento', '{staff} asks for a raise'],
    ['{staff} recebeu proposta de uma major e quer 30% a mais para ficar. Sabe onde estão todos os contratos.', '{staff} got an offer from a major and wants 30% more to stay. They know where all the contracts are.'],
    [
      o('raise', 'Dar o aumento', 'Give the raise', (s, _r, c) => { const st = s.player.staff.find((x) => x.id === c.staffId); if (st) { st.salary = Math.round(st.salary * 1.3); st.skill = clamp(st.skill + 2, 0, 100); } }),
      o('partial', 'Dar 10% e um título bonito', 'Give 10% and a fancy title', (s, r, c) => { const st = s.player.staff.find((x) => x.id === c.staffId); if (st) { st.salary = Math.round(st.salary * 1.1); if (r.chance(0.4)) s.player.staff = s.player.staff.filter((x) => x !== st); } }),
      o('let_go', 'Deixar ir', 'Let them go', (s, _r, c) => { s.player.staff = s.player.staff.filter((x) => x.id !== c.staffId); }),
    ]),
  E('r11_intern_demo', 'scouting', 'good', [], 18,
    (s, r) => {
      if (!label(s)) return null;
      const cands = Object.values(s.acts).slice(-40).filter((a) => a.owner === null && !a.playerBand && !s.knowledge[a.id] && a.potential > 55);
      const a = cands.length ? r.pick(cands) : undefined;
      return a && r.chance(0.2) ? { act: a.id, city: a.city } : null;
    },
    ['O estagiário trouxe uma fita', 'The intern brought a tape'],
    ['O estagiário jura que viu a melhor banda da vida num porão de {cityName}: {act}. Ninguém mais conhece.', 'The intern swears they saw the best band ever in a basement in {cityName}: {act}. Nobody else knows them.'],
    [
      o('scout', 'Mandar alguém conferir', 'Send someone to check', (s, r, c) => { signal(s, r, String(c.act), 2); pay(s, `r11int:${c.act}`, 300, 'scouting', 'Viagem de olheiro'); }),
      o('note', 'Anotar o nome', 'Write the name down', (s, r, c) => { signal(s, r, String(c.act), 1); }),
      o('ignore', 'Agradecer e esquecer', 'Thank them and forget', noop),
    ]),
  E('r11_vinyl_revival_repress', 'manufacturing', 'good', [], 24,
    (s, r) => {
      if (!label(s) || s.year < 2008) return null;
      const rel = myRels(s, (x) => s.week - x.week > 260 && x.totalUnits > 5000)[0];
      return rel && r.chance(0.2) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Colecionadores querem "{releaseTitle}" em vinil', 'Collectors want "{releaseTitle}" on vinyl'],
    ['Com a volta do vinil, lojas pedem uma reedição em 180 g de "{releaseTitle}". A fábrica só tem horário daqui a meses.', 'With vinyl\'s comeback, shops ask for a 180 g reissue of "{releaseTitle}". The plant only has slots months away.'],
    [
      o('deluxe', 'Edição colorida numerada', 'Numbered coloured edition', (s, r, c) => { pay(s, `r11vin:${c.release}`, 2500, 'release', 'Reedição em vinil'); gain(s, `r11ving:${c.release}`, r.chance(0.7) ? 6000 : 2000, 'release', 'Vinil de colecionador'); }),
      o('standard', 'Reedição simples', 'Plain reissue', (s, _r, c) => { pay(s, `r11vin:${c.release}`, 1200, 'release', 'Reedição em vinil'); gain(s, `r11ving:${c.release}`, 2600, 'release', 'Reedição em vinil'); }),
      o('skip', 'Deixar para depois', 'Leave it for later', noop),
    ]),
  E('r11_box_set', 'business', 'good', [], 36,
    (s, r) => {
      if (!label(s) || s.year < 1975) return null;
      const a = pick(s, r, (x) => x.releases.length >= 5 && (x.legend || x.hits >= 3));
      return a && r.chance(0.18) ? { act: a.id } : null;
    },
    ['Caixa comemorativa de {act}', '{act} commemorative box set'],
    ['A loja de departamentos quer uma caixa de luxo de {act}: discos remasterizados, livro e pôster. Natal está chegando.', 'The department store wants a luxury {act} box set: remastered records, a book and a poster. Christmas is coming.'],
    [
      o('lavish', 'Caixa luxuosa', 'Lavish box', (s, r, c) => { const a = A(s, c); pay(s, `r11box:${a.id}`, 4000, 'release', 'Box set'); gain(s, `r11boxg:${a.id}`, r.chance(0.65) ? 11000 : 3500, 'release', 'Box set'); fans(a, 0, 600, 400); }),
      o('simple', 'Coletânea simples', 'Simple compilation', (s, _r, c) => { const a = A(s, c); gain(s, `r11comp:${a.id}`, 3000, 'release', 'Coletânea'); if (!a.playerBand) trust(a, -2); }),
      o('no', 'Não agora', 'Not now', noop),
    ]),
  E('r11_masters_demand', 'contract', 'neutral', [], 36,
    (s, r) => {
      if (!label(s) || s.year < 1995) return null;
      const a = pick(s, r, (x) => !x.playerBand && x.fame > 45 && x.releases.length >= 3 && (ambitionIn(s, x, 'freedom') || ambitionIn(s, x, 'legacy') || x.trust < 50));
      return a && r.chance(0.15) ? { act: a.id, price: feeBy(a, 15000, 400, 80000) } : null;
    },
    ['{act} quer comprar as próprias masters', '{act} wants to buy their own masters'],
    ['{act} oferece {priceTxt} pelas gravações originais. Se você recusar, ameaçam regravar tudo nota por nota quando o contrato permitir.', '{act} offers {priceTxt} for the original recordings. If you refuse, they threaten to re-record everything note for note when the contract allows.'],
    [
      o('sell', 'Vender as masters', 'Sell the masters', (s, _r, c) => { const a = A(s, c); gain(s, `r11mast:${a.id}`, Number(c.price), 'investment', 'Venda de masters'); trust(a, 20); rep(s, 'artists', 4); for (const rid of a.releases) { const rel = s.releases[rid]; if (rel && rel.owner === 'player') rel.owner = 'indie'; } }, ['Dinheiro agora; catálogo vai embora.', 'Money now; the catalog leaves.']),
      o('share', 'Propor divisão 50/50 dos royalties', 'Offer a 50/50 royalty split', (s, _r, c) => { const a = A(s, c); trust(a, 10); pay(s, `r11mshare:${a.id}`, 2000, 'royalties', 'Ajuste de royalties'); }),
      o('refuse', 'Recusar', 'Refuse', (s, _r, c) => { const a = A(s, c); trust(a, -15); s.flags[`r11rerec:${a.id}`] = s.week; log(s, 'masters', '{a} jura regravar todo o catálogo.', '{a} vows to re-record the entire catalog.', { a: a.name }, a.id, true); }),
    ]),
  E('r11_rerecord_release', 'market', 'bad', [], 24,
    (s, r) => {
      if (!label(s)) return null;
      const k = Object.keys(s.flags).find((x) => x.startsWith('r11rerec:') && s.week - s.flags[x] > 52);
      const id = k?.split(':')[1];
      return id && s.acts[id] && r.chance(0.4) ? { act: id } : null;
    },
    ['{act} lança as versões regravadas', '{act} releases their re-recorded versions'],
    ['As novas versões de {act} são idênticas e os fãs foram instruídos a tocar só elas. Os streams do seu catálogo despencam.', '{act}\'s new versions are identical and fans were told to play only those. Your catalog streams collapse.'],
    [
      o('sync_push', 'Empurrar as originais em sincronização', 'Push the originals for sync', (s, _r, c) => { delete s.flags[`r11rerec:${c.act}`]; pay(s, `r11rr:${c.act}`, 1500, 'marketing', 'Sync de catálogo'); gain(s, `r11rrg:${c.act}`, 2500, 'sync', 'Sync de catálogo'); rep(s, 'artists', -2); }),
      o('accept', 'Aceitar a perda', 'Accept the loss', (s, _r, c) => { delete s.flags[`r11rerec:${c.act}`]; const a = A(s, c); for (const rid of a.releases) { const rel = s.releases[rid]; if (rel) rel.appeal *= 0.7; } }),
    ]),
  E('r11_insurance_hike', 'business', 'bad', [], 36,
    (s, r) => {
      if (!label(s) || s.year < 1960) return null;
      const a = pick(s, r, (x) => active(x) && x.scandals >= 2);
      return a && r.chance(0.2) ? { act: a.id, amount: 1500 + a.scandals * 600 } : null;
    },
    ['Seguradora sobe o prêmio de {act}', 'Insurer raises {act}\'s premium'],
    ['Depois de tantos escândalos, a seguradora de turnês quer {amountTxt} a mais por ano para cobrir {act}.', 'After so many scandals, the tour insurer wants {amountTxt} more a year to cover {act}.'],
    [
      o('pay', 'Pagar', 'Pay', (s, _r, c) => { pay(s, `r11ins:${c.act}`, Number(c.amount), 'touring', 'Seguro de turnê'); }),
      o('clause', 'Incluir cláusula de conduta no contrato', 'Add a conduct clause to the contract', (s, _r, c) => { const a = A(s, c); trust(a, -8); pay(s, `r11ins:${c.act}`, Number(c.amount) * 0.4, 'touring', 'Seguro de turnê'); }),
      o('uninsured', 'Rodar sem seguro', 'Tour uninsured', (s, _r, c) => { s.flags[`r11noins:${c.act}`] = s.week; }),
    ]),
  E('r11_culture_grant', 'business', 'good', [], 36,
    (s, r) => {
      if (!label(s) || s.year < 1965) return null;
      const a = pick(s, r, (x) => ['sacred', 'blues_jazz', 'country_folk', 'brazil', 'africa', 'europe', 'asia_me'].includes(fam(x)) || x.positioning < 30);
      return a && r.chance(0.15) ? { act: a.id, amount: Math.round(3000 + s.player.reputation.artistic * 80) } : null;
    },
    ['Edital de cultura para {act}', 'Arts grant for {act}'],
    ['Um fundo público de cultura abre edital: até {amountTxt} para um projeto de {act}, com prestação de contas rigorosa.', 'A public arts fund opens applications: up to {amountTxt} for an {act} project, with strict accountability.'],
    [
      o('apply', 'Preparar o projeto direito', 'Prepare the project properly', (s, r, c) => { pay(s, `r11grantp:${c.act}`, 400, 'misc', 'Projeto de edital'); if (r.chance(0.35 + s.player.reputation.artistic / 200)) { gain(s, `r11grant:${c.act}`, Number(c.amount), 'investment', 'Edital de cultura'); rep(s, 'institutional', 2); } }, ['Reputação artística aumenta as chances.', 'Artistic reputation improves the odds.']),
      o('skip', 'Burocracia demais', 'Too much red tape', noop),
    ]),
  E('r11_cutout_bin', 'market', 'neutral', [], 24,
    (s, r) => {
      if (!label(s) || !era(s, 1958, 1998)) return null;
      const rel = myRels(s, (x) => s.week - x.week > 26 && s.week - x.week < 120 && x.totalUnits < 1500)[0];
      return rel && r.chance(0.2) ? { release: rel.id, act: rel.actId } : null;
    },
    ['"{releaseTitle}" vai para a cesta de saldos', '"{releaseTitle}" headed for the cutout bin'],
    ['As lojas querem devolver o encalhe de "{releaseTitle}" ou vendê-lo com a capa furada a preço de banana.', 'Stores want to return unsold "{releaseTitle}" or sell it with a punched sleeve for pennies.'],
    [
      o('cutout', 'Liberar a venda furada', 'Allow cutout sales', (s, _r, c) => { gain(s, `r11cut:${c.release}`, 400, 'release', 'Saldos'); const a = A(s, c); if (a) fans(a, 4000, 400, 60); }, ['Pouco dinheiro; fãs novos garimpando.', 'Little money; new fans digging.']),
      o('return', 'Aceitar a devolução', 'Accept the returns', (s, _r, c) => { pay(s, `r11ret:${c.release}`, 600, 'release', 'Devoluções'); }),
    ]),
  E('r11_rack_jobber', 'market', 'good', [], 24,
    (s, r) => {
      if (!label(s) || !era(s, 1960, 1995)) return null;
      const rel = myRels(s, (x) => s.week - x.week < 30 && x.totalUnits > 2000)[0];
      return rel && r.chance(0.15) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Supermercados querem "{releaseTitle}"', 'Supermarkets want "{releaseTitle}"'],
    ['Um distribuidor de gôndolas oferece espaço em 400 supermercados e farmácias para "{releaseTitle}", mas exige consignação e desconto alto.', 'A rack jobber offers space in 400 supermarkets and drugstores for "{releaseTitle}", but demands consignment and a deep discount.'],
    [
      o('accept', 'Aceitar', 'Accept', (s, _r, c) => { appeal(s, c, 1.15); gain(s, `r11rack:${c.release}`, 1500, 'release', 'Gôndolas'); rep(s, 'artistic', -1); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('r11_mail_order_club', 'market', 'neutral', [], 36,
    (s, r) => {
      if (!label(s) || !era(s, 1956, 2008)) return null;
      return r.chance(0.12) ? { amount: Math.round(3000 + s.player.reputation.commercial * 60) } : null;
    },
    ['Clube do disco por correio', 'Mail-order record club'],
    ['O clube "12 discos por 1 centavo" quer licenciar seu catálogo. Paga {amountTxt} à vista, mas os royalties por disco são quase nada.', 'The "12 records for a penny" club wants to license your catalog. It pays {amountTxt} upfront, but per-record royalties are almost nil.'],
    [
      o('license', 'Licenciar', 'License it', (s, _r, c) => { gain(s, 'r11club', Number(c.amount), 'royalties', 'Licença clube do disco'); rep(s, 'artists', -2); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('r11_phone_bundle', 'contract', 'good', [], 36,
    (s, r) => {
      if (!era(s, 2005, 2013)) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 40);
      return a && r.chance(0.15) ? { act: a.id, fee: feeBy(a, 8000, 200, 40000) } : null;
    },
    ['Celular vem com o disco de {act}', 'Phone ships with {act}\'s album'],
    ['Um fabricante de celulares quer pré-instalar o novo disco de {act} em milhões de aparelhos. Paga {feeTxt}, mas o álbum "aparece" na vida de quem não pediu.', 'A phone maker wants to preload {act}\'s new album on millions of handsets. It pays {feeTxt}, but the album "appears" for people who never asked.'],
    [
      o('accept', 'Aceitar', 'Accept', (s, r, c) => { const a = A(s, c); split(s, a, `r11phone:${a.id}`, Number(c.fee), 'brand', 'Parceria com celular'); fans(a, 80000, 2000); if (r.chance(0.4)) img(a, 'publicImage', -6); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('r11_exclusive_window', 'contract', 'neutral', [], 24,
    (s, r) => {
      if (s.year < 2014 || !plat(s, 'streaming')) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 35);
      return a && r.chance(0.15) ? { act: a.id, fee: feeBy(a, 6000, 250, 50000) } : null;
    },
    ['Exclusividade de streaming para {act}', 'Streaming exclusive for {act}'],
    ['Uma plataforma oferece {feeTxt} por duas semanas de exclusividade do próximo disco de {act}. As outras vão retaliar nas playlists.', 'A platform offers {feeTxt} for a two-week exclusive on {act}\'s next record. The others will retaliate on playlists.'],
    [
      o('exclusive', 'Fechar exclusividade', 'Go exclusive', (s, _r, c) => { const a = A(s, c); split(s, a, `r11excl:${a.id}`, Number(c.fee), 'streaming', 'Exclusividade'); mom(a, -4); fansMul(a, 0.97); }),
      o('everywhere', 'Lançar em todas', 'Release everywhere', noop),
    ]),
  E('r11_merch_bootleg', 'stage', 'bad', [], 18,
    (s, r) => {
      if (s.year < 1965) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 30 && recentGigLite(s, x));
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Camisetas piratas de {act}', 'Bootleg {act} T-shirts'],
    ['Do lado de fora de cada show, vendedores oferecem camisetas de {act} a metade do preço da banca oficial.', 'Outside every show, vendors sell {act} T-shirts at half the official stand price.'],
    [
      o('security', 'Contratar fiscalização', 'Hire enforcement', (s, _r, c) => { pay(s, `r11merch:${c.act}`, 900, 'touring', 'Fiscalização de merch'); gain(s, `r11merchg:${c.act}`, 1400, 'merch', 'Merch recuperado'); }),
      o('cheaper', 'Baixar o preço oficial', 'Lower the official price', (s, _r, c) => { const a = A(s, c); fans(a, 2000, 400, 100); }),
      o('ignore', 'Ignorar', 'Ignore it', noop),
    ]),
  E('r11_hack_leak', 'scandal', 'bad', [], 36,
    (s, r) => {
      if (!label(s) || s.year < 2010) return null;
      return r.chance(0.05) ? {} : null;
    },
    ['O selo foi hackeado', 'The label was hacked'],
    ['Hackers invadiram o servidor do selo: e-mails internos, demos inéditas e planilhas de royalties estão num fórum. Pedem resgate para parar.', 'Hackers broke into the label server: internal emails, unreleased demos and royalty spreadsheets are on a forum. They want a ransom to stop.'],
    [
      o('pay', 'Pagar o resgate', 'Pay the ransom', (s, r) => { pay(s, 'r11ransom', 5000, 'misc', 'Resgate'); if (r.chance(0.4)) rep(s, 'artists', -3); }, ['Nada garante que parem.', 'Nothing guarantees they stop.']),
      o('security', 'Contratar segurança digital e avisar artistas', 'Hire security and warn the artists', (s) => { pay(s, 'r11sec', 3000, 'hq', 'Segurança digital'); rep(s, 'artists', 1); }),
      o('nothing', 'Ignorar', 'Ignore it', (s) => { rep(s, 'artists', -4); rep(s, 'institutional', -2); }),
    ]),
];
// gigs recentes sem varrer memória: usa o cansaço como proxy (evita custo no find)
function recentGigLite(s: GameState, a: Act): boolean { return crew(s, a).some((p) => p.fatigue > 35); }

// =====================================================================================
// 4. INDÚSTRIA E MUNDO, por época
// =====================================================================================
const INDUSTRY: EventDef[] = [
  E('r11_jukebox_mob', 'business', 'neutral', ['crime'], 36,
    (s, r) => {
      if (!label(s) || !era(s, 1938, 1972)) return null;
      const rel = myRels(s, (x) => s.week - x.week < 20)[0];
      return rel && r.chance(0.15) ? { release: rel.id, act: rel.actId } : null;
    },
    ['"Amigos" das jukeboxes', 'Jukebox "friends"'],
    ['Dois senhores de terno controlam as jukeboxes de metade dos bares da cidade. Por uma "taxa de amizade", "{releaseTitle}" entra em todas.', 'Two gentlemen in suits control the jukeboxes in half the city\'s bars. For a "friendship fee", "{releaseTitle}" goes in every one.'],
    [
      o('pay', 'Pagar a taxa', 'Pay the fee', (s, r, c) => { pay(s, `r11mob:${c.release}`, 1800, 'marketing', 'Taxa das jukeboxes'); appeal(s, c, 1.2); if (r.chance(0.2)) { rep(s, 'institutional', -5); log(s, 'mob', 'Investigação liga o selo à máfia das jukeboxes.', 'An investigation ties the label to the jukebox mob.', {}, String(c.act)); } }),
      o('refuse', 'Recusar com educação', 'Politely refuse', (s, r, c) => { if (r.chance(0.3)) appeal(s, c, 0.9); }),
    ]),
  E('r11_indie_promoters', 'market', 'neutral', ['controversy'], 24,
    (s, r) => {
      if (!label(s) || !era(s, 1978, 2005) || !hasTech(s, 'fm')) return null;
      const rel = myRels(s, (x) => s.week - x.week < 10)[0];
      return rel && r.chance(0.18) ? { release: rel.id, act: rel.actId, fee: 2500 + Math.round(s.player.reputation.commercial * 40) } : null;
    },
    ['Promotores independentes de rádio', 'Independent radio promoters'],
    ['Não é jabá, juram: é "consultoria". Os promotores independentes cobram {feeTxt} para "{releaseTitle}" entrar na rotação de 200 rádios.', 'It is not payola, they swear: it is "consulting". The independent promoters charge {feeTxt} to get "{releaseTitle}" into rotation on 200 stations.'],
    [
      o('hire', 'Contratar', 'Hire them', (s, r, c) => { pay(s, `r11promo:${c.release}`, Number(c.fee), 'marketing', 'Promoção independente'); appeal(s, c, 1.25); if (r.chance(0.15)) { rep(s, 'institutional', -6); rep(s, 'artistic', -2); } }, ['Funciona; risco de investigação.', 'Works; risk of investigation.']),
      o('college', 'Focar nas rádios universitárias', 'Focus on college radio', (s, _r, c) => { pay(s, `r11college:${c.release}`, 400, 'marketing', 'Rádio universitária'); appeal(s, c, 1.06); rep(s, 'artistic', 1); }),
      o('none', 'Não pagar ninguém', 'Pay nobody', noop),
    ]),
  E('r11_8track_war', 'tech', 'neutral', [], 120,
    (s, r) => (label(s) && era(s, 1966, 1975) && r.chance(0.25) ? {} : null),
    ['Cartucho ou fita cassete?', 'Cartridge or cassette?'],
    ['Os carros saem de fábrica com toca-cartuchos de 8 pistas, mas o cassete compacto ganha lojas. Onde investir nas próximas tiragens?', 'Cars leave the factory with 8-track players, but the compact cassette is winning shops. Where to invest in the next runs?'],
    [
      o('eight', 'Apostar no cartucho', 'Bet on the 8-track', (s) => { pay(s, 'r11fmt8', 2500, 'release', 'Linha de cartuchos'); s.flags.r11bet8track = s.week; if (s.year < 1972) gain(s, 'r11fmt8g', 3500, 'release', 'Cartuchos'); else rep(s, 'commercial', -1); }, ['Bom no curto prazo; morre nos anos 80.', 'Good short term; dies in the 80s.']),
      o('cassette', 'Apostar no cassete', 'Bet on the cassette', (s) => { pay(s, 'r11fmtc', 2500, 'release', 'Linha de cassetes'); gain(s, 'r11fmtcg', s.year >= 1971 ? 4500 : 2000, 'release', 'Cassetes'); rep(s, 'commercial', 1); }),
      o('both', 'Dividir entre os dois', 'Split between both', (s) => { pay(s, 'r11fmtb', 1500, 'release', 'Formatos'); gain(s, 'r11fmtbg', 2200, 'release', 'Formatos'); }),
    ]),
  E('r11_quadraphonic', 'tech', 'neutral', [], 120,
    (s, r) => (label(s) && era(s, 1971, 1977) && r.chance(0.25) ? {} : null),
    ['Som quadrafônico', 'Quadraphonic sound'],
    ['Os fabricantes juram que o futuro é o som em quatro canais. Remixar o catálogo custa caro e há três padrões incompatíveis.', 'Manufacturers swear the future is four-channel sound. Remixing the catalog is costly and there are three incompatible standards.'],
    [
      o('go', 'Remixar o catálogo em quadrafonia', 'Remix the catalog in quad', (s) => { pay(s, 'r11quad', 4000, 'production', 'Remix quadrafônico'); rep(s, 'artistic', 1); gain(s, 'r11quadg', 1000, 'release', 'Edições quad'); }, ['Historicamente, um fiasco comercial.', 'Historically, a commercial flop.']),
      o('one', 'Só um disco de teste', 'Just one test record', (s) => { pay(s, 'r11quad1', 800, 'production', 'Teste quad'); }),
      o('wait', 'Esperar o mercado decidir', 'Wait for the market to decide', noop),
    ]),
  E('r11_dat', 'tech', 'neutral', [], 120,
    (s, r) => (label(s) && era(s, 1987, 1992) && r.chance(0.25) ? {} : null),
    ['A fita digital (DAT)', 'Digital audio tape (DAT)'],
    ['A fita digital copia um CD sem perda nenhuma. A associação das gravadoras quer bloqueá-la no Congresso e pede a sua contribuição.', 'Digital tape copies a CD with zero loss. The labels\' association wants to block it in Congress and asks for your contribution.'],
    [
      o('lobby', 'Contribuir com o lobby', 'Fund the lobby', (s) => { pay(s, 'r11dat', 1500, 'legal', 'Lobby antipirataria'); rep(s, 'institutional', 2); }),
      o('studio', 'Adotar DAT nos estúdios', 'Adopt DAT in the studios', (s) => { pay(s, 'r11datst', 2000, 'production', 'Gravadores DAT'); rep(s, 'artistic', 1); }),
      o('nothing', 'Ficar de fora', 'Stay out', noop),
    ]),
  E('r11_hidef_formats', 'tech', 'neutral', [], 120,
    (s, r) => (label(s) && era(s, 1999, 2006) && r.chance(0.25) ? {} : null),
    ['SACD ou DVD-Audio?', 'SACD or DVD-Audio?'],
    ['Duas mídias de alta resolução brigam pelo audiófilo enquanto os jovens baixam MP3 de 128 kbps. Vale relançar o catálogo?', 'Two high-res formats fight for audiophiles while the young download 128 kbps MP3s. Is reissuing the catalog worth it?'],
    [
      o('reissue', 'Relançar em alta resolução', 'Reissue in high resolution', (s) => { pay(s, 'r11hd', 3000, 'release', 'Alta resolução'); gain(s, 'r11hdg', 1500, 'release', 'Audiófilos'); rep(s, 'artistic', 2); }, ['Prestígio sim; lucro duvidoso.', 'Prestige yes; profit doubtful.']),
      o('digital', 'Investir em loja digital', 'Invest in digital storefronts', (s) => { pay(s, 'r11dig', 1500, 'release', 'Digitalização'); s.flags.r11digital = s.week; rep(s, 'commercial', 2); }),
      o('nothing', 'Nenhum dos dois', 'Neither', noop),
    ]),
  E('r11_sue_fans', 'world', 'neutral', ['controversy'], 60,
    (s, r) => (label(s) && era(s, 2000, 2008) && plat(s, 'p2p') && r.chance(0.2) ? {} : null),
    ['Processar os próprios fãs?', 'Sue your own fans?'],
    ['A associação das gravadoras vai processar milhares de usuários de P2P, inclusive uma avó e uma criança de 12 anos. Quer seu selo na lista de autores.', 'The labels\' association will sue thousands of P2P users, including a grandmother and a 12-year-old. It wants your label among the plaintiffs.'],
    [
      o('join', 'Assinar junto', 'Sign on', (s) => { pay(s, 'r11riaa', 1200, 'legal', 'Ações antipirataria'); rep(s, 'institutional', 2); rep(s, 'artists', -4); rep(s, 'artistic', -3); }),
      o('alt', 'Lançar loja de MP3 barata', 'Launch a cheap MP3 store', (s) => { pay(s, 'r11mp3', 2500, 'release', 'Loja digital'); rep(s, 'commercial', 2); rep(s, 'artistic', 1); }),
      o('out', 'Ficar de fora', 'Stay out', (s) => { rep(s, 'institutional', -1); }),
    ]),
  E('r11_drm', 'tech', 'neutral', [], 72,
    (s, r) => (label(s) && era(s, 2003, 2009) && plat(s, 'download_store') && r.chance(0.2) ? {} : null),
    ['Trava anticópia nos downloads', 'DRM on downloads'],
    ['A loja digital quer saber: as faixas do selo vão com DRM (só tocam em aparelhos autorizados) ou livres em MP3?', 'The digital store wants to know: will the label\'s tracks ship with DRM (only playable on authorized devices) or as free MP3s?'],
    [
      o('drm', 'Com DRM', 'With DRM', (s) => { rep(s, 'institutional', 1); rep(s, 'artistic', -1); s.flags.r11drm = s.week; }),
      o('free', 'MP3 livre', 'DRM-free MP3', (s, r) => { rep(s, 'artistic', 2); if (r.chance(0.5)) gain(s, 'r11freemp3', 1500, 'release', 'Downloads sem DRM'); }),
      o('later', 'Decidir depois', 'Decide later', noop),
    ]),
  E('r11_blog_buzz', 'market', 'good', [], 18,
    (s, r) => {
      if (!era(s, 2004, 2013) || !hasTech(s, 'internet')) return null;
      const a = pick(s, r, (x) => active(x) && x.fame < 30 && ['rock', 'electronic', 'hiphop', 'pop'].includes(fam(x)));
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Blogs de MP3 descobrem {act}', 'MP3 blogs discover {act}'],
    ['Três blogs influentes postaram a mesma faixa de {act} na mesma semana. Gravadoras rivais já mandaram e-mail para a banda.', 'Three influential blogs posted the same {act} track in the same week. Rival labels have already emailed the band.'],
    [
      o('free_ep', 'Liberar um EP grátis', 'Give away a free EP', (s, _r, c) => { const a = A(s, c); fans(a, 25000, 4000, 400); fame(a, 2); mom(a, 6); }),
      o('tour', 'Turnê de clubes em cidades universitárias', 'Club tour in college towns', (s, _r, c) => { const a = A(s, c); pay(s, `r11blog:${a.id}`, 1200, 'touring', 'Turnê de clubes'); fans(a, 12000, 3000, 600); mood(s, a, 'fatigue', 10); }),
      o('wait', 'Deixar rolar', 'Let it roll', (s, _r, c) => { const a = A(s, c); fans(a, 6000, 600); }),
    ]),
  E('r11_content_id', 'market', 'neutral', [], 48,
    (s, r) => (label(s) && s.year >= 2008 && plat(s, 'video_site') && r.chance(0.15) ? {} : null),
    ['Vídeos de fãs com suas músicas', 'Fan videos using your songs'],
    ['Milhares de vídeos de casamento, skate e gatos usam músicas do selo. O site oferece: derrubar todos, ou monetizar e ficar com a publicidade.', 'Thousands of wedding, skate and cat videos use label songs. The site offers: take them all down, or monetize and keep the ad money.'],
    [
      o('monetize', 'Monetizar', 'Monetize', (s) => { gain(s, 'r11cid', 2500, 'royalties', 'Monetização de vídeos'); rep(s, 'commercial', 1); }),
      o('takedown', 'Derrubar tudo', 'Take it all down', (s) => { rep(s, 'artistic', -2); rep(s, 'institutional', 1); }),
      o('allow', 'Deixar livre', 'Leave them free', (s) => { rep(s, 'artistic', 1); }),
    ]),
  E('r11_british_invasion', 'world', 'bad', [], 120,
    (s, r) => {
      if (!label(s) || !era(s, 1964, 1967)) return null;
      const a = pick(s, r, (x) => active(x) && mkt(x) === 'na' && ['pop', 'rock', 'rnb'].includes(fam(x)));
      return a && r.chance(0.35) ? { act: a.id } : null;
    },
    ['A invasão britânica', 'The British Invasion'],
    ['Bandas de Liverpool e Londres dominam as paradas americanas. Os programas de TV só querem franjas e sotaque. {act} perde espaço.', 'Liverpool and London bands rule the US charts. TV shows only want fringes and accents. {act} loses ground.'],
    [
      o('adapt', 'Mudar o visual e o som de {act}', 'Change {act}\'s look and sound', (s, _r, c) => { const a = A(s, c); pay(s, `r11brit:${a.id}`, 1500, 'artist_dev', 'Repaginação'); mom(a, 6); if (ambitionIn(s, a, 'art')) trust(a, -6); }),
      o('license', 'Licenciar bandas inglesas para o seu selo', 'License English bands for your label', (s) => { pay(s, 'r11britl', 3000, 'investment', 'Licença de catálogo inglês'); gain(s, 'r11britg', 5000, 'royalties', 'Licenças inglesas'); }),
      o('ride', 'Esperar a onda passar', 'Ride it out', (s, _r, c) => { const a = A(s, c); mom(a, -8); }),
    ]),
  E('r11_dotcom', 'business', 'neutral', [], 120,
    (s, r) => (label(s) && era(s, 1998, 2000) && r.chance(0.3) ? { amount: 15000 } : null),
    ['Uma ponto-com quer comprar parte do selo', 'A dot-com wants a stake in the label'],
    ['Uma startup com 30 funcionários e zero receita oferece {amountTxt} em ações por 20% do selo. "A música vai toda para a internet", dizem.', 'A startup with 30 staff and zero revenue offers {amountTxt} in stock for 20% of the label. "All music is moving online," they say.'],
    [
      o('stock', 'Aceitar em ações', 'Accept in stock', (s) => { s.flags.r11dotcom = s.week; rep(s, 'commercial', 1); }, ['Se a bolha estourar, vira pó.', 'If the bubble bursts, it becomes dust.']),
      o('cash', 'Exigir metade em dinheiro', 'Demand half in cash', (s, r, c) => { if (r.chance(0.4)) gain(s, 'r11dotcomc', Number(c.amount) * 0.5, 'investment', 'Venda de participação'); }),
      o('no', 'Recusar', 'Decline', noop),
    ]),
  E('r11_dotcom_burst', 'business', 'bad', [], 120,
    (s, r) => (s.flags.r11dotcom !== undefined && s.year >= 2001 && r.chance(0.6) ? {} : null),
    ['A bolha estourou', 'The bubble burst'],
    ['As ações da ponto-com que comprou parte do selo valem menos que um CD virgem. A empresa fechou e os sócios dela sumiram.', 'The shares of the dot-com that bought into the label are worth less than a blank CD. It shut down and its founders vanished.'],
    [
      o('buyback', 'Recomprar a participação por quase nada', 'Buy back the stake for almost nothing', (s) => { pay(s, 'r11burst', 500, 'investment', 'Recompra de participação'); delete s.flags.r11dotcom; }),
      o('shrug', 'Rir e seguir', 'Laugh and move on', (s) => { delete s.flags.r11dotcom; rep(s, 'commercial', -1); }),
    ]),
  E('r11_war_bonds', 'world', 'good', [], 24,
    (s, r) => {
      if (!era(s, 1942, 1945)) return null;
      const a = pick(s, r, (x) => active(x) && ['na', 'eu', 'oceania'].includes(mkt(x)));
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Show de bônus de guerra', 'War bond rally'],
    ['O governo quer {act} num comício de venda de bônus de guerra. Sem cachê, mas com rádio nacional ao vivo.', 'The government wants {act} at a war bond rally. No fee, but live on national radio.'],
    [
      o('play', 'Tocar', 'Play', (s, _r, c) => { const a = A(s, c); fame(a, 3); fans(a, 30000, 3000, 300); rep(s, 'institutional', 3); }),
      o('song', 'Gravar também uma canção patriótica', 'Also record a patriotic song', (s, r, c) => { const a = A(s, c); fame(a, 4); rep(s, 'institutional', 4); if (ambitionIn(s, a, 'art') && r.chance(0.5)) trust(a, -5); }),
      o('decline', 'Recusar', 'Decline', (s) => { rep(s, 'institutional', -3); }),
    ]),
  E('r11_space_novelty', 'culture', 'neutral', [], 60,
    (s, r) => {
      if (!era(s, 1957, 1970)) return null;
      const a = pick(s, r, (x) => active(x) && ['pop', 'rock', 'electronic'].includes(fam(x)));
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Febre espacial', 'Space fever'],
    ['Com satélites e foguetes nos jornais, todo mundo quer canções sobre o espaço. O produtor sugere um single de {act} com theremin e bipes.', 'With satellites and rockets in the papers, everyone wants space songs. The producer suggests an {act} single with theremin and beeps.'],
    [
      o('record', 'Gravar o single espacial', 'Record the space single', (s, r, c) => { const a = A(s, c); pay(s, `r11space:${a.id}`, 700, 'production', 'Single espacial'); if (r.chance(0.5)) { fame(a, 3); fans(a, 25000, 1000); gain(s, `r11spaceg:${a.id}`, 2000, 'release', 'Single novidade'); } else img(a, 'artistic', -3); }),
      o('pass', 'Deixar a moda para os outros', 'Leave the fad to others', noop),
    ]),
  E('r11_teen_mag', 'culture', 'good', [], 18,
    (s, r) => {
      if (!era(s, 1955, 1995)) return null;
      const a = pick(s, r, (x) => active(x) && ['pop', 'rock'].includes(fam(x)) && x.fame > 15 && x.positioning > 45);
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Pôster central da revista teen', 'Teen magazine centerfold'],
    ['A maior revista adolescente quer {act} no pôster central, com teste "Qual integrante é seu par ideal?".', 'The biggest teen magazine wants {act} on the centerfold, with a "Which member is your perfect match?" quiz.'],
    [
      o('yes', 'Topar tudo', 'Go all in', (s, _r, c) => { const a = A(s, c); fans(a, 40000, 5000); fame(a, 2); img(a, 'artistic', -3); }),
      o('serious', 'Só entrevista séria', 'Serious interview only', (s, _r, c) => { const a = A(s, c); fans(a, 8000, 1500, 200); }),
      o('no', 'Recusar', 'Decline', noop),
    ]),
  E('r11_pirate_radio', 'market', 'good', [], 36,
    (s, r) => {
      if (!era(s, 1964, 1967)) return null;
      const rel = myRels(s, (x) => s.week - x.week < 20 && !!s.acts[x.actId] && mkt(s.acts[x.actId]) === 'eu')[0];
      return rel && r.chance(0.3) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Rádio pirata toca "{releaseTitle}"', 'Pirate radio plays "{releaseTitle}"'],
    ['Um navio ancorado fora das águas territoriais transmite rock o dia inteiro e adotou "{releaseTitle}". A rádio estatal se recusa a tocar.', 'A ship anchored outside territorial waters broadcasts rock all day and adopted "{releaseTitle}". State radio refuses to play it.'],
    [
      o('ads', 'Comprar anúncios no navio', 'Buy ads on the ship', (s, _r, c) => { pay(s, `r11pirate:${c.release}`, 500, 'marketing', 'Rádio pirata'); appeal(s, c, 1.2); rep(s, 'institutional', -1); }),
      o('enjoy', 'Agradecer de longe', 'Thank them from afar', (s, _r, c) => { appeal(s, c, 1.1); }),
    ]),
  E('r11_mixtape_circuit', 'market', 'good', [], 18,
    (s, r) => {
      if (!era(s, 1985, 2012)) return null;
      const a = pick(s, r, (x) => active(x) && ['hiphop', 'rnb', 'caribbean'].includes(fam(x)) && x.fame < 50);
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['O DJ das mixtapes quer {act}', 'The mixtape DJ wants {act}'],
    ['O DJ que manda nas esquinas quer uma faixa exclusiva de {act} para a próxima mixtape. Sem contrato, sem nota fiscal, só rua.', 'The DJ who rules the street corners wants an exclusive {act} track for the next mixtape. No contract, no receipt, just the street.'],
    [
      o('give', 'Dar a faixa', 'Give the track', (s, _r, c) => { const a = A(s, c); fans(a, 15000, 4000, 700); img(a, 'artistic', 3); mom(a, 6); }),
      o('pay_host', 'Pagar para o DJ apresentar {act}', 'Pay the DJ to host {act}', (s, _r, c) => { const a = A(s, c); pay(s, `r11mix:${a.id}`, 800, 'marketing', 'Mixtape'); fans(a, 25000, 5000, 900); fame(a, 2); }),
      o('no', 'Recusar (pirataria)', 'Decline (piracy)', noop),
    ]),
  E('r11_rave_crackdown', 'world', 'bad', ['drugs'], 36,
    (s, r) => {
      if (!era(s, 1988, 1997)) return null;
      const a = pick(s, r, (x) => active(x) && fam(x) === 'electronic');
      return a && r.chance(0.25) ? { act: a.id } : null;
    },
    ['Polícia fecha as raves', 'Police shut down the raves'],
    ['Uma nova lei proíbe festas com "batidas repetitivas". As raves onde {act} se apresentava estão sendo invadidas.', 'A new law bans parties with "repetitive beats". The raves where {act} used to play are being raided.'],
    [
      o('legal_club', 'Migrar para clubes licenciados', 'Move to licensed clubs', (s, _r, c) => { const a = A(s, c); pay(s, `r11rave:${a.id}`, 1000, 'touring', 'Clubes licenciados'); fans(a, 5000, 800); a.positioning = clamp(a.positioning + 5, 0, 100); }),
      o('protest', 'Organizar protesto-rave', 'Organize a protest rave', (s, r, c) => { const a = A(s, c); fans(a, 0, 3000, 1500); img(a, 'artistic', 5); if (r.chance(0.4)) { scandal(a); rep(s, 'institutional', -4); } }),
      o('wait', 'Dar um tempo', 'Lie low', (s, _r, c) => { const a = A(s, c); mom(a, -6); }),
    ]),
  E('r11_loudness_war', 'tech', 'neutral', [], 36,
    (s, r) => {
      if (!label(s) || !era(s, 1995, 2012) || !hasTech(s, 'cd')) return null;
      const a = pick(s, r, (x) => active(x));
      return a && latestRel(s, a, 6) === undefined && r.chance(0.15) ? { act: a.id } : null;
    },
    ['A guerra do volume', 'The loudness war'],
    ['O engenheiro de masterização pergunta: deixar o próximo disco de {act} "mais alto que tudo no rádio" (e sem dinâmica nenhuma) ou respirando?', 'The mastering engineer asks: make {act}\'s next record "louder than everything on the radio" (with no dynamics at all) or let it breathe?'],
    [
      o('loud', 'No talo', 'Crank it', (s, _r, c) => { const a = A(s, c); mom(a, 4); img(a, 'artistic', -3); }),
      o('dynamic', 'Com dinâmica', 'Keep the dynamics', (s, _r, c) => { const a = A(s, c); img(a, 'artistic', 4); rep(s, 'artistic', 1); }),
      o('middle', 'Meio-termo', 'Middle ground', noop),
    ]),
  E('r11_scalpers', 'stage', 'neutral', ['controversy'], 24,
    (s, r) => {
      if (s.year < 2008) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 50);
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Robôs compram os ingressos de {act}', 'Bots buy up {act}\'s tickets'],
    ['A turnê de {act} esgotou em 4 minutos e reapareceu no mercado de revenda pelo quíntuplo. A tiqueteira sugere "preço dinâmico".', '{act}\'s tour sold out in 4 minutes and reappeared on resale at five times the price. The ticketing firm suggests "dynamic pricing".'],
    [
      o('dynamic', 'Adotar preço dinâmico', 'Adopt dynamic pricing', (s, _r, c) => { const a = A(s, c); split(s, a, `r11dyn:${a.id}`, feeBy(a, 3000, 100, 20000), 'touring', 'Preço dinâmico'); fansMul(a, 0.95, 0.95, 0.95); img(a, 'publicImage', -6); }),
      o('verified', 'Venda nominal verificada', 'Verified named tickets', (s, _r, c) => { const a = A(s, c); pay(s, `r11ver:${a.id}`, 1000, 'touring', 'Venda verificada'); fans(a, 0, 1500, 600); img(a, 'publicImage', 5); }),
      o('nothing', 'Deixar o mercado agir', 'Let the market act', (s, _r, c) => { const a = A(s, c); fansMul(a, 0.97, 0.97); }),
    ]),
  E('r11_virtual_concert', 'tech', 'good', [], 48,
    (s, r) => {
      if (!era(s, 2019, 2030)) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 35 && ['pop', 'hiphop', 'electronic'].includes(fam(x)));
      return a && r.chance(0.15) ? { act: a.id, fee: feeBy(a, 8000, 300, 60000) } : null;
    },
    ['Show dentro de um videogame', 'A concert inside a video game'],
    ['Um jogo online com milhões de jogadores quer um show virtual gigante de {act}, com avatar de 100 metros. Cachê: {feeTxt}.', 'An online game with millions of players wants a giant virtual {act} concert, with a 100-metre avatar. Fee: {feeTxt}.'],
    [
      o('accept', 'Aceitar', 'Accept', (s, _r, c) => { const a = A(s, c); split(s, a, `r11game:${a.id}`, Number(c.fee), 'sync', 'Show virtual'); fans(a, 120000, 6000); fame(a, 3); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('r11_algorithm_change', 'market', 'bad', [], 36,
    (s, r) => {
      if (s.year < 2015 || (!plat(s, 'short_video') && !plat(s, 'social'))) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 15);
      return a && r.chance(0.15) ? { act: a.id } : null;
    },
    ['O algoritmo mudou', 'The algorithm changed'],
    ['Do dia para a noite, os posts de {act} chegam a 3% dos seguidores. A rede quer que você "impulsione" o conteúdo.', 'Overnight, {act}\'s posts reach 3% of followers. The network wants you to "boost" the content.'],
    [
      o('boost', 'Pagar impulsionamento', 'Pay to boost', (s, _r, c) => { const a = A(s, c); pay(s, `r11boost:${a.id}`, 1200, 'marketing', 'Impulsionamento'); mom(a, 3); }),
      o('newsletter', 'Construir lista de e-mail e comunidade própria', 'Build an email list and own community', (s, _r, c) => { const a = A(s, c); pay(s, `r11news:${a.id}`, 500, 'marketing', 'Comunidade própria'); fans(a, 0, 1000, 600); }),
      o('nothing', 'Seguir postando', 'Keep posting', (s, _r, c) => { const a = A(s, c); mom(a, -5); }),
    ]),
  E('r11_radio_consolidation', 'world', 'bad', [], 120,
    (s, r) => (label(s) && era(s, 1996, 2003) && hasTech(s, 'fm') && r.chance(0.25) ? {} : null),
    ['Uma empresa compra 1.200 rádios', 'One company buys 1,200 stations'],
    ['Depois da desregulamentação, um só grupo controla a programação de rádios do país inteiro. As playlists ficaram iguais, decididas numa sala.', 'After deregulation, a single group controls station programming nationwide. Playlists are identical, decided in one room.'],
    [
      o('court', 'Cortejar o diretor nacional de programação', 'Court the national program director', (s) => { pay(s, 'r11cc', 2000, 'marketing', 'Relacionamento com rádio'); rep(s, 'commercial', 2); }),
      o('alt', 'Investir em rádio pela internet e TV', 'Invest in internet radio and TV', (s) => { pay(s, 'r11alt', 1500, 'marketing', 'Canais alternativos'); rep(s, 'artistic', 1); }),
      o('nothing', 'Seguir como está', 'Carry on', (s) => { rep(s, 'commercial', -1); }),
    ]),
  E('r11_video_banned', 'culture', 'neutral', ['controversy'], 24,
    (s, r) => {
      if (!plat(s, 'music_tv')) return null;
      const a = pick(s, r, (x) => active(x) && (traitIn(s, x, 'controversial') || traitIn(s, x, 'rebel') || traitIn(s, x, 'experimental')));
      return a && r.chance(0.18) ? { act: a.id } : null;
    },
    ['ClipNet bane o clipe de {act}', 'ClipNet bans {act}\'s video'],
    ['O canal de clipes 24 horas tirou o novo vídeo de {act} do ar por "conteúdo impróprio". Os fãs gravam a única exibição em VHS.', 'The 24-hour video channel pulled {act}\'s new video for "inappropriate content". Fans tape the only broadcast on VHS.'],
    [
      o('edit', 'Fazer versão editada', 'Make an edited version', (s, _r, c) => { const a = A(s, c); pay(s, `r11clip:${a.id}`, 800, 'marketing', 'Reedição de clipe'); mom(a, 3); trust(a, -3); }),
      o('scandal', 'Explorar a proibição', 'Exploit the ban', (s, r, c) => { const a = A(s, c); fans(a, 20000, 3000, 500); fame(a, 2); if (r.chance(0.3)) rep(s, 'institutional', -3); }),
      o('accept', 'Aceitar', 'Accept it', (s, _r, c) => { const a = A(s, c); mom(a, -3); }),
    ]),
  E('r11_pressing_queue', 'manufacturing', 'bad', [], 24,
    (s, r) => {
      if (!label(s) || !era(s, 2020, 2024)) return null;
      const rel = myRels(s, (x) => x.formats.includes('lp') && s.week - x.week < 12)[0];
      return rel && r.chance(0.3) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Fila de 9 meses nas fábricas de vinil', '9-month vinyl plant queue'],
    ['As poucas fábricas de vinil estão lotadas por megaestrelas. O LP de "{releaseTitle}" só sai daqui a três estações.', 'The few vinyl plants are booked by megastars. The "{releaseTitle}" LP only ships three seasons from now.'],
    [
      o('rush', 'Pagar taxa de urgência', 'Pay a rush fee', (s, _r, c) => { pay(s, `r11rush:${c.release}`, 2200, 'release', 'Taxa de urgência'); }),
      o('abroad', 'Prensar no exterior', 'Press abroad', (s, r, c) => { pay(s, `r11abroad:${c.release}`, 1200, 'release', 'Prensagem no exterior'); if (r.chance(0.3)) appeal(s, c, 0.94); }),
      o('wait', 'Esperar e vender pré-venda', 'Wait and sell pre-orders', (s, _r, c) => { appeal(s, c, 0.9); }),
    ]),
  E('r11_beach_movie', 'contract', 'good', [], 30,
    (s, r) => {
      if (!era(s, 1959, 1972)) return null;
      const a = pick(s, r, (x) => active(x) && ['pop', 'rock', 'brazil'].includes(fam(x)) && x.fame > 15);
      return a && r.chance(0.18) ? { act: a.id, fee: feeBy(a, 2500, 90, 10000) } : null;
    },
    ['Filme de praia com {act}', 'Beach movie with {act}'],
    ['Um estúdio de cinema quer {act} num filme de praia (≈ jovem guarda / beach party): roteiro fraco, bilheteria certa. Cachê {feeTxt}.', 'A film studio wants {act} in a beach movie (≈ beach party flicks): weak script, guaranteed box office. Fee {feeTxt}.'],
    [
      o('shoot', 'Filmar', 'Shoot it', (s, _r, c) => { const a = A(s, c); split(s, a, `r11beach:${a.id}`, Number(c.fee), 'sync', 'Filme'); fans(a, 40000, 3000); img(a, 'artistic', -4); mood(s, a, 'fatigue', 10); }),
      o('song_only', 'Só ceder a canção-tema', 'Only license the theme song', (s, _r, c) => { const a = A(s, c); split(s, a, `r11beachs:${a.id}`, Number(c.fee) * 0.35, 'sync', 'Tema de filme'); fans(a, 10000, 600); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('r11_transcription_discs', 'market', 'neutral', [], 36,
    (s, r) => (label(s) && era(s, 1930, 1952) && hasTech(s, 'radio') && r.chance(0.15) ? { amount: 1500 } : null),
    ['Discos de transcrição para rádio', 'Radio transcription discs'],
    ['Uma rede de rádio quer gravar o seu elenco em discos de 16 polegadas só para transmissão. Paga {amountTxt}, mas a música toca de graça no ar.', 'A radio network wants to record your roster on 16-inch discs for broadcast only. It pays {amountTxt}, but the music plays for free on air.'],
    [
      o('accept', 'Aceitar', 'Accept', (s, _r, c) => { gain(s, 'r11trans', Number(c.amount), 'royalties', 'Transcrições'); rep(s, 'commercial', 1); }),
      o('refuse', 'Recusar: o rádio mata as vendas', 'Refuse: radio kills sales', (s) => { rep(s, 'institutional', -1); }),
    ]),
  E('r11_streaming_payout_revolt', 'world', 'neutral', ['controversy'], 60,
    (s, r) => {
      if (s.year < 2012 || !plat(s, 'streaming')) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 40 && (ambitionIn(s, x, 'money') || ambitionIn(s, x, 'art')));
      return a && r.chance(0.12) ? { act: a.id } : null;
    },
    ['{act} quer tirar tudo do streaming', '{act} wants to pull everything from streaming'],
    ['Revoltado com frações de centavo por play, {act} quer retirar o catálogo das plataformas e escreveu uma carta aberta.', 'Furious about fractions of a cent per play, {act} wants to pull the catalog from the platforms and wrote an open letter.'],
    [
      o('pull', 'Tirar o catálogo', 'Pull the catalog', (s, _r, c) => { const a = A(s, c); trust(a, 12); fame(a, 2); mom(a, -10); rep(s, 'artistic', 2); }),
      o('negotiate', 'Negociar uma taxa melhor', 'Negotiate a better rate', (s, r, c) => { const a = A(s, c); if (r.chance(0.35 + s.player.reputation.commercial / 250)) { gain(s, `r11rate:${a.id}`, 2500, 'streaming', 'Taxa renegociada'); trust(a, 6); } else trust(a, -2); }),
      o('keep', 'Manter tudo no ar', 'Keep everything up', (s, _r, c) => { const a = A(s, c); trust(a, -8); }),
    ]),
];

export const MORE_EVENTS_11: EventDef[] = [...ARTISTS, ...VIRAL, ...LABEL, ...INDUSTRY];
