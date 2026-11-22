// "Dominionklúbburinn / Guðmundur" on two lines with one crown on each side,
// vertically centred between the lines. Shared by the header and the skeleton.
export default function ClubTitle() {
  return (
    <h1 className="club-title" aria-label="Dominionklúbburinn Guðmundur">
      <span className="club-crown" aria-hidden="true">♛</span>
      <span className="club-name" aria-hidden="true">
        <span>Dominionklúbburinn</span>
        <span>Guðmundur</span>
      </span>
      <span className="club-crown" aria-hidden="true">♛</span>
    </h1>
  )
}
