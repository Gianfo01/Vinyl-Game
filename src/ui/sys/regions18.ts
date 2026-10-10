// Rodada 18 (regions18): página Mundo › Mercados — regiões na visão geral, submercados ao abrir, circuitos (R3),
// K-pop (R1), Japão/idols (R2) e o diário das afinidades que mudaram na partida.
import { CIRCS18, SUBS18, ramp18, subById18, subsOf18, type Sub18 } from '../../data/regions18';
import { MARKETS, genreById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { circBlock18, circsFor18, circsOf18, joinCirc18, leaveCirc18, lumpOf18 } from '../../sim/sys/circuits18';
import { IDOL_G18, gradRev18, hsBlock18, hsCost18, hsPower18, id18, secCost18, setHs18, setSec18 } from '../../sim/sys/idols18';
import {
  audCost18, audition18, debut18, foundProg18, isK18, kftc18, kp18, mobilize18, multiCost18, progBlock18, progCost18, survCost18, trMonthly18, voteCost18, winOdds18,
} from '../../sim/sys/kpop18';
import {
  access18, actLang18, advance18, bars18, closeLoc18, collab18, collabCost18, collabOdds18, collabPartner18, isOpen18, locBlock18, locCost18, localize18, mkFit18, partner18,
  pName18, plats18, pref18, reg18, relFit18, rent18, subName18, subW18, tasteBase18, verBlock18, verCost18, version18,
} from '../../sim/sys/regions18';
import type { Act, GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { why18 } from '../explain18';
import { h } from '../dom';
import { registerArea } from '../registry';
import { chips, stat, tabs } from '../vis';

const say = (x: L | null | undefined, ok: L = l('Feito.', 'Done.')) => { toast(t(x ?? ok), x ? 'info' : 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis: L | null = null, cls = 'btn small') => h('button', { class: cls, onclick: fn, disabled: dis ? true : undefined, title: dis ? t(dis) : '' }, typeof label === 'string' ? label : t(label));
const tbl = (head: L[], rows: HTMLElement[]) => h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, head.map((x) => h('th', null, t(x))))), h('tbody', null, rows));
const p = (x: L, cls = 'small') => h('p', { class: cls }, t(x));
const pc = (v: number) => `${Math.round(v * 100)}%`;
const gname = (g: string) => t(genreById[g]?.name ?? l(g));
const myActs = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && !a.playerBand && a.status !== 'retired' && a.status !== 'split');
let pick: string | undefined;

function overview(s: GameState): HTMLElement {
  const acts = myActs(s), st = reg18(s);
  return h('div', null,
    p(l('As 7 regiões seguem valendo para paradas, fama e relevância. Dentro de cada uma, os submercados têm peso, gosto, idioma, plataformas, parceiros e barreiras próprios — e o apelo de cada lançamento é a média deles. Abrir uma região dá acesso a todos; um licenciado ou escritório num submercado faz você jogar em casa ali.', 'The 7 regions still drive charts, fame and relevance. Inside each, sub-markets have their own weight, taste, language, platforms, partners and barriers — and each release\'s appeal is their average. Opening a region reaches them all; a licensee or office in a sub-market makes you play at home there.')),
    MARKETS.filter((m) => subsOf18(m.id).length).map((m) => {
      const open = s.player.territories.includes(m.id);
      return section(`${t(m.name)} ${open ? '✓' : ''}`,
        acts.length ? h('p', { class: 'small muted' }, t(l('Ajuste do seu elenco aqui: ', 'Your roster\'s fit here: ')), acts.slice(0, 6).map((a) => h('span', null, a.name, ' ', why18(s, 'regions18.fit', { act: a.id, mk: m.id }, `×${mkFit18(s, m.id, a).ratio.toFixed(2)}`), ' · '))) : null,
        tbl([l('Submercado', 'Sub-market'), l('Peso', 'Weight'), l('Poder de compra', 'Buying power'), l('Idiomas', 'Languages'), l('Gosto em alta', 'Top tastes'), l('Você', 'You')], subsOf18(m.id).map((sub) => {
          const loc = st.loc[sub.id];
          const top = Object.keys(genreById).filter((g) => genreById[g].born <= s.year).map((g) => [g, pref18(s, sub, g)] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 3);
          return h('tr', null,
            h('td', null, h('a', { href: '#', onclick: (e: Event) => { e.preventDefault(); pick = sub.id; rerender(); } }, t(sub.name))),
            h('td', null, pc(subW18(sub.id, s.year))),
            h('td', null, pc(ramp18(sub.pp, s.year))),
            h('td', null, sub.langs.join(', ')),
            h('td', null, top.map(([g, v]) => h('span', null, why18(s, 'regions18.sub', { sub: sub.id, g }, `${gname(g)} ${v.toFixed(1)}`), ' '))),
            h('td', null, !open ? pill(t(l('fechado', 'closed')), '') : loc ? pill(t(loc.until && loc.until > s.week ? l('aguardando aprovação', 'awaiting approval') : loc.mode === 'own' ? l('escritório', 'office') : l('licenciado', 'licensee')), 'good') : pill(t(l('só distribuição', 'distribution only')), 'warn')));
        })));
    }));
}

function detail(s: GameState): HTMLElement {
  const sub: Sub18 | undefined = subById18[pick ?? ''] ?? SUBS18.find((x) => isOpen18(s, x) && subsOf18(x.mk).length > 1) ?? SUBS18[0];
  const st = reg18(s), loc = st.loc[sub.id], pt = partner18(sub, s.year), acts = myActs(s);
  return h('div', null,
    h('div', { class: 'row' }, h('select', { onchange: (e: Event) => { pick = (e.target as HTMLSelectElement).value; rerender(); } }, SUBS18.map((x) => h('option', { value: x.id, selected: x.id === sub.id ? true : undefined }, `${t(MARKETS.find((m) => m.id === x.mk)!.name)} › ${t(x.name)}`)))),
    h('h3', null, t(sub.name)), p(sub.note),
    chips(stat('globe', pc(subW18(sub.id, s.year)), l('Peso na região', 'Weight in region')), stat('cash', pc(ramp18(sub.pp, s.year)), l('Poder de compra (EUA = 100%)', 'Buying power (US = 100%)')), stat('chat', sub.langs.join(', '), l('Idiomas', 'Languages')), stat('door', `×${sub.entry}`, l('Custo de entrada', 'Entry cost'))),
    section(t(l('Plataformas e canais de descoberta', 'Platforms and discovery channels')),
      plats18(sub, s.year).length ? h('ul', { class: 'small' }, plats18(sub, s.year).map((x) => h('li', null, h('b', null, pName18(s, x)), ` (${x.kind}, +${pc(x.boost)}) — `, t(x.note)))) : p(l('Nenhum canal próprio nesta época.', 'No local channel in this era.'), 'muted small'),
      p(l('Os bônus das plataformas valem com escritório (inteiros) ou licenciado (metade).', 'Platform boosts apply with an office (full) or a licensee (half).'), 'muted small')),
    section(t(l('Barreiras', 'Barriers')),
      bars18(sub, s.year).length ? h('ul', { class: 'small' }, bars18(sub, s.year).map((b) => h('li', null, h('b', null, t(b.name)), ` ×${b.mult} — `, t(b.why)))) : p(l('Nenhuma barreira relevante agora.', 'No relevant barrier right now.'), 'muted small')),
    section(t(l('Entrada', 'Entry')),
      !isOpen18(s, sub) ? p(l('Abra a região (Selo › Sede ou Mapa) para entrar aqui.', 'Open the region (Label › HQ or Map) to enter here.'), 'muted small') : null,
      loc ? p(loc.mode === 'own' ? l('Escritório próprio: acesso ×1,10 + plataformas; aluguel mensal.', 'Own office: access ×1.10 + platforms; monthly rent.') : l('Licenciado: acesso ×1,04 + metade das plataformas.', 'Licensee: access ×1.04 + half the platforms.')) : null,
      h('div', { class: 'row' },
        btn(`${t(l('Licenciar', 'License'))}${pt ? ` (${pName18(s, pt)})` : ''} ${$(locCost18(s, sub, 'lic'))} · +${$(advance18(s, sub))}`, () => say(localize18(s, sub.id, 'lic')), locBlock18(s, sub, 'lic')),
        btn(`${t(l('Escritório próprio', 'Own office'))} ${$(locCost18(s, sub, 'own'))} + ${$(rent18(s, sub))}/${t(l('mês', 'mo'))}`, () => say(localize18(s, sub.id, 'own')), locBlock18(s, sub, 'own')),
        loc ? btn(l('Fechar', 'Close'), () => { closeLoc18(s, sub.id); rerender(); }) : null),
      pt ? p(pt.note, 'muted small') : null),
    section(t(l('Seu elenco aqui', 'Your roster here')),
      acts.length ? tbl([l('Ato', 'Act'), l('Preferência', 'Preference'), l('Acesso', 'Access'), l('Versão local', 'Local version'), l('Feat com astro local', 'Feature with a local star')], acts.map((a) => {
        const acc = access18(s, sub, a), partner = collabPartner18(s, sub.id, a.id), odds = partner ? collabOdds18(s, a, partner) : null;
        return h('tr', null, h('td', null, actLink(s, a.id)), h('td', null, why18(s, 'regions18.sub', { sub: sub.id, act: a.id }, pref18(s, sub, a.genre).toFixed(2))),
          h('td', null, `×${acc.v.toFixed(2)} `, h('span', { class: 'muted small' }, t(acc.why))),
          h('td', null, sub.langs.includes(actLang18(a)) ? '—' : btn(`${t(l('Gravar', 'Record'))} ${$(verCost18(s))}`, () => say(version18(s, a.id, sub.id)), verBlock18(s, a.id, sub.id))),
          h('td', null, partner && odds ? btn(`${partner.name} · ${pc(odds.p)} · ${$(collabCost18(s, sub.id))}`, () => say(collab18(s, a.id, sub.id)), isOpen18(s, sub) ? null : l('Região fechada.', 'Region closed.')) : '—'));
      })) : p(l('Sem artistas.', 'No artists.'), 'muted small')));
}

function circuits(s: GameState): HTMLElement {
  const acts = myActs(s);
  return h('div', null,
    p(l('Circuitos têm regras próprias: quem abre a porta, quanto custa, de onde vem o dinheiro e o que pode dar errado. Valem para um ato por vez.', 'Circuits have their own rules: who opens the door, what it costs, where the money comes from and what can go wrong. They apply per act.')),
    CIRCS18.filter((c) => s.year >= c.from && (c.to === undefined || s.year <= c.to)).map((c) => section(`${t(c.name)} — ${t(subName18(c.sub))}`,
      p(c.real, 'small muted'), p(c.how), h('p', { class: 'small' }, t(l('Porteiro: ', 'Gatekeeper: ')), t(c.gate), ` · ${t(l('Entrada', 'Entry'))} ${c.lump ? '—' : $(money(s, c.usd))} · ${t(l('Mês', 'Month'))} ${$(money(s, c.monthly))}`),
      c.risk ? p(fmtRisk(c.risk.p, c.risk.text), 'small bad') : null,
      h('div', { class: 'row' }, acts.filter((a) => circsFor18(s, a).includes(c)).map((a) => (reg18(s).circ[a.id] ?? []).includes(c.id)
        ? (c.lump ? pill(`${a.name} ✓`, 'good') : btn(`${a.name}: ${t(l('sair', 'leave'))}`, () => { leaveCirc18(s, a.id, c.id); rerender(); }))
        : btn(`${a.name}${c.lump ? ` (+${$(lumpOf18(s, c, a))})` : ''}`, () => say(joinCirc18(s, a.id, c.id)), circBlock18(s, a.id, c.id)))))));
}
const fmtRisk = (pr: number, x: L): L => ({ pt: `Risco ~${Math.round(pr * 100)}%/mês: ${x.pt}`, en: `Risk ~${Math.round(pr * 100)}%/month: ${x.en}` });

function kpop(s: GameState): HTMLElement {
  const st = kp18(s), k = kftc18(s.year);
  const sel = new Set<string>();
  const acts = myActs(s).filter(isK18);
  return h('div', null,
    p(l('Trainees treinam por anos (custo mensal, dívida de treino); o debut pode ser direto ou por programa de sobrevivência. Regras reais: contratos de até 13 anos antes de 2009; contrato-padrão de 7 anos (KFTC 2009); desde 2017 o custo do trainee não pode ser cobrado de quem desiste. Homens servem ~18 meses no exército.', 'Trainees train for years (monthly cost, training debt); the debut can be direct or via a survival show. Real rules: contracts up to 13 years before 2009; 7-year standard contract (KFTC 2009); since 2017 trainee costs cannot be charged to dropouts. Men serve ~18 months in the army.')),
    chips(stat('users', st.tr.length, l('Trainees', 'Trainees')), stat('cash', $(trMonthly18(s) * st.tr.length), l('Custo mensal', 'Monthly cost')), stat('scale', k.max7 ? '7' : '13', l('Contrato máximo (anos)', 'Max contract (years)'))),
    st.prog === undefined ? h('div', null, btn(`${t(l('Abrir academia de trainees', 'Open a trainee academy'))} ${$(progCost18(s))}`, () => say(foundProg18(s)), progBlock18(s))) :
      h('div', null,
        btn(`${t(l('Audição anual', 'Yearly audition'))} ${$(audCost18(s))}`, () => say(audition18(s))),
        st.tr.length ? tbl([l('', ''), l('Trainee', 'Trainee'), l('Idade', 'Age'), l('Voz', 'Voice'), l('Dança', 'Dance'), l('Visual', 'Looks'), l('Meses', 'Months'), l('Dívida', 'Debt')], st.tr.map((x) => h('tr', null,
          h('td', null, h('input', { type: 'checkbox', onchange: (e: Event) => { if ((e.target as HTMLInputElement).checked) sel.add(x.id); else sel.delete(x.id); } })),
          h('td', null, `${x.name} ${x.m ? '♂' : '♀'}`), h('td', null, String(s.year - x.born)), h('td', null, String(Math.round(x.voice))), h('td', null, String(Math.round(x.dance))), h('td', null, String(x.look)), h('td', null, String(x.months)), h('td', null, $(x.debt))))) : p(l('Sem trainees: faça uma audição.', 'No trainees: hold an audition.'), 'muted small'),
        st.tr.length ? h('div', { class: 'row' },
          btn(l('Debut direto', 'Direct debut'), () => { const r = debut18(s, { ids: [...sel], mode: 'direct' }); say('pt' in r ? r : null, l('Grupo estreou!', 'Group debuted!')); }, st.tr.some((x) => x.months >= 12) ? null : l('Ninguém com 12+ meses.', 'Nobody with 12+ months.')),
          !k.max7 ? btn(l('Debut com contrato de 13 anos', 'Debut on a 13-year contract'), () => { const r = debut18(s, { ids: [...sel], mode: 'direct', long: true }); say('pt' in r ? r : null, l('Grupo estreou (contrato longo: confiança −10, risco de processo).', 'Group debuted (long contract: trust −10, lawsuit risk).')); }) : null,
          s.year >= 2016 ? btn(`${t(l('Programa de sobrevivência', 'Survival show'))} +${$(survCost18(s))}`, () => { const r = debut18(s, { ids: [...sel], mode: 'survival' }); say('pt' in r ? r : null, l('Grupo-projeto formado pelo voto do público (contrato de 2,5 anos).', 'Project group formed by public vote (2.5-year contract).')); }) : null,
          s.year >= 2016 ? btn(l('…e manipular os votos', '…and rig the votes'), () => { const r = debut18(s, { ids: [...sel], mode: 'survival', rig: true }); say('pt' in r ? r : null, l('Fama +6 — se vazar (~3%/mês por 2 anos), escândalo.', 'Fame +6 — if it leaks (~3%/month for 2 years), scandal.')); }, null, 'btn small bad') : null) : null,
        p(l(`Selecione trainees (12+ meses) e escolha o debut. Antes de 2017 a dívida do treino vai para o grupo (confiança −8).`, `Select trainees (12+ months) and pick the debut. Before 2017 the training debt is charged to the group (trust −8).`), 'muted small')),
    section(t(l('Seus grupos de K-pop', 'Your K-pop groups')),
      acts.length ? tbl([l('Ato', 'Act'), l('Vitórias', 'Wins'), l('Chance/semana', 'Chance/week'), l('Fandom', 'Fandom'), l('Exército', 'Army')], acts.map((a) => h('tr', null,
        h('td', null, actLink(s, a.id)), h('td', null, String(st.wins[a.id] ?? 0)),
        h('td', null, why18(s, 'kpop18.win', { act: a.id }, pc(winOdds18(s, a))), ' ', btn(`${t(l('Mobilizar voto', 'Vote drive'))} ${$(voteCost18(s))}`, () => say(mobilize18(s, a.id)))),
        h('td', null, h('label', null, h('input', { type: 'checkbox', checked: st.multi[a.id] ? true : undefined, onchange: () => { if (st.multi[a.id]) delete st.multi[a.id]; else st.multi[a.id] = 1; rerender(); } }), ` ${t(l('Várias versões/photocards', 'Multiple versions/photocards'))} (×1,3; ${$(multiCost18(s))}/${t(l('mês', 'mo'))})`)),
        h('td', null, String(a.members.filter((pid) => (st.mil[pid]?.until ?? 0) > s.week).length))))) : p(l('Nenhum ato de K-pop/trot no elenco.', 'No K-pop/trot act on the roster.'), 'muted small')));
}

function japan(s: GameState): HTMLElement {
  const st = id18(s), acts = myActs(s).filter((a) => IDOL_G18.includes(a.genre) || a.genre === 'enka');
  const ko = st.kohaku[String(s.year - (s.month === 11 ? 0 : 1))] ?? [];
  return h('div', null,
    p(l('A Oricon (1968) conta só unidades físicas: um CD com ingresso de aperto de mão — e, desde 2009, voto na eleição geral — vira posição. Depois da parada combinada (2018), o pacote vale metade. Eventos custam, cansam as integrantes e têm risco de segurança. Integrantes de 25+ pedem "graduação". Em dezembro, a NHK convida os mais famosos ao Kōhaku.', 'Oricon (1968) counts physical units only: a CD with a handshake ticket — and, since 2009, an election ballot — turns into chart position. After the combined chart (2018) the bundle is worth half. Events cost money, tire the members and carry security risk. Members aged 25+ ask to "graduate". In December, NHK invites the most famous to Kōhaku.')),
    chips(stat('chart', `+${pc(hsPower18(s.year))}`, l('Força do pacote (fatia japonesa)', 'Bundle power (Japanese share)'))),
    acts.length ? tbl([l('Ato', 'Act'), l('Aperto de mão', 'Handshake'), l('Segurança', 'Security'), l('Graduação (renda)', 'Graduation (revenue)')], acts.map((a) => h('tr', null,
      h('td', null, actLink(s, a.id)),
      h('td', null, st.hs[a.id] ? btn(l('Encerrar', 'Stop'), () => say(setHs18(s, a.id, false))) : btn(`${t(l('Ativar', 'Start'))} ${$(hsCost18(s))}/${t(l('mês', 'mo'))}`, () => say(setHs18(s, a.id, true)), hsBlock18(s, a))),
      h('td', null, st.hs[a.id] ? h('label', null, h('input', { type: 'checkbox', checked: st.sec[a.id] ? true : undefined, onchange: () => { setSec18(s, a.id, !st.sec[a.id]); rerender(); } }), ` ${$(secCost18(s))}`) : '—'),
      h('td', null, $(gradRev18(s, a)))))) : p(l('Nenhum ato de idol/J-pop/enka.', 'No idol/J-pop/enka act.'), 'muted small'),
    section(t(l('Kōhaku mais recente', 'Latest Kōhaku')), ko.length ? h('p', { class: 'small' }, ko.map((id) => h('span', null, actLink(s, id), ' '))) : p(l('Ainda sem convidados.', 'No invitees yet.'), 'muted small')));
}

function history(s: GameState): HTMLElement {
  const lg = reg18(s).log.slice().reverse();
  return h('div', null, p(l('Afinidades que mudaram nesta partida — por viradas históricas (fora do modo exato, sorteadas), diásporas, seus hits no top 10 de outro país, virais, cenas e colaborações. As dinâmicas decaem devagar se não forem renovadas.', 'Affinities that changed in this game — historical shifts (randomised outside exact mode), diasporas, your top-10 hits abroad, virals, scenes and collaborations. Dynamic ones slowly fade unless renewed.')),
    lg.length ? tbl([l('Data', 'Date'), l('Onde', 'Where'), l('Gênero', 'Genre'), l('Δ', 'Δ'), l('Por quê', 'Why')], lg.map((x) => h('tr', null, h('td', null, `${x.m + 1}/${x.y}`), h('td', null, x.sub === '*' ? t(l('mundo', 'world')) : t(subName18(x.sub))), h('td', null, gname(x.g)), h('td', null, `${x.d > 0 ? '+' : ''}${x.d.toFixed(2)}`), h('td', { class: 'small' }, t(x.text))))) : p(l('Nada mudou ainda.', 'Nothing has changed yet.'), 'muted small'));
}

function area(s: GameState): HTMLElement {
  const acts = myActs(s);
  return h('div', { class: 'regions18' },
    h('h2', null, t(l('Mercados e circuitos', 'Markets and circuits'))),
    acts.length ? h('p', { class: 'small' }, t(l('Ajuste geográfico médio do elenco nos seus territórios: ', 'Average roster geographic fit in your territories: ')), why18(s, 'regions18.fit', { act: acts[0].id }, `×${(acts.reduce((t2, a) => t2 + relFit18(s, s.player.territories, a), 0) / acts.length).toFixed(2)}`)) : null,
    tabs('regions18', [
      { id: 'ov', label: t(l('Regiões', 'Regions')), icon: 'globe', render: () => overview(s) },
      { id: 'sub', label: t(l('Submercado', 'Sub-market')), icon: 'map', render: () => detail(s) },
      { id: 'circ', label: t(l('Circuitos', 'Circuits')), icon: 'route', render: () => circuits(s) },
      { id: 'kpop', label: 'K-pop', icon: 'star', render: () => kpop(s) },
      { id: 'jp', label: t(l('Japão e idols', 'Japan & idols')), icon: 'disc', render: () => japan(s) },
      { id: 'log', label: t(l('Afinidades', 'Affinities')), icon: 'chart', render: () => history(s) },
    ], rerender));
}
void tasteBase18; void circsOf18;
registerArea({ id: 'regions18', label: l('Mercados', 'Markets'), icon: 'globe', key: '', render: area });
