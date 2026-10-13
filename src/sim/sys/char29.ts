// Rodada 29 — funções do personagem no começo do jogo (chamado por life.ts applyCharacter, antes do r10 ensureBandVocalist).
// 1. As funções extras da ficha (cfg.character.roles27) vão para Person.roles27 (exibição "Guitarra · Vocal", roles27.ts)
//    e viram instrumentos de verdade: quem marca Vocal/MC ganha a voz como instrumento (vocals10 `sings`), então a banda
//    não precisa de outro cantor; as outras ganham o instrumento da função.
// 2. A banda gerada completa o personagem: integrante com a MESMA função do personagem (ou cantor, se o personagem já
//    canta) passa para uma função que falta no conjunto do gênero. Hip hop e eletrônica só trocam dentro do próprio
//    conjunto (MCs repetidos são normais). Não sorteia nada: o resto do mundo não muda.

import { familyOf, type FamilyId } from '../../data/world';
import type { Act, GameState, Person } from '../types';
import { ROLES29, roleOpen29, singsRole29 } from '../char29data';
import { grantInstrument, instrumentsOf } from './instruments';
import { VOICE_MIN } from './vocals10';

/** Conjunto de funções por família (o mesmo de people.ts ROLE_SETS) e o conjunto geral. */
const SETS29: Partial<Record<FamilyId, Person['role'][]>> = {
  blues_jazz: ['vocal', 'horns', 'keys', 'bass', 'drums', 'strings'],
  hiphop: ['mc', 'producer', 'dj'],
  electronic: ['producer', 'dj', 'keys', 'vocal'],
  sacred: ['vocal', 'strings', 'keys', 'horns'],
};
const GENERAL29: Person['role'][] = ['vocal', 'guitar', 'bass', 'drums', 'keys', 'horns'];

/** Instrumento de cada função no ano (guitarra elétrica só a partir de 1936; produção no computador a partir de 1990). */
export function instOfRole29(role: string, year: number): string {
  switch (role) {
    case 'vocal': case 'mc': return 'voice';
    case 'guitar': return year >= 1936 ? 'guitar' : 'acoustic';
    case 'keys': return 'piano';
    case 'horns': return 'sax';
    case 'strings': return 'violin';
    case 'dj': return 'turntables';
    case 'producer': return year >= 1990 ? 'daw' : year >= 1965 ? 'synth' : 'piano';
    default: return role; // bass, drums
  }
}

function giveRole(s: GameState, p: Person, role: string): void {
  if (singsRole29(role)) {
    p.skills.voice = Math.max(p.skills.voice, 45);
    grantInstrument(s, p, 'voice', Math.max(VOICE_MIN + 5, p.skills.voice));
  } else grantInstrument(s, p, instOfRole29(role, s.year), Math.max(30, Math.round(p.skills.instr * 0.85)));
}

/** Aplica as funções do personagem e completa a banda. */
export function applyRoles29(s: GameState, p: Person, band: Act | undefined): void {
  const spec = s.config.character;
  if (!spec) return;
  const extras = (spec.roles27 ?? []).filter((r) => r !== p.role && ROLES29.includes(r as never));
  if (extras.length) {
    p.roles27 = [...extras];
    for (const x of extras) giveRole(s, p, x);
  }
  if (!band || band.members.length < 2) return;
  const mine = new Set<string>([p.role, ...extras]);
  const sings = [...mine].some(singsRole29);
  const special = SETS29[familyOf(band.genre)];
  const pool = (special ?? GENERAL29).filter((r) => roleOpen29(r, s.year));
  const others = band.members.filter((id) => id !== p.id).map((id) => s.persons[id]).filter((x): x is Person => !!x && x.alive && !x.isPlayer);
  const taken = new Set<string>(mine);
  if (sings) taken.add('vocal');
  const dup = (o: Person) => mine.has(o.role) || (sings && o.role === 'vocal');
  for (const o of others) if (!dup(o)) taken.add(o.role);
  for (const o of others) {
    if (!dup(o)) continue;
    const nr = pool.find((r) => !taken.has(r));
    if (!nr) continue; // nada falta: a função repetida fica (ex.: dois MCs)
    const old = instrumentsOf(s, o)[0];
    if (old) grantInstrument(s, o, old.id, old.lvl); // o instrumento antigo continua na lista
    o.role = nr as Person['role'];
    giveRole(s, o, nr);
    taken.add(nr);
  }
}
