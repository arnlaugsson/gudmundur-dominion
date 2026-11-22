// Storage is only needed by the memory upload flow, so it lives in its own
// module to keep the Storage SDK out of chunks that don't upload files.
import { getStorage } from 'firebase/storage'
import { app } from './firebase'

export const storage = getStorage(app)
