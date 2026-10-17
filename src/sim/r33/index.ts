// R33 — versão 33 (docs/r33/PLANO.md). Cada mecânica nova atrás do seu interruptor `exp33.*` (desligado no código).
import './mapa33'; // MAPA33: cidade expandida e lote de cada tipo de prédio novo (`exp33.mapa`)
import './ligar33'; // QA33: ganchos entre as frentes ligados (cada um só vale com os interruptores das duas pontas)
// QA33 (decisão do dono, 2026-10-17): todos os interruptores exp33.* nascem LIGADOS (def: true em cada registro); continuam no
// editor (Ferramentas) para desligar regra por regra. Saves de antes da 33 podem ser descartados.
import './intro33sw'; // R33 INTRO33: intro da partida (exp33.intro, ligado por padrão)
import './aparelhos33'; // APARELHOS33: celular e computador, minijogos, toques, demo caseira, assistente, pirataria, assinatura e vazamento (`exp33.aparelhos`, ligado)
import './gente33'; // GENTE33 parte A: diretor de filial, CEO e conselho, equipe pessoal e pessoas fixas (`exp33.gente`, opt-in)
import './gente33b'; // GENTE33 parte B: três camadas, talento escondido, volta por cima, romance no elenco (`exp33.camadas/talento/volta/romance33`, ligados por padrão desde o QA33)
