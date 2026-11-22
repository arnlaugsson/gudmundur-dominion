import { RATING_BASE, PROVISIONAL_GAMES } from '../lib/ratings'

export default function RatingInfo() {
  return (
    <details className="rating-info">
      <summary>Hvernig virkar styrkleikinn?</summary>
      <p>
        Styrkleikinn er reiknaður með <a href="https://openskill.me" target="_blank" rel="noopener noreferrer">OpenSkill</a>,
        sem ræður vel við leiki með mörgum leikmönnum, jafntefli og lið. Eftir hvern leik hækkar styrkleiki þeirra sem
        enda ofar en búist var við og lækkar hjá þeim sem enda neðar. Það gefur meira að vinna sterka andstæðinga en veika.
      </p>
      <p>
        Lið (tveir eða fleiri sem stýra sama stokki) teljast sem einn keppandi með meðalstyrk liðsmanna, og allir í
        liðinu hækka eða lækka jafnt. Allir byrja í {RATING_BASE}. Stjarna (*) merkir færri en {PROVISIONAL_GAMES} leiki.
        Þá er styrkleikinn enn óviss og viðkomandi raðast neðst í töflunni.
      </p>
    </details>
  )
}
