// Estúdio e criação avançada: sessão com produtor (assinatura sonora), samples, covers, remixes,
// versões em outro idioma, tributos, planner de rollout, aniversários e a era sintética.

import { APPROACHES, STUDIO_TIERS } from '../../data/rules';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { PRODUCERS, SIGNATURES, availableProducers, makeCover, makeRemix, makeTranslation, planTribute, producerFit, requestSample, sessionCost, sessionDays, startSession } from '../../sim/studio';
import { anniversaryCandidates, canPresave, canVideo, cancelRollout, planRollout, scheduleAnniversary } from '../../sim/rollout';
import { aiVoiceReady, aiVoiceSongs, deceasedLegends, hologramCost, hologramReady, negotiateImageRights, posthumousRelease, startHologramShow } from '../../sim/neural';
import { tributeCandidates } from '../../sim/dynasty';
import { setSplits } from '../../sim/finance';
import { unrecorded, unreleasedRecorded } from '../../sim/production';
import type { GameState } from '../../sim/types';
import { money, playerActs, rngOf } from '../../sim/util';
import { $, actLink, genreName, logo, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { store } from '../store';
import { chips, ic, portrait, stat, tabs, tile } from '../vis';
import { repertoireTab } from './repertoire';
import { mergeTabs } from '../registry';

const say = (res: L | null | object, ok: L) => {
  const err = res && typeof res === 'object' && 'pt' in res ? (res as L) : null;
  toast(t(err ?? ok), err ? 'bad' : 'good');
};

function actPicker(s: GameState): HTMLElement | null {
  const ids = playerActs(s);
  if (!ids.length) return null;
  if (!store.selectedAct || !ids.includes(store.selectedAct)) store.selectedAct = ids[0];
  return h('div', { class: 'act-picker' }, ids.map((id) => h('button', { class: `chip ${id === store.selectedAct ? 'on' : ''}`, onclick: () => { store.selectedAct = id; rerender(); } }, logo(s.acts[id], 22), s.acts[id].name)));
}

const sess = { tier: 1, approach: 'balanced', producer: '' as string, songs: new Set<string>() };

/** Repertório → Estúdio: pré-seleciona as músicas da próxima sessão. */
export function preselectSession(ids: string[]): void {
  sess.songs = new Set(ids);
}

function sessionTab(s: GameState): HTMLElement {
  const a = s.acts[store.selectedAct ?? ''];
  if (!a) return h('p', null, '—');
  const written = unrecorded(s, a);
  if (!sess.songs.size || [...sess.songs].some((id) => !written.some((w) => w.id === id))) {
    sess.songs = new Set(written.slice(0, 4).map((x) => x.id));
  }
  const prods = availableProducers(s);
  const cost = sessionCost(s, sess.songs.size, sess.tier, sess.approach, sess.producer || undefined);
  return h('div', null,
    section(t(l('Repertório escrito', 'Written songs')), written.length ? h('div', { class: 'song-pick' }, written.map((so) => h('label', { class: `song-card ${sess.songs.has(so.id) ? 'on' : ''}` },
      h('input', { type: 'checkbox', checked: sess.songs.has(so.id), onchange: () => { if (sess.songs.has(so.id)) sess.songs.delete(so.id); else sess.songs.add(so.id); rerender(); } }),
      ic('disc'), h('b', null, so.title),
      h('span', { class: 'mini-bars' }, h('i', { style: `height:${so.melody}%`, title: t(l('Melodia', 'Melody')) }), h('i', { style: `height:${so.lyrics}%`, title: t(l('Letra', 'Lyrics')) }), h('i', { style: `height:${so.originality}%`, title: t(l('Originalidade', 'Originality')) })),
      so.sampleOf ? pill('sample') : null,
    ))) : h('p', { class: 'muted small' }, t(l('Nada escrito. Use "Compor" na agenda ou um camp de composição.', 'Nothing written. Use "Write songs" in the agenda or a songwriting camp.')))),
    section(t(l('Produtor', 'Producer')), h('div', { class: 'cards producers' },
      h('button', { class: `tile ${!sess.producer ? 'on' : ''}`, onclick: () => { sess.producer = ''; rerender(); } }, h('div', { class: 'tile-ic' }, ic('mic', 2)), h('div', { class: 'tile-body' }, h('b', null, t(l('Equipe da casa', 'In-house team'))), h('small', null, t(l('Sem assinatura; usa seu produtor contratado.', 'No signature; uses your hired producer.'))))),
      prods.map((p) => {
        const busy = (s.producerBusy[p.id] ?? 0) > s.week;
        const fit = producerFit(p, a.genre);
        return h('button', { class: `tile ${sess.producer === p.id ? 'on' : ''} ${busy ? 'muted' : ''}`, disabled: busy, onclick: () => { sess.producer = p.id; rerender(); } },
          h('div', { class: 'tile-ic' }, ic('mic', 2)),
          h('div', { class: 'tile-body' }, h('b', null, p.name), h('small', null, t(SIGNATURES[p.signature].name)),
            chips(stat('sparkle', p.skill, l('Habilidade', 'Skill')), stat('money', $(money(s, p.fee)), l('Por faixa', 'Per track')), stat(fit === 1 ? 'heart' : 'warning', fit === 1 ? '✓' : '~', l('Afinidade com o gênero', 'Genre fit'))),
            busy ? pill(t(l('ocupado', 'busy')), 'warn') : null,
          ));
      }),
    )),
    section(t(l('Sessão', 'Session')),
      h('div', { class: 'row wrap' },
        select(sess.tier, STUDIO_TIERS.map((x) => ({ value: x.id, label: t(x.name) })), (v) => { sess.tier = v; rerender(); }),
        select(sess.approach, APPROACHES.map((x) => ({ value: x.id, label: t(x.name) })), (v) => { sess.approach = v; rerender(); }),
        chips(stat('calendar', `${sessionDays(sess.songs.size, sess.approach)}d`, l('Dias de estúdio', 'Studio days')), stat('money', $(cost), l('Custo', 'Cost'))),
        h('button', { class: 'btn primary', disabled: !sess.songs.size, onclick: () => { const res = startSession(s, a.id, [...sess.songs], sess.tier, sess.approach, sess.producer || undefined); say(res, l('Sessão marcada! Acompanhe os takes na Central.', 'Session booked! Follow the takes in the Hub.')); rerender(); } }, ic('mic'), ' ', t(l('Entrar em estúdio', 'Enter the studio'))),
      ),
      h('p', { class: 'muted small' }, t(l('Cada dia grava um take. Você decide: manter, tentar de novo ou montar dos melhores. Carreiras delegadas decidem sozinhas.', 'Each day records a take. You decide: keep, try again or comp the best. Delegated careers decide on their own.'))),
    ),
    splitsSection(s),
  );
}

function splitsSection(s: GameState): HTMLElement {
  const a = s.acts[store.selectedAct ?? ''];
  const songs = a.songs.map((id) => s.songs[id]).filter((x) => x && !x.releaseId).slice(0, 8);
  if (!songs.length) return h('div');
  return section(t(l('Créditos de autoria (somam 100%)', 'Writing credits (add up to 100%)')), h('table', { class: 'tbl compact' }, h('tbody', null, songs.map((so) => {
    const splits = so.splits ?? so.writers.map((w) => ({ personId: w, share: 1 / Math.max(1, so.writers.length) }));
    return h('tr', null, h('td', null, so.title), h('td', null, splits.map((sp) => h('span', { class: 'pill' }, portrait(s.persons[sp.personId], 18), ` ${Math.round(sp.share * 100)}%`))),
      h('td', null, a.members.length > 1 ? h('button', { class: 'btn small ghost', title: t(l('Dividir igualmente entre toda a banda', 'Split equally across the band')), onclick: () => { const ms = a.members.filter((id) => s.persons[id]?.alive); const e = setSplits(s, so.id, ms.map((id, i) => ({ personId: id, share: i === ms.length - 1 ? 1 - Math.round((1 / ms.length) * 1000) / 1000 * (ms.length - 1) : Math.round((1 / ms.length) * 1000) / 1000 }))); say(e, l('Créditos redistribuídos.', 'Credits redistributed.')); rerender(); } }, t(l('Dividir com a banda', 'Share with the band'))) : null));
  }))));
}

function versionsTab(s: GameState): HTMLElement {
  const r = rngOf(s);
  const a = s.acts[store.selectedAct ?? ''];
  const released = Object.values(s.songs).filter((so) => so.releaseId && so.recorded).sort((x, y) => (s.releases[y.releaseId!]?.totalUnits ?? 0) - (s.releases[x.releaseId!]?.totalUnits ?? 0)).slice(0, 24);
  const own = a.songs.map((id) => s.songs[id]).filter((x) => x?.recorded).slice(0, 12);
  const writtenMine = unrecorded(s, a);
  const tribs = tributeCandidates(s);
  return h('div', null,
    section(t(l('Covers e samples de sucessos', 'Covers and samples of hits')), h('table', { class: 'tbl compact' }, h('tbody', null, released.map((so) => h('tr', null,
      h('td', null, ic('disc'), ' ', so.title, h('small', { class: 'muted' }, ` — ${s.acts[so.actId]?.name ?? ''}`)),
      h('td', null, h('button', { class: 'btn small', onclick: () => { say(makeCover(s, a.id, so.id), l('Cover adicionado ao repertório (edição fica com os autores originais).', 'Cover added (publishing stays with the original writers).')); rerender(); } }, t(l('Gravar cover', 'Record a cover')))),
      h('td', null, writtenMine.length ? h('button', { class: 'btn small ghost', onclick: () => { const req = requestSample(s, r, writtenMine[0].id, so.id, 'sample'); if ('status' in req) toast(t(req.status === 'cleared' ? l('Sample liberado e pago.', 'Sample cleared and paid.') : req.status === 'denied' ? l('Detentor NEGOU o sample. Usar mesmo assim pode dar processo.', 'The holder DENIED the sample. Using it anyway may lead to a lawsuit.') : l('Sem caixa para liberar: sample não liberado.', 'No cash to clear: sample uncleared.')), req.status === 'cleared' ? 'good' : 'bad'); else toast(t(req), 'bad'); rerender(); } }, t(l('Samplear em "{s}"', 'Sample into "{s}"'), { s: writtenMine[0].title })) : null),
    ))))),
    section(t(l('Remixes e versões', 'Remixes and versions')), own.length ? h('table', { class: 'tbl compact' }, h('tbody', null, own.map((so) => h('tr', null,
      h('td', null, so.title),
      h('td', null, h('button', { class: 'btn small', onclick: () => { say(makeRemix(s, so.id), l('Remix criado: mesma composição, nova produção.', 'Remix created: same composition, new production.')); rerender(); } }, 'Remix')),
      h('td', null, select('', [{ value: '', label: t(l('Versão em…', 'Version in…')) }, { value: 'es', label: 'Español' }, { value: 'en', label: 'English' }, { value: 'pt', label: 'Português' }, { value: 'ja', label: '日本語' }, { value: 'fr', label: 'Français' }, { value: 'ko', label: '한국어' }], (v) => { if (v) { say(makeTranslation(s, r, so.id, v), l('Versão adaptada criada.', 'Adapted version created.')); rerender(); } })),
    )))) : h('p', { class: 'muted small' }, t(l('Grave algo primeiro.', 'Record something first.')))),
    section(t(l('Discos-tributo', 'Tribute albums')), tribs.length ? h('div', { class: 'cards' }, tribs.map((hon) => tile('heart', hon.name, [h('small', null, genreName(hon.genre)), h('button', { class: 'btn small', onclick: () => { say(planTribute(s, hon.id, playerActs(s)) as L | object, l('Repertório do tributo criado entre seus artistas. Grave e lance como álbum.', 'Tribute songs created across your artists. Record and release as an album.')); rerender(); } }, t(l('Planejar tributo', 'Plan tribute')))]))) : h('p', { class: 'muted small' }, t(l('Tributos ficam disponíveis para artistas falecidos com obra no seu catálogo.', 'Tributes become available for deceased artists with work in your catalog.')))),
  );
}

const ro = { singles: new Set<string>(), teaser: true, presave: true, video: true, limited: 0, budget: 3000, title: '' };

function rolloutTab(s: GameState): HTMLElement {
  const r = rngOf(s);
  const a = s.acts[store.selectedAct ?? ''];
  const ready = unreleasedRecorded(s, a).sort((x, y) => y.q - x.q);
  const album = ready.slice(0, 12);
  const deluxe = ready.slice(12, 16);
  for (const id of [...ro.singles]) if (!album.some((x) => x.id === id)) ro.singles.delete(id);
  const active = s.rollouts.filter((x) => x.actId === a.id && x.status === 'active');
  const PH: Record<string, [L, string]> = { teaser: [l('Teaser', 'Teaser'), 'camera'], presave: [l('Pré-save', 'Pre-save'), 'stream'], single: [l('Single', 'Single'), 'disc'], video: [l('Clipe', 'Video'), 'tv'], album: [l('Álbum', 'Album'), 'cd'], deluxe: [l('Deluxe', 'Deluxe'), 'sparkle'], limited: [l('Edição limitada', 'Limited edition'), 'gold-disc'], anniversary: [l('Aniversário', 'Anniversary'), 'trophy'] };
  return h('div', null,
    active.map((x) => section(`${t(l('Rollout em curso', 'Rollout in progress'))}: ${x.title}`,
      h('div', { class: 'rollout-line' }, x.phases.map((p) => h('span', { class: `phase ${p.done ? 'done' : ''}` }, ic(PH[p.kind][1]), h('small', null, t(PH[p.kind][0])), h('em', null, `S${p.week}`)))),
      chips(stat('fire', `${Math.round(x.hype * 100)}%`, l('Hype acumulado', 'Accumulated hype')), x.presaves ? stat('stream', x.presaves, l('Pré-saves', 'Pre-saves')) : null),
      h('button', { class: 'btn small ghost', onclick: () => { cancelRollout(s, x.id); rerender(); } }, t(l('Cancelar plano', 'Cancel plan'))),
    )),
    section(t(l('Novo rollout de álbum', 'New album rollout')),
      album.length < 6 ? h('p', { class: 'muted' }, t(l('Precisa de ao menos 6 faixas gravadas e inéditas ({n} agora).', 'Needs at least 6 recorded, unreleased tracks ({n} now).'), { n: album.length })) : h('div', { class: 'form' },
        h('input', { placeholder: t(l('Título do álbum', 'Album title')), value: ro.title, oninput: (e: Event) => { ro.title = (e.target as HTMLInputElement).value; } }),
        h('p', { class: 'small' }, t(l('Escolha até 3 singles de trabalho:', 'Pick up to 3 lead singles:'))),
        h('div', { class: 'song-pick' }, album.map((so) => h('label', { class: `song-card ${ro.singles.has(so.id) ? 'on' : ''}` }, h('input', { type: 'checkbox', checked: ro.singles.has(so.id), onchange: () => { if (ro.singles.has(so.id)) ro.singles.delete(so.id); else if (ro.singles.size < 3) ro.singles.add(so.id); rerender(); } }), ic('disc'), so.title, pill(`Q${Math.round(so.q)}`)))),
        h('div', { class: 'row wrap' },
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: ro.teaser, onchange: (e: Event) => { ro.teaser = (e.target as HTMLInputElement).checked; } }), ic('camera'), t(l('Teaser', 'Teaser'))),
          canPresave(s) ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: ro.presave, onchange: (e: Event) => { ro.presave = (e.target as HTMLInputElement).checked; } }), ic('stream'), t(l('Pré-save', 'Pre-save'))) : null,
          canVideo(s) ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: ro.video, onchange: (e: Event) => { ro.video = (e.target as HTMLInputElement).checked; } }), ic('tv'), t(l('Clipe', 'Video'))) : null,
          select(ro.limited, [0, 300, 1000, 3000].map((n) => ({ value: n, label: n ? `${t(l('Limitada', 'Limited'))} ${n}` : t(l('Sem edição limitada', 'No limited edition')) })), (v) => { ro.limited = v; }),
          select(ro.budget, [0, 1500, 3000, 8000, 18000].map((n) => ({ value: n, label: `${t(l('Verba/fase', 'Budget/phase'))} ${$(money(s, n))}` })), (v) => { ro.budget = v; }),
        ),
        deluxe.length ? h('p', { class: 'small muted' }, t(l('Deluxe 30 semanas depois com: ', 'Deluxe 30 weeks later with: ')), deluxe.map((x) => x.title).join(', ')) : null,
        h('button', { class: 'btn primary', onclick: () => {
          const res = planRollout(s, { actId: a.id, title: ro.title, albumSongs: album.map((x) => x.id), singles: [...ro.singles], teaser: ro.teaser, presave: ro.presave && canPresave(s), video: ro.video && canVideo(s), deluxeSongs: deluxe.map((x) => x.id), limitedUnits: ro.limited, budget: money(s, ro.budget) });
          say(res, l('Rollout planejado! As fases acontecem sozinhas nas semanas marcadas.', 'Rollout planned! Phases run on their own in the scheduled weeks.'));
          rerender();
        } }, ic('calendar'), ' ', t(l('Planejar rollout', 'Plan rollout'))),
      ),
    ),
    section(t(l('Reedições de aniversário', 'Anniversary reissues')), anniversaryCandidates(s).length ? h('ul', null, anniversaryCandidates(s).map((rel) => h('li', null, ic('trophy'), ` ${rel.title} (${s.year - rel.year} ${t(l('anos', 'years'))}) `, h('button', { class: 'btn small', onclick: () => { say(scheduleAnniversary(s, r, rel.id, money(s, 3000)), l('Reedição programada.', 'Reissue scheduled.')); rerender(); } }, t(l('Reeditar', 'Reissue')))))) : h('p', { class: 'muted small' }, t(l('Álbuns seus com 10, 20, 25, 30, 40 ou 50 anos aparecem aqui.', 'Your albums turning 10, 20, 25, 30, 40 or 50 show up here.')))),
  );
}

const neuralDraft = { offer: 0 };

function neuralTab(s: GameState): HTMLElement {
  const r = rngOf(s);
  const legends = deceasedLegends(s);
  if (!hologramReady(s) && !aiVoiceReady(s)) return section(t(l('Novas tecnologias', 'New technologies')), h('p', { class: 'muted' }, t(l('Nada disso existe ainda. Quando a tecnologia chegar, você vai saber pelo noticiário.', 'None of this exists yet. When the technology arrives, you will hear about it in the news.'))));
  return h('div', null,
    section(t(l('Política de consentimento', 'Consent policy')), chips(
      stat('brain', s.player.neural.voiceLicenses, l('Licenças de voz', 'Voice licenses')),
      pill(t({ none: l('sem política', 'no policy'), consent: l('só com consentimento', 'consent only'), no_consent: l('usa sem consentimento', 'uses without consent') }[s.player.neural.consentPolicy]), s.player.neural.consentPolicy === 'no_consent' ? 'bad' : 'good'),
      s.player.neural.voiceScandal ? pill(t(l('escândalo da voz', 'voice scandal')), 'bad') : null,
    )),
    section(t(l('Artistas que já partiram', 'Artists who have passed')), legends.length ? h('div', { class: 'cards' }, legends.map(({ person: p, act }) => {
      const ir = s.imageRights[p.id];
      const owned = ir?.holder === 'player';
      const vault = (s.vault[p.id] ?? []).filter((id) => s.songs[id] && !s.songs[id].releaseId).length;
      return h('article', { class: 'tile neural' }, h('div', { class: 'tile-ic' }, portrait(p, 48)), h('div', { class: 'tile-body' },
        h('b', null, p.name), h('small', null, act.name, ` · ★${Math.round(act.fame)}`),
        chips(owned ? pill(t(l('direitos seus', 'rights owned')), 'good') : pill(`${t(l('espólio pede', 'estate asks'))} ${$(ir?.feeAsk ?? money(s, 30000))}`, 'warn'), vault ? stat('lock', vault, l('Inéditas no cofre', 'Unreleased in vault')) : null),
        !owned ? h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => { const v = ir?.feeAsk ?? money(s, 30000); toast(t(negotiateImageRights(s, r, p.id, v)), 'info'); rerender(); } }, `${t(l('Oferecer', 'Offer'))} ${$(ir?.feeAsk ?? money(s, 30000))}`), h('button', { class: 'btn small ghost', onclick: () => { const v = Math.round((ir?.feeAsk ?? money(s, 30000)) * 0.6); toast(t(negotiateImageRights(s, r, p.id, v)), 'info'); rerender(); } }, `${t(l('Oferecer', 'Offer'))} ${$(Math.round((ir?.feeAsk ?? money(s, 30000)) * 0.6))}`)) : null,
        h('div', { class: 'row wrap' },
          hologramReady(s) ? h('button', { class: 'btn small primary', onclick: () => { say(startHologramShow(s, r, p.id, 6, true), l('Residência holográfica estreia!', 'Hologram residency premieres!')); rerender(); } }, ic('hologram'), ' ', t(l('Show em holograma (6 meses)', 'Hologram show (6 months)')), ` ${$(hologramCost(s))}+`) : null,
          vault ? h('button', { class: 'btn small', onclick: () => { say(posthumousRelease(s, r, p.id, true), l('Inéditas finalizadas. Lance pela Criação.', 'Unreleased songs finished. Release them via Creation.')); rerender(); } }, ic('lock'), ' ', t(l('Lançamento póstumo', 'Posthumous release'))) : null,
          aiVoiceReady(s) ? h('button', { class: 'btn small', onclick: () => { say(aiVoiceSongs(s, r, p.id, 2, true), l('Duas faixas novas com a voz licenciada.', 'Two new tracks with the licensed voice.')); rerender(); } }, ic('brain'), ' ', t(l('Novas faixas com voz IA', 'New tracks with AI voice'))) : null,
        ),
        !owned ? h('details', { class: 'small' }, h('summary', null, t(l('Usar sem autorização (arriscado)', 'Use without authorization (risky)'))),
          h('p', { class: 'bad' }, t(l('Barato e rápido; pode virar escândalo, processo e mudar o final da run.', 'Cheap and fast; may become a scandal, a lawsuit and change the run\'s ending.'))),
          hologramReady(s) ? h('button', { class: 'btn small ghost', onclick: () => { say(startHologramShow(s, r, p.id, 6, false), l('Holograma no palco… sem autorização.', 'Hologram on stage… unauthorized.')); rerender(); } }, ic('hologram'), ' ', t(l('Holograma não autorizado', 'Unauthorized hologram'))) : null,
          aiVoiceReady(s) ? h('button', { class: 'btn small ghost', onclick: () => { say(aiVoiceSongs(s, r, p.id, 2, false), l('Faixas com voz clonada lançadas no repertório.', 'Cloned-voice tracks added to the repertoire.')); rerender(); } }, ic('brain'), ' ', t(l('Voz clonada sem acordo', 'Cloned voice without a deal'))) : null,
        ) : null,
      ));
    })) : h('p', { class: 'muted small' }, t(l('Ninguém relevante faleceu ainda nesta run.', 'No notable artist has died yet in this run.')))),
  );
}

void neuralDraft; void actLink; void PRODUCERS;

export function studioHub(s: GameState, launch: () => HTMLElement): HTMLElement {
  const picker = actPicker(s);
  if (!picker) return launch();
  return h('div', { class: 'hub studio-hub' },
    picker,
    tabs('creation', mergeTabs([
      { id: 'repertoire', label: t(l('Repertório', 'Repertoire')), icon: 'note', render: () => repertoireTab(s) },
      { id: 'launch', label: t(l('Lançar', 'Release')), icon: 'cd', render: launch },
      { id: 'session', label: t(l('Estúdio', 'Studio')), icon: 'mic', render: () => sessionTab(s) },
      { id: 'rollout', label: t(l('Rollout', 'Rollout')), icon: 'calendar', render: () => rolloutTab(s) },
      { id: 'versions', label: t(l('Covers e versões', 'Covers & versions')), icon: 'disc', render: () => versionsTab(s) },
      ...(hologramReady(s) || aiVoiceReady(s) ? [{ id: 'neural', label: t(l('Era sintética', 'Synthetic era')), icon: 'hologram', render: () => neuralTab(s) }] : []),
    ], 'creation', s), rerender),
  );
}
