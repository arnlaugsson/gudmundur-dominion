#!/usr/bin/env node

// Usage: node scripts/set-player-name.js <email> <playerName>
// Sets the `playerName` field on allowedUsers/{email} in Firestore.
// Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account
// JSON key (same setup as scripts/set-claims.js).
//
// Dependency: firebase-admin (not in package.json — install globally)
//   npm install -g firebase-admin
//
// Example:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json
//   node scripts/set-player-name.js skuli@gangverk.is Skúli
// Clear the mapping:
//   node scripts/set-player-name.js skuli@gangverk.is ""

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!credentialsPath) {
  console.error('Error: GOOGLE_APPLICATION_CREDENTIALS env var is not set.')
  console.error('Point it to a Firebase service account JSON key file.')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf8'))

initializeApp({ credential: cert(serviceAccount) })

const email = process.argv[2]
const playerName = process.argv[3]

if (!email || playerName === undefined) {
  console.error('Usage: node scripts/set-player-name.js <email> <playerName>')
  console.error('  Pass an empty string to clear: node scripts/set-player-name.js <email> ""')
  process.exit(1)
}

const db = getFirestore()
const value = playerName === '' ? null : playerName

try {
  await db
    .collection('allowedUsers')
    .doc(email)
    .set({ playerName: value }, { merge: true })
  console.log(`Set playerName=${value === null ? 'null' : JSON.stringify(value)} on allowedUsers/${email}`)
} catch (error) {
  console.error(`Error: ${error.message}`)
  process.exit(1)
}
