import { RATING_BASE, PROVISIONAL_GAMES } from '../lib/ratings'

export default function RatingInfo() {
  return (
    <details className="rating-info">
      <summary>Hvernig virkar styrkleikinn?</summary>
      <p>
        Styrkleikinn er reiknaður með <a href="https://openskill.me" target="_blank" rel="noopener noreferrer">OpenSkill</a>,
        sem ræður við fjölspilaraleiki, jafntefli og lið. Eftir hvern leik hækka þau sem enda ofar en búist var við
        og lækka þau sem enda neðar — að vinna sterka andstæðinga gefur meira en að vinna veikari.
      </p>
      <p>
        Lið (tvö eða fleiri sem stýra sama stokki) teljast sem einn keppandi með meðalstyrk liðsmanna, og allir
        í liðinu færast jafnt upp eða niður. Allir byrja í {RATING_BASE}. * merkir færri en {PROVISIONAL_GAMES} leiki —
        þá er styrkleikinn enn óviss og viðkomandi raðast neðst í töflunni.
      </p>
    </details>
  )
}
