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

boot(document.getElementById('app')!);
// r22: toda tabela ordena pelo cabeçalho
import { installSort22 } from './ui/sort22';
if (typeof document !== 'undefined') installSort22();
