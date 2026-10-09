// Onze perfis de identidade a mais (rodada 9), em tabela: cada um tem texto (como nasce, oportunidades,
// custos, reações) e efeitos mecânicos reais (funções pequenas). Valem para o jogador e para os rivais:
// o mesmo `appeal`/`units`/`press` roda para o selo do jogador (força k do perfil consolidado) e para
// selos rivais que adotam o perfil (força fixa). Sem importar identity.ts: o núcleo chama esta tabela.

import { clamp } from '../../../core/rng';
import { familyOf, l, type FamilyId, type L } from '../../../data/world';
import type { Act, GameState, Release } from '../../types';
import { fmtL, money, notify, post } from '../../util';
import { markMoment } from '../sound/moments';
import type { ProfileDef } from './data';

export type XId = 'hifi' | 'regional' | 'political' | 'sync' | 'gospel' | 'archive' | 'idol' | 'diy' | 'luxury' | 'starlabel' | 'predator';

/** Contexto do selo dono do perfil: elenco, família dominante e astro. */
export interface Env { roster: Act[]; fam: FamilyId | null; flag?: Act; home: string; player: boolean }

export function envOf(s: GameState, roster: Act[], player: boolean): Env {
  const cnt: Record<string, number> = {};
  for (const a of roster) { const f = familyOf(a.genre); cnt[f] = (cnt[f] ?? 0) + 1; }
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  const flag = [...roster].sort((a, b) => b.fame - a.fame)[0];
  return { roster, fam: top && top[1] >= Math.max(2, roster.length * 0.5) ? (top[0] as FamilyId) : null, flag, home: s.config.homeCity, player };
}

export interface XPerk { values: Partial<Record<string, number>>; act?: (s: GameState, a: Act) => boolean }
export interface XAction {
  id: string; name: L; desc: L; cost: number; cooldown: number; cat?: string;
  block?: (s: GameState, e: Env) => L | null;
  run: (s: GameState, k: number, e: Env) => L;
}
export interface XFx {
  def: ProfileDef;
  /** pontos que um lançamento do jogador soma ao perfil; `gap` = semanas desde o lançamento anterior */
  launch?: (s: GameState, rel: Release, act: Act, gap: number, e: Env) => number;
  /** pontos mensais a partir do elenco/contratos */
  scan?: (s: GameState, e: Env) => number;
  /** multiplicadores (1 = nada) */
  appeal?: (s: GameState, rel: Release, act: Act, e: Env) => number;
  units?: (s: GameState, rel: Release, act: Act, e: Env) => number;
  show?: (s: GameState, act: Act, inHome: boolean, e: Env) => number;
  pressing?: number;
  /** pontos de nota na imprensa (somados × k) */
  press?: (s: GameState, rel: Release, act: Act, e: Env) => number;
  perks?: (k: number, e: Env) => XPerk[];
  /** rivalidade mensal por arquétipo de selo rival (× k) */
  rivals?: Partial<Record<'empire' | 'scene_hunter' | 'hitmaker' | 'catalog' | 'boutique', number>>;
  month?: (s: GameState, k: number, e: Env) => void;
  offer?: (s: GameState, act: Act, amb: string, k: number, e: Env) => { v: number; r: L }[];
  action?: XAction;
}

const isReissue = (rel: Release) => !!rel.reissueOf || rel.kind === 'compilation' || rel.kind === 'anniversary' || rel.kind === 'deluxe' || rel.kind === 'tribute';
const fam = (a: Act) => familyOf(a.genre);
const famey = (amb: string) => amb === 'fame' || amb === 'status';
const arty = (amb: string) => amb === 'art' || amb === 'critics';
const themeOf = (s: GameState, songId: string): string | undefined => (s.x4.creation?.songs[songId] as { theme?: string } | undefined)?.theme;
const protestRel = (s: GameState, rel: Release) => rel.songs.some((id) => themeOf(s, id) === 'protest');
const faithRel = (s: GameState, rel: Release) => rel.songs.some((id) => themeOf(s, id) === 'faith');
const recentRel = (s: GameState, e: Env, weeks: number, filter: (r: Release) => boolean = () => true): Release[] =>
  e.roster.flatMap((a) => a.releases.map((id) => s.releases[id])).filter((r): r is Release => !!r && r.owner === 'player' && !r.hist && s.week - r.week <= weeks && filter(r));
const oldRel = (s: GameState, e: Env): Release[] =>
  e.roster.flatMap((a) => a.releases.map((id) => s.releases[id])).filter((r): r is Release => !!r && r.owner === 'player' && s.week - r.week > 104);
const adj = (m: number, k: number) => 1 + (m - 1) * k;

export const XPROFILES: XFx[] = [
  // ---------------------------------------------------------------- audiófilo / boutique
  {
    def: {
      id: 'hifi', name: l('Selo audiófilo (boutique)', 'Audiophile boutique'),
      desc: l('Poucos discos, impecáveis, em edições luxuosas para quem ouve de verdade.', 'Few, impeccable records in lavish editions for people who really listen.'),
      builds: l('Lançar raramente, só com qualidade 70+, elenco enxuto, edições deluxe/limitadas.', 'Releasing rarely, only at quality 70+, a lean roster, deluxe/limited editions.'),
      opps: [l('Discos 70+ de qualidade ganham +8% de apelo.', 'Records at quality 70+ get +8% appeal.'), l('Imprensa: +0,5 nos discos 70+.', 'Press: +0.5 on 70+ records.'), l('Ação: Sessão audiófila (remasterização e prensagem de luxo).', 'Action: Audiophile session (remaster and luxury pressing).')],
      costs: [l('Discos abaixo de 70 sofrem −8% e a imprensa pune a queda de padrão.', 'Records under 70 suffer −8% and press punishes the slip.'), l('Vendas gerais −8% (público pequeno); prensagem +8%.', 'Overall sales −8% (small audience); pressing +8%.')],
      reactions: [l('Atos de arte e crítica adoram; os de fama acham o selo lento.', 'Art/critics acts love it; fame acts find it slow.'), l('Selos de hits e impérios te veem como esnobe.', 'Hit-making labels and empires see you as a snob.')],
    },
    launch: (_s, rel, _a, gap, e) => (rel.q >= 70 ? 2.4 : 0) + (rel.kind === 'deluxe' || rel.kind === 'limited' ? 1.2 : 0) + (gap >= 10 ? 0.8 : 0) - (e.roster.length > 10 ? 1 : 0),
    scan: (_s, e) => (e.roster.length <= 8 ? 1 : 0),
    appeal: (_s, rel) => (isReissue(rel) ? 1 : rel.q >= 70 ? 1.08 : 0.92),
    units: (_s, rel) => (rel.q >= 78 ? 1.0 : 0.92),
    pressing: 0.08,
    press: (_s, rel) => (rel.q >= 70 ? 0.5 : -0.3),
    perks: (k) => [{ values: { critics: 0.15 * k } }],
    rivals: { hitmaker: 0.7, empire: 0.5 },
    offer: (_s, _a, amb, k) => [arty(amb) ? { v: 0.09 * k, r: l('Querem um selo que trate o disco como obra.', 'They want a label that treats the record as a work.') } : { v: famey(amb) ? -0.06 * k : 0, r: l('O selo lança pouco para quem quer fama.', 'The label releases too little for someone chasing fame.') }],
    action: {
      id: 'hifi_session', name: l('Sessão audiófila', 'Audiophile session'), cost: 6000, cooldown: 26,
      desc: l('Remasteriza e prensa em edição de luxo o melhor disco recente (+8% de apelo, +4 de crítica); o ato ganha confiança.', 'Remasters and presses a luxury edition of the best recent record (+8% appeal, +4 critics); the act gains trust.'),
      block: (s, e) => (recentRel(s, e, 26, (r) => r.q >= 60).length ? null : l('Precisa de um disco recente com qualidade 60+.', 'Needs a recent record at quality 60+.')),
      run: (s, k, e) => {
        const rel = recentRel(s, e, 26, (r) => r.q >= 60).sort((a, b) => b.q - a.q)[0];
        rel.appeal *= 1 + 0.08 * k; rel.critic = clamp((rel.critic ?? 0) + 4, 0, 100);
        const a = s.acts[rel.actId]; if (a) a.trust = clamp(a.trust + 3, 0, 100);
        return l('Sessão audiófila: a edição de luxo saiu impecável.', 'Audiophile session: the luxury edition came out flawless.');
      },
    },
  },
  // ---------------------------------------------------------------- nicho regional
  {
    def: {
      id: 'regional', name: l('Rei do nicho regional', 'Regional niche king'),
      desc: l('Domina um gênero regional (forró, sertanejo, k-indie, cumbia…) no próprio território.', 'Rules one regional genre (forró, sertanejo, k-indie, cumbia…) in its own territory.'),
      builds: l('Elenco concentrado numa família de gêneros, lançamentos só no mercado de casa.', 'A roster concentrated in one genre family, releases only in the home market.'),
      opps: [l('Lançamentos do gênero no mercado de casa +12% de apelo.', 'Home-market releases in your genre +12% appeal.'), l('Shows em casa +10% de demanda.', 'Home shows +10% demand.'), l('Ação: Circuito regional (feiras, festas de padroeiro, rádio local).', 'Action: Regional circuit (fairs, saints\' days, local radio).')],
      costs: [l('Lançamentos com território estrangeiro perdem até 12% de apelo.', 'Releases with foreign territory lose up to 12% appeal.'), l('Shows fora de casa −8% de demanda; imprensa nacional −0,2 ("provinciano").', 'Shows away −8% demand; national press −0.2 ("provincial").')],
      reactions: [l('Atos do gênero confiam mais (+4); os de fora do nicho, menos (−3).', 'Acts of the genre trust you more (+4); outsiders less (−3).'), l('Selos de hits e impérios tentam invadir seu território.', 'Hit-making labels and empires try to invade your turf.')],
    },
    launch: (_s, rel, act, _g, e) => (e.fam && fam(act) === e.fam ? 1.6 : 0) + (rel.territories.length <= 1 ? 0.6 : 0),
    scan: (_s, e) => (e.fam ? 1.8 * (e.roster.filter((a) => fam(a) === e.fam).length / Math.max(1, e.roster.length)) : 0),
    appeal: (_s, rel, act, e) => ((e.fam && fam(act) === e.fam) ? (rel.territories.length <= 1 ? 1.12 : 0.9) : 1),
    show: (_s, act, inHome, e) => (e.fam && fam(act) === e.fam ? (inHome ? 1.1 : 0.92) : 1),
    press: (_s, _r, _a, e) => (e.player ? -0.2 : 0),
    perks: (k, e) => [{ values: { trust: 4 * k }, act: (_s, a) => !!e.fam && fam(a) === e.fam }, { values: { trust: -3 * k }, act: (_s, a) => !!e.fam && fam(a) !== e.fam }],
    rivals: { hitmaker: 0.6, empire: 0.5 },
    offer: (_s, act, _amb, k, e) => (e.fam ? [fam(act) === e.fam ? { v: 0.1 * k, r: l('O selo fala a língua do gênero deles.', 'The label speaks their genre\'s language.') } : { v: -0.05 * k, r: l('Não é o nicho do selo.', 'Not the label\'s niche.') }] : []),
    action: {
      id: 'regional_circuit', name: l('Circuito regional', 'Regional circuit'), cost: 3500, cooldown: 13,
      desc: l('Os atos do nicho ganham fãs fiéis (+3%) e momento; entra renda de feiras e festas.', 'Niche acts gain loyal fans (+3%) and momentum; fairs and festivals bring income.'),
      block: (_s, e) => (e.fam ? null : l('Precisa de um nicho: metade do elenco na mesma família de gêneros.', 'Needs a niche: half the roster in one genre family.')),
      run: (s, k, e) => {
        const acts = e.roster.filter((a) => fam(a) === e.fam);
        for (const a of acts) { a.fans.core += Math.round(a.fans.core * 0.03); a.momentum = clamp(a.momentum + 5, 0, 100); }
        post(s, 'id:act:regional', money(s, (1500 + acts.reduce((t, a) => t + Math.min(20000, a.fans.core), 0) * 0.08) * k), 'live', 'Circuito regional');
        return l('Circuito regional: casas cheias no interior e a rádio local tocando.', 'Regional circuit: packed houses upcountry and local radio spinning you.');
      },
    },
  },
  // ---------------------------------------------------------------- político / engajado
  {
    def: {
      id: 'political', name: l('Selo político e engajado', 'Political, engaged label'),
      desc: l('Música com causa: protesto, movimentos e shows beneficentes.', 'Music with a cause: protest, movements and benefit shows.'),
      builds: l('Discos de protesto, entrada em movimentos, shows beneficentes e atos engajados.', 'Protest records, joining movements, benefit gigs and engaged acts.'),
      opps: [l('Discos de protesto de atos underground +10% de apelo; imprensa +0,4.', 'Protest records by underground acts +10% appeal; press +0.4.'), l('Atos engajados confiam +4.', 'Engaged acts trust +4.'), l('Ação: Ato público (momento e fãs fiéis, marca o ato como militante).', 'Action: Public rally (momentum and loyal fans, marks the act as an activist).')],
      costs: [l('Atos mainstream (posicionamento 70+) recuam: −6% de apelo.', 'Mainstream acts (positioning 70+) recoil: −6% appeal.'), l('Advogados e segurança custam todo mês; risco de multa e censura.', 'Lawyers and security cost money monthly; risk of fines and censorship.'), l('Estresse do dono +.', 'Owner stress up.')],
      reactions: [l('Atos de fama e dinheiro se afastam (−3 de confiança).', 'Fame/money-driven acts drift away (−3 trust).'), l('Impérios (majors) ficam hostis.', 'Empires (majors) turn hostile.')],
    },
    launch: (s, rel) => (protestRel(s, rel) ? 2.6 : 0),
    scan: (s, e) => e.roster.filter((a) => ['mv', 'mi', 'cn'].some((c) => (s.flags[`mom:${c}:${a.id}`] ?? 0) > s.week)).length * 1.2 + (s.memory.slice(-40).some((m) => m.kind === 'movement' && s.week - m.week < 6) ? 2 : 0),
    appeal: (s, rel, act) => (protestRel(s, rel) && act.positioning < 55 ? 1.1 : act.positioning >= 70 ? 0.94 : 1),
    press: (s, rel) => (protestRel(s, rel) ? 0.4 : 0),
    perks: (k) => [{ values: { trust: 4 * k }, act: (_s, a) => a.positioning < 50 }, { values: { stress: 0.04 * k } }],
    rivals: { empire: 0.9, hitmaker: 0.3 },
    month: (s, k, e) => {
      if (e.player) post(s, 'id:political', -money(s, 600 * k), 'legal', 'Advogados e segurança do selo engajado');
    },
    offer: (_s, act, amb, k) => [famey(amb) && act.positioning > 60 ? { v: -0.07 * k, r: l('Não querem a marca de selo militante.', 'They do not want the militant-label brand.') } : arty(amb) ? { v: 0.06 * k, r: l('Gostam de um selo com causa.', 'They like a label with a cause.') } : { v: 0, r: l('', '') }],
    action: {
      id: 'political_rally', name: l('Ato público', 'Public rally'), cost: 3000, cooldown: 26,
      desc: l('Atos pequenos ganham momento e fãs fiéis e viram "militantes" (mexe nas letras); reputação institucional −2.', 'Small acts gain momentum and loyal fans and become "activists" (shifts the lyrics); institutional reputation −2.'),
      run: (s, k, e) => {
        for (const a of e.roster.filter((x) => x.fame < 50)) { a.momentum = clamp(a.momentum + 6, 0, 100); a.fans.core += Math.round(a.fans.core * 0.03 * k); markMoment(s, a.id, 'mi', 40); }
        s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
        return l('O ato público lotou a praça: o elenco virou notícia por razões políticas.', 'The rally filled the square: the roster made the news for political reasons.');
      },
    },
  },
  // ---------------------------------------------------------------- trilhas e sync
  {
    def: {
      id: 'sync', name: l('Casa de trilhas e sync', 'Sync and soundtrack house'),
      desc: l('Vive de colocar música em filmes, comerciais, novelas e jogos.', 'Lives by placing music in films, ads, soaps and games.'),
      builds: l('Licenciamentos, coletâneas, reedições licenciáveis e receita de sync.', 'Licensing, compilations, licensable reissues and sync income.'),
      opps: [l('Renda mensal de sync pelo acervo (cresce com o catálogo).', 'Monthly sync income from the catalog (grows with the catalog).'), l('Reedições e coletâneas +8% de apelo.', 'Reissues and compilations +8% appeal.'), l('Ação: Pitch para supervisores musicais.', 'Action: Pitch to music supervisors.')],
      costs: [l('Lançamentos novos de atos de arte −5% (supervisor opina na direção).', 'New releases from art acts −5% (supervisors weigh in on direction).'), l('Imprensa: −0,2 ("música de comercial").', 'Press: −0.2 ("ad-jingle music").')],
      reactions: [l('Atos de segurança e dinheiro gostam; os de arte, não.', 'Security/money-driven acts like it; art-driven ones do not.')],
    },
    launch: (_s, rel) => (isReissue(rel) ? 1.4 : 0) + (rel.kind === 'compilation' ? 1 : 0),
    scan: (s) => Math.min(2.5, (s.monthLedger.sync ?? 0) / money(s, 2000)),
    appeal: (_s, rel, act) => (isReissue(rel) ? 1.08 : act.positioning < 40 ? 0.95 : 1),
    press: () => -0.2,
    month: (s, k, e) => { if (e.player) post(s, 'id:sync', money(s, 220 * Math.min(25, oldRel(s, e).length) * k), 'sync', 'Receita de sync do acervo'); },
    offer: (_s, _a, amb, k) => [amb === 'money' || amb === 'security' ? { v: 0.06 * k, r: l('Gostam do dinheiro extra de sync.', 'They like the extra sync money.') } : arty(amb) ? { v: -0.05 * k, r: l('Temem virar trilha de comercial.', 'They fear becoming ad-jingle material.') } : { v: 0, r: l('', '') }],
    action: {
      id: 'sync_pitch', name: l('Pitch para supervisores', 'Pitch to supervisors'), cost: 1500, cooldown: 13,
      desc: l('60% de chance de emplacar uma faixa (renda na hora e momento para o ato); se falhar, perde o custo.', '60% chance to land a track (cash now and momentum for the act); if it fails you lose the cost.'),
      block: (s, e) => (e.roster.length ? null : l('Precisa de artistas no elenco.', 'Needs acts on the roster.')),
      run: (s, k, e) => {
        const a = [...e.roster].sort((x, y) => y.momentum - x.momentum)[0];
        const ok = ((s.week * 7919 + a.logoSeed) % 100) < 60;
        if (!ok) return l('Os supervisores passaram desta vez.', 'The supervisors passed this time.');
        post(s, 'id:act:sync', money(s, (2500 + a.fame * 120) * k), 'sync', `Sync: ${a.name}`);
        a.momentum = clamp(a.momentum + 4, 0, 100); a.fame = clamp(a.fame + 0.6, 0, 100);
        return l('Faixa emplacada numa trilha: dinheiro na hora e público novo.', 'A track landed in a soundtrack: cash now and a new audience.');
      },
    },
  },
  // ---------------------------------------------------------------- religioso / gospel
  {
    def: {
      id: 'gospel', name: l('Rede gospel e religiosa', 'Gospel and faith network'),
      desc: l('Música de fé: igrejas, coros e um público devoto e fiel.', 'Faith music: churches, choirs and a devout, loyal audience.'),
      builds: l('Elenco e lançamentos sacros ou de temática de fé.', 'A roster and releases in sacred music or faith themes.'),
      opps: [l('Lançamentos sacros +12% de apelo e +10% de vendas (fiéis compram).', 'Sacred releases +12% appeal and +10% sales (the faithful buy).'), l('Shows de atos sacros +10% (igrejas e congressos).', 'Sacred acts\' shows +10% (churches and conventions).'), l('Ação: Congresso de louvor (ofertas e fãs fiéis).', 'Action: Praise convention (offerings and loyal fans).')],
      costs: [l('Lançamentos seculares −5% de apelo; imprensa −0,3.', 'Secular releases −5% appeal; press −0.3.'), l('Escândalo e vício pesam: atos em vício perdem confiança e a reputação cai todo mês.', 'Scandal and addiction weigh: addicted acts lose trust and reputation drops monthly.')],
      reactions: [l('Atos sacros confiam +5; seculares, −4.', 'Sacred acts trust +5; secular ones −4.'), l('Rivais de hits te ignoram: público separado.', 'Hit rivals ignore you: separate audience.')],
    },
    launch: (s, rel, act) => (fam(act) === 'sacred' ? 2 : 0) + (faithRel(s, rel) ? 1.2 : 0),
    scan: (_s, e) => 2 * (e.roster.filter((a) => fam(a) === 'sacred').length / Math.max(1, e.roster.length)),
    appeal: (s, rel, act) => (fam(act) === 'sacred' || faithRel(s, rel) ? 1.12 : 0.95),
    units: (_s, _r, act) => (fam(act) === 'sacred' ? 1.1 : 1),
    show: (_s, act) => (fam(act) === 'sacred' ? 1.1 : 1),
    press: (_s, _r, act) => (fam(act) === 'sacred' ? 0 : -0.3),
    perks: (k) => [{ values: { trust: 5 * k }, act: (_s, a) => fam(a) === 'sacred' }, { values: { trust: -4 * k }, act: (_s, a) => fam(a) !== 'sacred' }],
    month: (s, k, e) => {
      if (!e.player) return;
      for (const a of e.roster) if (a.members.some((id) => s.persons[id]?.health === 'addiction')) { a.trust = clamp(a.trust - 2 * k, 0, 100); s.player.reputation.institutional = clamp(s.player.reputation.institutional - 0.5 * k, 0, 100); }
    },
    offer: (_s, act, _amb, k) => [fam(act) === 'sacred' ? { v: 0.1 * k, r: l('É a casa natural da música de fé.', 'It is the natural home of faith music.') } : { v: -0.06 * k, r: l('Não se veem num selo religioso.', 'They do not see themselves on a religious label.') }],
    action: {
      id: 'gospel_convention', name: l('Congresso de louvor', 'Praise convention'), cost: 4000, cooldown: 26,
      desc: l('Ofertas na hora e +5% de fãs fiéis nos atos sacros; o elenco descansa (−estresse).', 'Offerings on the spot and +5% loyal fans for sacred acts; the roster rests (−stress).'),
      block: (_s, e) => (e.roster.some((a) => fam(a) === 'sacred') ? null : l('Precisa de um ato sacro no elenco.', 'Needs a sacred act on the roster.')),
      run: (s, k, e) => {
        const acts = e.roster.filter((a) => fam(a) === 'sacred');
        for (const a of acts) { a.fans.core += Math.round(a.fans.core * 0.05); for (const id of a.members) { const p = s.persons[id]; if (p?.alive) p.stress = clamp(p.stress - 8, 0, 100); } }
        post(s, 'id:act:gospel', money(s, (1800 + acts.reduce((t, a) => t + Math.min(15000, a.fans.core), 0) * 0.3) * k), 'live', 'Ofertas do congresso de louvor');
        return l('O congresso encheu o ginásio: ofertas generosas e coros afinados.', 'The convention filled the arena: generous offerings and well-tuned choirs.');
      },
    },
  },
  // ---------------------------------------------------------------- reedições e arquivo
  {
    def: {
      id: 'archive', name: l('Arquivista (reedições raras)', 'Archivist (rare reissues)'),
      desc: l('Resgata discos raros e esquecidos; o acervo é um museu que vende.', 'Rescues rare and forgotten records; the vault is a museum that sells.'),
      builds: l('Reedições, aniversários, tributos e coletâneas; acervo antigo que ainda rende.', 'Reissues, anniversaries, tributes and compilations; an old vault that still earns.'),
      opps: [l('Reedições +18% de apelo, +10% de vendas; imprensa +0,6.', 'Reissues +18% appeal, +10% sales; press +0.6.'), l('Renda mensal do acervo esquecido.', 'Monthly income from the forgotten vault.'), l('Ação: Descoberta de arquivo.', 'Action: Archive find.')],
      costs: [l('Lançamentos novos −5% de apelo (a casa é um museu).', 'New releases −5% appeal (the house is a museum).'), l('Atos novos e ambiciosos acham o selo parado (−6%).', 'New, ambitious acts find the label stuck (−6%).')],
      reactions: [l('Rivais de catálogo disputam o mesmo acervo.', 'Catalog rivals fight for the same vault.'), l('Atos de legado e segurança gostam.', 'Legacy/security-driven acts like it.')],
    },
    launch: (_s, rel) => (isReissue(rel) ? 2.4 : 0) + (rel.kind === 'anniversary' || rel.kind === 'tribute' ? 1 : 0),
    scan: (s, e) => Math.min(1.8, oldRel(s, e).length * 0.2),
    appeal: (_s, rel) => (isReissue(rel) ? 1.18 : 0.95),
    units: (_s, rel) => (isReissue(rel) ? 1.1 : 1),
    press: (_s, rel) => (isReissue(rel) ? 0.6 : 0),
    rivals: { catalog: 0.8 },
    month: (s, k, e) => { if (e.player) post(s, 'id:archive', money(s, 160 * Math.min(30, oldRel(s, e).length) * k), 'sync', 'Acervo esquecido que volta a vender'); },
    offer: (_s, _a, amb, k) => [amb === 'legacy' || amb === 'security' ? { v: 0.06 * k, r: l('Querem que a obra seja preservada.', 'They want the work preserved.') } : famey(amb) ? { v: -0.06 * k, r: l('O selo olha para trás, não para a frente.', 'The label looks back, not ahead.') } : { v: 0, r: l('', '') }],
    action: {
      id: 'archive_find', name: l('Descoberta de arquivo', 'Archive find'), cost: 2000, cooldown: 26,
      desc: l('Redescobre o melhor disco antigo: renda na hora e o ato ganha momento e fama.', 'Rediscovers the best old record: cash now and the act gains momentum and fame.'),
      block: (s, e) => (oldRel(s, e).length ? null : l('Precisa de discos com mais de 2 anos.', 'Needs records older than 2 years.')),
      run: (s, k, e) => {
        const rel = oldRel(s, e).sort((a, b) => b.q - a.q)[0];
        post(s, 'id:act:archive', money(s, (2500 + rel.q * 60) * k), 'sync', `Redescoberta: ${rel.title}`);
        const a = s.acts[rel.actId]; if (a) { a.momentum = clamp(a.momentum + 4, 0, 100); a.fame = clamp(a.fame + 1, 0, 100); }
        return l('Uma fita esquecida voltou ao catálogo: a crítica redescobriu o disco.', 'A forgotten tape returned to the catalog: critics rediscovered the record.');
      },
    },
  },
  // ---------------------------------------------------------------- fábrica de ídolos
  {
    def: {
      id: 'idol', name: l('Fábrica de ídolos', 'Idol factory'),
      desc: l('Treina jovens por anos e lança grupos coreografados com fandom organizado (k-pop, boy bands).', 'Trains youngsters for years and launches choreographed groups with organized fandoms (K-pop, boy bands).'),
      builds: l('Grupos grandes e jovens no pop, contratos longos, marketing pesado e controle de imagem.', 'Large young pop groups, long contracts, heavy marketing and image control.'),
      opps: [l('Pop +10% de apelo; estreias de grupo +10% de vendas (fandom compra em massa).', 'Pop +10% appeal; group debuts +10% sales (fandom buys en masse).'), l('Shows de grupos +6% (encontros com fãs).', 'Group shows +6% (fan meetings).'), l('Ação: Audição em massa e debut.', 'Action: Mass audition and debut.')],
      costs: [l('Membros treinam demais: estresse e fadiga sobem todo mês.', 'Members train too hard: stress and fatigue rise monthly.'), l('Atos fora do pop −6%; veteranos (28+) perdem confiança.', 'Non-pop acts −6%; veterans (28+) lose trust.'), l('Imprensa: −0,4 ("produto de linha de montagem").', 'Press: −0.4 ("assembly-line product").')],
      reactions: [l('Atos jovens e de fama querem entrar; os de arte, não (−5).', 'Young and fame-driven acts want in; art-driven ones do not (−5).'), l('Boutiques e caçadores de cena te veem como ameaça.', 'Boutiques and scene hunters see you as a threat.')],
    },
    launch: (_s, rel, act) => (fam(act) === 'pop' ? 1.2 : 0) + (act.members.length >= 4 ? 1 : 0) + (rel.marketingE > 0.4 ? 0.8 : 0),
    scan: (s, e) => { const g = e.roster.filter((a) => a.members.length >= 4 && fam(a) === 'pop'); return Math.min(2.5, g.length * 0.8) + (g.some((a) => a.members.every((id) => s.year - (s.persons[id]?.born ?? 0) < 25) ) ? 0.8 : 0); },
    appeal: (_s, _r, act) => (fam(act) === 'pop' ? 1.1 : 0.94),
    units: (_s, _r, act) => (act.releases.length <= 2 && act.members.length >= 4 ? 1.1 : 1),
    show: (_s, act) => (act.members.length >= 4 ? 1.06 : 1),
    press: () => -0.4,
    perks: (k) => [{ values: { trust: 4 * k }, act: (s, a) => a.fame < 30 && a.members.every((id) => s.year - (s.persons[id]?.born ?? 0) < 28) }, { values: { trust: -5 * k }, act: (_s, a) => a.positioning < 40 }],
    rivals: { boutique: 0.6, scene_hunter: 0.4 },
    month: (s, k, e) => {
      for (const a of e.roster) for (const id of a.members) {
        const p = s.persons[id];
        if (!p?.alive) continue;
        p.stress = clamp(p.stress + 1.2 * k, 0, 100); p.fatigue = clamp(p.fatigue + 1.5 * k, 0, 100);
        if (s.year - p.born >= 28) a.trust = clamp(a.trust - 0.25 * k, 0, 100);
      }
    },
    offer: (_s, act, amb, k) => [famey(amb) && act.fame < 35 ? { v: 0.09 * k, r: l('Sonham com o debut e o fandom.', 'They dream of a debut and a fandom.') } : arty(amb) ? { v: -0.08 * k, r: l('Não querem ser produto de linha de montagem.', 'They refuse to be assembly-line product.') } : { v: 0, r: l('', '') }],
    action: {
      id: 'idol_audition', name: l('Audição em massa e debut', 'Mass audition and debut'), cost: 7000, cooldown: 52,
      desc: l('Atos pop pequenos ganham momento e +10% de fãs casuais (estresse +10); revela jovens talentos do pop.', 'Small pop acts gain momentum and +10% casual fans (stress +10); reveals young pop talent.'),
      run: (s, k, e) => {
        for (const a of e.roster.filter((x) => x.fame < 30 && fam(x) === 'pop')) {
          a.momentum = clamp(a.momentum + 10 * k, 0, 100); a.fans.casual += Math.round(a.fans.casual * 0.1 * k);
          for (const id of a.members) { const p = s.persons[id]; if (p?.alive) p.stress = clamp(p.stress + 10, 0, 100); }
        }
        let n = 0;
        for (const a of Object.values(s.acts)) if (n < 3 && !a.owner && !a.playerBand && fam(a) === 'pop' && a.fame < 15 && (a.status === 'active' || a.status === 'emerging') && !s.knowledge[a.id]) { s.knowledge[a.id] = { actId: a.id, degree: 1, stage: 'signal', bias: 0, updatedWeek: s.week, source: 'audition' }; n++; }
        return l('A audição lotou: novos trainees no radar e o debut gerou histeria.', 'The audition packed in: new trainees on the radar and the debut caused hysteria.');
      },
    },
  },
  // ---------------------------------------------------------------- DIY / punk
  {
    def: {
      id: 'diy', name: l('Selo DIY / punk', 'DIY / punk label'),
      desc: l('Faça você mesmo: orçamento mínimo, credibilidade máxima.', 'Do it yourself: minimal budget, maximum credibility.'),
      builds: l('Lançamentos de baixo orçamento, atos underground, adiantamentos pequenos e shows em porões.', 'Low-budget releases, underground acts, small advances and basement gigs.'),
      opps: [l('Atos underground (posicionamento <45) +7% de apelo; imprensa +0,4.', 'Underground acts (positioning <45) +7% appeal; press +0.4.'), l('Fabricação 10% mais barata; artistas aceitam adiantamentos 12% menores.', 'Manufacturing 10% cheaper; artists accept 12% smaller advances.'), l('Ação: Zine e turnê de garagem.', 'Action: Zine and garage tour.')],
      costs: [l('Campanha de marketing pesada soa a "vendido": −8%; atos mainstream −10%.', 'Heavy marketing campaigns read as "sellout": −8%; mainstream acts −10%.'), l('Atos que passam de fama 45 se sentem "vendidos" e perdem confiança.', 'Acts that pass fame 45 feel like sellouts and lose trust.')],
      reactions: [l('Atos de arte e crítica adoram (+8% nas ofertas); os de fama preferem outro selo.', 'Art/critics acts love it (+8% offers); fame-driven acts prefer another label.'), l('Impérios e fábricas de hits te desprezam.', 'Empires and hit factories look down on you.')],
    },
    launch: (_s, rel) => (rel.marketingE < 0.25 ? 1.8 : 0) + (rel.type === 'single' ? 0.3 : 0),
    scan: (_s, e) => 2 * (e.roster.filter((a) => a.positioning < 40).length / Math.max(1, e.roster.length)),
    appeal: (_s, rel, act) => (act.positioning < 45 ? 1.07 : act.positioning > 65 ? 0.9 : 1) * (rel.marketingE > 0.5 ? 0.92 : 1),
    pressing: -0.1,
    press: (_s, _r, act) => (act.positioning < 45 ? 0.4 : -0.2),
    perks: (k) => [{ values: { advance: -0.12 * k, trust: 3 * k } }],
    rivals: { empire: 0.5, hitmaker: 0.5 },
    month: (s, k, e) => { for (const a of e.roster) if (a.fame > 45) a.trust = clamp(a.trust - 0.4 * k, 0, 100); void s; },
    offer: (_s, _a, amb, k) => [arty(amb) ? { v: 0.08 * k, r: l('Respeitam um selo sem frescura.', 'They respect a no-frills label.') } : famey(amb) ? { v: -0.09 * k, r: l('Querem mais estrutura que um porão.', 'They want more than a basement.') } : { v: 0, r: l('', '') }],
    action: {
      id: 'diy_zine', name: l('Zine e turnê de garagem', 'Zine and garage tour'), cost: 800, cooldown: 13,
      desc: l('Atos pequenos ganham momento e fãs fiéis; a cena de cada cidade cresce um pouco.', 'Small acts gain momentum and loyal fans; each city scene grows a little.'),
      run: (s, k, e) => {
        for (const a of e.roster.filter((x) => x.fame < 30)) {
          a.momentum = clamp(a.momentum + 5, 0, 100); a.fans.core += Math.round(a.fans.core * 0.02 * k);
          const key = `${a.city}:${a.genre}`; s.scenes[key] = (s.scenes[key] ?? 0) + 0.4;
          for (const id of a.members) { const p = s.persons[id]; if (p?.alive) p.fatigue = clamp(p.fatigue + 3, 0, 100); }
        }
        return l('A zine circulou e a turnê de garagem lotou porões.', 'The zine circulated and the garage tour packed basements.');
      },
    },
  },
  // ---------------------------------------------------------------- luxo & moda
  {
    def: {
      id: 'luxury', name: l('Selo de luxo e moda', 'Luxury and fashion label'),
      desc: l('Música como objeto de desejo: edições de luxo, desfiles e marcas parceiras.', 'Music as an object of desire: luxury editions, runways and brand partners.'),
      builds: l('Edições deluxe/limitadas, capas elaboradas, marketing alto e reputação institucional.', 'Deluxe/limited editions, elaborate covers, high marketing and institutional reputation.'),
      opps: [l('Edições deluxe/limitadas +10% de apelo; shows +8% (glamour).', 'Deluxe/limited editions +10% appeal; shows +8% (glamour).'), l('Atos de status confiam +5.', 'Status-driven acts trust +5.'), l('Ação: Desfile-lançamento (patrocínio e fãs).', 'Action: Runway launch (sponsorship and fans).')],
      costs: [l('Atelier, desfiles e embaixadores custam todo mês.', 'Atelier, runways and ambassadors cost money monthly.'), l('Vendas gerais −8% (preço alto); atos underground (posicionamento <35) acham o selo pretensioso.', 'Overall sales −8% (high price); underground acts (positioning <35) find it pretentious.')],
      reactions: [l('Imprensa: +0,3 para atos mainstream, −0,3 para underground.', 'Press: +0.3 for mainstream acts, −0.3 for underground.'), l('Caçadores de cena te desprezam.', 'Scene hunters scorn you.')],
    },
    launch: (_s, rel) => (rel.kind === 'deluxe' || rel.kind === 'limited' ? 2 : 0) + (rel.coverChoice ? 0.6 : 0) + (rel.marketingE > 0.4 ? 0.6 : 0),
    scan: (s) => (s.player.reputation.institutional > 60 ? 0.8 : 0),
    appeal: (_s, rel, act) => (rel.kind === 'deluxe' || rel.kind === 'limited' ? 1.1 : 1) * (act.positioning < 35 ? 0.94 : 1),
    units: () => 0.92,
    show: () => 1.08,
    press: (_s, _r, act) => (act.positioning > 50 ? 0.3 : act.positioning < 35 ? -0.3 : 0),
    perks: (k) => [{ values: { trust: 5 * k }, act: (_s, a) => a.fame > 30 || a.positioning > 60 }],
    rivals: { scene_hunter: 0.6 },
    month: (s, k, e) => { if (e.player) post(s, 'id:luxury', -money(s, 900 * k), 'marketing', 'Atelier, desfiles e embaixadores'); },
    offer: (_s, _a, amb, k) => [amb === 'status' ? { v: 0.1 * k, r: l('Querem a vitrine glamourosa do selo.', 'They want the label\'s glamorous showcase.') } : arty(amb) ? { v: -0.04 * k, r: l('Acham o selo mais vitrine que música.', 'They find it more showcase than music.') } : { v: 0, r: l('', '') }],
    action: {
      id: 'luxury_runway', name: l('Desfile-lançamento', 'Runway launch'), cost: 9000, cooldown: 39,
      desc: l('Astros ganham momento e fãs casuais; patrocinadores pagam parte da conta (renda na hora).', 'Stars gain momentum and casual fans; sponsors pay part of the bill (cash now).'),
      block: (_s, e) => (e.roster.some((a) => a.fame > 25) ? null : l('Precisa de um ato com alcance 25+.', 'Needs an act with reach 25+.')),
      run: (s, k, e) => {
        const stars = e.roster.filter((a) => a.fame > 25);
        for (const a of stars) { a.momentum = clamp(a.momentum + 8, 0, 100); a.fans.casual += Math.round(a.fans.casual * 0.06); for (const id of a.members) { const p = s.persons[id]; if (p?.alive) p.fatigue = clamp(p.fatigue + 4, 0, 100); } }
        post(s, 'id:act:luxury', money(s, (5000 + stars.reduce((t, a) => t + a.fame, 0) * 80) * k), 'marketing', 'Patrocínio do desfile-lançamento');
        return l('O desfile-lançamento foi capa de revista: patrocinadores e fãs novos.', 'The runway launch made the magazine covers: new sponsors and fans.');
      },
    },
  },
  // ---------------------------------------------------------------- selo de estrela
  {
    def: {
      id: 'starlabel', name: l('Selo de estrela', 'Star-owned label'),
      desc: l('O selo é uma extensão do astro: tudo gira em torno de um nome.', 'The label is an extension of its star: everything revolves around one name.'),
      builds: l('Um ato carrega a maior parte da fama do elenco; elenco pequeno; o dono é artista.', 'One act carries most of the roster\'s fame; a small roster; the owner is an artist.'),
      opps: [l('O astro: +10% de apelo, +8% nos shows, +5% de vendas.', 'The star: +10% appeal, +8% shows, +5% sales.'), l('Colaborações do astro puxam atenção para o resto do elenco.', 'The star\'s collaborations draw attention to the rest of the roster.'), l('Ação: Turnê do astro.', 'Action: The star\'s tour.')],
      costs: [l('Os demais atos: −6% de apelo e perdem confiança todo mês (selo "do fulano").', 'The other acts: −6% appeal and lose trust monthly (the "star\'s label").'), l('Se o astro cai, o selo cai junto.', 'If the star falls, the label falls with it.')],
      reactions: [l('Atos de fama querem estar sob a luz do astro; o astro confia +6, os outros −3.', 'Fame-driven acts want the star\'s light; the star trusts +6, others −3.'), l('Impérios e fábricas de hits miram o astro.', 'Empires and hit factories aim at the star.')],
    },
    launch: (_s, _r, act, _g, e) => (e.flag && act.id === e.flag.id ? 1.5 : 0),
    scan: (s, e) => { if (!e.flag || !e.roster.length) return 0; const tot = e.roster.reduce((t, a) => t + a.fame, 0) || 1; return (e.flag.fame / tot) * 2 + (s.config.role === 'artist' ? 1 : 0); },
    appeal: (_s, _r, act, e) => (e.flag && act.id === e.flag.id ? 1.1 : 0.94),
    units: (_s, _r, act, e) => (e.flag && act.id === e.flag.id ? 1.05 : 1),
    show: (_s, act, _h, e) => (e.flag && act.id === e.flag.id ? 1.08 : 1),
    perks: (k, e) => [{ values: { trust: 6 * k }, act: (_s, a) => !!e.flag && a.id === e.flag.id }, { values: { trust: -3 * k }, act: (_s, a) => !!e.flag && a.id !== e.flag.id }],
    rivals: { empire: 0.6, hitmaker: 0.5 },
    month: (s, k, e) => { for (const a of e.roster) if (e.flag && a.id !== e.flag.id) a.trust = clamp(a.trust - 0.3 * k, 0, 100); void s; },
    offer: (_s, act, amb, k, e) => [e.flag && act.id !== e.flag.id && famey(amb) ? { v: 0.06 * k, r: l('Querem a luz do astro do selo.', 'They want the label star\'s light.') } : e.flag && act.id !== e.flag.id && arty(amb) ? { v: -0.05 * k, r: l('Temem ficar na sombra do astro.', 'They fear living in the star\'s shadow.') } : { v: 0, r: l('', '') }],
    action: {
      id: 'star_tour', name: l('Turnê do astro', 'The star\'s tour'), cost: 6000, cooldown: 39,
      desc: l('O astro ganha momento (+8) e fãs fiéis (+3%); os outros atos perdem 2 de confiança.', 'The star gains momentum (+8) and loyal fans (+3%); the other acts lose 2 trust.'),
      block: (_s, e) => (e.flag ? null : l('Precisa de um astro no elenco.', 'Needs a star on the roster.')),
      run: (s, k, e) => {
        const f = e.flag!;
        f.momentum = clamp(f.momentum + 8, 0, 100); f.fans.core += Math.round(f.fans.core * 0.03 * k);
        for (const a of e.roster) if (a.id !== f.id) a.trust = clamp(a.trust - 2, 0, 100);
        post(s, 'id:act:star', money(s, 2500 + f.fame * 90), 'live', `Turnê do astro: ${f.name}`);
        return l('A turnê do astro foi um sucesso; o resto do elenco ficou nos bastidores.', 'The star\'s tour was a hit; the rest of the roster stayed backstage.');
      },
    },
  },
  // ---------------------------------------------------------------- predatório
  {
    def: {
      id: 'predator', name: l('Selo predatório', 'Predatory label'),
      desc: l('Volume e contratos abusivos: espreme cada artista até o último centavo.', 'Volume and abusive contracts: squeezes every artist for the last penny.'),
      builds: l('Contratos 360, longos, adiantamentos apertados, promessas quebradas e muitos lançamentos.', '360 deals, long terms, tight advances, broken promises and plenty of releases.'),
      opps: [l('Receita extra mensal dos contratos (cresce com o elenco).', 'Extra monthly revenue from contracts (grows with the roster).'), l('Artistas aceitam adiantamentos 10% menores.', 'Artists accept 10% smaller advances.'), l('Ação: Cláusula de recoupment (dinheiro na hora).', 'Action: Recoupment clause (cash now).')],
      costs: [l('Todo o elenco perde confiança e moral todo mês.', 'The whole roster loses trust and morale every month.'), l('Risco mensal de processo e multa; reputação cai.', 'Monthly risk of lawsuit and fine; reputation sinks.'), l('Imprensa: −0,6.', 'Press: −0.6.')],
      reactions: [l('Só os ingênuos (fama <10) e os que buscam segurança aceitam; o resto foge.', 'Only the naive (fame <10) and security-seekers accept; the rest run.'), l('Boutiques e caçadores de cena aliciam seus artistas descontentes.', 'Boutiques and scene hunters poach your unhappy acts.')],
    },
    scan: (s, e) => {
      let p = 0;
      for (const c of Object.values(s.contracts)) if (c.party === 'player' && c.startWeek > s.week - 8) { if (c.model === '360') p += 2; if (c.termMonths >= 60) p += 1.5; if (c.royalty <= 0.15) p += 1.5; }
      return p + (s.memory.slice(-30).some((m) => m.kind === 'broken_promise' && s.week - m.week < 8) ? 3 : 0) + (e.roster.length >= 12 ? 1 : 0);
    },
    launch: (_s, _r, _a, gap) => (gap <= 3 ? 1 : 0),
    press: () => -0.6,
    perks: (k) => [{ values: { advance: -0.1 * k, trust: -3 * k, morale: -0.3 * k } }],
    rivals: { boutique: 0.8, scene_hunter: 0.6 },
    month: (s, k, e) => {
      if (!e.player) return;
      post(s, 'id:predator', money(s, 260 * e.roster.length * k), 'distribution', 'Receita extra de contratos abusivos');
      for (const a of e.roster) a.trust = clamp(a.trust - 0.8 * k, 0, 100);
      if (((s.week * 31 + e.roster.length * 7) % 100) < 3 * k) {
        post(s, 'id:predator:fine', -money(s, 8000), 'legal', 'Multa por contratos abusivos');
        s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
        notify(s, fmtL(l('Um artista processou o selo por contrato abusivo: multa e reputação em queda.', 'An artist sued the label over an abusive contract: fine and reputation drop.'), {}), 'bad');
      }
    },
    offer: (_s, act, amb, k) => [act.fame < 10 ? { v: 0.05 * k, r: l('Não leram as letras miúdas.', 'They did not read the fine print.') } : amb === 'security' ? { v: 0.03 * k, r: l('Querem a garantia do adiantamento.', 'They want the advance guarantee.') } : { v: -0.09 * k, r: l('A fama de abusivo corre solta.', 'The abusive reputation is out.') }],
    action: {
      id: 'predator_recoup', name: l('Cláusula de recoupment', 'Recoupment clause'), cost: 0, cooldown: 26,
      desc: l('Cobra de volta parte dos adiantamentos: renda imediata, todo o elenco −5 de confiança, reputação −2.', 'Claws back part of the advances: immediate cash, whole roster −5 trust, reputation −2.'),
      block: (_s, e) => (e.roster.length ? null : l('Precisa de artistas no elenco.', 'Needs acts on the roster.')),
      run: (s, k, e) => {
        post(s, 'id:act:predator', money(s, (2000 + 350 * e.roster.length) * k), 'distribution', 'Recoupment agressivo');
        for (const a of e.roster) a.trust = clamp(a.trust - 5, 0, 100);
        s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
        return l('O recoupment rendeu caixa, e uma fila de artistas furiosos.', 'The recoupment brought cash, and a line of furious artists.');
      },
    },
  },
];

export const XBY_ID = Object.fromEntries(XPROFILES.map((x) => [x.def.id, x])) as Record<string, XFx>;
export const XDEFS: ProfileDef[] = XPROFILES.map((x) => x.def);
export { adj };
