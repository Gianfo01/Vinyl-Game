// Rodada 29 (Submundo) — as ligações com organizações (fonte única sim/sys/orglinks29) também na ficha de quem não é
// artista (empresário 'e:', produtor 'pd:', líder 'l:', equipe 's:', crítico 'c:' — Morris Levy, Suge Knight…) e as
// famílias na busca (Ctrl+K: o nome da organização abre Submundo › Organizações). A ficha de artista mostra o mesmo
// bloco pela aba "Conexões" (ui/sys/connect29). Só leitura.
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { orgById, orgs17 } from '../../sim/sys/crime17';
import { delay29, doMob29, fulfill29, meter29, refuse29 } from '../../sim/sys/mob29';
import { ROW_ACT27 } from './cockpit27model';
import { LINK29, linksOfKey29, orgLinks29 } from '../../sim/sys/orglinks29';
import type { GameState } from '../../sim/types';
import { pill, rerender } from '../common';
import { h } from '../dom';
import { ent27 } from '../ps/ent27';
import { personRoute16, searchRoute16 } from '../route16';
import { store } from '../store';
import { setTab } from '../vis';
import { PAGE16_TABS } from './people16';

/** Bloco "Submundo" de uma chave (pessoa da indústria, ato, selo): as mesmas ligações do card da organização. */
export function underworldLinks29(s: GameState, key: string): HTMLElement | null {
  const xs = linksOfKey29(s, key);
  if (!xs.length) return null;
  return h('ul', { class: 'small' }, ...xs.map((x) => {
    const o = orgById(s, x.o);
    return h('li', null, h('b', { class: 'ent27', tabindex: '0', ...ent27('org', x.o) }, o ? t(o.name) : x.o), ' ',
      pill(t(LINK29[x.kind]), x.kind === 'enemy' ? 'bad' : x.kind === 'owes' ? 'warn' : ''), x.y ? ` ${x.y}` : '',
      h('div', { class: 'muted' }, t(x.text)));
  }));
}

PAGE16_TABS.push((s, key) => {
  if (key.startsWith('p:') || !linksOfKey29(s, key).length) return null;
  return { id: 'mob29', label: l('Submundo', 'Underworld'), icon: 'skull', render: () => underworldLinks29(s, key) };
});

// busca: as famílias (Ctrl+K). O gancho de busca de gente da indústria (people16) devolve chaves; 'o:' abre o Submundo.
setTimeout(() => {
  const prevS = searchRoute16.f, prevR = personRoute16.f;
  searchRoute16.f = (s: GameState, q: string) => {
    const out = prevS?.(s, q) ?? [];
    if (q.length < 2) return out;
    for (const o of orgs17(s, false, true)) {
      const nm = t(o.name);
      if (!nm.toLowerCase().includes(q)) continue;
      const m = meter29(s, o.id);
      out.push({ label: nm, hint: `${t(l('Organização', 'Organization'))} · ${orgLinks29(s, o.id).length} ${t(l('ligações', 'ties'))} · ${t(l('hostilidade', 'hostility'))} ${m.hostility}`, key: `o:${o.id}` });
    }
    return out;
  };
  personRoute16.f = (key: string, tab?: string) => {
    if (!key.startsWith('o:')) return prevR?.(key, tab) ?? false;
    setTab('crime17', 'orgs');
    (store as { area: string }).area = 'crime';
    rerender();
    return true;
  };
}, 0);

// Cockpit › Favores e dívidas: as ações rápidas chamam as mesmas funções do card da família e do menu de ações
ROW_ACT27.f = (s, id) => {
  if (id.startsWith('mob.ask:')) return fulfill29(s, id.slice(8));
  if (id.startsWith('mob.refuse:')) return refuse29(s, id.slice(11));
  if (id.startsWith('mob.delay:')) return delay29(s, id.slice(10));
  if (id.startsWith('mob.pay:')) return doMob29(s, id.slice(8), 'paydebt');
  return null;
};
