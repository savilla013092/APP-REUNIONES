import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { defineSecret } from "firebase-functions/params";

// Define secret for Gemini API key
const geminiApiKey = defineSecret("GEMINI_API_KEY");

interface MeetingAttendee {
  id: string;
  name: string;
  email: string;
  role: string;
  attendance: "present" | "absent" | "excused";
}

interface GenerateActaRequest {
  title: string;
  date: string;
  location: string;
  modality: string;
  attendees: MeetingAttendee[];
  agenda: string[];
  rawContent: string;
}

interface Commitment {
  description: string;
  responsible: string;
  dueDate?: string;
}

interface GeneratedContent {
  introduction: string;
  development: string;
  agreements: string[];
  commitments: Commitment[];
  closure: string;
  nextMeeting?: {
    date: string;
    location: string;
  };
}

export const generateActa = onCall(
  {
    secrets: [geminiApiKey],
    cors: true,
    maxInstances: 10,
  },
  async (request): Promise<GeneratedContent> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "El usuario debe estar autenticado para generar actas."
      );
    }

    const data = request.data as GenerateActaRequest;

    // Validate required fields
    if (!data.title || !data.rawContent) {
      throw new HttpsError(
        "invalid-argument",
        "Se requiere título y contenido de la reunión."
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey.value());
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const attendeesList = data.attendees
      .map((a) => `- ${a.name} (${a.role}): ${a.attendance}`)
      .join("\n");

    const agendaText =
      data.agenda.length > 0 ? data.agenda.join(", ") : "No especificada";

    const prompt = `
    Eres un asistente especializado en redacción de actas de reunión formales y profesionales.

    CONTEXTO DE LA REUNIÓN:
    - Título: ${data.title}
    - Fecha: ${data.date}
    - Lugar: ${data.location}
    - Modalidad: ${data.modality}

    ASISTENTES:
    ${attendeesList}

    ORDEN DEL DÍA:
    ${agendaText}

    CONTENIDO DE LA REUNIÓN (notas/transcripción):
    ${data.rawContent}

    INSTRUCCIONES:
    1. Interpreta las ideas, aunque estén desordenadas o sean informales.
    2. Genera un acta formal y profesional con la siguiente estructura:
       - INTRODUCCIÓN: Párrafo formal indicando fecha, hora, lugar y propósito.
       - DESARROLLO: Resumen estructurado de los temas tratados, siguiendo el orden del día si existe.
       - ACUERDOS: Lista de decisiones tomadas.
       - COMPROMISOS: Lista de tareas con responsable y fecha (si se mencionan).
       - CIERRE: Párrafo formal de cierre.

    FORMATO DE RESPUESTA:
    Responde ÚNICAMENTE con un JSON válido (sin markdown, sin bloques de código) con esta estructura:
    {
      "introduction": "texto...",
      "development": "texto...",
      "agreements": ["acuerdo 1", "acuerdo 2"],
      "commitments": [
        {"description": "...", "responsible": "...", "dueDate": "YYYY-MM-DD"}
      ],
      "closure": "texto...",
      "nextMeeting": {"date": "YYYY-MM-DD", "location": "..."}
    }

    REGLAS DE REDACCIÓN:
    - Usa lenguaje formal y profesional en español.
    - Tercera persona.
    - Evita coloquialismos.
  `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Clean potential markdown blocks if AI ignored instructions
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

      return JSON.parse(cleanJson) as GeneratedContent;
    } catch (error) {
      console.error("Error generating acta with Gemini:", error);
      throw new HttpsError(
        "internal",
        "No se pudo generar el acta automáticamente. Verifica el contenido e intenta de nuevo."
      );
    }
  }
);
