import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage'
import { storage, isFirebaseConfigured } from './firebase'
import { isUsingDemoFallback } from './actas'

// Helper to check if we should use demo mode
const shouldUseDemoMode = (): boolean => {
  return !isFirebaseConfigured || isUsingDemoFallback()
}

/**
 * Upload a signature image to Firebase Storage
 */
export const uploadSignature = async (
  actaId: string,
  attendeeId: string,
  signatureDataUrl: string
): Promise<string> => {
  // Demo mode: store in localStorage and return data URL
  if (shouldUseDemoMode()) {
    const key = `demo_signature_${actaId}_${attendeeId}`
    try {
      localStorage.setItem(key, signatureDataUrl)
      console.log('Modo demo: Firma almacenada localmente')
    } catch (error) {
      console.warn('No se pudo almacenar la firma localmente:', error)
    }
    return signatureDataUrl // Return data URL directly for display
  }

  // Production mode: use Firebase Storage
  try {
    const storageRef = ref(storage, `signatures/${actaId}/${attendeeId}.png`)
    const snapshot = await uploadString(storageRef, signatureDataUrl, 'data_url')
    const downloadUrl = await getDownloadURL(snapshot.ref)
    console.log('Firma subida a Firebase Storage')
    return downloadUrl
  } catch (error) {
    console.error('Error uploading signature to Firebase Storage:', error)
    // Fallback to localStorage
    const key = `demo_signature_${actaId}_${attendeeId}`
    localStorage.setItem(key, signatureDataUrl)
    return signatureDataUrl
  }
}

/**
 * Get a signature from localStorage (for demo mode)
 */
export const getDemoSignature = (actaId: string, attendeeId: string): string | null => {
  const key = `demo_signature_${actaId}_${attendeeId}`
  return localStorage.getItem(key)
}

/**
 * Store audio blob in localStorage and return a reference key
 * Audio is stored separately to avoid Firestore size limits
 */
const storeAudioLocally = (blob: Blob): Promise<string> => {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      const audioKey = `demo_audio_${Date.now()}`
      try {
        localStorage.setItem(audioKey, dataUrl)
        console.log('Modo demo: Audio almacenado localmente con clave:', audioKey)
        resolve(audioKey) // Return only the key, not the full data URL
      } catch (error) {
        console.warn('localStorage lleno, audio solo en memoria:', error)
        // Store in a temporary memory cache as fallback
        ;(window as any).__tempAudioCache = (window as any).__tempAudioCache || {}
        ;(window as any).__tempAudioCache[audioKey] = dataUrl
        resolve(audioKey)
      }
    }
    reader.onerror = () => {
      console.error('Error reading audio blob')
      resolve('')
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * Retrieve audio data URL from localStorage or memory cache
 */
export const getAudioDataUrl = (audioKey: string): string | null => {
  if (!audioKey || !audioKey.startsWith('demo_audio_')) {
    return audioKey // It's already a URL (Firebase Storage URL)
  }
  // Try localStorage first
  const fromStorage = localStorage.getItem(audioKey)
  if (fromStorage) return fromStorage
  // Try memory cache
  const memCache = (window as any).__tempAudioCache
  if (memCache && memCache[audioKey]) {
    return memCache[audioKey]
  }
  return null
}

export const uploadAudio = async (orgId: string, actaId: string, blob: Blob): Promise<string> => {
  // Demo mode: store locally and return reference key
  if (shouldUseDemoMode()) {
    console.log('Modo demo: Almacenando audio localmente')
    return storeAudioLocally(blob)
  }

  // Production mode: try Firebase Storage with fallback
  try {
    const filename = `recording_${Date.now()}.webm`
    const storageRef = ref(storage, `organizations/${orgId}/audios/${actaId}/${filename}`)

    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: 'audio/webm',
    })

    const downloadUrl = await getDownloadURL(snapshot.ref)
    console.log('Audio subido a Firebase Storage')
    return downloadUrl
  } catch (error) {
    console.error('Error uploading audio to Firebase Storage:', error)
    console.log('Fallback: Almacenando audio localmente')
    return storeAudioLocally(blob)
  }
}

// Helper to retrieve demo audio
export const getDemoAudio = (key: string): string | null => {
  if (key.startsWith('demo_audio_')) {
    return localStorage.getItem(key)
  }
  return null
}
