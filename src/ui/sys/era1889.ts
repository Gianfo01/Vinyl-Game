// Rodada 18 (era1889): Mundo › Era acústica (1889–1919) — formatos e guerra dos formatos, guerra de patentes,
// partituras e song pluggers, salão de fonógrafos, gravação acústica, impostos/crédito da época, racismo do
// período explicado e a linha do tempo real. Em Paradas, a seção "Partituras e catálogos" (antes de 1930).

import { FORMATS } from '../../data/rules';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { availableFormats } from '../../sim/production';
import {
  PATENT_FEE_PCT, acousticFit1889, acoustic1889, era1889, marks1889, openParlor1889, parlorCost1889, parlorIncome1889, parlorOpen1889, plugCost1889, plugReady1889, plugSong1889,
} from '../../sim/sys/era1889';
import type { GameState } from '../../sim/types';
import { hasTech, playerActs } from '../../sim/util';
import { $, N, actLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { registerSection, registerTab } from '../registry';

const res = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const P = (x: L) => h('p', { class: 'small' }, t(x));
const M = (x: L) => h('p', { class: 'small muted' }, t(x));

function formats(s: GameState): HTMLElement {
  const av = availableFormats(s);
  const rows: [string, L][] = [
    ['cylinder', l('Cilindro de cera: 2 minutos (4 a partir de 1908). Até 1902 cada cópia é regravada por pantógrafo; depois, moldado. Perde a guerra para o disco por volta de 1912.', 'Wax cylinder: 2 minutes (4 from 1908). Until 1902 each copy is re-dubbed by pantograph; then moulded. Loses the war to the disc around 1912.')],
    ['shellac', l('Disco de goma-laca (Berliner, 1895): uma matriz de metal prensa milhares de cópias. Dois lados a partir de 1903–08.', 'Shellac disc (Berliner, 1895): one metal master presses thousands of copies. Two-sided from 1903–08.')],
    ['piano_roll', l('Rolo de pianola (1896+): papel perfurado que a pianola toca sozinha; caro, margem alta, público de quem tem piano.', 'Piano roll (1896+): punched paper the player piano plays by itself; pricey, high margin, for piano owners.')],
  ];
  return section(t(l('Formatos da época', 'Formats of the day')),
    h('ul', null, rows.map(([id, d]) => h('li', null, pill(av.includes(id as never) ? t(l('disponível', 'available')) : t(l('ainda não / já era', 'not yet / gone')), av.includes(id as never) ? 'good' : 'muted'), ' ', h('b', null, t(FORMATS.find((f) => f.id === id)?.name ?? l(id))), ' — ', t(d)))),
    P(s.year < (s.techDates.radio ?? 1920) + 6
      ? l('Sem rádio, a parte da demanda que não vira disco é PARTITURA: a família compra a canção impressa e toca no piano da sala. Por isso cada lançamento rende também na gráfica, sem estoque.', 'With no radio, the share of demand that does not become a record is SHEET MUSIC: families buy the printed song and play it on the parlor piano. So each release also earns at the printer, with no stock.')
      : l('O rádio chegou: a partitura perde espaço para a execução.', 'Radio has arrived: sheet music gives way to airplay.')),
    acoustic1889(s) ? P(l('Gravação ACÚSTICA (até a elétrica, ~1925): o cantor canta para dentro de uma corneta, sem microfone. Vozes potentes, metais e banjo gravam bem (+apelo); cordas, coros e vozes suaves somem (−apelo). A bateria toca blocos de madeira.', 'ACOUSTIC recording (until electrical, ~1925): singers sing into a horn, no microphone. Powerful voices, brass and banjo record well (+appeal); strings, choirs and soft voices vanish (−appeal). Drummers play woodblocks.')) : null,
  );
}

function patents(s: GameState): HTMLElement | null {
  if (s.year >= 1912) return null;
  const st = era1889(s);
  return section(t(l('Guerra de patentes', 'Patent war')),
    P(l('Edison (cilindro), a American Graphophone/Columbia (gravação em cera) e Berliner/Victor (disco) se processam sem parar. Em 1902 Victor e Columbia trocam licenças e formam um pool; quem fabrica sem licença arrisca liminar até as patentes caírem (~1912–19).', 'Edison (cylinder), American Graphophone/Columbia (wax recording) and Berliner/Victor (disc) sue each other non-stop. In 1902 Victor and Columbia cross-license into a pool; whoever manufactures without a license risks an injunction until the patents fall (~1912–19).')),
    h('p', null, st.pat === 'lic' ? pill(t(l('licenciado', 'licensed')), 'good') : st.pat === 'risk' ? pill(t(l('sem licença', 'unlicensed')), 'bad') : pill(t(l('sem decisão', 'undecided')), 'warn'), ' ',
      st.pat === 'lic' ? t(l('Você paga {p}% das vendas físicas ao pool.', 'You pay {p}% of physical sales to the pool.'), { p: Math.round(PATENT_FEE_PCT * 100) })
        : st.pat === 'risk' ? t(l('Liminares sofridas: {n}. Cada uma apreende metade do estoque e traz multa.', 'Injunctions suffered: {n}. Each seizes half the stock and brings a fine.'), { n: st.injunctions })
          : t(l('A pergunta chega na caixa de entrada quando você lançar o primeiro cilindro ou disco.', 'The question reaches your inbox when you release your first cylinder or disc.'))));
}

function business(s: GameState): HTMLElement {
  const st = era1889(s);
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired');
  const parlor = parlorOpen1889(s)
    ? h('div', null,
      h('h4', null, t(l('Salão de fonógrafos a moedas', 'Coin-in-the-slot phonograph parlor'))),
      M(l('Fileiras de fonógrafos com fones de borracha: uma moeda, um cilindro. Rende mais quanto mais lançamentos seus houver no ano, e murcha quando o aparelho chega às casas (fecha em 1906).', 'Rows of phonographs with rubber ear tubes: one coin, one cylinder. Earns more the more releases you had this year, and fades as machines reach homes (closes in 1906).')),
      st.parlor !== undefined
        ? h('p', null, pill(t(l('aberto', 'open')), 'good'), ' ', t(l('Renda estimada: {v}/mês · acumulado {a}', 'Estimated income: {v}/month · total {a}'), { v: $(parlorIncome1889(s)), a: $(st.parlorEarned) }))
        : h('button', { class: 'btn', onclick: () => res(openParlor1889(s), l('Salão aberto!', 'Parlor open!')) }, t(l('Abrir salão ({c})', 'Open parlor ({c})'), { c: $(parlorCost1889(s)) })))
    : null;
  return section(t(l('Partituras, pluggers e salões', 'Sheet music, pluggers and parlors')),
    P(l('No Tin Pan Alley (Rua 28, Nova York) a editora vive da partitura. "Song pluggers" tocam a canção em lojas de departamento e teatros; astros do vaudeville recebem para cantá-la (a prática que, mais tarde, vira jabá).', 'On Tin Pan Alley (28th Street, New York) the publisher lives off sheet music. "Song pluggers" play the song in department stores and theatres; vaudeville stars get paid to sing it (the practice that later becomes payola).')),
    acts.length ? h('table', { class: 'tbl compact' }, h('tbody', null, acts.map((a) => h('tr', null, h('td', null, actLink(s, a.id)),
      h('td', null, (() => { const f = acousticFit1889(a.genre); return f && acoustic1889(s) ? h('span', { class: 'small muted', title: t(f.why) }, f.m > 1 ? '🎺 +' : '🎻 −') : ''; })()),
      h('td', null, h('button', { class: 'btn small', disabled: !plugReady1889(s, a.id), onclick: () => res(plugSong1889(s, a.id), l('Os pluggers saíram para as lojas.', 'The pluggers are out in the stores.')) }, t(l('Song pluggers ({c})', 'Song pluggers ({c})'), { c: $(plugCost1889(s)) }))))))) : M(l('Contrate um ato para usar os song pluggers.', 'Sign an act to use song pluggers.')),
    parlor);
}

function context(s: GameState): HTMLElement {
  return section(t(l('O mundo de {y}', 'The world of {y}'), { y: s.year }),
    P(l('Impostos: nos EUA não há imposto de renda de empresa antes de 1909 (1% até 1915; sobe com a guerra, 12% em 1918). Crédito: sem banco central até o Federal Reserve (1914), os juros são mais altos e os pânicos (1893, 1907) secam o dinheiro.', 'Taxes: in the US there is no corporate income tax before 1909 (1% until 1915; it rises with the war, 12% in 1918). Credit: with no central bank until the Federal Reserve (1914), interest is higher and panics (1893, 1907) dry up money.')),
    P(l('Direitos: antes da Lei de 1909 os compositores não recebem nada pelos discos (só pela partitura); depois, 2 centavos por cópia. A execução pública só passa a render com a ASCAP e a PRS (1914); na França a SACEM cobra desde 1851.', 'Rights: before the 1909 Act songwriters earn nothing from records (only from sheet music); afterwards, 2 cents a copy. Public performance only pays with ASCAP and PRS (1914); in France SACEM has collected since 1851.')),
    P(l('Racismo da época: nos EUA, o teatro de menestréis (atores brancos de blackface) e as "coon songs" caricaturam pessoas negras e vendem muito; artistas negros como Bert Williams e George W. Johnson só entram no disco aceitando esses papéis, ganham menos e não pisam nos teatros brancos. O jogo mostra isso como barreira de época (ficha do ato), não como opção neutra: o gênero decai e, a partir de 1915 (protestos da NAACP), queima a reputação de quem insiste nele. No Brasil, pós-abolição, samba, lundu e capoeira são perseguidos pela polícia.', 'Racism of the era: in the US, minstrel shows (white actors in blackface) and "coon songs" caricature Black people and sell well; Black artists like Bert Williams and George W. Johnson only get on record by accepting those roles, earn less and are barred from white theatres. The game shows this as an era barrier (act page), not a neutral option: the genre declines and, from 1915 (NAACP protests), burns the reputation of anyone who insists on it. In Brazil, after abolition, samba, lundu and capoeira are harassed by police.')),
    M(l('Não existem prêmios da indústria nem paradas como as de hoje: a primeira lista de sucessos (partituras, Billboard) é de 1913; o rádio comercial só chega em 1920.', 'There are no industry awards or charts as we know them: the first hit list (sheet music, Billboard) dates from 1913; commercial radio only arrives in 1920.')));
}

function timeline(s: GameState): HTMLElement {
  const ms = marks1889(s).filter((m) => m.y >= s.config.startYear - 1).slice(-14).reverse();
  return section(t(l('Linha do tempo', 'Timeline')),
    ms.length ? h('ul', { class: 'small' }, ms.map((m) => h('li', null, h('b', null, `${m.y} `), t(m.t)))) : M(l('Nada ainda.', 'Nothing yet.')));
}

function render(s: GameState): HTMLElement {
  return h('div', null,
    M(l('A era acústica (1889–1925): cilindros e discos de goma-laca, partituras, vaudeville e ópera. Tudo aqui explica o que muda nas contas e por quê.', 'The acoustic era (1889–1925): cylinders and shellac discs, sheet music, vaudeville and opera. Everything here explains what changes in the numbers and why.')),
    formats(s), patents(s), business(s), context(s), timeline(s));
}

registerTab('worldHub', { id: 'era1889', label: l('Era acústica', 'Acoustic era'), icon: 'clock', render, visible: (s) => s.year < 1932 });

// Paradas antes de 1930: não havia parada — reconstrução a partir das partituras e dos suplementos mensais
registerSection('charts', {
  id: 'era1889sheet',
  render: (s) => {
    if (s.year >= 1930) return null;
    const top = s.charts.singles.slice(0, 10);
    const title = s.year >= 1913 ? l('Partituras mais vendidas (lista da Billboard, desde 1913)', 'Best-selling sheet music (Billboard list, since 1913)') : l('Catálogos e suplementos mensais (não há parada: reconstrução das vendas)', 'Catalogs and monthly supplements (no charts yet: a reconstruction of sales)');
    return section(t(title),
      M(hasTech(s, 'radio') ? l('O rádio começa a mudar o que é sucesso.', 'Radio is starting to change what a hit is.') : l('Sem rádio e sem parada oficial, um sucesso se mede em partituras e em cilindros/discos vendidos por correio e nas lojas de máquinas falantes.', 'With no radio and no official chart, a hit is measured in sheet music and in cylinders/discs sold by mail and in talking-machine stores.')),
      top.length ? h('ol', { class: 'small' }, top.map((e) => { const r = s.releases[e.releaseId]; return h('li', null, r ? `${r.title} — ` : '', r ? actLink(s, r.actId) : '', ` · ${N(e.units)}`); })) : null);
  },
});
