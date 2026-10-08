// Biblioteca de eventos categorizada + Diretor de histórias (GDD §20).
// Cada evento: pré-condições, participantes compatíveis, cooldown, tags de conteúdo,
// opções e efeitos. O diretor escolhe entre os válidos; nunca inventa evento sem causa.

import { clamp, type Rng } from '../core/rng';
import { toReal } from '../core/money';
import { FESTIVALS, MEDIA } from '../data/catalog';
import { cityById, familyOf, genreById, l, type L } from '../data/world';
import { formatMoney } from '../core/money';
import { makeAct, makePerson, langForCity } from './people';
import type { Act, Decision, GameState } from './types';
import { fmtL, type Param, hasCard, hasMutator, hasTech, money, nextId, notify, playerActs, post, remember, rngOf, staffSkill } from './util';
import { festivalSlot, gigEstimate } from './live';
import { grantPlayerContract } from './worldgen';

export type Ctx = Record<string, string | number>;

interface Option {
  id: string;
  label: L;
  hint?: L;
  apply: (s: GameState, r: Rng, ctx: Ctx) => void;
}

export interface EventDef {
  id: string;
  cat: 'career' | 'people' | 'band' | 'contract' | 'market' | 'tech' | 'culture' | 'scandal' | 'health' | 'stage' | 'manufacturing' | 'world' | 'neural' | 'scouting' | 'business';
  tone: 'good' | 'bad' | 'neutral';
  tags: string[];
  cooldown: number; // meses
  weight?: number;
  forcedOnly?: boolean;
  find?: (s: GameState, r: Rng) => Ctx | null;
  title: L;
  text: L;
  options: Option[];
}

// ---------- helpers ----------
const mineActs = (s: GameState) => playerActs(s).map((id) => s.acts[id]);
const pickMine = (s: GameState, r: Rng, f: (a: Act) => boolean = () => true): Act | undefined => {
  const list = mineActs(s).filter(f);
  return list.length ? r.pick(list) : undefined;
};
const members = (s: GameState, a: Act) => a.members.map((id) => s.persons[id]).filter((p) => p && p.alive);
const mood = (s: GameState, a: Act, k: 'morale' | 'fatigue' | 'stress' | 'inspiration', v: number) => {
  for (const p of members(s, a)) p[k] = clamp(p[k] + v, 0, 100);
};
const act = (s: GameState, ctx: Ctx) => s.acts[String(ctx.act)];
const pay = (s: GameState, key: string, real: number, cat: string, memo: string) => post(s, key, -money(s, real), cat, memo);
const gain = (s: GameState, key: string, real: number, cat: string, memo: string) => post(s, key, money(s, real), cat, memo);
const rep = (s: GameState, k: keyof GameState['player']['reputation'], v: number) => {
  s.player.reputation[k] = clamp(s.player.reputation[k] + v, 0, 100);
};
const hiatus = (s: GameState, a: Act, weeks: number) => {
  a.hiatusUntil = s.week + weeks;
  a.status = 'hiatus';
};

export const EVENTS: EventDef[] = [
  // ---------------- Saúde e pessoas ----------------
  {
    id: 'burnout', cat: 'health', tone: 'bad', tags: ['health'], cooldown: 6,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => members(s, x).some((p) => p.fatigue > 72 && p.stress > 55));
      return a ? { act: a.id } : null;
    },
    title: l('Esgotamento em {act}', 'Burnout in {act}'),
    text: l('Depois de meses sem parar, {act} está no limite. Médicos recomendam pausa.', 'After months nonstop, {act} is at the limit. Doctors recommend a break.'),
    options: [
      { id: 'pause', label: l('Pausa de 3 meses', '3-month break'), hint: l('Recupera; perde momento.', 'Recovers; loses momentum.'), apply: (s, _r, c) => { const a = act(s, c); hiatus(s, a, 13); mood(s, a, 'fatigue', -60); mood(s, a, 'stress', -40); a.trust += 6; a.momentum *= 0.7; } },
      { id: 'therapy', label: l('Terapia e agenda leve', 'Therapy and a lighter schedule'), hint: l('Custo; recuperação parcial.', 'Cost; partial recovery.'), apply: (s, _r, c) => { const a = act(s, c); pay(s, `therapy:${a.id}`, 2500, 'artist_dev', 'Terapia'); mood(s, a, 'stress', -30); mood(s, a, 'fatigue', -25); a.trust += 3; } },
      { id: 'push', label: l('Seguir com a agenda', 'Keep the schedule'), hint: l('Risco de colapso e ressentimento.', 'Risk of collapse and resentment.'), apply: (s, r, c) => { const a = act(s, c); mood(s, a, 'morale', -15); a.trust -= 10; for (const p of members(s, a)) { p.resentment += 15; if (r.chance(0.35)) p.health = 'burnout'; } } },
    ],
  },
  {
    id: 'voice_strain', cat: 'health', tone: 'bad', tags: ['health'], cooldown: 8,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => members(s, x).some((p) => (p.role === 'vocal' || p.role === 'mc') && p.fatigue > 55));
      if (!a) return null;
      const p = members(s, a).find((m) => m.role === 'vocal' || m.role === 'mc')!;
      return { act: a.id, person: p.id };
    },
    title: l('Lesão de voz: {person}', 'Vocal injury: {person}'),
    text: l('{person} ({act}) está com a voz falhando. O fonoaudiólogo pede repouso vocal.', '{person} ({act}) is losing their voice. The vocal coach orders rest.'),
    options: [
      { id: 'rest', label: l('Repouso vocal (6 semanas)', 'Vocal rest (6 weeks)'), apply: (s, _r, c) => { const a = act(s, c); hiatus(s, a, 6); s.persons[String(c.person)].fatigue = 10; } },
      { id: 'surgery', label: l('Cirurgia e reabilitação', 'Surgery and rehab'), hint: l('Caro; volta mais forte, se der certo.', 'Expensive; comes back stronger if it works.'), apply: (s, r, c) => { const a = act(s, c); pay(s, `surg:${c.person}`, 9000, 'artist_dev', 'Cirurgia'); hiatus(s, a, 12); const p = s.persons[String(c.person)]; p.skills.voice = clamp(p.skills.voice + (r.chance(0.7) ? 3 : -8), 0, 100); } },
      { id: 'push', label: l('Cantar mesmo assim', 'Sing anyway'), hint: l('Pode perder voz de forma permanente.', 'May permanently lose range.'), apply: (s, r, c) => { const p = s.persons[String(c.person)]; if (r.chance(0.5)) { p.skills.voice = Math.max(5, p.skills.voice - r.int(6, 15)); p.health = 'voice_strain'; } p.resentment += 10; } },
    ],
  },
  {
    id: 'addiction', cat: 'health', tone: 'bad', tags: ['drugs', 'health'], cooldown: 18,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => members(s, x).some((p) => p.stress > 60 && (p.traits.includes('spendthrift') || p.traits.includes('impulsive') || p.traits.includes('melancholic'))));
      if (!a) return null;
      const p = members(s, a).find((m) => m.stress > 60)!;
      return { act: a.id, person: p.id };
    },
    title: l('Dependência: {person}', 'Addiction: {person}'),
    text: l('Pessoas próximas dizem que {person} ({act}) está dependente. A imprensa ainda não sabe.', 'People close to {person} ({act}) say they are struggling with addiction. The press does not know yet.'),
    options: [
      { id: 'treatment', label: l('Tratamento (pausa de 2 meses)', 'Treatment (2-month break)'), hint: l('Custo e pausa; recuperação provável.', 'Cost and break; likely recovery.'), apply: (s, _r, c) => { const a = act(s, c); pay(s, `rehab:${c.person}`, 6000, 'artist_dev', 'Tratamento'); hiatus(s, a, 9); const p = s.persons[String(c.person)]; p.health = 'recovering'; p.stress = 20; a.trust += 8; rep(s, 'artists', 2); remember(s, 'treatment', fmtL(l('{p} entra em tratamento com apoio do selo.', '{p} enters treatment backed by the label.'), { p: p.name }), { actId: a.id }); } },
      { id: 'cover', label: l('Abafar o caso', 'Cover it up'), hint: l('Sem custo agora; pode explodir depois.', 'No cost now; may blow up later.'), apply: (s, _r, c) => { s.flags[`coverup:${c.act}`] = s.week; const p = s.persons[String(c.person)]; p.health = 'addiction'; } },
      { id: 'ignore', label: l('Deixar como está', 'Leave it'), apply: (s, _r, c) => { const p = s.persons[String(c.person)]; p.health = 'addiction'; p.morale -= 10; } },
    ],
  },
  {
    id: 'coverup_exposed', cat: 'scandal', tone: 'bad', tags: ['drugs'], cooldown: 12,
    find: (s, r) => {
      const keys = Object.keys(s.flags).filter((k) => k.startsWith('coverup:') && s.week - s.flags[k] > 12);
      if (!keys.length || !r.chance(0.5)) return null;
      const k = r.pick(keys);
      delete s.flags[k];
      const id = k.split(':')[1];
      return s.acts[id] ? { act: id } : null;
    },
    title: l('Vazou: o caso abafado de {act}', 'Leaked: the {act} cover-up'),
    text: l('Um jornal publicou que o selo escondeu a dependência de um integrante de {act}.', 'A paper reports the label hid a {act} member\'s addiction.'),
    options: [
      { id: 'apologize', label: l('Pedir desculpas e pagar tratamento', 'Apologize and fund treatment'), apply: (s, _r, c) => { const a = act(s, c); pay(s, `rehab2:${a.id}`, 6000, 'artist_dev', 'Tratamento'); rep(s, 'institutional', -6); a.trust += 4; } },
      { id: 'deny', label: l('Negar', 'Deny'), apply: (s, _r, c) => { const a = act(s, c); rep(s, 'institutional', -12); rep(s, 'artists', -6); a.trust -= 12; } },
    ],
  },
  {
    id: 'grief', cat: 'people', tone: 'bad', tags: ['death'], cooldown: 14,
    find: (s, r) => {
      const a = pickMine(s, r);
      if (!a || !r.chance(0.3)) return null;
      return { act: a.id, person: r.pick(a.members) };
    },
    title: l('Luto em {act}', 'Grief in {act}'),
    text: l('{person} ({act}) perdeu alguém da família.', '{person} ({act}) lost a family member.'),
    options: [
      { id: 'support', label: l('Dar um mês de folga', 'Give a month off'), apply: (s, _r, c) => { const a = act(s, c); hiatus(s, a, 4); a.trust += 8; s.persons[String(c.person)].inspiration = 90; } },
      { id: 'work', label: l('Manter a agenda', 'Keep the schedule'), hint: l('A dor pode virar música — ou ressentimento.', 'Grief may become music — or resentment.'), apply: (s, _r, c) => { const p = s.persons[String(c.person)]; p.inspiration = 95; p.morale -= 15; p.resentment += 8; } },
    ],
  },
  {
    id: 'wedding', cat: 'people', tone: 'neutral', tags: [], cooldown: 10,
    find: (s, r) => {
      const a = pickMine(s, r);
      return a && r.chance(0.35) ? { act: a.id, person: r.pick(a.members) } : null;
    },
    title: l('Casamento: {person}', 'Wedding: {person}'),
    text: l('{person} ({act}) vai se casar. A imprensa quer fotos.', '{person} ({act}) is getting married. The press wants photos.'),
    options: [
      { id: 'publicize', label: l('Divulgar (capa de revista)', 'Publicize (magazine cover)'), apply: (s, _r, c) => { const a = act(s, c); a.fame = clamp(a.fame + 1.5, 0, 100); a.fans.casual += 3000; } },
      { id: 'private', label: l('Cerimônia privada', 'Private ceremony'), apply: (s, _r, c) => { const p = s.persons[String(c.person)]; p.morale += 10; act(s, c).trust += 3; } },
    ],
  },
  {
    id: 'child_born', cat: 'people', tone: 'neutral', tags: [], cooldown: 12,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => x.status === 'active');
      return a && r.chance(0.3) ? { act: a.id, person: r.pick(a.members) } : null;
    },
    title: l('{person} vai ser pai/mãe', '{person} is having a baby'),
    text: l('{person} ({act}) pede menos datas de turnê pelos próximos meses.', '{person} ({act}) asks for fewer tour dates in the coming months.'),
    options: [
      { id: 'accept', label: l('Aceitar', 'Accept'), apply: (s, _r, c) => { const a = act(s, c); a.trust += 6; s.persons[String(c.person)].morale += 12; s.flags[`fewgigs:${a.id}`] = s.week + 26; } },
      { id: 'insist', label: l('Insistir na turnê', 'Insist on touring'), apply: (s, _r, c) => { const p = s.persons[String(c.person)]; p.resentment += 20; p.morale -= 12; act(s, c).trust -= 8; } },
    ],
  },
  {
    id: 'recovery', cat: 'health', tone: 'good', tags: ['health'], cooldown: 6,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => members(s, x).some((p) => p.health === 'recovering'));
      if (!a) return null;
      return { act: a.id, person: members(s, a).find((p) => p.health === 'recovering')!.id };
    },
    title: l('Recuperação: {person}', 'Recovery: {person}'),
    text: l('{person} ({act}) está de volta, mais forte. Os fãs celebram.', '{person} ({act}) is back, stronger. Fans celebrate.'),
    options: [{ id: 'ok', label: l('Que bom', 'Great'), apply: (s, _r, c) => { const p = s.persons[String(c.person)]; p.health = 'ok'; p.morale = 80; const a = act(s, c); a.momentum += 10; remember(s, 'recovery', fmtL(l('{p} se recupera e volta aos palcos.', '{p} recovers and returns to the stage.'), { p: p.name }), { actId: a.id }); } }],
  },
  // ---------------- Banda ----------------
  {
    id: 'member_leaves', cat: 'band', tone: 'bad', tags: [], cooldown: 0, forcedOnly: true,
    title: l('{person} quer sair de {act}', '{person} wants to leave {act}'),
    text: l('Meses de insatisfação: {person} anuncia que vai deixar {act}.', 'After months of unhappiness, {person} announces they are leaving {act}.'),
    options: [
      { id: 'replace', label: l('Contratar substituto ($6.500)', 'Hire a replacement ($6,500)'), hint: l('Química nova, habilidade parecida.', 'New chemistry, similar skill.'), apply: (s, r, c) => {
        const a = act(s, c);
        const old = s.persons[String(c.person)];
        if (!a || !old) return;
        if (a.owner === 'player') pay(s, `sub:${a.id}`, 6500, 'artist_dev', 'Substituto');
        const np = makePerson(s, r, { lang: langForCity(a.city, r), role: old.role, potential: old.potential - r.int(0, 10), born: s.year - r.int(19, 30), startFrac: 0.8 });
        s.persons[np.id] = np;
        a.members = a.members.map((x) => (x === old.id ? np.id : x));
        remember(s, 'lineup', fmtL(l('{o} sai de {a}; entra {n}.', '{o} leaves {a}; {n} joins.'), { o: old.name, a: a.name, n: np.name }), { actId: a.id, important: true });
      } },
      { id: 'smaller', label: l('Seguir sem substituto', 'Carry on without replacing'), apply: (s, _r, c) => { const a = act(s, c); const old = s.persons[String(c.person)]; if (!a || !old) return; a.members = a.members.filter((x) => x !== old.id); remember(s, 'lineup', fmtL(l('{o} sai de {a}.', '{o} leaves {a}.'), { o: old.name, a: a.name }), { actId: a.id, important: true }); if (a.members.length === 0) a.status = 'split'; } },
      { id: 'convince', label: l('Tentar convencer (bônus)', 'Try to convince (bonus)'), hint: l('Pode não funcionar.', 'May not work.'), apply: (s, r, c) => { const a = act(s, c); const p = s.persons[String(c.person)]; if (!a || !p) return; if (a.owner === 'player') pay(s, `bonus:${p.id}`, 3000, 'artist_dev', 'Bônus'); if (r.chance(0.55)) { p.morale = 60; p.resentment = Math.max(0, p.resentment - 20); } else { a.members = a.members.filter((x) => x !== p.id); remember(s, 'lineup', fmtL(l('{o} sai de {a} mesmo assim.', '{o} leaves {a} anyway.'), { o: p.name, a: a.name }), { actId: a.id, important: true }); } } },
    ],
  },
  {
    id: 'credit_dispute', cat: 'band', tone: 'bad', tags: ['legal'], cooldown: 12,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => x.members.length >= 2 && x.songs.length > 3);
      return a ? { act: a.id } : null;
    },
    title: l('Disputa de crédito em {act}', 'Credit dispute in {act}'),
    text: l('Integrantes de {act} brigam pela autoria do último sucesso.', '{act} members fight over who wrote the latest hit.'),
    options: [
      { id: 'equal', label: l('Dividir igualmente', 'Split equally'), apply: (s, _r, c) => { const a = act(s, c); mood(s, a, 'morale', 2); for (const id of a.songs.slice(-3)) if (s.songs[id]) s.songs[id].writers = [...a.members]; } },
      { id: 'main', label: l('Favorecer o compositor principal', 'Favor the main writer'), apply: (s, _r, c) => { const a = act(s, c); const ms = members(s, a); ms.sort((x, y) => y.skills.comp - x.skills.comp); ms.slice(1).forEach((p) => { p.resentment += 15; p.morale -= 10; }); } },
      { id: 'mediate', label: l('Mediação jurídica', 'Legal mediation'), hint: l('Custo; reduz ressentimento.', 'Cost; reduces resentment.'), apply: (s, _r, c) => { const a = act(s, c); pay(s, `mediate:${a.id}`, staffSkill(s, 'legal') ? 600 : 2500, 'legal', 'Mediação'); mood(s, a, 'morale', 4); } },
    ],
  },
  {
    id: 'creative_block', cat: 'career', tone: 'bad', tags: [], cooldown: 8,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => members(s, x).some((p) => p.traits.includes('blocked') || p.inspiration < 15));
      return a ? { act: a.id } : null;
    },
    title: l('Bloqueio criativo em {act}', 'Creative block in {act}'),
    text: l('{act} não consegue terminar nenhuma música há semanas.', '{act} has not finished a song in weeks.'),
    options: [
      { id: 'residency', label: l('Residência artística no campo', 'Countryside art residency'), apply: (s, _r, c) => { const a = act(s, c); pay(s, `res:${a.id}`, 1500, 'artist_dev', 'Residência'); mood(s, a, 'inspiration', 50); } },
      { id: 'cowrite', label: l('Chamar compositores (writing camp)', 'Bring in writers (writing camp)'), hint: l('Músicas melhores, menos originais.', 'Better songs, less original.'), apply: (s, r, c) => { const a = act(s, c); pay(s, `camp:${a.id}`, 3500, 'artist_dev', 'Writing camp'); for (let i = 0; i < 2; i++) { const id = nextId(s, 's'); s.songs[id] = { id, actId: a.id, title: `${r.pick(['Gold', 'Neon', 'Easy', 'Summer'])} ${r.pick(['Days', 'Lights', 'Love', 'Nights'])}`, genre: a.genre, writers: [], melody: r.int(55, 80), lyrics: r.int(50, 75), performance: 0, production: 0, originality: r.int(20, 40), q: 50, recorded: false, createdWeek: s.week }; a.songs.push(id); } } },
      { id: 'wait', label: l('Esperar', 'Wait'), apply: (s, _r, c) => { mood(s, act(s, c), 'inspiration', 15); } },
    ],
  },
  {
    id: 'genre_shift', cat: 'career', tone: 'neutral', tags: [], cooldown: 18,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => !x.playerBand && (s.genrePop[x.genre] ?? 1) < 0.7);
      if (!a) return null;
      const fam = familyOf(a.genre);
      const options = Object.entries(s.genrePop).filter(([g, v]) => v > 1.1 && familyOf(g) !== fam && s.year >= 1920).map(([g]) => g);
      if (!options.length) return null;
      return { act: a.id, genre: r.pick(options) };
    },
    title: l('{act} quer mudar de gênero', '{act} wants to change genre'),
    text: l('{act} sente que o som atual cansou e quer migrar para {genreName}.', '{act} feels their sound is stale and wants to move to {genreName}.'),
    options: [
      { id: 'allow', label: l('Apoiar a virada', 'Back the shift'), apply: (s, _r, c) => { const a = act(s, c); a.genre = String(c.genre); a.momentum += 10; a.fans.core = Math.round(a.fans.core * 0.7); a.trust += 5; remember(s, 'genre_shift', fmtL(l('{a} vira a chave de gênero.', '{a} changes genre.'), { a: a.name }), { actId: a.id }); } },
      { id: 'refuse', label: l('Manter o som', 'Keep the sound'), apply: (s, _r, c) => { const a = act(s, c); a.trust -= 6; } },
    ],
  },
  // ---------------- Escândalo e imprensa ----------------
  {
    id: 'controversial_remark', cat: 'scandal', tone: 'bad', tags: ['controversy'], cooldown: 0, forcedOnly: true,
    title: l('Declaração polêmica de {act}', 'Controversial remark by {act}'),
    text: l('Numa entrevista, {act} disse algo que caiu muito mal. A repercussão cresce.', 'In an interview, {act} said something that landed badly. The backlash grows.'),
    options: [
      { id: 'apologize', label: l('Pedir desculpas', 'Apologize'), apply: (s, _r, c) => { const a = act(s, c); a.fame -= 1; a.momentum -= 6; rep(s, 'institutional', 1); } },
      { id: 'silence', label: l('Silêncio', 'Silence'), apply: (s, _r, c) => { const a = act(s, c); a.momentum -= 10; } },
      { id: 'double_down', label: l('Contra-atacar', 'Double down'), hint: l('Fãs núcleo amam; instituições não.', 'Core fans love it; institutions do not.'), apply: (s, _r, c) => { const a = act(s, c); a.fame += 2; a.fans.core = Math.round(a.fans.core * 1.15); a.fans.casual = Math.round(a.fans.casual * 0.85); rep(s, 'institutional', -5); a.scandals += 1; } },
      { id: 'support', label: l('Apoiar o artista', 'Stand by the artist'), apply: (s, _r, c) => { const a = act(s, c); a.trust += 10; rep(s, 'artists', 2); rep(s, 'institutional', -4); a.scandals += 1; if (a.owner === 'player') s.player.stats.scandalsSurvived += 1; } },
    ],
  },
  {
    id: 'leak', cat: 'scandal', tone: 'bad', tags: [], cooldown: 12,
    find: (s, r) => {
      if (s.year < 1960) return null;
      const a = pickMine(s, r, (x) => x.songs.some((id) => s.songs[id]?.recorded && !s.songs[id]?.releaseId));
      return a ? { act: a.id } : null;
    },
    title: l('Faixas de {act} vazaram', '{act} tracks leaked'),
    text: l('Gravações inéditas de {act} circulam antes do lançamento.', 'Unreleased {act} recordings are circulating before release.'),
    options: [
      { id: 'embrace', label: l('Abraçar o vazamento', 'Embrace the leak'), apply: (s, _r, c) => { const a = act(s, c); a.momentum += 12; a.fans.active += 2000; } },
      { id: 'takedown', label: l('Ação jurídica', 'Legal takedown'), apply: (s, _r, c) => { pay(s, `takedown:${c.act}`, staffSkill(s, 'legal') ? 800 : 3000, 'legal', 'Remoção'); } },
    ],
  },
  {
    id: 'critic_rave', cat: 'culture', tone: 'good', tags: [], cooldown: 4,
    find: (s, r) => {
      const rels = Object.values(s.releases).filter((x) => x.owner === 'player' && s.week - x.week < 6 && x.songs.some((id) => (s.songs[id]?.originality ?? 0) > 60));
      if (!rels.length) return null;
      const rel = r.pick(rels);
      const outlet = r.pick(MEDIA.filter((m) => m.kind === 'press' || m.kind === 'web').filter((m) => m.start <= s.year && (!m.end || m.end >= s.year)));
      return outlet ? { release: rel.id, act: rel.actId, outlet: outlet.name } : null;
    },
    title: l('{outlet} elogia {act}', '{outlet} raves about {act}'),
    text: l('A crítica de {outlet} chama o novo trabalho de {act} de "essencial".', '{outlet} calls the new {act} record "essential".'),
    options: [{ id: 'ok', label: l('Ótimo', 'Great'), apply: (s, _r, c) => { const rel = s.releases[String(c.release)]; if (rel) rel.appeal *= 1.15; rep(s, 'artistic', 3); const a = act(s, c); a.fans.core += 500; remember(s, 'rave', fmtL(l('{o} consagra "{t}".', '{o} hails "{t}".'), { o: String(c.outlet), t: rel?.title ?? '' }), { actId: a.id }); } }],
  },
  {
    id: 'critic_pan', cat: 'culture', tone: 'bad', tags: [], cooldown: 4,
    find: (s, r) => {
      const rels = Object.values(s.releases).filter((x) => x.owner === 'player' && s.week - x.week < 6 && x.q < 42);
      if (!rels.length) return null;
      const rel = r.pick(rels);
      return { release: rel.id, act: rel.actId };
    },
    title: l('Crítica arrasa {act}', 'Critics trash {act}'),
    text: l('Resenhas chamam o lançamento de {act} de "descartável".', 'Reviews call the {act} release "disposable".'),
    options: [{ id: 'ok', label: l('Acontece', 'It happens'), apply: (s, _r, c) => { const a = act(s, c); a.momentum -= 8; rep(s, 'artistic', -2); mood(s, a, 'morale', -6); } }],
  },
  {
    id: 'tv_invite', cat: 'career', tone: 'good', tags: [], cooldown: 3,
    find: (s, r) => {
      if (!hasTech(s, 'tv_music')) return null;
      const a = pickMine(s, r, (x) => x.fame > 15 && x.status === 'active');
      const show = r.pick(MEDIA.filter((m) => m.kind === 'tv' && m.start <= s.year && (!m.end || m.end >= s.year) && (m.name !== 'ClipNet' || hasTech(s, 'clipnet'))));
      return a && show ? { act: a.id, outlet: show.name } : null;
    },
    title: l('Convite: {outlet}', 'Invitation: {outlet}'),
    text: l('{outlet} quer {act} no programa da semana que vem.', '{outlet} wants {act} on next week\'s show.'),
    options: [
      { id: 'accept', label: l('Aceitar', 'Accept'), apply: (s, _r, c) => { const a = act(s, c); a.fame = clamp(a.fame + 3, 0, 100); a.fans.casual += Math.round(20000 * (1 + a.fame / 30)); a.momentum += 8; remember(s, 'tv', fmtL(l('{a} se apresenta em {o}.', '{a} performs on {o}.'), { a: a.name, o: String(c.outlet) }), { actId: a.id }); } },
      { id: 'decline', label: l('Recusar (preservar imagem)', 'Decline (protect the image)'), apply: (s, _r, c) => { const a = act(s, c); a.positioning -= 4; } },
    ],
  },
  // ---------------- Palco ----------------
  {
    id: 'festival_invite', cat: 'stage', tone: 'good', tags: [], cooldown: 2,
    find: (s, r) => {
      if (s.month < 3 || s.month > 7) return null;
      const fests = FESTIVALS.filter((f) => f.start <= s.year && f.prestige > 35 && !f.scouting);
      const a = pickMine(s, r, (x) => x.status === 'active' && x.fame > 8);
      if (!a || !fests.length) return null;
      const fam = familyOf(a.genre);
      const f = r.weighted(fests, (x) => (x.focus.includes(fam) ? 3 : 0.3));
      if (!f) return null;
      const slot = festivalSlot(s, a, f.prestige);
      if (!slot) return null;
      const fee = Math.round((slot === 'headline' ? 60000 : slot === 'afternoon' ? 12000 : 2500) * (0.5 + f.prestige / 100));
      return { act: a.id, festival: f.name, slot, fee };
    },
    title: l('{festival} convida {act}', '{festival} invites {act}'),
    text: l('Vaga de {slotName} para {act} no {festival}. Cachê de {feeTxt}.', '{slotName} slot for {act} at {festival}. Fee: {feeTxt}.'),
    options: [
      { id: 'accept', label: l('Aceitar', 'Accept'), apply: (s, _r, c) => {
        const a = act(s, c);
        const fee = money(s, Number(c.fee));
        const mult = c.slot === 'headline' ? 3 : c.slot === 'afternoon' ? 1.6 : 1;
        if (a.playerBand) post(s, `fest:${a.id}`, fee, 'live', String(c.festival));
        else if (a.contractId && s.contracts[a.contractId]?.model === '360') post(s, `fest360:${a.id}`, Math.round(fee * s.contracts[a.contractId].share360), 'live', String(c.festival));
        else a.cash += fee;
        a.fame = clamp(a.fame + 2 * mult, 0, 100);
        a.fans.casual += Math.round(15000 * mult);
        a.fans.active += Math.round(2500 * mult);
        mood(s, a, 'fatigue', 10);
        s.player.stats.festivals += 1;
        if (c.slot === 'headline') s.player.stats.headlines += 1;
        remember(s, 'festival', fmtL(l('{a} toca no {f} ({slot}).', '{a} plays {f} ({slot}).'), { a: a.name, f: String(c.festival), slot: c.slot === 'headline' ? l('headline', 'headline') : c.slot === 'afternoon' ? l('tarde', 'afternoon') : l('abertura', 'opening') }), { actId: a.id, important: c.slot === 'headline' });
      } },
      { id: 'decline', label: l('Recusar', 'Decline'), apply: () => {} },
    ],
  },
  {
    id: 'residency_offer', cat: 'stage', tone: 'good', tags: [], cooldown: 12,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => x.fame > 25);
      return a && r.chance(0.4) ? { act: a.id } : null;
    },
    title: l('Residência para {act}', 'Residency for {act}'),
    text: l('Um teatro oferece a {act} uma residência de três meses: renda estável, sem viagens, mas repetição.', 'A theatre offers {act} a three-month residency: steady pay, no travel, but repetition.'),
    options: [
      { id: 'accept', label: l('Aceitar', 'Accept'), apply: (s, _r, c) => { const a = act(s, c); const est = gigEstimate(s, a, 2, 12); const val = Math.round(est.net * 0.9); if (a.playerBand) post(s, `resid:${a.id}`, val, 'live', 'Residência'); else a.cash += val; mood(s, a, 'inspiration', -20); a.momentum -= 5; } },
      { id: 'decline', label: l('Recusar', 'Decline'), apply: () => {} },
    ],
  },
  {
    id: 'stage_accident', cat: 'stage', tone: 'bad', tags: ['violence'], cooldown: 18,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => x.fame > 20 && s.memory.some((m) => m.actId === x.id && m.kind === 'gigs' && s.week - m.week < 5));
      return a && r.chance(0.25) ? { act: a.id } : null;
    },
    title: l('Acidente em show de {act}', 'Accident at a {act} show'),
    text: l('Uma grade cedeu num show de {act}. Há feridos leves e a casa culpa a produção.', 'A barrier gave way at a {act} show. Minor injuries; the venue blames the production.'),
    options: [
      { id: 'pay', label: l('Assumir custos médicos', 'Cover medical costs'), apply: (s, _r, c) => { pay(s, `acc:${c.act}`, 8000, 'live_costs', 'Acidente'); rep(s, 'institutional', 2); } },
      { id: 'fight', label: l('Contestar na justiça', 'Contest in court'), apply: (s, r, c) => { pay(s, `acc2:${c.act}`, staffSkill(s, 'legal') ? 1500 : 4000, 'legal', 'Processo'); if (!r.chance(0.5 + staffSkill(s, 'legal') / 200)) { pay(s, `acc3:${c.act}`, 15000, 'legal', 'Indenização'); rep(s, 'institutional', -5); } } },
    ],
  },
  // ---------------- Contratos e direitos ----------------
  {
    id: 'sync_offer', cat: 'contract', tone: 'good', tags: [], cooldown: 5,
    find: (s, r) => {
      if (s.year < 1930) return null;
      const rels = Object.values(s.releases).filter((x) => (x.owner === 'player' || s.acts[x.actId]?.playerBand) && x.totalUnits > 5000);
      if (!rels.length) return null;
      const rel = r.pick(rels);
      const kind = r.pick(s.year < 1955 ? ['film'] : s.year < 2000 ? ['film', 'ad', 'tv'] : ['film', 'ad', 'tv', 'game']);
      return { release: rel.id, act: rel.actId, kind, fee: Math.round(3000 + Math.sqrt(rel.totalUnits) * 15) };
    },
    title: l('Pedido de sync: "{releaseTitle}"', 'Sync request: "{releaseTitle}"'),
    text: l('Uma produção ({kind}) quer usar "{releaseTitle}" de {act}. Master e composição são licenciados separadamente. Oferta: {feeTxt}.', 'A production ({kind}) wants "{releaseTitle}" by {act}. Master and composition are licensed separately. Offer: {feeTxt}.'),
    options: [
      { id: 'license', label: l('Licenciar', 'License'), apply: (s, _r, c) => { const a = act(s, c); const fee = Number(c.fee); gain(s, `sync:${c.release}`, fee * 0.6, 'sync', 'Sync (master)'); if (a.playerBand || s.contracts[a.contractId ?? '']?.publishing) gain(s, `syncpub:${c.release}`, fee * 0.4 * (a.playerBand ? 1 : 0.5), 'publishing', 'Sync (edição)'); a.fame += 1.2; a.fans.casual += 8000; const rel = s.releases[String(c.release)]; if (rel) rel.appeal *= 1.1; if (c.kind === 'ad' && members(s, a).some((p) => p.ambition === 'art')) a.trust -= 6; } },
      { id: 'refuse', label: l('Recusar', 'Refuse'), apply: (s, _r, c) => { const a = act(s, c); if (members(s, a).some((p) => p.ambition === 'art')) a.trust += 3; } },
    ],
  },
  {
    id: 'sampling_claim', cat: 'contract', tone: 'bad', tags: ['legal'], cooldown: 14,
    find: (s, r) => {
      if (s.year < 1980) return null;
      const rels = Object.values(s.releases).filter((x) => x.owner === 'player' && x.totalUnits > 50000);
      if (!rels.length || !r.chance(0.4)) return null;
      const rel = r.pick(rels);
      return { release: rel.id, act: rel.actId };
    },
    title: l('Reclamação de sampling: "{releaseTitle}"', 'Sampling claim: "{releaseTitle}"'),
    text: l('Os titulares de uma gravação antiga dizem que "{releaseTitle}" usa uma amostra sem liberação.', 'Owners of an old recording say "{releaseTitle}" uses an uncleared sample.'),
    options: [
      { id: 'settle', label: l('Acordo e crédito', 'Settle and credit'), apply: (s, _r, c) => { const rel = s.releases[String(c.release)]; pay(s, `samp:${c.release}`, 4000 + toReal(rel?.revenue ?? 0, s.year) * 0.1, 'legal', 'Acordo de sampling'); } },
      { id: 'fight', label: l('Disputar no Tribunal de Direitos Autorais', 'Fight at the Copyright Tribunal'), hint: l('Jurídico aumenta a chance.', 'Legal staff improves odds.'), apply: (s, r, c) => { pay(s, `sampf:${c.release}`, staffSkill(s, 'legal') ? 1500 : 5000, 'legal', 'Processo'); if (!r.chance(0.4 + staffSkill(s, 'legal') / 160)) { const rel = s.releases[String(c.release)]; pay(s, `samploss:${c.release}`, 8000 + toReal(rel?.revenue ?? 0, s.year) * 0.25, 'legal', 'Condenação'); rep(s, 'institutional', -4); remember(s, 'lawsuit', fmtL(l('Selo perde processo de sampling por "{t}".', 'Label loses sampling suit over "{t}".'), { t: rel?.title ?? '' }), { important: true }); } } },
    ],
  },
  {
    id: 'royalty_audit', cat: 'contract', tone: 'bad', tags: ['legal'], cooldown: 18,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => !x.playerBand && x.releases.length > 1 && x.trust < 55);
      return a && r.chance(0.35) ? { act: a.id } : null;
    },
    title: l('{act} pede auditoria de royalties', '{act} demands a royalty audit'),
    text: l('O advogado de {act} quer conferir os extratos dos últimos anos.', '{act}\'s lawyer wants to check statements from recent years.'),
    options: [
      { id: 'open', label: l('Abrir os livros', 'Open the books'), apply: (s, r, c) => { const a = act(s, c); if (staffSkill(s, 'rights') > 40 || r.chance(0.6)) { a.trust += 10; rep(s, 'artists', 2); } else { pay(s, `audit:${a.id}`, 5000, 'royalties', 'Diferença de auditoria'); a.trust += 2; } } },
      { id: 'stall', label: l('Enrolar', 'Stall'), apply: (s, _r, c) => { const a = act(s, c); a.trust -= 15; rep(s, 'artists', -4); } },
    ],
  },
  {
    id: 'payola_offer', cat: 'scandal', tone: 'neutral', tags: ['crime'], cooldown: 24,
    find: (s, r) => {
      if (!hasTech(s, 'radio')) return null;
      const rels = Object.values(s.releases).filter((x) => x.owner === 'player' && s.week - x.week < 4);
      if (!rels.length || !r.chance(0.35)) return null;
      const rel = r.pick(rels);
      return { release: rel.id, act: rel.actId };
    },
    title: l('Oferta "por fora" de um DJ', 'An under-the-table offer from a DJ'),
    text: l('Um DJ de rádio influente promete tocar "{releaseTitle}" a cada hora... mediante pagamento.', 'An influential radio DJ promises to spin "{releaseTitle}" every hour... for a fee.'),
    options: [
      { id: 'pay', label: l('Pagar', 'Pay'), hint: l('Ajuda agora; risco de descoberta e consequência persistente.', 'Helps now; risk of discovery and lasting consequences.'), apply: (s, _r, c) => { pay(s, `payola:${c.release}`, hasCard(s, 'corsair') ? 1500 : 3000, 'marketing', 'Divulgação (?)'); const rel = s.releases[String(c.release)]; if (rel) rel.marketingE = Math.min(0.95, rel.marketingE + 0.25); const m = remember(s, 'payola', l('O selo pagou um DJ por execuções.', 'The label paid a DJ for spins.')); s.flags.payola = m.week; } },
      { id: 'refuse', label: l('Recusar', 'Refuse'), apply: (s) => rep(s, 'institutional', 1) },
    ],
  },
  {
    id: 'payola_exposed', cat: 'scandal', tone: 'bad', tags: ['crime'], cooldown: 36,
    find: (s, r) => {
      if (!s.flags.payola || s.week - s.flags.payola < 20) return null;
      return r.chance(hasCard(s, 'corsair') ? 0.15 : 0.3) ? {} : null;
    },
    title: l('Escândalo do jabá', 'Payola scandal'),
    text: l('Uma investigação revelou pagamentos do selo a DJs. Causa: o acordo feito meses atrás.', 'An investigation uncovered the label\'s payments to DJs. Cause: the deal made months ago.'),
    options: [
      { id: 'fine', label: l('Pagar multa e colaborar', 'Pay the fine and cooperate'), apply: (s) => { pay(s, 'payola_fine', 20000, 'legal', 'Multa'); rep(s, 'institutional', -10); delete s.flags.payola; s.player.stats.scandalsSurvived += 1; } },
      { id: 'deny', label: l('Negar tudo', 'Deny everything'), apply: (s, r) => { rep(s, 'institutional', -18); rep(s, 'commercial', -4); delete s.flags.payola; if (r.chance(0.5)) pay(s, 'payola_fine2', 40000, 'legal', 'Multa'); s.player.stats.scandalsSurvived += 1; } },
    ],
  },
  {
    id: 'boycott', cat: 'culture', tone: 'bad', tags: ['controversy'], cooldown: 18,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => members(s, x).some((p) => p.traits.includes('controversial')) && x.fame > 15);
      return a && r.chance(0.4) ? { act: a.id } : null;
    },
    title: l('Boicote a {act}', 'Boycott of {act}'),
    text: l('Um grupo organizado pede boicote às letras de {act}. Algumas lojas retiram os discos.', 'An organized group calls for a boycott of {act}\'s lyrics. Some stores pull the records.'),
    options: [
      { id: 'stand', label: l('Defender a obra', 'Defend the work'), apply: (s, _r, c) => { const a = act(s, c); a.trust += 8; a.fans.core = Math.round(a.fans.core * 1.1); a.fans.casual = Math.round(a.fans.casual * 0.85); rep(s, 'artists', 3); rep(s, 'institutional', -3); } },
      { id: 'edit', label: l('Editar letras nas reprensagens', 'Edit lyrics on represses'), apply: (s, _r, c) => { const a = act(s, c); a.trust -= 10; rep(s, 'artists', -3); } },
    ],
  },
  // ---------------- Mercado e negócios ----------------
  {
    id: 'rival_poach', cat: 'market', tone: 'bad', tags: [], cooldown: 6,
    find: (s, r) => {
      const a = pickMine(s, r, (x) => {
        const c = x.contractId ? s.contracts[x.contractId] : undefined;
        return !x.playerBand && !!c && c.party === 'player' && c.endWeek - s.week < 26 && x.fame > 12;
      });
      if (!a) return null;
      const lb = r.pick(Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 200000)));
      return lb ? { act: a.id, label: lb.id } : null;
    },
    title: l('{labelName} cerca {act}', '{labelName} courts {act}'),
    text: l('O contrato de {act} vence em breve e {labelName} já ofereceu mais dinheiro.', '{act}\'s contract ends soon and {labelName} is already offering more money.'),
    options: [
      { id: 'counter', label: l('Renovar com bônus', 'Renew with a bonus'), apply: (s, r, c) => { const a = act(s, c); const k = s.contracts[a.contractId!]; const bonus = money(s, 3000 + a.fame * a.fame * 30); if (s.player.cash < bonus) return; post(s, `poach:${a.id}`, -bonus, 'advances', 'Bônus de renovação'); k.recoupBalance += bonus; a.cash += bonus; if (r.chance(0.35 + a.trust / 150)) { k.endWeek += 156; k.releasesOwed += 3; a.trust += 5; } else { a.trust -= 5; } } },
      { id: 'let_go', label: l('Deixar ir no fim do contrato', 'Let them go at term end'), apply: (s, _r, c) => { s.flags[`leaving:${c.act}`] = 1; } },
    ],
  },
  {
    id: 'rival_merger', cat: 'market', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Fusão no mercado', 'Market merger'),
    text: l('{buyerName} anunciou a compra de {targetName}. Contratos e catálogo mudam de dono.', '{buyerName} announced it is buying {targetName}. Contracts and catalog change hands.'),
    options: [{ id: 'ok', label: l('Entendido', 'Noted'), apply: (s, _r, c) => mergeLabelsSync(s, String(c.buyer), String(c.target)) }],
  },
  {
    id: 'catalog_for_sale', cat: 'business', tone: 'good', tags: [], cooldown: 18,
    find: (s, r) => {
      if (s.config.role === 'artist') return null;
      const sellers = Object.values(s.labels).filter((x) => x.active && x.cash < money(s, 150000) && Object.values(s.releases).some((rel) => rel.owner === x.id && rel.totalUnits > 20000));
      if (!sellers.length || !r.chance(0.5)) return null;
      const lb = r.pick(sellers);
      const rels = Object.values(s.releases).filter((rel) => rel.owner === lb.id && rel.totalUnits > 20000);
      const value = Math.round(rels.reduce((t, x) => t + Math.sqrt(x.totalUnits) * 40, 0));
      return { label: lb.id, price: value, n: rels.length };
    },
    title: l('Catálogo à venda: {labelName}', 'Catalog for sale: {labelName}'),
    text: l('{labelName} precisa de caixa e oferece {n} masters por {priceTxt}. Passivos vêm junto.', '{labelName} needs cash and offers {n} masters for {priceTxt}. Liabilities come along.'),
    options: [
      { id: 'buy', label: l('Comprar o catálogo', 'Buy the catalog'), apply: (s, _r, c) => { const price = money(s, Number(c.price)); if (s.player.cash < price) { notify(s, l('Caixa insuficiente para a compra.', 'Not enough cash for the purchase.'), 'bad'); return; } post(s, `catbuy:${c.label}`, -price, 'acquisitions', 'Compra de catálogo'); const lb = s.labels[String(c.label)]; lb.cash += price; for (const rel of Object.values(s.releases)) if (rel.owner === lb.id && rel.totalUnits > 20000) { rel.owner = 'player'; rel.live = true; rel.stock = 0; rel.formats = []; } remember(s, 'acquisition', fmtL(l('{c} compra o catálogo de {l}.', '{c} buys the {l} catalog.'), { c: s.config.companyName, l: lb.name }), { important: true }); } },
      { id: 'pass', label: l('Passar', 'Pass'), apply: () => {} },
    ],
  },
  {
    id: 'investor_offer', cat: 'business', tone: 'neutral', tags: [], cooldown: 36,
    find: (s, r) => {
      if (s.config.role === 'artist' || s.economy.investorUntil > s.week) return null;
      return r.chance(0.25) && s.player.reputation.commercial > 30 ? { amount: 50000 + s.player.reputation.commercial * 3000 } : null;
    },
    title: l('Um investidor bate à porta', 'An investor knocks'),
    text: l('Um fundo oferece {amountTxt} em troca de 15% das receitas de vendas pelos próximos 5 anos.', 'A fund offers {amountTxt} for 15% of sales revenue over the next 5 years.'),
    options: [
      { id: 'accept', label: l('Aceitar', 'Accept'), apply: (s, _r, c) => { gain(s, 'investor', Number(c.amount), 'financing', 'Investidor'); s.economy.investorShare = 0.15; s.economy.investorUntil = s.week + 260; } },
      { id: 'decline', label: l('Recusar', 'Decline'), apply: () => {} },
    ],
  },
  // ---------------- Fabricação ----------------
  {
    id: 'pressing_backlog', cat: 'manufacturing', tone: 'bad', tags: [], cooldown: 10,
    find: (s, r) => {
      const prs = s.pendingReleases.filter((p) => p.press > 0);
      return prs.length && r.chance(0.35) ? { pending: r.pick(prs).id } : null;
    },
    title: l('Fila na fábrica de prensagem', 'Pressing plant backlog'),
    text: l('A fábrica está atrasada. O lançamento "{pendingTitle}" pode atrasar duas semanas.', 'The plant is behind. "{pendingTitle}" may slip two weeks.'),
    options: [
      { id: 'wait', label: l('Aceitar o atraso', 'Accept the delay'), apply: (s, _r, c) => { const p = s.pendingReleases.find((x) => x.id === c.pending); if (p) p.week += 2; } },
      { id: 'rush', label: l('Pagar taxa de urgência', 'Pay a rush fee'), apply: (s, _r, c) => { pay(s, `rush:${c.pending}`, 1500, 'release', 'Urgência'); } },
    ],
  },
  {
    id: 'stock_out', cat: 'manufacturing', tone: 'neutral', tags: [], cooldown: 3,
    find: (s, r) => {
      const rels = Object.values(s.releases).filter((x) => x.owner === 'player' && x.live && x.stock <= 0 && x.pressed > 0 && x.shortage > 500 && s.week - x.week < 20 && !s.flags[`repress:${x.id}`]);
      return rels.length ? { release: r.pick(rels).id } : null;
    },
    title: l('Esgotado: "{releaseTitle}"', 'Sold out: "{releaseTitle}"'),
    text: l('O estoque físico acabou e o varejo está pedindo mais. Sucesso inesperado gera falta.', 'Physical stock ran out and retail wants more. Unexpected success creates shortages.'),
    options: [
      { id: 'repress', label: l('Reprensar (dobro da tiragem)', 'Repress (double the run)'), apply: (s, _r, c) => { const rel = s.releases[String(c.release)]; if (!rel) return; const units = Math.max(1000, rel.pressed * 2); const cost = money(s, units * 1.1 + 400); post(s, `repress:${rel.id}`, -cost, 'release', 'Reprensagem'); rel.stock += units; rel.pressed += units; s.flags[`repress:${rel.id}`] = 1; } },
      { id: 'no', label: l('Não reprensar', 'Do not repress'), apply: (s, _r, c) => { s.flags[`repress:${c.release}`] = 1; } },
    ],
  },
  // ---------------- Scouting ----------------
  {
    id: 'demo_tape', cat: 'scouting', tone: 'good', tags: [], cooldown: 4,
    find: (s, r) => {
      if (s.config.role === 'artist') return null;
      const cands = Object.values(s.acts).filter((a) => !a.owner && !s.knowledge[a.id] && (a.status === 'emerging' || a.status === 'active') && a.potential > 70);
      return cands.length && r.chance(0.5) ? { act: r.pick(cands).id } : null;
    },
    title: l('Uma demo diferente', 'A different demo'),
    text: l('Chegou uma fita de {act}. Algo nela chamou a atenção da recepção.', 'A tape from {act} arrived. Something about it caught the front desk\'s ear.'),
    options: [{ id: 'listen', label: l('Ouvir e arquivar', 'Listen and file it'), apply: (s, r, c) => { s.knowledge[String(c.act)] = { actId: String(c.act), degree: 2, stage: 'monitoring', bias: r.normal(0, 5), updatedWeek: s.week, source: 'demo' }; } }],
  },
  {
    id: 'talent_show_winner', cat: 'scouting', tone: 'good', tags: [], cooldown: 12,
    find: (s, r) => {
      if (s.year < 2002 || s.config.role === 'artist') return null;
      return r.chance(0.3) ? { city: r.pick(['new_york', 'london', 'rio', 'seoul', 'los_angeles']) } : null;
    },
    title: l('Vencedor de talent show livre no mercado', 'Talent show winner is a free agent'),
    text: l('O vencedor do Next Voice está sem contrato e com milhões de espectadores. Alta fama, potencial incerto.', 'The Next Voice winner is unsigned with millions of viewers. High fame, uncertain potential.'),
    options: [{ id: 'note', label: l('Adicionar ao radar', 'Add to radar'), apply: (s, r, c) => { const a = makeAct(s, r, { genre: r.pick(['dance_pop', 'pop_rnb', 'country_pop']), city: String(c.city), members: 1, potential: r.int(40, 80), formed: s.year, debutYear: s.year, fame: r.int(28, 40) }); a.fans.casual = 400000; a.fans.active = 40000; s.knowledge[a.id] = { actId: a.id, degree: 2, stage: 'monitoring', bias: r.normal(0, 8), updatedWeek: s.week, source: 'tv_talent' }; } }],
  },
  {
    id: 'reunion', cat: 'band', tone: 'good', tags: [], cooldown: 24,
    find: (s, r) => {
      if (s.config.role === 'artist') return null;
      const cands = Object.values(s.acts).filter((a) => (a.status === 'retired' || a.status === 'split') && (a.legend || a.hits > 1) && s.year - a.careerEnd >= 5 && s.year - a.careerEnd < 25 && members(s, a).length > 0);
      return cands.length && r.chance(0.3) ? { act: r.pick(cands).id } : null;
    },
    title: l('{act} considera uma reunião', '{act} considers a reunion'),
    text: l('Ex-integrantes de {act} toparam conversar sobre um retorno. Fãs antigos e nostalgia garantem atenção.', 'Former {act} members are open to a comeback. Old fans and nostalgia guarantee attention.'),
    options: [
      { id: 'sign', label: l('Bancar a reunião (contrato de 3 anos)', 'Fund the reunion (3-year deal)'), apply: (s, _r, c) => { const a = act(s, c); const fee = money(s, 8000 + a.fame * 400); if (s.player.cash < fee) return; post(s, `reunion:${a.id}`, -fee, 'advances', 'Reunião'); a.status = 'active'; a.careerEnd = s.year + 6; a.momentum = 70; a.archetype = 'phoenix'; grantPlayerContract(s, a, 36); s.contracts[a.contractId!].recoupBalance = fee; s.knowledge[a.id] = { actId: a.id, degree: 4, stage: 'negotiation', bias: 0, updatedWeek: s.week, source: 'reunion' }; remember(s, 'reunion', fmtL(l('{a} se reúne sob o selo {c}.', '{a} reunites on {c}.'), { a: a.name, c: s.config.companyName }), { actId: a.id, important: true }); } },
      { id: 'pass', label: l('Passar', 'Pass'), apply: () => {} },
    ],
  },
  // ---------------- Cultura ----------------
  {
    id: 'scene_explosion', cat: 'culture', tone: 'neutral', tags: [], cooldown: 6,
    find: (s, r) => {
      const hot = Object.entries(s.scenes).filter(([k, v]) => v > 18 && !s.flags[`scene:${k}`]);
      if (!hot.length) return null;
      const [k] = r.pick(hot);
      const [city, genre] = k.split(':');
      const acts = Object.values(s.acts).filter((a) => a.city === city && a.genre === genre && a.hits > 0);
      if (acts.length < 2) return null;
      return { scene: k, city, genre };
    },
    title: l('Explode a cena: {genreName} em {cityName}', 'Scene explodes: {genreName} in {cityName}'),
    text: l('Vários atos, clubes e rádios sustentam um movimento. Quem estiver lá agora surfa a onda.', 'Several acts, clubs and radio sustain a movement. Whoever is there now rides the wave.'),
    options: [
      { id: 'invest', label: l('Apoiar a cena (patrocínio)', 'Back the scene (sponsorship)'), hint: l('Custo; sinais de scouting na cidade.', 'Cost; scouting signals in the city.'), apply: (s, r, c) => { pay(s, `scene:${c.scene}`, hasCard(s, 'patron') ? 1500 : 4000, 'marketing', 'Apoio à cena'); s.flags[`scene:${c.scene}`] = 1; s.genrePop[String(c.genre)] = clamp((s.genrePop[String(c.genre)] ?? 1) + 0.35, 0, 2.2); rep(s, 'artistic', 3); for (const a of Object.values(s.acts).filter((x) => x.city === c.city && !x.owner && !s.knowledge[x.id]).slice(0, 3)) s.knowledge[a.id] = { actId: a.id, degree: 2, stage: 'monitoring', bias: r.normal(0, 5), updatedWeek: s.week, source: 'scene' }; if (hasCard(s, 'patron')) s.player.goalsDone.includes('patron') || s.flags.movement ? null : (s.flags.movement = 1); remember(s, 'movement', fmtL(l('Nasce um movimento: {g} em {ci}.', 'A movement is born: {g} in {ci}.'), { g: genreById[String(c.genre)]?.name ?? String(c.genre), ci: cityById[String(c.city)]?.name ?? String(c.city) }), { important: true }); } },
      { id: 'watch', label: l('Só observar', 'Just watch'), apply: (s, _r, c) => { s.flags[`scene:${c.scene}`] = 1; s.genrePop[String(c.genre)] = clamp((s.genrePop[String(c.genre)] ?? 1) + 0.25, 0, 2.2); } },
    ],
  },
  {
    id: 'censorship', cat: 'culture', tone: 'bad', tags: ['censorship'], cooldown: 24,
    find: (s, r) => {
      if (!hasMutator(s, 'censorship') && !r.chance(0.15)) return null;
      const rels = Object.values(s.releases).filter((x) => x.owner === 'player' && x.live && x.territories.length > 1);
      return rels.length ? { release: r.pick(rels).id } : null;
    },
    title: l('Conselho de Classificação veta "{releaseTitle}"', 'Rating Board bans "{releaseTitle}"'),
    text: l('Um mercado proibiu a execução de "{releaseTitle}" por conteúdo.', 'One market banned "{releaseTitle}" for content.'),
    options: [
      { id: 'comply', label: l('Retirar daquele mercado', 'Withdraw from that market'), apply: (s, _r, c) => { const rel = s.releases[String(c.release)]; if (rel) { rel.territories = rel.territories.slice(0, -1); rel.appeal *= 0.85; } } },
      { id: 'edit', label: l('Versão editada', 'Edited version'), apply: (s, _r, c) => { pay(s, `edit:${c.release}`, 1200, 'release', 'Versão editada'); const a = act(s, { act: s.releases[String(c.release)]?.actId ?? '' }); if (a) a.trust -= 5; } },
    ],
  },
  // ---------------- Mundo ----------------
  {
    id: 'recession', cat: 'world', tone: 'bad', tags: [], cooldown: 60,
    find: (s, r) => {
      if (s.economy.recession) return null;
      const p = hasMutator(s, 'permanent_crisis') ? 0.12 : 0.03;
      const crash = s.config.mode === 'historic' && s.year === 1930 && !s.flags.crash1930;
      if (crash) s.flags.crash1930 = 1;
      return crash || r.chance(p) ? { months: crash ? 48 : r.int(10, 24) } : null;
    },
    title: l('Recessão', 'Recession'),
    text: l('A economia encolhe. O público gasta menos com música por {months} meses (estimativa).', 'The economy shrinks. People spend less on music for about {months} months.'),
    options: [{ id: 'ok', label: l('Apertar os cintos', 'Tighten belts'), apply: (s, _r, c) => { s.economy.recession = true; s.economy.recessionUntil = s.week + Math.round(Number(c.months) * 4.35); remember(s, 'recession', l('Começa uma recessão.', 'A recession begins.'), { important: true }); } }],
  },
  {
    id: 'musicians_strike', cat: 'world', tone: 'bad', tags: [], cooldown: 120,
    find: (s, r) => (s.year > 1935 && r.chance(0.02) ? {} : null),
    title: l('Greve do Sindicato Mundial de Músicos', 'World Musicians\' Union strike'),
    text: l('Músicos de estúdio param por cachês mínimos. Gravar fica 30% mais caro por 3 meses.', 'Session players strike for minimum fees. Recording costs 30% more for 3 months.'),
    options: [{ id: 'ok', label: l('Entendido', 'Noted'), apply: (s) => { s.economy.strikeUntil = s.week + 13; remember(s, 'strike', l('Greve de músicos de estúdio.', 'Session musicians strike.')); } }],
  },
  {
    id: 'copyright_law', cat: 'world', tone: 'neutral', tags: [], cooldown: 120,
    find: (s, r) => (r.chance(0.015) ? { up: r.chance(0.6) ? 1 : 0 } : null),
    title: l('Nova lei de direitos autorais', 'New copyright law'),
    text: l('O parlamento muda a taxa de direitos mecânicos e de execução.', 'Parliament changes mechanical and performance rates.'),
    options: [{ id: 'ok', label: l('Entendido', 'Noted'), apply: (s, _r, c) => { s.economy.rightsMult = clamp(s.economy.rightsMult * (Number(c.up) ? 1.15 : 0.9), 0.6, 1.8); remember(s, 'law', Number(c.up) ? l('Lei aumenta direitos de autor.', 'Law raises songwriter royalties.') : l('Lei reduz direitos de autor.', 'Law cuts songwriter royalties.'), { important: true }); } }],
  },
  // ---------------- Arco Neural (2030+) ----------------
  {
    id: 'consent_policy', cat: 'neural', tone: 'neutral', tags: [], cooldown: 999,
    find: (s) => (hasTech(s, 'synthetic_voice') && s.player.neural.consentPolicy === 'none' && !s.flags.consentAsked ? {} : null),
    title: l('Vozes sintéticas chegaram', 'Synthetic voices have arrived'),
    text: l('Modelos clonam qualquer voz a partir de minutos de gravação. Qual será a política da casa?', 'Models can clone any voice from minutes of audio. What is the house policy?'),
    options: [
      { id: 'consent', label: l('Só com consentimento e crédito', 'Only with consent and credit'), apply: (s) => { s.flags.consentAsked = 1; s.player.neural.consentPolicy = 'consent'; rep(s, 'artists', 6); remember(s, 'neural_policy', l('O selo adota consentimento obrigatório para vozes sintéticas.', 'The label adopts mandatory consent for synthetic voices.'), { important: true }); } },
      { id: 'no_consent', label: l('Usar o que a lei permitir', 'Use whatever the law allows'), hint: l('Mais barato; artistas desconfiam.', 'Cheaper; artists grow wary.'), apply: (s) => { s.flags.consentAsked = 1; s.player.neural.consentPolicy = 'no_consent'; rep(s, 'artists', -10); remember(s, 'neural_policy', l('O selo usará vozes sintéticas sem pedir consentimento.', 'The label will use synthetic voices without asking consent.'), { important: true }); } },
      { id: 'human', label: l('Recusar vozes sintéticas', 'Refuse synthetic voices'), apply: (s) => { s.flags.consentAsked = 1; s.player.neural.consentPolicy = 'consent'; s.player.neural.humanFocus += 3; rep(s, 'artists', 4); remember(s, 'neural_policy', l('O selo se declara 100% humano.', 'The label declares itself 100% human.'), { important: true }); } },
    ],
  },
  {
    id: 'voice_license', cat: 'neural', tone: 'neutral', tags: [], cooldown: 8,
    find: (s, r) => {
      if (!hasTech(s, 'synthetic_voice')) return null;
      const a = pickMine(s, r, (x) => x.fame > 20 && x.archetype !== 'synthetic');
      return a ? { act: a.id, fee: 20000 + a.fame * 1500 } : null;
    },
    title: l('Voxera quer licenciar a voz de {act}', 'Voxera wants to license {act}\'s voice'),
    text: l('A plataforma oferece {feeTxt} por uma licença da voz de {act} por 5 anos.', 'The platform offers {feeTxt} for a 5-year license of {act}\'s voice.'),
    options: [
      { id: 'consent', label: l('Licenciar com consentimento do artista', 'License with the artist\'s consent'), apply: (s, r, c) => { const a = act(s, c); if (r.chance(0.4 + a.trust / 200)) { gain(s, `vox:${a.id}`, Number(c.fee), 'neural', 'Licença de voz'); s.player.neural.voiceLicenses += 1; a.trust += 2; } else { a.trust -= 6; notify(s, fmtL(l('{a} não consentiu.', '{a} did not consent.'), { a: a.name }), 'bad'); } } },
      { id: 'force', label: l('Licenciar sem perguntar (contrato permite)', 'License without asking (contract allows)'), hint: l('Dinheiro agora; risco de escândalo.', 'Money now; scandal risk.'), apply: (s, r, c) => { const a = act(s, c); gain(s, `vox2:${a.id}`, Number(c.fee) * 1.3, 'neural', 'Licença de voz'); s.player.neural.voiceLicenses += 1; s.player.neural.consentPolicy = 'no_consent'; a.trust -= 25; if (r.chance(0.4)) { s.player.neural.voiceScandal = true; rep(s, 'institutional', -12); remember(s, 'voice_scandal', fmtL(l('Escândalo: a voz de {a} foi licenciada sem consentimento.', 'Scandal: {a}\'s voice was licensed without consent.'), { a: a.name }), { important: true }); } } },
      { id: 'refuse', label: l('Recusar', 'Refuse'), apply: (s, _r, c) => { s.player.neural.humanFocus += 1; act(s, c).trust += 4; } },
    ],
  },
  {
    id: 'synthetic_act', cat: 'neural', tone: 'neutral', tags: [], cooldown: 18,
    find: (s, r) => (hasTech(s, 'synthetic_voice') && s.config.role !== 'artist' && r.chance(0.5) ? {} : null),
    title: l('Lançar um ato sintético?', 'Launch a synthetic act?'),
    text: l('Sua equipe pode criar um ídolo sintético: produz sem cansar, não negocia, mas a crítica desconfia.', 'Your team can build a synthetic idol: never tires, never negotiates, but critics are wary.'),
    options: [
      { id: 'launch', label: l('Criar o ato sintético', 'Create the synthetic act'), apply: (s, r) => { pay(s, 'synthact', 40000, 'neural', 'Ato sintético'); const a = makeAct(s, r, { genre: 'synthetic', city: s.config.homeCity, members: 1, potential: r.int(70, 92), formed: s.year, debutYear: s.year, archetype: 'synthetic', fame: 5 }); grantPlayerContract(s, a, 120); s.contracts[a.contractId!].royalty = 0; a.trust = 100; s.knowledge[a.id] = { actId: a.id, degree: 5, stage: 'negotiation', bias: 0, updatedWeek: s.week, source: 'lab' }; s.player.neural.synthActs += 1; rep(s, 'artistic', -4); rep(s, 'artists', -3); remember(s, 'synthetic', fmtL(l('{c} lança o ato sintético {a}.', '{c} launches the synthetic act {a}.'), { c: s.config.companyName, a: a.name }), { actId: a.id, important: true }); } },
      { id: 'no', label: l('Não', 'No'), apply: (s) => { s.player.neural.humanFocus += 1; } },
    ],
  },
  {
    id: 'catalog_training', cat: 'neural', tone: 'neutral', tags: [], cooldown: 999,
    find: (s, r) => (hasTech(s, 'synthetic_voice') && !s.player.neural.catalogTraining && !s.flags.trainingAsked && Object.values(s.releases).filter((x) => x.owner === 'player').length > 10 && r.chance(0.4) ? { fee: 50000 + Object.values(s.releases).filter((x) => x.owner === 'player').length * 4000 } : null),
    title: l('Treinar modelos com o seu catálogo', 'Train models on your catalog'),
    text: l('Uma empresa de IA quer treinar modelos com todo o seu catálogo. Oferta: {feeTxt} + centavos por geração.', 'An AI company wants to train models on your whole catalog. Offer: {feeTxt} + cents per generation.'),
    options: [
      { id: 'accept', label: l('Aceitar', 'Accept'), apply: (s, _r, c) => { s.flags.trainingAsked = 1; gain(s, 'training', Number(c.fee), 'neural', 'Licença de treino'); s.player.neural.catalogTraining = true; rep(s, 'artists', -8); remember(s, 'training', l('O catálogo do selo passa a treinar modelos de IA.', 'The label catalog now trains AI models.'), { important: true }); } },
      { id: 'refuse', label: l('Recusar', 'Refuse'), apply: (s) => { s.flags.trainingAsked = 1; s.player.neural.humanFocus += 1; rep(s, 'artists', 3); } },
    ],
  },
  {
    id: 'ghost_voice', cat: 'neural', tone: 'neutral', tags: ['death'], cooldown: 999,
    find: (s, r) => {
      if (!hasTech(s, 'synthetic_voice') || s.flags.ghostAsked) return null;
      const legends = Object.values(s.acts).filter((a) => (a.status === 'retired') && (a.legend || a.hits > 2) && (a.owner === 'player' || Object.values(s.releases).some((x) => x.actId === a.id && x.owner === 'player')));
      return legends.length && r.chance(0.5) ? { act: r.pick(legends).id } : null;
    },
    title: l('Recriar a voz de {act}?', 'Recreate {act}\'s voice?'),
    text: l('Com as masters de {act}, um modelo pode cantar músicas inéditas. Herdeiros estão divididos.', 'With {act}\'s masters, a model could sing new songs. The heirs are divided.'),
    options: [
      { id: 'yes', label: l('Lançar o "álbum fantasma"', 'Release the "ghost album"'), apply: (s, _r, c) => { s.flags.ghostAsked = 1; s.player.neural.ghostVoice = true; const a = act(s, c); gain(s, `ghost:${a.id}`, 30000 + a.fame * 2000, 'neural', 'Álbum fantasma'); rep(s, 'artistic', -6); rep(s, 'commercial', 5); remember(s, 'ghost', fmtL(l('A voz de {a} volta às paradas, recriada por IA.', '{a}\'s voice returns to the charts, recreated by AI.'), { a: a.name }), { actId: a.id, important: true }); } },
      { id: 'no', label: l('Deixar a voz descansar', 'Let the voice rest'), apply: (s) => { s.flags.ghostAsked = 1; s.player.neural.humanFocus += 1; rep(s, 'artistic', 2); } },
    ],
  },
  {
    id: 'clone_without_consent', cat: 'neural', tone: 'bad', tags: ['legal'], cooldown: 24,
    find: (s, r) => {
      if (!hasTech(s, 'synthetic_voice')) return null;
      const a = pickMine(s, r, (x) => x.fame > 30 && x.archetype !== 'synthetic');
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    title: l('Clone não autorizado de {act}', 'Unauthorized clone of {act}'),
    text: l('Faixas com a voz clonada de {act} viralizam em Loopit sem autorização.', 'Tracks with a cloned {act} voice go viral on Loopit without permission.'),
    options: [
      { id: 'sue', label: l('Processar', 'Sue'), apply: (s, r, c) => { pay(s, `clone:${c.act}`, staffSkill(s, 'legal') ? 3000 : 8000, 'legal', 'Processo'); if (r.chance(0.5 + staffSkill(s, 'legal') / 200)) { gain(s, `clonewin:${c.act}`, 25000, 'legal', 'Indenização'); act(s, c).trust += 8; } } },
      { id: 'license', label: l('Negociar licença retroativa', 'Negotiate a retroactive license'), apply: (s, _r, c) => { gain(s, `clonelic:${c.act}`, 10000, 'neural', 'Licença'); s.player.neural.voiceLicenses += 1; act(s, c).trust -= 4; } },
      { id: 'ignore', label: l('Ignorar', 'Ignore'), apply: (s, _r, c) => { act(s, c).trust -= 10; } },
    ],
  },
  {
    id: 'neural_vote', cat: 'neural', tone: 'neutral', tags: [], cooldown: 999,
    find: (s) => (hasTech(s, 'neural') && s.divergence.neural === undefined ? {} : null),
    title: l('Interface neural: o setor decide', 'Neural interface: the industry decides'),
    text: l('Um consórcio propõe tocar música direto no cérebro. A AMIF pede a posição de cada selo.', 'A consortium proposes playing music straight to the brain. AMIF asks each label to take a stand.'),
    options: [
      { id: 'support', label: l('Apoiar a adoção', 'Support adoption'), apply: (s, r) => { s.player.neural.neuralAdopted = true; const p = 0.55 + s.player.legacy.industry / 400; s.divergence.neural = r.chance(p) ? 'accepted' : 'rejected'; remember(s, 'neural', s.divergence.neural === 'accepted' ? l('A interface neural é aceita pelo mercado.', 'The neural interface is accepted by the market.') : l('O público rejeita a interface neural.', 'The public rejects the neural interface.'), { important: true }); } },
      { id: 'oppose', label: l('Opor-se', 'Oppose'), apply: (s, r) => { s.player.neural.neuralAdopted = false; s.player.neural.humanFocus += 2; const p = 0.45 - s.player.legacy.industry / 400; s.divergence.neural = r.chance(p) ? 'accepted' : 'rejected'; remember(s, 'neural', s.divergence.neural === 'accepted' ? l('Mesmo com oposição, a interface neural vence.', 'Despite opposition, the neural interface wins.') : l('A interface neural é rejeitada.', 'The neural interface is rejected.'), { important: true }); } },
    ],
  },
  {
    id: 'human_movement', cat: 'neural', tone: 'neutral', tags: [], cooldown: 30,
    find: (s, r) => (hasTech(s, 'synthetic_voice') && r.chance(0.3) ? {} : null),
    title: l('Movimento "Feito por Humanos"', '"Made by Humans" movement'),
    text: l('Artistas e fãs lançam um selo de certificação para música sem IA.', 'Artists and fans launch a certification for AI-free music.'),
    options: [
      { id: 'join', label: l('Aderir', 'Join'), apply: (s) => { s.player.neural.humanFocus += 2; rep(s, 'artists', 4); } },
      { id: 'ignore', label: l('Ignorar', 'Ignore'), apply: () => {} },
    ],
  },
  // ---------------- Insolvência: venda de ativos (GDD §18) ----------------
  {
    id: 'distress_sale', cat: 'business', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Credores na porta', 'Creditors at the door'),
    text: l('O caixa está negativo há meses. Compradores oferecem {priceTxt} por {n} masters do seu catálogo, ou {feeTxt} pelo contrato de {act}.', 'Cash has been negative for months. Buyers offer {priceTxt} for {n} of your masters, or {feeTxt} for {act}\'s contract.'),
    options: [
      { id: 'sell_catalog', label: l('Vender masters', 'Sell masters'), hint: l('Caixa agora; perde a cauda de catálogo.', 'Cash now; lose the catalog tail.'), apply: (s, _r, c) => {
        const buyer = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.cash - a.cash)[0];
        const rels = Object.values(s.releases).filter((x) => x.owner === 'player').sort((a, b) => a.week - b.week).slice(0, Number(c.n));
        for (const rel of rels) rel.owner = buyer?.id ?? 'indie';
        gain(s, 'distress_catalog', Number(c.price), 'asset_sales', 'Venda de catálogo');
        remember(s, 'distress', fmtL(l('Para sobreviver, o selo vende {n} masters a {b}.', 'To survive, the label sells {n} masters to {b}.'), { n: rels.length, b: buyer?.name ?? '?' }), { important: true });
      } },
      { id: 'sell_act', label: l('Transferir o contrato do ato', 'Transfer the act\'s contract'), apply: (s, r, c) => {
        const a = act(s, c);
        if (!a) return;
        const lb = Object.values(s.labels).filter((x) => x.active).sort((x, y) => y.cash - x.cash)[0];
        if (!lb) return;
        const k = a.contractId ? s.contracts[a.contractId] : undefined;
        if (k) { k.party = lb.id; }
        a.owner = lb.id;
        lb.roster.push(a.id);
        delete s.agenda[a.id];
        gain(s, `distress_act:${a.id}`, Number(c.fee), 'asset_sales', `Transferência ${a.name}`);
        rep(s, 'artists', -5);
        remember(s, 'distress', fmtL(l('{a} é vendido a {b} para pagar dívidas.', '{a} is sold to {b} to pay debts.'), { a: a.name, b: lb.name }), { actId: a.id, important: true });
        void r;
      } },
      { id: 'hold', label: l('Resistir', 'Hold on'), apply: () => {} },
    ],
  },
  // ---------------- Carreira do artista (papel Artista) ----------------
  {
    id: 'label_offer_band', cat: 'contract', tone: 'good', tags: [], cooldown: 8,
    find: (s, r) => {
      const id = s.player.bandActId;
      if (!id || s.config.role !== 'artist') return null;
      const a = s.acts[id];
      if (a.contractId && s.contracts[a.contractId]?.endWeek > s.week) return null;
      if (a.fame < 8 || !r.chance(0.5)) return null;
      const lb = r.pick(Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 100000)));
      if (!lb) return null;
      const adv = Math.round(1500 + a.fame * a.fame * 50);
      return { act: id, label: lb.id, advance: adv, royalty: Math.round((0.13 + a.fame / 500) * 100) };
    },
    title: l('{labelName} quer contratar {act}', '{labelName} wants to sign {act}'),
    text: l('Proposta: adiantamento de {advanceTxt}, royalties de {royalty}%, 3 anos. O selo paga fabricação e amplia a distribuição; você perde o master.', 'Offer: {advanceTxt} advance, {royalty}% royalties, 3 years. The label pays manufacturing and widens distribution; you lose the master.'),
    options: [
      { id: 'sign', label: l('Assinar', 'Sign'), apply: (s, _r, c) => { const a = act(s, c); const lb = s.labels[String(c.label)]; const adv = money(s, Number(c.advance)); const id = nextId(s, 'k'); s.contracts[id] = { id, actId: a.id, party: lb.id, model: 'classic', advance: adv, royalty: Number(c.royalty) / 100, termMonths: 36, startWeek: s.week, endWeek: s.week + 156, releasesOwed: 3, releasesDone: 0, creativeControl: false, publishing: false, share360: 0, recoupBalance: adv, promises: [] }; a.contractId = id; lb.roster.push(a.id); lb.cash -= adv; post(s, `bandadv:${id}`, adv, 'advances', `Adiantamento de ${lb.name}`); remember(s, 'signed', fmtL(l('{a} assina com {l}.', '{a} signs with {l}.'), { a: a.name, l: lb.name }), { actId: a.id, important: true }); } },
      { id: 'indie', label: l('Continuar independente', 'Stay independent'), apply: (s, _r, c) => { act(s, c).momentum += 3; } },
    ],
  },
];

function mergeLabelsSync(s: GameState, buyer: string, target: string): void {
  // import estático evitaria ciclo; a fusão é simples o bastante para ficar aqui
  const b = s.labels[buyer];
  const t = s.labels[target];
  if (!b || !t || !t.active) return;
  for (const id of t.roster) {
    const a = s.acts[id];
    if (!a) continue;
    a.owner = b.id;
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    if (c) c.party = b.id;
    b.roster.push(id);
  }
  for (const rel of Object.values(s.releases)) if (rel.owner === t.id) rel.owner = b.id;
  b.cash += t.cash;
  t.roster = [];
  t.active = false;
  t.closedYear = s.year;
  remember(s, 'merger', fmtL(l('{b} absorve {t}.', '{b} absorbs {t}.'), { b: b.name, t: t.name }), { important: true });
}

export const eventById = Object.fromEntries(EVENTS.map((e) => [e.id, e])) as Record<string, EventDef>;

/** Módulos da expansão registram seus eventos (o diretor sorteia os que têm find). */
export function registerEvents(defs: EventDef[]): void {
  for (const d of defs) {
    if (eventById[d.id]) continue;
    EVENTS.push(d);
    eventById[d.id] = d;
  }
}

// ---------- Renderização de parâmetros ----------
export function ctxParams(s: GameState, ctx: Ctx): Record<string, Param> {
  const p: Record<string, Param> = { ...ctx };
  if (ctx.act && s.acts[String(ctx.act)]) p.act = s.acts[String(ctx.act)].name;
  if (ctx.person && s.persons[String(ctx.person)]) p.person = s.persons[String(ctx.person)].name;
  if (ctx.label && s.labels[String(ctx.label)]) p.labelName = s.labels[String(ctx.label)].name;
  if (ctx.buyer && s.labels[String(ctx.buyer)]) p.buyerName = s.labels[String(ctx.buyer)].name;
  if (ctx.target && s.labels[String(ctx.target)]) p.targetName = s.labels[String(ctx.target)].name;
  if (ctx.release && s.releases[String(ctx.release)]) p.releaseTitle = s.releases[String(ctx.release)].title;
  if (ctx.pending) p.pendingTitle = s.pendingReleases.find((x) => x.id === ctx.pending)?.title ?? '';
  if (ctx.genre) p.genreName = genreById[String(ctx.genre)]?.name ?? String(ctx.genre);
  if (ctx.city) p.cityName = cityById[String(ctx.city)]?.name ?? String(ctx.city);
  const fmt = (v: number): L => ({ pt: formatMoney(money(s, v), 'pt-BR'), en: formatMoney(money(s, v), 'en-US') });
  if (ctx.fee !== undefined) p.feeTxt = fmt(Number(ctx.fee));
  if (ctx.price !== undefined) p.priceTxt = fmt(Number(ctx.price));
  if (ctx.amount !== undefined) p.amountTxt = fmt(Number(ctx.amount));
  if (ctx.advance !== undefined) p.advanceTxt = fmt(Number(ctx.advance));
  if (ctx.mem) p.memText = s.memory.find((m) => m.id === ctx.mem)?.text ?? '';
  if (ctx.other && s.acts[String(ctx.other)]) p.otherName = s.acts[String(ctx.other)].name;
  if (ctx.slot) p.slotName = ctx.slot === 'headline' ? l('headline', 'headline') : ctx.slot === 'afternoon' ? l('tarde', 'afternoon') : l('abertura', 'opening');
  return p;
}

/** Tags sensíveis nunca recaem sobre atos com regra de separação reforçada (Catálogo, regra 2). */
export const SENSITIVE_TAGS = ['drugs', 'death', 'crime', 'violence', 'controversy', 'health'];

function filtered(s: GameState, def: EventDef, ctx?: Ctx): boolean {
  if (def.tags.some((t) => s.config.contentFilters.includes(t))) return true;
  const a = ctx?.act ? s.acts[String(ctx.act)] : undefined;
  return !!a?.rs && def.tags.some((t) => SENSITIVE_TAGS.includes(t));
}

/** Cria o evento: com opções vira cartão de decisão; com uma só, aplica e avisa. */
export function emitEvent(s: GameState, r: Rng, id: string, ctx: Ctx): void {
  const def = eventById[id];
  if (!def || filtered(s, def, ctx)) {
    // filtrado: aplica o desfecho mais neutro sem mostrar o conteúdo
    if (def) def.options[def.options.length - 1].apply(s, r, ctx);
    return;
  }
  const params = ctxParams(s, ctx);
  if (def.options.length === 1) {
    def.options[0].apply(s, r, ctx);
    notify(s, fmtL(def.title, params), def.tone === 'good' ? 'good' : def.tone === 'bad' ? 'bad' : 'event');
    remember(s, `event:${def.id}`, fmtL(def.title, params), { actId: ctx.act ? String(ctx.act) : undefined });
  } else {
    const d: Decision = {
      id: nextId(s, 'd'),
      eventId: def.id,
      cat: def.cat,
      title: fmtL(def.title, params),
      text: fmtL(def.text, params),
      options: def.options.map((o) => ({ id: o.id, label: o.label, hint: o.hint })),
      ctx,
      week: s.week,
      defaultOption: def.options[def.options.length - 1].id,
      tags: def.tags,
    };
    s.decisions.push(d);
  }
  s.eventCooldowns[def.id] = s.week + def.cooldown * 4;
  s.tension = clamp(s.tension + (def.tone === 'bad' ? 0.18 : def.tone === 'good' ? -0.12 : 0.02), 0, 1);
}

export function resolveDecision(s: GameState, decisionId: string, optionId: string): boolean {
  const d = s.decisions.find((x) => x.id === decisionId);
  if (!d) return false;
  const def = eventById[d.eventId];
  const opt = def?.options.find((o) => o.id === optionId);
  if (!def || !opt) return false;
  const r = rngOf(s);
  opt.apply(s, r, d.ctx);
  s.decisions = s.decisions.filter((x) => x !== d);
  remember(s, `decision:${def.id}`, fmtL(l('{t} → {o}', '{t} → {o}'), { t: d.title, o: opt.label }), { actId: d.ctx.act ? String(d.ctx.act) : undefined });
  return true;
}

/** Diretor de histórias: Maestro (ondas), Brisa (calmo), Acaso (aleatório). Machuca, mas não mata. */
export function storyteller(s: GameState, r: Rng, monthIndex: number): void {
  const profile = s.config.storyteller;
  const freq = profile === 'brisa' ? 0.7 : profile === 'acaso' ? 1.2 : 1.35;
  let n = Math.floor(freq + r.next());
  if (s.decisions.length >= 4) n = 0; // a mesa do mês tem no máximo ~5 itens
  const monthlyCost = estimateMonthlyBurn(s);
  const struggling = s.player.cash < monthlyCost * 2 || s.player.insolvencyMonths > 0;
  const target = profile === 'maestro' ? 0.5 + 0.35 * Math.sin((monthIndex / 14) * Math.PI * 2) : 0.35;
  for (let i = 0; i < n; i++) {
    const valid: [EventDef, Ctx][] = [];
    for (const def of EVENTS) {
      if (def.forcedOnly || !def.find) continue;
      if ((s.eventCooldowns[def.id] ?? -1) > s.week) continue;
      if (filtered(s, def)) continue;
      const ctx = def.find(s, r);
      if (ctx && !filtered(s, def, ctx)) valid.push([def, ctx]);
    }
    if (!valid.length) return;
    const pick = r.weighted(valid, ([def]) => {
      let w = def.weight ?? 1;
      if (profile === 'acaso') return w;
      if (def.tone === 'bad') {
        w *= profile === 'brisa' ? 0.45 : s.tension < target ? 1.8 : 0.6;
        if (struggling) w *= 0.2;
      }
      if (def.tone === 'good') {
        w *= s.tension > target ? 1.6 : 0.8;
        if (struggling) w *= 2;
      }
      return w;
    });
    if (pick) emitEvent(s, r, pick[0].id, pick[1]);
  }
  s.tension *= 0.9;
}

export function estimateMonthlyBurn(s: GameState): number {
  const salaries = s.player.staff.reduce((t, x) => t + x.salary, 0);
  return salaries + money(s, 500 + s.player.hq * 1500);
}

