#!/usr/bin/env node

// Usage: node scripts/set-claims.js <email> [--admin]
// Sets custom claims on a Firebase Auth user.
// Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account key.
//
// Dependency: firebase-admin (not installed in the project — install globally or run with npx)
//   npm install -g firebase-admin
//   or: npx --yes firebase-admin ... (not recommended for scripts)

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
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
const isAdmin = process.argv.includes('--admin')

if (!email) {
  console.error('Usage: node scripts/set-claims.js <email> [--admin]')
  process.exit(1)
}

const auth = getAuth()

try {
  const user = await auth.getUserByEmail(email)
  const claims = { allowed: true }
  if (isAdmin) {
    claims.admin = true
  }
  await auth.setCustomUserClaims(user.uid, claims)
  console.log(`Set claims on ${email}: ${JSON.stringify(claims)}`)
  console.log('User must sign out and back in for claims to take effect.')
} catch (error) {
  console.error(`Error: ${error.message}`)
  process.exit(1)
}
