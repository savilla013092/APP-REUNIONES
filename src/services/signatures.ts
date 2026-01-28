import { httpsCallable } from 'firebase/functions'
import { functions, isFirebaseConfigured } from './firebase'
import { getDemoActa, updateDemoActa } from './mockData'
import { isUsingDemoFallback } from './actas'

// Helper to check if we should use demo mode
const shouldUseDemoMode = (): boolean => {
  return !isFirebaseConfigured || isUsingDemoFallback()
}

interface SendSignatureRequestsData {
  actaId: string
  attendeeIds?: string[]
}

interface SendSignatureResult {
  success: boolean
  message: string
  sentCount: number
  results?: Array<{
    email: string
    success: boolean
    error?: string
  }>
}

interface VerifyTokenData {
  actaId: string
  attendeeId: string
  token: string
}

interface VerifyTokenResult {
  valid: boolean
  attendee: {
    id: string
    name: string
    role: string
    signatureStatus: string
  }
  acta: {
    title: string
    date: unknown
  }
}

interface RecordSignatureData {
  actaId: string
  attendeeId: string
  token: string
  signatureUrl: string
}

interface RecordSignatureResult {
  success: boolean
  message: string
  allSigned: boolean
}

/**
 * Send signature requests to attendees via email
 */
export const sendSignatureRequests = async (
  actaId: string,
  attendeeIds?: string[]
): Promise<SendSignatureResult> => {
  // Demo mode: simulate sending requests
  if (shouldUseDemoMode()) {
    const acta = getDemoActa(actaId)
    if (!acta) {
      return {
        success: false,
        message: 'Acta no encontrada',
        sentCount: 0,
      }
    }

    // Generate mock tokens for attendees
    const updatedAttendees = acta.attendees.map(a => {
      if (!attendeeIds || attendeeIds.includes(a.id)) {
        return {
          ...a,
          signatureToken: `demo-token-${a.id}-${Date.now()}`,
        }
      }
      return a
    })

    updateDemoActa(actaId, {
      attendees: updatedAttendees,
      status: 'pending_signatures',
    })

    return {
      success: true,
      message: `Modo demo: ${updatedAttendees.length} solicitudes simuladas. Usa el boton de copiar enlace para compartir.`,
      sentCount: updatedAttendees.length,
      results: updatedAttendees.map(a => ({
        email: a.email,
        success: true,
      })),
    }
  }

  // Production mode: use Cloud Function
  const sendSignatureRequestsFn = httpsCallable<SendSignatureRequestsData, SendSignatureResult>(
    functions,
    'sendSignatureRequests'
  )

  const result = await sendSignatureRequestsFn({ actaId, attendeeIds })
  return result.data
}

/**
 * Verify a signature token
 */
export const verifySignatureToken = async (
  actaId: string,
  attendeeId: string,
  token: string
): Promise<VerifyTokenResult> => {
  // Demo mode: verify locally
  if (shouldUseDemoMode()) {
    const acta = getDemoActa(actaId)
    if (!acta) {
      return {
        valid: false,
        attendee: { id: '', name: '', role: '', signatureStatus: 'pending' },
        acta: { title: '', date: null },
      }
    }

    const attendee = acta.attendees.find(a => a.id === attendeeId)
    if (!attendee) {
      return {
        valid: false,
        attendee: { id: '', name: '', role: '', signatureStatus: 'pending' },
        acta: { title: '', date: null },
      }
    }

    // In demo mode, we allow any token or no token
    return {
      valid: true,
      attendee: {
        id: attendee.id,
        name: attendee.name,
        role: attendee.role,
        signatureStatus: attendee.signatureStatus,
      },
      acta: {
        title: acta.meetingInfo.title,
        date: acta.meetingInfo.date,
      },
    }
  }

  // Production mode: use Cloud Function
  const verifyTokenFn = httpsCallable<VerifyTokenData, VerifyTokenResult>(
    functions,
    'verifySignatureToken'
  )

  const result = await verifyTokenFn({ actaId, attendeeId, token })
  return result.data
}

/**
 * Record a signature
 */
export const recordSignature = async (
  actaId: string,
  attendeeId: string,
  token: string,
  signatureUrl: string
): Promise<RecordSignatureResult> => {
  // Demo mode: update localStorage
  if (shouldUseDemoMode()) {
    const acta = getDemoActa(actaId)
    if (!acta) {
      return {
        success: false,
        message: 'Acta no encontrada',
        allSigned: false,
      }
    }

    const updatedAttendees = acta.attendees.map(a => {
      if (a.id === attendeeId) {
        return {
          ...a,
          signatureStatus: 'signed' as const,
          signatureUrl,
          signedAt: { toDate: () => new Date() } as any,
        }
      }
      return a
    })

    const allSigned = updatedAttendees.every(a => a.signatureStatus === 'signed')

    updateDemoActa(actaId, {
      attendees: updatedAttendees,
      status: allSigned ? 'completed' : 'pending_signatures',
    })

    return {
      success: true,
      message: 'Firma registrada correctamente',
      allSigned,
    }
  }

  // Production mode: use Cloud Function
  const recordSignatureFn = httpsCallable<RecordSignatureData, RecordSignatureResult>(
    functions,
    'recordSignature'
  )

  const result = await recordSignatureFn({
    actaId,
    attendeeId,
    token,
    signatureUrl,
  })
  return result.data
}
