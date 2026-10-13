import './styles.css';
import { boot } from './ui/app';
import { gearReady } from './ui/pixel/gear21';

// o atlas de equipamentos (~14 KB) chega antes da primeira cena; se falhar, os objetos ficam procedurais
void gearReady().then(() => boot(document.getElementById('app')!));
