// R31 · onda 4 (GEO) — geografia real da cidade-sede no mapa isométrico (só aparência; nada aqui entra na simulação).
// O mapa é a grade gw×gh de campus18px (+gx = leste, +gy = sul). Fora da grade há quatro faixas, uma por lado:
//   n = norte (alto à direita, no fundo)   w = oeste (alto à esquerda, no fundo)
//   e = leste (baixo à direita, na frente) s = sul (baixo à esquerda, na frente)
// Cada cidade diz de que lado fica a água (mar, baía, rio, estreito, lago, lagoa), que margem tem (praia com
// calçadão, cais de pedra, costão), se o rio tem cidade na outra margem (pontes onde as ruas cruzam) e de que lado
// ficam os morros. Os lotes estão sempre DENTRO da grade, e a água sempre FORA dela: nenhum lote cai na água em
// nenhum tamanho de mapa (do centro 20×16 ao 44×32 dos bairros novos). Morros vão de preferência no fundo (n/w),
// onde o horizonte (skyline27) mostra o relevo. Ilha (água nos quatro lados) só onde é ilha mesmo.
// Cidades fora da tabela: terra em volta (campo e subúrbio continuando).

export type Side31 = 'n' | 'e' | 's' | 'w';
export const SIDES31: Side31[] = ['n', 'e', 's', 'w'];
export type WaterK31 = 'sea' | 'bay' | 'river' | 'strait' | 'lake' | 'lagoon';
export type Shore31 = 'beach' | 'quay' | 'rock';
export interface Water31 {
  side: Side31; k: WaterK31; nm: string; shore: Shore31;
  /** trecho do lado coberto (fração 0–1 ao longo do lado, de n→s ou de w→e) */ a: number; b: number;
  /** distância (células) da borda da grade até a água; o que fica antes é praia/calçadão, cais ou morro */ o: number;
  /** largura do rio/estreito (células); depois dela vem a outra margem. Mar/baía/lago não têm outra margem visível */ w: number;
  /** outra margem do rio/estreito: cidade (casario e pontes), morro ou campo */ far: 'city' | 'hills' | 'land';
  /** calçadão: ondas portuguesas (Rio) ou liso */ prom?: 'wave' | 'plain';
}
export interface Hill31 { side: Side31; amp: number; favela: boolean }
export interface Geo31 { city: string; water: Water31[]; hills: Hill31[]; note: string }

const RIVERISH = new Set<WaterK31>(['river', 'strait']);
export const isRiver31 = (w: Water31): boolean => RIVERISH.has(w.k);

/** Mini-linguagem: "lado:tipo:margem:Nome[@a-b][+o][~w][!far][*wave|*plain]" separados por ';'; morros "lado:amp[:f]". */
function g(city: string, water: string, hills: string, note: string): Geo31 {
  const ws: Water31[] = water ? water.split(';').map((s) => {
    const m = s.trim().match(/^([nesw]):([a-z]+):([a-z]+):([^@+~!*]+)(.*)$/);
    if (!m) throw new Error(`geo31 ${city}: ${s}`);
    const [, side, k, shore, nm, rest] = m;
    const ab = rest.match(/@([\d.]+)-([\d.]+)/), o = rest.match(/\+([\d.]+)/), w = rest.match(/~([\d.]+)/), far = rest.match(/!([a-z]+)/), pr = rest.match(/\*([a-z]+)/);
    const kk = k as WaterK31, sh = shore as Shore31;
    const riv = RIVERISH.has(kk);
    return { side: side as Side31, k: kk, nm: nm.trim(), shore: sh, a: ab ? +ab[1] : 0, b: ab ? +ab[2] : 1,
      o: o ? +o[1] : sh === 'beach' ? 1.5 : sh === 'quay' ? 0.55 : 0.45, w: w ? +w[1] : riv ? 3 : 99,
      far: (far?.[1] as Water31['far']) ?? (riv ? 'city' : 'land'), prom: (pr?.[1] as Water31['prom']) ?? (sh === 'beach' ? 'plain' : undefined) };
  }) : [];
  const hs: Hill31[] = hills ? hills.split(';').map((s) => { const [side, amp, f] = s.trim().split(':'); return { side: side as Side31, amp: +amp, favela: f === 'f' }; }) : [];
  return { city, water: ws, hills: hs, note };
}

const ROWS: Geo31[] = [
  // ---- Brasil
  g('rio', 's:sea:beach:Oceano Atlântico (Copacabana e Ipanema)*wave; e:bay:quay:Baía de Guanabara (cais do porto); n:bay:quay:Baía de Guanabara@0.55-1', 'w:1:f', 'Praia e calçadão de ondas ao sul, Baía de Guanabara a leste e no fim do norte (Pão de Açúcar na boca da baía), morros com favela e o Cristo a oeste; terra (Zona Norte) continua ao norte.'),
  g('salvador', 'w:bay:quay:Baía de Todos os Santos (Comércio); s:sea:beach:Oceano Atlântico (Barra)', 'n:0.55:f', 'Cidade Baixa e porto na baía a oeste, praia da Barra ao sul, encostas com casario ao norte.'),
  g('recife', 'e:sea:beach:Oceano Atlântico (Boa Viagem); s:river:quay:Rio Capibaribe~2', '', 'Mar a leste, Capibaribe cortando ao sul com pontes.'),
  g('fortaleza', 'n:sea:beach:Oceano Atlântico (Iracema)', '', 'Orla ao norte (Praia de Iracema).'),
  g('florianopolis', 'w:strait:quay:Baía Norte (ponte para o continente)~4', 'n:0.5', 'Centro na ilha virado para o continente: canal a oeste com a outra margem habitada; Morro da Cruz atrás.'),
  g('sao_luis', 'n:bay:quay:Baía de São Marcos; w:river:quay:Rio Bacanga~2!land', '', 'Baía de São Marcos ao norte, Rio Bacanga a oeste.'),
  g('belem', 'w:bay:quay:Baía do Guajará (Ver-o-Peso); s:river:quay:Rio Guamá~5!land', '', 'Cais do Ver-o-Peso na baía a oeste, Rio Guamá largo ao sul.'),
  g('manaus', 's:river:quay:Rio Negro~7!land', '', 'Porto no Rio Negro ao sul; floresta na outra margem.'),
  g('porto_alegre', 'w:lake:quay:Lago Guaíba', '', 'Orla do Guaíba a oeste.'),
  g('sao_paulo', '', 'n:0.3', 'Sem mar: terra e subúrbio em volta, Serra da Cantareira ao fundo.'),
  g('bh', '', 'w:0.6', 'Sem água; Serra do Curral ao fundo.'),
  g('brasilia', 'e:lake:quay:Lago Paranoá@0.3-1+2', '', 'Lago Paranoá a leste, cerrado em volta.'),
  g('curitiba', '', '', 'Terra em volta.'), g('goiania', '', '', 'Terra em volta.'), g('campinas', '', '', 'Terra em volta.'),
  // ---- América do Norte
  g('new_york', 'w:river:quay:Rio Hudson (Nova Jersey)~3; e:river:quay:East River (Brooklyn)~3', '', 'Manhattan: Hudson a oeste e East River a leste, com pontes; a ilha continua ao norte e ao sul (não vira ilha no mapa).'),
  g('los_angeles', 'w:sea:beach:Oceano Pacífico (Santa Monica)+6', 'n:0.6', 'Pacífico longe a oeste, Hollywood Hills ao norte.'),
  g('nashville', 'e:river:quay:Rio Cumberland~2', '', 'Rio Cumberland a leste com East Nashville do outro lado.'),
  g('new_orleans', 's:river:quay:Rio Mississippi~4; n:lake:quay:Lago Pontchartrain+7', '', 'Mississippi ao sul (o crescente), lago ao norte, longe.'),
  g('detroit', 's:river:quay:Rio Detroit (Windsor)~3', '', 'Rio Detroit ao sul, Windsor na outra margem.'),
  g('chicago', 'e:lake:beach:Lago Michigan', '', 'Lago Michigan a leste, com praia.'),
  g('memphis', 'w:river:quay:Rio Mississippi~4!land', '', 'Mississippi a oeste.'),
  g('seattle', 'w:bay:quay:Elliott Bay', 'e:0.3', 'Elliott Bay a oeste (cais), colinas a leste.'),
  g('mexico_city', '', 'e:0.6', 'Planalto sem água; vulcões ao fundo.'),
  g('austin', 's:river:quay:Rio Colorado (Lady Bird Lake)~2', 'w:0.3', 'Rio Colorado ao sul; Hill Country a oeste.'),
  g('atlanta', '', '', 'Terra em volta.'),
  g('philadelphia', 'e:river:quay:Rio Delaware (Camden)~3', '', 'Rio Delaware a leste.'),
  g('san_francisco', 'e:bay:quay:Baía de São Francisco (Embarcadero); n:bay:quay:Golden Gate', 'w:0.6', 'Baía a leste e ao norte, colinas (Twin Peaks) a oeste.'),
  g('miami', 'e:strait:quay:Baía de Biscayne (Miami Beach)~4', '', 'Baía de Biscayne a leste com Miami Beach na outra margem.'),
  g('toronto', 's:lake:quay:Lago Ontário', '', 'Lago Ontário ao sul.'),
  g('montreal', 'e:river:quay:Rio São Lourenço~4!land', 'w:0.4', 'São Lourenço a leste, Mont Royal a oeste.'),
  g('vancouver', 'n:strait:quay:Burrard Inlet~3!hills; w:sea:beach:English Bay@0.5-1', 'n:0.9', 'Burrard Inlet ao norte com montanhas na outra margem, English Bay a oeste.'),
  g('minneapolis', 'e:river:quay:Rio Mississippi~2', '', 'Mississippi a leste.'),
  g('houston', '', '', 'Planície sem água no centro.'),
  g('cleveland', 'n:lake:quay:Lago Erie', '', 'Lago Erie ao norte.'),
  g('boston', 'e:bay:quay:Boston Harbor; n:river:quay:Rio Charles (Cambridge)~2@0-0.6', '', 'Porto a leste, Rio Charles ao norte com Cambridge do outro lado.'),
  g('kansas_city', 'n:river:quay:Rio Missouri~3!land', '', 'Rio Missouri ao norte.'),
  g('washington', 's:river:quay:Rio Potomac (Arlington)~3', '', 'Potomac ao sul.'),
  g('las_vegas', '', 'w:0.5', 'Deserto; serras ao fundo.'),
  g('honolulu', 's:sea:beach:Waikiki; w:bay:quay:Porto de Honolulu; n:sea:rock:Oceano Pacífico+7; e:sea:rock:Oceano Pacífico+5', 'n:0.8; e:0.4', 'Ilha (Oahu): Waikiki ao sul, porto a oeste, Ko\'olau ao norte e Diamond Head a leste, mar além dos morros.'),
  // ---- América Latina e Caribe
  g('buenos_aires', 'e:river:quay:Rio da Prata (Puerto Madero)~40!land', '', 'Rio da Prata a leste (sem outra margem à vista).'),
  g('havana', 'n:sea:rock:Malecón*plain; e:bay:quay:Baía de Havana@0.4-1', '', 'Malecón ao norte, baía e porto a leste.'),
  g('bogota', '', 'e:0.9', 'Sem água; Monserrate a leste.'),
  g('kingston', 's:bay:quay:Kingston Harbour', 'n:0.75', 'Porto ao sul, Blue Mountains ao norte.'),
  g('lima', 'w:sea:rock:Oceano Pacífico (Costa Verde)+1', '', 'Falésias da Costa Verde a oeste.'),
  g('santiago', 'n:river:quay:Rio Mapocho~1.5', 'e:1', 'Mapocho ao norte; Andes a leste.'),
  g('caracas', '', 'n:0.9:f', 'Vale sem mar; Ávila ao norte, ranchos nas encostas.'),
  g('medellin', '', 'w:0.8:f; n:0.6', 'Vale entre montanhas, comunas nas encostas.'),
  g('cali', '', 'w:0.7', 'Cordilheira a oeste.'),
  g('san_juan', 'n:sea:beach:Oceano Atlântico (Condado); s:bay:quay:Baía de San Juan', '', 'Praia ao norte, baía e porto ao sul.'),
  g('monterrey', '', 'w:0.9', 'Cerro de la Silla ao fundo.'),
  g('guadalajara', '', '', 'Terra em volta.'),
  g('montevideo', 's:sea:beach:Rio da Prata (Rambla); w:bay:quay:Baía de Montevidéu@0-0.6', '', 'Rambla ao sul, porto a oeste.'),
  g('panama', 's:bay:quay:Baía do Panamá (Cinta Costera)', '', 'Baía do Panamá ao sul.'),
  g('santo_domingo', 's:sea:rock:Mar do Caribe (Malecón)*plain; e:river:quay:Rio Ozama~2', '', 'Malecón ao sul, Rio Ozama a leste.'),
  g('port_of_spain', 'w:bay:quay:Golfo de Paria', 'n:0.7', 'Golfo de Paria a oeste, morros ao norte.'),
  g('cartagena', 'w:sea:beach:Mar do Caribe (Bocagrande); s:bay:quay:Baía de Cartagena@0.4-1', '', 'Praia a oeste, baía ao sul.'),
  g('port_au_prince', 'w:bay:quay:Baía de Porto Príncipe', 'n:0.8:f', 'Baía a oeste, morros com casario.'),
  g('pointe_a_pitre', 's:bay:quay:Petit Cul-de-Sac', '', 'Porto ao sul.'),
  // ---- Europa
  g('london', 'n:river:quay:Rio Tâmisa (South Bank)~3', '', 'O Tâmisa corta a cidade (lado norte do mapa), com pontes nas ruas e a South Bank do outro lado.'),
  g('manchester', '', '', 'Terra em volta (canais pequenos).'),
  g('liverpool', 'w:river:quay:Rio Mersey (Birkenhead)~5', '', 'Docas no Mersey a oeste.'),
  g('paris', 's:river:quay:Rio Sena (Rive Gauche)~2', 'n:0.35', 'O Sena corta a cidade (lado sul do mapa) com pontes; Montmartre ao norte.'),
  g('berlin', 'n:river:quay:Rio Spree~1.5', '', 'O Spree ao norte.'),
  g('stockholm', 's:strait:quay:Strömmen (Södermalm)~2; e:bay:quay:Saltsjön', '', 'Canal ao sul com Södermalm do outro lado, Saltsjön a leste.'),
  g('milan', '', '', 'Planície sem água.'),
  g('dublin', 's:river:quay:Rio Liffey~1.5; e:bay:beach:Baía de Dublin+4', '', 'Liffey ao sul, baía a leste.'),
  g('lisbon', 'w:river:quay:Rio Tejo (Almada)~8!hills; s:river:quay:Rio Tejo~8!hills@0-0.5', 'n:0.5', 'Tejo largo a oeste e ao sul (Belém, ponte 25 de Abril), colinas ao norte.'),
  g('madrid', '', '', 'Planalto sem água: terra em volta.'),
  g('barcelona', 'e:sea:beach:Mar Mediterrâneo (Barceloneta); s:bay:quay:Port Vell@0-0.5', 'w:0.55', 'Praia a leste, porto ao sul, Montjuïc/Tibidabo a oeste.'),
  g('sevilla', 'w:river:quay:Rio Guadalquivir (Triana)~2', '', 'Guadalquivir a oeste com Triana na outra margem.'),
  g('ibiza', 's:bay:quay:Porto de Ibiza; e:sea:beach:Mar Mediterrâneo@0.5-1', 'n:0.4', 'Porto ao sul, Dalt Vila no alto.'),
  g('rome', 'w:river:quay:Rio Tibre (Trastevere)~1.5', 'e:0.3', 'Tibre a oeste, colinas a leste.'),
  g('naples', 's:bay:quay:Golfo de Nápoles', 'e:0.8', 'Golfo ao sul, Vesúvio a leste.'),
  g('amsterdam', 'n:river:quay:Rio IJ (Noord)~3', '', 'O IJ ao norte.'),
  g('rotterdam', 's:river:quay:Nieuwe Maas~4', '', 'Nieuwe Maas ao sul, porto.'),
  g('brussels', '', '', 'Terra em volta.'),
  g('vienna', 'e:river:quay:Rio Danúbio~3', '', 'Danúbio a leste.'),
  g('budapest', 'w:river:quay:Rio Danúbio (Buda)~4!hills', '', 'Pest no mapa; Danúbio a oeste com as colinas de Buda do outro lado.'),
  g('prague', 'w:river:quay:Rio Vltava (Malá Strana)~2!hills', '', 'Vltava a oeste, castelo no alto da outra margem.'),
  g('warsaw', 'e:river:quay:Rio Vístula~3', '', 'Vístula a leste.'),
  g('moscow', 's:river:quay:Rio Moscova~2', '', 'Rio Moscova ao sul.'),
  g('st_petersburg', 'n:river:quay:Rio Neva~4; w:bay:quay:Golfo da Finlândia+5', '', 'Neva ao norte, golfo a oeste.'),
  g('kyiv', 'e:river:quay:Rio Dnipro~5!land', 'w:0.3', 'Dnipro a leste.'),
  g('belgrade', 'w:river:quay:Rio Sava~3', '', 'Sava a oeste.'),
  g('athens', 's:sea:beach:Golfo Sarônico+5', 'n:0.6', 'Mar longe ao sul, colinas (Licabeto) ao norte.'),
  g('copenhagen', 'e:strait:quay:Porto de Copenhague (Christianshavn)~2', '', 'Canal do porto a leste com Christianshavn do outro lado.'),
  g('oslo', 's:bay:quay:Oslofjord', 'n:0.6', 'Fiorde ao sul, colinas ao norte.'),
  g('helsinki', 's:sea:quay:Mar Báltico; e:sea:quay:Mar Báltico@0.5-1', '', 'Mar ao sul e a leste (península).'),
  g('reykjavik', 'n:bay:quay:Baía de Faxaflói', 'e:0.5', 'Baía ao norte, Esja ao fundo.'),
  g('glasgow', 's:river:quay:Rio Clyde~2', '', 'Clyde ao sul.'),
  g('bristol', 's:river:quay:Rio Avon~1.5', '', 'Avon ao sul.'),
  g('birmingham', '', '', 'Terra em volta.'),
  g('sheffield', '', 'w:0.4', 'Colinas a oeste.'),
  g('hamburg', 's:river:quay:Rio Elba (porto)~5!land', '', 'Porto no Elba ao sul.'),
  g('munich', 'e:river:quay:Rio Isar~1.5', '', 'Isar a leste.'),
  g('cologne', 'e:river:quay:Rio Reno~4', '', 'Reno a leste.'),
  g('marseille', 'w:bay:quay:Vieux-Port; s:sea:rock:Mar Mediterrâneo', 'n:0.5', 'Vieux-Port a oeste, costão ao sul, Notre-Dame de la Garde no alto.'),
  g('porto', 's:river:quay:Rio Douro (Gaia)~3!hills', 'n:0.4', 'Douro ao sul com Gaia na encosta do outro lado.'),
  g('bordeaux', 'e:river:quay:Rio Garonne~3', '', 'Garonne a leste.'),
  g('lyon', 'e:river:quay:Rio Ródano~2', 'w:0.4', 'Ródano a leste, Fourvière a oeste.'),
  g('turin', 'e:river:quay:Rio Pó~2!hills', 'e:0.5', 'Pó a leste com a colina do outro lado.'),
  // ---- Ásia
  g('tokyo', 'e:river:quay:Rio Sumida~1.5; s:bay:quay:Baía de Tóquio@0.5-1+3', '', 'Sumida a leste, baía ao sul.'),
  g('seoul', 's:river:quay:Rio Han~4', 'n:0.7', 'Rio Han ao sul, Bukhansan ao norte.'),
  g('mumbai', 'w:sea:rock:Mar Arábico (Marine Drive)*plain; s:sea:quay:Mar Arábico; e:bay:quay:Porto de Mumbai', '', 'Península: Marine Drive a oeste, mar ao sul, porto a leste; terra ao norte.'),
  g('hong_kong', 'n:strait:quay:Victoria Harbour (Kowloon)~4; e:sea:quay:Mar do Sul da China; s:sea:rock:Mar do Sul da China+3; w:sea:rock:Mar do Sul da China+6', 'w:0.9', 'Ilha de Hong Kong: Victoria Harbour ao norte com Kowloon do outro lado, Peak a oeste, mar em volta.'),
  g('bangkok', 'w:river:quay:Rio Chao Phraya~3', '', 'Chao Phraya a oeste.'),
  g('beirut', 'n:sea:rock:Mar Mediterrâneo (Corniche)*plain; w:sea:beach:Mar Mediterrâneo', 'e:0.7', 'Corniche ao norte, praia a oeste, montanhas a leste.'),
  g('istanbul', 'e:strait:quay:Bósforo (lado asiático)~4; n:bay:quay:Chifre de Ouro@0-0.6; s:sea:quay:Mar de Mármara', '', 'Bósforo a leste com a Ásia do outro lado, Chifre de Ouro ao norte, Mármara ao sul.'),
  g('chennai', 'e:sea:beach:Golfo de Bengala (Marina Beach)', '', 'Marina Beach a leste.'),
  g('karachi', 's:sea:quay:Mar Arábico (porto)', '', 'Porto ao sul.'),
  g('lahore', 'n:river:quay:Rio Ravi~2!land', '', 'Ravi ao norte.'),
  g('tehran', '', 'n:1', 'Sem água; Alborz ao norte.'),
  g('tel_aviv', 'w:sea:beach:Mar Mediterrâneo', '', 'Praia a oeste.'),
  g('dubai', 'w:sea:beach:Golfo Pérsico; e:river:quay:Dubai Creek (Deira)~2', '', 'Praia a oeste, Creek a leste com Deira do outro lado.'),
  g('busan', 's:bay:quay:Porto de Busan', 'n:0.8', 'Porto ao sul, morros ao norte.'),
  g('osaka', 'n:river:quay:Rio Yodo~2; w:bay:quay:Baía de Osaka+3', '', 'Yodo ao norte, baía a oeste.'),
  g('shanghai', 'e:river:quay:Rio Huangpu (Pudong)~3', '', 'O Bund no Huangpu a leste, Pudong na outra margem.'),
  g('beijing', '', 'w:0.5', 'Sem água; Montanhas do Oeste ao fundo.'),
  g('taipei', 'w:river:quay:Rio Tamsui~2', 'e:0.6', 'Tamsui a oeste, montanhas a leste.'),
  g('manila', 'w:bay:beach:Baía de Manila (Roxas); n:river:quay:Rio Pasig~2', '', 'Baía a oeste, Pasig ao norte.'),
  g('jakarta', 'n:sea:quay:Mar de Java', '', 'Porto ao norte.'),
  g('singapore', 's:sea:quay:Marina Bay; e:sea:beach:East Coast; w:sea:quay:Estreito de Singapura+6; n:strait:quay:Estreito de Johor+6~3!land', '', 'Ilha: Marina Bay ao sul, East Coast a leste, estreitos ao longe.'),
  g('kuala_lumpur', '', 'e:0.4', 'Sem água; colinas a leste.'),
  g('ho_chi_minh', 'e:river:quay:Rio Saigon~3!land', '', 'Rio Saigon a leste.'),
  g('delhi', 'e:river:quay:Rio Yamuna~3', '', 'Yamuna a leste.'),
  g('kolkata', 'w:river:quay:Rio Hooghly (Howrah)~4', '', 'Hooghly a oeste com Howrah do outro lado.'),
  // ---- África
  g('lagos', 's:lagoon:quay:Laguna de Lagos~4', '', 'Laguna ao sul.'),
  g('johannesburg', '', '', 'Planalto sem água.'),
  g('cairo', 'w:river:quay:Rio Nilo (Gizé)~3', '', 'Nilo a oeste com Gizé do outro lado.'),
  g('dakar', 'w:sea:beach:Oceano Atlântico; s:sea:rock:Oceano Atlântico', '', 'Península: praia a oeste, costão ao sul.'),
  g('accra', 's:sea:beach:Golfo da Guiné', '', 'Praia ao sul.'),
  g('nairobi', '', '', 'Planalto sem água.'),
  g('kinshasa', 'n:river:quay:Rio Congo (Brazzaville)~7', '', 'Rio Congo ao norte, Brazzaville do outro lado.'),
  g('addis_ababa', '', 'n:0.7', 'Planalto, montes Entoto ao norte.'),
  g('abidjan', 's:lagoon:quay:Laguna Ébrié~4', '', 'Laguna ao sul.'),
  g('bamako', 's:river:quay:Rio Níger~5', '', 'Níger ao sul.'),
  g('luanda', 'w:bay:quay:Baía de Luanda (Marginal)', '', 'Marginal na baía a oeste.'),
  g('maputo', 's:bay:quay:Baía de Maputo', '', 'Baía ao sul.'),
  g('cape_town', 'n:bay:quay:Table Bay (V&A Waterfront)', 'w:1', 'Table Bay ao norte, Table Mountain no fundo à esquerda.'),
  g('durban', 'e:sea:beach:Oceano Índico (Golden Mile); s:bay:quay:Porto de Durban@0-0.4', '', 'Golden Mile a leste, porto ao sul.'),
  g('harare', '', '', 'Planalto sem água.'),
  g('casablanca', 'n:sea:quay:Oceano Atlântico (porto)', '', 'Porto ao norte.'),
  g('algiers', 'n:bay:quay:Baía de Argel', 'w:0.6', 'Baía ao norte, Casbah na encosta.'),
  g('oran', 'n:sea:quay:Mar Mediterrâneo (porto)', 'w:0.6', 'Porto ao norte, Murdjajo a oeste.'),
  g('tunis', 'e:lake:quay:Lago de Túnis', '', 'Lago de Túnis a leste.'),
  g('dar_es_salaam', 'e:sea:beach:Oceano Índico; s:bay:quay:Porto de Dar es Salaam@0.4-1', '', 'Mar a leste, porto ao sul.'),
  g('zanzibar', 'w:sea:beach:Oceano Índico (Stone Town)', '', 'Stone Town virada para o mar a oeste.'),
  g('kampala', '', 'w:0.4; n:0.4', 'Sete colinas; Lago Vitória longe.'),
  // ---- Oceania
  g('sydney', 'n:strait:quay:Port Jackson (North Shore)~4', '', 'O porto de Sydney ao norte (Opera House, Harbour Bridge) com a North Shore do outro lado.'),
  g('melbourne', 's:river:quay:Rio Yarra (Southbank)~2; w:bay:beach:Port Phillip+3', '', 'Yarra ao sul, baía a oeste.'),
  g('auckland', 'n:strait:quay:Waitematā Harbour (North Shore)~4', 'w:0.3', 'Porto ao norte, cones vulcânicos.'),
  g('wellington', 'e:bay:quay:Porto de Wellington', 'w:0.7', 'Porto a leste, morros a oeste.'),
  g('dunedin', 'n:bay:quay:Otago Harbour', 'w:0.6', 'Porto ao norte, morros a oeste.'),
  g('brisbane', 's:river:quay:Rio Brisbane~2', '', 'Rio Brisbane ao sul.'),
  g('perth', 's:river:quay:Rio Swan~5; w:sea:beach:Oceano Índico+6', '', 'Swan largo ao sul, Índico longe a oeste.'),
  g('adelaide', 'w:sea:beach:Golfo de São Vicente+5', 'e:0.5', 'Mar a oeste, Mount Lofty a leste.'),
  g('suva', 's:bay:quay:Porto de Suva', 'n:0.4', 'Porto ao sul.'),
];

export const GEO31: Record<string, Geo31> = Object.fromEntries(ROWS.map((r) => [r.city, r]));
/** Cidades que são ilha (água nos quatro lados). Fora daqui nenhuma cidade fica cercada de água. */
export const ISLANDS31 = new Set(['honolulu', 'hong_kong', 'singapore']);
const LAND31: Geo31 = { city: '', water: [], hills: [], note: 'Terra em volta.' };
export const geo31 = (city: string): Geo31 => GEO31[city] ?? { ...LAND31, city };

/** Ilha = água nos quatro lados. */
export const isIsland31 = (gg: Geo31): boolean => SIDES31.every((sd) => gg.water.some((w) => w.side === sd));

// ---------------------------------------------------------------- terreno fora da grade (puro; usado pelo desenho e pelos testes)

export type Ter31 = 'land' | 'prom' | 'sand' | 'quay' | 'rock' | 'water' | 'farbank' | 'hill';
export interface At31 { t: Ter31; side?: Side31; w?: Water31; /** profundidade na água (células; >0) */ d?: number; /** distância da borda (células) */ e: number; hill?: Hill31 }
/** Distância de (gx, gy) à grade por lado e posição ao longo do lado (0–1). */
export function sideOf31(gx: number, gy: number, gw: number, gh: number): { side: Side31; e: number; t: number }[] {
  const out: { side: Side31; e: number; t: number }[] = [];
  if (gy < 0) out.push({ side: 'n', e: -gy, t: gx / gw });
  if (gx >= gw) out.push({ side: 'e', e: gx - gw, t: gy / gh });
  if (gy >= gh) out.push({ side: 's', e: gy - gh, t: gx / gw });
  if (gx < 0) out.push({ side: 'w', e: -gx, t: gy / gh });
  return out;
}
/** O que há em (gx, gy): dentro da grade é sempre 'land' (cidade); fora, segue a tabela. */
export function terrainAt31(gg: Geo31, gx: number, gy: number, gw: number, gh: number): At31 {
  const sides = sideOf31(gx, gy, gw, gh);
  if (!sides.length) return { t: 'land', e: 0 };
  let best: At31 | null = null;
  const rank: Record<Ter31, number> = { water: 7, quay: 6, rock: 6, sand: 5, prom: 4, farbank: 3, hill: 2, land: 1 };
  for (const { side, e, t } of sides) {
    for (const w of gg.water) {
      if (w.side !== side) continue;
      const L = side === 'n' || side === 's' ? gw : gh;
      // fora do trecho: a costa fecha em ângulo (a água entra a partir de a/b ao longo do lado)
      const lat = Math.min(w.a <= 0 ? 99 : (t - w.a) * L, w.b >= 1 ? 99 : (w.b - t) * L);
      if (lat < -0.6) continue;
      const riv = isRiver31(w);
      const d0 = e - w.o, d1 = riv ? w.o + w.w - e : 99;
      let a: At31;
      if (riv && d1 < 0) a = d1 > -0.45 ? { t: 'quay', side, w, e } : { t: w.far === 'land' ? 'land' : w.far === 'hills' ? 'hill' : 'farbank', side, w, e };
      else if (d0 >= 0 && lat >= 0) a = { t: 'water', side, w, d: Math.min(d0, d1, lat), e };
      else if (d0 >= -0.45 && d0 < 0 && lat >= -0.6) a = { t: w.shore === 'beach' ? 'sand' : w.shore, side, w, e };
      else if (w.shore === 'beach' && d0 < 0 && lat >= -0.6 && e >= Math.max(0, w.o - 1.5) && e < w.o) a = { t: e < Math.min(0.55, w.o - 0.5) ? 'prom' : 'sand', side, w, e };
      else if (lat < 0) a = { t: w.shore === 'beach' ? 'sand' : w.shore === 'rock' ? 'rock' : 'quay', side, w, e };
      else continue;
      if (!best || rank[a.t] > rank[best.t]) best = a;
    }
    if (!best || best.t === 'land') {
      const h = gg.hills.find((x) => x.side === side && x.amp >= 0.6); // morro baixo fica só no horizonte
      if (h && e > 0.6) best = { t: 'hill', side, e, hill: h };
    }
  }
  return best ?? { t: 'land', e: sides[0].e, side: sides[0].side };
}
/** Lados com água de cada tipo (para o horizonte). */
export const waterSides31 = (gg: Geo31): Set<Side31> => new Set(gg.water.filter((w) => w.o < 5).map((w) => w.side));
export const hillOn31 = (gg: Geo31, side: Side31): Hill31 | undefined => gg.hills.find((h) => h.side === side);

// ---------------------------------------------------------------- orientação do mapa por cidade
// A tabela acima está na bússola real. O mapa do jogo tem bairros fixos (lotes são dado de jogo: a vizinhança entre eles
// entra na simulação): o PORTO e a estação ficam na borda leste/sudeste (lotes 31–42) e a ZONA DAS CASAS DE SHOW na borda
// sul/sudoeste (lotes da boemia). Em vez de mover lotes, o mapa de cada cidade é GIRADO/ESPELHADO (8 orientações) para
// que o porto encoste na água do porto, a boemia fique na orla da praia e os morros fiquem no fundo, onde o horizonte
// os mostra. A geografia continua a mesma — só muda de que lado da tela ela aparece.

/** Matriz [a, b, c, d] sobre o quadrado do mapa (x de oeste→leste, y de norte→sul): x' = a·x + b·y, y' = c·x + d·y. */
export type Xf31 = [number, number, number, number];
export const XF31: Xf31[] = [[1, 0, 0, 1], [0, -1, 1, 0], [-1, 0, 0, -1], [0, 1, -1, 0], [-1, 0, 0, 1], [1, 0, 0, -1], [0, 1, 1, 0], [0, -1, -1, 0]];
const pt31 = (sd: Side31, t: number): [number, number] => (sd === 'n' ? [2 * t - 1, -1] : sd === 'e' ? [1, 2 * t - 1] : sd === 's' ? [2 * t - 1, 1] : [-1, 2 * t - 1]);
const ap31 = (m: Xf31, [x, y]: [number, number]): [number, number] => [m[0] * x + m[1] * y, m[2] * x + m[3] * y];
const sideAt31 = ([x, y]: [number, number]): Side31 => (y <= -0.999 ? 'n' : y >= 0.999 ? 's' : x >= 0.999 ? 'e' : 'w');
const tOn31 = (sd: Side31, [x, y]: [number, number]): number => Math.round(((sd === 'n' || sd === 's' ? x : y) + 1) * 500) / 1000;
/** Geografia vista com a matriz m (lados e trechos trocados; o resto igual). */
export function xfGeo31(g: Geo31, m: Xf31): Geo31 {
  const side = (sd: Side31) => sideAt31(ap31(m, pt31(sd, 0.5)));
  return { ...g, water: g.water.map((w) => {
    const sd = side(w.side), ta = tOn31(sd, ap31(m, pt31(w.side, w.a))), tb = tOn31(sd, ap31(m, pt31(w.side, w.b)));
    return { ...w, side: sd, a: Math.min(ta, tb), b: Math.max(ta, tb) };
  }), hills: g.hills.map((h) => ({ ...h, side: side(h.side) })) };
}
/** Nota da orientação: o porto (lotes do leste) pede a água do porto a leste no trecho 0,55–0,75; a boemia (sul) pede a
 *  praia ao sul no trecho 0,1–0,4; morros valem no fundo (n/w) e atrapalham na frente. Sem nada a ganhar, fica a bússola real. */
export function orientScore31(g: Geo31): number {
  const cov = (w: Water31, t: number) => w.a <= t && w.b >= t && w.o < 3;
  let sc = 0;
  const port = g.water.filter((w) => w.shore === 'quay' && w.k !== 'lake');
  if (port.some((w) => w.side === 'e' && cov(w, 0.65))) sc += 3;
  else if (g.water.some((w) => w.side === 'e' && cov(w, 0.65))) sc += 1.5;
  const beach = g.water.filter((w) => w.shore === 'beach');
  if (beach.some((w) => w.side === 's' && cov(w, 0.25))) sc += 2;
  else if (beach.some((w) => w.side === 'e' && cov(w, 0.65))) sc += 0.5;
  for (const h of g.hills) sc += h.amp < 0.3 ? 0 : h.side === 'n' || h.side === 'w' ? 1 : -2;
  return sc;
}
const ORIENT31 = new Map<string, Geo31 & { xf: number }>();
/** Geografia como aparece no mapa do jogo (orientada para o porto, a orla e os morros no fundo). */
export function mapGeo31(city: string): Geo31 & { xf: number } {
  const hit = ORIENT31.get(city);
  if (hit) return hit;
  const g = geo31(city);
  let best = { ...g, xf: 0 }, bs = orientScore31(g) + 0.6;
  XF31.forEach((m, i) => { if (!i) return; const x = xfGeo31(g, m), sc = orientScore31(x) + (i < 4 ? 0.3 : 0); if (sc > bs + 1e-9) { bs = sc; best = { ...x, xf: i }; } });
  ORIENT31.set(city, best);
  return best;
}
