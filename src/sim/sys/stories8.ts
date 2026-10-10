// Histórias com continuidade (rodada 8): nascem da simulação, guardam as escolhas e voltam anos depois.
// Não é campanha linear: cada passo depende do que aconteceu antes e das relações acumuladas.
//
//  - Disco cult: um disco arriscado é aclamado e vende pouco → um rival oferece dinheiro à voz da banda
//    → renegociar, apoiar outro integrante ou deixar a banda se separar → anos depois o disco pode
//    ser redescoberto, e o que dá para fazer com isso (edição de luxo, licença, reunião) depende do
//    que foi escolhido e de como ficou a relação.
//  - Pacto: um artista artístico aceita um disco comercial para financiar o próximo projeto
//    experimental; cumprir ou quebrar o pacto vira memória.
//  - Fórmula: no auge, um artista inquieto se recusa a repetir o hit; insistir pode fazê-lo sair.

import { clamp, type Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { endContract } from '../contracts';
import { emitEvent, type Ctx, type EventDef } from '../events';
import { deferEvents, registerExt4, registerSimHook } from '../ext4';
import { makeAct } from '../people';
import type { Act, GameState, Label, Person, Release } from '../types';
import { fmtL, money, nextId, notify, playerActs, post, remember } from '../util';
import { grantPlayerContract } from '../worldgen';
import { courtNewcomer18 } from './world18';
import { audience, startRevival } from './audience8';
import { bondBalance, bondNote, careerPhase, identity, prefsOf, repeatsFormula, resultKind, soundsCommercial, soundsExperimental } from './identity8';
import { rw } from './realworld';
import { playbookOf } from './rivals8';
import { actsTouched17 } from '../actidx17';

export type StoryKind = 'cult' | 'pact' | 'formula';

export interface Story {
  id: string;
  k: StoryKind;
  act: string;
  /** lançamento central (disco cult; hit da fórmula) */
  rel?: string;
  /** pessoa central (a voz cortejada) */
  p?: string;
  /** selo rival envolvido */
  lb?: string;
  /** carreira solo criada quando a voz sai */
  solo?: string;
  st: number;
  next: number;
  /** escolhas e marcos, em ordem */
  ch: string[];
  w0: number;
  done?: boolean;
}

export interface StoriesState { list: Story[] }

declare module '../ext4' { interface Ext4 { stories8: StoriesState } }
registerExt4('stories8', () => ({ list: [] }));
export const stories = (s: GameState): StoriesState => (s as unknown as { x4: { stories8: StoriesState } }).x4.stories8;

const NEVER = 1e9;

export const STORY_TITLE: Record<StoryKind, L> = {
  cult: l('O disco cult de {a}', '{a}\'s cult record'),
  pact: l('O pacto de {a}', '{a}\'s pact'),
  formula: l('{a} e a fórmula do sucesso', '{a} and the hit formula'),
};

/** Marcos da história em uma linha cada (sem textão). */
export const STEP_TXT: Record<string, L> = {
  start_cult: l('Aclamado pela crítica, ignorado nas lojas.', 'Acclaimed by critics, ignored in stores.'),
  courted: l('Um rival corteja a voz da banda.', 'A rival courts the band\'s voice.'),
  renegotiate: l('Você renegociou e segurou a banda.', 'You renegotiated and kept the band.'),
  renegotiate_fail: l('Renegociou, mas a voz saiu mesmo assim.', 'You renegotiated, but the voice left anyway.'),
  other: l('Você apostou em outro integrante; a voz seguiu solo.', 'You backed another member; the voice went solo.'),
  split: l('A banda se separou.', 'The band split.'),
  revived: l('Anos depois, uma geração nova redescobriu o disco.', 'Years later, a new generation rediscovered the record.'),
  deluxe: l('Edição de luxo para os colecionadores.', 'A deluxe edition for collectors.'),
  license: l('Licenciado para cinema e publicidade.', 'Licensed to film and ads.'),
  grow: l('Deixou o disco crescer sozinho.', 'Let the record grow on its own.'),
  reunion: l('A banda voltou a se reunir.', 'The band reunited.'),
  reunion_fail: l('A reunião não aconteceu.', 'The reunion did not happen.'),
  reissue: l('Relançado sem a banda.', 'Reissued without the band.'),
  quiet: l('O selo assistiu de longe.', 'The label watched from afar.'),
  gone: l('O artista já não está no selo; o catálogo segue rendendo.', 'The artist is no longer with the label; the catalog keeps paying.'),
  start_pact: l('Propôs um disco comercial em troca de um projeto experimental.', 'Offered a commercial record in exchange for an experimental project.'),
  accept: l('Pacto aceito.', 'Pact accepted.'),
  refuse: l('Pacto recusado.', 'Pact refused.'),
  later: l('A conversa ficou para depois.', 'The talk was postponed.'),
  commercial: l('O disco comercial saiu: a parte do artista está cumprida.', 'The commercial record is out: the artist kept their part.'),
  funded: l('O selo financiou o projeto experimental.', 'The label funded the experimental project.'),
  kept: l('Pacto cumprido: o projeto experimental saiu.', 'Pact kept: the experimental project came out.'),
  broken: l('Pacto quebrado.', 'Pact broken.'),
  stalled: l('O pacto esfriou sem lançamento.', 'The pact cooled off without a release.'),
  start_formula: l('Recusa-se a repetir a fórmula do hit.', 'Refuses to repeat the hit\'s formula.'),
  free: l('Ganhou liberdade criativa.', 'Was given creative freedom.'),
  insist: l('O selo insistiu na fórmula.', 'The label insisted on the formula.'),
  release: l('O selo liberou o artista do contrato.', 'The label released the artist from the contract.'),
  left: l('Preferiu sair do selo a repetir a fórmula.', 'Chose leaving the label over repeating the formula.'),
  stayed: l('Ficou, a contragosto.', 'Stayed, reluctantly.'),
};

export function storyTitle(s: GameState, st: Story): L {
  return fmtL(STORY_TITLE[st.k], { a: s.acts[st.act]?.name ?? '?' });
}

export function activeStory(s: GameState, actId: string): Story | undefined {
  return stories(s).list.find((x) => !x.done && x.act === actId);
}

function storyById(s: GameState, id: string | number | undefined): Story | undefined {
  return stories(s).list.find((x) => x.id === String(id));
}

/** Cada tipo de história volta para o mesmo ato no máximo a cada três anos. */
function onCooldown(s: GameState, k: StoryKind, a: Act): boolean {
  const w = s.flags[`st8:${k}:${a.id}`];
  return w !== undefined && s.week - w < 156;
}

function startStory(s: GameState, k: StoryKind, a: Act, extra: Partial<Story> = {}): Story {
  s.flags[`st8:${k}:${a.id}`] = s.week;
  const st: Story = { id: nextId(s, 'st'), k, act: a.id, st: 0, next: s.week, ch: [], w0: s.week, ...extra };
  const list = stories(s).list;
  list.push(st);
  // mantém as em curso e as recentes (save leve)
  if (list.length > 16) {
    const keep = list.filter((x) => !x.done || s.week - x.w0 < 520);
    stories(s).list = keep.slice(-16);
  }
  remember(s, 'story8', fmtL(l('Começa uma história: {t}.', 'A story begins: {t}.'), { t: storyTitle(s, st) }), { actId: a.id, important: true });
  return st;
}

function step(st: Story, key: string): void {
  st.ch.push(key);
  if (st.ch.length > 10) st.ch.splice(0, st.ch.length - 10);
}

function finish(s: GameState, st: Story, key: string): void {
  step(st, key);
  st.done = true;
  st.next = NEVER;
  const a = s.acts[st.act];
  remember(s, 'story8_end', fmtL(l('{t}: {o}', '{t}: {o}'), { t: storyTitle(s, st), o: STEP_TXT[key] ?? l(key, key) }), { actId: a?.id, important: true });
}

const mineActive = (s: GameState, a: Act | undefined): a is Act => !!a && a.owner === 'player' && !a.playerBand && a.status !== 'split' && a.status !== 'retired';

// ---------------------------------------------------------------- a voz que sai

function voiceOf(s: GameState, a: Act): Person | undefined {
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive && !p.isPlayer);
  return ms.find((p) => p.id === a.leaderId && (p.role === 'vocal' || p.role === 'mc')) ?? ms.find((p) => p.role === 'vocal' || p.role === 'mc') ?? ms.find((p) => p.id === a.leaderId);
}

/** A voz deixa a banda e começa carreira solo no selo rival. */
function voiceLeaves(s: GameState, r: Rng, a: Act, p: Person, lb: Label | undefined, st: Story): void {
  a.members = a.members.filter((x) => x !== p.id);
  const f = (rw(s).former[a.id] ??= []);
  if (!f.some((x) => x.personId === p.id)) f.push({ personId: p.id, year: s.year, reason: 'left' });
  if (a.leaderId === p.id) a.leaderId = a.members[0];
  const solo = makeAct(s, r, { name: p.name, genre: a.genre, city: a.city, members: 1, potential: p.potential, formed: s.year, debutYear: s.year, fame: a.fame * 0.4 });
  for (const id of solo.members) delete s.persons[id];
  solo.members = [p.id];
  solo.leaderId = p.id;
  solo.status = 'active';
  solo.fans = { casual: Math.round(a.fans.casual * 0.2), active: Math.round(a.fans.active * 0.15), core: Math.round(a.fans.core * 0.08) };
  a.fans.core = Math.round(a.fans.core * 0.9);
  if (lb && lb.active) courtNewcomer18(s, solo, lb.id); // r18 (world18): o solo estreia sem selo; o rival que o seduziu faz a proposta no mercado
  st.solo = solo.id;
  remember(s, 'solo', fmtL(l('{p} deixa {a} e segue solo{b}.', '{p} leaves {a} and goes solo{b}.'), { p: p.name, a: a.name, b: lb ? fmtL(l(' (a {x} já faz proposta)', ' ({x} is already making an offer)'), { x: lb.name }) : '' }), { actId: a.id, important: true });
  if (!a.members.length) a.status = 'split';
}

// ---------------------------------------------------------------- eventos

const S8 = (c: Ctx) => String(c.story);

const STORY_EVENTS: EventDef[] = [
  {
    id: 'r8_cult_offer', cat: 'band', tone: 'bad', tags: [], cooldown: 0, forcedOnly: true,
    title: l('{labelName} quer {person}', '{labelName} wants {person}'),
    text: l('"{releaseTitle}" foi aclamado e vendeu pouco. Agora {labelName} oferece dinheiro a {person}, a voz de {act}, para seguir solo.', '"{releaseTitle}" was acclaimed and sold little. Now {labelName} is offering {person}, the voice of {act}, money to go solo.'),
    options: [
      { id: 'renegotiate', label: l('Renegociar com a banda', 'Renegotiate with the band'), hint: l('Custa; a confiança e as lembranças contam.', 'Costs money; trust and memories count.'), apply: (s, r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)]; const p = s.persons[String(c.person)];
        if (!st || !a || !p) return;
        const m = identity(s).acts[a.id];
        const cheap = a.trust >= 65 && bondBalance(m) > 0;
        post(s, `r8reneg:${a.id}:${s.week}`, -Math.round(money(s, 2500 + a.fame * 150) * (cheap ? 0.6 : 1)), 'advances', `Renegociação ${a.name}`);
        const ok = r.chance(a.trust >= 50 && bondBalance(m) >= 0 ? 0.9 : 0.55);
        if (ok) {
          const k = a.contractId ? s.contracts[a.contractId] : undefined;
          if (k) k.royalty = clamp(k.royalty + 0.02, 0, 0.6);
          a.trust = clamp(a.trust + 8, 0, 100);
          p.morale = clamp(p.morale + 10, 0, 100);
          bondNote(s, a, 'support', l('renegociou', 'renegotiated').pt);
          step(st, 'renegotiate');
        } else {
          voiceLeaves(s, r, a, p, s.labels[String(c.label)], st);
          step(st, 'renegotiate_fail');
        }
        st.st = 2;
        st.next = s.week + 52 * r.int(4, 8);
      } },
      { id: 'other', label: l('Apoiar outro integrante', 'Back another member'), hint: l('A banda segue com nova liderança; a voz sai.', 'The band carries on under new leadership; the voice leaves.'), apply: (s, r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)]; const p = s.persons[String(c.person)];
        if (!st || !a || !p) return;
        const other = a.members.map((id) => s.persons[id]).filter((x): x is Person => !!x && x.alive && x.id !== p.id && !x.isPlayer).sort((x, y) => y.skills.comp - x.skills.comp)[0];
        voiceLeaves(s, r, a, p, s.labels[String(c.label)], st);
        if (other) {
          a.leaderId = other.id;
          other.morale = clamp(other.morale + 15, 0, 100);
          other.inspiration = clamp(other.inspiration + 15, 0, 100);
        }
        bondNote(s, a, 'support', other?.name);
        step(st, 'other');
        st.st = 2;
        st.next = s.week + 52 * r.int(4, 8);
      } },
      { id: 'split', label: l('Deixar a banda se separar', 'Let the band split'), hint: l('Sem custo; o catálogo fica com você.', 'No cost; you keep the catalog.'), apply: (s, r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)]; const p = s.persons[String(c.person)];
        if (!st || !a) return;
        if (p) voiceLeaves(s, r, a, p, s.labels[String(c.label)], st);
        bondNote(s, a, 'abandon');
        if (a.owner === 'player') endContract(s, a, 'expired');
        a.status = 'split';
        a.careerEnd = s.year;
        step(st, 'split');
        st.st = 2;
        st.next = s.week + 52 * r.int(4, 8);
      } },
    ],
  },
  {
    id: 'r8_cult_revival_band', cat: 'career', tone: 'good', tags: [], cooldown: 0, forcedOnly: true,
    title: l('"{releaseTitle}" renasce', '"{releaseTitle}" is reborn'),
    text: l('O disco que vendeu pouco anos atrás virou culto: uma geração nova descobriu "{releaseTitle}". {act} ainda está com você.', 'The record that sold little years ago became a cult classic: a new generation found "{releaseTitle}". {act} is still with you.'),
    options: [
      { id: 'deluxe', label: l('Edição de luxo para colecionadores', 'Deluxe edition for collectors'), hint: l('Custa; mais vendas, fãs fiéis e confiança.', 'Costs money; more sales, loyal fans and trust.'), apply: (s, _r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)];
        if (!st || !a) return;
        post(s, `r8deluxe:${st.id}`, -money(s, 6000), 'manufacturing', `Edição de luxo ${a.name}`);
        const rv = audience(s).rev.find((x) => x.rel === st.rel);
        if (rv) rv.power *= 1.6;
        a.fans.core = Math.round(a.fans.core * 1.04);
        a.trust = clamp(a.trust + 5, 0, 100);
        s.player.reputation.artistic = clamp(s.player.reputation.artistic + 2, 0, 100);
        bondNote(s, a, 'pride', s.releases[st.rel ?? '']?.title);
        finish(s, st, 'deluxe');
      } },
      { id: 'license', label: l('Licenciar para cinema e publicidade', 'License to film and ads'), hint: l('Dinheiro agora; artistas puristas torcem o nariz.', 'Cash now; purist artists frown.'), apply: (s, _r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)]; const rel = s.releases[String(c.release)];
        if (!st || !a) return;
        post(s, `r8lic:${st.id}`, money(s, 4000 + (rel?.q ?? 50) * 60), 'licensing', `Licença "${rel?.title ?? ''}"`);
        a.trust = clamp(a.trust + (prefsOf(s, a).art > 60 ? -4 : 1), 0, 100);
        finish(s, st, 'license');
      } },
      { id: 'grow', label: l('Deixar crescer sozinho', 'Let it grow on its own'), apply: (s, _r, c) => { const st = storyById(s, S8(c)); if (st) finish(s, st, 'grow'); } },
    ],
  },
  {
    id: 'r8_cult_revival_split', cat: 'career', tone: 'good', tags: [], cooldown: 0, forcedOnly: true,
    title: l('"{releaseTitle}" renasce sem a banda', '"{releaseTitle}" is reborn without the band'),
    text: l('Uma geração nova descobriu "{releaseTitle}", de {act}. A banda já não é a mesma. Os fãs pedem uma volta.', 'A new generation found "{releaseTitle}" by {act}. The band is not what it was. Fans are asking for a return.'),
    options: [
      { id: 'reunion', label: l('Propor uma reunião', 'Propose a reunion'), hint: l('Custa; a chance depende de mágoas e lembranças.', 'Costs money; the odds depend on grudges and memories.'), apply: (s, r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)];
        if (!st || !a) return;
        post(s, `r8reun:${st.id}`, -money(s, 5000 + a.fame * 100), 'artist_dev', `Reunião ${a.name}`);
        const p = st.p ? s.persons[st.p] : undefined;
        const m = identity(s).acts[a.id];
        const chance = 0.35 + (p && p.resentment < 40 ? 0.2 : 0) + (bondBalance(m) > 0 ? 0.15 : 0) + (st.ch.includes('other') ? 0.05 : 0) - (st.ch.includes('split') ? 0.05 : 0);
        if (p?.alive && r.chance(chance)) {
          if (!a.members.includes(p.id)) a.members.push(p.id); actsTouched17(s); // r17: índice pessoa→atos
          const solo = st.solo ? s.acts[st.solo] : undefined;
          if (solo && solo.members.length === 1 && solo.members[0] === p.id) { if (solo.owner && solo.owner !== 'player') endContract(s, solo, 'expired'); solo.status = 'split'; }
          a.status = 'active';
          a.careerEnd = Math.max(a.careerEnd, s.year + 6);
          if (!a.owner) grantPlayerContract(s, a, 24);
          a.fans.casual = Math.round(a.fans.casual * 1.3);
          a.momentum = clamp(a.momentum + 25, 0, 100);
          finish(s, st, 'reunion');
        } else finish(s, st, 'reunion_fail');
      } },
      { id: 'reissue', label: l('Relançar sem eles', 'Reissue without them'), hint: l('Mais vendas; a banda não gosta.', 'More sales; the band does not like it.'), apply: (s, _r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)];
        if (!st || !a) return;
        post(s, `r8reiss:${st.id}`, -money(s, 3000), 'manufacturing', `Relançamento ${a.name}`);
        const rv = audience(s).rev.find((x) => x.rel === st.rel);
        if (rv) rv.power *= 1.4;
        a.trust = clamp(a.trust - 5, 0, 100);
        bondNote(s, a, 'abandon');
        finish(s, st, 'reissue');
      } },
      { id: 'quiet', label: l('Assistir de longe', 'Watch from afar'), apply: (s, _r, c) => { const st = storyById(s, S8(c)); if (st) finish(s, st, 'quiet'); } },
    ],
  },
  {
    id: 'r8_pact', cat: 'career', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
    title: l('{act} propõe um pacto', '{act} proposes a pact'),
    text: l('{act} topa gravar um disco comercial agora, se o selo bancar o próximo projeto experimental. É um acordo de palavra — e eles vão lembrar.', '{act} will record a commercial album now if the label backs their next experimental project. A gentleman\'s agreement — and they will remember.'),
    options: [
      { id: 'accept', label: l('Aceitar o pacto', 'Accept the pact'), hint: l('Próximo disco comercial; depois, o experimental.', 'Next record commercial; then the experimental one.'), apply: (s, _r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)];
        if (!st || !a) return;
        a.positioning = clamp(a.positioning + 5, 0, 100);
        for (const id of a.members) { const p = s.persons[id]; if (p && !p.isPlayer) p.morale = clamp(p.morale + 4, 0, 100); }
        step(st, 'accept');
        st.st = 1;
        st.next = s.week + 78;
      } },
      { id: 'refuse', label: l('Recusar', 'Refuse'), hint: l('Confiança cai.', 'Trust drops.'), apply: (s, _r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)];
        if (!st || !a) return;
        a.trust = clamp(a.trust - 4, 0, 100);
        finish(s, st, 'refuse');
      } },
      { id: 'later', label: l('Deixar para depois', 'Leave it for later'), apply: (s, _r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)];
        if (a) a.trust = clamp(a.trust - 1, 0, 100);
        if (st) finish(s, st, 'later');
      } },
    ],
  },
  {
    id: 'r8_formula', cat: 'career', tone: 'bad', tags: [], cooldown: 0, forcedOnly: true,
    title: l('{act} não quer repetir "{releaseTitle}"', '{act} will not repeat "{releaseTitle}"'),
    text: l('O novo lançamento soa como "{releaseTitle}" de novo. {act} diz que prefere sair do selo a virar uma fórmula.', 'The new release sounds like "{releaseTitle}" all over again. {act} says they would rather leave the label than become a formula.'),
    options: [
      { id: 'insist', label: l('Insistir na fórmula', 'Insist on the formula'), hint: l('Vendas seguras; confiança despenca e eles podem sair.', 'Safe sales; trust plummets and they may leave.'), apply: (s, _r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)];
        if (!st || !a) return;
        a.trust = clamp(a.trust - 10, 0, 100);
        for (const id of a.members) { const p = s.persons[id]; if (p && !p.isPlayer) p.morale = clamp(p.morale - 8, 0, 100); }
        step(st, 'insist');
        st.st = 1;
        st.next = s.week + 26;
      } },
      { id: 'release', label: l('Liberar do contrato', 'Release them from the contract'), hint: l('Perde o ato; reputação entre artistas sobe.', 'You lose the act; reputation among artists rises.'), apply: (s, _r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)];
        if (!st || !a) return;
        bondNote(s, a, 'support', l('liberou do contrato', 'released from contract').pt);
        s.player.reputation.artists = clamp(s.player.reputation.artists + 3, 0, 100);
        if (a.owner === 'player') endContract(s, a, 'expired');
        finish(s, st, 'release');
      } },
      { id: 'free', label: l('Dar liberdade criativa', 'Give creative freedom'), hint: l('Som mais ousado: menos ouvintes casuais, fãs mais fiéis.', 'Bolder sound: fewer casual listeners, more loyal fans.'), apply: (s, _r, c) => {
        const st = storyById(s, S8(c)); const a = s.acts[String(c.act)];
        if (!st || !a) return;
        const k = a.contractId ? s.contracts[a.contractId] : undefined;
        if (k) k.creativeControl = true;
        a.positioning = clamp(a.positioning - 8, 0, 100);
        a.fans.casual = Math.round(a.fans.casual * 0.95);
        a.fans.core = Math.round(a.fans.core * 1.03);
        a.trust = clamp(a.trust + 6, 0, 100);
        for (const id of a.members) { const p = s.persons[id]; if (p && !p.isPlayer) p.morale = clamp(p.morale + 6, 0, 100); }
        bondNote(s, a, 'support', l('liberdade criativa', 'creative freedom').pt);
        finish(s, st, 'free');
      } },
    ],
  },
];
deferEvents(STORY_EVENTS);

// ---------------------------------------------------------------- gatilhos e passos

/** Rival que corteja a voz: o Abutre primeiro, depois quem tem caixa. */
function courtingLabel(s: GameState): Label | undefined {
  const act = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 100000));
  return act.find((x) => playbookOf(x) === 'vulture') ?? act.sort((x, y) => y.cash - x.cash)[0];
}

/** Disco aclamado e encalhado vira semente de culto (chamado 8 semanas após o lançamento). */
export function maybeStartCult(s: GameState, r: Rng, a: Act, rel: Release, force = false): Story | undefined {
  if (!mineActive(s, a) || rel.owner !== 'player' || rel.reissueOf) return undefined;
  if (a.members.length < 2 || a.fame >= 50 || activeStory(s, a.id) || (!force && onCooldown(s, 'cult', a))) return undefined;
  if (resultKind(rel) !== 'flop_acclaim' && !force) return undefined;
  if (!force && !r.chance(0.7)) return undefined;
  s.flags[`cult8:${rel.id}`] = 1;
  const st = startStory(s, 'cult', a, { rel: rel.id });
  step(st, 'start_cult');
  st.next = s.week + r.int(12, 24);
  return st;
}

function runStory(s: GameState, r: Rng, st: Story): void {
  const a = s.acts[st.act];
  if (!a) { st.done = true; return; }
  if (st.k === 'cult') {
    if (st.st === 0) {
      if (!mineActive(s, a)) { finish(s, st, 'gone'); return; }
      const p = voiceOf(s, a);
      const lb = courtingLabel(s);
      if (!p || !lb || a.members.length < 2) { st.next = s.week + 26; if (s.week - st.w0 > 160) st.done = true; return; }
      st.p = p.id;
      st.lb = lb.id;
      step(st, 'courted');
      st.st = 1;
      st.next = NEVER; // espera a decisão
      emitEvent(s, r, 'r8_cult_offer', { act: a.id, person: p.id, label: lb.id, release: st.rel ?? '', story: st.id });
      return;
    }
    if (st.st === 2) {
      const rel = st.rel ? s.releases[st.rel] : undefined;
      if (!rel) { st.done = true; return; }
      startRevival(s, rel, 4.5, 'story');
      step(st, 'revived');
      if (a.owner !== 'player' && a.status !== 'split') { finish(s, st, 'gone'); return; }
      const intact = mineActive(s, a) && (st.ch.includes('renegotiate') || (st.p ? a.members.includes(st.p) : true));
      st.st = 3;
      st.next = NEVER;
      emitEvent(s, r, intact ? 'r8_cult_revival_band' : 'r8_cult_revival_split', { act: a.id, release: rel.id, story: st.id });
    }
    return;
  }
  if (st.k === 'pact') {
    if (st.st === 0) { st.next = NEVER; emitEvent(s, r, 'r8_pact', { act: a.id, story: st.id }); return; }
    // prazos vencidos
    if (st.st === 1) { finish(s, st, 'stalled'); return; }
    if (st.st === 2) { breakPact(s, a, st); return; }
  }
  if (st.k === 'formula' && st.st === 1) {
    const pr = prefsOf(s, a);
    if (a.owner === 'player' && (a.trust < 40 || pr.loyalty < 35)) {
      endContract(s, a, 'left');
      finish(s, st, 'left');
    } else {
      a.trust = clamp(a.trust + 2, 0, 100);
      finish(s, st, 'stayed');
    }
  }
}

function breakPact(s: GameState, a: Act, st: Story): void {
  a.trust = clamp(a.trust - 15, 0, 100);
  for (const id of a.members) { const p = s.persons[id]; if (p && !p.isPlayer) p.morale = clamp(p.morale - 8, 0, 100); }
  bondNote(s, a, 'broken', l('pacto', 'pact').pt);
  if (a.trust < 35) {
    s.flags[`leaving:${a.id}`] = 1;
    notify(s, fmtL(l('{a} não perdoa o pacto quebrado: vai embora no fim do contrato.', '{a} will not forgive the broken pact: they leave when the contract ends.'), { a: a.name }), 'bad');
  } else notify(s, fmtL(l('{a} se sente traído(a): o projeto experimental prometido não saiu.', '{a} feels betrayed: the promised experimental project never came.'), { a: a.name }), 'bad');
  finish(s, st, 'broken');
}

/** Ação do jogador: financiar o projeto experimental prometido no pacto. */
export function fundExperimental(s: GameState, storyId: string): L | null {
  const st = storyById(s, storyId);
  const a = st ? s.acts[st.act] : undefined;
  if (!st || !a || st.k !== 'pact' || st.done || st.st < 1) return l('Não há pacto a cumprir.', 'No pact to honor.');
  if (st.ch.includes('funded')) return l('Já financiado.', 'Already funded.');
  const cost = money(s, 2500 + a.fame * 80);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `r8fund:${st.id}`, -cost, 'artist_dev', `Projeto experimental ${a.name}`);
  for (const id of a.songs) { const so = s.songs[id]; if (so && !so.recorded) so.originality = clamp(so.originality + 10, 0, 100); }
  for (const id of a.members) { const p = s.persons[id]; if (p && !p.isPlayer) p.inspiration = clamp(p.inspiration + 15, 0, 100); }
  a.trust = clamp(a.trust + 3, 0, 100);
  step(st, 'funded');
  return null;
}

export function fundCost(s: GameState, st: Story): number {
  const a = s.acts[st.act];
  return money(s, 2500 + (a?.fame ?? 0) * 80);
}

// lançamentos movem pacto e fórmula
registerSimHook('launch', 'stories8', (s, r, arg) => {
  const rel = arg.release;
  if (!rel || rel.reissueOf) return;
  const a = s.acts[rel.actId];
  if (!mineActive(s, a)) return;
  const st = activeStory(s, a.id);
  if (st?.k === 'pact') {
    if (st.st === 1 && soundsCommercial(s, rel)) {
      step(st, 'commercial');
      st.st = 2;
      st.next = s.week + 70;
      a.momentum = clamp(a.momentum + 5, 0, 100);
      notify(s, fmtL(l('{a} cumpriu a parte do pacto com "{t}". Agora esperam o projeto experimental.', '{a} kept their side of the pact with "{t}". Now they expect the experimental project.'), { a: a.name, t: rel.title }), 'info');
    } else if (st.st === 2) {
      if (soundsExperimental(s, rel) || st.ch.includes('funded')) {
        a.trust = clamp(a.trust + 10, 0, 100);
        for (const id of a.members) { const p = s.persons[id]; if (p && !p.isPlayer) p.morale = clamp(p.morale + 8, 0, 100); }
        bondNote(s, a, 'kept', l('pacto', 'pact').pt);
        finish(s, st, 'kept');
      } else if (soundsCommercial(s, rel)) breakPact(s, a, st);
    }
    return;
  }
  if (st) return;
  // fórmula: quem é inquieto ou artístico não quer repetir o hit
  const hit = repeatsFormula(s, a, rel);
  if (!hit) return;
  const pr = prefsOf(s, a);
  const ph = careerPhase(s, a);
  if ((pr.art >= 58 || pr.restless >= 58) && (ph === 'peak' || ph === 'affirmation') && !onCooldown(s, 'formula', a) && r.chance(0.4)) {
    const ns = startStory(s, 'formula', a, { rel: hit.id });
    step(ns, 'start_formula');
    ns.next = NEVER;
    emitEvent(s, r, 'r8_formula', { act: a.id, release: hit.id, story: ns.id });
  }
});

// disco cult: oito semanas depois do lançamento, crítica e parada já disseram o que tinham a dizer
registerSimHook('week', 'stories8', (s, r) => {
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.playerBand) continue;
    for (let i = a.releases.length - 1; i >= 0; i--) {
      const rel = s.releases[a.releases[i]];
      if (!rel) continue;
      const age = s.week - rel.week;
      if (age > 8) break;
      if (age === 8) maybeStartCult(s, r, a, rel);
    }
  }
});

registerSimHook('month', 'stories8', (s, r) => {
  const st = stories(s);
  for (const x of st.list) {
    if (x.done) continue;
    if (s.week >= x.next) runStory(s, r, x);
    // decisão descartada (ato ou pessoa sumiram do save): a história se encerra em silêncio
    else if (x.next >= NEVER && !s.decisions.some((d) => d.ctx.story === x.id)) x.done = true;
  }
  // pacto: artista artístico em desgaste, sem caixa ou desanimado propõe um acordo
  const active = st.list.filter((x) => !x.done).length;
  if (active >= 3) return;
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!mineActive(s, a) || activeStory(s, a.id) || onCooldown(s, 'pact', a)) continue;
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    if (!c || c.party !== 'player' || c.endWeek - s.week < 52) continue;
    const pr = prefsOf(s, a);
    if (pr.art < 62) continue;
    const morale = a.members.reduce((t0, m) => t0 + (s.persons[m]?.morale ?? 50), 0) / Math.max(1, a.members.length);
    if (careerPhase(s, a) !== 'wear' && a.cash > money(s, 1500) && morale >= 50) continue;
    if (!r.chance(0.025)) continue;
    const ns = startStory(s, 'pact', a);
    step(ns, 'start_pact');
    ns.next = s.week;
    runStory(s, r, ns);
    break;
  }
});
