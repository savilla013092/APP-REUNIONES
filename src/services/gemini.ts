import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GeneratedContent, MeetingAttendee } from '../types'
import { getAudioDataUrl } from './storage'

// Gemini API key from environment
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY

/**
 * Convert data URL to base64 and extract mime type
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
 * Generate meeting acta using Gemini AI
 * @param audioUrl - Optional audio URL or localStorage key
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
  if (!geminiApiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY no esta configurada. Agrega tu API key de Gemini en el archivo .env.local'
    )
  }

  console.log('Generando acta con Gemini API...')
  console.log('Titulo:', title)

  const genAI = new GoogleGenerativeAI(geminiApiKey)
  // Usar gemini-2.0-flash que está disponible en la cuenta
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const attendeesList = attendees.map(a => `- ${a.name} (${a.role}): ${a.attendance}`).join('\n')

  const agendaText = agenda.length > 0 ? agenda.join(', ') : 'No especificada'

  const prompt = `
Eres un asistente especializado en redaccion de actas de reunion formales y profesionales en español.

CONTEXTO DE LA REUNION:
- Titulo: ${title}
- Fecha: ${date}
- Lugar: ${location}
- Modalidad: ${modality}

ASISTENTES:
${attendeesList || 'No especificados'}

ORDEN DEL DIA:
${agendaText}

CONTENIDO DE LA REUNION (notas/transcripcion):
${rawContent}

INSTRUCCIONES:
1. Analiza cuidadosamente el contenido proporcionado.
2. Interpreta las ideas, aunque esten desordenadas o sean informales.
3. Genera un acta formal y profesional con la siguiente estructura:
   - INTRODUCCION: Parrafo formal indicando fecha, lugar, modalidad y proposito de la reunion.
   - DESARROLLO: Resumen estructurado y detallado de los temas tratados, expandiendo las ideas del contenido.
   - ACUERDOS: Lista de decisiones tomadas (si no hay explicitas, infiere las posibles basado en el contexto).
   - COMPROMISOS: Lista de tareas con responsable (si se mencionan).
   - CIERRE: Parrafo formal de cierre.

FORMATO DE RESPUESTA:
Responde UNICAMENTE con un JSON valido (sin markdown, sin bloques de codigo) con esta estructura exacta:
{
  "introduction": "parrafo de introduccion...",
  "development": "desarrollo detallado de la reunion...",
  "agreements": ["acuerdo 1", "acuerdo 2"],
  "commitments": [
    {"description": "descripcion de la tarea", "responsible": "nombre del responsable"}
  ],
  "closure": "parrafo de cierre..."
}

REGLAS DE REDACCION:
- Usa lenguaje formal y profesional en español.
- Escribe en tercera persona.
- Evita coloquialismos.
- Expande y mejora el contenido proporcionado para que sea profesional.
- Si el contenido es breve, desarrolla mas las ideas de forma coherente.
`

  try {
    console.log('Llamando a Gemini API con modelo: gemini-2.0-flash')

    // Prepare content parts
    const contentParts: any[] = []

    // Try to include audio if available
    let audioIncluded = false
    if (audioUrl) {
      console.log('Procesando audio para Gemini...')
      // Get actual data URL from localStorage if it's a key
      const audioDataUrl = getAudioDataUrl(audioUrl)

      if (audioDataUrl && audioDataUrl.startsWith('data:')) {
        const parsed = parseDataUrl(audioDataUrl)
        if (parsed) {
          console.log('Audio incluido en la solicitud, tipo:', parsed.mimeType)
          contentParts.push({
            inlineData: {
              mimeType: parsed.mimeType,
              data: parsed.base64,
            },
          })
          audioIncluded = true
        }
      }
    }

    // Add the text prompt
    const audioInstructions = audioIncluded
      ? '\n\nIMPORTANTE: Se ha adjuntado un audio de la reunion. PRIMERO transcribe el audio y usa esa transcripcion como contenido principal para generar el acta. Las notas escritas son complementarias.'
      : ''

    contentParts.push({ text: prompt + audioInstructions })

    let result
    try {
      result = await model.generateContent(contentParts)
    } catch (apiError: any) {
      console.error('Error de API Gemini:', apiError)
      console.error('Mensaje del error:', apiError?.message)
      // Check for specific API errors
      if (apiError?.message?.includes('not found') || apiError?.status === 404) {
        throw new Error(
          'El modelo de Gemini no esta disponible. Verifica tu API key en Google AI Studio.'
        )
      }
      if (
        apiError?.message?.includes('API_KEY') ||
        apiError?.status === 401 ||
        apiError?.status === 403
      ) {
        throw new Error(
          'API Key de Gemini invalida o sin permisos. Verifica tu configuracion en .env.local'
        )
      }
      if (apiError?.message?.includes('SAFETY')) {
        throw new Error(
          'El contenido fue bloqueado por filtros de seguridad de Gemini. Intenta con un contenido diferente.'
        )
      }
      throw apiError
    }

    const response = await result.response
    const text = response.text()

    console.log('Respuesta completa de Gemini:', text)

    // Clean potential markdown blocks if AI ignored instructions
    let cleanJson = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim()

    // Try to extract JSON - use a non-greedy approach to find the first complete JSON object
    // This handles cases where there might be extra text before or after the JSON
    let jsonStr = cleanJson

    // Find the first { and try to find the matching }
    const startIndex = cleanJson.indexOf('{')
    if (startIndex !== -1) {
      let braceCount = 0
      let endIndex = -1

      for (let i = startIndex; i < cleanJson.length; i++) {
        if (cleanJson[i] === '{') braceCount++
        if (cleanJson[i] === '}') braceCount--
        if (braceCount === 0) {
          endIndex = i
          break
        }
      }

      if (endIndex !== -1) {
        jsonStr = cleanJson.substring(startIndex, endIndex + 1)
      }
    }

    console.log('JSON extraido:', jsonStr.substring(0, 500) + '...')

    let parsed: any
    try {
      parsed = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError)
      console.error('JSON que fallo:', jsonStr)
      throw new Error(
        'La respuesta de Gemini no es un JSON valido. Intenta de nuevo o simplifica el contenido de la reunion.'
      )
    }

    // Validate required fields
    if (!parsed.introduction && !parsed.development) {
      console.error('Campos faltantes en respuesta:', parsed)
      throw new Error('La respuesta de Gemini no contiene los campos esperados. Intenta de nuevo.')
    }

    // Ensure all required fields exist with proper defaults
    const generatedContent: GeneratedContent = {
      introduction: parsed.introduction || '',
      development: parsed.development || '',
      agreements: Array.isArray(parsed.agreements) ? parsed.agreements : [],
      commitments: Array.isArray(parsed.commitments)
        ? parsed.commitments.map((c: any) => ({
            description: c.description || c.tarea || '',
            responsible: c.responsible || c.responsable || '',
            dueDate: c.dueDate,
          }))
        : [],
      closure: parsed.closure || '',
      nextMeeting: parsed.nextMeeting,
    }

    console.log('Contenido generado exitosamente:', {
      introLength: generatedContent.introduction.length,
      devLength: generatedContent.development.length,
      agreements: generatedContent.agreements.length,
      commitments: generatedContent.commitments.length,
    })

    return generatedContent
  } catch (error: any) {
    console.error('=== ERROR COMPLETO DE GEMINI ===')
    console.error('Tipo:', typeof error)
    console.error('Mensaje:', error?.message)
    console.error('Error completo:', error)
    console.error('================================')

    const errorMsg = error?.message?.toLowerCase() || ''

    // Re-throw custom errors we already created
    if (
      error instanceof Error &&
      (error.message.includes('JSON') ||
        error.message.includes('campos esperados') ||
        error.message.includes('modelo') ||
        error.message.includes('API Key') ||
        error.message.includes('filtros de seguridad'))
    ) {
      throw error
    }

    // Check for specific API errors
    if (errorMsg.includes('quota exceeded') || errorMsg.includes('resource exhausted')) {
      throw new Error('Se ha excedido la cuota de la API de Gemini. Intenta mas tarde.')
    }
    if (errorMsg.includes('rate limit')) {
      throw new Error('Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.')
    }
    if (
      errorMsg.includes('api key') ||
      errorMsg.includes('api_key') ||
      errorMsg.includes('invalid key')
    ) {
      throw new Error('API Key de Gemini invalida. Verifica tu configuracion.')
    }
    if (errorMsg.includes('not found') || errorMsg.includes('404')) {
      throw new Error('Modelo de Gemini no encontrado. Verifica la configuracion.')
    }
    if (errorMsg.includes('blocked') || errorMsg.includes('safety')) {
      throw new Error(
        'Contenido bloqueado por filtros de seguridad. Modifica el texto e intenta de nuevo.'
      )
    }

    // Show the actual error for debugging
    throw new Error(
      'Error de Gemini: ' +
        (error?.message || 'Error desconocido. Revisa la consola para mas detalles.')
    )
  }
}
