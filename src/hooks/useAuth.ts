import { create } from 'zustand'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, db, isFirebaseConfigured } from '../services/firebase'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import type { User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  loading: true,
  error: null,
  setUser: user => set({ user }),
  setLoading: loading => set({ loading }),
  setError: error => set({ error }),
}))

export const initializeAuth = () => {
  const { setUser, setLoading } = useAuthStore.getState()

  // If Firebase is not configured, we're in demo mode
  // Don't try to listen to auth state changes
  if (!isFirebaseConfigured) {
    console.log('Modo demo: autenticacion de Firebase deshabilitada')
    setLoading(false)
    return
  }

  onAuthStateChanged(auth, async firebaseUser => {
    if (firebaseUser) {
      try {
        const userRef = doc(db, 'users', firebaseUser.uid)
        let userDoc = await getDoc(userRef)

        // Document missing → create it automatically so the user can enter
        if (!userDoc.exists()) {
          const displayName =
            firebaseUser.displayName ||
            (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Usuario')
          await setDoc(userRef, {
            email: firebaseUser.email || '',
            displayName,
            organizationId: 'org-' + firebaseUser.uid.substring(0, 8),
            role: 'admin',
            createdAt: Timestamp.now(),
            lastLoginAt: Timestamp.now(),
          })
          userDoc = await getDoc(userRef)
        }

        setUser({ id: firebaseUser.uid, ...userDoc.data() } as User)
      } catch (error) {
        console.error('Error fetching user data:', error)
        setUser(null)
      }
    } else {
      setUser(null)
    }
    setLoading(false)
  })
}

export const signOutUser = async () => {
  const { setUser } = useAuthStore.getState()
  if (isFirebaseConfigured) {
    await signOut(auth)
  }
  setUser(null)
}
