// Icelandic translations for all UI strings
export const t = {
  // Tabs
  tabs: {
    dashboard: '📊 Yfirlit',
    players:   '🏆 Leikmenn',
    cards:     '♣ Spil',
    history:   '📖 Leikasaga',
    funfacts:  '🌟 Skemmtilegar staðreyndir',
    suggester: '🎲 Ríkistillögur',
  },

  // Dashboard
  dashboard: {
    totalGames:       'Leikir alls',
    activePlayers:    'Virkir leikmenn',
    locations:        'Staðir',
    avgScore:         'Meðalskor',
    avgScoreSub:      'á leikmann á leik',
    topWinner:        'Besti sigurvegari',
    wins:             'sigrar',
    mostDedicated:    'Hollastur',
    games:            'leikir',
    victoryTypes:     'SIGURTEGUNDIR',
    expansions:       'VINSÆLUSTU VIÐBÆTUR',
    gamesPerMonth:    'LEIKIR Á MÁNUÐI',
    avgScoreTrend:    'MEÐALSKOR Á LEIK (þróun)',
    participation:    'ÞÁTTTAKA LEIKENDA',
    randomCard:       'Handahófskennt spil',
    timesPlayed:      'Sinnum spilað',
    inPctOfGames:     'Í % spila',
    recentGames:      'Nýlegir leikir',
    won:              'vann',
  },

  // Players
  players: {
    title:         'Röðun leikenda',
    winRate:       'SAMANBURÐUR Á SIGURHLUTFALLI',
    placement:     'DREIFING SÆTA',
    sortBy:        'Raða eftir:',
    sortGames:     'Leikir',
    sortWinRate:   'Sigurhlutfall',
    sortGpa:       'Meðalskor',
    sortWins:      'Sigrar',
    colRank:       '#',
    colPlayer:     'Leikmaður',
    colGames:      'Leikir',
    col1st:        '1.',
    col2nd:        '2.',
    col3rd:        '3.',
    col4th:        '4.',
    colWinRate:    'Sigurhlutfall',
    colAvgScore:   'Meðalskor',
    scoreHistory:  'SKOGSAGA',
    favCards:      'UPPÁHALDSKORTIN Í SIGURLEIKUM',
  },

  // Cards
  cards: {
    title:        'Kortaskoðari',
    search:       'Leita að spili...',
    mostUsed:     'Mest notað fyrst',
    leastUsed:    'Minnst notað fyrst',
    alpha:        'Í stafrófsröð',
    byCost:       'Eftir verði',
    reverseHint:  'Öfug röð',
    reversed:     '↑ Öfug',
    normal:       '↓ Venjuleg',
    allTypes:     'Allar tegundir',
    allExp:       'Allar viðbætur',
    hideRemoved:  'Fela fjarlægð',
    hideBase:     'Fela grunnkort',
    cardCount:    n => `${n} spil`,
  },

  // History
  history: {
    title:        'Leikasaga',
    search:       'Leita eftir leikmann, korti, stað...',
    filterPlayer: 'Sía eftir leikmann…',
    allExp:       'Allar viðbætur',
    allVictory:   'Allar sigurtegundir',
    victoryProv:  'Héraðið',
    victoryCol:   'Nýlendur',
    victorySupply:'Birgðahrúgar',
    playersLabel: 'Leikmenn:',
    clearFilter:  'Hreinsa',
    gameCount:    n => `${n} leik${n === 1 ? 'ur' : 'ir'}`,
    withAll:      n => `með alla ${n} leikendur`,
    pts:          'stig',
  },

  // Fun Facts
  funfacts: {
    title: 'Skemmtilegar staðreyndir & met klúbbsins',
    facts: {
      lostToHistory: {
        title: 'Glatað í sögunni',
        value: n => `${n} leik${n === 1 ? 'ur' : 'ir'} óskráðir`,
        desc:  (first, n) => `Færslur hefjast á leik #${first}. Fyrstu ${n} leikirnir voru spilaðir áður en nokkur hugðist halda utan um þá — glataðir í sögunni!`,
      },
      homeTurf: {
        title: 'Heimavöllur',
        desc:  (loc, n) => `Uppáhaldsstaðurinn — ${n} leikir spilaðir þar. Ekkert eins og heimavöllur!`,
      },
      peakSeason: {
        title: 'Fjölmennastur mánuður',
        desc:  n => `Fjölmennasti mánuður klúbbsins með ${n} leiki. Sumarleg Dominion er sérstök!`,
      },
      highScore: {
        title: 'Hæsta skor nokkurnsinm',
        value: n => `${n} stig`,
        desc:  (name, game, date) => `${name} í leik #${game}${date ? ` (${date})` : ''} — met í stigafjölda allra tíma`,
      },
      highestScoringGame: {
        title: 'Stiagríkasti leikurinn',
        value: n => `${n} stig alls`,
        desc:  (game, date) => `Leikur #${game}${date ? ` (${date})` : ''} — flestu stig á einum leik`,
      },
      lowScore: {
        title: 'Lægsta skor',
        value: n => `${n} stig`,
        desc:  (name, game, date) => `${name} í leik #${game}${date ? ` (${date})` : ''} — við tölum ekki um þetta`,
      },
      biggestBlowout: {
        title: 'Stærsti sigur',
        value: n => `${n} stiga munur`,
        desc:  (game, winner, ws, loser, ls) => `Leikur #${game}: ${winner} (${ws}) bræðdi ${loser} (${ls}). Algert yfirburðaspil.`,
      },
      deadHeats: {
        title: 'Jafnar lokur',
        value: n => `${n} jafnir leikir`,
        desc:  (nums) => `${nums} — 1. og 2. sæti enduðu með sömu stig. Leikniður þurfti að ráða úrslitum!`,
      },
      nailBiter: {
        title: 'Spennumesta leikurinn',
        value: n => `${n} stiga munur`,
        desc:  (game, winner, runner, gap, date) => `Leikur #${game}: ${winner} vann yfir ${runner} með aðeins ${gap} stigi${gap !== 1 ? 'um' : ''}${date ? ` (${date})` : ''}`,
      },
      highAvgScore: {
        title: 'Hæsta meðalskor',
        value: n => `${n} stig`,
        desc:  (name, gpa) => `${name} er með ${gpa} meðalstig á leik (min. 5 metin leikir)`,
      },
      winStreak: {
        title: 'Lengsta sigurröð',
        value: n => `${n} í röð`,
        desc:  (name, n) => `${name} fór á óstöðvanlegt skrið — ${n} sigurleikar í röð`,
      },
      runnerUp: {
        title: 'Smiður á 2. sæti',
        value: n => `${n}× í 2. sæti`,
        desc:  name => `${name} hefur lokið í 2. sæti fleiri sinnum en nokkur annar. Svo nálægt, svo oft — silfursætisgengni!`,
      },
      generousLoser: {
        title: 'Hinn góðgjarna taparinn',
        value: n => `${n} síðustu sæti`,
        desc:  (name, n) => `${name} hefur gjöfult lagt ${n} síðustu sæti til tölfræðinnar. Sérhver klúbbur þarf einhvern til að halda egói annarra í skefjum.`,
      },
      neverWon: {
        title: 'Enn í leit að dýrðinni',
        value: n => `${n} leikmaður${n !== 1 ? 'menn' : ''}`,
        desc:  names => `${names} — hefur ekki unnið enn. Sérhver meistari var einu sinni byrjandi!`,
      },
      expExplorer: {
        title: 'Viðbótar-rannsakandi',
        desc:  (name, n) => `${name} hefur spilað í leikjum með ${n} mismunandi viðbætur — fjölbreyttastur leikmanna`,
      },
      mostBeloved: {
        title: 'Uppáhaldskortin',
        desc:  (name, n) => `Kom fyrir í ${n} ríkjum — uppáhald klúbbsins`,
      },
      powerCouple: {
        title: 'Kraftapari',
        desc:  (c1, c2, n) => `Þessi tvö spil hafa verið í sama ríki ${n} sinnum — skapaðar fyrir hvort annað`,
      },
      forgotten: {
        title: 'Gleymda kortið',
        desc:  (name, n) => `Kom aðeins fyrir ${n} sinni${n !== 1 ? 'um' : ''} — greinilega ekki vinsælt`,
      },
      untouched: {
        title: 'Ósnert spil',
        value: n => `${n} spil`,
        desc:  (names, extra) => `${names}${extra} — hafa aldrei komið í ríki`,
      },
      biggestGame: {
        title: 'Stærsti leikurinn',
        value: n => `${n} leikmenn`,
        desc:  (num, names) => `Leikur #${num} — ${names}`,
      },
      largestKingdom: {
        title: 'Stærsta ríkið',
        value: n => `${n} spil`,
        desc:  num => `Leikur #${num} var með flest ríkiskort`,
      },
      favFormat: {
        title: 'Uppáhalds snið',
        value: n => `${n}-manns`,
        desc:  (n, total, pct) => `${n} af ${total} leikjum (${pct}%) eru ${n}-manns leikir. Uppáhalds sniðið.`,
      },
      avgGameSize: {
        title: 'Meðalstærð leiks',
        desc:  'Meðalfjöldi leikenda á leik',
      },
      provinceVsColony: {
        title: 'Héraðið vs Nýlendur',
        value: (p, c) => `${p} vs ${c}`,
        descProv: 'Héraðssigrar eru ríkjandi — Nýlenduríki eru sjaldgæf!',
        descCol:  'Nýlenduleikir eru óvænt algengir!',
      },
      mostExpansions: {
        title: 'Flestar viðbætur í einum leik',
        value: n => `${n} viðbætur`,
        desc:  (num, exps) => `Leikur #${num}: ${exps}`,
      },
    },
  },

  // Suggester
  suggester: {
    title:       'Ríkistillögur',
    modeTitle:   'TEGUND TILLÖGU',
    expTitle:    'VIÐBÆTUR',
    expHint:     '— skildu eftir ómerkt til að nota allar',
    generate:    'Búa til ríki',
    timesUsed:   n => `${n}× notað`,
    modes: {
      random:    { name: 'Hrein tilviljun',  desc: 'Algjörlega handahófskennt ríki' },
      least:     { name: 'Gleymdu kortin',   desc: 'Kortin sem eru sjaldnast í ríkinu' },
      favorites: { name: 'Uppáhald allra',   desc: 'Vinsælustu kortin í sögu klúbbsins' },
      balanced:  { name: 'Jafnvægt',         desc: 'Blanda af nýjum og kunnuglegum kortum' },
    },
  },

  // CardModal
  cardModal: {
    cost:       'Verð:',
    timesUsed:  'Sinnum í ríki',
    recentGames:'Nýlegir leikir',
    wiki:       'Opna á Dominion Strategy Wiki ↗',
    won:        'vann',
  },

  // GameModal
  gameModal: {
    game:      num => `Leikur #${num}`,
    results:   'Niðurstöður',
    kingdom:   n => `Ríki (${n} spil)`,
    extras:    n => `Aukaleg (${n})`,
    won:       'vann',
    pts:       'stig',
  },
}
