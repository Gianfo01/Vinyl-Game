// Rodada 29 (WIKI) — entrada da wiki como ARQUIVO SEPARADO do jogo (wiki.html). Não carrega o jogo, partida nem save:
// lê só as tabelas de dados e as regras do código (o motor da simulação entra para os números lidos ao vivo).
import '../styles.css';
import '@fontsource/source-serif-4/latin-600.css';
import '@fontsource/source-serif-4/latin-700.css';
import '@fontsource/barlow-semi-condensed/latin-400.css';
import '@fontsource/barlow-semi-condensed/latin-500.css';
import '@fontsource/barlow-semi-condensed/latin-600.css';
import '@fontsource/silkscreen/latin-400.css';
import '../ui/heritage21.css';
import '../ui/ps/theme25.css';
import '../ui/ps/ui27.css';
import '../sim/tick'; // ordem de imports do motor (evita ciclo ao ler constantes dos sistemas)
import { setLang, type Lang } from '../i18n/strings';
import { mountWiki29 } from '../ui/wiki29/wiki29';
import { registerIconRenderer } from '../ui/vis';
import { ICON_NAMES, icon as pxIcon, type IconName } from '../ui/pixel/icons';
import { icon17 } from '../ui/pixel/icons17';

// mesmos ícones em pixel art do jogo (no jogo quem registra é app.ts)
registerIconRenderer((name, scale = 1) => ((ICON_NAMES as readonly string[]).includes(name) ? pxIcon(name as IconName, scale) : icon17(name, scale)));

// mesmas preferências de idioma e tema do jogo (só leitura; a wiki não grava nada)
let lang: Lang = navigator.language?.startsWith('pt') ? 'pt' : 'en';
let theme = 'dark';
try {
  const p = JSON.parse(localStorage.getItem('vtn:prefs') ?? '{}') as { lang?: Lang; theme?: string };
  if (p.lang) lang = p.lang;
  if (p.theme === 'light') theme = 'light';
} catch { /* sem armazenamento */ }
setLang(lang);
document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
document.documentElement.dataset.theme = theme;
mountWiki29(document.getElementById('wiki')!);
