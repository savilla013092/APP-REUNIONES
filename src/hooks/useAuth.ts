import { create } from 'zustand'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db, isFirebaseConfigured } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'
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
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          setUser({ id: firebaseUser.uid, ...userDoc.data() } as User)
        } else {
          // If user exists in Auth but not in Firestore yet (e.g. during registration)
          // we might want to handle this differently
          setUser(null)
        }
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
