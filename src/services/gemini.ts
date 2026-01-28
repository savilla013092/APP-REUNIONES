import type { GeneratedContent, MeetingAttendee } from '../types'
import { getAudioDataUrl } from './storage'

/**
 * Parse a data URL into its mime type and base64 components
 */
const parseDataUrl = (dataUrl: string): { mimeType: string; base64: string } | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return {
    mimeType: match[1],
    base64: match[2],
  }
}

/**
 * Generate meeting acta using the serverless API endpoint.
 * The Gemini API key stays server-side only.
 */
export const generateMeetingActa = async (
  title: string,
  date: string,
  location: string,
  modality: string,
  attendees: MeetingAttendee[],
  agenda: string[],
  rawContent: string,
  audioUrl?: string
): Promise<GeneratedContent> => {
  console.log('Generando acta via API serverless...')
  console.log('Titulo:', title)

  // Build the request body
  const body: Record<string, unknown> = {
    title,
    date,
    location,
    modality,
    attendees: attendees.map((a) => ({ name: a.name, role: a.role, attendance: a.attendance })),
    agenda,
    rawContent,
  }

  // Resolve audio from localStorage/memory and include as base64
  if (audioUrl) {
    const audioDataUrl = getAudioDataUrl(audioUrl)
    if (audioDataUrl && audioDataUrl.startsWith('data:')) {
      const parsed = parseDataUrl(audioDataUrl)
      if (parsed) {
        console.log('Audio incluido en la solicitud, tipo:', parsed.mimeType)
        body.audioBase64 = parsed.base64
        body.audioMimeType = parsed.mimeType
      }
    }
  }

  const response = await fetch('/api/generate-acta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message =
      errorData?.error || `Error del servidor (${response.status}). Intenta de nuevo.`
    throw new Error(message)
  }

  const data = await response.json()

  const generatedContent: GeneratedContent = {
    introduction: data.introduction || '',
    development: data.development || '',
    agreements: Array.isArray(data.agreements) ? data.agreements : [],
    commitments: Array.isArray(data.commitments)
      ? data.commitments.map((c: any) => ({
          description: c.description || '',
          responsible: c.responsible || '',
          dueDate: c.dueDate,
        }))
      : [],
    closure: data.closure || '',
    nextMeeting: data.nextMeeting,
  }

  console.log('Contenido generado exitosamente:', {
    introLength: generatedContent.introduction.length,
    devLength: generatedContent.development.length,
    agreements: generatedContent.agreements.length,
    commitments: generatedContent.commitments.length,
  })

  return generatedContent
}
