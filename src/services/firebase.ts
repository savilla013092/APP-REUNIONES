import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getFunctions, type Functions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Check if Firebase is properly configured
const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== ''
)

// Initialize Firebase only if configured
let app: FirebaseApp | null = null
let auth: Auth
let db: Firestore
let storage: FirebaseStorage
let functions: Functions

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
  functions = getFunctions(app)
  console.log('Firebase inicializado correctamente')
} else {
  console.warn(
    'Firebase no esta configurado. La aplicacion funcionara en modo demo. ' +
      'Para usar Firebase, configura las variables en .env.local'
  )
  // Create mock instances that won't be used in demo mode
  // but prevent import errors
  app = null as any
  auth = {} as Auth
  db = {} as Firestore
  storage = {} as FirebaseStorage
  functions = {} as Functions
}

export { auth, db, storage, functions, isFirebaseConfigured }
export default app
