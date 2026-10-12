import './styles.css';
import { boot } from './ui/app';
import '@fontsource/source-serif-4/latin-600.css';
import '@fontsource/source-serif-4/latin-700.css';
import '@fontsource/barlow-semi-condensed/latin-400.css';
import '@fontsource/barlow-semi-condensed/latin-500.css';
import '@fontsource/barlow-semi-condensed/latin-600.css';
import '@fontsource/silkscreen/latin-400.css';
import '@fontsource/silkscreen/latin-700.css';
import './ui/heritage21.css'; // r21: tema Heritage Studio Pixel por último (só apresentação)
import './ui/mobile23.css'; // r23: celular — topo em uma linha, 4 destinos + Mais, tabelas em cartões

boot(document.getElementById('app')!);
// r22: toda tabela ordena pelo cabeçalho
import { installSort22 } from './ui/sort22';
if (typeof document !== 'undefined') installSort22();
// r23: no celular, tabelas densas viram cartões (td[data-label])
import { installCards23 } from './ui/cards23';
if (typeof document !== 'undefined') installCards23();
