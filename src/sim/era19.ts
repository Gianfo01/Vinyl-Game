// Rodada 19 (smoke) — nomes de época para rótulos de interface: nada do futuro na tela. Uma aba chamada
// "Público e streaming" em 1889, ou a habilidade "Streaming, redes" em 1925, quebra a regra de ouro; cada
// rótulo com tecnologia no nome passa por aqui e escolhe a variante que já existe no ano do jogo (as datas
// seguem s.techDates, então os modos livre/caos deslocam junto). Sem DOM.

import { l, type L } from '../data/world';
import type { GameState } from './types';
import { hasTech } from './util';

/** Uma variante: [tecnologia (id de TECHS) ou ano, nome]. */
export type EraAlt19 = [string | number, L];

/** Nome pela época: percorre as variantes do MAIS NOVO ao mais antigo e devolve a primeira que já existe; senão `base`. */
export function eraL(s: GameState, base: L, alts: EraAlt19[]): L {
  for (const [k, n] of alts) if (typeof k === 'number' ? s.year >= k : hasTech(s, k)) return n;
  return base;
}

/** Rótulos de época usados por várias telas (um só lugar para revisar e testar). */
export const ERA19 = {
  /** Talentos › aba de concursos de calouros */
  talentShow: (s: GameState) => eraL(s, l('Concursos de calouros', 'Amateur nights'), [['tv_music', l('TV de talentos', 'TV talent shows')], ['radio', l('Calouros no rádio', 'Radio talent shows')]]),
  /** Mídia › público e descoberta */
  audience: (s: GameState) => eraL(s, l('Público e plateias', 'Audience and crowds'), [['streaming', l('Público e streaming', 'Audience and streaming')], ['internet', l('Público e digital', 'Audience and digital')], ['radio', l('Público e ouvintes', 'Audience and listeners')]]),
  /** Mídia › clipes, virais e pistas */
  clips: (s: GameState) => eraL(s, l('Salões e pistas de dança', 'Dance halls and floors'), [['internet', l('Clipes, virais e pistas', 'Videos, virals and clubs')], ['tv_music', l('Clipes e pistas', 'Videos and clubs')]]),
  /** jabá: antes do rádio, era o "song plugging" das editoras */
  payola: (s: GameState) => eraL(s, l('Jabá e divulgação', 'Payola and plugging'), [['streaming', l('Jabá, rádio e playlists', 'Payola, radio and playlists')], ['radio', l('Jabá e rádio', 'Payola and radio')]]),
  /** Palco › curva do disco de coleção */
  vinyl: (s: GameState) => eraL(s, l('Discos de coleção', 'Collector records'), [['streaming', l('Vinil e RSD', 'Vinyl and RSD')], ['lp', l('Vinil', 'Vinyl')]]),
  /** Paradas › outras paradas */
  otherCharts: (s: GameState) => eraL(s, l('Outras paradas', 'Other charts'), [['radio', l('Rádio e outras paradas', 'Radio and other charts')]]),
  /** Regiões › vistos e rádio */
  visas: (s: GameState) => eraL(s, l('Vistos e turnês', 'Visas and tours'), [['radio', l('Vistos e rádio', 'Visas and radio')]]),
  /** Finanças › linha de receita de gravações */
  recRev: (s: GameState) => eraL(s, l('Gravações (vendas e distribuição)', 'Recordings (sales and distribution)'), [['streaming', l('Gravações (vendas, streaming, distribuição)', 'Recordings (sales, streaming, distribution)')], ['download', l('Gravações (vendas, downloads, distribuição)', 'Recordings (sales, downloads, distribution)')]]),
  /** Habilidade "digital": o nome e a descrição seguem a mídia nova de cada época */
  digitalSkill: (s: GameState) => eraL(s, l('Novidades e imprensa', 'Novelties and press'), [['internet', l('Digital e plataformas', 'Digital & platforms')], ['radio', l('Mídia nova', 'New media')]]),
  digitalSkillDesc: (s: GameState) => eraL(s, l('Fonógrafos em público, catálogos, jornais e anúncios.', 'Public phonographs, catalogs, newspapers and ads.'), [
    ['streaming', l('Streaming, redes, playlists e dados de audiência.', 'Streaming, social, playlists and audience data.')],
    ['internet', l('Sites, downloads, fóruns e dados de audiência.', 'Websites, downloads, forums and audience data.')],
    ['tv_music', l('Rádio, TV, novos formatos e pesquisa de audiência.', 'Radio, TV, new formats and audience research.')],
    ['radio', l('Rádio, novos formatos e cartas de ouvintes.', 'Radio, new formats and listener mail.')]]),
  /** Estratégia de rival "conglomerado de mídia" */
  conglomerate: (s: GameState) => eraL(s, l('Jornal, revista, editora de partituras e gravadora no mesmo grupo.', 'Newspaper, magazine, sheet-music publisher and label in one group.'), [
    ['tv_music', l('Rádio, TV, revista e gravadora no mesmo grupo.', 'Radio, TV, magazine and label in one group.')],
    ['radio', l('Rádio, revista e gravadora no mesmo grupo.', 'Radio, magazine and label in one group.')]]),
  /** promoção: "rádio e TV" só quando existem */
  promo: (s: GameState) => eraL(s, l('Promoção (imprensa e partituras)', 'Promotion (press and sheet music)'), [['tv_music', l('Promoção (rádio e TV)', 'Promotion (radio and TV)')], ['radio', l('Promoção (rádio e imprensa)', 'Promotion (radio and press)')]]),
  /** veículos de mídia próprios */
  outlets: (s: GameState) => eraL(s, l('revista, jornal', 'magazine, newspaper'), [['streaming', l('revista, rádio, TV, blog, playlist', 'magazine, radio, TV, blog, playlist')], ['internet', l('revista, rádio, TV, blog', 'magazine, radio, TV, blog')], ['tv_music', l('revista, rádio, TV', 'magazine, radio, TV')], ['radio', l('revista, rádio', 'magazine, radio')]]),
};

/** Habilidades do ramo digital com nome de época (o efeito é o mesmo; muda só o que o jogador lê). */
const SKILL19: Record<string, (s: GameState) => L> = {
  dg_meta: (s) => eraL(s, l('Fichas de catálogo em ordem', 'Tidy catalog cards'), [['internet', l('Metadados limpos', 'Clean metadata')]]),
  dg_social: (s) => eraL(s, l('Boca a boca', 'Word of mouth'), [[2004, l('Redes sociais', 'Social media')], ['internet', l('Fóruns e sites', 'Forums and websites')], ['tv_music', l('Fã-clubes e auditórios', 'Fan clubs and studio audiences')]]),
  dg_playlist: (s) => eraL(s, l('Repertório de salão', 'Parlour repertoire'), [['streaming', l('Curadoria de playlists', 'Playlist curation')], ['radio', l('Programação de rádio', 'Radio programming')]]),
  dg_data: (s) => eraL(s, l('Pesquisa de balcão', 'Shop-counter research'), [[1935, l('Dados de audiência', 'Audience data')]]),
  dg_viral: (s) => eraL(s, l('Faro para sucesso', 'Nose for a hit'), [['internet', l('Faro viral', 'Viral nose')]]),
  dg_platform: (s) => eraL(s, l('Sócio dos fabricantes', 'Hardware makers\' partner'), [['internet', l('Sócio das plataformas', 'Platform partner')]]),
};
/** Nome de época de uma habilidade (`base` = nome fixo do catálogo). */
export const skillName19 = (s: GameState, id: string, base: L | undefined): L | undefined => (SKILL19[id] ? SKILL19[id](s) : base);

/** Texto de época dos manuais de estratégia (só o "conglomerado de mídia" fala de rádio e TV). */
export function pbText19(s: GameState, id: string, pb: { desc: L; tells: L[] }): { desc: L; tells: L[] } {
  if (id !== 'conglomerate' || hasTech(s, 'tv_music')) return pb;
  const radio = hasTech(s, 'radio');
  return {
    desc: radio ? l('Rádio, revista e gravadora no mesmo grupo: empurra o próprio elenco em todos os canais.', 'Radio, magazine and label in one group: pushes its own roster on every channel.')
      : l('Jornal, revista, editora de partituras e gravadora no mesmo grupo: empurra o próprio elenco em todos os canais.', 'Newspaper, magazine, sheet-music publisher and label in one group: pushes its own roster on every channel.'),
    tells: [radio ? l('O mesmo artista aparece no rádio e na capa da revista na mesma semana.', 'The same act shows up on the radio and the magazine cover in the same week.')
      : l('O mesmo artista aparece no jornal, nas partituras e na capa da revista na mesma semana.', 'The same act shows up in the paper, on sheet music and on the magazine cover in the same week.'), ...pb.tells.slice(1)],
  };
}

/** Departamentos da estrutura (eras12) com nome de época; `base` = nome fixo. */
export function deptName19(s: GameState, d: string, base: L): L {
  if (d === 'promo') return ERA19.promo(s);
  if (d === 'digital') return eraL(s, l('Novos formatos e receitas', 'New formats and revenue'), [['internet', base]]);
  if (d === 'image') return eraL(s, l('Imagem e fotografia', 'Image and photography'), [['tv_music', base]]);
  return base;
}

/** Descrições de época de departamentos da sede (hq6). */
export function hqDeptDesc19(s: GameState, id: string, base: L): L {
  if (id === 'marketing' && !hasTech(s, 'radio')) return l('Equipe de imprensa, partituras e cartazes: mais apelo.', 'Press, sheet-music and poster team: more appeal.');
  return base;
}

/** Atalho: troca {k} pelos dois idiomas de um L (para frases com um trecho de época). */
export { fmtL as fmtL19 } from './util';

/** Textos fixos com tecnologia no meio, por chave ("career:media", "research:fan_crm"…): variante de época ou `base`. */
const TXT19: Record<string, (s: GameState, base: L) => L> = {
  'career:media': (s, b) => eraL(s, l('Jornal e revista: críticas, anúncios e cenas.', 'Newspaper and magazine: reviews, ads and scenes.'), [['tv_music', b], ['radio', l('Revista e rádio: poder de execução e cenas.', 'Magazine and radio: airplay power and scenes.')]]),
  'research:fan_crm': (s, b) => eraL(s, l('Clube do disco e fã-clubes crescem mais rápido.', 'Mail club and fan clubs grow faster.'), [['streaming', b]]),
  'research:radio_network:name': (s, b) => eraL(s, l('Rede de divulgação (song plugging)', 'Song-plugging network'), [['radio', b]]),
  'biz17:formats': (s, b) => eraL(s, l('cilindro, disco, rolo de pianola…', 'cylinder, disc, piano roll…'), [['cd', b], ['cassette', l('vinil, K7…', 'vinyl, cassette…')], ['lp', l('78, 45, LP…', '78, 45, LP…')]]),
};
export const txt19 = (s: GameState, key: string, base: L): L => TXT19[key]?.(s, base) ?? base;
