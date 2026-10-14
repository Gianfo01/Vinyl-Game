// Rodada 29 (WIKI) — cobertura: TODO sistema registrado em src/sim/sys/index.ts tem um artigo de mecânica.
// Cada módulo do tick aparece aqui uma vez (ou mais, quando serve a dois assuntos). tests/r29-wiki.test.ts lê o
// index.ts e falha se um sistema novo entrar sem artigo — a wiki não envelhece em silêncio.

/** artigo de mecânica → módulos de src/sim/sys que ele explica */
export const SYS_OF_MECH29: Record<string, string[]> = {
  money: ['capital', 'vices', 'bolsa10', 'overhead13', 'econ18', 'money19', 'fin20', 'price20', 'budget19', 'insure19', 'sale17', 'intra19', 'bandpay19', 'stakes8', 'report18', 'supply16', 'industry'],
  contracts: ['offers12', 'contracts18', 'dispute15', 'moneyb19', 'deals18', 'rivals8', 'rivals12', 'rivalmind18', 'rivals27', 'leaders10', 'labelrep28', 'image17', 'license17', 'consent8', 'union20', 'feats8', 'member29', 'contracts29'],
  scouting: ['scout11', 'scout23', 'dossier8', 'discover18', 'talent', 'ability18', 'schools19', 'tv18', 'contests19', 'kpop18', 'idols18', 'school18'],
  music: ['music', 'creation', 'quality18', 'traj18', 'sound', 'recipe12', 'project8', 'project12', 'project13', 'compose27', 'camp27', 'session18', 'session19', 'camps18', 'writers19', 'remix19',
    'charts7', 'world4', 'warmup8', 'relevance8', 'explain8', 'review18', 'mkt18', 'stream18', 'radio18', 'media18', 'outlets17', 'supply18', 'songsale', 'songmkt27', 'rights8', 'rights18',
    'reach17', 'trends17', 'revival19', 'sync15', 'adsync19', 'score19', 'instruments', 'ai18', 'market19a', 'gear19', 'featp29'],
  live: ['live', 'live18', 'live19', 'route8', 'fests8', 'fest18', 'venues17', 'venues27', 'clash17', 'circuit17', 'circuits18', 'showops20', 'road27', 'merch17', 'crew8', 'deleg16', 'charity19', 'naming19'],
  fame: ['fame15', 'fame16', 'fan15', 'fans18', 'audience8', 'hype12', 'notoriety14', 'novelty9', 'terr20', 'social8', 'bonds9'],
  reputation: ['identity', 'standing9', 'sat19', 'culture19', 'wins19'],
  hq: ['hq6', 'hq8', 'hqrooms27', 'furnish', 'campus18', 'world19', 'hood19', 'board27', 'services12', 'manager11', 'manager12', 'managers14', 'producers15', 'capacity14', 'agenda7', 'agenda17',
    'pacing8', 'policy18', 'eras12', 'calendar19', 'notify19', 'inbox18', 'ux19', 'prof19', 'odds19'],
  life: ['life', 'temper', 'persona', 'people', 'life12', 'life20', 'lifecycle7', 'lifeevents10', 'goods8', 'leisure14', 'kin15', 'love17', 'kids17', 'sex17', 'looks15', 'looks17', 'extras17',
    'soul9', 'persona13', 'heirs8', 'afterlife19', 'post18', 'beliefs10', 'roles21', 'lineup16', 'identity8', 'people16', 'personact18', 'arcs12'],
  press: ['press9', 'press18', 'media17', 'media19', 'media19ev', 'media19sit', 'zines19', 'cancel19', 'fanscandal28', 'intrigue', 'secrets23'],
  underworld: ['mob29', 'aff29', 'rig29', 'crime17', 'crimenpc17', 'crimemem23', 'fakes19', 'feud18', 'agency18', 'verbs18', 'aud27'],
  world: ['world9', 'world18', 'regions18', 'regions19', 'eras8', 'eras18', 'era19', 'era1889', 'history19', 'realhist19', 'hist27', 'heritage17', 'realworld', 'cities27', 'scenes12', 'scenes27',
    'movements9', 'society18', 'exch20', 'mapx8', 'npc17', 'sitsworld17'],
  awards: ['ceremonies8', 'awards18', 'awards28', 'rockhall9', 'relics9', 'relics18', 'relics28', 'relics29', 'paths18', 'saga18', 'tribute19'],
  story: ['scenes', 'stories8', 'situations17', 'sits17', 'dm18', 'dmsits18', 'decide18', 'echoes18', 'echoes19', 'decnew18', 'conseq27', 'crisis27', 'story12', 'story28', 'chains28', 'quarter28',
    'scene17', 'scenedefs17', 'cine18', 'moments16', 'scenes19', 'eggs27', 'pace9', 'chron9'],
  start: ['start17', 'start28', 'start29', 'rivals29start', 'labels29start', 'labels29ven', 'char29', 'custom7', 'cards6', 'scenarios17', 'scenarios23'],
  careers: ['careers12', 'careers19', 'ventures9', 'ventures12', 'media12', 'platform12', 'studio12', 'tour12', 'venue12', 'fest12', 'screen18', 'artist18', 'shared18', 'shared28', 'exp17'],
  modes: ['assist28', 'history15'],
  connections: ['links16', 'links18', 'links19a', 'links19b', 'links23', 'bridge17', 'factlink19', 'mech29', 'perks29', 'final18', 'facades19', 'ctxsys19', 'why18', 'explain12'],
};

/** módulo → artigos (inverso) */
export function mechOfSys29(mod: string): string[] {
  return Object.entries(SYS_OF_MECH29).filter(([, xs]) => xs.includes(mod)).map(([k]) => k);
}
