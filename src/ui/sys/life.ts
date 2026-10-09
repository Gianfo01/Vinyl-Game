// Área "Você" (rodada 5): o personagem do jogador. Perfil com atributos, vida amorosa e família,
// carreira musical (praticar, compor, tocar num bar, solo, formar/entrar/sair de banda), lazer e
// saúde, patrimônio (casa, retirada, sucessão) e diário pessoal. Cada ação gasta tempo livre do mês.

import './life.css';
import { GENRES, familyOf, l, type L } from '../../data/world';
import { traitAffinity } from '../../data/people';
import { t } from '../../i18n/strings';
import {
  ENERGY_PER_MONTH, HOBBIES, MENTOR_NAMES, maxEnergy, mentorAct, type MentorKind, KID_EDU, PARTNER_TRAITS, WEDDINGS, adopt, backgroundById, breakUp, charity, energyLeft, familyTime, goOnDate, gym, hobby,
  industryParty, joinBand, joinChance, joinableActs, launchKidCareer, learnNewInstrument, leaveBand, life, marry, meetPeople, ownerAgeNow, playBar, playerAct,
  playerPerson, practice, propose, setKidEdu, startDating, startProject, switchMainInstrument, therapy, tryForBaby, writeAlone, writeMemoir,
  type KidEdu, type WeddingKind,
} from '../../sim/sys/life';
import { ROLE_NAMES, type Role } from '../../sim/sys/talent';
import { ownerOf } from '../../sim/sys/people/owner';
import type { GameState } from '../../sim/types';
import { money, playerActs, rngOf } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { openActPage, openPersonPage, personCard } from '../pages';
import { portraitCanvas } from '../pixel/avatar';
import { personaTab } from './persona';
import { skillsTab } from './skills';
import { decisionsTab } from './intrigue';
import { transferSection } from './capital';
import { persona, skills } from '../../sim/sys/persona';
import { vicesTab } from './vices';
import { registerArea, registerCutscene } from '../registry';
import { chips, ic, meter, stat, tabs } from '../vis';
import { ownerTab } from './people/area';
import { personalAgendaTab, possessionsTab } from './goods8';

const isL = (x: unknown): x is L => !!x && typeof x === 'object' && 'pt' in (x as object) && 'en' in (x as object);

/** Executa uma ação: erro vira aviso; texto de resultado vira aviso bom. */
function run(res: unknown, ok?: L): void {
  if (res === null || res === undefined) { if (ok) toast(t(ok), 'good'); }
  else if (isL(res)) toast(t(res), 'bad');
  else if (typeof res === 'object' && res && 'text' in res) toast(t((res as { text: L }).text), (res as { ok?: boolean }).ok === false ? 'info' : 'good');
  rerender();
}

const cost = (n: number) => h('span', { class: 'lf-cost', title: t(l('Tempo livre gasto', 'Free time used')) }, '⏱'.repeat(n));

function btn(label: L, n: number, onclick: () => void, opts: { primary?: boolean; disabled?: boolean; title?: L } = {}): HTMLElement {
  return h('button', { class: `btn small ${opts.primary ? 'primary' : ''}`, disabled: opts.disabled, title: opts.title ? t(opts.title) : undefined, onclick }, t(label), ' ', n ? cost(n) : null);
}

function energyBar(s: GameState): HTMLElement {
  const left = energyLeft(s);
  return h('div', { class: 'lf-energy', 'aria-label': t(l('Tempo livre este mês', 'Free time this month')) },
    h('span', null, t(l('Tempo livre este mês', 'Free time this month'))),
    h('span', { class: 'lf-dots' }, Array.from({ length: maxEnergy(s) }, (_, i) => h('i', { class: i < left ? 'on' : '' }))),
    h('small', { class: 'muted' }, t(maxEnergy(s) < ENERGY_PER_MONTH ? l('renova todo mês (a banda ocupa uma unidade)', 'refills every month (the band takes one unit)') : l('renova todo mês', 'refills every month'))));
}

// ------------------------------------------------------------------ perfil

function profileTab(s: GameState): HTMLElement {
  const o = ownerOf(s);
  const p = playerPerson(s);
  const L0 = life(s);
  const bg = backgroundById[L0.background];
  const act = playerAct(s);
  return h('div', { class: 'lf-profile' },
    section(`${o.name} · ${ownerAgeNow(s)} ${t(l('anos', 'years'))}`,
      h('div', { class: 'lf-head' },
        p ? h('div', { class: 'lf-portrait' }, portraitCanvas(p, s, 4)) : null,
        h('div', null,
          h('p', null, pill(t(bg.name)), ' ', t(bg.desc)),
          chips(
            meter('star', l('Fama pessoal', 'Personal fame'), L0.fame),
            meter('stress', l('Estresse', 'Stress'), o.stress, 100, true),
            meter('heart', l('Saúde', 'Health'), o.health),
            stat('coin', $(o.wealth), l('Patrimônio pessoal', 'Personal wealth')),
          ),
          energyBar(s),
          o.wealth < money(s, 2000) ? h('p', { class: 'small warn' }, t(l('Seu dinheiro pessoal está acabando: defina uma retirada mensal na aba Patrimônio ou toque em bares.', 'Your personal money is running low: set a monthly draw in the Wealth tab or play bar gigs.'))) : null,
          h('p', null, act ? h('span', null, ic('guitar'), ' ', t(l('Toca em ', 'Plays in ')), actLink(s, act.id)) : h('span', { class: 'muted' }, t(l('Sem projeto musical no momento.', 'No musical project right now.')))),
          L0.partner ? h('p', null, ic('heart'), ' ', t(L0.partner.stage === 'married' ? l('Casado(a) com ', 'Married to ') : L0.partner.stage === 'engaged' ? l('Noivo(a) de ', 'Engaged to ') : l('Namorando ', 'Dating ')), h('b', null, L0.partner.name)) : null,
          o.kids.length ? h('p', null, ic('fans'), ' ', t(l('Filhos: ', 'Children: ')), o.kids.map((k) => k.name.split(' ')[0]).join(', ')) : null,
        ),
        p ? h('div', null, personCard(s, p), h('button', { class: 'btn small ghost', onclick: () => openPersonPage(p.id) }, t(l('Ver todos os atributos', 'See every attribute')))) : null,
      ),
    ),
    section(t(l('Como você joga com o personagem', 'How the character plays')),
      h('ul', { class: 'small muted' },
        h('li', null, t(l('Cada mês você tem 4 unidades de tempo livre (⏱). Use em romance, família, música ou lazer.', 'Each month you get 4 units of free time (⏱). Spend them on romance, family, music or leisure.'))),
        h('li', null, t(l('Dinheiro pessoal é o seu patrimônio, separado do caixa da empresa (retire ou invista na aba Patrimônio).', 'Personal money is your wealth, separate from the company cash (withdraw or invest in the Wealth tab).'))),
        h('li', null, t(l('Seus atributos de dono (ouvido, negociação, carisma, gestão) dão bônus reais ao selo; seus atributos musicais contam quando você toca numa banda.', 'Your owner attributes (ear, negotiation, charisma, management) give real bonuses to the label; your musical attributes count when you play in a band.'))),
        h('li', null, t(l('Estresse alto derruba a saúde; família, hobbies, terapia e férias aliviam.', 'High stress hurts health; family, hobbies, therapy and holidays relieve it.'))),
      )),
  );
}

// ------------------------------------------------------------------ amor e família

function loveTab(s: GameState): HTMLElement {
  const L0 = life(s);
  const o = ownerOf(s);
  const r = () => rngOf(s);
  const pt = L0.partner;
  let wedding: WeddingKind = 'party';
  const partnerBox = pt ? section(t(l('Relacionamento', 'Relationship')),
    h('div', { class: 'row wrap' },
      h('b', null, pt.name), pill(`${s.year - pt.born} ${t(l('anos', 'yrs'))}`), pill(t(pt.job)), pill(t(PARTNER_TRAITS.find((x) => x.id === pt.trait)?.name ?? l('', ''))),
      pill(t(pt.stage === 'married' ? l('casados', 'married') : pt.stage === 'engaged' ? l('noivos', 'engaged') : l('namorando', 'dating')), 'good'),
      pt.personId ? h('button', { class: 'link', onclick: () => openPersonPage(pt.personId!) }, t(l('ver ficha', 'see card'))) : null),
    meter('heart', l('Afinidade', 'Affinity'), pt.affinity),
    h('p', { class: 'small muted' }, t(l('Cada pessoa gosta de um tipo de programa: quem é caseiro prefere ficar em casa; quem adora holofotes, shows; quem é pé no chão, um bom jantar.', 'Each person likes a kind of date: homebodies prefer staying in; spotlight lovers, shows; down-to-earth people, a good dinner.'))),
    h('div', { class: 'row wrap' },
      btn(l('Jantar fora ($150)', 'Dinner out ($150)'), 1, () => run(goOnDate(s, r(), 'dinner'), l('Noite agradável.', 'Lovely evening.'))),
      btn(l('Levar a um show ($250)', 'Take to a show ($250)'), 1, () => run(goOnDate(s, r(), 'show'), l('Noite agradável.', 'Lovely evening.'))),
      btn(l('Noite em casa', 'Night in'), 1, () => run(goOnDate(s, r(), 'home'), l('Noite agradável.', 'Lovely evening.'))),
      btn(l('Viagem a dois ($2.500)', 'Trip together ($2,500)'), 2, () => run(goOnDate(s, r(), 'trip'), l('Viagem inesquecível.', 'Unforgettable trip.'))),
    ),
    h('div', { class: 'row wrap' },
      pt.stage === 'dating' ? btn(l('Pedir em casamento (anel $1.500)', 'Propose (ring $1,500)'), 1, () => run(propose(s, r())), { primary: true }) : null,
      pt.stage === 'engaged' ? h('span', { class: 'row' }, select<WeddingKind>(wedding, (Object.keys(WEDDINGS) as WeddingKind[]).map((k) => ({ value: k, label: `${t(WEDDINGS[k].name)} · ${$(money(s, WEDDINGS[k].cost))}` })), (v) => (wedding = v)), btn(l('Casar', 'Get married'), 2, () => run(marry(s, wedding)), { primary: true })) : null,
      btn(pt.stage === 'married' ? l('Pedir o divórcio (partilha de 35% do patrimônio)', 'File for divorce (35% asset split)') : l('Terminar', 'Break up'), 0, () => { if (confirm(t(l('Tem certeza?', 'Are you sure?')))) run(breakUp(s)); }),
    ),
  ) : section(t(l('Vida amorosa', 'Love life')),
    h('p', { class: 'muted' }, t(l('Solteiro(a). Saia para conhecer gente nova (ou vá a uma festa da indústria, na aba Lazer, onde dá para conhecer artistas).', 'Single. Go out and meet new people (or go to an industry party, in the Leisure tab, where you can meet artists).'))),
    btn(l('Sair para conhecer pessoas ($120)', 'Go out to meet people ($120)'), 1, () => run(meetPeople(s, r()))),
    L0.candidates.length ? h('div', { class: 'cards lf-cands' }, L0.candidates.map((c) => h('article', { class: 'tile' },
      h('div', { class: 'tile-body' },
        h('b', null, c.name), h('small', null, `${s.year - c.born} ${t(l('anos', 'yrs'))} · ${t(c.job)} · ${t(PARTNER_TRAITS.find((x) => x.id === c.trait)?.name ?? l('', ''))}`),
        meter('heart', l('Química', 'Chemistry'), c.chemistry),
        btn(l('Chamar para sair', 'Ask out'), 0, () => run(startDating(s, c.id), l('Vocês estão namorando!', 'You are dating!')), { primary: true }))))) : null,
  );
  const kids = o.kids.map((k, i) => {
    const kx = L0.kidsX[i] ?? { edu: 'public' as KidEdu, bond: 50 };
    const age = s.year - k.born;
    let g0 = GENRES.find((x) => x.born <= s.year && x.id === 'pop')?.id ?? GENRES.filter((x) => x.born <= s.year)[0]?.id ?? 'rnr';
    return h('article', { class: 'tile' }, h('div', { class: 'tile-body' },
      h('b', null, k.name, kx.adopted ? pill(t(l('adotado(a)', 'adopted'))) : null), h('small', null, `${age} ${t(l('anos', 'yrs'))} · ${t(l('aptidão musical', 'musical aptitude'))} ${Math.round(k.aptitude)}`),
      meter('heart', l('Vínculo', 'Bond'), kx.bond),
      age < 18 ? h('label', null, t(l('Educação', 'Education')), ' ', select<KidEdu>(kx.edu, (Object.keys(KID_EDU) as KidEdu[]).map((e) => ({ value: e, label: `${t(KID_EDU[e].name)}${KID_EDU[e].monthly ? ` · ${$(money(s, KID_EDU[e].monthly))}/${t(l('mês', 'mo'))}` : ''}` })), (v) => run(setKidEdu(s, i, v)))) : null,
      kx.actId && s.acts[kx.actId] ? h('p', null, t(l('Carreira: ', 'Career: ')), actLink(s, kx.actId))
        : age >= 16 ? h('div', { class: 'row wrap' }, select(g0, GENRES.filter((x) => x.born <= s.year).sort((a, b) => t(a.name).localeCompare(t(b.name))).map((x) => ({ value: x.id, label: t(x.name) })), (v) => (g0 = v)),
          btn(l('Lançar carreira pelo selo', 'Launch a career on the label'), 1, () => { const res = launchKidCareer(s, rngOf(s), i, g0); if (isL(res)) run(res); else { toast(t(l('Estreia marcada!', 'Debut set!')), 'good'); openActPage(res.id); rerender(); } })) : null,
    ));
  });
  return h('div', null,
    energyBar(s),
    partnerBox,
    section(t(l('Família', 'Family')),
      h('div', { class: 'row wrap' },
        btn(l('Tempo com a família', 'Family time'), 1, () => run(familyTime(s), l('Momento em família.', 'Family moment.')), { disabled: !o.kids.length && !pt }),
        pt ? btn(l('Tentar ter um filho', 'Try for a baby'), 1, () => run(tryForBaby(s, rngOf(s)))) : null,
        btn(l('Adotar ($6.000)', 'Adopt ($6,000)'), 2, () => run(adopt(s, rngOf(s)))),
      ),
      kids.length ? h('div', { class: 'cards' }, kids) : h('p', { class: 'muted small' }, t(l('Sem filhos.', 'No children.'))),
      h('p', { class: 'muted small' }, t(l('Filhos com 18+ podem ser herdeiros (aba Patrimônio). Com 16+, podem estrear como artistas. Vínculo baixo e eles não querem saber do seu selo.', 'Children 18+ can be heirs (Wealth tab). At 16+, they can debut as artists. With a low bond they want nothing to do with your label.'))),
    ),
  );
}

// ------------------------------------------------------------------ carreira musical

const ROLES: Role[] = ['vocal', 'guitar', 'bass', 'drums', 'keys', 'horns', 'strings', 'dj', 'producer', 'mc'];

function musicTab(s: GameState): HTMLElement {
  const p = playerPerson(s);
  if (!p) return h('p', null, '—');
  const act = playerAct(s);
  const r = () => rngOf(s);
  let newRole: Role = ROLES.find((x) => x !== p.role) ?? 'guitar';
  const me = playerPerson(s);
  const fav = persona(s).favGenre;
  const avail = GENRES.filter((x) => x.born <= s.year);
  // sugestão: o gênero do coração, ou o que mais combina com o seu temperamento
  const byTemper = me ? [...avail].sort((x, y) => traitAffinity(me.traits, familyOf(y.id)) - traitAffinity(me.traits, familyOf(x.id)) || (s.genrePop[y.id] ?? 0) - (s.genrePop[x.id] ?? 0))[0]?.id : undefined;
  let genre = (fav && avail.some((x) => x.id === fav) ? fav : byTemper) ?? avail.find((x) => x.id === 'rnr')?.id ?? avail[0]?.id ?? 'rnr';
  let name = '';
  const genres = GENRES.filter((x) => x.born <= s.year).sort((a, b) => t(a.name).localeCompare(t(b.name)));
  const joinable = act ? [] : joinableActs(s);
  return h('div', null,
    energyBar(s),
    section(t(l('Você como músico(a)', 'You as a musician')),
      h('div', { class: 'row wrap' }, personCard(s, p, { compact: true }),
        h('div', null,
          h('p', null, t(l('Instrumento principal: ', 'Main instrument: ')), pill(t(ROLE_NAMES[p.role]))),
          h('div', { class: 'row wrap' },
            btn(l('Praticar', 'Practice'), 1, () => run(practice(s), l('Treino feito.', 'Practice done.'))),
            btn(l('Compor sozinho(a)', 'Write alone'), 1, () => run(writeAlone(s, r()), l('Música nova no caderno.', 'New song in the notebook.'))),
            btn(l('Tocar num bar', 'Play a bar gig'), 1, () => run(playBar(s, r()))),
          ),
          h('div', { class: 'row wrap' },
            select<Role>(newRole, ROLES.filter((x) => x !== p.role).map((x) => ({ value: x, label: t(ROLE_NAMES[x]) })), (v) => (newRole = v)),
            btn(l('Aulas desse instrumento ($250)', 'Lessons on it ($250)'), 1, () => run(learnNewInstrument(s, newRole), l('Aula feita.', 'Lesson done.'))),
            btn(l('Tornar principal', 'Make it main'), 0, () => run(switchMainInstrument(s, newRole), l('Instrumento principal trocado.', 'Main instrument changed.'))),
          ),
        ),
      ),
    ),
    act ? section(t(l('Seu projeto: {a}', 'Your project: {a}'), { a: act.name }),
      h('div', { class: 'row wrap' }, h('button', { class: 'btn small', onclick: () => openActPage(act.id) }, ic('guitar'), ' ', t(l('Página do artista', 'Artist page'))),
        btn(l('Sair da banda', 'Leave the band'), 0, () => { if (confirm(t(l('Sair de {a}?', 'Leave {a}?'), { a: act.name }))) run(leaveBand(s), l('Você saiu.', 'You left.')); })),
      h('p', { class: 'small muted' }, t(l('A agenda, gravações e shows do projeto ficam na área Artistas, como qualquer ato do selo. Seus atributos contam na performance.', 'The project\'s agenda, recordings and shows live in the Artists area like any act on the label. Your attributes count in performance.'))),
    ) : section(t(l('Começar um projeto', 'Start a project')),
      h('div', { class: 'row wrap' },
        h('label', null, t(l('Gênero', 'Genre')), ' ', select(genre, genres.map((x) => ({ value: x.id, label: t(x.name) })), (v) => (genre = v))),
        h('label', null, t(l('Nome', 'Name')), ' ', h('input', { type: 'text', placeholder: t(l('(seu nome / gerado)', '(your name / generated)')), oninput: (e: Event) => (name = (e.target as HTMLInputElement).value) })),
      ),
      h('div', { class: 'row wrap' },
        btn(l('Carreira solo', 'Solo career'), 1, () => { const res = startProject(s, r(), 'solo', genre, name); if (isL(res)) run(res); else { toast(t(l('Carreira solo lançada!', 'Solo career launched!')), 'good'); rerender(); } }, { primary: true }),
        btn(l('Formar banda (audições $800)', 'Form a band (auditions $800)'), 2, () => { const res = startProject(s, r(), 'band', genre, name); if (isL(res)) run(res); else { toast(t(l('Banda formada!', 'Band formed!')), 'good'); openActPage(res.id, 'members'); rerender(); } }),
      ),
      h('h4', null, t(l('Entrar numa banda', 'Join a band'))),
      joinable.length ? h('table', { class: 'tbl compact' }, h('tbody', null, joinable.map((a) => h('tr', null,
        h('td', null, actLink(s, a.id)), h('td', { class: 'muted small' }, a.owner === 'player' ? t(l('do seu selo', 'on your label')) : t(l('independente (assina com você)', 'unsigned (signs with you)'))),
        h('td', null, `${Math.round(joinChance(s, a) * 100)}%`),
        h('td', null, btn(l('Pedir para entrar', 'Ask to join'), 1, () => run(joinBand(s, r(), a.id)))))))) : h('p', { class: 'muted small' }, t(l('Nenhuma banda aberta: contrate ou descubra bandas independentes (radar) para ter opções.', 'No band open: sign or discover unsigned bands (radar) to have options.'))),
    ),
    mentorSection(s),
  );
}

function mentorSection(s: GameState): HTMLElement | null {
  const me = playerPerson(s);
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a) => a && !a.members.includes(me?.id ?? '') && a.status !== 'retired' && a.status !== 'split');
  if (!acts.length) return null;
  const kinds: MentorKind[] = ['talk', 'studio', 'stage'];
  return section(t(l('Perto dos seus artistas', 'Close to your artists')),
    h('p', { class: 'small muted' }, t(l('Conversa sobe moral e confiança (seu carisma pesa); estúdio usa seu ouvido e sua produção na próxima gravação; ensaio deixa o show afiado. Uma vez por mês por ato.', 'Talks raise morale and trust (your charisma counts); studio uses your ear and production on the next recording; rehearsal sharpens the show. Once a month per act.'))),
    h('table', { class: 'tbl compact' }, h('tbody', null, acts.map((a) => h('tr', null,
      h('td', null, actLink(s, a.id)),
      h('td', null, h('div', { class: 'row wrap' }, kinds.map((k) => btn(MENTOR_NAMES[k], 1, () => run(mentorAct(s, a.id, k), l('Feito.', 'Done.')))))))))));
}

// ------------------------------------------------------------------ lazer

function leisureTab(s: GameState): HTMLElement {
  const L0 = life(s);
  return h('div', null,
    energyBar(s),
    section(t(l('Saúde e cabeça', 'Health and mind')), h('div', { class: 'row wrap' },
      btn(l('Academia ($60)', 'Gym ($60)'), 1, () => run(gym(s), l('Treino feito.', 'Workout done.'))),
      btn(l('Terapia ($300)', 'Therapy ($300)'), 1, () => run(therapy(s), l('Sessão feita. Cabeça mais leve.', 'Session done. Lighter mind.'))),
    )),
    section(t(l('Vida social', 'Social life')), h('div', { class: 'row wrap' },
      btn(l('Festa da indústria ($400)', 'Industry party ($400)'), 1, () => run(industryParty(s, rngOf(s)))),
      btn(l('Doação filantrópica ($5.000)', 'Charity donation ($5,000)'), 1, () => run(charity(s), l('Obrigado!', 'Thank you!'))),
      btn(l('Escrever as memórias', 'Write your memoir'), 3, () => run(writeMemoir(s, rngOf(s))), { disabled: L0.memoir }),
    ), L0.candidates.some((c) => c.personId) ? h('p', { class: 'small' }, t(l('Você conheceu gente interessante na festa — veja na aba Amor e família.', 'You met interesting people at the party — see the Love and family tab.'))) : null),
    section(t(l('Hobbies', 'Hobbies')), h('div', { class: 'cards' }, HOBBIES.map((hb) => h('article', { class: 'tile' }, h('div', { class: 'tile-body' },
      h('b', null, t(hb.name), (L0.hobbies[hb.id] ?? 0) ? pill(`${t(l('nível', 'level'))} ${L0.hobbies[hb.id]}`, 'good') : null),
      h('small', null, t(hb.desc)),
      btn(fmt(l('Dedicar tempo ({c})', 'Spend time ({c})'), $(money(s, hb.cost))), 1, () => run(hobby(s, hb.id), l('Bom momento.', 'Good time.')))))))),
  );
}

function fmt(x: L, c: string): L {
  return { pt: x.pt.replace('{c}', c), en: x.en.replace('{c}', c) };
}

function diaryTab(s: GameState): HTMLElement {
  const L0 = life(s);
  return section(t(l('Diário pessoal', 'Personal diary')),
    chips(stat('heart', L0.stats.dates, l('Encontros', 'Dates')), stat('mic', L0.stats.gigs, l('Shows em bares', 'Bar gigs')), stat('pen', L0.stats.songs, l('Sessões de composição', 'Writing sessions')), stat('fans', L0.stats.parties, l('Festas', 'Parties'))),
    L0.log.length ? h('ul', { class: 'memory' }, L0.log.map((e) => h('li', { class: e.tone }, h('span', { class: 'muted' }, `${e.year} · `), t(e.text)))) : h('p', { class: 'muted' }, t(l('Nada registrado ainda.', 'Nothing recorded yet.'))));
}

function youArea(s: GameState): HTMLElement {
  return h('div', { class: 'hub life' }, tabs('life', [
    { id: 'me', label: t(l('Perfil', 'Profile')), icon: 'star', render: () => profileTab(s) },
    { id: 'persona', label: t(l('Personalidade', 'Personality')), icon: 'sparkle', badge: persona(s).copingPrompt ? 1 : undefined, render: () => personaTab(s) },
    { id: 'skills', label: t(l('Habilidades', 'Abilities')), icon: 'star', badge: skills(s).points || undefined, render: () => skillsTab(s) },
    { id: 'decisions', label: t(l('Decisões', 'Decisions')), icon: 'flag', render: () => decisionsTab(s) },
    { id: 'love', label: t(l('Amor e família', 'Love and family')), icon: 'heart', render: () => loveTab(s) },
    { id: 'music', label: t(l('Carreira musical', 'Music career')), icon: 'guitar', render: () => musicTab(s) },
    { id: 'leisure', label: t(l('Lazer e saúde', 'Leisure and health')), icon: 'sparkle', render: () => leisureTab(s) },
    { id: 'agenda8', label: t(l('Agenda pessoal', 'Personal agenda')), icon: 'calendar', render: () => personalAgendaTab(s) },
    { id: 'vices', label: t(l('Vida intensa', 'Fast life')), icon: 'fire', render: () => vicesTab(s) },
    { id: 'wealth', label: t(l('Patrimônio', 'Wealth')), icon: 'house', render: () => h('div', null, transferSection(s), ownerTab(s)) },
    { id: 'goods8', label: t(l('Bens e investimentos', 'Belongings and investments')), icon: 'money', render: () => possessionsTab(s) },
    { id: 'diary', label: t(l('Diário', 'Diary')), icon: 'newspaper', render: () => diaryTab(s) },
  ], rerender));
}

registerArea({ id: 'you', label: l('Você', 'You'), icon: 'star', key: 'v', render: youArea });

registerCutscene('life', (s, cs, close) => {
  const p = playerPerson(s);
  return h('div', { class: 'lf-scene' },
    p ? portraitCanvas(p, s, 5) : null,
    h('p', { class: 'lf-scene-text' }, t(cs.data.text as L)),
    h('button', { class: 'btn primary', onclick: close }, t(l('Continuar', 'Continue'))),
  );
});
