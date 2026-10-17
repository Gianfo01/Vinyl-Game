// R33 · REDES — liga o app Redes ao celular e ao computador (gancho `registerPhoneApp33`/`registerPcApp33` da APARELHOS33).
// Importado pela casca na junção; o app aparece de 2004 em diante (celular a partir da versão 2007, onde a tabela reserva o
// lugar 'redes'; computador quando a tabela do PC o listar). A tela é a mesma do feed, embutida na tela do aparelho.

import { l } from '../../data/world';
import { redes33On, redes33, boatos33 } from '../../sim/r33/redes33';
import { registerPcApp33, registerPhoneApp33, type AppReg33 } from './aparelhos33model';
import { embedRedes33 } from './redes33ui';

export const REDES_APP33: AppReg33 = {
  id: 'redes',
  name: l('Redes', 'Social'),
  icon: 'redes',
  de: 2004,
  sys: redes33On,
  bang: (s) => (redes33On(s) ? Object.keys(redes33(s).hacked).length + boatos33(s).length : 0),
  open: (c) => embedRedes33(() => c.ctx.close()),
};
registerPhoneApp33(REDES_APP33);
registerPcApp33(REDES_APP33);
