import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import SignatureCanvas from 'react-signature-canvas'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CheckCircle2, RotateCcw, PenTool, Loader2, AlertCircle } from 'lucide-react'
import { getActa, updateActa } from '@/services/actas'
import { uploadSignature } from '@/services/storage'
import { Timestamp } from 'firebase/firestore'
import { isFirebaseConfigured } from '@/services/firebase'
import { isUsingDemoFallback } from '@/services/actas'
import type { Acta, MeetingAttendee } from '@/types'

// Helper to check if we should use demo mode
const shouldUseDemoMode = (): boolean => {
  return !isFirebaseConfigured || isUsingDemoFallback()
}

// Helper to create timestamp compatible with both modes
const createTimestamp = () => {
  if (!shouldUseDemoMode()) {
    return Timestamp.now()
  }
  return { toDate: () => new Date() } as any
}

export default function SignaturePage() {
  const { id: actaId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const attendeeId = searchParams.get('attendeeId')
  const token = searchParams.get('token')

  const [acta, setActa] = useState<Acta | null>(null)
  const [attendee, setAttendee] = useState<MeetingAttendee | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadySigned, setAlreadySigned] = useState(false)

  const sigCanvas = useRef<SignatureCanvas>(null)

  useEffect(() => {
    if (actaId) {
      loadData(actaId)
    }
  }, [actaId])

  const loadData = async (id: string) => {
    try {
      setError(null)
      const data = await getActa(id)

      if (!data) {
        setError('No se encontro el acta solicitada.')
        setLoading(false)
        return
      }

      setActa(data)

      if (attendeeId) {
        const found = data.attendees.find(a => a.id === attendeeId)
        if (found) {
          setAttendee(found)
          // Check if already signed
          if (found.signatureStatus === 'signed') {
            setAlreadySigned(true)
          }
          // In demo mode, we don't validate tokens strictly
          // In production, the token is validated in Cloud Functions
          if (
            !shouldUseDemoMode() &&
            token &&
            found.signatureToken &&
            found.signatureToken !== token
          ) {
            setError('El enlace de firma no es valido o ha expirado.')
          }
        } else {
          setError('No se encontro el participante especificado.')
        }
      } else {
        setError('Falta el identificador del participante.')
      }
    } catch (error) {
      console.error('Error loading acta:', error)
      setError('Error al cargar la informacion del acta.')
    } finally {
      setLoading(false)
    }
  }

  const clear = () => sigCanvas.current?.clear()

  const handleSubmit = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty() || !acta || !attendee || !actaId) {
      return
    }

    setIsSubmitting(true)
    try {
      // Get signature as data URL
      const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')

      // Upload signature (handles both demo and Firebase modes)
      const signatureUrl = await uploadSignature(actaId, attendee.id, signatureDataUrl)

      // Update attendee in Acta
      const updatedAttendees = acta.attendees.map(a =>
        a.id === attendee.id
          ? {
              ...a,
              signatureUrl,
              signatureStatus: 'signed' as const,
              signedAt: createTimestamp(),
            }
          : a
      )

      // Check if all attendees have signed
      const allSigned = updatedAttendees.every(a => a.signatureStatus === 'signed')

      // Update acta with new attendees list and status
      await updateActa(actaId, {
        attendees: updatedAttendees,
        status: allSigned ? 'completed' : 'pending_signatures',
      })

      setIsSigned(true)
    } catch (error) {
      console.error('Error guardando firma:', error)
      setError('Error al guardar la firma. Por favor intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-slate-500">Cargando informacion...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center p-6 bg-slate-50">
        <Card className="max-w-md w-full text-center p-8 space-y-4">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl">Error</CardTitle>
          <p className="text-slate-500">{error}</p>
        </Card>
      </div>
    )
  }

  // No acta or attendee found
  if (!acta || !attendee) {
    return (
      <div className="h-screen flex items-center justify-center p-6 bg-slate-50">
        <Card className="max-w-md w-full text-center p-8 space-y-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl">Enlace no valido</CardTitle>
          <p className="text-slate-500">
            El enlace de firma que has utilizado no es valido o ha expirado. Contacta al organizador
            de la reunion para recibir un nuevo enlace.
          </p>
        </Card>
      </div>
    )
  }

  // Already signed state
  if (alreadySigned) {
    return (
      <div className="h-screen flex items-center justify-center p-6 bg-slate-50">
        <Card className="max-w-md w-full text-center p-8 space-y-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl">Ya firmaste este documento</CardTitle>
          <p className="text-slate-500">
            <strong>{attendee.name}</strong>, ya has firmado el acta de la reunion:
          </p>
          <p className="font-semibold text-slate-700">{acta.meetingInfo.title}</p>
          {attendee.signatureUrl && (
            <div className="mt-4 p-4 bg-slate-100 rounded-lg">
              <p className="text-xs text-slate-400 mb-2">Tu firma:</p>
              <img
                src={attendee.signatureUrl}
                alt="Tu firma"
                className="h-16 mx-auto object-contain"
              />
            </div>
          )}
        </Card>
      </div>
    )
  }

  // Success state after signing
  if (isSigned) {
    return (
      <div className="h-screen flex items-center justify-center p-6 bg-slate-50">
        <Card className="max-w-md w-full text-center p-8 space-y-4">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Firma registrada</CardTitle>
          <p className="text-slate-500">
            Muchas gracias, <strong>{attendee.name}</strong>. Tu firma ha sido vinculada al acta de
            la reunion:
          </p>
          <p className="font-semibold text-slate-700">{acta.meetingInfo.title}</p>
          <p className="text-xs text-slate-400 mt-4">Puedes cerrar esta ventana.</p>
        </Card>
      </div>
    )
  }

  // Signature form
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Firma Digital de Acta</h1>
          <p className="text-slate-500">
            Estas por firmar el acta:{' '}
            <span className="font-semibold">{acta.meetingInfo.title}</span>
          </p>
        </div>

        <Card className="border-slate-200 shadow-xl overflow-hidden">
          <CardHeader className="bg-white border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Hola, {attendee.name}</CardTitle>
                <p className="text-sm text-slate-500">{attendee.role}</p>
              </div>
              <PenTool className="text-primary h-6 w-6 opacity-20" />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <Label className="text-sm font-medium text-slate-700">Recuadro de firma:</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden touch-none h-64">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  canvasProps={{
                    className: 'w-full h-full cursor-crosshair',
                    style: { touchAction: 'none' },
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 italic">
                * Usa tu mouse o el dedo (en dispositivos tactiles) para firmar dentro del recuadro.
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 p-6 flex justify-between border-t gap-4">
            <Button
              variant="ghost"
              onClick={clear}
              className="gap-2 text-slate-500 hover:text-destructive"
            >
              <RotateCcw className="h-4 w-4" /> Limpiar
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 px-8 gap-2"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Confirmar Firma
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Al confirmar, aceptas que esta firma digital tiene validez para este documento especifico
          bajo las politicas de tu organizacion.
        </p>
      </div>
    </div>
  )
}
