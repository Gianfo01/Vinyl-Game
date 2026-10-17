// R33 · INTRO33 — o texto da intro da partida: o MESMO resumo da ficha ("Londres, 1962: o beat está nascendo nos
// porões. Você começa como selo iniciante — …"), com o nome do personagem, e a aparência que ele criou na ficha.
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { randomLook } from '../pixel/avatar';
import { cityName } from '../common';
import { store } from '../store';
import { story5 } from '../r31/newrun5model';
import type { RunConfig } from '../../sim/types';
import type { IntroInfo33 } from './intro33';

/** Dados da intro a partir da configuração escolhida (só lê). */
export function introInfo33(cfg: RunConfig): IntroInfo33 {
  const st = story5(cfg, cityName), lang: 'pt' | 'en' = store.prefs.lang === 'en' ? 'en' : 'pt';
  const line = `${st.city}, ${st.year}: ${t(st.era)}. ${t(l('Você começa como', 'You start as'))} ${t(st.start)} — ${t(st.startFx)}`;
  const name = st.name || cfg.character?.name || '';
  return { name, line, year: cfg.startYear, look: cfg.character?.look ?? randomLook(`intro33:${name || cfg.seed}`), lang };
}
