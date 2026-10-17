// R33 · REDES — JORNAL REFORMULADO (modelo puro, sem DOM). Antes de 2004 a rede social É o jornal; depois ele continua na
// mesa. Seções: Manchete, Música, Coluna social (boatos), Mundo, Paradas, Cartas do leitor, Nascimentos e casamentos e
// Classificados (os "apps" antes do celular). Toda matéria é clicável e abre o cartão de ações (ACOES5); a interface liga
// cada matéria ao cartão certo. Aqui só se monta o que cada seção mostra, a partir dos fatos e do estado.
// Forma por época: 1889 folha única → 1920 + revista de rádio → 1950 revista de fofoca e paradas → 1980 TV e fanzines →
// 1995 jornal + portal.

import { Rng } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { factById, facts17, type Fact } from '../facts17';
import { isFossati31 } from '../sys/amor31';
import { addHype } from '../sys/hype12';
import { pr18 } from '../sys/press18';
import type { Act, GameState } from '../types';
import { fmtL, playerActs } from '../util';
import { WORLD_VOICE33, boatos33, redes33, redes33On, type Res33 } from './redes33';
import { mundoNow33 } from './mundo33';

export type JSec33 = 'manchete' | 'musica' | 'coluna' | 'mundo' | 'paradas' | 'cartas' | 'nascimentos' | 'classificados';
export const JSEC33: Record<JSec33, L> = {
  manchete: l('Manchete', 'Headline'), musica: l('Música', 'Music'), coluna: l('Coluna social', 'Society column'), mundo: l('Mundo', 'World'),
  paradas: l('Paradas', 'Charts'), cartas: l('Cartas do leitor', 'Letters'), nascimentos: l('Nascimentos e casamentos', 'Births and weddings'), classificados: l('Classificados', 'Classifieds'),
};

export interface Paper33 { id: string; name: L; secs: JSec33[] }
/** As publicações da época: cada uma é uma aba da mesa, com as seções que traz. */
export function papers33(year: number): Paper33[] {
  const all: JSec33[] = ['manchete', 'musica', 'coluna', 'mundo', 'cartas', 'nascimentos', 'classificados'];
  if (year < 1920) return [{ id: 'folha', name: l('A Folha do Dia', 'The Daily Sheet'), secs: all }];
  if (year < 1950) return [
    { id: 'folha', name: l('A Folha do Dia', 'The Daily Sheet'), secs: all },
    { id: 'radio', name: l('Revista do Rádio', 'Radio Magazine'), secs: ['paradas', 'musica', 'cartas'] },
  ];
  if (year < 1980) return [
    { id: 'jornal', name: l('O Jornal', 'The Newspaper'), secs: ['manchete', 'mundo', 'nascimentos', 'classificados'] },
    { id: 'fofoca', name: l('Revista de Fofoca', 'Gossip Magazine'), secs: ['coluna', 'cartas', 'musica'] },
    { id: 'paradas', name: l('Revista de Paradas', 'Charts Magazine'), secs: ['paradas', 'musica'] },
  ];
  if (year < 1995) return [
    { id: 'jornal', name: l('O Jornal', 'The Newspaper'), secs: ['manchete', 'mundo', 'nascimentos', 'classificados'] },
    { id: 'tv', name: l('Guia da TV', 'TV Guide'), secs: ['musica', 'paradas'] },
    { id: 'fanzine', name: l('Fanzines', 'Fanzines'), secs: ['coluna', 'cartas'] },
  ];
  return [
    { id: 'jornal', name: l('O Jornal', 'The Newspaper'), secs: ['manchete', 'mundo', 'nascimentos', 'classificados', 'cartas'] },
    { id: 'portal', name: l('Portal Música', 'Music Portal'), secs: ['musica', 'coluna', 'paradas'] },
  ];
}

/** Ação de um cartão do Jornal: id de ACOES5 (ou 'r33.*' das ações novas desta frente). */
export type JKind33 = 'noticia' | 'boato' | 'oferta' | 'parada' | 'carta' | 'nasc' | 'anuncio';
export interface JItem33 {
  id: string;
  sec: JSec33;
  kind: JKind33;
  head: L;
  body?: L;
  fid?: string;
  actId?: string;
  /** nota do rodapé: "boato", "desmentido", cidade, posição… */
  tag?: L;
  /** anúncio classificado */
  ad?: string;
  /** carta: id estável */
  letter?: string;
  releaseId?: string;
}

// ---------------------------------------------------------------- classificados

export interface Classified33 { id: string; head: L; body: L; /** ações de ACOES5 que o anúncio aponta */ acts: string[]; from: number; to?: number; app: L }
/** Os "apps" antes do celular, em anúncio: cada um aponta para a ação certa que já existe. */
export const CLASSIFIED33: Classified33[] = [
  { id: 'coracao', head: l('Coração solitário', 'Lonely hearts'), body: l('Pessoa de bom gosto e boa conversa procura companhia para um jantar e um disco na vitrola.', 'A person of good taste and good conversation seeks company for dinner and a record on the gramophone.'), acts: ['chamarSair', 'encontro'], from: 1889, app: l('Encontros', 'Dating') },
  { id: 'imoveis', head: l('Imóveis', 'Property'), body: l('Salão com palco, ótimo ponto, perto do cais. Trato direto com o dono.', 'Hall with a stage, great spot near the docks. Deal directly with the owner.'), acts: ['ampliarSede', 'irCidade'], from: 1889, app: l('Imóveis', 'Property') },
  { id: 'correio', head: l('Catálogo pelo correio', 'Mail-order catalogue'), body: l('Móveis, instrumentos e curiosidades entregues em sua casa. Peça o catálogo.', 'Furniture, instruments and curiosities delivered to your door. Ask for the catalogue.'), acts: ['r33.cl.compras'], from: 1889, app: l('Compras', 'Shopping') },
  { id: 'musico', head: l('Procura-se músico', 'Musician wanted'), body: l('Banda de bairro precisa de voz e violão. Ensaios aos sábados.', 'Neighbourhood band needs a voice and a guitar. Rehearsals on Saturdays.'), acts: ['garimpar', 'contratarArtista'], from: 1889, app: l('Talentos', 'Talent') },
  { id: 'leilao', head: l('Leilão', 'Auction'), body: l('Grande leilão de discos, instrumentos e objetos de artistas. Visitação na véspera.', 'Great auction of records, instruments and artists\' belongings. Viewing the day before.'), acts: ['r33.cl.leilao'], from: 1889, app: l('Leilão', 'Auction') },
  { id: 'vagas', head: l('Empregos', 'Situations vacant'), body: l('Casa de discos admite auxiliar, secretária e técnico de som.', 'A record house is hiring an assistant, a secretary and a sound technician.'), acts: ['contratarFunc'], from: 1889, app: l('Contratar', 'Hiring') },
];
export const classifieds33 = (year: number): Classified33[] => CLASSIFIED33.filter((c) => year >= c.from && (!c.to || year <= c.to));

// ---------------------------------------------------------------- cartas do leitor

const LETTERS: [string, string][] = [
  ['Sou fã de {a} desde o primeiro disco. Escrevo para dizer obrigado.', 'I have been a fan of {a} since the first record. I write to say thank you.'],
  ['Ouvi {a} no rádio da vizinha e não consegui mais dormir. Que voz!', 'I heard {a} on the neighbour\'s radio and could not sleep. What a voice!'],
  ['Quando {a} vem a {c}? Meu irmão guardou dinheiro para o ingresso.', 'When is {a} coming to {c}? My brother saved up for the ticket.'],
  ['Não gostei da última música de {a}. Prefiro a antiga, mais sincera.', 'I did not like the latest song by {a}. I prefer the old one, more sincere.'],
  ['Minha avó cantarola {a} na cozinha. Três gerações na mesma canção.', 'My grandmother hums {a} in the kitchen. Three generations on the same song.'],
  ['Parabéns à redação pela cobertura de {a}. Mais disso, por favor.', 'Congratulations to the newsroom for its coverage of {a}. More of this, please.'],
  ['Li que {a} anda cansado. Que descanse, que a gente espera.', 'I read that {a} is tired. Let them rest, we will wait.'],
  ['Comprei o disco de {a} e a capa é a coisa mais bonita que já vi.', 'I bought the record by {a} and the sleeve is the prettiest thing I have seen.'],
  ['Por que ninguém toca {a} nas rádios de {c}? Reclamo em nome do bairro inteiro.', 'Why does nobody play {a} on the radio in {c}? I complain on behalf of the whole neighbourhood.'],
  ['Fui ao show de {a} e voltei rouco. Valeu cada centavo do ingresso.', 'I went to the {a} show and came back hoarse. Worth every penny of the ticket.'],
  ['Discordo do crítico: {a} é o melhor que apareceu em {c} nos últimos anos.', 'I disagree with the critic: {a} is the best thing to come out of {c} in years.'],
  ['Meu filho quer aprender violão por causa de {a}. A culpa é de vocês.', 'My son wants to learn guitar because of {a}. You are to blame.'],
  ['Alguém sabe a letra completa de {a}? Aposto uma rodada com o meu cunhado.', 'Does anyone know the full lyrics of {a}? I bet my brother-in-law a round.'],
  ['Cansei de ler fofoca sobre {a}. Falem da música, que é o que importa.', 'I am tired of gossip about {a}. Talk about the music, which is what matters.'],
  ['Guardei o recorte da entrevista de {a} na carteira desde março.', 'I have kept the clipping of the {a} interview in my wallet since March.'],
  ['Tocaram {a} no casamento da minha prima e a festa só acabou de manhã.', 'They played {a} at my cousin\'s wedding and the party only ended at dawn.'],
  ['Vocês exageram nos elogios a {a}. Bom, sim; gênio, calma.', 'You overpraise {a}. Good, yes; genius, easy now.'],
  ['Escrevo de {c}, onde {a} virou assunto até na fila do pão.', 'I write from {c}, where {a} has become the talk even in the bread queue.'],
  ['Pedi {a} três vezes na rádio e o locutor me atendeu. Ele merece um aumento.', 'I requested {a} three times on the radio and the host obliged. He deserves a raise.'],
  ['Antes eu achava {a} barulho. Agora acho que o barulho era eu.', 'I used to think {a} was noise. Now I think the noise was me.'],
  ['Sugiro que a redação publique a história de vida de {a}. Dá um livro.', 'I suggest the newsroom publish the life story of {a}. It would make a book.'],
  ['Dancei {a} a noite toda em {c}. Hoje só ando de chinelo.', 'I danced to {a} all night in {c}. Today I can only wear slippers.'],
  ['O disco de {a} chegou riscado. Quem me ajuda a reclamar?', 'My {a} record arrived scratched. Who can help me complain?'],
  ['Digam a {a} que {c} espera. Estamos arrumando a praça.', 'Tell {a} that {c} is waiting. We are tidying up the square.'],
];
export interface Letter33 { id: string; actId: string; text: L; done: boolean }
/** Três cartas por mês e por publicação, de artistas e modelos diferentes. Determinístico. */
export function cartas33(s: GameState, paper = ''): Letter33[] {
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a);
  const famous = Object.values(s.acts).filter((a) => a.fame >= 35).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1)).slice(0, 24);
  const pool = [...mine, ...famous.filter((a) => !mine.includes(a))];
  if (!pool.length) return [];
  const r = Rng.fromSeed(`${s.config.seed}|cartas33|${paper}|${s.year}|${s.month}`);
  const st = redes33(s);
  const usedA = new Set<string>(), usedT = new Set<number>();
  return [0, 1, 2].map((i) => {
    let a = pool[r.int(0, pool.length - 1)], k = 0;
    while (usedA.has(a.id) && k++ < 12) a = pool[r.int(0, pool.length - 1)];
    let ti = r.int(0, LETTERS.length - 1); k = 0;
    while (usedT.has(ti) && k++ < 12) ti = r.int(0, LETTERS.length - 1);
    usedA.add(a.id); usedT.add(ti);
    const id = `${paper ? `${paper}-` : ''}${s.year}-${s.month}-${i}`;
    return { id, actId: a.id, done: st.fx[`carta:${id}`] === '1', text: fmtL(l(LETTERS[ti][0], LETTERS[ti][1]), { a: a.name, c: cityById[a.city]?.name ?? l('nossa cidade', 'our town') }) };
  });
}
/** Responder a carta (ou ignorar): fã atendido rende um pouco de hype ao artista seu. */
export function answerLetter33(s: GameState, letter: string, how: 'answer' | 'ignore'): Res33 {
  const st = redes33(s), c = [...papers33(s.year).flatMap((p) => cartas33(s, p.id)), ...cartas33(s)].find((x) => x.id === letter);
  if (!c) return { ok: false, text: l('Essa carta já saiu da mesa.', 'That letter is gone from the desk.') };
  if (c.done) return { ok: false, text: l('Você já tratou dessa carta.', 'You already dealt with that letter.') };
  st.fx[`carta:${letter}`] = '1';
  if (how === 'ignore') return { ok: true, text: l('Carta arquivada.', 'Letter filed away.') };
  if (playerActs(s).includes(c.actId)) addHype(s, `a:${c.actId}`, 'redes33:carta', l('Carta de leitor respondida', 'Reader letter answered'), 0.8);
  return { ok: true, text: l('Resposta enviada: o leitor vai contar para os vizinhos.', 'Reply sent: the reader will tell the neighbours.') };
}

// ---------------------------------------------------------------- seções

const MUSIC = new Set(['release', 'chart', 'award', 'show', 'tour_done', 'tour_cancel', 'review', 'playlist', 'comeback', 'milestone', 'viral', 'remix_hit', 'revival_hit', 'contest_winner', 'signing', 'charity_show', 'charity_single']);
const BIRTHS = new Set(['birth', 'marriage']);
const publicFacts = (s: GameState, months: number): Fact[] => {
  const since = s.week - Math.round(months * 4.35), out: Fact[] = [];
  const fs = facts17(s).f;
  for (let i = fs.length - 1; i >= 0; i--) { const f = fs[i]; if (f.w < since) break; if (f.visibility === 'public' && f.src !== 'redes33') out.push(f); }
  return out;
};
const actOf = (s: GameState, f: Fact): Act | undefined => { for (const x of f.actors) { const k = x.startsWith('p:') ? x.slice(2) : x; if (s.acts[k]) return s.acts[k]; const a = Object.values(s.acts).find((y) => y.members.includes(k)); if (a) return a; } return undefined; };
const toItem = (s: GameState, sec: JSec33, f: Fact, kind: JKind33 = 'noticia'): JItem33 => {
  const a = actOf(s, f);
  return { id: `${sec}:${f.id}`, sec, kind, head: f.text, fid: f.id, actId: a?.id, tag: f.place && cityById[f.place] ? cityById[f.place].name : undefined };
};

/** Monta uma seção do Jornal a partir dos fatos e do estado. */
export function section33(s: GameState, sec: JSec33, paper = ''): JItem33[] {
  if (!redes33On(s)) return [];
  const romanceFossati = (f: Fact): boolean => ['romance', 'affair', 'marriage', 'breakup'].includes(f.kind) && f.actors.some((x) => isFossati31(s, x));
  switch (sec) {
    case 'manchete': {
      const fs = publicFacts(s, 3).filter((f) => !romanceFossati(f)).sort((a, b) => b.severity - a.severity || b.w - a.w);
      const top = fs[0];
      if (!top) return [];
      const it = toItem(s, 'manchete', top);
      return [it];
    }
    case 'musica': return publicFacts(s, 3).filter((f) => MUSIC.has(f.kind) && !romanceFossati(f)).slice(0, 8).map((f) => toItem(s, 'musica', f));
    case 'coluna': {
      const out: JItem33[] = [];
      const mine = boatos33(s);
      for (const { f, act } of mine.slice(0, 8)) out.push({ ...toItem(s, 'coluna', f, 'boato'), actId: act.id, tag: l('boato · seu elenco', 'rumour · your roster') });
      const seen = new Set(mine.map((x) => x.f.id));
      for (const f of facts17(s).f.slice(-120).reverse()) {
        if (out.length >= 10) break;
        if (f.visibility !== 'rumor' || seen.has(f.id) || s.week - f.w > 26 || romanceFossati(f)) continue;
        out.push({ ...toItem(s, 'coluna', f, 'noticia'), tag: l('boato', 'rumour') });
      }
      const b = pr18(s).bribe;
      if (b) out.push({ id: 'coluna:oferta', sec: 'coluna', kind: 'oferta', head: l('Oferta de "apoio editorial" na redação', 'An "editorial support" offer at the newsroom'),
        body: fmtL(l('O selo {lb} oferece dinheiro por uma resenha 80+.', 'The label {lb} offers money for an 80+ review.'), { lb: s.labels[b.lb]?.name ?? '?' }) });
      return out;
    }
    case 'mundo': {
      const out: JItem33[] = [];
      for (const w of mundoNow33(s)) out.push({ id: `mundo:${w.id}`, sec: 'mundo', kind: 'noticia', head: w.kind === 'crise' ? fmtL(l('{n}: a crise aperta o mercado da música.', '{n}: the crisis squeezes the music market.'), { n: w.label }) : w.label, tag: l(`${w.pct}%`, `${w.pct}%`) });
      for (const f of publicFacts(s, 6)) {
        if (out.length >= 8) break;
        if (['law', 'boycott', 'world_crisis', 'disaster', 'rate_shift', 'culture31', 'culture33', 'culture_shift', 'scene_boom', 'scene_bust', 'strike_settled'].includes(f.kind)) out.push(toItem(s, 'mundo', f));
      }
      return out;
    }
    case 'paradas': return s.charts.singles.slice(0, 10).map((e) => {
      const rel = s.releases[e.releaseId], a = rel ? s.acts[rel.actId] : undefined;
      return { id: `paradas:${e.releaseId}`, sec: 'paradas' as const, kind: 'parada' as const, head: l(`${e.pos}. ${rel?.title ?? '?'}`, `${e.pos}. ${rel?.title ?? '?'}`), body: l(a?.name ?? '?', a?.name ?? '?'), actId: a?.id, releaseId: e.releaseId, tag: l(`${e.weeks} sem.`, `${e.weeks} wk`) };
    });
    case 'cartas': return cartas33(s, paper).map((c) => ({ id: `cartas:${c.id}`, sec: 'cartas' as const, kind: 'carta' as const, head: c.text, actId: c.actId, letter: c.id, tag: c.done ? l('respondida', 'answered') : undefined }));
    case 'nascimentos': return publicFacts(s, 12).filter((f) => BIRTHS.has(f.kind) && !romanceFossati(f)).slice(0, 6).map((f) => ({ ...toItem(s, 'nascimentos', f), kind: 'nasc' as const }));
    case 'classificados': return classifieds33(s.year).map((c) => ({ id: `cl:${c.id}`, sec: 'classificados' as const, kind: 'anuncio' as const, head: c.head, body: c.body, ad: c.id, tag: c.app }));
  }
}

/** Voz de cada publicação: a mesma notícia sai com outro jeito de contar (abertura e fecho próprios por jornal/revista). */
const VOICE33: Record<string, { pre: string[]; post: string[] }> = {
  folha: { pre: ['Consta que|It is reported that', 'Sabe-se que|It is known that', 'Informam-nos que|We are informed that'], post: ['', ''] },
  jornal: { pre: ['', ''], post: ['', ''] },
  radio: { pre: ['Ouvintes, atenção:|Listeners, attention:', 'Direto da emissora:|Straight from the station:', 'Ao microfone:|On the air:'], post: ['Fiquem na sintonia.|Stay tuned.', 'Volto já.|Back in a moment.', ''] },
  fofoca: { pre: ['Exclusivo:|Exclusive:', 'Boca pequena:|Whispers say:', 'Sem querer fofocar, mas:|Not to gossip, but:'], post: ['E tem mais.|And there is more.', 'Quem diria.|Who would have thought.', 'Contem para as amigas.|Tell your friends.'] },
  paradas: { pre: ['Nas paradas:|On the charts:', 'Placar da semana:|This week\'s scoreboard:'], post: ['Acompanhe a subida.|Follow the climb.', ''] },
  tv: { pre: ['Na telinha:|On the screen:', 'Hoje na programação:|On tonight\'s schedule:', 'Imagens ao vivo:|Live pictures:'], post: ['Não perca.|Do not miss it.', ''] },
  fanzine: { pre: ['Zine #3:|Zine #3:', 'Recortado e colado:|Cut and pasted:', 'Direto da garagem:|Straight from the garage:'], post: ['Xerox livre.|Photocopy freely.', 'Passe adiante.|Pass it on.'] },
  portal: { pre: ['Veja:|See:', 'Em alta:|Trending:', 'Última hora:|Latest:'], post: ['Leia mais.|Read more.', 'Compartilhe.|Share.', ''] },
};
const hs = (x: string): number => { let h = 2166136261; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const pair = (x: string): L => { const i = x.indexOf('|'); return i < 0 ? l(x, x) : l(x.slice(0, i), x.slice(i + 1)); };
function voiced(p: string, it: JItem33): JItem33 {
  const v = VOICE33[p];
  if (!v || it.kind === 'anuncio' || it.kind === 'carta' || it.kind === 'parada') return it;
  const h0 = hs(`${p}|${it.id}`), pre = pair(v.pre[h0 % v.pre.length]), post = pair(v.post[(h0 >>> 4) % v.post.length]);
  if (!pre.pt && !post.pt) return it;
  const low = (x: string): string => (pre.pt && /[:,]$/.test(pre.pt) ? x.charAt(0).toLowerCase() + x.slice(1) : x);
  const head = l(`${pre.pt ? `${pre.pt} ` : ''}${low(it.head.pt)}${post.pt ? ` ${post.pt}` : ''}`, `${pre.en ? `${pre.en} ` : ''}${pre.en && /[:,]$/.test(pre.en) ? it.head.en.charAt(0).toLowerCase() + it.head.en.slice(1) : it.head.en}${post.en ? ` ${post.en}` : ''}`);
  return { ...it, head };
}

export interface Jornal33 { year: number; papers: Paper33[]; voice: L; sections: Record<JSec33, JItem33[]>; /** o que cada publicação traz: as seções repartidas entre elas e na voz de cada uma */ byPaper: Record<string, Record<JSec33, JItem33[]>> }
export function jornal33(s: GameState): Jornal33 {
  const papers = papers33(s.year);
  const need = new Set(papers.flatMap((p) => p.secs));
  const sections = {} as Record<JSec33, JItem33[]>;
  for (const k of Object.keys(JSEC33) as JSec33[]) sections[k] = need.has(k) ? section33(s, k) : [];
  const byPaper: Record<string, Record<JSec33, JItem33[]>> = {};
  for (const p of papers) byPaper[p.id] = Object.fromEntries((Object.keys(JSEC33) as JSec33[]).map((k) => [k, []])) as unknown as Record<JSec33, JItem33[]>;
  for (const k of Object.keys(JSEC33) as JSec33[]) {
    const carriers = papers.filter((p) => p.secs.includes(k));
    carriers.forEach((p, i) => {
      let items = k === 'cartas' ? section33(s, k, p.id) : sections[k];
      if (carriers.length > 1 && k !== 'cartas' && k !== 'classificados' && items.length >= carriers.length) items = items.filter((_, j) => j % carriers.length === i);
      byPaper[p.id][k] = items.map((it) => voiced(p.id, it));
    });
  }
  return { year: s.year, papers, voice: WORLD_VOICE33(s.year), sections, byPaper };
}
export { factById };
