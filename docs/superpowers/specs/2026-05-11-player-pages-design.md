# Player Pages — Design

GitHub issue: [#17 "Player Pages"](https://github.com/arnlaugsson/gudmundur-dominion/issues/17)

## Goal

Give each club member a personal player page with: a profile photo they can pick from their own tagged photos, a small editable bio (favourite expansion / card / memorable victory / memorable loss / short text), an aggregated tagged-photo gallery, and a head-to-head list against every other player.

## Scope

In:

- New `playerProfiles/{playerName}` Firestore collection storing avatar + bio per player.
- Email → player mapping via a new `playerName` field on `allowedUsers/{email}`.
- New `PlayerPage` route at hash `#players/<name>` (the existing `#players` tab continues to show the list).
- New components: `PlayerPage`, `PlayerBio`, `PlayerBioEditor`, `AvatarPicker`, `Avatar`, `HeadToHeadList`, hook `usePlayerProfiles`.
- Existing `PlayerModal` retained as a quick-peek view; gains a "Sjá fulla síðu →" link to the new page.
- Players list (`Players.jsx`) navigates to the new page on row click instead of opening the modal directly. Modal continues to be used from contexts like the Afrek leaderboard.
- `AuthContext` extended to surface `playerName` on the user.
- `UserManager` admin UI gains a `playerName` dropdown next to each allowed-user row.
- Firestore rules updated for `playerProfiles`.

Out:

- Per-photo cropping, custom avatar uploads, profile photo from an arbitrary URL. The avatar is always one of the player's existing tagged photos.
- Self-claim of `playerName` by users. Admin assigns it via UserManager.
- Real-time subscriptions (Firestore `onSnapshot`). The existing pattern uses one-shot `getDocs` with `refetch()` after writes; same pattern here.
- Test runner. Module-level files are kept testable but no tests are added.

## Data model

### Existing: `allowedUsers/{email}`

Gains an optional new field:

```js
{
  admin: false,
  playerName: 'Skúli' | null,   // NEW — email → club player mapping
}
```

`null` / missing means the logged-in user has no associated player and therefore no edit rights to any profile (unless they are admin). Admin-editable in `UserManager`.

### New: `playerProfiles/{playerName}`

```js
{
  avatarUrl: string | null,             // URL of a photo from Firebase Storage
  avatarPhotoStoragePath: string | null,// e.g. 'memories/game-110-…' (so we can sanity-check existence later)
  bio: {
    favoriteExpansion: string | null,   // one of DATA.expansions
    favoriteCard: string | null,        // one of DATA.cards (kingdom only)
    memorableVictory: { gameNum: number, text: string } | null,
    memorableLoss:    { gameNum: number, text: string } | null,
    shortBio: string | null,            // free text ≤ 280 chars
  },
  updatedAt: Timestamp,
  updatedBy: string,                    // email of the writer
}
```

Doc ID is the canonical player name (already used as the lookup key elsewhere — `DATA.players[i].name`).

### Auth surface

`AuthContext.loadUserRole` returns one new field:

```js
{
  ...existing fields,
  playerName: data.playerName || null,
}
```

## Firestore rules

Add to `firestore.rules`:

```ruby
function userDoc(email) {
  return get(/databases/$(database)/documents/allowedUsers/$(email))
}
function callerPlayerName() {
  return userDoc(request.auth.token.email).data.playerName
}

match /playerProfiles/{playerName} {
  allow read: if isAllowed();
  allow create, update: if isAllowed()
    && (isAdmin() || callerPlayerName() == playerName);
  allow delete: if isAdmin();
}
```

The `allowedUsers` rules stay as-is; the new `playerName` field is just an extra attribute admins set.

## Routing

Hash routing extends to one sub-route. `App.jsx` updates:

```js
// Current shape:
//   "#dashboard" "#players" "#history" "#afrek" ...
//
// New: "#players/<URL-encoded name>"
//   → activeTab = 'players' AND viewPlayerName = decoded name
function parseHash() {
  const raw = window.location.hash.slice(1)
  const [head, sub] = raw.split('/')
  const tab = VALID_TABS.has(head) ? head : 'dashboard'
  const playerName = head === 'players' && sub ? decodeURIComponent(sub) : null
  return { tab, playerName }
}
```

`Players.jsx` either renders the list (when `playerName` is null) or routes to `PlayerPage` (when set). Old `setSelectedPlayer` modal flow is replaced by a hash change; modal is no longer triggered from the Players list.

## Components

### `Avatar.jsx`

Small reusable circle.

- Props: `{ name, src?, size = 60, onClick? }`.
- If `src` set → renders an `<img>` (with `onError` fallback to initials).
- Otherwise → renders a colored circle with the first 1-2 initials. Color is a deterministic hash of the name (mirrors the kind of HSL hash already used elsewhere in the codebase).

### `AvatarPicker.jsx`

Inline panel (not a modal) under the avatar in edit mode or when the owner clicks the avatar.

- Lists every photo where `playerName` is tagged. Source: `useMemories().photosByPlayer.get(playerName)`.
- Each thumbnail is a clickable square. Single-click writes the chosen photo's `url` + `storagePath` to the player's profile doc and calls `usePlayerProfiles().refetch()`.
- "Engin prófílmynd" button clears the avatar.
- Empty state when the player has no tagged photos: instructional text — "Engar myndir til að velja úr. Bættu þér við sem tag á einhverri mynd fyrst."

### `PlayerBio.jsx`

Read-only display. Renders only the fields that are non-null. Each visible field is one line:

- Stutt bio: `<short bio text>`
- Uppáhalds viðbót: `<expansion>`
- Uppáhaldsspil: `<card>`
- Eftirminnilegasti sigur: `leikur #N — "<text>"` — game-number is a clickable link to that game.
- Skemmtilegasta tapið: `leikur #N — "<text>"` — same.

When all five are null, the parent section shows a placeholder. For owners, the placeholder has a "[Bæta við]" link that flips into edit mode.

### `PlayerBioEditor.jsx`

Replaces `PlayerBio` when edit mode is active. Form controls:

- **Uppáhalds viðbót** — `<select>` listing all `DATA.expansions`; empty option = "Engin valin".
- **Uppáhaldsspil** — searchable `<select>` of all non-supply kingdom cards from `DATA.cards`; empty option = "Ekkert valið".
- **Eftirminnilegasti sigur** — searchable game-number picker (filtered to games this player won) + free-text input (max 280 chars). Both required if either is set; "Hreinsa" button clears both.
- **Skemmtilegasta tapið** — searchable game-number picker (any game the player participated in) + free-text input (max 280 chars). Same clear behavior.
- **Stutt bio** — `<textarea>` (max 280 chars, character counter shown).

Two buttons: **Vista** (writes the whole `bio` object via Firestore `setDoc(..., { merge: true })` with `updatedAt` + `updatedBy`) and **Hætta við**. Errors → alert + revert local state.

### `HeadToHeadList.jsx`

Compact opponent list with avatars.

- Computes from `DATA.games`: for each other player, counts shared games and the `wins` count (this player finished above the other).
- Rows include only opponents with ≥3 shared games (filters one-off encounters).
- Each row: `<Avatar size=32>` · name · `{total} leikir · {wins}-{losses} ({pct}%)` · click-arrow.
- Sorted by total games descending.
- Clicking a row navigates to `#players/<other>`.

### `PlayerPage.jsx`

Page layout, top to bottom:

1. **Back-to-list link** (`← Til baka`) — navigates to `#players`.
2. **Header row** — `<Avatar size=120>` on the left; on the right: player name, member-since line, "Breyta prófíl" button (visible only when `canEdit`). Avatar is itself clickable for the owner as a shortcut into `AvatarPicker`.
3. **Stats grid** — same item set used by `PlayerModal` (Leikir, Sigrar, Sigurhlutfall, Meðalskor, Besta skor, 2./3. sæti, Lengsta sigursería). Reused for visual consistency.
4. **Um mig** — `PlayerBio` in read mode, `PlayerBioEditor` when edit mode is active. Owners see "[Bæta við]" when all fields empty.
5. **Afrek** — same grouped badge sections as `PlayerModal` (volume / wins / records / streaks / variety / rivalries).
6. **Síðustu leikir** — last 10 games this player participated in, plus an "Allir leikir →" link that navigates to `#history` with the player pre-filled into the filter.
7. **Head-to-head** — `<HeadToHeadList playerName={...}>`.
8. **Myndir** — `<PlayerPhotos playerName={...}>` rendering the full tagged-photo gallery. `PlayerPhotos` may need a `limit` prop bumped here vs. the existing modal usage; set it to render all photos.

Empty sections are hidden when there is nothing to render: no bio → section hidden (except for owners, who see a "[Bæta við]" placeholder), no tagged photos → "Myndir" hidden, no H2H opponents at ≥3 shared games → "Head-to-head" hidden.

### `PlayerModal.jsx` (modify)

Add a "Sjá fulla síðu →" link at the top of the modal that calls `window.location.hash = #players/${encodeURIComponent(playerName)}` and closes the modal. All existing modal content stays as-is for the quick-peek use case (Afrek leaderboard).

### `Players.jsx` (modify)

Row click writes the hash instead of opening the modal:

```js
onClick={() => { window.location.hash = `players/${encodeURIComponent(p.name)}` }}
```

### `UserManager.jsx` (modify)

Each row of the allowed-users table gets a new "Player" column with a `<select>` of all player names in `DATA.players`. The empty option is "(óvalinn)". Saves via the same admin write path.

### `usePlayerProfiles.js`

Mirrors `useMemories`:

```js
export function usePlayerProfiles() {
  const { user } = useAuth()
  // Same shape: one-shot getDocs on mount + refetch() after writes.
  // Returns { byName: Map<playerName, profile>, refetch, loading, error }
}
```

## Data flow

- `usePlayerProfiles` loads once per session (refetched after writes). Returns a Map keyed by playerName.
- `PlayerPage` consumers: `DATA.games`, `DATA.players`, `useMemories().photosByPlayer`, `usePlayerProfiles().byName`, `useAuth().user`.
- `isOwner = !!(user?.allowed && user.playerName === playerName)`; `canEdit = isOwner || user?.admin`.
- Avatar / bio edits write to Firestore via `setDoc(...{merge: true})`; on success → call `refetch()`.
- Modal click in `Players.jsx`: replaced with hash navigation. Modal continues to be opened directly from the Afrek leaderboard.

## Error handling

- Logged-out / not-allowed visitor: read-only view of all profiles, no edit affordances.
- Profile doc missing: rendered as `{ avatarUrl: null, bio: {} }`. First save creates the doc.
- Avatar's underlying photo later deleted → image 404s → `Avatar` falls back to initials. Self-heals when owner picks a new photo.
- Hash mismatch (`#players/UnknownName` or a typo): `PlayerPage` redirects back to `#players` and renders the list.
- Firestore write rejected by rules: alert with the error and revert local state.
- H2H computation tolerates missing places, empty results, and games where this player is the only participant.

## Testing

No test runner. Manual verification via `npm run dev`:

- Logged-out user → page renders, no edit affordances.
- Logged-in non-admin without `playerName` mapping → reads everywhere, edits nowhere.
- Logged-in with `playerName: 'Skúli'`:
  - On `#players/Skúli` → "Breyta prófíl" visible, avatar clickable, bio editor saves.
  - On `#players/Mummi` → read-only.
- Admin user → can edit any profile.
- Avatar picker shows all tagged photos; click sets the avatar; "Engin prófílmynd" clears it.
- Bio editor saves all 5 fields; empty fields stay hidden in read mode.
- H2H list sorted by shared-game count; clicking opens that opponent's page.
- Firestore rules: manually attempting another player's write in the browser console fails with the alert.

## Files touched

- `firestore.rules` — playerProfiles rules + helpers
- `src/context/AuthContext.jsx` — surface `playerName` on the user object
- `src/firebase.js` — no change (already wired)
- `src/App.jsx` — hash sub-route parsing, route Players tab to list vs page
- `src/tabs/Players.jsx` — row click → hash navigation, render `PlayerPage` when sub-route present
- `src/tabs/PlayerPage.jsx` — new
- `src/components/Avatar.jsx` — new
- `src/components/AvatarPicker.jsx` — new
- `src/components/PlayerBio.jsx` — new
- `src/components/PlayerBioEditor.jsx` — new
- `src/components/HeadToHeadList.jsx` — new
- `src/components/PlayerModal.jsx` — add "Sjá fulla síðu →" link, keep otherwise unchanged
- `src/components/UserManager.jsx` — add playerName column
- `src/hooks/usePlayerProfiles.js` — new
- `src/index.css` — new styles for avatar, picker, bio fields, H2H rows
