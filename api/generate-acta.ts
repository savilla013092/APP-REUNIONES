import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface RequestBody {
  title: string
  date: string
  location: string
  modality: string
  attendees: { name: string; role: string; attendance: string }[]
  agenda: string[]
  rawContent: string
  audioBase64?: string
  audioMimeType?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error:
        'GEMINI_API_KEY no esta configurada en el servidor. Configurala en Vercel: Settings > Environment Variables.',
    })
  }

  let body: RequestBody
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON valido.' })
  }

  if (!body || !body.title) {
    return res.status(400).json({ error: 'Falta el campo requerido: title.' })
  }

  const attendeesList = (body.attendees || [])
    .map((a) => `- ${a.name} (${a.role}): ${a.attendance}`)
    .join('\n')

  const agendaText = body.agenda?.length > 0 ? body.agenda.join(', ') : 'No especificada'

  const prompt = `
Eres un asistente especializado en redaccion de actas de reunion formales y profesionales en español.

CONTEXTO DE LA REUNION:
- Titulo: ${body.title}
- Fecha: ${body.date}
- Lugar: ${body.location}
- Modalidad: ${body.modality}

ASISTENTES:
${attendeesList || 'No especificados'}

ORDEN DEL DIA:
${agendaText}

CONTENIDO DE LA REUNION (notas/transcripcion):
${body.rawContent}

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
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const contentParts: any[] = []

    // Include audio if provided
    let audioIncluded = false
    if (body.audioBase64 && body.audioMimeType) {
      contentParts.push({
        inlineData: {
          mimeType: body.audioMimeType,
          data: body.audioBase64,
        },
      })
      audioIncluded = true
    }

    const audioInstructions = audioIncluded
      ? '\n\nIMPORTANTE: Se ha adjuntado un audio de la reunion. PRIMERO transcribe el audio y usa esa transcripcion como contenido principal para generar el acta. Las notas escritas son complementarias.'
      : ''

    contentParts.push({ text: prompt + audioInstructions })

    const result = await model.generateContent(contentParts)
    const response = result.response
    const text = response.text()

    // Clean potential markdown blocks
    let cleanJson = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim()

    // Extract JSON object
    let jsonStr = cleanJson
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

    const parsed = JSON.parse(jsonStr)

    if (!parsed.introduction && !parsed.development) {
      return res.status(500).json({
        error: 'La respuesta de Gemini no contiene los campos esperados. Intenta de nuevo.',
      })
    }

    return res.status(200).json({
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
    })
  } catch (error: any) {
    console.error('Error en serverless function generate-acta:', error)

    const errorMsg = error?.message?.toLowerCase() || ''

    if (errorMsg.includes('not found') || error?.status === 404) {
      return res.status(502).json({
        error: 'El modelo de Gemini no esta disponible. Verifica la API key en Vercel.',
      })
    }
    if (
      errorMsg.includes('api_key') ||
      errorMsg.includes('api key') ||
      error?.status === 401 ||
      error?.status === 403
    ) {
      return res.status(502).json({
        error: 'API Key de Gemini invalida o sin permisos. Verifica la configuracion en Vercel.',
      })
    }
    if (errorMsg.includes('safety') || errorMsg.includes('blocked')) {
      return res.status(422).json({
        error:
          'El contenido fue bloqueado por filtros de seguridad de Gemini. Intenta con un contenido diferente.',
      })
    }
    if (errorMsg.includes('quota exceeded') || errorMsg.includes('resource exhausted')) {
      return res.status(429).json({
        error: 'Se ha excedido la cuota de la API de Gemini. Intenta mas tarde.',
      })
    }
    if (errorMsg.includes('rate limit')) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.',
      })
    }

    // JSON parse errors
    if (error instanceof SyntaxError) {
      return res.status(502).json({
        error:
          'La respuesta de Gemini no es un JSON valido. Intenta de nuevo o simplifica el contenido.',
      })
    }

    return res.status(500).json({
      error: 'Error al generar el acta: ' + (error?.message || 'Error desconocido.'),
    })
  }
}
