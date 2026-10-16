// Rodada 19 (onda 5, C — auditoria 8 §6) — VITÓRIAS PEQUENAS E ESPECIALIZADAS.
// • Empresário com KPIs relativos: confiança média, anos médios por cliente e % de mandatos renovados (4 clientes
//   felizes por 20 anos chegam ao 3º marco sem precisar de 6 estrelas e US$ 800 mil).
// • Caminhos novos em paths18 (marcos 35/65/90 durante a partida, final próprio): Formador de talentos, Casa duradoura
//   (sucessão, anos, lealdade), Veículo de referência (crítica/mídia), Editora de nicho, Plataforma e Carreira
//   independente (fora do selo).
// • Marcos clássicos por carreira (primeiro cliente, primeira edição esgotada, primeira obra regravada…), reconhecidos na
//   hora: conquista (paths18 ach), memória, fato `milestone` (lido pelo epitáfio/linha do tempo) e aviso.
// Sem sorteio.

import { clamp } from '../../core/rng';
import { toReal } from '../../core/money';
import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { GameState } from '../types';
import { fmtL, notify, playerActs, remember } from '../util';
import { capital } from './capital';
import { careers } from './careers12';
import { liveOf } from './live/state';
import { agentLoyalty, c12, mgr12 } from './manager12';
import { ownerOf } from './people/owner';
import { PATHS18, pa18, pathDef18, type Kpi18, type PathDef18 } from './paths18';
import { pr18 } from './press18';
import { v12 } from './ventures12';
import { ventures } from './ventures9';

const K = (label: L, v: number, target: number, fmt: Kpi18['fmt'], why: L): Kpi18 => ({ label, v, target, fmt, why });
const vl = (s: GameState, k: string) => ventures(s).list.filter((v) => v.kind === k && v.owner);
const yrs = (s: GameState, w: number) => Math.max(0, s.week - w) / 52;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// ---------------------------------------------------------------- empresário: KPIs relativos

/** Indicadores relativos do empresário (também lidos pelo cockpit/testes). */
export function mgRel19(s: GameState): { trust: number; years: number; renew: number; n: number } {
  const cl = ventures(s).mg.clients;
  const ren = mgr12(s).ren ?? [0, 0];
  const tot = ren[0] + ren[1];
  return { trust: avg(cl.map((c) => c12(s, c.actId).trust)), years: avg(cl.map((c) => yrs(s, c.since))), renew: tot ? ren[0] / tot * 100 : cl.length ? 70 : 0, n: cl.length };
}
const mgr = pathDef18('manager');
if (mgr) {
  mgr.desc = l('Representar bem quem você representa: confiança, carreiras longas e mandatos renovados contam tanto quanto estrelas.', 'Represent your clients well: trust, long careers and renewed mandates count as much as stars.');
  mgr.kpis = (s) => {
    const mg = ventures(s).mg, cl = mg.clients.map((c) => s.acts[c.actId]).filter(Boolean), r = mgRel19(s);
    return [
      K(l('Reputação de empresário', 'Manager reputation'), mg.rep, 80, 'num', l('Clientes satisfeitos falam bem.', 'Happy clients talk.')),
      K(l('Confiança média dos clientes', 'Clients\' average trust'), r.trust, 80, 'num', l('Relativo: não importa quantos, e sim como estão.', 'Relative: not how many, but how they are doing.')),
      K(l('Anos médios por cliente', 'Average years per client'), r.years, 6, 'num', l('Carreiras longas ao seu lado.', 'Long careers by your side.')),
      K(l('Mandatos renovados', 'Mandates renewed'), r.renew, 85, 'pct', l('Renovados ÷ (renovados + perdidos).', 'Renewed ÷ (renewed + lost).')),
      K(l('Fama média dos clientes', 'Clients\' average fame'), cl.length ? cl.reduce((t, a) => t + a.fame, 0) / cl.length : 0, 50, 'num', l('Estrelas atraem estrelas — mas não são tudo.', 'Stars attract stars — but they are not everything.')),
    ];
  };
}

// ---------------------------------------------------------------- caminhos novos

/** Atos formados por você: estrearam na sua partida e passaram de fama 40 (selo, cliente de empresário ou banda). */
function formed(s: GameState): { id: string; trust: number; years: number }[] {
  const mg = ventures(s).mg, signed = new Map<string, number>();
  for (const m of s.memory) if (m.kind === 'signed' && m.actId && !signed.has(m.actId)) signed.set(m.actId, m.week);
  const out: { id: string; trust: number; years: number }[] = [];
  for (const a of Object.values(s.acts)) {
    if (a.fame < 40 || a.debutYear < s.config.startYear) continue;
    const cl = mg.clients.find((c) => c.actId === a.id);
    if (a.owner === 'player' || a.playerBand) out.push({ id: a.id, trust: a.trust, years: yrs(s, signed.get(a.id) ?? s.week - 52) });
    else if (cl) out.push({ id: a.id, trust: c12(s, a.id).trust, years: yrs(s, cl.since) });
  }
  return out;
}
const oldestYears = (s: GameState): number => Math.max(0, s.year - s.config.startYear, ...ventures(s).list.filter((v) => v.owner).map((v) => s.year - v.founded));

export const PATHS19: PathDef18[] = [
  { id: 'mentor', icon: 'star', name: l('Formador de talentos', 'Talent developer'), desc: l('Pegar desconhecidos e transformar em carreiras — e continuar sendo a pessoa em quem eles confiam.', 'Take unknowns and turn them into careers — and stay the person they trust.'),
    relevant: (s) => playerActs(s).length > 0 || ventures(s).mg.clients.length > 0,
    kpis: (s) => {
      const f = formed(s);
      return [
        K(l('Talentos formados (estrearam com você, fama 40+)', 'Talents developed (debuted with you, fame 40+)'), f.length + mgr12(s).devHits * 0.5, 5, 'num', l('Selo, banda ou cliente do empresário; descobertas do empresário contam meio.', 'Label, band or manager client; manager discoveries count half.')),
        K(l('Confiança dos formados', 'Trust of those you developed'), avg(f.map((x) => x.trust)), 75, 'num', l('Formar não é usar: quem cresceu com você ainda confia?', 'Developing is not using: do those who grew with you still trust you?')),
        K(l('Anos juntos (média)', 'Years together (average)'), avg(f.map((x) => x.years)), 6, 'num', l('Ficam depois de estourar?', 'Do they stay after breaking through?')),
      ];
    },
    tiers: [l('Olho para talento', 'An eye for talent'), l('Escola de carreiras', 'A school of careers'), l('Formador de gerações', 'Developer of generations')],
    ending: [l('Ninguém lembra de quem descobriu quem.', 'Nobody remembers who discovered whom.'), l('Alguns nomes começaram com você.', 'A few names started with you.'), l('Uma escola: artistas citam você nos agradecimentos.', 'A school: artists thank you in their liner notes.'), l('Formador de gerações: metade da cena passou pelas suas mãos e voltaria.', 'Developer of generations: half the scene passed through your hands and would come back.')] },
  { id: 'house', icon: 'building', name: l('Casa duradoura', 'Lasting house'), desc: l('Uma organização que dura: anos de porta aberta, gente leal, sucessor preparado.', 'An organization that lasts: years with the door open, loyal people, a successor in place.'),
    relevant: () => true,
    kpis: (s) => {
      const st = mgr12(s), staff = s.player.staff;
      const loyal = avg([...st.agents.map((g) => agentLoyalty(s, g)), ...staff.map((x) => clamp(50 + yrs(s, x.hiredWeek) * 5, 0, 100))]);
      const long = playerActs(s).filter((id) => { const m = s.memory.find((x) => x.kind === 'signed' && x.actId === id); return m && s.week - m.week >= 520; }).length + ventures(s).mg.clients.filter((c) => s.week - c.since >= 520).length;
      return [
        K(l('Anos de casa aberta', 'Years open'), oldestYears(s), 25, 'num', l('O negócio mais antigo que você mantém.', 'The oldest business you keep.')),
        K(l('Lealdade da equipe', 'Team loyalty'), loyal, 75, 'num', l('Agentes leais e equipe que fica (tempo de casa).', 'Loyal agents and staff who stay (tenure).')),
        K(l('Relações de 10+ anos', '10+ year relationships'), long, 3, 'num', l('Artistas ou clientes com você há uma década.', 'Acts or clients with you for a decade.')),
        K(l('Sucessor preparado', 'Successor in place'), st.successor || careers(s).active.length > 1 && Object.keys((s.x4 as unknown as { agenda17?: { heads?: object } }).agenda17?.heads ?? {}).length ? 100 : 0, 100, 'pct', l('Sucessor na agência ou um diretor tocando uma frente.', 'A successor at the agency or a director running a front.')),
      ];
    },
    tiers: [l('Porta aberta', 'Door open'), l('Casa de tradição', 'A house with tradition'), l('Instituição', 'An institution')],
    ending: [l('A casa fechou com o fundador.', 'The house closed with its founder.'), l('Uma casa que durou o quanto pôde.', 'A house that lasted as long as it could.'), l('Uma casa de tradição, passada adiante.', 'A house with tradition, handed on.'), l('Instituição: gente que entrou jovem se aposentou lá dentro, e a porta segue aberta.', 'An institution: people who joined young retired there, and the door is still open.')] },
  { id: 'outlet', icon: 'newspaper', name: l('Veículo de referência', 'Reference outlet'), desc: l('Uma voz que a cena respeita: crítica que acerta antes, furos e público fiel.', 'A voice the scene respects: criticism that calls it early, scoops and a loyal readership.'),
    relevant: (s) => careers(s).active.includes('critic') || careers(s).active.includes('media') || !!pr18(s).out || vl(s, 'media').length > 0,
    kpis: (s) => {
      const st = pr18(s), md = vl(s, 'media');
      return [
        K(l('Credibilidade', 'Credibility'), st.cred, 85, 'num', l('Julgada pela história (~10 meses depois de cada resenha).', 'Judged by history (~10 months after each review).')),
        K(l('Alcance', 'Reach'), Math.max(st.reach, ...md.map((v) => v.reach ?? 0)), 70, 'num', l('Leitores, ouvintes, assinantes.', 'Readers, listeners, subscribers.')),
        K(l('Furos', 'Scoops'), st.scoops, 8, 'num', l('Notícias que você deu primeiro.', 'Stories you broke first.')),
        K(l('Anos do veículo', 'Years of the outlet'), Math.max(st.out ? s.year - st.out.since : 0, ...md.map((v) => s.year - v.founded)), 10, 'num', l('Referência leva tempo.', 'Becoming a reference takes time.')),
      ];
    },
    tiers: [l('Voz na cena', 'A voice in the scene'), l('Leitura obrigatória', 'Required reading'), l('Veículo de referência', 'Reference outlet')],
    ending: [l('O veículo saiu de circulação sem deixar marca.', 'The outlet folded without a trace.'), l('Uma voz honesta para quem lia.', 'An honest voice for those who read it.'), l('Leitura obrigatória: a cena esperava a sua nota.', 'Required reading: the scene waited for your score.'), l('Referência: as resenhas são citadas nos livros de história da música.', 'A reference: its reviews are quoted in music history books.')] },
  { id: 'nichepub', icon: 'archive', name: l('Editora de nicho', 'Niche publisher'), desc: l('Poucas obras, bem cuidadas: compositores felizes, músicas que voltam e um nome respeitado.', 'Few works, well looked after: happy writers, songs that come back and a respected name.'),
    relevant: (s) => vl(s, 'publisher').length > 0,
    kpis: (s) => {
      const ps = vl(s, 'publisher'), X = v12(s).pub;
      const placed = ps.reduce((t, v) => t + (X[v.id]?.placed ?? 0), 0), rel = ps.reduce((t, v) => t + (X[v.id]?.relevant ?? 0), 0);
      const moods = ps.flatMap((v) => Object.values(X[v.id]?.w ?? {}).map((w) => w.mood));
      return [
        K(l('Reputação da editora', 'Publisher reputation'), Math.max(0, ...ps.map((v) => v.rep)), 80, 'num', l('O que compositores e selos falam de você.', 'What writers and labels say about you.')),
        K(l('Usos relevantes', 'Relevant placements'), placed ? rel / placed * 100 : 0, 70, 'pct', l('Usos com artista de nome ou mídia forte ÷ todos os usos (qualidade, não volume).', 'Placements with a known act or strong media ÷ all placements (quality, not volume).')),
        K(l('Obras que voltaram', 'Works brought back'), ps.reduce((t, v) => t + (X[v.id]?.revived ?? 0), 0), 5, 'num', l('Regravações e renascimentos.', 'Re-recordings and revivals.')),
        K(l('Humor dos compositores', 'Writers\' mood'), avg(moods), 70, 'num', l('Compositor feliz fica e traz outros.', 'Happy writers stay and bring others.')),
      ];
    },
    tiers: [l('Catálogo cuidado', 'A cared-for catalog'), l('Editora de autor', 'A writers\' publisher'), l('Casa de compositores', 'Home of songwriters')],
    ending: [l('As obras se perderam nas gavetas.', 'The works got lost in drawers.'), l('Um catálogo pequeno e honesto.', 'A small, honest catalog.'), l('Uma editora onde compositor quer estar.', 'A publisher where writers want to be.'), l('Casa de compositores: cada canção foi tratada como única — e voltou.', 'Home of songwriters: every song was treated as one of a kind — and came back.')] },
  { id: 'platform', icon: 'globe', name: l('Plataforma', 'Platform'), desc: l('Assinantes, acordos de catálogo e um lugar onde a música mora.', 'Subscribers, catalog deals and a place where music lives.'),
    relevant: (s) => vl(s, 'platform').length > 0,
    kpis: (s) => {
      const ps = vl(s, 'platform');
      return [
        K(l('Assinantes', 'Subscribers'), ps.reduce((t, v) => t + (v.subs ?? 0), 0), 2_000_000, 'num', l('Base paga somada.', 'Combined paying base.')),
        K(l('Acordos de catálogo', 'Catalog deals'), ps.reduce((t, v) => t + (v.deals?.length ?? 0), 0), 6, 'num', l('Selos com catálogo na plataforma.', 'Labels with their catalog on the platform.')),
        K(l('Reputação', 'Reputation'), Math.max(0, ...ps.map((v) => v.rep)), 75, 'num', l('Repasse justo e catálogo amplo.', 'Fair payouts and a broad catalog.')),
        K(l('Anos no ar', 'Years online'), Math.max(0, ...ps.map((v) => s.year - v.founded)), 8, 'num', l('Sobreviver às guerras de repasse.', 'Surviving the payout wars.')),
      ];
    },
    tiers: [l('No ar', 'Online'), l('Plataforma de nicho', 'A niche platform'), l('Onde a música mora', 'Where music lives')],
    ending: [l('A plataforma saiu do ar.', 'The platform went offline.'), l('Uma plataforma pequena com fãs fiéis.', 'A small platform with loyal fans.'), l('Uma plataforma que os selos precisam ter.', 'A platform labels need to be on.'), l('Onde a música mora: uma geração inteira ouviu tudo ali.', 'Where music lives: a whole generation heard everything there.')] },
  { id: 'free', icon: 'guitar', name: l('Carreira independente', 'Independent career'), desc: l('Sem selo, sem dono, sem dívida: uma vida na música no seu próprio nome.', 'No label, no owner, no debt: a life in music in your own name.'),
    relevant: (s) => !careers(s).active.includes('label'),
    kpis: (s) => {
      const debt = s.player.loans.length + capital(s).investors.length;
      const best = Math.max(0, ventures(s).mg.rep, pr18(s).cred, ...ventures(s).list.filter((v) => v.owner).map((v) => v.rep), ...liveOf(s).fests.map((f) => f.rep));
      return [
        K(l('Patrimônio pessoal', 'Personal wealth'), toReal(ownerOf(s).wealth, s.year), 500_000, 'usd', l('Seu dinheiro, em US$ de hoje.', 'Your money, in today\'s US$.')),
        K(l('Independência (sem dívida/sócio)', 'Independence (no debt/partner)'), clamp(100 - debt * 25, 0, 100), 100, 'pct', l('Cada empréstimo ou investidor tira 25 pontos.', 'Each loan or investor costs 25 points.')),
        K(l('Reputação no seu ofício', 'Reputation in your craft'), best, 75, 'num', l('A melhor reputação entre as suas frentes.', 'The best reputation among your fronts.')),
        K(l('Anos de carreira', 'Years of career'), s.year - s.config.startYear, 15, 'num', l('Durar fora de um selo já é vitória.', 'Lasting outside a label is already a win.')),
      ];
    },
    tiers: [l('Vivendo de música', 'Living off music'), l('Nome próprio', 'A name of one\'s own'), l('Independente de verdade', 'Truly independent')],
    ending: [l('A independência não pagou as contas.', 'Independence did not pay the bills.'), l('Uma vida na música, do seu jeito.', 'A life in music, your way.'), l('Um nome próprio, sem patrão nem credor.', 'A name of your own, no boss and no creditor.'), l('Independente de verdade: décadas sem dono, e ninguém duvida do seu ofício.', 'Truly independent: decades with no owner, and nobody doubts your craft.')] },
];
for (const p of PATHS19) if (!PATHS18.some((x) => x.id === p.id)) PATHS18.push(p);

// ---------------------------------------------------------------- marcos clássicos por carreira

export interface Classic19 { id: string; career: string; test: (s: GameState) => string | null }
const has = (s: GameState, id: string) => pa18(s).ach.some((a) => a.id === id);
const fname = (s: GameState) => liveOf(s).fests[0]?.name ?? vl(s, 'festival')[0]?.name ?? '';
export const CLASSICS19: Classic19[] = [
  { id: 'c19:first_client', career: 'manager', test: (s) => { const c = ventures(s).mg.clients[0]; return c ? s.acts[c.actId]?.name ?? null : null; } },
  { id: 'c19:first_renewal', career: 'manager', test: (s) => ((mgr12(s).ren ?? [0, 0])[0] > 0 ? '' : null) },
  { id: 'c19:first_discovery', career: 'manager', test: (s) => (mgr12(s).devHits > 0 ? '' : null) },
  { id: 'c19:client_5y', career: 'manager', test: (s) => { const c = ventures(s).mg.clients.find((x) => s.week - x.since >= 260); return c ? s.acts[c.actId]?.name ?? null : null; } },
  { id: 'c19:first_edition', career: 'festival', test: (s) => (liveOf(s).fests.some((f) => f.editions.length) || vl(s, 'festival').some((v) => v.editions?.length) ? fname(s) : null) },
  { id: 'c19:sold_out', career: 'festival', test: (s) => { const f = liveOf(s).fests.find((x) => x.editions.some((e) => e.capacity > 0 && e.attendance >= e.capacity * 0.97)); return f ? f.name : vl(s, 'festival').some((v) => v.editions?.some((e) => e.verdict === 'legend')) ? fname(s) : null; } },
  { id: 'c19:fest_profit', career: 'festival', test: (s) => (liveOf(s).fests.some((f) => f.editions.some((e) => e.revenue > e.costs)) || vl(s, 'festival').some((v) => v.editions?.some((e) => e.profit > 0)) ? fname(s) : null) },
  { id: 'c19:first_placement', career: 'publisher', test: (s) => (vl(s, 'publisher').some((v) => (v12(s).pub[v.id]?.placed ?? 0) > 0) ? '' : null) },
  { id: 'c19:first_rerecord', career: 'publisher', test: (s) => { const v = vl(s, 'publisher').find((x) => (v12(s).pub[x.id]?.revived ?? 0) > 0); return v ? v.name : null; } },
  { id: 'c19:first_standard', career: 'publisher', test: (s) => { for (const v of vl(s, 'publisher')) { const c = v.cat?.find((x) => (x.x?.lives ?? 1) >= 5); if (c) return c.title; } return null; } },
  { id: 'c19:first_session', career: 'studio', test: (s) => (vl(s, 'studio').some((v) => (v.booked ?? []).some((b) => b.n > 0)) ? '' : null) },
  { id: 'c19:house_sound', career: 'studio', test: (s) => { const v = vl(s, 'studio').find((x) => (x.sound ?? 0) >= 50); return v ? v.name : null; } },
  { id: 'c19:first_review', career: 'critic', test: (s) => (pr18(s).n > 0 ? '' : null) },
  { id: 'c19:first_scoop', career: 'critic', test: (s) => (pr18(s).scoops > 0 ? '' : null) },
  { id: 'c19:ahead_of_time', career: 'critic', test: (s) => { const r = pr18(s).revs.find((x) => (x.cd ?? 0) >= 3); return r ? s.releases[r.rel]?.title ?? '' : null; } },
  { id: 'c19:own_outlet', career: 'critic', test: (s) => pr18(s).out?.name ?? null },
  { id: 'c19:first_deal', career: 'platform', test: (s) => (vl(s, 'platform').some((v) => (v.deals?.length ?? 0) > 0) ? '' : null) },
  { id: 'c19:subs_100k', career: 'platform', test: (s) => (vl(s, 'platform').some((v) => (v.subs ?? 0) >= 100_000) ? '' : null) },
  { id: 'c19:own_venue', career: 'venue', test: (s) => liveOf(s).venue?.name ?? null },
];
export const CLASSIC_TXT19: Record<string, L> = {
  'c19:first_client': l('{y}: primeiro cliente — {x} confia a carreira a você.', '{y}: first client — {x} trusts you with their career.'),
  'c19:first_renewal': l('{y}: primeiro mandato renovado — o cliente escolheu ficar.', '{y}: first mandate renewed — the client chose to stay.'),
  'c19:first_discovery': l('{y}: primeira descoberta — de desconhecido a nome nacional.', '{y}: first discovery — from unknown to household name.'),
  'c19:client_5y': l('{y}: cinco anos com {x}.', '{y}: five years with {x}.'),
  'c19:first_edition': l('{y}: a primeira edição de {x} acontece.', '{y}: the first edition of {x} takes place.'),
  'c19:sold_out': l('{y}: primeira edição esgotada de {x}.', '{y}: {x} sells out for the first time.'),
  'c19:fest_profit': l('{y}: a primeira edição no azul de {x}.', '{y}: {x}\'s first edition in the black.'),
  'c19:first_placement': l('{y}: a primeira obra da editora ganha vida fora da gaveta.', '{y}: the publisher\'s first work gets a life outside the drawer.'),
  'c19:first_rerecord': l('{y}: a primeira obra regravada da {x}.', '{y}: {x}\'s first re-recorded work.'),
  'c19:first_standard': l('{y}: "{x}" vira standard — cinco vidas e contando.', '{y}: "{x}" becomes a standard — five lives and counting.'),
  'c19:first_session': l('{y}: primeira sessão de outro selo no seu estúdio.', '{y}: the first outside label session in your studio.'),
  'c19:house_sound': l('{y}: {x} tem um som da casa reconhecível.', '{y}: {x} has a recognizable house sound.'),
  'c19:first_review': l('{y}: a primeira resenha publicada.', '{y}: your first published review.'),
  'c19:first_scoop': l('{y}: o primeiro furo.', '{y}: your first scoop.'),
  'c19:ahead_of_time': l('{y}: à frente do seu tempo — a história deu razão à sua nota de "{x}".', '{y}: ahead of your time — history proved your score for "{x}" right.'),
  'c19:own_outlet': l('{y}: nasce o seu veículo, {x}.', '{y}: your outlet, {x}, is born.'),
  'c19:first_deal': l('{y}: o primeiro selo assina com a sua plataforma.', '{y}: the first label signs with your platform.'),
  'c19:subs_100k': l('{y}: 100 mil assinantes.', '{y}: 100,000 subscribers.'),
  'c19:own_venue': l('{y}: um palco para chamar de seu — {x}.', '{y}: a stage to call your own — {x}.'),
};
/** Verifica os marcos clássicos e reconhece os novos na hora (conquista, memória, fato, aviso). Devolve os novos. */
export function classics19(s: GameState): string[] {
  const out: string[] = [];
  for (const c of CLASSICS19) {
    if (has(s, c.id)) continue;
    let x: string | null = null;
    try { x = c.test(s); } catch { x = null; }
    if (x === null) continue;
    const t = fmtL(CLASSIC_TXT19[c.id], { y: s.year, x });
    pa18(s).ach.push({ id: c.id, y: s.year, t });
    remember(s, 'achievement', t, { important: true });
    emitFact(s, { kind: 'milestone', actors: ['player'], severity: 35, visibility: 'public', tags: ['good', 'classic19', c.career], text: t, src: 'wins19', data: { classic: c.id } });
    notify(s, t, 'good');
    out.push(c.id);
  }
  return out;
}
registerSimHook('month', 'wins19', (s) => { classics19(s); });
