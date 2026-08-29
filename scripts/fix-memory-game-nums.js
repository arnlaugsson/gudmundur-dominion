#!/usr/bin/env node
/**
 * Fix Firestore memory gameNums after the game renumbering.
 *
 * What happened: game #106 was missing; the New Year's game was entered as
 * #107. After the fix in the spreadsheet, old #107 → new #106, old #108 →
 * new #107, ..., meaning every game from old #107 onwards decreased by 1.
 * Firestore memories still reference the OLD game numbers.
 *
 * Fix: for every memory document, decrement any gameNum value >= 107 by 1.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/fix-memory-game-nums.js
 *   Add --dry-run to preview changes without writing.
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const DRY_RUN = process.argv.includes('--dry-run')
const THRESHOLD = 107 // gameNums >= this value need to be decremented

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(readFileSync(credPath, 'utf8'))) })
const db = getFirestore()

const snap = await db.collection('memories').get()
console.log(`Found ${snap.size} memory documents.`)

let changed = 0
let skipped = 0

for (const docSnap of snap.docs) {
  const data = docSnap.data()
  const oldNums = data.gameNums ?? []

  const newNums = oldNums.map(n => (n >= THRESHOLD ? n - 1 : n))
  const affected = oldNums.some((n, i) => n !== newNums[i])

  if (!affected) {
    skipped++
    continue
  }

  console.log(`  ${docSnap.id}: gameNums ${JSON.stringify(oldNums)} → ${JSON.stringify(newNums)}`)

  if (!DRY_RUN) {
    await docSnap.ref.update({ gameNums: newNums })
  }
  changed++
}

console.log(`\n${DRY_RUN ? '[DRY RUN] Would update' : 'Updated'} ${changed} documents, skipped ${skipped}.`)
