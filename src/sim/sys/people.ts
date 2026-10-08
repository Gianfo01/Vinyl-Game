// Sistema "people" da rodada 4: humor em pilha de pensamentos, colapsos, saúde do músico, conversas
// e promessas, panelinhas, segredos, dono do selo como personagem, carreira da equipe, romances,
// fortuna pessoal, caixa de entrada por era, feed social e Mesa de negociação.
// A ordem dos imports (e do fechamento mensal abaixo) é fixa: determinismo.

import { registerSimHook } from '../ext4';
import { P } from './people/state';
import { thoughtsMonth } from './people/thoughts';
import { healthMonth } from './people/health';
import { breakdownsMonth } from './people/breakdowns';
import { promisesMonth } from './people/talks';
import { ownerMonth } from './people/owner';
import { socialMonth } from './people/social';
import { secretsMonth } from './people/secrets';
import { staffMonth } from './people/staff';
import { lifeMonth } from './people/life';
import { feedMonth } from './people/feed';
import { inboxMonth } from './people/inbox';
import './people/negotiation';

registerSimHook('month', 'people', (s, r) => {
  P(s);
  const signedBefore = s.flags['people:signed'] ?? s.player.stats.signed;
  ownerMonth(s, r, signedBefore);
  s.flags['people:signed'] = s.player.stats.signed;
  healthMonth(s, r);
  lifeMonth(s, r);
  socialMonth(s, r);
  secretsMonth(s, r);
  promisesMonth(s);
  staffMonth(s, r);
  feedMonth(s, r);
  thoughtsMonth(s);
  breakdownsMonth(s, r);
  inboxMonth(s, r);
});
