// Rodada 27 (CTX) — marca de entidade nos nomes: `data-ent` (tipo) + `data-id` (id estável). Qualquer elemento com a
// marca ganha o menu de ações do clique direito / toque longo / Shift+F10 (ps/ctx27.ts). Puro: sem DOM, sem estado.
//
// Ids por tipo:
//   act → id do ato · person → chave de pessoa ('p:…', 'e:…' empresário, 'pd:…' produtor, 'l:…' líder, 's:…' equipe,
//   'c:…' crítico, 'player') · label → id do selo · city → id da cidade · song / release → id · venue → id de VENUES17 ·
//   festival / place / org → id livre (o menu usa o texto do elemento como nome).

export type Ent27 = 'act' | 'person' | 'label' | 'city' | 'song' | 'release' | 'venue' | 'festival' | 'place' | 'org' | 'genre' | 'relic';
/** r29 WIKI: + 'genre' (id de GENRES) e 'relic' (id de RELICS17) — o menu deles leva ao artigo da wiki. */
export const ENTS27: readonly Ent27[] = ['act', 'person', 'label', 'city', 'song', 'release', 'venue', 'festival', 'place', 'org', 'genre', 'relic'];
export const isEnt27 = (x: unknown): x is Ent27 => typeof x === 'string' && (ENTS27 as readonly string[]).includes(x);

/** Atributos para espalhar em `h(tag, { ...ent27('act', id), … })`. Id vazio = sem marca (o nome fica sem menu). */
export function ent27(kind: Ent27, id: string | null | undefined): Record<string, string> {
  return id ? { 'data-ent': kind, 'data-id': id } : {};
}

/** Chave de pessoa canônica para o menu: id solto de `s.persons` vira 'p:id'; chaves com prefixo ficam como estão. */
export const personKey27 = (id: string): string => (id === 'player' || id.includes(':') ? id : `p:${id}`);
