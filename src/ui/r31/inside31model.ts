// R31 · onda 4 (I + S) — INTERIORES DOS LUGARES em cena (modelo PURO, sem DOM). Todos os 12 interiores do Nosso mundo
// e os do submundo (fachada, sala dos fundos, baile, delegacia, beco) seguem as regras das cenas da onda 2:
//   · sempre interativos: pessoas E objetos clicáveis, com dica e ação (a tabela "Ações por lugar" do plano);
//   · o seu personagem está lá quando você está na cidade (senão o aviso diz onde você está);
//   · gente de verdade: dono, equipe (músicos fazendo bico), quem está lá nesta semana — seguindo a agenda;
//   · seu rastro no mundo: seu disco na prateleira e no toca-discos, seu cartaz na porta, sua música no ar, seu
//     artista no ensaio ou no estúdio.
// O mesmo registro desenha a cena, monta a lista acessível e diz o que cada clique faz. Montar o modelo só lê.

import { l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { cityById } from '../../data/world';
import { playerPerson } from '../../sim/sys/life';
import { homeShowSoon, placeActs27, type PAct27, type Person27, type Place27, type PlaceK27 } from '../../sim/sys/place27';
import { playingThisWeek31, tourCity31 } from '../../sim/sys/where31';
import { geom27, interior27, liftOf27, placePeople27, type IKind27, type Interior27, type PropT27 } from '../pixel/interior27';
import { alertOf31, type Badge31, type Spot31 } from './scene31model';
import { youAt31 } from './salas31model';
import { bailes31, bmRows31, cells31, myFile31, room31, type BmRow31 } from '../../sim/sys/under31';
import { artItems31, artSpots31, dressRoom31 } from './art31model';
import type { ArtItem31 } from '../pixel/props31';

export const INSIDE_W31 = 360;

/** O que entra numa cena de interior. */
export interface InsideT31 {
  id: string; k: IKind27; name: string; what?: string; people: Person27[]; year: number; city: string; seed: string;
  /** lugar de terceiros (ações do place27) */ place?: Place27;
  /** prédio seu (gestão) */ own?: boolean;
  /** fachada: facção e o tipo (restaurante, boate…) */ org?: string; v?: string;
}
export interface InsideM31 {
  id: string; k: IKind27; title: L; what: L; year: number; W: number; H: number;
  room: Interior27; people: Person27[]; spots: Spot31[];
  you: { here: boolean; where: L };
  /** seu rastro no mundo (uma frase por marca) */ trail: L[];
  acts: PAct27[];
  note?: L;
  /** r31 (ART2): adereços novos pintados por cima da mobília da época (props31) */
  art: ArtItem31[];
}

// ---------------------------------------------------------------- objetos clicáveis por lugar (a tabela do plano)

interface ObjDef31 { prop: PropT27 | null; at?: [number, number]; id: string; label: L; tip: L; go: string }
const O = (prop: PropT27 | null, id: string, label: L, tip: L, go: string, at?: [number, number]): ObjDef31 => ({ prop, id, label, tip, go, at });

const OBJS31: Partial<Record<IKind27, ObjDef31[]>> = {
  venue: [
    O('stage', 'stage', l('Palco', 'Stage'), l('Marcar uma data para um artista seu.', 'Book a date for one of your acts.'), 'do:show'),
    O('counter', 'box', l('Bilheteria', 'Box office'), l('Lotação da casa e o cachê de costume.', 'Capacity and the usual fee.'), 'info:box'),
    O('poster', 'bill', l('Cartaz', 'Poster'), l('Quem toca nesta semana.', 'Who plays this week.'), 'info:bill'),
  ],
  records: [
    O('racks', 'shelf', l('Prateleira', 'Shelf'), l('Seus discos e os mais vendidos da cidade.', 'Your records and the city\'s best sellers.'), 'info:shelf'),
    O('counter', 'counter', l('Balcão', 'Counter'), l('Ação de vitrine: seu disco na vitrine e tarde de autógrafos.', 'Window display: your record in the window and a signing.'), 'do:instore'),
    O('bins', 'crowd', l('Clientes', 'Customers'), l('O que o público está ouvindo.', 'What people are listening to.'), 'info:crowd'),
    O('listen', 'deck', l('Toca-discos', 'Turntable'), l('O que está tocando na loja.', 'What the shop is playing.'), 'info:deck'),
  ],
  radio: [
    O('booth', 'booth', l('Cabine do locutor', 'Presenter\'s booth'), l('Pedir execução da sua música.', 'Ask for your song to be played.'), 'do:pitch'),
    O('onair', 'onair', l('No ar', 'On air'), l('O que está tocando agora.', 'What is playing now.'), 'info:onair'),
    O('console', 'pd', l('Mesa do diretor', 'Director\'s desk'), l('Parceria: jantar com o diretor de programação.', 'Partnership: dinner with the programme director.'), 'do:lunch'),
  ],
  studio: [
    O('console', 'desk', l('Mesa de som', 'Mixing desk'), l('Alugar uma sessão para um artista seu.', 'Rent a session for one of your acts.'), 'do:rent'),
    O('foam', 'live', l('Sala de gravação', 'Live room'), l('Quem está gravando aqui.', 'Who is recording here.'), 'info:live'),
  ],
  bar: [
    O('stage', 'stage', l('Palquinho', 'Small stage'), l('Ver quem toca (descobrir talento) ou marcar uma noite.', 'See who plays (discover talent) or book a night.'), 'info:stage'),
    O('counter', 'counter', l('Balcão', 'Bar counter'), l('Conhecer gente: quem está no balcão.', 'Meet people: who is at the bar.'), 'info:meet'),
    O('tables', 'tables', l('Mesa', 'Table'), l('Encontros marcados e quem está na casa.', 'Meetings and who is in.'), 'info:tables'),
  ],
  press: [
    O('typewriters', 'desks', l('Redação', 'Newsroom'), l('Mandar um release ou marcar entrevista.', 'Send a release or book an interview.'), 'do:news'),
    O('screens', 'desks', l('Redação', 'Newsroom'), l('Mandar um release ou marcar entrevista.', 'Send a release or book an interview.'), 'do:news'),
    O('cork', 'cover', l('Capa da semana', 'This week\'s cover'), l('A manchete da semana.', 'The headline of the week.'), 'info:cover'),
  ],
  rehearsal: [
    O('drums', 'bands', l('Bandas ensaiando', 'Bands rehearsing'), l('Descobrir talento: quem ensaia aqui.', 'Discover talent: who rehearses here.'), 'info:bands'),
    O('couch', 'agenda', l('Agenda da sala', 'Room schedule'), l('Alugar a sala para os seus artistas.', 'Rent the room for your acts.'), 'do:rehearse'),
  ],
  label: [
    O('gold', 'gold', l('Parede de discos de ouro', 'Gold record wall'), l('O catálogo do rival.', 'The rival\'s catalogue.'), 'info:gold'),
    O('desk', 'ceo', l('Sala do CEO', 'CEO\'s office'), l('Conversar, propor sociedade ou compra.', 'Talk, propose a partnership or a buyout.'), 'go:labels'),
  ],
  office: [O('desk', 'hire', l('Recepção', 'Front desk'), l('Contratar o serviço (advocacia, contabilidade, agência).', 'Hire the service (law, accounting, agency).'), 'go:office')],
  apartments: [O('window', 'res', l('Moradores', 'Residents'), l('Quem mora aqui e você conhece.', 'Who lives here that you know.'), 'info:res')],
  hotel: [O('counter', 'desk', l('Recepção', 'Reception'), l('Quem está hospedado: artistas em turnê na cidade.', 'Who is staying: touring acts in town.'), 'info:guests')],
  instruments: [
    O('guitars', 'wall', l('Parede de instrumentos', 'Instrument wall'), l('Comprar para você, para a empresa ou de presente.', 'Buy for yourself, the company or as a gift.'), 'go:shop'),
    O('counter', 'counter', l('Balcão', 'Counter'), l('A loja nova: estoque do mês.', 'The new shop: this month\'s stock.'), 'go:shop'),
  ],
  // submundo
  facade: [
    O('door', 'back', l('Porta dos fundos', 'Back door'), l('Entrar na sala dos fundos (o chefe e a mesa).', 'Go into the back room (the boss and the table).'), 'room:enter'),
    O('counter', 'front', l('A casa', 'The front'), l('O que a fachada é e quem frequenta.', 'What the front is and who goes there.'), 'info:front'),
  ],
  backroom: [
    O('desk', 'table', l('Mesa', 'Table'), l('Pedidos em aberto e envelopes: o que você deve e o que te devem.', 'Open requests and envelopes: what you owe and what you are owed.'), 'info:table'),
    O('safe', 'safe', l('Cofre', 'Safe'), l('Seus favores, dívidas e a relação com a família.', 'Your favours, debts and standing with the family.'), 'info:safe'),
    O('door', 'out', l('Sair', 'Leave'), l('Voltar para a frente da casa.', 'Back to the front of the house.'), 'room:leave'),
  ],
  baile: [
    O('stage', 'stage', l('Palco do baile', 'Party stage'), l('Seu artista no palco: tocar até o fim, sair antes ou chamar a imprensa.', 'Your act on stage: play to the end, leave early or call the press.'), 'info:baile'),
    O('counter', 'box', l('Camarote', 'VIP box'), l('O chefe assiste daqui.', 'The boss watches from here.'), 'info:box'),
  ],
  police: [
    O('cells', 'cells', l('Celas', 'Cells'), l('Quem está preso agora e quanto falta.', 'Who is locked up now and how long is left.'), 'info:cells'),
    O('desk', 'file', l('Sua pasta', 'Your file'), l('O que a polícia já sabe de você, o calor e o detetive do caso.', 'What the police know about you, the heat and the case detective.'), 'info:file'),
    O('cork', 'heat', l('Mapa do calor', 'Heat map'), l('Viaturas e paradas na região.', 'Patrols and stops in the area.'), 'info:heat'),
  ],
  market: [
    O('crates', 'crates', l('Caixotes', 'Crates'), l('Cópias piratas e equipamento roubado (estoque do mês).', 'Bootleg copies and stolen gear (this month\'s stock).'), 'info:bm'),
    O('guitars', 'gear', l('Equipamento', 'Gear'), l('Equipamento roubado: barato, com risco.', 'Stolen gear: cheap, with risk.'), 'info:bm'),
    O('bins', 'copies', l('Pilhas de cópias', 'Stacks of copies'), l('Cópias piratas dos sucessos.', 'Bootleg copies of the hits.'), 'info:bm'),
  ],
};

// ---------------------------------------------------------------- você e o seu rastro

/** Você no lugar: presente quando está na cidade (turnê ou gravação fora tiram você da cena). */
export function youIn31(s: GameState, name: string): { here: boolean; where: L; who?: Person27 } {
  const y = youAt31(s);
  const p = playerPerson(s);
  if (!y.here) return { here: false, where: y.where };
  return { here: true, where: fmtL(l('Você está em {p}.', 'You are at {p}.'), { p: name }), who: { name: p?.name ?? s.config.companyName, role: l('Você', 'You'), pid: p?.id, you: true, mine: true } };
}

/** Seu rastro no mundo dentro do lugar. */
export function trail31(s: GameState, k: IKind27): L[] {
  const out: L[] = [];
  const mine = new Set(playerActs(s));
  if (k === 'records') {
    const rs = [...s.charts.albums, ...s.charts.singles].slice(0, 60).map((e) => s.releases[e.releaseId]).filter((r) => r && r.owner === 'player');
    if (rs[0]) out.push(fmtL(l('Seu disco no toca-discos da loja: "{t}".', 'Your record on the shop turntable: "{t}".'), { t: rs[0].title }));
    if (rs.length > 1) out.push(fmtL(l('{n} disco(s) seu(s) na prateleira.', '{n} of your records on the shelf.'), { n: rs.length }));
  } else if (k === 'venue') {
    const sh = homeShowSoon(s);
    if (sh) out.push(fmtL(l('Seu cartaz na porta: {a} em {d} dia(s).', 'Your poster at the door: {a} in {d} day(s).'), { a: s.acts[sh.t.actId]?.name ?? '?', d: sh.st.day - s.day }));
  } else if (k === 'radio') {
    const rot = (s.x4 as unknown as { radio18?: { rot?: Record<string, unknown[]> } }).radio18?.rot ?? {};
    const rel = Object.keys(rot).map((id) => s.releases[id]).find((x) => x?.owner === 'player' && (rot[x.id]?.length ?? 0) > 0);
    if (rel) out.push(fmtL(l('Sua música no ar: "{t}".', 'Your song on air: "{t}".'), { t: rel.title }));
  } else if (k === 'rehearsal') {
    const cd = (s.x4 as unknown as { place27?: { cd: Record<string, number> } }).place27?.cd ?? {};
    for (const id of mine) if ((cd[`re:${id}`] ?? 0) > s.week) out.push(fmtL(l('{a} ensaiou aqui este mês.', '{a} rehearsed here this month.'), { a: s.acts[id]?.name ?? '?' }));
  } else if (k === 'studio') {
    for (const x of s.sessions ?? []) if (!x.done && mine.has(x.actId) && (x.tier ?? 0) >= 1) out.push(fmtL(l('{a} grava aqui (sessão alugada).', '{a} is recording here (rented session).'), { a: s.acts[x.actId]?.name ?? '?' }));
  } else if (k === 'police') {
    const n = cells31(s).filter((c) => c.mine).length;
    if (n) out.push(fmtL(l('{n} pessoa(s) sua(s) nas celas.', '{n} of your people in the cells.'), { n }));
  }
  return out;
}

// ---------------------------------------------------------------- modelo

const actsOfPlace = (s: GameState, x: InsideT31): PAct27[] => (x.place ? placeActs27(s, x.place) : []);

/** Faixa vertical do ponto clicável: o que pende na parede fica em cima, o que fica no chão embaixo, o alto ocupa tudo
 *  (dois objetos na mesma coluna — cartaz sobre o balcão — não disputam o clique). */
const WALL31 = new Set<PropT27>(['poster', 'window', 'gold', 'onair', 'cork', 'keys', 'bottles', 'screens', 'typewriters']);
const FLOOR31 = new Set<PropT27>(['counter', 'tables', 'bins', 'listen', 'desk', 'couch', 'crates', 'drums', 'amp', 'piano', 'safe', 'roulette', 'mic', 'jukebox', 'plant', 'tv']);
function vband(t: PropT27 | null, G: ReturnType<typeof geom27>): [number, number] {
  const top = G.y0 + 6, mid = G.y0 + Math.round((G.fy - G.y0) * 0.5);
  if (t && WALL31.has(t)) return [top, mid - top];
  if (t && FLOOR31.has(t)) return [mid, G.fy - mid];
  return [top, G.fy - top];
}

export function insideModel31(s: GameState, x: InsideT31): InsideM31 {
  const W = INSIDE_W31;
  const you = youIn31(s, x.name);
  const people = [...(you.who ? [you.who] : []), ...x.people.filter((p) => !p.away)];
  const room = dressRoom31(s, x, interior27(x.k, x.year, people.length, x.v));
  const G = geom27(W);
  const acts = actsOfPlace(s, x);
  const trail = trail31(s, x.k);
  const spots: Spot31[] = [];
  const lockOf = (id: string): L | undefined => acts.find((a) => a.id === id)?.dis;
  // objetos
  const seen = new Set<string>();
  for (const o of OBJS31[x.k] ?? []) {
    if (seen.has(o.id)) continue;
    const pr = o.prop ? room.props.find((p) => p.t === o.prop) : undefined;
    if (o.prop && !pr) continue;
    seen.add(o.id);
    const px = pr ? G.X(pr.x) : G.X(o.at?.[0] ?? 0.5), pw = pr ? Math.max(14, pr.w ? G.Wd(pr.w) : 16) : G.Wd(o.at?.[1] ?? 0.1);
    const [py, ph] = vband(pr?.t ?? null, G);
    const go = o.go;
    const lk = go.startsWith('do:') ? lockOf(go.slice(3)) : undefined;
    if (go.startsWith('do:') && !acts.some((a) => a.id === go.slice(3))) continue; // ação que este lugar não tem (rádio antes de 1922…)
    const badge = badgeOf(s, x, o.id, trail);
    spots.push({ id: o.id, x: px, y: py, w: pw, h: ph, label: o.label, tip: lk ? fmtL(l('{t} 🔒 {w}', '{t} 🔒 {w}'), { t: o.tip, w: lk }) : o.tip, go: { panel: go }, badge, quiet: false });
  }
  // r31 (ART2): objetos novos ligados às mecânicas (jukebox, parada, telefone, vitrine, carro na porta…)
  spots.push(...artSpots31(s, x, room, W));
  // gestão do lugar quando é seu
  if (x.own) spots.push({ id: 'mgmt', x: G.X(0.42), y: G.y0 + 2, w: G.Wd(0.16), h: 12, label: l('Gestão', 'Management'), tip: l('Equipe, caixa do lugar e programação.', 'Staff, the place\'s cash and programming.'), go: { panel: 'go:own' } });
  // pessoas (o mesmo cálculo da pintura)
  placePeople27(room, people).forEach(([p, sp0]) => {
    const i = people.indexOf(p);
    const fx = G.X(sp0.x), fyy = G.fy - liftOf27(room, sp0);
    const role = p.away ? fmtL(l('{r} (fora: {w})', '{r} (away: {w})'), { r: p.role, w: p.away }) : p.role;
    const short = /^[a-zà-ú]/.test(p.name) ? p.role : l(p.name.split(' ')[0], p.name.split(' ')[0]); // "a cúpula de…" vira o papel
    spots.push({ id: p.you ? 'you' : `who:${i}`, x: fx - 7, y: fyy - 31, w: 14, h: 32, label: p.you ? l('Você', 'You') : short,
      tip: p.you ? you.where : fmtL(l('{n} — {r}', '{n} — {r}'), { n: p.name, r: role }), go: p.you ? { panel: 'you' } : { panel: `who:${i}` },
      quick: p.actId ? { kind: 'act', id: p.actId } : undefined, quiet: true,
      badge: p.bico ? { text: l('bico', 'day job'), level: 'info', sym: '♪' } : p.cell ? { text: l('preso', 'jailed'), level: 'info', sym: '⛓' } : undefined });
  });
  const city = cityById[x.city]?.name;
  return {
    id: x.id, k: x.k, title: l(x.name, x.name), what: l(x.what ?? '', x.what ?? ''), year: x.year, W, H: G.H, room, people, spots, you, trail, acts, art: artItems31(s, x),
    note: you.here ? undefined : fmtL(l('{w} — você olha de longe; as ações seguem valendo.', '{w} — you look from afar; actions still work.'), { w: you.where }),
    ...(city ? {} : {}),
  };
}

/** Selo de um objeto: rastro seu (★), pendência (baile/pedido com prazo), presos seus. Texto + símbolo, nunca só cor. */
function badgeOf(s: GameState, x: InsideT31, id: string, trail: L[]): Badge31 | undefined {
  if (x.k === 'records' && id === 'deck' && trail.length) return { text: l('seu disco', 'your record'), level: 'info', sym: '★' };
  if (x.k === 'venue' && id === 'bill') { const n = playingThisWeek31(s).length; if (trail.length) return { text: l('seu cartaz', 'your poster'), level: 'info', sym: '★' }; if (n) return { text: fmtL(l('{n} data(s)', '{n} date(s)'), { n }), level: 'info' }; }
  if (x.k === 'radio' && id === 'onair' && trail.length) return { text: l('sua música', 'your song'), level: 'info', sym: '★' };
  if (x.k === 'police' && id === 'cells') { const c = cells31(s); if (c.length) return { text: fmtL(l('{n} preso(s)', '{n} jailed'), { n: c.length }), level: c.some((y) => y.mine) ? 'soon' : 'info' }; }
  if (x.k === 'police' && id === 'file') { const f = myFile31(s); const ch = f.cases.filter((c) => c.stage === 'charged'); if (ch.length) return { text: fmtL(l('{n} indiciamento(s)', '{n} charge(s)'), { n: ch.length }), level: alertOf31(ch[0].dl, s.week, 2) }; }
  if ((x.k === 'backroom' && id === 'table') || (x.k === 'facade' && id === 'back')) {
    const r = x.org ? room31(s, x.org) : null;
    const asks = r?.rows.filter((y) => y.kind === 'ask') ?? [];
    if (asks.length) return { text: fmtL(l('{n} pedido(s)', '{n} request(s)'), { n: asks.length }), level: alertOf31(Math.min(...asks.map((a) => a.due ?? 1e9)), s.week) };
  }
  if (x.k === 'baile' && id === 'stage') { const b = bailes31(s).find((y) => y.o.id === x.org); if (b) return { text: l('convite', 'invitation'), level: alertOf31(b.due, s.week) }; }
  if (x.k === 'market' && id === 'crates') { const n = bmRows31(s).length; if (n) return { text: fmtL(l('{n} à venda', '{n} for sale'), { n }), level: 'info' }; }
  return undefined;
}

// ---------------------------------------------------------------- painéis de informação (linhas prontas, só leitura)

export function infoLines31(s: GameState, m: Pick<InsideM31, 'k' | 'people'>, key: string, x?: Pick<InsideT31, 'place' | 'org'>): L[] {
  const out: L[] = [];
  const mine = new Set(playerActs(s));
  const rel = (id: string) => s.releases[id];
  switch (key) {
    case 'bill': {
      const ws = playingThisWeek31(s);
      for (const w of ws.slice(0, 6)) { const a = s.acts[w.actId]; if (a) out.push(fmtL(l('{a} — em {d} dia(s){m}', '{a} — in {d} day(s){m}'), { a: a.name, d: w.day - s.day, m: mine.has(a.id) ? l(' (seu)', ' (yours)') : l('', '') })); }
      if (!ws.length) out.push(l('Nenhuma data marcada nesta semana: a casa está livre.', 'No dates booked this week: the house is free.'));
      break;
    }
    case 'box': {
      const v = x?.place?.venue ? (x.place.sale !== undefined ? fmtL(l('Casa à venda.', 'The venue is for sale.'), {}) : null) : null;
      const cap = x?.place?.venue ? null : null;
      void cap;
      out.push(m.k === 'baile' ? l('O chefe e os convidados dele no camarote. A polícia pode chegar a qualquer momento.', 'The boss and his guests in the VIP box. The police may show up any moment.')
        : l('A bilheteria divide a porta com a casa; o cachê sai pelo sistema de turnês (bilheteria, cachê e fãs).', 'The box office splits the door with the house; the fee goes through the touring system (door, fee and fans).'));
      if (v) out.push(v);
      break;
    }
    case 'shelf': case 'deck': {
      const top = s.charts.albums.slice(0, 5).map((e) => rel(e.releaseId)).filter((r) => !!r);
      const yours = [...s.charts.albums, ...s.charts.singles].slice(0, 60).map((e) => rel(e.releaseId)).filter((r) => r && r.owner === 'player');
      if (yours.length) out.push(fmtL(l('Seus: {t}', 'Yours: {t}'), { t: yours.slice(0, 4).map((r) => `"${r.title}"`).join(', ') }));
      else out.push(l('Nenhum disco seu entre os mais vendidos agora.', 'None of your records among the best sellers right now.'));
      top.forEach((r, i) => out.push(fmtL(l('{i}. "{t}" — {a}', '{i}. "{t}" — {a}'), { i: i + 1, t: r.title, a: s.acts[r.actId]?.name ?? '?' })));
      break;
    }
    case 'crowd': {
      const fam = new Map<string, number>();
      for (const e of s.charts.singles.slice(0, 20)) { const r = rel(e.releaseId); const a = r ? s.acts[r.actId] : undefined; if (a) fam.set(a.genre, (fam.get(a.genre) ?? 0) + 1); }
      const top = [...fam.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      out.push(top.length ? fmtL(l('O público pede: {g}.', 'People are asking for: {g}.'), { g: top.map(([g]) => g.replace(/_/g, ' ')).join(', ') }) : l('Gente garimpando sem pressa.', 'People digging without hurry.'));
      break;
    }
    case 'onair': {
      const top = s.charts.singles[0] ? rel(s.charts.singles[0].releaseId) : undefined;
      if (top) out.push(fmtL(l('No ar: "{t}" — {a}.', 'On air: "{t}" — {a}.'), { t: top.title, a: s.acts[top.actId]?.name ?? '?' }));
      out.push(...trail31(s, 'radio'));
      if (!out.length) out.push(l('Programa de variedades.', 'Variety programme.'));
      break;
    }
    case 'live': case 'bands': case 'stage': {
      const perf = m.people.filter((p) => p.actId && !p.staff && !p.you);
      for (const p of perf) out.push(fmtL(l('{n} — {r}', '{n} — {r}'), { n: p.name, r: p.role }));
      const bico = m.people.filter((p) => p.bico);
      for (const p of bico) out.push(fmtL(l('{n} trabalha aqui e {r}', '{n} works here and {r}'), { n: p.name, r: l('também toca na noite (veja a ficha).', 'also plays at night (see the card).') }));
      if (!out.length) out.push(l('Ninguém tocando agora.', 'Nobody playing right now.'));
      break;
    }
    case 'meet': case 'tables': case 'res': {
      const ps = m.people.filter((p) => !p.you);
      for (const p of ps.slice(0, 8)) out.push(fmtL(l('{n} — {r}', '{n} — {r}'), { n: p.name, r: p.role }));
      if (!ps.length) out.push(l('Ninguém que você conheça.', 'Nobody you know.'));
      break;
    }
    case 'guests': {
      const gs = (s.tours ?? []).filter((t) => t.status === 'running' && tourCity31(s, t.actId) === s.config.homeCity);
      for (const t of gs.slice(0, 6)) out.push(fmtL(l('{a} (turnê "{t}")', '{a} ("{t}" tour)'), { a: s.acts[t.actId]?.name ?? '?', t: t.name }));
      if (!gs.length) out.push(l('Nenhum artista em turnê hospedado aqui agora.', 'No touring act staying here now.'));
      break;
    }
    case 'gold': {
      const lb = x?.place?.id ? Object.values(s.labels).find((y) => y.name === x.place?.owner) : undefined;
      const rs = lb ? Object.values(s.releases).filter((r) => r.owner === lb.id && r.peak <= 10).sort((a, b) => a.peak - b.peak || b.week - a.week).slice(0, 6) : [];
      for (const r of rs) out.push(fmtL(l('"{t}" — {a} (#{p})', '"{t}" — {a} (#{p})'), { t: r.title, a: s.acts[r.actId]?.name ?? '?', p: r.peak }));
      if (!rs.length) out.push(l('Ainda sem disco de ouro na parede.', 'No gold record on the wall yet.'));
      break;
    }
    case 'cover': {
      const fs = ((s.x4 as unknown as { facts17?: { f?: { visibility: string; severity: number; text: L; w: number }[] } }).facts17?.f ?? []).filter((f) => f.visibility === 'public' && s.week - f.w <= 4).sort((a, b) => b.severity - a.severity);
      out.push(fs[0] ? fmtL(l('Manchete: {t}', 'Headline: {t}'), { t: fs[0].text }) : l('Semana calma: a capa é sobre a cena da cidade.', 'Quiet week: the cover is about the city scene.'));
      break;
    }
    case 'front': {
      out.push(l('Na frente, um negócio comum; de noite, mais movimento.', 'Out front, an ordinary business; busier at night.'));
      for (const p of m.people.filter((y) => !y.you)) out.push(fmtL(l('{n} — {r}', '{n} — {r}'), { n: p.name, r: p.role }));
      break;
    }
    default: break;
  }
  return out;
}

/** Linhas do beco (mercado negro) com o motivo do bloqueio. */
export const bmList31 = (s: GameState): BmRow31[] => bmRows31(s);

/** Toda área tem destino e cabe no desenho (auditoria dos testes). */
export function auditInside31(m: InsideM31): string[] {
  const bad: string[] = [];
  for (const sp of m.spots) {
    if (!sp.go.panel) bad.push(`${sp.id}: sem destino`);
    if (sp.x < -4 || sp.y < -4 || sp.x + sp.w > m.W + 4 || sp.y + sp.h > m.H + 4) bad.push(`${sp.id}: fora do desenho`);
    if (!sp.label.pt || !sp.tip.pt) bad.push(`${sp.id}: sem rótulo/dica`);
    for (const t of [sp.label.pt, sp.tip.pt, sp.label.en, sp.tip.en]) if (/NaN|undefined|\[object/.test(t)) bad.push(`${sp.id}: texto cru`);
  }
  return bad;
}

export const placeKinds31 = (): PlaceK27[] => ['venue', 'records', 'radio', 'studio', 'bar', 'press', 'rehearsal', 'label', 'office', 'apartments', 'hotel', 'instruments'];
