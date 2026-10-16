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
import './ui/ps/theme25.css'; // r25: Pixel Studio — azul-noite + dourado (escuro padrão), claro Heritage; 6 seções
import './ui/ps/ui27.css'; // r27 (J): sistema visual compartilhado (docs/ui27.md) — depois do tema
import './ui/tokens31.css'; // r31 (C): índice de tokens, contraste e daltonismo por tema
// r31 onda 4 (M): fontes das épocas (cada arquivo só é baixado quando o estilo está em uso) e os 9 estilos — por último
import '@fontsource/unifrakturmaguntia/latin-400.css';
import '@fontsource/josefin-sans/latin-400.css';
import '@fontsource/josefin-sans/latin-700.css';
import '@fontsource/pacifico/latin-400.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-900.css';
import '@fontsource/fraunces/latin-700.css';
import '@fontsource/fraunces/latin-900.css';
import '@fontsource/vt323/latin-400.css';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-800.css';
import './ui/skins31.css';
import './ui/ps/hq25'; // r25: Sede viva (Pixel Studio) — registra a tela da Sede no slot25

import { gearReady } from './ui/pixel/gear21';

// o atlas de equipamentos (~14 KB) chega antes da primeira cena; se falhar, os objetos ficam procedurais
void gearReady().then(() => boot(document.getElementById('app')!));
// r22: toda tabela ordena pelo cabeçalho
import { installSort22 } from './ui/sort22';
if (typeof document !== 'undefined') installSort22();
// r23: no celular, tabelas densas viram cartões (td[data-label])
import { installCards23 } from './ui/cards23';
if (typeof document !== 'undefined') installCards23();
// r25: no máximo 5 abas visíveis por faixa; o resto em "Mais" (com filtro)
import { installTabs25 } from './ui/ps/tabs25';
if (typeof document !== 'undefined') installTabs25();
// r27 (J): colunas numéricas de toda tabela alinhadas à direita
import { installNum27 } from './ui/ps/num27';
if (typeof document !== 'undefined') installNum27();
