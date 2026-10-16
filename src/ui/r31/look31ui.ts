// R31 · onda 3 (AP) — APARÊNCIA na interface: bloco da ficha (aparência como o público vê, estilo, forma, sex appeal,
// marcas e segredos que você conhece), a tela de cuidados (academia, nutricionista, estilista, dentista, dermatologista,
// cirurgião, consultor) com as três formas de pagar e a recusa/insistência, a ação no painel rápido, a opção
// "Pressão estética" e o ajuste do boneco (forma, cabelo, estilo). A regra é toda de src/sim/look31.ts; aqui só se lê e
// se chama a ação do jogo. A cena pixel art de cada lugar é da onda 4.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { know, see } from '../../sim/know';
import {
  PAY31, PRESSURE31, SVC31, SVC_IDS31, acceptOdds31, avatarTweak31, doLook31, frontOf31, lookLock31, lookOn31, pressure31, rec31,
  seenLook31, setPressure31, sexAppeal31, svcCost31, svcOpen31, view31, type LookPay31, type Pressure31, type Svc31,
} from '../../sim/look31';
import type { GameState } from '../../sim/types';
import { $, modal, pill, rerender, toast } from '../common';
import { bar, h, select } from '../dom';
import { setLookPost31 } from '../pixel/avatar';
import { store } from '../store';
import { lockBtn31 } from './lock31';
import { actOf31, registerQuick31 } from './quick31core';

const tone = (v: number) => (v >= 65 ? 'good' : v <= 35 ? 'bad' : '');
/** Palavra para quem só vê de fora (sem número cru). */
const word = (v: number): L => (v >= 80 ? l('deslumbrante', 'stunning') : v >= 65 ? l('marcante', 'striking') : v >= 45 ? l('comum', 'ordinary') : v >= 30 ? l('discreta', 'understated') : l('apagada', 'plain'));
const MARK_TXT: Record<string, L> = {
  swell: l('inchaço de procedimento', 'swelling from a procedure'), injury: l('lesão', 'injury'), bags: l('olheiras de turnê', 'tour-worn eyes'),
  shaved: l('cabelo raspado', 'shaved head'), meme: l('visual virou piada', 'look became a joke'), trend: l('visual virou tendência', 'look became a trend'),
  tattoo: l('tatuagem', 'tattoo'), bruise: l('hematoma', 'bruise'), glow: l('brilho', 'glow'),
};
const mine31 = (s: GameState, pid: string): boolean => { const p = s.persons[pid]; return !!p && (!!p.isPlayer || know(s, pid).mine); };

/** Bloco "Aparência" da ficha (pessoa de `s.persons`). */
export function lookBlock31(s: GameState, key: string, redraw?: () => void): HTMLElement | null {
  if (!key.startsWith('p:') && key !== 'player') return null;
  const pid = key === 'player' ? Object.values(s.persons).find((x) => x.isPlayer)?.id ?? '' : key.slice(2);
  const p = s.persons[pid];
  if (!p || !lookOn31(s)) return null;
  const own = mine31(s, pid);
  const v = view31(s, p);
  const sl = seenLook31(s, pid)!;
  const sa = sexAppeal31(s, pid);
  const vis = see(s, pid, 'looks') !== 'hidden';
  const row = (name: L, val: number, exact: boolean) => h('li', null, h('span', null, t(name)), exact ? bar(val, 100, tone(val)) : null, h('b', null, exact ? String(Math.round(val)) : t(word(val))));
  return h('div', { class: 'look31' },
    h('h4', null, t(l('Aparência', 'Appearance'))),
    !vis && !own ? h('p', { class: 'small muted' }, t(l('Você nunca viu essa pessoa de perto nem em foto.', 'You have never seen this person up close or in a photo.'))) :
      h('ul', { class: 'attr-list' },
        row(l('Aparência (como o público vê)', 'Looks (as the public sees them)'), v.A, own),
        row(l('Estilo', 'Style'), v.S, own),
        own ? row(l('Forma física', 'Fitness'), v.form, true) : null,
        sa ? row(l('Sex appeal', 'Sex appeal'), sa.v, own) : null),
    own && v.parts.length ? h('p', { class: 'small muted' }, v.parts.map((x) => `${t(x.why)} ${x.v > 0 ? '+' : ''}${x.v}`).join(' · ')) : null,
    sa && own ? h('p', { class: 'small muted' }, t(l('Peso do visual nesta época: {w} ({y}).', 'Weight of looks in this era: {w} ({y}).'), { w: t(sa.w >= 0.15 ? l('muito', 'a lot') : sa.w >= 0.07 ? l('médio', 'medium') : l('pouco', 'little')), y: t(sa.why[1]) })) : null,
    v.marks.length && (own || vis) ? h('p', { class: 'small' }, v.marks.map((m) => pill(t(MARK_TXT[m[0]] ?? l('marca', 'mark')), m[2] >= 0 ? 'good' : 'bad'))) : null,
    sl.secrets.length ? h('p', { class: 'small' }, pill(t(l('procedimento', 'procedure')), 'bad'), ' ', sl.secrets.map((x) => `${t(SVC31[x[3] as Svc31]?.name ?? l('procedimento', 'procedure'))}${x[2] === 2 ? ` (${t(l('público', 'public'))})` : x[2] === 1 ? ` (${t(l('boato', 'rumour'))})` : ` (${t(l('em segredo', 'secret'))})`}`).join(' · ')) : null,
    own ? h('div', { class: 'row wrap' }, h('button', { class: 'btn small', onclick: () => openLook31(s, pid, redraw) }, t(l('Cuidar da aparência…', 'Take care of looks…')))) : null,
    pressure31(s) !== 'normal' ? h('p', { class: 'small muted' }, t(l('Pressão estética: {p} (Opções).', 'Beauty pressure: {p} (Options).'), { p: t(PRESSURE31[pressure31(s)]) })) : null,
  );
}

/** Tela de cuidados: cada serviço com época, preço, risco, chance de aceitar e as três formas de pagar. */
export function openLook31(s: GameState, pid: string, after?: () => void): void {
  const p = s.persons[pid];
  if (!p) return;
  let close = () => {};
  let secret = false;
  const box = h('div', { class: 'look31-svc' });
  const say = (r: { ok: boolean; refused?: boolean; text: L }, id: Svc31, pay: LookPay31) => {
    toast(t(r.text), r.ok ? 'good' : 'bad');
    if (r.refused) {
      box.prepend(h('div', { class: 'card bad' }, h('p', null, t(r.text)),
        h('button', { class: 'btn small danger', onclick: () => { say(doLook31(s, pid, id, pay, { insist: true, secret }), id, pay); } }, t(l('Insistir (pesa na relação)', 'Insist (hurts the relationship)')))));
      return;
    }
    after?.(); rerender(); draw();
  };
  const pays = (id: Svc31): LookPay31[] => (p.isPlayer ? ['me', 'co'] : ['me', 'co', 'gift']);
  const draw = () => {
    box.replaceChildren(
      h('p', { class: 'small muted' }, t(l('Cada cuidado é um lugar da cidade. A pessoa pode recusar (vaidade e autenticidade); insistir pesa na opinião. Procedimentos podem ser feitos em segredo — e virar boato.', 'Each service is a place in town. The person may refuse (vanity and authenticity); insisting weighs on their opinion. Procedures can be done in secret — and turn into rumours.'))),
      h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: secret, onchange: (e: Event) => { secret = (e.target as HTMLInputElement).checked; } }), ' ', t(l('Procedimentos em segredo (sem contar ao público)', 'Procedures in secret (without telling the public)'))),
      h('ul', { class: 'list' }, SVC_IDS31.map((id) => {
        const d = SVC31[id];
        const open = svcOpen31(s, id);
        const odds = acceptOdds31(s, pid, id);
        return h('li', { class: 'card' },
          h('div', { class: 'row wrap' }, h('b', null, t(d.name)), ' ', open ? h('span', { class: 'small' }, '≈ ', $(svcCost31(s, id))) : pill(t(l('desde {y}', 'since {y}'), { y: d.from }), '')),
          h('p', { class: 'small muted' }, t(d.desc), ' ', t(l('Risco: {r}.', 'Risk: {r}.'), { r: t(d.riskTxt) })),
          !p.isPlayer && open ? h('p', { class: 'small' }, t(l('Chance de aceitar: {c}', 'Chance they accept: {c}'), { c: t(odds.p >= 0.7 ? l('alta', 'high') : odds.p >= 0.35 ? l('média', 'medium') : l('baixa', 'low')) })) : null,
          h('div', { class: 'row wrap' }, pays(id).map((pay) => lockBtn31(t(PAY31[pay]), lookLock31(s, pid, id, pay), () => say(doLook31(s, pid, id, pay, { secret }), id, pay)))));
      })));
  };
  draw();
  close = modal(t(l('Aparência · {n}', 'Appearance · {n}'), { n: p.name }), box, { wide: true });
  void close;
}

// ---------------------------------------------------------------- painel rápido

registerQuick31({
  id: 'q.look', verb: 'more', icon: 'star', kinds: ['act', 'person'], label: l('Cuidar da aparência', 'Take care of looks'),
  applies: (s, tg) => { if (!lookOn31(s)) return false; const a = actOf31(s, tg); return !!a && a.owner === 'player'; },
  dest: (s, tg) => ({ area: 'artists', actId: actOf31(s, tg)?.id }),
  run: (s, tg) => { const a = actOf31(s, tg); const pid = tg.kind === 'person' ? tg.id : a ? frontOf31(s, a)?.id : undefined; if (pid) openLook31(s, pid); },
});

// ---------------------------------------------------------------- Opções

/** Linha das Opções: "Pressão estética: normal / suave / desligada" (regra da partida). */
export function settingsLook31(): HTMLElement | null {
  const s = store.game;
  if (!s) return null;
  return h('label', null, t(l('Pressão estética', 'Beauty pressure')),
    select(pressure31(s), (['normal', 'soft', 'off'] as Pressure31[]).map((v) => ({ value: v, label: t(PRESSURE31[v]) })), (v) => { setPressure31(s, v); rerender(); }),
    h('small', { class: 'muted' }, t(l('A pressão estética aparece como crítica histórica (mais dura com as mulheres em várias épocas). Desligada, a aparência física não pesa; estilo e carisma sim.', 'Beauty pressure appears as historical critique (harsher on women in many eras). Off, physical looks do not weigh; style and charisma do.'))));
}

// ---------------------------------------------------------------- boneco

setLookPost31((id, a) => {
  const s = store.game;
  if (!s) return a;
  const tw = avatarTweak31(s, id);
  if (!tw) return a;
  const b = { ...a };
  if (tw.body !== undefined) b.body = tw.body;
  if (tw.hair !== undefined) b.hair = tw.hair;
  if (tw.outfitShift) { b.outfit = (a.outfit + tw.outfitShift) % 26; b.outfitColor = (a.outfitColor + tw.outfitShift * 3) % 8; }
  void rec31;
  return b;
});
