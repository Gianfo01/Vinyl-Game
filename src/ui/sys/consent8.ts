// Interface de IA, consentimento e autoria (rodada 8): aba em Negócios com a postura do selo (uso de IA,
// certificação), consentimento por artista, propostas de empresas de modelos, imitações, leis por país
// e bloqueios. Mostra os dois lados de cada escolha, sem resposta certa.

import { countryName } from '../../data/geo';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  LAW_DESC, LAW_NAME, SCOPE_NAME, USE_NAME, acceptAiOffer, ai, aiEra, applyCert, askConsent, certBlocker, certCost, consentChance, declineAiOffer, humanPref,
  lawCountries, lawLevel, lobby, lobbyCost, resolveImitation, scaleIncome, setUse, uncoveredActs, voiceIncome, type AiUse, type ImitChoice,
} from '../../sim/sys/consent8';
import type { GameState } from '../../sim/types';
import { playerActs, rngOf } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { registerTab } from '../registry';
import { ic } from '../vis';

const say = (e: L | null, ok?: L) => { if (e) toast(t(e), 'bad'); else if (ok) toast(t(ok), 'good'); rerender(); };
const form = { share: 0.3, credit: true };

const USE_UP: L[] = [
  l('Confiança do público e acesso à certificação e ao Prêmio Feito por Humanos.', 'Public trust and access to the certification and the Made by Humans Award.'),
  l('Produção mais limpa e barata; renda pequena com versões e demos.', 'Cleaner, cheaper production; small income from versions and demos.'),
  l('Escala e margem: faixas funcionais e feeds personalizados todo mês.', 'Scale and margin: functional tracks and personalized feeds every month.'),
];
const USE_DOWN: L[] = [
  l('Sem a renda e o ganho de produção da IA.', 'No AI income or production boost.'),
  l('Confiança do público cai devagar; perde a certificação.', 'Public trust erodes slowly; loses the certification.'),
  l('Confiança e crítica caem todo mês; faixas viram sintéticas (rótulo e risco de bloqueio em leis duras).', 'Trust and critics fall monthly; tracks become synthetic (labels and block risk under strict laws).'),
];

function consentLabel(v?: 'g' | 'r'): HTMLElement {
  return v === 'g' ? pill(t(l('consentiu', 'consented')), 'good') : v === 'r' ? pill(t(l('recusou', 'refused')), 'bad') : pill(t(l('não perguntado', 'not asked')));
}

export function aiTab(s: GameState): HTMLElement {
  if (!aiEra(s)) return section(t(l('IA e autoria', 'AI and authorship')), h('p', { class: 'muted' }, t(l('A crise da autoria chega com os modelos generativos de música (a partir de 2023). Até lá, toda voz é de alguém.', 'The authorship crisis arrives with generative music models (from 2023). Until then, every voice belongs to someone.'))));
  const st = ai(s);
  const r = () => rngOf(s);
  const ids = playerActs(s);
  const blocker = certBlocker(s);
  const unc = uncoveredActs(s).length;
  const blocked = Object.entries(st.blocks).filter(([, w]) => w > s.week);
  const pendingImit = st.imit.filter((x) => x.until === undefined);
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(t(l('Postura do selo', 'Label stance')),
        h('p', { class: 'muted small' }, t(l('Não há resposta certa: escala sintética e licenças amplas dão margem e alcance, mas corroem confiança, crítica e valor do catálogo; consentimento e certificação custam no curto prazo e rendem reputação, comunidade e prêmios próprios. Vozes licenciadas com consentimento são um terceiro caminho, com prêmio próprio.', 'There is no right answer: synthetic scale and broad licenses bring margin and reach but erode trust, critics and catalog value; consent and certification cost in the short run and pay back in reputation, community and their own awards. Consented, licensed voices are a third path, with its own award.'))),
        h('div', { class: 'kv-grid small' },
          h('div', null, t(l('Confiança do público', 'Public trust')), ' ', bar(st.trust, 100, st.trust < 35 ? 'bad' : st.trust > 65 ? 'good' : ''), ` ${Math.round(st.trust)}`),
          h('div', null, t(l('Preferência por "feito por humanos"', '"Made by humans" preference')), ' ', bar(humanPref(s) * 100, 100), ` ${Math.round(humanPref(s) * 100)}%`),
          h('div', { title: t(l('Treino de modelos dilui as vendas do catálogo antigo (mais de 2 anos).', 'Model training dilutes back-catalog sales (over 2 years old).')) }, t(l('Diluição do catálogo', 'Catalog dilution')), ' ', bar(st.dil * 100, 35, st.dil > 0.1 ? 'bad' : ''), ` −${Math.round(st.dil * 100)}%`),
        ),
        h('h4', null, t(l('Uso de IA na produção', 'AI use in production'))),
        h('div', { class: 'mg-depts' }, ([0, 1, 2] as AiUse[]).map((u) => h('div', { class: `mg-dept ${st.use === u ? 'on' : ''}` },
          h('b', null, t(USE_NAME[u])),
          h('small', { class: 'good' }, `+ ${t(USE_UP[u])}`),
          h('small', { class: 'bad' }, `− ${t(USE_DOWN[u])}`),
          st.use === u ? pill(t(l('atual', 'current')), 'good') : h('button', { class: 'btn small', onclick: () => say(setUse(s, u)) }, t(l('Adotar', 'Adopt'))),
        ))),
        st.use ? h('p', { class: 'small' }, t(l('Renda da escala sintética: {v}/mês.', 'Synthetic scale income: {v}/mo.'), { v: $(scaleIncome(s)) })) : null,
        h('h4', null, t(l('Certificação "Feito por Humanos"', '"Made by Humans" certification'))),
        st.cert ? h('p', { class: 'small' }, pill(t(l('certificado', 'certified')), 'good'), ' ', t(l('desde a semana {w}; próxima auditoria na semana {n}.', 'since week {w}; next audit on week {n}.'), { w: st.cert.since, n: st.cert.next }))
          : h('div', null, blocker ? h('p', { class: 'warn small' }, t(blocker)) : null,
            h('button', { class: 'btn small', disabled: !!blocker, onclick: () => say(applyCert(s), l('Certificado!', 'Certified!')) }, `${t(l('Pedir certificação', 'Apply'))} (${$(certCost(s))})`)),
        st.awards.length ? h('p', { class: 'small' }, ic('trophy'), ' ', st.awards.map((a) => `${a.year}: ${t(a.kind === 'human' ? l('Feito por Humanos', 'Made by Humans') : l('Inovação Sintética', 'Synthetic Innovation'))}`).join(' · ')) : null,
      ),
      section(t(l('Consentimento por artista', 'Consent by artist')),
        h('p', { class: 'muted small' }, t(l('Voz: o artista licencia o próprio timbre (renda mensal dividida, mas a voz fica menos única). Treino: autoriza modelos a aprender com a obra (acordos sem processo nem perda de confiança).', 'Voice: the artist licenses their timbre (monthly income shared, but the voice becomes less unique). Training: allows models to learn from the work (deals without lawsuits or lost trust).'))),
        h('div', { class: 'row wrap small' },
          h('label', null, t(l('Fatia do artista', 'Artist share')), ' ', select<number>(form.share, [0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((v) => ({ value: v, label: `${Math.round(v * 100)}%` })), (v) => { form.share = v; rerender(); })),
          h('label', null, h('input', { type: 'checkbox', checked: form.credit, onchange: (e: Event) => { form.credit = (e.target as HTMLInputElement).checked; rerender(); } }), ' ', t(l('Crédito público ao artista', 'Public credit to the artist'))),
        ),
        ids.length ? h('table', { class: 'tbl compact' },
          h('thead', null, h('tr', null, ...[t(l('Artista', 'Artist')), t(l('Confiança', 'Trust')), t(l('Voz', 'Voice')), t(l('Treino', 'Training')), ''].map((x) => h('th', null, x)))),
          h('tbody', null, ids.map((id) => {
            const a = s.acts[id];
            const rec = st.consent[id];
            const ask = (k: 'v' | 't') => h('button', { class: 'btn small ghost', title: t(l('Chance estimada: {p}%', 'Estimated chance: {p}%'), { p: Math.round(consentChance(s, a, k, form.share, form.credit) * 100) }), onclick: () => { toast(t(askConsent(s, r(), id, k, form.share, form.credit))); rerender(); } }, `${t(k === 'v' ? l('Pedir voz', 'Ask voice') : l('Pedir treino', 'Ask training'))} ${Math.round(consentChance(s, a, k, form.share, form.credit) * 100)}%`);
            return h('tr', null,
              h('td', null, actLink(s, id), a.archetype === 'synthetic' ? h('span', null, ' ', pill(t(l('sintético', 'synthetic')), 'info')) : null),
              h('td', null, Math.round(a.trust)),
              h('td', null, consentLabel(rec?.v), rec?.v === 'g' ? h('small', { class: 'muted' }, ` ${$(voiceIncome(s, a))}/${t(l('mês', 'mo'))} · ${Math.round(rec.sh * 100)}%`) : null),
              h('td', null, consentLabel(rec?.t)),
              h('td', null, rec?.v !== 'g' ? ask('v') : null, ' ', rec?.t !== 'g' ? ask('t') : null),
            );
          })),
        ) : h('p', { class: 'muted small' }, t(l('Sem artistas.', 'No artists.'))),
        st.last.voice ? h('p', { class: 'small' }, t(l('Licenças de voz no último mês: {v} para o selo.', 'Voice licenses last month: {v} for the label.'), { v: $(st.last.voice) })) : null,
      ),
      section(t(l('Propostas de empresas de modelos', 'Offers from model companies')),
        st.offers.length ? st.offers.map((o) => h('div', { class: 'tile' }, h('div', { class: 'tile-body' },
          h('b', null, o.co), ' — ', t(SCOPE_NAME[o.scope]), ' ', o.consentOnly ? pill(t(l('só obras autorizadas', 'consented works only')), 'good') : pill(t(l('catálogo inteiro', 'whole catalog')), 'warn'), ' ', o.credit ? pill(t(l('com crédito', 'with credit'))) : pill(t(l('sem crédito', 'no credit')), 'bad'),
          h('div', { class: 'small' }, t(l('{u} na assinatura + {m}/mês por {n} meses. Expira na semana {w}.', '{u} upfront + {m}/mo for {n} months. Expires week {w}.'), { u: $(o.upfront), m: $(o.monthly), n: o.months, w: o.expires })),
          !o.consentOnly && unc ? h('div', { class: 'bad small' }, t(l('{n} artista(s) sem consentimento de treino: confiança deles e do público cai, catálogo se dilui, risco de processo em países com lei de consentimento.', '{n} artist(s) without training consent: their trust and public trust drop, the catalog dilutes, lawsuit risk in consent-law countries.'), { n: unc })) : null,
          h('div', { class: 'row' },
            h('button', { class: 'btn small', onclick: () => say(acceptAiOffer(s, o.id), l('Acordo assinado.', 'Deal signed.')) }, t(l('Aceitar', 'Accept'))),
            h('button', { class: 'btn small ghost', onclick: () => { declineAiOffer(s, o.id); rerender(); } }, t(l('Recusar', 'Decline')))),
        ))) : h('p', { class: 'muted small' }, t(l('Propostas chegam quando o selo tem catálogo (3+ lançamentos).', 'Offers arrive once the label has a catalog (3+ releases).'))),
        st.deals.length ? h('ul', { class: 'small' }, st.deals.map((d) => h('li', null, h('b', null, d.co), ` — ${t(SCOPE_NAME[d.scope])} · ${$(d.monthly)}/${t(l('mês', 'mo'))} · ${t(l('até a semana', 'until week'))} ${d.until}`, d.acts.length ? h('span', { class: 'bad' }, ` · ${d.acts.length} ${t(l('sem consentimento', 'without consent'))}`) : null))) : null,
      ),
    ),
    h('aside', { class: 'col-side' },
      section(t(l('Imitações não autorizadas', 'Unauthorized imitations')),
        pendingImit.length ? pendingImit.map((im) => h('div', { class: 'tile' }, h('div', { class: 'tile-body' },
          h('b', null, actLink(s, im.actId)), h('small', null, ` — ${im.by}`),
          h('div', { class: 'row wrap' }, (['sue', 'takedown', 'license', 'ignore'] as ImitChoice[]).map((c) => h('button', { class: `btn small ${c === 'ignore' ? 'ghost' : ''}`, title: t({ sue: l('Processo: a chance depende da lei do país-sede e do jurídico.', 'Lawsuit: odds depend on home-country law and legal staff.'), takedown: l('Barato; pode reaparecer.', 'Cheap; may reappear.'), license: l('Vira licença paga (exige consentimento de voz).', 'Becomes a paid license (needs voice consent).'), ignore: l('Vendas do artista caem por 6 meses; ele se ressente.', 'Artist sales drop for 6 months; they resent it.') }[c]), onclick: () => say(resolveImitation(s, r(), im.id, c)) }, t({ sue: l('Processar', 'Sue'), takedown: l('Remoção', 'Takedown'), license: l('Licenciar', 'License'), ignore: l('Ignorar', 'Ignore') }[c])))),
        ))) : h('p', { class: 'muted small' }, t(l('Nenhuma imitação em aberto.', 'No open imitations.'))),
      ),
      section(t(l('Leis por país', 'Laws by country')),
        blocked.length ? h('p', { class: 'bad small' }, ic('warning'), ' ', t(l('Bloqueios de distribuição: ', 'Distribution blocks: ')), blocked.map(([a3, w]) => `${t(countryName(a3))} (${t(l('até sem.', 'until wk'))} ${w})`).join(', ')) : null,
        h('table', { class: 'tbl compact' }, h('tbody', null, lawCountries().map((a3) => {
          const lv = lawLevel(s, a3);
          return h('tr', null,
            h('td', null, t(countryName(a3))),
            h('td', { title: t(LAW_DESC[lv]) }, pill(t(LAW_NAME[lv]), lv >= 3 ? 'bad' : lv === 2 ? 'warn' : lv === 1 ? 'info' : '')),
            h('td', { class: 'nowrap' },
              h('button', { class: 'link', title: t(l('Lobby por lei mais dura ({c}): confiança +', 'Lobby for stricter law ({c}): trust +'), { c: $(lobbyCost(s)) }), onclick: () => say(lobby(s, a3, 1), l('Lobby feito.', 'Lobbied.')) }, '▲'), ' ',
              h('button', { class: 'link', title: t(l('Lobby para adiar a lei ({c}): confiança −', 'Lobby to delay the law ({c}): trust −'), { c: $(lobbyCost(s)) }), onclick: () => say(lobby(s, a3, -1), l('Lobby feito.', 'Lobbied.')) }, '▼')),
          );
        }))),
      ),
      st.log.length ? section(t(l('Histórico', 'History')), h('ul', { class: 'small' }, st.log.slice(0, 10).map((x) => h('li', { class: x.tone ?? '' }, t(x.text))))) : null,
    ),
  );
}

registerTab('business', {
  id: 'ai8', label: l('IA e autoria', 'AI and authorship'), icon: 'brain', order: 70,
  visible: (s) => aiEra(s),
  badge: (s) => { if (!aiEra(s)) return undefined; const st = ai(s); return st.offers.length + st.imit.filter((x) => x.until === undefined).length || undefined; },
  render: (s) => aiTab(s),
});
