// R31 · UNI-4 — registro do interruptor 'uni4.links' (leitura em uni4.ts).
import { l } from '../../data/world';
import { registerSwitch } from './switches';

registerSwitch({
  id: 'uni4.links', def: true, scope: 'game',
  desc: l('Ligações da onda 4: estilo em alta pelas paradas, sua rádio e sua plataforma no mercado, segredos da intriga podem vazar.',
    'Wave 4 links: hot style from the charts, your radio and platform in the market, intrigue secrets can leak.'),
});
