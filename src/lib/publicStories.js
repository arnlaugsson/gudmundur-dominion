// Which players made their year-in-review story public (Firestore
// publicStories/{playerName} = { public: true }). Firebase is imported
// lazily so pages that don't need it never load the SDK.
const COLLECTION = 'publicStories'

async function firestore() {
  const [{ db }, fs] = await Promise.all([import('../firebase'), import('firebase/firestore')])
  return { db, ...fs }
}

export async function fetchPublicStoryNames() {
  const { db, collection, getDocs, query, where } = await firestore()
  const snap = await getDocs(query(collection(db, COLLECTION), where('public', '==', true)))
  return new Set(snap.docs.map(d => d.id))
}

export async function setStoryPublic(playerName, isPublic) {
  const { db, doc, setDoc, serverTimestamp } = await firestore()
  await setDoc(doc(db, COLLECTION, playerName), { public: isPublic, updatedAt: serverTimestamp() })
}
