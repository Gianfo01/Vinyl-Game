// Rodada 29 (WIKI) — catálogos de PESSOAS: habilidades, traços, ambições, origens, personalidade, instrumentos,
// vícios e saúde, ações com pessoas, agenda, estilos de empresário, assinaturas de produtor, parentesco, eventos de
// vida, funções, temperamentos dos selos rivais e tabelas da persona do jogador.
// Tudo lido das tabelas reais do jogo no momento em que items() roda (nada de dado copiado aqui): só os rótulos de
// campo e as explicações do que cada coisa faz (tiradas do código) moram neste arquivo.
import '../../sim/tick';
import { l, cityById, FAMILIES, genreById, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import type { Cat29, CatItem29 } from './wiki29types';
import { AGENDA_ACTIONS, AMBITIONS, GENRE_AFFINITY, ORIGINS, SKILLS, TRAITS, traitById, type TraitDef } from '../../data/people';
import { EXTRA_ACTIONS, actionMeta } from '../../data/actions';
import { ATTR13, ATTR13_IDS, JOBS13 } from '../../sim/sys/persona13';
import { DREAM_TXT, FACETS, FACET_TXT, VALUES, VALUE_TXT, type Facet, type Value } from '../../sim/sys/soul9';
import { FAMILY_NAMES, INSTRUMENTS, MAX_INSTRUMENTS, aptitudeLabel, lessonCost } from '../../sim/sys/instruments';
import { INST27 } from '../pixel/looks27';
import { TRIPS, VICE_INFO, drugName, rehabCost, type ViceId } from '../../sim/sys/vices';
import { MED_ROLES, TREATMENT, type Treatment } from '../../sim/sys/people/health';
import { PA_GROUP, costMoney18, personActionDefs18, type PACost } from '../../sim/personact18';
import { MGR_STYLE, REAL_MGRS, type MgrStyle } from '../../data/managers14';
import { PRODUCERS, SIGNATURES, type ProducerDef } from '../../sim/studio';
import { FEE_TIER, REAL_PRODS } from '../../data/producers15';
import { INV15, REL15, kinLabel15, type Rel15 } from '../../sim/sys/kin15';
import type { KinSub27 } from '../../data/model27';
import { EVENTS } from '../../sim/sys/lifeevents10/data';
import type { Ch, Def, Fx } from '../../sim/sys/lifeevents10';
import { COMMON, GROUP_NAMES, ROLE_NAMES, TECH, VOCAL_HEALTH, type Role } from '../../sim/sys/talent/attrs';
import { ROLES27, type Role27 } from '../../data/lineup27';
import { TEMPER27, type Temper27 } from '../../sim/sys/rivals27';
import { HOB14, SPOT14 } from '../../sim/sys/leisure14';
import { BACKGROUNDS, EXTRA_BACKGROUNDS, HOBBIES, KID_EDU, PARTNER_TRAITS, type BackgroundDef, type KidEdu } from '../../sim/sys/life/data';
import { COPING, type CopingId } from '../../sim/sys/persona';
import { PLAYER_TRAITS, STYLES, VISUALS, FREE_POINTS, MAX_PLAYER_TRAITS, perkCost, playerTraitById } from '../../sim/sys/persona/data';
import type { PerkValues } from '../../sim/perks';

// ---------------------------------------------------------------- utilidades

type Row = [L, string | L];
const r = (pt: string, en: string, v: string | L): Row => [l(pt, en), v];
/** sinal tipográfico: +3 / −3 */
const sg = (n: number): string => (n > 0 ? '+' : n < 0 ? '−' : '') + String(Math.abs(Math.round(n * 100) / 100)).replace('.', ',');
/** dólares de referência (2020) */
const usdR = (d: number): string => 'US$ ' + Math.round(d).toLocaleString('pt-BR') + ' (2020)';
const pct = (x: number): string => sg(Math.round(x * 1000) / 10) + '%';
const yes = l('sim', 'yes');
const no = l('não', 'no');
/** junta vários L num só (", ") */
const joinL = (xs: L[], sep = ', '): L => l(xs.map((x) => x.pt).join(sep), xs.map((x) => x.en).join(sep));
const famName = (id: string): L => FAMILIES.find((f) => f.id === id)?.name ?? l(id, id);
const genName = (id: string): L => genreById[id]?.name ?? l(id, id);
/** estado mínimo só com o ano de referência: money(s, x) vira centavos de 2020 (sem tocar em save nenhum) */
const REF = { year: 2020, month: 0, week: 0 } as unknown as GameState;
const trName = (id: string): L => traitById[id]?.name ?? playerTraitById[id]?.name ?? l(id, id);

// ---------------------------------------------------------------- 1) habilidades

/** o que cada habilidade faz na simulação (lido do código: production, talent, tours, agenda, persona13…) */
const SKILL_FX: Record<string, [L, L]> = {
  comp: [l('Melodia e originalidade das músicas', 'Song melody and originality'), l('Quem tem a maior Composição escreve a música: a melodia nasce de ~85% dela (mais inspiração e traços). Também pesa em Harmonia, Arranjo e Criatividade, e em produtores que viram produtores.', 'The member with the highest Composition writes the song: melody comes ~85% from it (plus inspiration and traits). Also feeds Harmony, Arrangement and Creativity.')],
  lyr: [l('Letra das músicas', 'Song lyrics'), l('A melhor Escrita entre os compositores define a nota de letra. Pesa em Interpretação (vocal) e Freestyle (MC).', 'The best Lyrics among the writers sets the lyric score. Feeds Delivery (vocals) and Freestyle (MC).')],
  voice: [l('Performance de vocalistas e MCs na gravação', 'Vocal/MC performance in recording'), l('Base da performance gravada de vocal, MC e voz sintética; desgasta com shows, cigarro e idade (saúde vocal).', 'Base of recorded performance for vocals, MC and synthetic voice; wears down with gigs, smoking and age (vocal health).')],
  instr: [l('Performance dos instrumentistas na gravação', 'Instrumentalist performance in recording'), l('Base da técnica de guitarra, baixo, bateria, teclas, sopros e cordas; define o nível inicial do instrumento principal.', 'Base of technique for guitar, bass, drums, keys, horns and strings; sets the starting level of the main instrument.')],
  prod: [l('Performance de produtores e DJs; qualidade técnica', 'Producer/DJ performance; technical quality'), l('Base da performance de produtor e DJ; ajuda timbre, arranjo e dinâmica; ex-artistas com Produção alta viram produtores de equipe.', 'Base of producer and DJ performance; helps tone, arrangement and dynamics; ex-artists with high Production become staff producers.')],
  stage: [l('Shows, presença e mídia', 'Gigs, presence and media'), l('Média/máximo de Palco da formação pesa na bilheteria, na nota do show e em entrevistas. Sobe um pouco a cada show de turnê.', 'The lineup\'s Stage (mean/max) weighs on box office, show score and interviews. Rises a little with every tour date.')],
  biz: [l('Negociação e herança', 'Negotiation and inheritance'), l('Na pessoa do jogador acompanha negociação e gestão do dono; em herdeiros define quem toca o selo melhor.', 'For the player\'s person it follows owner negotiation/management; for heirs it decides who runs the label better.')],
};

const catHabilidades: Cat29 = {
  id: 'habilidades', title: l('Habilidades', 'Skills'), icon: 'brain', group: 'pessoas',
  desc: l('As sete habilidades musicais de toda pessoa (0–100, limitadas pelo potencial) e o que cada uma move no jogo.', 'The seven musical skills every person has (0–100, capped by potential) and what each one drives.'),
  items: () => SKILLS.map((k): CatItem29 => ({
    id: k.id, title: k.name, sub: SKILL_FX[k.id]?.[0], icon: k.id === 'stage' ? 'stage' : k.id === 'biz' ? 'briefcase' : k.id === 'voice' ? 'mic' : k.id === 'instr' ? 'guitar' : k.id === 'prod' ? 'mixer' : k.id === 'lyr' ? 'pen' : 'note',
    rows: [
      r('Código', 'Code', k.id), r('Escala', 'Scale', '0–100'),
      r('Origens que dão bônus', 'Origins that boost it', joinL(ORIGINS.filter((o) => (o.bonus[k.id] ?? 0) !== 0).map((o) => l(`${o.name.pt} ${sg(o.bonus[k.id] ?? 0)}`, `${o.name.en} ${sg(o.bonus[k.id] ?? 0)}`)))),
    ],
    text: SKILL_FX[k.id] ? [SKILL_FX[k.id][1]] : undefined,
    see: k.id === 'stage' ? ['mech:live'] : k.id === 'biz' ? ['mech:contracts'] : ['mech:music'],
  })),
};

// ---------------------------------------------------------------- 2) traços

const GROUP_TR: Record<TraitDef['group'], L> = {
  creative: l('Criativo', 'Creative'), social: l('Social', 'Social'), professional: l('Profissional', 'Professional'),
  emotional: l('Emocional', 'Emotional'), public: l('Público', 'Public'), temper: l('Temperamento', 'Temperament'),
};
/** o que cada modificador de traço move (sim/people.traitMod e usos diretos) */
const MOD_TXT: Record<string, L> = {
  quality: l('Qualidade (pontos na melodia ao compor)', 'Quality (melody points when writing)'),
  originality: l('Originalidade das músicas', 'Song originality'),
  output: l('Produção de músicas por mês', 'Songs written per month'),
  morale: l('Moral (alvo mensal)', 'Morale (monthly target)'),
  stress: l('Estresse (acúmulo mensal)', 'Stress (monthly build-up)'),
  trust: l('Confiança no selo', 'Trust in the label'),
  fatigue: l('Fadiga', 'Fatigue'),
  scandal: l('Risco de escândalo (entrevistas, vida)', 'Scandal risk (interviews, life)'),
  media: l('Mídia (fama ganha em entrevistas)', 'Media (fame from interviews)'),
  stage: l('Palco', 'Stage'),
  greed: l('Ganância (pede mais na negociação)', 'Greed (asks more in negotiation)'),
  loyalty: l('Lealdade (resiste a rivais)', 'Loyalty (resists rivals)'),
};

const catTracos: Cat29 = {
  id: 'tracos', title: l('Traços de personalidade', 'Personality traits'), icon: 'mask', group: 'pessoas',
  desc: l('Traços dos músicos: modificadores suaves (tendências, nunca regras). Os de temperamento puxam a pessoa para certas famílias de gênero.', 'Musician traits: soft modifiers (tendencies, never rules). Temperament traits pull the person toward certain genre families.'),
  items: () => TRAITS.map((t): CatItem29 => {
    const rows: Row[] = [r('Grupo', 'Group', GROUP_TR[t.group]), r('Código', 'Code', t.id)];
    for (const [k, v] of Object.entries(t.mod)) rows.push([MOD_TXT[k] ?? l(k, k), sg(v as number)]);
    const aff = GENRE_AFFINITY[t.id];
    if (aff) {
      const ent = Object.entries(aff).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
      rows.push(r('Afinidade de gênero', 'Genre affinity', joinL(ent.map(([f, v]) => l(`${famName(f).pt} ${sg(v ?? 0)}`, `${famName(f).en} ${sg(v ?? 0)}`)))));
    }
    if (t.group === 'temper') rows.push(r('Temperamento', 'Temperament', l('sim: puxa o gênero da pessoa e da banda', 'yes: pulls the person\'s and band\'s genre')));
    return { id: t.id, title: t.name, sub: GROUP_TR[t.group], icon: t.group === 'temper' ? 'fire' : 'mask', rows, see: aff ? ['mech:music'] : undefined };
  }),
};

// ---------------------------------------------------------------- 3) ambições, 4) origens

const AMB_FX: Record<string, L> = {
  art: l('Valoriza controle criativo e liberdade artística no contrato.', 'Values creative control and artistic freedom in the deal.'),
  fame: l('Quer divulgação, singles e turnês; pesa no valor de Fama.', 'Wants promotion, singles and tours; feeds the Fame value.'),
  money: l('Olha primeiro o adiantamento e os royalties.', 'Looks first at the advance and royalties.'),
  freedom: l('Rejeita amarras: contratos curtos e poucas obrigações.', 'Rejects shackles: short deals and few obligations.'),
  critics: l('Quer respeito da crítica; puxa o valor Arte.', 'Wants critical respect; feeds the Art value.'),
  security: l('Prefere estabilidade e família; puxa o valor Família.', 'Prefers stability and family; feeds the Family value.'),
  status: l('Quer poder e prestígio; puxa o valor Poder.', 'Wants power and prestige; feeds the Power value.'),
  legacy: l('Pensa na obra que fica; puxa o valor Fama.', 'Thinks about the lasting work; feeds the Fame value.'),
};
const catAmbicoes: Cat29 = {
  id: 'ambicoes', title: l('Ambições', 'Ambitions'), icon: 'target', group: 'pessoas',
  desc: l('O que cada artista quer da carreira: muda o que pesa na negociação e alimenta os valores da alma (soul9).', 'What each artist wants from their career: changes what matters in negotiation and feeds the soul values.'),
  items: () => AMBITIONS.map((a): CatItem29 => ({ id: a.id, title: a.name, icon: 'target', rows: [r('Código', 'Code', a.id), r('Efeito', 'Effect', AMB_FX[a.id] ?? l('—', '—'))], see: ['mech:contracts'] })),
};

const catOrigens: Cat29 = {
  id: 'origens', title: l('Origens dos músicos', 'Musician origins'), icon: 'seedling', group: 'pessoas',
  desc: l('De onde a pessoa veio musicalmente: bônus e penalidades nas habilidades iniciais.', 'Where the person came from musically: bonuses and penalties to starting skills.'),
  items: () => ORIGINS.map((o): CatItem29 => ({
    id: o.id, title: o.name, icon: 'seedling',
    rows: [r('Código', 'Code', o.id), ...Object.entries(o.bonus).map(([k, v]): Row => [SKILLS.find((x) => x.id === k)?.name ?? l(k, k), sg(v ?? 0)])],
  })),
};

// ---------------------------------------------------------------- 5) personalidade

/** onde cada faceta pesa (lido dos usos no código: traj18, bridge17, bonds9, leisure14, people16, ability18, cine18…) */
const FACET_FX: Partial<Record<Facet, L>> = {
  ego: l('Líder da banda é o de maior ego; ego alto + impulsividade causa surtos públicos; inveja de atos maiores; dois egos grandes brigam no lazer; produtores reais herdam o ego.', 'The band leader is the biggest ego; high ego + impulsiveness causes public meltdowns; envy of bigger acts; two big egos clash; real producers inherit ego.'),
  lealdade: l('Leal (72+) com confiança alta ajuda renovar; pesa em favores, casamento e no tipo de pós-carreira.', 'Loyal (72+) with high trust helps renewals; weighs on favors, marriage and post-career type.'),
  ambicao: l('Ambição acima de 70 faz o líder querer carreira solo; sonho de virar lenda; estilo de sócio ganancioso/visionário.', 'Ambition above 70 makes the leader want a solo career; legend dream; greedy/visionary partner style.'),
  impulsividade: l('Risco de vício, escândalo, surto em público e noitadas.', 'Risk of addiction, scandal, public meltdown and partying.'),
  disciplina: l('Forma física, chance de largar vício, hobbies de esporte e malhação; estilo de sócio cauteloso.', 'Fitness, odds of quitting a vice, sport/workout hobbies; cautious partner style.'),
  empatia: l('Chance de ajudar colegas, clima no lazer, humor das cenas.', 'Odds of helping peers, warmth in leisure, scene mood.'),
  vaidade: l('Malhação, noitadas e preocupação com imagem.', 'Workouts, partying and image focus.'),
  coragem: l('Reinvenção de carreira, resistência a crises (menos colapso).', 'Career reinvention, resistance to crises (fewer breakdowns).'),
  ansiedade: l('Risco de colapso nervoso e de trajetória abalada.', 'Risk of breakdown and a shaken career path.'),
  humor: l('Clima nas amizades e no bar.', 'Warmth in friendships and at the bar.'),
  teimosia: l('Difícil de convencer (−2 na conversa), trajetória conservadora, briga com outros teimosos.', 'Hard to convince (−2 in talks), conservative path, clashes with other stubborn people.'),
  generosidade: l('Ajuda colegas; oposto da ganância como sócio.', 'Helps peers; the opposite of greed as a partner.'),
  curiosidade: l('Abertura a sons novos e reinvenção; hobbies de leitura, viagem, artes e jam; sonho de virar produtor.', 'Openness to new sounds and reinvention; reading, travel, art and jam hobbies; producer dream.'),
  sociabilidade: l('Romances, noitadas, sonho de supergrupo, peso dos laços na opinião.', 'Romances, partying, supergroup dream, weight of ties in opinion.'),
  paciencia: l('Estilo de sócio cauteloso; hobbies de natureza.', 'Cautious partner style; nature hobbies.'),
  rebeldia: l('Reinvenção, ativismo, desdém por lendas.', 'Reinvention, activism, disdain for legends.'),
  perfeccionismo: l('Exigência com a qualidade de outros atos; hobbies de arte.', 'Demands quality from other acts; art hobbies.'),
  confianca: l('Confiança inicial na trajetória; menos colapsos.', 'Starting confidence in the career path; fewer breakdowns.'),
  melancolia: l('Surtos criativos tristes, colapsos, boemia e leitura.', 'Sad creative fits, breakdowns, bar life and reading.'),
  romantismo: l('Chance de romance, casamento e tempo em família.', 'Odds of romance, marriage and family time.'),
};

const catPersonalidade: Cat29 = {
  id: 'personalidade', title: l('Personalidade (ficha unificada)', 'Personality (unified sheet)'), icon: 'eye', group: 'pessoas',
  desc: l('Toda pessoa do jogo (músicos, executivos, equipe, críticos, empresários) tem 5 atributos de trabalho, 20 facetas e 12 valores (0–100). Os traços empurram facetas e valores.', 'Every person in the game (musicians, execs, staff, critics, managers) has 5 work attributes, 20 facets and 12 values (0–100). Traits push facets and values.'),
  items: () => [
    ...ATTR13_IDS.map((k): CatItem29 => ({ id: 'attr-' + k, title: ATTR13[k][0], sub: l('Atributo de trabalho', 'Work attribute'), icon: 'star', rows: [r('Tipo', 'Type', l('atributo', 'attribute')), r('Escala', 'Scale', '0–100'), r('Efeito', 'Effect', ATTR13[k][1])] })),
    ...FACETS.map((f: Facet): CatItem29 => ({
      id: 'faceta-' + f, title: FACET_TXT[f][0], sub: l('Faceta', 'Facet'), icon: 'mask',
      rows: [r('Tipo', 'Type', l('faceta', 'facet')), r('Baixo', 'Low', FACET_TXT[f][1]), r('Alto', 'High', FACET_TXT[f][2]), ...(FACET_FX[f] ? [r('Onde pesa', 'Where it matters', FACET_FX[f] as L)] : [])],
    })),
    ...VALUES.map((v: Value): CatItem29 => ({ id: 'valor-' + v, title: VALUE_TXT[v][0], sub: l('Valor', 'Value'), icon: 'compass', rows: [r('Tipo', 'Type', l('valor', 'value')), r('Baixo', 'Low', VALUE_TXT[v][1]), r('Alto', 'High', VALUE_TXT[v][2])] })),
  ],
};

const catSonhos: Cat29 = {
  id: 'sonhos', title: l('Sonhos', 'Dreams'), icon: 'sparkle', group: 'pessoas',
  desc: l('Cada músico persegue um sonho, escolhido pelas facetas e valores da alma. Realizar o sonho vira memória boa e muda o humor.', 'Each musician chases a dream, chosen from soul facets and values. Fulfilling it becomes a good memory and lifts mood.'),
  items: () => (Object.keys(DREAM_TXT) as (keyof typeof DREAM_TXT)[]).map((k): CatItem29 => ({ id: k, title: DREAM_TXT[k], icon: 'sparkle', rows: [r('Código', 'Code', k)] })),
};

const catAtributos: Cat29 = {
  id: 'atributos', title: l('Atributos detalhados', 'Detailed attributes'), icon: 'chart-up', group: 'pessoas',
  desc: l('Atributos no estilo Football Manager derivados das habilidades, personalidade e traços, com variação fixa por pessoa e evolução com treino, shows e idade.', 'Football Manager-style attributes derived from skills, personality and traits, with a fixed per-person quirk and growth from training, gigs and age.'),
  items: () => [...COMMON, VOCAL_HEALTH].map((a): CatItem29 => ({ id: a.id, title: a.name, sub: GROUP_NAMES[a.group], icon: 'chart-up', rows: [r('Grupo', 'Group', GROUP_NAMES[a.group]), r('Descrição', 'Description', a.desc), r('Escala', 'Scale', '0–100')] })),
};

// ---------------------------------------------------------------- 6) instrumentos

const catInstrumentos: Cat29 = {
  id: 'instrumentos', title: l('Instrumentos', 'Instruments'), icon: 'guitar', group: 'pessoas',
  desc: l('Cada pessoa toca até alguns instrumentos com nível 0–100. Multi-instrumentistas compõem e gravam melhor, instrumentos típicos do gênero dão bônus extra e shows rendem um pouco mais.', 'Each person plays a few instruments at level 0–100. Multi-instrumentalists write and record better, genre-typical instruments give an extra bonus and gigs earn a bit more.'),
  items: () => {
    const out: CatItem29[] = INSTRUMENTS.map((d): CatItem29 => {
      const rows: Row[] = [r('Família', 'Family', FAMILY_NAMES[d.fam]), r('Disponível desde', 'Available from', d.from ? String(d.from) : l('sempre', 'always'))];
      if (d.genres?.length) rows.push(r('Gêneros típicos (bônus forte)', 'Typical genres (strong bonus)', joinL(d.genres.map(genName))));
      if (d.families?.length) rows.push(r('Famílias de gênero (bônus leve)', 'Genre families (light bonus)', joinL(d.families.map(famName))));
      return { id: d.id, title: d.name, sub: FAMILY_NAMES[d.fam], icon: d.fam === 'voice' ? 'mic' : d.fam === 'perc' ? 'drums' : d.fam === 'electronic' ? 'turntable' : 'guitar', rows, see: d.genres?.some((g) => genreById[g]) ? d.genres.filter((g) => genreById[g]).slice(0, 4).map((g) => 'genre:' + g) : undefined };
    });
    out.push({
      id: 'regras', title: l('Regras de instrumentos e aulas', 'Instrument and lesson rules'), icon: 'book',
      rows: [
        r('Máximo de instrumentos por pessoa', 'Max instruments per person', String(MAX_INSTRUMENTS)),
        r('Aula sozinho (por mês)', 'Self-study (per month)', usdR(lessonCost(REF, false) / 100)),
        r('Aula com professor (por mês)', 'Lessons with a teacher (per month)', usdR(lessonCost(REF, true) / 100)),
        r('Nível mínimo para contar no bônus', 'Minimum level to count in the bonus', '35'),
        r('Bônus máximo por música', 'Max bonus per song', '8'),
        r('Facilidade de aprender (rótulos)', 'Learning aptitude (labels)', joinL([80, 60, 50, 30, 10].map((v) => l(`${v}: ${aptitudeLabel(v).pt}`, `${v}: ${aptitudeLabel(v).en}`)))),
      ],
      text: [l('Ganho mensal = (1,2 + facilidade/22) × fator de idade (menos de 16: 1,3; até 29: 1; até 49: 0,75; depois 0,5) × (1 − nível/115) × 1,8 com professor. O bônus soma 0,6×nível para cada instrumento diferente, 2×nível se o instrumento é típico do gênero e 0,5×nível se é da família; vai 35% para a melodia e 20% para a originalidade ao compor, 50% para a performance ao gravar e vira % de bilheteria.', 'Monthly gain = (1.2 + aptitude/22) × age factor (under 16: 1.3; to 29: 1; to 49: 0.75; then 0.5) × (1 − level/115) × 1.8 with a teacher. The bonus adds 0.6×level per distinct instrument, 2×level if genre-typical and 0.5×level if in the family; 35% goes to melody and 20% to originality when writing, 50% to performance when recording, and it becomes a % of box office.')],
    });
    // instrumentos de cena (visual dos retratos)
    INST27.forEach(([name, year, roles], i) => {
      if (i === 0) return;
      out.push({ id: 'cena-' + i, title: name, sub: l('Instrumento de cena (visual)', 'Stage instrument (visual)'), icon: 'guitar', rows: [r('Desde', 'From', year ? String(year) : l('sempre', 'always')), r('Funções que podem usar', 'Roles that can use it', joinL(roles.map((x) => ROLE_NAMES[x as Role] ?? l(x, x))))] });
    });
    return out;
  },
};

// ---------------------------------------------------------------- 7) vícios e saúde

const catVicios: Cat29 = {
  id: 'vicios', title: l('Vícios, saúde e tratamentos', 'Vices, health and treatments'), icon: 'skull', group: 'pessoas',
  desc: l('Os vícios do dono (aliviam estresse, cobram saúde e dependência), os tratamentos de saúde dos músicos e a equipe médica.', 'Owner vices (relieve stress, cost health and dependency), musicians\' health treatments and the medical team.'),
  items: () => {
    const out: CatItem29[] = (Object.keys(VICE_INFO) as ViceId[]).map((k): CatItem29 => {
      const v = VICE_INFO[k];
      return {
        id: k, title: v.name, sub: l('Vício', 'Vice'), icon: k === 'drink' ? 'fire' : 'skull',
        rows: [
          r('Custo por uso', 'Cost per use', usdR(v.cost)), r('Alívio de estresse', 'Stress relief', sg(-v.stress)),
          r('Perda de saúde', 'Health loss', sg(-v.health)), r('Dependência por uso', 'Dependency per use', sg(v.dep)),
          ...(k === 'drugs' ? [r('Nome conforme a época', 'Name by era', joinL([1950, 1965, 1985, 2005, 2020].map((y) => l(`${y}: ${drugName(y).pt}`, `${y}: ${drugName(y).en}`)), '; '))] : []),
        ],
        text: [v.desc], see: ['mech:life'],
      };
    });
    out.push({ id: 'rehab-dono', title: l('Reabilitação do dono', 'Owner rehab'), icon: 'heart', rows: [r('Custo', 'Cost', usdR(rehabCost(REF) / 100)), r('Duração', 'Duration', l('6 semanas', '6 weeks')), r('Exige dependência', 'Needs dependency', '20+'), r('Vira traço "viciado"', 'Becomes "addicted" trait', l('dependência 60+', 'dependency 60+'))], see: ['mech:life'] });
    for (const k of Object.keys(TREATMENT) as Treatment[]) {
      const t = TREATMENT[k];
      out.push({ id: 'trat-' + k, title: t.name, sub: l('Tratamento de músico', 'Musician treatment'), icon: 'heart', rows: [r('Custo', 'Cost', usdR(t.cost)), r('Duração', 'Duration', l(`${t.weeks} semanas`, `${t.weeks} weeks`)), r('Carga na agenda', 'Schedule load', t.load + '%')] });
    }
    for (const [k, m] of Object.entries(MED_ROLES)) out.push({ id: 'med-' + k, title: m.name, sub: l('Equipe médica', 'Medical staff'), icon: 'people', rows: [r('Salário base', 'Base salary', l(usdR(m.salary) + ' /mês', usdR(m.salary) + ' /month')), r('Efeito', 'Effect', m.desc)] });
    out.push({ id: 'saude-estados', title: l('Estados de saúde', 'Health states'), icon: 'warning', rows: [
      r('Voz', 'Voice', l('desgaste 0–100; calos acima de 70 (vocal e MC)', 'wear 0–100; nodes above 70 (vocals and MC)')),
      r('Audição', 'Hearing', l('dano 0–100, zumbido acima de 55, nunca regride (bateria, guitarra, DJ); protetores e retornos intra-auriculares (1987+) previnem', 'damage 0–100, tinnitus above 55, never recovers (drums, guitar, DJ); earplugs and in-ears (1987+) prevent it')),
      r('Lesão', 'Injury', l('semanas de molho por esforço (quem usa as mãos)', 'weeks out from strain (hand players)')),
      r('Dependência', 'Dependency', l('0–100; problema acima de 60; recaídas possíveis', '0–100; a problem above 60; relapses possible')),
    ] });
    return out;
  },
};

// ---------------------------------------------------------------- 8) ações com pessoas

const costTxt = (c: PACost | null): string | L => {
  if (!c) return l('varia conforme a pessoa', 'varies by person');
  const parts: L[] = [];
  const m = costMoney18(REF, c);
  if (m > 0) parts.push(l(usdR(m / 100), usdR(m / 100)));
  else if (c.shown) parts.push(l('varia conforme a pessoa', 'varies by person'));
  if (c.balls) parts.push(l(`${c.balls} bolinha(s) de tempo`, `${c.balls} time dot(s)`));
  return parts.length ? joinL(parts, ' + ') : l('grátis', 'free');
};
const catAcoes: Cat29 = {
  id: 'acoes-pessoa', title: l('Ações com pessoas', 'Person actions'), icon: 'handshake', group: 'pessoas',
  desc: l('O menu de ações na ficha de qualquer pessoa: relação, carreira, imprensa, cuidado, romance e jogo sujo. Cada uma tem espera para repetir com a mesma pessoa.', 'The action menu on anyone\'s sheet: relationship, career, press, care, romance and dirty play. Each has a cooldown before repeating with the same person.'),
  items: () => personActionDefs18().map((d): CatItem29 => {
    let c: PACost | null = null;
    try { c = d.cost ? d.cost(REF, 'p:wiki') : {}; } catch { c = null; }
    return {
      id: d.id, title: d.label, sub: PA_GROUP[d.group], icon: d.icon ?? 'handshake',
      rows: [
        r('Grupo', 'Group', PA_GROUP[d.group]), r('Custo', 'Cost', costTxt(c)),
        r('Espera para repetir', 'Cooldown', d.cooldown ? l(`${d.cooldown} semanas`, `${d.cooldown} weeks`) : l('nenhuma', 'none')),
        r('Pode falhar', 'Can fail', d.chance ? l('sim: chance calculada pela relação, opinião, fama e traços (mostrada antes)', 'yes: odds from relationship, opinion, fame and traits (shown beforehand)') : l('não', 'no')),
        r('Sorteio próprio', 'Own roll', d.selfRoll ? yes : no),
      ],
      text: d.desc ? [d.desc] : undefined, see: d.group === 'dark' ? ['mech:underworld'] : d.group === 'press' ? ['mech:press'] : ['mech:connections'],
    };
  }),
};

// ---------------------------------------------------------------- 9) agenda

const catAgenda: Cat29 = {
  id: 'agenda', title: l('Ações de agenda', 'Schedule actions'), icon: 'datebook', group: 'pessoas',
  desc: l('O que um ato ou uma pessoa pode fazer no mês. Cada ação ocupa uma parte da capacidade mensal (100%) de cada participante — as "bolinhas" da agenda.', 'What an act or a person can do in a month. Each action takes a share of each participant\'s monthly capacity (100%) — the schedule "dots".'),
  items: () => {
    const scope = (s: 'band' | 'person'): L => (s === 'band' ? l('formação inteira', 'whole lineup') : l('uma pessoa', 'one person'));
    const base = AGENDA_ACTIONS.map((a): CatItem29 => {
      const m = actionMeta(a.id);
      return { id: a.id, title: a.name, sub: l('Ação básica', 'Basic action'), icon: 'calendar', rows: [r('Custo', 'Cost', a.cost ? usdR(a.cost) : l('grátis', 'free')), r('Carga', 'Load', a.id === 'gigs' ? l('conforme as datas (4 datas ≈ 43%)', 'by dates (4 dates ≈ 43%)') : m.load + '%'), r('Quem', 'Who', scope(m.scope)), r('Meses', 'Months', String(m.months ?? 1))], text: [a.desc] };
    });
    const extra = EXTRA_ACTIONS.map((a): CatItem29 => ({ id: a.id, title: a.name, sub: l('Ação extra', 'Extra action'), icon: 'datebook', rows: [r('Custo', 'Cost', a.cost ? usdR(a.cost) : l('grátis', 'free')), r('Carga', 'Load', a.load + '%'), r('Quem', 'Who', scope(a.scope)), r('Meses', 'Months', String(a.months ?? 1))], text: [a.desc] }));
    return [...base, ...extra];
  },
};

// ---------------------------------------------------------------- 10) empresários e produtores

const catEmpresarios: Cat29 = {
  id: 'estilos-empresario', title: l('Estilos de empresário', 'Manager styles'), icon: 'tie', group: 'pessoas',
  desc: l('Todo artista com empresário traz uma exigência típica para a mesa de negociação, conforme o estilo.', 'Every artist with a manager brings a typical demand to the negotiating table, by style.'),
  items: () => (Object.keys(MGR_STYLE) as MgrStyle[]).map((k): CatItem29 => {
    const ms = REAL_MGRS.filter((m) => m.style === k);
    return { id: k, title: MGR_STYLE[k][0], icon: 'tie', rows: [r('Exigência', 'Demand', MGR_STYLE[k][1]), r('Empresários reais', 'Real managers', String(ms.length)), r('Exemplos', 'Examples', ms.slice(0, 5).map((m) => m.name).join(', ') || '—'), r('Comissão típica (média)', 'Typical commission (mean)', ms.length ? Math.round((ms.reduce((t, m) => t + m.rate, 0) / ms.length) * 100) + '%' : '—')], see: ['mech:contracts'] };
  }),
};

const catProdutores: Cat29 = {
  id: 'assinaturas-produtor', title: l('Assinaturas de produtor', 'Producer signatures'), icon: 'mixer', group: 'pessoas',
  desc: l('O som característico de cada produtor: soma pontos de produção, performance e originalidade na gravação, e combina com certas famílias de gênero. Inclui as faixas de cachê.', 'Each producer\'s signature sound: adds production, performance and originality points when recording, and fits certain genre families. Includes fee tiers.'),
  items: () => {
    const out: CatItem29[] = (Object.keys(SIGNATURES) as ProducerDef['signature'][]).map((k): CatItem29 => {
      const g = SIGNATURES[k];
      const fic = PRODUCERS.filter((p) => p.signature === k).length;
      const real = REAL_PRODS.filter((p) => p.sig === k).length;
      return { id: k, title: g.name, icon: 'mixer', rows: [r('Produção', 'Production', sg(g.prod)), r('Performance', 'Performance', sg(g.perf)), r('Originalidade', 'Originality', sg(g.orig)), r('Famílias', 'Families', joinL(g.families.map(famName))), r('Produtores fictícios', 'Fictional producers', String(fic)), r('Produtores reais (assinatura próxima)', 'Real producers (closest signature)', String(real))], see: ['mech:music'] };
    });
    for (const [t, fee] of Object.entries(FEE_TIER)) out.push({ id: 'faixa-' + t, title: l(`Faixa de cachê ${t}`, `Fee tier ${t}`), sub: l('Produtores reais', 'Real producers'), icon: 'coin', rows: [r('Cachê base por faixa gravada', 'Base fee per track', usdR(fee)), r('Produtores reais nesta faixa', 'Real producers in this tier', String(REAL_PRODS.filter((p) => String(p.tier) === t).length))] });
    return out;
  },
};

// ---------------------------------------------------------------- 11) parentesco

const SUBS: KinSub27[] = ['biological', 'adoptive', 'step', 'in_law', 'half'];
const catParentesco: Cat29 = {
  id: 'parentesco', title: l('Parentesco', 'Kinship'), icon: 'people', group: 'pessoas',
  desc: l('Laços de família entre pessoas do jogo (reais e geradas), com subtipos (de criação, postiço, por casamento, meio-irmão) e período para casamentos.', 'Family ties between people (real and generated), with subtypes (adoptive, step, in-law, half) and dates for marriages.'),
  items: () => (Object.keys(REL15) as Rel15[]).map((k): CatItem29 => {
    const subs = SUBS.map((sb) => kinLabel15({ rel: k, sub: sb })).filter((x) => x.pt !== REL15[k].pt);
    const close = (['parent', 'child', 'sibling', 'spouse'] as Rel15[]).includes(k);
    return { id: k, title: REL15[k], icon: 'people', rows: [r('Inverso', 'Inverse', REL15[INV15[k]]), r('Laço próximo', 'Close tie', close ? l('sim (exceto por casamento/postiço): luto, rixa e ajuda pesam mais', 'yes (except in-law/step): grief, feuds and help weigh more') : no), r('Subtipos', 'Subtypes', subs.length ? joinL(subs) : '—')], see: ['mech:connections'] };
  }),
};

// ---------------------------------------------------------------- 12) eventos de vida

const fxText = (fx: Fx): L => {
  const p: L[] = [];
  const n = (pt: string, en: string, v: number | undefined): void => { if (v) p.push(l(`${pt} ${sg(v)}`, `${en} ${sg(v)}`)); };
  n('saúde', 'health', fx.h); n('estresse', 'stress', fx.st);
  if (fx.w) p.push(l(`patrimônio ${fx.w < 0 ? '−' : '+'}${usdR(Math.abs(fx.w))}`, `wealth ${fx.w < 0 ? '−' : '+'}${usdR(Math.abs(fx.w))}`));
  if (fx.cash) p.push(l(`caixa do selo ${fx.cash < 0 ? '−' : '+'}${usdR(Math.abs(fx.cash))}`, `label cash ${fx.cash < 0 ? '−' : '+'}${usdR(Math.abs(fx.cash))}`));
  n('rep. artística', 'artistic rep.', fx.art); n('rep. institucional', 'institutional rep.', fx.ins); n('rep. comercial', 'commercial rep.', fx.com); n('rep. entre artistas', 'rep. among artists', fx.arts);
  n('amor', 'love', fx.love); n('fama', 'fame', fx.fame); n('vínculo com filho', 'kid bond', fx.kidBond); n('atenção da polícia', 'police heat', fx.heat);
  if (fx.attr) p.push(l(`${fx.attr[0]} ${sg(fx.attr[1])}`, `${fx.attr[0]} ${sg(fx.attr[1])}`));
  n('moral da pessoa', 'person morale', fx.mor); n('ressentimento', 'resentment', fx.res); n('fama do ato', 'act fame', fx.afame);
  if (fx.fans) p.push(l(`fãs ${sg(fx.fans)}%`, `fans ${sg(fx.fans)}%`));
  if (fx.dep) p.push(l(`dependência (${VICE_INFO[fx.dep[0]]?.name.pt ?? fx.dep[0]}) ${sg(fx.dep[1])}`, `dependency (${VICE_INFO[fx.dep[0]]?.name.en ?? fx.dep[0]}) ${sg(fx.dep[1])}`));
  n('engajamento', 'engagement', fx.eng); n('devoção', 'devotion', fx.dev);
  if (fx.pol) p.push(l(`política → ${fx.pol}`, `politics → ${fx.pol}`));
  if (fx.rel) p.push(l(`religião → ${fx.rel}`, `religion → ${fx.rel}`));
  if (fx.gain) p.push(l(`ganha traço ${trName(fx.gain).pt}`, `gains trait ${trName(fx.gain).en}`));
  if (fx.lose) p.push(l(`perde traço ${trName(fx.lose).pt}`, `loses trait ${trName(fx.lose).en}`));
  if (fx.breakup) p.push(l('fim do relacionamento', 'breakup'));
  if (fx.marry) p.push(l('casamento', 'marriage'));
  if (fx.engage) p.push(l('noivado', 'engagement (to marry)'));
  if (fx.baby) p.push(l('bebê', 'baby'));
  return p.length ? joinL(p) : l('sem efeito fixo', 'no fixed effect');
};
const chRow = (c: Ch, isDef: boolean): Row => {
  let v = fxText(c.fx);
  const extras: L[] = [];
  if (c.energy) extras.push(l(`${c.energy} de tempo livre`, `${c.energy} free time`));
  if (c.odds && typeof c.odds.p === 'number') extras.push(l(`${Math.round(c.odds.p * 100)}% de dar errado: ${fxText(c.odds.fx).pt}`, `${Math.round(c.odds.p * 100)}% chance it goes wrong: ${fxText(c.odds.fx).en}`));
  else if (c.odds) extras.push(l('pode dar errado (chance variável)', 'may go wrong (variable odds)'));
  if (c.next) extras.push(l(`sequência em ${c.next.m} meses`, `follow-up in ${c.next.m} months`));
  if (c.dyn) extras.push(l('efeito extra conforme o contexto', 'extra effect by context'));
  if (extras.length) v = joinL([v, ...extras], '; ');
  const lab = isDef ? l(`${c.label.pt} (padrão)`, `${c.label.en} (default)`) : c.label;
  return [lab, v];
};
const catEventosVida: Cat29 = {
  id: 'eventos-de-vida', title: l('Eventos de vida', 'Life events'), icon: 'heart', group: 'pessoas',
  desc: l('Acontecimentos pessoais do dono (família, saúde, dinheiro, fé, vícios, fama). Todo mês há chance de 0–1 evento com 2–4 respostas; sem resposta vale a padrão.', 'Personal events for the owner (family, health, money, faith, vices, fame). Each month there is a chance of 0–1 event with 2–4 answers; ignoring picks the default.'),
  items: () => EVENTS.map((e: Def): CatItem29 => ({
    id: e.id, title: e.name, icon: 'heart',
    rows: [
      r('Época', 'Era', e.era ? `${e.era[0]}–${e.era[1]}` : l('qualquer', 'any')),
      r('Espera para repetir', 'Cooldown', e.once ? l('acontece uma vez só', 'happens only once') : l(`${e.cool} meses`, `${e.cool} months`)),
      ...(e.chain ? [r('Tipo', 'Type', l('sequência de outro evento', 'follow-up of another event'))] : []),
      ...e.ch.map((c) => chRow(c, c.id === e.def)),
    ],
    text: e.ctx23 ? [e.ctx23] : undefined, see: ['mech:life'],
  })),
};

// ---------------------------------------------------------------- 13) funções

const ROLE_FX: Partial<Record<Role, L>> = {
  vocal: l('Grava com Voz; desgaste vocal e calos; costuma ser o rosto e o líder da banda.', 'Records with Voice; vocal wear and nodes; often the face and leader of the band.'),
  mc: l('Grava com Voz e letra; desgaste vocal; freestyle em batalhas.', 'Records with Voice and lyrics; vocal wear; freestyle in battles.'),
  guitar: l('Grava com Instrumento; dano auditivo e lesões nas mãos.', 'Records with Instrument; hearing damage and hand injuries.'),
  bass: l('Grava com Instrumento; lesões nas mãos.', 'Records with Instrument; hand injuries.'),
  drums: l('Grava com Instrumento; o mais exposto a dano auditivo e lesões.', 'Records with Instrument; the most exposed to hearing damage and injuries.'),
  keys: l('Grava com Instrumento; lesões nas mãos.', 'Records with Instrument; hand injuries.'),
  horns: l('Grava com Instrumento; lesões nas mãos.', 'Records with Instrument; hand injuries.'),
  strings: l('Grava com Instrumento; lesões nas mãos.', 'Records with Instrument; hand injuries.'),
  dj: l('Grava com Produção; dano auditivo.', 'Records with Production; hearing damage.'),
  producer: l('Grava com Produção; ex-artistas viram produtores de equipe.', 'Records with Production; ex-artists become staff producers.'),
  synthetic: l('Voz sintética (era neural): grava com Voz, sem desgaste humano.', 'Synthetic voice (neural era): records with Voice, no human wear.'),
};
const EXTRA_R: Record<string, L> = { harmonica: l('Gaita', 'Harmonica'), piano: l('Piano', 'Piano'), rhythm: l('Guitarra base', 'Rhythm guitar') };
const catFuncoes: Cat29 = {
  id: 'funcoes', title: l('Funções na banda', 'Band roles'), icon: 'stage', group: 'pessoas',
  desc: l('A função principal de cada músico define a habilidade que vale na gravação, os atributos técnicos e os riscos de saúde. Músicos reais têm funções extras (gaita, piano, guitarra base…).', 'A musician\'s main role sets which skill counts in recording, the technical attributes and health risks. Real musicians have extra roles (harmonica, piano, rhythm guitar…).'),
  items: () => {
    const all = Object.values(ROLES27).flat().map((x) => (Array.isArray(x) ? x[0] : x) as Role27);
    const cnt = (k: string): number => all.filter((x) => x === k).length;
    const out: CatItem29[] = (Object.keys(ROLE_NAMES) as Role[]).map((k): CatItem29 => ({
      id: k, title: ROLE_NAMES[k], icon: k === 'vocal' || k === 'mc' ? 'mic' : k === 'drums' ? 'drums' : k === 'dj' ? 'turntable' : k === 'producer' ? 'mixer' : 'guitar',
      rows: [r('O que faz', 'What it does', ROLE_FX[k] ?? l('—', '—')), r('Atributos técnicos', 'Technical attributes', joinL((TECH[k] ?? []).map((a) => a.name)) ), r('Músicos reais com esta função extra', 'Real musicians with this extra role', String(cnt(k)))],
      see: ['mech:music'],
    }));
    for (const k of Object.keys(EXTRA_R)) out.push({ id: 'extra-' + k, title: EXTRA_R[k], sub: l('Função extra (músicos reais)', 'Extra role (real musicians)'), icon: 'note', rows: [r('Músicos reais', 'Real musicians', String(cnt(k)))] });
    for (const j of JOBS13) if (j.id === 'artist' || j.id === 'exec' || j.id === 'critic') out.push({ id: 'cargo-' + j.id, title: j.name, sub: l('Cargo na ficha unificada', 'Job on the unified sheet'), icon: 'briefcase', rows: [r('Código', 'Code', j.id)] });
    return out;
  },
};

// ---------------------------------------------------------------- temperamentos dos rivais

const catTemperamentos: Cat29 = {
  id: 'temperamentos-rivais', title: l('Temperamentos dos selos rivais', 'Rival label temperaments'), icon: 'chess', group: 'pessoas',
  desc: l('Cada selo rival reage a você conforme o temperamento (vindo do estilo do chefe ou do arquétipo do selo): guarda mágoa, copia, revida ou dá lance mais alto.', 'Each rival label reacts to you by temperament (from the boss\'s style or the label archetype): holds grudges, copies, retaliates or bids higher.'),
  items: () => (Object.keys(TEMPER27) as Temper27[]).map((k): CatItem29 => ({ id: k, title: TEMPER27[k][0], icon: 'chess', rows: [r('Código', 'Code', k), r('Comportamento', 'Behavior', TEMPER27[k][1])], see: ['mech:reputation'] })),
};

// ---------------------------------------------------------------- persona do jogador

const PERK_TXT: Record<string, L> = {
  offer: l('peso das ofertas', 'offer weight'), critics: l('nota da crítica', 'critic score'), songQ: l('qualidade das músicas', 'song quality'), trust: l('confiança', 'trust'),
  morale: l('moral do elenco/mês', 'roster morale/month'), scoutActions: l('ações de scouting', 'scouting actions'), signals: l('sinais de scouting/mês', 'scouting signals/month'),
  energy: l('tempo livre/mês', 'free time/month'), demos: l('demos', 'demos'), reputation: l('reputação', 'reputation'), appeal: l('apelo', 'appeal'),
  showRevenue: l('bilheteria', 'box office'), chartUnits: l('vendas', 'sales'), pressingCost: l('custo de fabricação', 'manufacturing cost'),
  scoutAccuracy: l('precisão do scouting', 'scouting accuracy'), stress: l('estresse', 'stress'), xp: l('experiência', 'XP'), valuation: l('valor da empresa', 'company valuation'),
  staffCost: l('salários', 'salaries'), wealth: l('renda pessoal/mês (US$ 2020)', 'personal income/month (US$ 2020)'), advance: l('adiantamentos', 'advances'), scheme: l('tramas', 'schemes'), metadata: l('metadados', 'metadata'),
};
const PCT_PERKS = new Set(['offer', 'appeal', 'showRevenue', 'chartUnits', 'pressingCost', 'scoutAccuracy', 'valuation', 'staffCost', 'advance', 'scheme', 'xp', 'stress']);
const perksTxt = (pv: PerkValues | undefined): L => {
  const e = Object.entries(pv ?? {});
  if (!e.length) return l('—', '—');
  return joinL(e.map(([k, v]) => { const val = PCT_PERKS.has(k) ? pct(v ?? 0) : sg(v ?? 0); const n = PERK_TXT[k] ?? l(k, k); return l(`${n.pt} ${val}`, `${n.en} ${val}`); }));
};
const OWNER_A: Record<string, L> = { ear: ATTR13.ear[0], negotiation: ATTR13.neg[0], charisma: ATTR13.cha[0], management: ATTR13.mgmt[0] };
const attrsTxt = (a: Partial<Record<string, number>> | undefined): L => { const e = Object.entries(a ?? {}); return e.length ? joinL(e.map(([k, v]) => l(`${(OWNER_A[k] ?? l(k, k)).pt} ${sg(v ?? 0)}`, `${(OWNER_A[k] ?? l(k, k)).en} ${sg(v ?? 0)}`))) : l('—', '—'); };
const skillsTxt = (a: Partial<Record<string, number>> | undefined): L => { const e = Object.entries(a ?? {}); return e.length ? joinL(e.map(([k, v]) => { const n = SKILLS.find((x) => x.id === k)?.name ?? l(k, k); return l(`${n.pt} ${sg(v ?? 0)}`, `${n.en} ${sg(v ?? 0)}`); })) : l('—', '—'); };

const catOrigensJogador: Cat29 = {
  id: 'origens-jogador', title: l('Origens do jogador', 'Player backgrounds'), icon: 'compass', group: 'pessoas',
  desc: l('O passado do dono do selo: atributos de dono, habilidades musicais iniciais, patrimônio, função na banda, traço e efeitos de jogo.', 'The label owner\'s past: owner attributes, starting musical skills, wealth, band role, trait and gameplay effects.'),
  items: () => [...BACKGROUNDS, ...EXTRA_BACKGROUNDS].map((b: BackgroundDef): CatItem29 => ({
    id: b.id, title: b.name, sub: EXTRA_BACKGROUNDS.includes(b) ? l('Só em trajetórias', 'Trajectories only') : undefined, icon: 'compass',
    rows: [
      r('Atributos de dono', 'Owner attributes', attrsTxt(b.owner)), r('Habilidades', 'Skills', skillsTxt(b.skills)),
      r('Nível musical inicial', 'Starting musical level', Math.round(b.musical * 100) + l('% do potencial', '% of potential').pt),
      r('Patrimônio pessoal', 'Personal wealth', usdR(b.wealth)), ...(b.startCash ? [r('Caixa inicial extra', 'Extra starting cash', (b.startCash < 0 ? '−' : '+') + usdR(Math.abs(b.startCash)))] : []),
      r('Função na banda', 'Band role', ROLE_NAMES[b.role] ?? l(b.role, b.role)), r('Traço', 'Trait', joinL(b.traits.map(trName))),
      r('Perks', 'Perks', perksTxt(b.perks)),
      ...(b.families ? [r('Perks em famílias', 'Perks for families', l(`${joinL(b.families.ids.map(famName)).pt}: ${perksTxt(b.families.perks).pt}`, `${joinL(b.families.ids.map(famName)).en}: ${perksTxt(b.families.perks).en}`))] : []),
    ],
    text: [b.desc, ...(b.effects ? [b.effects] : [])], see: ['mech:start'],
  })),
};

const catTracosJogador: Cat29 = {
  id: 'tracos-jogador', title: l('Traços do jogador', 'Player traits'), icon: 'crown', group: 'pessoas',
  desc: l('Traços escolhíveis do dono na criação (até o máximo), com opostos, atributos, habilidades e perks. Alguns são herdáveis; outros só se conquistam em jogo.', 'Owner traits chosen at creation (up to the max), with opposites, attributes, skills and perks. Some are heritable; others are only earned in play.'),
  items: () => PLAYER_TRAITS.map((t): CatItem29 => ({
    id: t.id, title: t.name, icon: 'crown',
    rows: [
      r('Oposto', 'Opposite', t.opposite ? trName(t.opposite) : '—'), r('Atributos', 'Attributes', attrsTxt(t.attrs)), r('Habilidades', 'Skills', skillsTxt(t.skills)),
      r('Perks', 'Perks', perksTxt(t.perks)), r('Traço na pessoa', 'Person trait', t.personTrait ? trName(t.personTrait) : '—'),
      ...(t.families ? [r('Perks em famílias', 'Perks for families', l(`${joinL(t.families.ids.map(famName)).pt}: ${perksTxt(t.families.perks).pt}`, `${joinL(t.families.ids.map(famName)).en}: ${perksTxt(t.families.perks).en}`))] : []),
      r('Herdável', 'Heritable', t.congenital ? yes : no), r('Conquistado em jogo', 'Earned in play', t.earned ? yes : no),
      r('Máximo na criação', 'Max at creation', String(MAX_PLAYER_TRAITS)),
    ],
    text: [t.desc], see: ['mech:start'],
  })),
};

const catEstilosVida: Cat29 = {
  id: 'estilos-vida', title: l('Estilos de vida e visual do dono', 'Owner lifestyles and looks'), icon: 'star', group: 'pessoas',
  desc: l('Estilos de liderança com árvore de perks (comprados com experiência) e visuais do dono, que mudam atributos e afinidade com cenas.', 'Leadership styles with a perk tree (bought with XP) and owner looks, which change attributes and scene affinity.'),
  items: () => [
    ...STYLES.map((st): CatItem29 => ({
      id: st.id, title: st.name, sub: l('Estilo de vida', 'Lifestyle'), icon: st.icon,
      rows: [r('Atributos', 'Attributes', attrsTxt(st.attrs)), ...st.perks.map((p, i): Row => [l(`${i + 1}. ${p.name.pt} (${perkCost(i)} XP)`, `${i + 1}. ${p.name.en} (${perkCost(i)} XP)`), l(`${p.desc.pt} [${perksTxt(p.values).pt}]`, `${p.desc.en} [${perksTxt(p.values).en}]`)])],
      text: [st.desc], see: ['mech:start'],
    })),
    ...VISUALS.map((v): CatItem29 => ({ id: 'visual-' + v.id, title: v.name, sub: l('Visual', 'Look'), icon: 'eye', rows: [r('Atributos', 'Attributes', attrsTxt(v.attrs)), r('Cenas que reconhecem', 'Scenes that recognise it', v.families?.length ? joinL(v.families.map(famName)) : '—')], text: [v.desc] })),
    { id: 'pontos-livres', title: l('Pontos livres na criação', 'Free points at creation'), icon: 'dice', rows: [r('Pontos para distribuir nos atributos de dono', 'Points to spread across owner attributes', String(FREE_POINTS))] },
  ],
};

const catVidaPessoal: Cat29 = {
  id: 'vida-pessoal', title: l('Vida pessoal: lazer, viagens e família', 'Personal life: leisure, trips and family'), icon: 'house', group: 'pessoas',
  desc: l('Formas de lidar com o estresse, hobbies do dono, lazer dos músicos (escolhido pelas facetas), viagens que inspiram, educação dos filhos e o jeito do parceiro.', 'Ways of coping, owner hobbies, musicians\' leisure (picked from facets), inspiring trips, kids\' schooling and partner temperament.'),
  items: () => {
    const out: CatItem29[] = [];
    for (const k of Object.keys(COPING) as CopingId[]) out.push({ id: 'coping-' + k, title: COPING[k].name, sub: l('Válvula de escape', 'Coping'), icon: 'stress', rows: [r('Efeito', 'Effect', COPING[k].desc)] });
    for (const h of HOBBIES) out.push({ id: 'hobby-' + h.id, title: h.name, sub: l('Hobby do dono', 'Owner hobby'), icon: 'sparkle', rows: [r('Custo por mês', 'Cost per month', usdR(h.cost)), r('Efeito', 'Effect', h.desc)] });
    const FX: Record<string, L> = { mor: l('moral', 'morale'), insp: l('inspiração', 'inspiration'), str: l('estresse', 'stress'), fat: l('fadiga', 'fatigue'), fit: l('forma física', 'fitness'), dep: l('dependência', 'dependency') };
    for (const h of HOB14) {
      const sp = SPOT14[h.spot];
      out.push({ id: 'lazer-' + h.id, title: h.name, sub: l('Lazer dos músicos', 'Musician leisure'), icon: 'people', rows: [
        r('Lugar', 'Place', sp.name(2000)), r('Custo da saída', 'Outing cost', usdR(sp.cost)), r('Desde', 'From', h.from ? String(h.from) : l('sempre', 'always')),
        r('Efeitos', 'Effects', joinL(Object.entries(h.fx).map(([k, v]) => l(`${(FX[k] ?? l(k, k)).pt} ${sg(v ?? 0)}`, `${(FX[k] ?? l(k, k)).en} ${sg(v ?? 0)}`)))),
        ...(h.theme ? [r('Tema que inspira', 'Theme it inspires', h.theme)] : []),
      ], text: [sp.why] });
    }
    for (const t of TRIPS) out.push({ id: 'viagem-' + t.id, title: t.name, sub: l('Viagem do dono', 'Owner trip'), icon: 'plane', rows: [
      r('Custo', 'Cost', usdR(t.cost)), r('Estresse', 'Stress', sg(-t.stress)), r('Saúde', 'Health', sg(t.health)), r('Inspiração', 'Inspiration', sg(t.inspiration)),
      r('Desde', 'From', t.from ? String(t.from) : l('sempre', 'always')), ...(t.trait ? [r('Pode dar o traço', 'May grant trait', trName(t.trait))] : []),
    ], text: [t.desc], see: cityById[t.city] ? ['city:' + t.city] : undefined });
    for (const k of Object.keys(KID_EDU) as KidEdu[]) out.push({ id: 'escola-' + k, title: KID_EDU[k].name, sub: l('Educação dos filhos', 'Kids\' schooling'), icon: 'book', rows: [r('Mensalidade', 'Monthly fee', KID_EDU[k].monthly ? usdR(KID_EDU[k].monthly) : l('grátis', 'free')), r('Aptidão musical', 'Musical aptitude', Math.round(KID_EDU[k].apt * 100) + '%')] });
    const LIKES: Record<string, L> = { family: l('família', 'family'), fame: l('fama', 'fame'), money: l('dinheiro', 'money'), music: l('música', 'music'), calm: l('calma', 'calm') };
    for (const p of PARTNER_TRAITS) out.push({ id: 'parceiro-' + p.id, title: p.name, sub: l('Jeito do parceiro(a)', 'Partner temperament'), icon: 'heart', rows: [r('Valoriza', 'Values', LIKES[p.likes] ?? l(p.likes, p.likes))] });
    return out;
  },
};

export const CATS_A: Cat29[] = [
  catHabilidades, catTracos, catAmbicoes, catOrigens, catPersonalidade, catSonhos, catAtributos, catInstrumentos, catVicios,
  catAcoes, catAgenda, catEmpresarios, catProdutores, catParentesco, catEventosVida, catFuncoes, catTemperamentos,
  catOrigensJogador, catTracosJogador, catEstilosVida, catVidaPessoal,
];
