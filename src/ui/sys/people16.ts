// Rodada 16 — página única de pessoa. Artistas, você, líderes de selos, empresários, produtores, equipe, críticos e
// gente da mídia seguem o MESMO padrão: cabeçalho comum (retrato, nome, idade, cidade, cargos, estado civil, situação)
// e abas comuns (Perfil, Família, Vida pessoal, Fama, Relações, Crenças) + uma aba por cargo (Artista, Empresário,
// Produtor, CEO, Dono do selo, Equipe, Crítico). Quem é artista abre a página de artista (pages.ts) com as mesmas abas
// extras; as páginas antigas (empresário, produtor, líder, crítico, ficha) passam por aqui (route16).
// Também: empresário e produtor no topo da página do artista, produção nos lançamentos (com pop-up de cada obra) e
// histórico de sucessão na página do selo.

import { REAL_MGRS, mgrById } from '../../data/managers14';
import { REAL_PRODS, prodById } from '../../data/producers15';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { compatOf, playerViews, polById, relById } from '../../sim/beliefs';
import { criticByName } from '../../sim/media';
import { BG_TXT, STYLE_TXT, jobEndText, leaders } from '../../sim/sys/leaders10';
import { playerPerson } from '../../sim/sys/life';
import { lz14 } from '../../sim/sys/leisure14';
import { kinOf15 } from '../../sim/sys/kin15';
import { mgrActive, mgrKey, mgrName, repOf, rosterOf } from '../../sim/sys/managers14';
import {
  HOW16, KIN16_REL, ROLE16, ST16, born16, canon16, clientsOf16, genMgrs16, life16, p16, producersOfRelease16, realKin16, roles16, status16, successions16, works16,
  type How16, type Work16,
} from '../../sim/sys/people16';
import { lookOf13, opinionOf, p13, per13, staffAdj13 } from '../../sim/sys/persona13';
import { prodKey, prodName } from '../../sim/sys/producers15';
import { PLAYBOOKS } from '../../sim/sys/rivals8';
import type { Act, GameState, Person } from '../../sim/types';
import { $, actLink, cityName, kv, labelLink, modal, pill, rerender, section } from '../common';
import { bar, h } from '../dom';
import { RELEASE_EXTRAS, openRelease } from '../ficha';
import { ACT_HEAD_EXTRAS, PERSON_HEAD_EXTRAS, PERSON_TABS, openPersonPage, pageTabs } from '../pages';
import { portraitCanvas } from '../pixel/avatar';
import { registerPageTab } from '../registry';
import { personRoute16, searchRoute16 } from '../route16';
import { store } from '../store';
import { chips, ic, stat } from '../vis';
import { criticBody } from './hubs8';
import { familyBlock15 } from './kin15';
import { leaderBody, playerLeaderBody } from './leaders10';
import { timeline } from './leisure14';
import { profile as mgrProfile } from './managers14';
import { ficha13 } from './persona13';
import { profile as prodProfile } from './producers15';

interface Tab16 { id: string; label: L; icon?: string; render: () => HTMLElement | null }
const signed = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}`;
const tone = (v: number) => (v >= 15 ? 'good' : v <= -15 ? 'bad' : '');
const idOf = (key: string) => key.split(':').slice(1).join(':');
const empty = (x: L) => h('p', { class: 'muted small' }, t(x));

/** Link para qualquer pessoa (chave), já pela página única. */
export function personLink16(s: GameState, key: string, name?: string, tab?: string): HTMLElement {
  return h('button', { class: 'link', onclick: (e: Event) => { e.stopPropagation(); openPerson16(key, tab); } }, name ?? per13(s, key)?.name ?? key);
}

// ---------------------------------------------------------------- blocos comuns

function civil16(s: GameState, key: string): L {
  const F0 = s.families[key];
  const x = life16(s, key);
  if (x?.mar && F0?.partner && !F0.separated) return l('Casado(a)', 'Married');
  if (realKin16(s, key).some((r) => r.rel === 'spouse')) return l('Casado(a)', 'Married');
  if (F0?.partner && !F0.separated) return l('Namorando', 'Dating');
  if (F0?.separated) return l('Separado(a)', 'Separated');
  return l('Solteiro(a)', 'Single');
}

function familyBlock16(s: GameState, key: string): HTMLElement {
  const F0 = s.families[key];
  const x = life16(s, key);
  const rk = realKin16(s, key);
  const L = leaders(s).L;
  const par = p16(s).par;
  const lid = key.startsWith('l:') ? idOf(key) : '';
  const parent = lid && par[lid] ? L[par[lid]] : undefined;
  const heirs = lid ? Object.entries(par).filter(([, v]) => v === lid).map(([k]) => L[k]).filter(Boolean) : [];
  const together = !!F0?.partner && !F0.separated;
  return h('div', null,
    h('p', null, ic('heart'), ' ', t(civil16(s, key)), x?.mar && together ? h('span', { class: 'muted small' }, ` · ${t(l('desde', 'since'))} ${x.mar}`) : null),
    h('ul', { class: 'dos13-list small' },
      F0?.partner ? h('li', null, `${F0.partner.name} · ${t(F0.partner.job)} · `, t(together ? l('parceiro(a) atual', 'current partner') : l('ex', 'ex'))) : null,
      ...(F0?.kids ?? []).map((k) => h('li', null, `${k.name} · ${t(l('filho(a)', 'child'))} · ${s.year - k.born} ${t(l('anos', 'yrs'))}`)),
      ...rk.map((r) => h('li', null, r.key ? personLink16(s, r.key, r.name) : r.name, ` · ${t(KIN16_REL[r.rel] ?? l(r.rel))}`, ' ', pill(t(l('real', 'real')), 'gold'))),
      parent ? h('li', null, personLink16(s, `l:${parent.id}`, parent.name), ` · ${t(l('pai/mãe — antecessor(a) no selo', 'parent — predecessor at the label'))}`) : null,
      ...heirs.map((x2) => h('li', null, personLink16(s, `l:${x2.id}`, x2.name), ` · ${t(l('filho(a) — herdou o comando', 'child — inherited the helm'))}`)),
    ),
    !F0?.partner && !F0?.kids.length && !rk.length && !parent && !heirs.length ? empty(l('Sem família conhecida.', 'No known family.')) : null,
    h('p', { class: 'small muted' }, t(l('A família pesa no trabalho: filhos podem herdar o comando de um selo; casamento e filhos seguram vícios; separações e lutos derrubam o ânimo e a produtividade.', 'Family weighs on work: children may inherit a label; marriage and kids hold addictions back; break-ups and grief hurt mood and output.'))),
  );
}

function lifeBlock16(s: GameState, key: string): HTMLElement {
  const x = life16(s, key);
  const st = status16(s, key);
  const why: Record<string, L> = {
    addiction: l('Vício: rende menos no cargo (produtor falta a sessões, empresário negocia mal e perde clientes, líder sangra o caixa do selo, equipe −5).', 'Addiction: worse at the job (producers miss sessions, managers negotiate poorly and lose clients, label heads bleed cash, staff −5).'),
    rehab: l('Em reabilitação: fora do trabalho até voltar (produtor sem agenda, crítico sem resenhas, equipe −14).', 'In rehab: off work until back (producer unavailable, critic not reviewing, staff −14).'),
    ill: l('Doente: afastado(a); líderes idosos podem deixar o cargo.', 'Ill: on leave; older label heads may step down.'),
    dead: l('Falecido(a): o cargo fica vago — clientes livres, selo em sucessão.', 'Deceased: the post is vacant — clients freed, label in succession.'),
  };
  return h('div', null,
    h('ul', { class: 'dos13-list small' },
      h('li', { class: st === 'ok' ? '' : 'bad' }, ic('heart'), ` ${t(l('Situação', 'Status'))}: ${t(ST16[st])}`, x?.until && (st === 'rehab' || st === 'ill') ? ` · ${t(l('volta na semana', 'back in week'))} ${x.until}` : '', x?.died ? ` · † ${x.died}` : ''),
      x && x.dep > 5 ? h('li', { class: x.dep > 60 ? 'bad' : '' }, ic('skull'), ` ${t(l('Dependência', 'Dependency'))} `, bar(x.dep, 100, x.dep > 60 ? 'bad' : ''), ` ${Math.round(x.dep)}/100`) : null,
      why[st] ? h('li', { class: 'muted' }, t(why[st])) : null),
    timeline(s, key),
    x?.log.length ? section(t(l('Acontecimentos', 'Events')), h('ul', { class: 'memory small' }, x.log.map(([y, m, tx, tn]) => h('li', { class: tn > 0 ? 'good' : tn < 0 ? 'bad' : '' }, h('span', { class: 'muted' }, `${y}/${String(m + 1).padStart(2, '0')} · `), t(tx)))))
      : empty(l('Nada marcante na vida pessoal ainda (namoros, casamentos, filhos, vícios e saúde aparecem aqui).', 'Nothing notable in their personal life yet (dating, marriage, kids, addictions and health show here).')),
  );
}

function fameBlock16(s: GameState, key: string): HTMLElement {
  const rows: HTMLElement[] = [];
  for (const r of roles16(s, key)) {
    const id = idOf(r.key);
    if (r.role === 'manager' && mgrById[id]) { const ro = rosterOf(s, id); rows.push(kv(t(ROLE16.manager), `${ro.length} ${t(l('clientes', 'clients'))} · ${t(l('fama somada', 'total fame'))} ${Math.round(ro.reduce((a, b) => a + b.fame, 0))} · ${clientsOf16(s, id).length} ${t(l('no total', 'overall'))}`)); }
    if (r.role === 'producer' && prodById[id]) { const ws = works16(s, id); rows.push(kv(t(ROLE16.producer), `${'$'.repeat(prodById[id].tier)} · ${ws.length} ${t(l('obras', 'works'))} · ${ws.filter((w) => (w.peak ?? 999) <= 10).length} ${t(l('no top 10', 'top 10'))}`)); }
    if (r.role === 'ceo') { const L0 = leaders(s).L[id]; const lb = L0?.label ? s.labels[L0.label] : undefined; rows.push(kv(t(ROLE16.ceo), lb ? `${lb.name} · ${t(l('reputação', 'reputation'))} ${Math.round(lb.reputation)} · ${$(lb.revenueLastYear)}/${t(l('ano', 'yr'))}` : t(l('sem cargo', 'no post')))); }
    if (r.role === 'critic') { const c = criticByName(id); if (c) rows.push(kv(t(ROLE16.critic), `${c.outlet} · ${t(l('prestígio', 'prestige'))} ${c.prestige}`)); }
    if (r.role === 'staff') { const st = s.player.staff.find((x) => x.id === id); if (st) rows.push(kv(t(ROLE16.staff), `${st.role} · ${t(l('nível', 'skill'))} ${st.skill}`)); }
  }
  return h('div', null, rows.length ? h('div', null, ...rows) : empty(l('Pouco conhecido fora dos bastidores.', 'Little known outside the backstage.')),
    h('p', { class: 'small muted' }, t(l('Na indústria, fama é o peso do cargo: carteira de clientes, discos produzidos, selo comandado, veículo onde escreve.', 'In the industry, fame is the weight of the post: client roster, records produced, label run, outlet written for.'))));
}

function relBlock16(s: GameState, key: string): HTMLElement {
  const op = opinionOf(s, key);
  const led = p13(s).op[key];
  const L0 = key.startsWith('l:') ? leaders(s).L[idOf(key)] : undefined;
  const ties = Object.entries(lz14(s).r[key]?.t ?? {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8);
  const lt = L0 ? Object.entries(L0.rel).filter(([k]) => k !== 'player' && leaders(s).L[k]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6) : [];
  return h('div', null,
    h('p', null, t(l('O que pensa de você: ', 'What they think of you: ')), pill(signed(op), tone(op))),
    led?.w.length ? h('ul', { class: 'small' }, [...led.w].reverse().slice(0, 8).map(([y, m, d, w]) => h('li', { class: d >= 0 ? 'good' : 'bad' }, `${signed(d)} · ${m + 1}/${y} — `, t(w)))) : null,
    lt.length ? section(t(l('Outros líderes', 'Other label heads')), h('ul', { class: 'small' }, lt.map(([k, v]) => h('li', null, personLink16(s, `l:${k}`, leaders(s).L[k].name), ' ', pill(signed(v), tone(v)))))) : null,
    ties.length ? section(t(l('Amizades e rixas fora do trabalho', 'Friendships and feuds off the clock')), h('ul', { class: 'small' }, ties.map(([k, v]) => h('li', null, personLink16(s, canon16(s, k)), ' ', pill(signed(v), tone(v)))))) : null,
    !led?.w.length && !lt.length && !ties.length ? empty(l('Nada marcante entre vocês ainda. Almoços, jantares, presentes e a noite aproximam.', 'Nothing notable between you yet. Lunches, dinners, gifts and nights out bring you closer.')) : null,
  );
}

function beliefBlock16(s: GameState, key: string): HTMLElement {
  const P = per13(s, key);
  if (!P) return empty(l('—', '—'));
  const v = P.views;
  const c = compatOf(v, playerViews(s));
  const rel = relById[v.rel], pol = polById[v.pol];
  return h('div', { class: 'small' },
    h('p', null, h('b', null, t(l('Política: ', 'Politics: '))), t(pol?.name ?? l(v.pol)), v.pol === 'apolitical' ? '' : ` (${t(l('engajamento', 'engagement'))} ${Math.round(v.eng)})`),
    h('p', null, h('b', null, t(l('Religião: ', 'Religion: '))), t(rel?.name ?? l(v.rel)), v.rel === 'none' || v.rel === 'atheist' ? '' : ` (${t(l('devoção', 'devotion'))} ${Math.round(v.dev)})`, rel ? h('span', { class: 'muted' }, ` — ${t(rel.hint)}`) : null),
    key === 'player' ? null : h('p', null, h('b', null, t(l('Afinidade com você: ', 'Affinity with you: '))), pill(signed(c * 100), c >= 0.15 ? 'good' : c <= -0.15 ? 'bad' : '')),
    h('p', { class: 'muted' }, t(l('Visões parecidas aproximam; opostas criam atrito — nas negociações, na noite e nas suas declarações públicas.', 'Similar views bring people closer; opposed ones create friction — in negotiations, nights out and your public statements.'))),
  );
}

/** Resumo de carreira por cargo (anos), igual para todos. */
function careerLines(s: GameState, key: string): HTMLElement {
  const lines: HTMLElement[] = [];
  for (const r of roles16(s, key)) {
    const id = idOf(r.key);
    const m = mgrById[id], p = prodById[id];
    if (r.role === 'manager' && m) lines.push(h('li', null, pill(t(ROLE16.manager), 'trait'), ` ${cityName(m.city)} · ${m.from}–${mgrActive(s, m) ? t(l('hoje', 'now')) : Math.min(m.to, m.died ?? 9999, s.year)}`));
    if (r.role === 'producer' && p) lines.push(h('li', null, pill(t(ROLE16.producer), 'trait'), ` ${cityName(p.city)}${s.config.realNames ? ` · ${p.studio}` : ''} · ${p.from}–${s.year <= Math.min(p.to, p.died ?? 9999) ? t(l('hoje', 'now')) : Math.min(p.to, p.died ?? 9999)}`));
    if (r.role === 'ceo') { const L0 = leaders(s).L[id]; if (L0) lines.push(h('li', null, pill(t(ROLE16.ceo), 'trait'), ` ${t(BG_TXT[L0.bg])} · `, ...L0.jobs.slice(-3).flatMap((j, i) => [i ? ', ' : '', s.labels[j.lb] ? labelLink(s, j.lb) : h('span', null, j.n), ` ${j.from}–${j.to ?? t(l('hoje', 'now'))}`]))); }
    if (r.role === 'critic') { const c = criticByName(id); if (c) lines.push(h('li', null, pill(t(ROLE16.critic), 'trait'), ` ${c.outlet} · ${c.from}–${c.to}`)); }
    if (r.role === 'staff') { const st = s.player.staff.find((x) => x.id === id); if (st) lines.push(h('li', null, pill(t(ROLE16.staff), 'trait'), ` ${st.role} · ${t(l('desde', 'since'))} ${s.config.startYear + Math.floor(st.hiredWeek / 52)}`)); }
    if (r.role === 'owner') lines.push(h('li', null, pill(t(ROLE16.owner), 'gold'), ` ${s.config.companyName} · ${t(l('desde', 'since'))} ${s.config.startYear}`));
  }
  return lines.length ? h('ul', { class: 'dos13-list small' }, lines) : h('span');
}

// ---------------------------------------------------------------- abas de cargo

function clientsBlock(s: GameState, id: string): HTMLElement {
  const cs = clientsOf16(s, id);
  const cur = cs.filter((c) => c.to === undefined), past = cs.filter((c) => c.to !== undefined);
  const row = (c: (typeof cs)[number]) => h('li', null, actLink(s, c.act.id), ` · ${c.from}–${c.to ?? t(l('hoje', 'now'))}`, c.act.owner === 'player' ? h('span', null, ' ', pill(t(l('seu selo', 'your label')), 'good')) : null);
  return section(t(l('Clientes no jogo', 'Clients in the game')),
    cur.length ? h('div', null, h('small', { class: 'muted' }, t(l('Atuais', 'Current'))), h('ul', { class: 'small' }, cur.map(row))) : empty(l('Sem clientes agora.', 'No clients right now.')),
    past.length ? h('div', null, h('small', { class: 'muted' }, t(l('Passados', 'Past'))), h('ul', { class: 'small' }, past.map(row))) : null);
}

function workPopup(s: GameState, w: Work16): void {
  const r = w.relId ? s.releases[w.relId] : undefined;
  modal(w.title, h('div', { class: 'stack' },
    kv(t(l('Disco / faixa', 'Record / track')), w.title),
    kv(t(l('Artista', 'Artist')), w.actId ? actLink(s, w.actId) : w.artist),
    kv(t(l('Ano', 'Year')), String(w.year)),
    kv(t(l('Pico nas paradas', 'Chart peak')), w.peak ? `#${w.peak}` : r ? t(l('não entrou nas paradas', 'did not chart')) : w.real ? t(l('história real (fora das paradas do jogo)', 'real history (outside the game charts)')) : '—'),
    r?.owner ? kv(t(l('Selo', 'Label')), labelLink(s, r.owner)) : w.label && !w.you ? kv(t(l('Contratado por', 'Hired by')), w.label) : null,
    w.q !== undefined ? kv(t(l('Qualidade', 'Quality')), String(w.q)) : null,
    w.you ? h('p', null, pill(t(l('com você', 'with you')), 'good')) : null,
    r ? h('button', { class: 'btn small', onclick: () => openRelease(r.id) }, ic('disc'), ' ', t(l('Abrir lançamento', 'Open release'))) : null,
  ));
}

function worksBlock(s: GameState, id: string): HTMLElement {
  const ws = works16(s, id);
  const row = (w: Work16) => h('li', null, h('button', { class: 'link', title: t(l('Ver a obra', 'See the work')), onclick: () => workPopup(s, w) }, w.title), ` — ${w.artist} (${w.year})`, w.peak ? h('span', null, ' ', pill(`#${w.peak}`, w.peak <= 10 ? 'good' : '')) : null);
  const you = ws.filter((w) => w.you), oth = ws.filter((w) => !w.you);
  return h('div', null,
    section(t(l('Obras com você', 'Works with you')), you.length ? h('ul', { class: 'small' }, you.slice(0, 30).map(row)) : empty(l('Nada gravado com você ainda — contrate no estúdio ou no projeto musical.', 'Nothing recorded with you yet — hire them in the studio or music project.'))),
    section(t(l('Obras com outros', 'Works with others')), oth.length ? h('ul', { class: 'small' }, oth.slice(0, 40).map(row)) : empty(l('Nenhuma obra conhecida até este ano.', 'No known works up to this year.'))),
    h('p', { class: 'small muted' }, t(l('Clique numa obra para ver disco, artista, ano e pico nas paradas.', 'Click a work to see the record, artist, year and chart peak.'))));
}

function succBlock(s: GameState, lbId: string): HTMLElement | null {
  const xs = successions16(s, lbId);
  const jobs = Object.values(leaders(s).L).flatMap((x) => x.jobs.filter((j) => j.lb === lbId && j.from <= s.year).map((j) => ({ L0: x, ...j }))).sort((a, b) => b.from - a.from);
  if (!xs.length && !jobs.length) return null;
  return section(t(l('Sucessão no comando', 'Leadership succession')),
    jobs.length ? h('ul', { class: 'small' }, jobs.slice(0, 10).map((j) => h('li', null, personLink16(s, `l:${j.L0.id}`, j.L0.name, 'r_ceo'), ` · ${j.from}–${j.to ?? t(l('hoje', 'now'))}`, j.end ? h('span', { class: 'muted' }, ` · ${t(jobEndText(j.end))}`) : null, ` · ${t(STYLE_TXT[j.L0.style][0])}`))) : null,
    xs.length ? h('ul', { class: 'memory small' }, xs.map((x) => h('li', null, h('span', { class: 'muted' }, `${x.y} · `), x.out ? `${x.out} → ` : '', personLink16(s, `l:${x.inId}`, x.in), ' ', pill(t((HOW16[x.how as How16] ?? HOW16.outside)[0]), x.how === 'heir' ? 'gold' : 'trait'),
      h('span', { class: 'muted' }, ` ${t(x.why)} · ${t((HOW16[x.how as How16] ?? HOW16.outside)[1])} ${t(l('Estratégia', 'Strategy'))}: ${t(PLAYBOOKS[x.pb as keyof typeof PLAYBOOKS]?.name ?? l(x.pb))}.`)))) : null);
}

function staffBlock(s: GameState, id: string): HTMLElement {
  const st = s.player.staff.find((x) => x.id === id);
  if (!st) return empty(l('Não faz mais parte da equipe.', 'No longer on the staff.'));
  const adj = staffAdj13(s, st);
  return h('div', null,
    kv(t(l('Cargo', 'Role')), st.role), kv(t(l('Nível', 'Skill')), String(st.skill)),
    kv(t(l('Desempenho efetivo', 'Effective performance')), `${st.skill + adj.v} (${signed(adj.v)})`),
    adj.why.length ? h('p', { class: 'small muted' }, adj.why.map((x) => t(x)).join('; ')) : null,
    kv(t(l('Salário', 'Salary')), `${$(st.salary)}/${t(l('mês', 'mo'))}`),
    h('p', { class: 'small muted' }, t(l('Vida pessoal pesa no rendimento: vício −5, reabilitação ou doença −14 até voltar.', 'Personal life weighs on output: addiction −5, rehab or illness −14 until back.'))));
}

/** Abas de cargo de uma pessoa (sem a de artista, que é a própria página de artista). */
function roleTabs(s: GameState, key: string, redraw: () => void): Tab16[] {
  const out: Tab16[] = [];
  for (const { role, key: k } of roles16(s, key)) {
    const id = idOf(k);
    if (role === 'manager' && mgrById[id]) out.push({ id: 'r_manager', label: ROLE16.manager, icon: 'handshake', render: () => h('div', null, mgrProfile(s, id, redraw, false), clientsBlock(s, id)) });
    if (role === 'producer' && prodById[id]) out.push({ id: 'r_producer', label: ROLE16.producer, icon: 'cd', render: () => h('div', null, prodProfile(s, id, redraw, false), worksBlock(s, id)) });
    if (role === 'ceo') { const L0 = leaders(s).L[id]; if (L0) out.push({ id: 'r_ceo', label: l('CEO', 'CEO'), icon: 'bank', render: () => h('div', null, leaderBody(s, L0, false), L0.label ? succBlock(s, L0.label) : null) }); }
    if (role === 'owner') out.push({ id: 'r_owner', label: ROLE16.owner, icon: 'bank', render: () => playerLeaderBody(s, false) });
    if (role === 'staff') out.push({ id: 'r_staff', label: ROLE16.staff, icon: 'fans', render: () => staffBlock(s, id) });
    if (role === 'critic' && criticByName(id)) out.push({ id: 'r_critic', label: ROLE16.critic, icon: 'newspaper', render: () => criticBody(s, id, redraw, false) });
  }
  return out;
}

// ---------------------------------------------------------------- página única (quem não é artista)

function face(s: GameState, key: string, born: number, dead: boolean): HTMLElement {
  try {
    // retrato coerente com a ficha (sexo e pele da ficha unificada)
    const P = per13(s, key);
    const lid = key.startsWith('l:') ? idOf(key) : key; // líderes: mesmo retrato da ficha do selo
    const base = lookOf13(lid);
    const f = P?.sex === 'f';
    const look = P ? { ...base, skin: P.skin, sx: (f ? 'f' : 'm') as 'f' | 'm', beard: f ? false : base.beard, hair: f && base.hair < 7 ? [7, 8, 19, 20][base.face % 4] : base.hair } : undefined;
    const c = portraitCanvas({ id: lid, born, look }, s, 4);
    if (dead) c.classList.add('deceased');
    return c;
  } catch {
    return h('span', { class: 'portrait' }, (per13(s, key)?.name ?? '?').split(' ').map((x) => x[0]).slice(0, 2).join(''));
  }
}

function page16(s: GameState, key: string, redraw: () => void, tab?: string, onTab?: (id: string) => void): HTMLElement {
  const P = per13(s, key)!;
  const st = status16(s, key);
  const born = born16(s, key, P);
  const x = life16(s, key);
  const age = (x?.died ?? s.year) - born;
  const roles = roles16(s, key);
  const head = h('div', { class: 'pg-head' },
    h('div', { class: 'pg-portrait' }, face(s, key, born, st === 'dead')),
    h('div', { class: 'pg-head-main' },
      h('h3', null, P.name, ' ', st !== 'ok' ? pill(t(ST16[st]), 'bad') : null),
      h('div', { class: 'row wrap' }, ...roles.map((r) => pill(t(r.role === 'ceo' ? l('CEO', 'CEO') : ROLE16[r.role]), r.role === 'owner' ? 'gold' : 'trait'))),
      chips(stat('calendar', age, l('Idade', 'Age')), stat('globe', P.city ? cityName(P.city) : '—', l('Cidade', 'City')), stat('heart', t(civil16(s, key)), l('Estado civil', 'Marital status')),
        stat('fans', String((s.families[key]?.kids.length ?? 0)), l('Filhos', 'Children'))),
      careerLines(s, key)));
  const tabs: Tab16[] = [
    { id: 'perfil', label: l('Perfil', 'Profile'), icon: 'bulb', render: () => ficha13(s, key, redraw) },
    { id: 'fam', label: l('Família', 'Family'), icon: 'fans', render: () => familyBlock16(s, key) },
    { id: 'life', label: l('Vida pessoal', 'Personal life'), icon: 'heart', render: () => lifeBlock16(s, key) },
    { id: 'fame', label: l('Fama', 'Fame'), icon: 'star', render: () => fameBlock16(s, key) },
    { id: 'rel', label: l('Relações', 'Relationships'), icon: 'handshake', render: () => relBlock16(s, key) },
    { id: 'belief', label: l('Crenças', 'Beliefs'), icon: 'globe', render: () => beliefBlock16(s, key) },
    ...roleTabs(s, key, redraw),
  ];
  // a aba aberta sobrevive aos redesenhos (ações dentro da aba)
  return h('div', { class: 'ficha pg' }, head, pageTabs(tabs.map((x2) => ({ ...x2, render: () => { onTab?.(x2.id); return x2.render(); } })), tab));
}

/** Abre a página de qualquer pessoa pela chave ('p:', 'e:', 'pd:', 'l:', 's:', 'c:', 'm:', 'player'…). */
export function openPerson16(key: string, tab?: string): void {
  const s = store.game;
  if (!s) return;
  p16(s);
  const c = canon16(s, key);
  if (c === 'player' || c.startsWith('p:')) {
    const pid = c === 'player' ? playerPerson(s)?.id : c.slice(2);
    if (pid && s.persons[pid]) { openPersonPage(pid, tab); return; }
  }
  const P = per13(s, c);
  if (!P) return;
  const box = h('div');
  let cur = tab;
  const draw = () => box.replaceChildren(page16(s, c, draw, cur, (id) => (cur = id)));
  draw();
  modal(P.name, box, { wide: true, onClose: () => rerender() });
}
personRoute16.f = (key, tab) => { openPerson16(key, tab); return true; };

// ---------------------------------------------------------------- página de artista: cabeçalho e abas extras

PERSON_HEAD_EXTRAS.push((s, p) => {
  const key = p.isPlayer ? 'player' : `p:${p.id}`;
  const roles = roles16(s, key).filter((r) => r.role !== 'artist');
  const city = per13(s, `p:${p.id}`)?.city;
  return h('div', { class: 'row wrap small' },
    ...roles.map((r) => pill(t(r.role === 'ceo' ? l('CEO', 'CEO') : ROLE16[r.role]), r.role === 'owner' ? 'gold' : 'trait')),
    city ? h('span', { class: 'muted' }, `${cityName(city)} · `) : null,
    h('span', { class: 'muted' }, t(civil16Person(s, p))));
});
function civil16Person(s: GameState, p: Person): L {
  const F0 = s.families[p.id];
  const rc = lz14(s).r[`p:${p.id}`];
  if (kinOf15(s, p.id).some((k) => k.rel === 'spouse')) return l('casado(a)', 'married');
  if (F0?.partner && !F0.separated) return rc?.mar ? l('casado(a)', 'married') : l('em relacionamento', 'in a relationship');
  return F0?.separated ? l('separado(a)', 'separated') : l('solteiro(a)', 'single');
}

PERSON_TABS.push((s, p) => ({
  id: 'fam16', label: l('Família', 'Family'), icon: 'fans',
  render: () => {
    const rk = realKin16(s, `p:${p.id}`);
    return h('div', null, familyBlock15(s, p),
      rk.length ? section(t(l('Parentes na indústria', 'Relatives in the industry')), h('ul', { class: 'small' }, rk.map((r) => h('li', null, r.key ? personLink16(s, r.key, r.name) : r.name, ` · ${t(KIN16_REL[r.rel] ?? l(r.rel))}`)))) : null);
  },
}));
PERSON_TABS.push((s, p) => ({ id: 'belief16', label: l('Crenças', 'Beliefs'), icon: 'globe', render: () => beliefBlock16(s, p.isPlayer ? 'player' : `p:${p.id}`) }));
PERSON_TABS.push((s, p, closeAll) => {
  const ts = roleTabs(s, p.isPlayer ? 'player' : `p:${p.id}`, () => { closeAll(); openPersonPage(p.id); });
  return ts[0] ?? null;
});
PERSON_TABS.push((s, p, closeAll) => roleTabs(s, p.isPlayer ? 'player' : `p:${p.id}`, () => { closeAll(); openPersonPage(p.id); })[1] ?? null);
PERSON_TABS.push((s, p, closeAll) => roleTabs(s, p.isPlayer ? 'player' : `p:${p.id}`, () => { closeAll(); openPersonPage(p.id); })[2] ?? null);

// ---------------------------------------------------------------- artista: empresário e produtor no topo

/** Produtor mais frequente do ato (faixas gravadas no jogo; obras históricas com nomes reais). */
function mainProducer16(s: GameState, a: Act): { real?: string; name: string } | null {
  const cnt = new Map<string, number>();
  for (const so of Object.values(s.songs)) if (so.actId === a.id && so.producerId && !s.persons[so.producerId]) cnt.set(so.producerId, (cnt.get(so.producerId) ?? 0) + 1);
  const top = [...cnt.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
  if (top) { const real = top.startsWith('rp_') ? top.slice(3) : undefined; return { real, name: real && prodById[real] ? prodName(s, prodById[real]) : top }; }
  for (const r of Object.values(s.releases)) if (r.actId === a.id) { const ps = producersOfRelease16(s, r.id); if (ps[0]) return { real: ps[0].real, name: ps[0].name }; }
  return null;
}

ACT_HEAD_EXTRAS.push((s, a) => {
  p16(s);
  const m = repOf(s, a.id);
  const pr = mainProducer16(s, a);
  return h('span', { class: 'row wrap small' },
    m ? h('button', { class: 'btn small ghost', title: t(l('Quem cuida da carreira: negocia por ele nas propostas.', 'Who runs their career: negotiates for them in offers.')), onclick: () => openPerson16(mgrKey(m.id), 'r_manager') }, ic('handshake'), ` ${t(l('Empresário', 'Manager'))}: ${mgrName(s, m)}`)
      : h('span', { class: 'muted' }, ic('handshake'), ` ${t(l('Sem empresário', 'No manager'))}`),
    pr ? (pr.real ? h('button', { class: 'btn small ghost', onclick: () => openPerson16(prodKey(pr.real!), 'r_producer') }, ic('cd'), ` ${t(l('Produtor', 'Producer'))}: ${pr.name}`) : h('span', { class: 'muted' }, ic('cd'), ` ${t(l('Produtor', 'Producer'))}: ${pr.name}`)) : null);
});

RELEASE_EXTRAS.push((s, r) => {
  const ps = producersOfRelease16(s, r.id);
  if (!ps.length) return null;
  return h('p', { class: 'small' }, ic('cd'), ` ${t(l('Produção', 'Producer'))}: `, ...ps.flatMap((x, i) => [i ? ', ' : '', x.real ? personLink16(s, prodKey(x.real), x.name, 'r_producer') : h('span', null, x.name)]));
});

// ---------------------------------------------------------------- selo: histórico de sucessão

registerPageTab('label', {
  id: 'succ16', label: l('Sucessão', 'Succession'), icon: 'bank', order: 9,
  when: (s, id) => !!s.labels[id] && Object.values(leaders(s)?.L ?? {}).some((x) => x.jobs.some((j) => j.lb === id)),
  render: (s, id) => succBlock(s, id) ?? h('div'),
});

// Atalho útil para outras telas: chave canônica → nome
export const nameOf16 = (s: GameState, key: string): string => per13(s, canon16(s, key))?.name ?? key;

// busca (Ctrl+K): gente da indústria que já existe no ano atual
searchRoute16.f = (s, q) => {
  if (q.length < 2) return [];
  const out: { label: string; hint: string; key: string }[] = [];
  const add = (key: string, name: string, role: L) => { if (name.toLowerCase().includes(q) && !canon16(s, key).startsWith('p:')) out.push({ label: name, hint: t(role), key }); };
  for (const m of [...REAL_MGRS, ...genMgrs16(s)]) if (s.year >= m.from) add(mgrKey(m.id), mgrName(s, m), ROLE16.manager);
  for (const p of REAL_PRODS) if (s.year >= p.from) add(prodKey(p.id), prodName(s, p), ROLE16.producer);
  for (const x of Object.values(leaders(s)?.L ?? {})) if (x.st === 'active') add(`l:${x.id}`, x.name, l('Líder de gravadora', 'Label head'));
  return out.slice(0, 30);
};
