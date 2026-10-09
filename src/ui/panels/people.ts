// Pessoas da carreira: retratos, personalidade (6 traços), objetivos, família com agenda própria,
// facções e líder, fandom (superfãs/haters/rituais), carreira solo, reunião, herdeiros, contrato avançado.

import { MARKETS, l, type L, type MarketId } from '../../data/world';
import { t } from '../../i18n/strings';
import { familyAction, launchHeir, negotiateReunion, reunionTerms, setLeader, startSoloCareer } from '../../sim/dynasty';
import { personaOf } from '../../sim/ext';
import { callOutToxic, fanMeetup, moderateCommunity, fandomOf } from '../../sim/fandom';
import { cedeTerritory, crisisRenegotiate, exerciseOption, setClauses } from '../../sim/contracts2';
import type { Act, GameState, Person } from '../../sim/types';
import { instById, instrumentsOf } from '../../sim/sys/instruments';
import { overall, ROLE_NAMES, type Role } from '../../sim/sys/talent/attrs';
import { sings } from '../../sim/sys/vocals10';
import { openPersonPage } from '../pages';
import { rngOf } from '../../sim/util';
import { $, N, inspect, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { chips, ic, meter, portrait, stat, tile } from '../vis';

const say = (e: L | null, ok: L) => toast(t(e ?? ok), e ? 'bad' : 'good');

const PERSONA: [keyof ReturnType<typeof personaOf>, L][] = [
  ['openness', l('Abertura artística', 'Artistic openness')], ['perfectionism', l('Perfeccionismo', 'Perfectionism')], ['ambition', l('Ambição', 'Ambition')],
  ['sociability', l('Sociabilidade', 'Sociability')], ['discipline', l('Disciplina pessoal', 'Personal discipline')], ['resilience', l('Resiliência', 'Resilience')],
];
const GOAL: Record<string, L> = { security: l('segurança financeira', 'financial security'), credit: l('reconhecimento autoral', 'songwriting credit'), family: l('família', 'family'), leadership: l('liderança', 'leadership'), solo: l('carreira solo', 'solo career') };

const HEALTH: Record<string, L> = { voice_strain: l('voz cansada', 'voice strain'), burnout: l('esgotamento', 'burnout'), addiction: l('vício', 'addiction'), recovering: l('em recuperação', 'recovering'), ill: l('doente', 'ill') };

/** Rodada 10: as características principais de um integrante (função, instrumentos, voz, habilidades-chave, nota, contrato). */
function mainTraits(s: GameState, a: Act, p: Person, known: boolean): HTMLElement {
  const v = (x: number) => (known ? String(Math.round(x)) : `~${Math.round(x / 10) * 10}`);
  const insts = instrumentsOf(s, p).slice().sort((x, y) => y.lvl - x.lvl).slice(0, 3);
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  const sk = p.skills;
  return h('div', { class: 'chips main-traits' },
    pill(`${t(l('Nota', 'OVR'))} ${known ? overall(s, p) : '~' + Math.round(overall(s, p) / 10) * 10}`, 'gold'),
    sings(s, p) ? pill(`🎤 ${t(l('canta', 'sings'))}`, 'good') : null,
    ...insts.map((x) => pill(`${t(instById[x.id]?.name ?? l(x.id, x.id))} ${v(x.lvl)}`)),
    pill(`${t(l('Voz', 'Voice'))} ${v(sk.voice)}`), pill(`${t(l('Instrumento', 'Instrument'))} ${v(sk.instr)}`),
    pill(`${t(l('Composição', 'Songwriting'))} ${v(sk.comp)}`), pill(`${t(l('Letra', 'Lyrics'))} ${v(sk.lyr)}`), pill(`${t(l('Palco', 'Stage'))} ${v(sk.stage)}`),
    c ? pill(`${t(l('Contrato até', 'Contract until'))} ${s.config.startYear + Math.floor(c.endWeek / 52.18)}`) : pill(t(a.owner === 'player' || a.playerBand ? l('seu elenco', 'your roster') : l('sem contrato conosco', 'not signed to us'))),
  );
}

export function membersSection(s: GameState, a: Act): HTMLElement {
  const r = rngOf(s);
  const fac = s.factions[a.id];
  return section(t(l('Integrantes', 'Members')), h('div', { class: 'cards members' }, a.members.map((pid) => {
    const p = s.persons[pid];
    if (!p) return null;
    const pe = personaOf(p);
    const known = a.owner === 'player' || a.playerBand;
    const fam = s.families[pid];
    const group = fac?.groups.findIndex((g) => g.includes(pid)) ?? -1;
    return h('article', { class: `member ${p.alive ? '' : 'gone'}` },
      // rodada 10: o cabeçalho abre a ficha completa da pessoa
      h('header', { class: 'click', role: 'button', tabindex: 0, title: t(l('Abrir ficha completa', 'Open full card')), onclick: () => openPersonPage(pid), onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') openPersonPage(pid); } },
        portrait(p, 56), h('div', null, h('button', { class: 'link', type: 'button' }, h('b', null, p.name)), h('small', null, `${s.year - p.born} ${t(l('anos', 'yrs'))} · ${t(ROLE_NAMES[p.role as Role] ?? l(p.role, p.role))}`), a.leaderId === pid ? pill(t(l('líder', 'leader')), 'good') : null, group >= 0 && (fac?.groups.length ?? 0) > 1 ? pill(`${t(l('facção', 'faction'))} ${group + 1}`) : null, !p.alive ? pill('✝') : null)),
      mainTraits(s, a, p, !!known),
      chips(stat('heart', Math.round(p.morale), l('Moral', 'Morale'), p.morale < 35 ? 'warn' : ''), stat('stress', Math.round(p.stress), l('Estresse', 'Stress'), p.stress > 65 ? 'warn' : ''), p.health !== 'ok' ? stat('warning', t(HEALTH[p.health] ?? l(p.health, p.health)), l('Saúde', 'Health'), 'warn') : null),
      known ? h('details', { class: 'persona' }, h('summary', { class: 'small' }, t(l('Personalidade', 'Personality'))), PERSONA.map(([k, lbl]) => meter('sparkle', lbl, pe[k]))) : null,
      known && p.goal ? h('p', { class: 'small' }, ic('key'), ' ', t(l('Objetivo: ', 'Goal: ')), t(GOAL[p.goal])) : null,
      fam && (fam.partner || fam.kids.length) ? h('div', { class: 'family small' },
        fam.partner ? h('div', null, ic('heart'), ` ${fam.partner.name} — ${t(fam.partner.job)}; `, h('i', null, t(fam.partner.agenda)), ' ', meter('handshake', l('Confiança', 'Trust'), fam.partner.trust)) : null,
        fam.kids.map((k) => h('div', null, ic('fans'), ` ${k.name} (${s.year - k.born}) `, k.personId ? h('button', { class: 'btn small', onclick: () => { say(launchHeir(s, r, k.personId!), l('Herdeiro(a) estreia no selo!', 'Heir debuts on the label!')); rerender(); } }, t(l('Lançar carreira (dinastia)', 'Launch career (dynasty)'))) : null)),
        h('div', { class: 'row' },
          h('button', { class: 'btn small ghost', onclick: () => { say(familyAction(s, pid, 'talk'), l('Conversaram.', 'They talked.')); rerender(); } }, t(l('Conversar', 'Talk'))),
          h('button', { class: 'btn small ghost', onclick: () => { say(familyAction(s, pid, 'support'), l('Apoio enviado ($500).', 'Support sent ($500).')); rerender(); } }, t(l('Apoiar a casa', 'Support the household'))),
          h('button', { class: 'btn small ghost', onclick: () => { say(familyAction(s, pid, 'month'), l('Mês reservado para a família.', 'Month reserved for family.')); rerender(); } }, t(l('Mês em família', 'Family month'))),
        ),
      ) : null,
      known && p.alive && a.members.length > 1 ? h('div', { class: 'row wrap' },
        a.leaderId !== pid ? h('button', { class: 'btn small ghost', onclick: () => { say(setLeader(s, a.id, pid), l('Nova liderança.', 'New leadership.')); rerender(); } }, t(l('Tornar líder', 'Make leader'))) : null,
        h('button', { class: 'btn small ghost', onclick: () => { say(startSoloCareer(s, r, a.id, pid), l('Carreira solo criada (paralela à banda).', 'Solo career created (alongside the band).')); rerender(); } }, t(l('Carreira solo ($1.500)', 'Solo career ($1,500)'))),
      ) : null,
    );
  })), fac && fac.groups.length > 1 ? h('p', { class: 'small warn' }, ic('warning'), ' ', t(l('Tensão entre facções: {n}. Mediação ou troca de líder ajudam.', 'Faction tension: {n}. Mediation or a new leader helps.'), { n: Math.round(fac.tension) })) : null);
}

export function fandomSection(s: GameState, a: Act): HTMLElement {
  const r = rngOf(s);
  const f = fandomOf(s, a.id);
  return section(t(l('Público e fandom', 'Audience and fandom')),
    chips(stat('fans', N(a.fans.casual), l('Casuais', 'Casual')), stat('heart', N(a.fans.active), l('Ativos', 'Active')), stat('fire', N(a.fans.core), l('Núcleo', 'Core')), stat('sparkle', N(f.superfans), l('Superfãs', 'Superfans')), stat('broken-heart', N(f.haters), l('Haters', 'Haters'), f.haters > f.superfans ? 'bad' : '')),
    f.name ? h('p', null, ic('trophy'), ' ', h('b', null, f.name), f.ritual ? [' — ', h('i', null, t(f.ritual))] : null) : null,
    meter('skull', l('Toxicidade da comunidade', 'Community toxicity'), f.toxicity, 100, true),
    a.image ? h('div', { class: 'image4' }, meter('sparkle', l('Reputação artística', 'Artistic reputation'), a.image.artistic), meter('fame', l('Popularidade', 'Popularity'), a.image.popularity), meter('contract', l('Profissionalismo', 'Professionalism'), a.image.professionalism), meter('camera', l('Imagem pública', 'Public image'), a.image.publicImage)) : null,
    a.owner === 'player' ? h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', onclick: () => { say(fanMeetup(s, a.id), l('Encontro com superfãs feito.', 'Superfan meetup held.')); rerender(); } }, ic('heart'), ' ', t(l('Encontro de fãs', 'Fan meetup'))),
      h('button', { class: 'btn small', onclick: () => { say(moderateCommunity(s, a.id), l('Moderação contratada.', 'Moderation hired.')); rerender(); } }, ic('lock'), ' ', t(l('Moderar comunidade', 'Moderate community'))),
      f.toxicity > 40 ? h('button', { class: 'btn small ghost', onclick: () => { toast(t(callOutToxic(s, r, a.id)), 'info'); rerender(); } }, ic('mic'), ' ', t(l('Pedir calma em público', 'Call for calm publicly'))) : null,
    ) : null,
  );
}

export function contractExtra(s: GameState, a: Act): HTMLElement | null {
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  if (!c || c.party !== 'player' || a.playerBand) return null;
  const rivals = Object.values(s.labels).filter((x) => x.active).slice(0, 10);
  const terr = { label: rivals[0]?.id ?? '', market: 'asia' as MarketId };
  return section(t(l('Cláusulas avançadas', 'Advanced clauses')),
    chips(stat('globe', c.territories?.length ? c.territories.join(', ') : t(l('mundo', 'world')), l('Territórios', 'Territories')), stat('calendar', c.options ?? 0, l('Opções restantes', 'Options left')), stat('key', c.exitFee ? $(c.exitFee) : '—', l('Multa de saída', 'Exit fee')), c.crossCollat ? pill('cross-collateral', 'warn') : null),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small ghost', onclick: () => { say(setClauses(s, a.id, { options: (c.options ?? 0) + 1 }), l('Opção adicionada.', 'Option added.')); rerender(); } }, t(l('+1 opção de renovação', '+1 renewal option'))),
      c.options ? h('button', { class: 'btn small', onclick: () => { say(exerciseOption(s, a.id), l('Opção exercida: +1 ano.', 'Option exercised: +1 year.')); rerender(); } }, t(l('Exercer opção', 'Exercise option'))) : null,
      h('button', { class: 'btn small ghost', onclick: () => { say(setClauses(s, a.id, { crossCollat: !c.crossCollat }), l('Cláusula alterada.', 'Clause changed.')); rerender(); } }, c.crossCollat ? t(l('Remover cross-collateral', 'Remove cross-collateral')) : t(l('Cross-collateral', 'Cross-collateral'))),
      h('button', { class: 'btn small ghost', onclick: () => { say(setClauses(s, a.id, { exitFee: (c.exitFee ?? 0) + Math.round(c.advance * 0.5 + 100000) }), l('Multa de saída definida.', 'Exit fee set.')); rerender(); } }, t(l('Definir multa de saída', 'Set exit fee'))),
      h('button', { class: 'btn small ghost', onclick: () => { say(crisisRenegotiate(s, a.id, 'advance'), l('Adiantamento emergencial pago.', 'Emergency advance paid.')); rerender(); } }, t(l('Adiantamento emergencial', 'Emergency advance'))),
      h('button', { class: 'btn small ghost', onclick: () => { say(crisisRenegotiate(s, a.id, 'cut'), l('Royalty reduzido; contrato encurtado.', 'Royalty cut; term shortened.')); rerender(); } }, t(l('Pedir corte (crise do selo)', 'Ask for a cut (label crisis)'))),
    ),
    h('div', { class: 'row wrap' },
      t(l('Ceder território:', 'Cede territory:')),
      select(terr.market, MARKETS.map((m) => ({ value: m.id, label: t(m.name) })), (v) => { terr.market = v; }),
      select(terr.label, rivals.map((x) => ({ value: x.id, label: x.name })), (v) => { terr.label = v; }),
      h('button', { class: 'btn small', onclick: () => { say(cedeTerritory(s, a.id, terr.label, [terr.market], 0.5), l('Licença territorial vendida.', 'Territory license sold.')); rerender(); } }, t(l('Licenciar 50%', 'License 50%'))),
    ),
  );
}

export function reunionSection(s: GameState): HTMLElement | null {
  const r = rngOf(s);
  const cands = Object.values(s.acts).filter((a) => (a.status === 'split' || a.status === 'retired' || a.status === 'hiatus') && (a.number1s > 0 || a.hits > 1 || a.legend) && a.members.some((id) => s.persons[id]?.alive)).slice(0, 8);
  if (!cands.length) return null;
  return section(t(l('Reuniões possíveis', 'Possible reunions')), h('div', { class: 'cards' }, cands.map((a) => {
    const tm = reunionTerms(s, a.id);
    return tile('handshake', a.name, [
      h('div', { class: 'row' }, a.members.map((id) => portrait(s.persons[id], 24))),
      h('small', null, t(tm.reason)),
      tm.ok ? chips(stat('money', $(tm.cost), l('Proposta', 'Offer')), stat('chart-up', `${Math.round(tm.chance * 100)}%`, l('Chance estimada', 'Estimated chance'))) : null,
      tm.ok ? h('button', { class: 'btn small', onclick: () => { toast(t(negotiateReunion(s, r, a.id)), 'info'); rerender(); } }, t(l('Negociar reunião', 'Negotiate reunion'))) : null,
      h('button', { class: 'link small', onclick: () => inspect.act(a.id) }, t(l('Ver ficha', 'View sheet'))),
    ]);
  })));
}
