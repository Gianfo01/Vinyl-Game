// R33 · POL33-A item 6 — TELA DE ESCOLHER CANDIDATO do GENTE33 (diretor de filial, CEO, equipe pessoal). Tela NOVA no papel da
// casca (cand33.css): índice de candidatos à esquerda, o papel do escolhido no meio (retrato preso, traços em barras,
// carimbos, custo, opinião sobre você, recorte do dossiê) e o cartão de ações numerado à direita (1 contratar, 2/3 trocar de
// candidato, 4 ver a ficha, 5 fechar), com o motivo da trava embaixo do botão. Contratar chama a função do GENTE33 com a chave do
// candidato marcado (`hireBranchDir33`, `hireCeo33`, `hireCrew33`): nenhuma regra nova, só a escolha antes da contratação.
// Entradas: ações "Escolher entre candidatos" nos cartões da parede (filial), da mesa de reunião (CEO), da porta, da garagem e
// do espelho (equipe pessoal); `openCand33(spec)`.
import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { opinionOf } from '../../sim/opinion';
import { cashWhy20, freeCash20 } from '../../sim/oblig20';
import {
  CREW33, SRC33, STYLE33, canHireBranchDir33, cands33, ceo33, ceoLock33, crewLock33, freeBranch33, gente33On, hireBranchDir33, hireCeo33, hireCrew33, signOn33,
  type Cand33, type Crew33,
} from '../../sim/r33/gente33';
import type { GameState } from '../../sim/types';
import { fmtL, money } from '../../sim/util';
import { usd } from '../../sim/sys/crime17';
import { rerender, toast } from '../common';
import { h } from '../dom';
import { portraitCanvas } from '../pixel/avatar';
import { openFicha13 } from '../sys/persona13';
import { store } from '../store';
import './cand33.css';

export type CandSpec33 = { k: 'branch'; brId?: string } | { k: 'ceo' } | { k: 'crew'; crew: Crew33 };
const $ = (c: number): string => t(usd(c));

function roleOf(s: GameState, sp: CandSpec33): { title: L; role: L; city?: string; brId?: string } {
  if (sp.k === 'branch') {
    const id = sp.brId ?? freeBranch33(s), b = s.branches.find((x) => x.id === id);
    return { title: l('Candidatos a diretor(a) de filial', 'Branch director candidates'), role: b ? fmtL(l('Diretor(a) da filial de {c}', 'Director of the {c} branch'), { c: cityById[b.city]?.name ?? b.city }) : l('Diretor(a) de filial', 'Branch director'), city: b?.city, brId: id };
  }
  if (sp.k === 'ceo') return { title: l('Candidatos a CEO', 'CEO candidates'), role: l('CEO (você preside o conselho)', 'CEO (you chair the board)') };
  return { title: fmtL(l('Candidatos: {r}', 'Candidates: {r}'), { r: CREW33[sp.crew].n }), role: CREW33[sp.crew].n };
}
export function listFor33(s: GameState, sp: CandSpec33): Cand33[] {
  const r = roleOf(s, sp);
  if (sp.k === 'branch') return cands33(s, { city: r.city, n: 6 });
  if (sp.k === 'ceo') return cands33(s, { min: 0.55, n: 6 });
  const own = cands33(s, { srcs: sp.crew === 'doctor' ? ['city', 'staff'] : ['city'], n: 6 });
  return own.length ? own : cands33(s, { srcs: ['exart'], n: 6 });
}
/** Custo mensal e luvas de quem seria contratado. */
export function costOf33(s: GameState, sp: CandSpec33, c: Cand33): { sign: number; month: number; own: boolean } {
  if (sp.k === 'crew') return { sign: 0, month: money(s, CREW33[sp.crew].sal), own: true };
  if (sp.k === 'ceo') return { sign: signOn33(s, c) * 3, month: money(s, Math.round(c.sal * 2.5)), own: false };
  return { sign: signOn33(s, c), month: money(s, c.sal), own: false };
}
/** Motivo da trava para contratar ESTE candidato (null = pode). */
export function lockOf33(s: GameState, sp: CandSpec33, c: Cand33): L | null {
  if (!gente33On(s)) return l('Gente do GENTE33 está desligada.', 'GENTE33 people are switched off.');
  if (sp.k === 'branch') { const id = roleOf(s, sp).brId; return id ? canHireBranchDir33(s, id, c.k) : l('Todas as suas filiais já têm diretor(a).', 'All your branches already have a director.'); }
  if (sp.k === 'ceo') {
    if (ceo33(s)) return l('A empresa já tem CEO.', 'The company already has a CEO.');
    if (c.q < 0.55) return l('Esse candidato não tem estatura de CEO (competência mínima 55).', 'This candidate is not CEO material (minimum competence 55).');
    const gate = ceoLock33(s);
    if (gate && !/Caixa/i.test(t(gate))) return gate;
    const need = costOf33(s, sp, c).sign;
    return freeCash20(s) < need ? cashWhy20(s, need, l('Caixa insuficiente para as luvas do CEO.', 'Not enough cash for the CEO\'s signing fee.')) : null;
  }
  return crewLock33(s, sp.crew);
}
const OP = (n: number): L => (n >= 40 ? l('gosta de você', 'likes you') : n >= 10 ? l('simpático(a)', 'friendly') : n > -10 ? l('neutro(a)', 'neutral') : n > -40 ? l('desconfia de você', 'distrusts you') : l('não vai com a sua cara', 'dislikes you'));
const traitsOf = (s: GameState, c: Cand33): { t: L; tone: string }[] => {
  const pid = c.k.startsWith('p:') ? c.k.slice(2) : undefined, p = pid ? s.persons[pid] : undefined;
  const out: { t: L; tone: string }[] = [{ t: STYLE33[c.style], tone: 'b' }, { t: c.amb >= 65 ? l('ambicioso(a)', 'ambitious') : c.amb <= 35 ? l('sossegado(a)', 'easygoing') : l('equilibrado(a)', 'steady'), tone: c.amb >= 65 ? 'y' : 'g' }];
  for (const x of (p?.traits ?? []).slice(0, 1)) out.push({ t: l(x, x), tone: 'y' });
  if (c.local) out.push({ t: l('da cena local', 'local scene'), tone: 'g' });
  if (c.rival) out.push({ t: l('tirar de um rival', 'poach from a rival'), tone: 'r' });
  return out;
};
const ageOf = (s: GameState, c: Cand33): number | undefined => { const b = c.k.startsWith('p:') ? s.persons[c.k.slice(2)]?.born : undefined; return b ? s.year - b : undefined; };
function face(s: GameState, c: Cand33, px: number): HTMLCanvasElement {
  const id = c.k.slice(2), p = s.persons[id];
  const cv = portraitCanvas(p ? { id: p.id, role: p.role, born: p.born } : { id: c.k }, s, px);
  cv.removeAttribute('class');
  return cv;
}
const bar = (v: number, cls = ''): HTMLElement => h('div', { class: `c33-bar ${cls}`, role: 'img', 'aria-label': `${Math.round(v * 100)}%` }, h('i', { style: `width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%` }));
const row = (label: L, v: number, val: string, cls = ''): HTMLElement => h('div', { class: 'c33-row' }, h('span', null, t(label)), bar(v, cls), h('em', null, val));

let cur: { el: HTMLElement; off: () => void } | undefined;
export function closeCand33(): void { cur?.off(); cur?.el.remove(); cur = undefined; }

/** Abre a tela de escolha. */
export function openCand33(sp: CandSpec33): void {
  const g0 = store.game;
  if (!g0) return;
  closeCand33();
  let sel = 0;
  const root = h('div', { class: 'c33', role: 'dialog', 'aria-modal': 'true', 'aria-label': t(roleOf(g0, sp).title) });
  const key = (e: KeyboardEvent): void => {
    if (!cur) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeCand33(); return; }
    if (/^[1-5]$/.test(e.key) && !(e.target instanceof HTMLInputElement)) { const b = root.querySelectorAll<HTMLButtonElement>('.c33-a')[Number(e.key) - 1]; e.preventDefault(); e.stopImmediatePropagation(); if (b && !b.disabled) b.click(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); move(e.key === 'ArrowDown' ? 1 : -1); }
  };
  window.addEventListener('keydown', key, true);
  const move = (d: number): void => { const n = listFor33(store.game!, sp).length; if (n) { sel = (sel + d + n) % n; draw(); } };
  const draw = (): void => {
    const s = store.game;
    if (!s) return closeCand33();
    const r = roleOf(s, sp), xs = listFor33(s, sp);
    sel = Math.min(sel, Math.max(0, xs.length - 1));
    const c = xs[sel];
    const list = h('div', { class: 'c33-list', role: 'listbox', 'aria-label': t(l('Candidatos', 'Candidates')) }, xs.map((x, i) => h('button', { type: 'button', class: 'c33-it', role: 'option', 'aria-selected': i === sel ? 'true' : 'false', onclick: () => { sel = i; draw(); } },
      face(s, x, 2), h('span', null, h('b', null, x.n), h('small', null, t(SRC33[x.src])), h('i', null, `${Math.round(x.q * 100)} · ${$(costOf33(s, sp, x).month)}/${t(l('mês', 'mo'))}`)))));
    let sheet: HTMLElement, acts: HTMLElement;
    if (!c) {
      sheet = h('div', { class: 'c33-empty' }, t(l('Ninguém disponível agora. Contrate equipe, conheça gente na cidade ou espere um executivo ficar livre.', 'Nobody available now. Hire staff, meet people in town or wait for an executive to become free.')));
      acts = h('div', { class: 'c33-acts' }, h('button', { type: 'button', class: 'c33-a', onclick: closeCand33 }, h('kbd', null, '1'), t(l('Fechar', 'Close'))));
    } else {
      const cost = costOf33(s, sp, c), lock = lockOf33(s, sp, c), op = Math.round(opinionOf(s, c.k)), age = ageOf(s, c);
      sheet = h('div', { class: 'c33-sheet' },
        h('div', null, h('div', { class: 'c33-pol' }, face(s, c, 6), h('span', null, c.n)),
          h('div', { class: 'c33-stamps' }, traitsOf(s, c).map((x) => h('span', { class: `c33-st ${x.tone}` }, t(x.t))))),
        h('div', null,
          h('h2', { class: 'c33-name' }, c.n),
          h('p', { class: 'c33-sub' }, [t(SRC33[c.src]), age ? fmtL(l('{n} anos', '{n} years old'), { n: age }).pt : '', t(r.role)].filter(Boolean).join(' · ')),
          h('div', { class: 'c33-h' }, t(l('Traços', 'Traits'))),
          h('div', { class: 'c33-rows' }, row(l('Competência', 'Competence'), c.q, String(Math.round(c.q * 100))), row(l('Ambição', 'Ambition'), c.amb / 100, String(c.amb), 'y')),
          h('div', { class: 'c33-h' }, t(l('Custo', 'Cost'))),
          h('div', { class: 'c33-rows' },
            h('div', { class: 'c33-row' }, h('span', null, t(l('Luvas (uma vez)', 'Signing fee (once)'))), h('span'), h('em', null, cost.sign ? $(cost.sign) : '—')),
            h('div', { class: 'c33-row' }, h('span', null, t(l('Salário por mês', 'Salary per month'))), h('span', { class: 'small' }, cost.own ? t(l('do seu bolso', 'from your pocket')) : ''), h('em', null, $(cost.month)))),
          h('div', { class: 'c33-h' }, t(l('Opinião sobre você', 'Opinion of you'))),
          h('div', { class: 'c33-rows' }, row(OP(op), (op + 100) / 200, op > 0 ? `+${op}` : String(op), 'b')),
          h('div', { class: 'c33-clip' }, h('small', null, t(l('Dossiê', 'Dossier'))), h('p', null, t(c.note)))));
      const mk = (n: number, label: string, on: () => void, first = false, dis?: L | null): HTMLElement => h('div', null,
        h('button', { type: 'button', class: `c33-a${first ? ' first' : ''}`, disabled: dis ? true : undefined, 'aria-disabled': dis ? 'true' : undefined, 'aria-describedby': dis ? `c33-why-${n}` : undefined, onclick: on }, h('kbd', null, String(n)), label),
        dis ? h('p', { class: 'c33-why', id: `c33-why-${n}` }, t(l('Trava: ', 'Locked: ')), t(dis)) : null);
      acts = h('div', { class: 'c33-acts' },
        mk(1, fmtL(l('Contratar {n}', 'Hire {n}'), { n: c.n.split(' ')[0] }).pt, () => {
          const g = store.game!;
          const err = sp.k === 'branch' ? hireBranchDir33(g, roleOf(g, sp).brId ?? '', c.k) : sp.k === 'ceo' ? hireCeo33(g, c.k) : hireCrew33(g, sp.crew, c.k);
          if (err) { toast(t(err), 'bad'); draw(); return; }
          toast(t(fmtL(l('{n} contratado(a).', '{n} hired.'), { n: c.n })), 'good');
          closeCand33(); rerender();
        }, true, lock),
        mk(2, t(l('Candidato anterior', 'Previous candidate')), () => move(-1), false, xs.length > 1 ? null : l('Só há um candidato.', 'Only one candidate.')),
        mk(3, t(l('Próximo candidato', 'Next candidate')), () => move(1), false, xs.length > 1 ? null : l('Só há um candidato.', 'Only one candidate.')),
        mk(4, t(l('Ver a ficha', 'See the file')), () => { closeCand33(); openFicha13(c.k); }, false, c.k.startsWith('s:') ? l('Funcionário da sua equipe: a ficha fica na quadro da equipe.', 'Your own staff: the file is on the staff board.') : null),
        mk(5, t(l('Fechar', 'Close')), closeCand33));
    }
    const how = h('div', { class: 'c33-how' }, h('b', null, t(l('Como ler', 'How to read'))),
      t(l('Competência = o quanto rende. Ambição alta pede mais verba e gera atrito se o teto for baixo. Opinião = o que a pessoa pensa de você hoje. Ações sempre no cartão, com o motivo quando travadas.', 'Competence = how much they deliver. High ambition wants a bigger budget and clashes if the cap is low. Opinion = what the person thinks of you today. Actions always on the card, with the reason when locked.')));
    const side = h('aside', null, h('div', { class: 'c33-card' }, h('b', null, c ? c.n : t(r.title)), acts), how);
    const plate = h('header', { class: 'c33-plate' }, h('b', null, t(l('Pasta de candidatos', 'Candidate folder'))), h('small', null, `${t(r.title)} · ${s.year}`));
    const close = h('button', { type: 'button', class: 'c33-close', onclick: closeCand33 }, h('kbd', null, 'Esc'), t(l('fechar', 'close')));
    root.replaceChildren(h('div', { class: 'c33-wrap' }, plate, close, h('div', { class: 'c33-body' }, list, h('div', { class: 'c33-paper' }, sheet), side)));
    root.querySelector<HTMLElement>('.c33-a.first:not([disabled])')?.focus();
  };
  document.body.append(root);
  cur = { el: root, off: () => window.removeEventListener('keydown', key, true) };
  draw();
}
