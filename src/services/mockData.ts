import type { Acta, GeneratedContent } from '../types'
import { isFirebaseConfigured } from './firebase'

// Check if we're in demo mode (no Firebase config)
export const isDemoMode = (): boolean => {
  return !isFirebaseConfigured
}

// Mock user for demo mode
export const MOCK_USER = {
  id: 'demo-user-001',
  email: 'demo@meetmind.app',
  displayName: 'Usuario Demo',
  organizationId: 'demo-org-001',
  role: 'admin' as const,
  createdAt: new Date(),
  lastLoginAt: new Date(),
}

// Local storage key
const ACTAS_STORAGE_KEY = 'meetmind_demo_actas'

// Sample actas for demo
const sampleActas: Omit<Acta, 'id'>[] = [
  {
    organizationId: 'demo-org-001',
    createdBy: 'demo-user-001',
    status: 'completed',
    meetingInfo: {
      title: 'Reunion de Planificacion Q1 2026',
      date: { toDate: () => new Date('2026-01-20T10:00:00') } as any,
      startTime: '10:00',
      endTime: '11:30',
      location: 'Sala de Conferencias A',
      modality: 'presencial',
    },
    attendees: [
      {
        id: 'att-1',
        name: 'Maria Garcia',
        email: 'maria@ejemplo.com',
        role: 'Gerente de Proyecto',
        attendance: 'present',
        signatureStatus: 'signed',
      },
      {
        id: 'att-2',
        name: 'Juan Perez',
        email: 'juan@ejemplo.com',
        role: 'Desarrollador Senior',
        attendance: 'present',
        signatureStatus: 'signed',
      },
      {
        id: 'att-3',
        name: 'Ana Martinez',
        email: 'ana@ejemplo.com',
        role: 'Disenadora UX',
        attendance: 'present',
        signatureStatus: 'pending',
      },
    ],
    agenda: ['Revision de objetivos Q1', 'Asignacion de recursos', 'Cronograma de entregas'],
    rawContent: 'Se discutieron los objetivos principales del trimestre...',
    generatedContent: {
      introduction:
        'El dia 20 de enero de 2026, siendo las 10:00 horas, se llevo a cabo la reunion de planificacion del primer trimestre en la Sala de Conferencias A, con la asistencia de los miembros del equipo de desarrollo.',
      development:
        'Durante la sesion se revisaron los objetivos estrategicos definidos para el Q1 2026. Se analizo la disponibilidad de recursos humanos y tecnologicos, estableciendo prioridades para cada iniciativa. El equipo acordo un cronograma tentativo de entregas que sera revisado semanalmente.',
      agreements: [
        'Priorizar el desarrollo del modulo de reportes',
        'Implementar reuniones de seguimiento semanales',
        'Documentar todos los procesos criticos',
      ],
      commitments: [
        {
          description: 'Entregar documento de especificaciones tecnicas',
          responsible: 'Juan Perez',
          dueDate: { toDate: () => new Date('2026-01-27') } as any,
        },
        {
          description: 'Disenar mockups del nuevo dashboard',
          responsible: 'Ana Martinez',
          dueDate: { toDate: () => new Date('2026-01-31') } as any,
        },
      ],
      closure:
        'Sin mas asuntos que tratar, se dio por finalizada la reunion a las 11:30 horas, comprometiendose los asistentes a cumplir con las tareas asignadas.',
    },
    createdAt: { toDate: () => new Date('2026-01-20T12:00:00') } as any,
    updatedAt: { toDate: () => new Date('2026-01-20T12:00:00') } as any,
  },
  {
    organizationId: 'demo-org-001',
    createdBy: 'demo-user-001',
    status: 'draft',
    meetingInfo: {
      title: 'Sincronizacion Semanal del Equipo',
      date: { toDate: () => new Date('2026-01-24T09:00:00') } as any,
      startTime: '09:00',
      endTime: '09:45',
      location: 'Google Meet',
      modality: 'virtual',
    },
    attendees: [
      {
        id: 'att-4',
        name: 'Carlos Rodriguez',
        email: 'carlos@ejemplo.com',
        role: 'Tech Lead',
        attendance: 'present',
        signatureStatus: 'pending',
      },
      {
        id: 'att-5',
        name: 'Laura Sanchez',
        email: 'laura@ejemplo.com',
        role: 'QA Engineer',
        attendance: 'present',
        signatureStatus: 'pending',
      },
    ],
    agenda: ['Estado de tareas en curso', 'Bloqueos y dependencias', 'Planificacion de sprint'],
    rawContent: 'Reunion de sincronizacion semanal del equipo de desarrollo...',
    createdAt: { toDate: () => new Date('2026-01-24T10:00:00') } as any,
    updatedAt: { toDate: () => new Date('2026-01-24T10:00:00') } as any,
  },
]

// Helper to create a mock Timestamp-like object
const createMockTimestamp = (dateValue: string | Date | any): any => {
  if (typeof dateValue === 'string') {
    return { toDate: () => new Date(dateValue) }
  }
  if (dateValue instanceof Date) {
    return { toDate: () => dateValue }
  }
  if (dateValue && typeof dateValue === 'object' && '_date' in dateValue) {
    return { toDate: () => new Date(dateValue._date) }
  }
  return { toDate: () => new Date() }
}

// Helper to serialize dates for localStorage
const serializeActaForStorage = (acta: any): any => {
  return {
    ...acta,
    meetingInfo: {
      ...acta.meetingInfo,
      date: { _date: acta.meetingInfo.date?.toDate?.()?.toISOString() || new Date().toISOString() },
    },
    createdAt: { _date: acta.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() },
    updatedAt: { _date: acta.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString() },
  }
}

// Helper to deserialize dates from localStorage
const deserializeActaFromStorage = (acta: any): Acta => {
  return {
    ...acta,
    meetingInfo: {
      ...acta.meetingInfo,
      date: createMockTimestamp(acta.meetingInfo?.date),
    },
    createdAt: createMockTimestamp(acta.createdAt),
    updatedAt: createMockTimestamp(acta.updatedAt),
    generatedContent: acta.generatedContent
      ? {
          ...acta.generatedContent,
          commitments: acta.generatedContent.commitments?.map((c: any) => ({
            ...c,
            dueDate: c.dueDate ? createMockTimestamp(c.dueDate) : undefined,
          })),
          nextMeeting: acta.generatedContent.nextMeeting
            ? {
                ...acta.generatedContent.nextMeeting,
                date: createMockTimestamp(acta.generatedContent.nextMeeting.date),
              }
            : undefined,
        }
      : undefined,
    attendees: acta.attendees?.map((a: any) => ({
      ...a,
      signedAt: a.signedAt ? createMockTimestamp(a.signedAt) : undefined,
    })),
  } as Acta
}

// Version for data format - increment when structure changes
const DATA_VERSION = 'v2'
const VERSION_KEY = 'meetmind_demo_version'

// Initialize demo data in localStorage
export const initializeDemoData = (): void => {
  const existingVersion = localStorage.getItem(VERSION_KEY)
  const existing = localStorage.getItem(ACTAS_STORAGE_KEY)

  // Reinitialize if no data, wrong version, or corrupted data
  const needsInit = !existing || existingVersion !== DATA_VERSION

  if (needsInit) {
    const actasWithIds = sampleActas.map((acta, index) =>
      serializeActaForStorage({
        ...acta,
        id: `demo-acta-${index + 1}`,
      })
    )
    localStorage.setItem(ACTAS_STORAGE_KEY, JSON.stringify(actasWithIds))
    localStorage.setItem(VERSION_KEY, DATA_VERSION)
    console.log(
      'Demo data initialized (version ' + DATA_VERSION + '):',
      actasWithIds.length,
      'actas'
    )
  }
}

// Force reset demo data (useful for debugging)
export const resetDemoData = (): void => {
  localStorage.removeItem(ACTAS_STORAGE_KEY)
  localStorage.removeItem(VERSION_KEY)
  initializeDemoData()
  console.log('Demo data reset')
}

// Get all actas from localStorage
export const getDemoActas = (organizationId: string): Acta[] => {
  initializeDemoData()
  const data = localStorage.getItem(ACTAS_STORAGE_KEY)
  if (!data) {
    console.log('No demo data found in localStorage')
    return []
  }

  try {
    const rawActas = JSON.parse(data) as any[]
    const actas = rawActas.map(deserializeActaFromStorage)
    const filtered = actas.filter(a => a.organizationId === organizationId)
    console.log(`getDemoActas: Found ${filtered.length} actas for org ${organizationId}`)
    return filtered.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.()?.getTime() || 0
      const dateB = b.createdAt?.toDate?.()?.getTime() || 0
      return dateB - dateA
    })
  } catch (error) {
    console.error('Error parsing demo actas:', error)
    return []
  }
}

// Get single acta
export const getDemoActa = (id: string): Acta | null => {
  initializeDemoData()
  const data = localStorage.getItem(ACTAS_STORAGE_KEY)
  if (!data) return null

  try {
    const rawActas = JSON.parse(data) as any[]
    const rawActa = rawActas.find(a => a.id === id)
    if (!rawActa) return null
    return deserializeActaFromStorage(rawActa)
  } catch (error) {
    console.error('Error getting demo acta:', error)
    return null
  }
}

// Save new acta
export const saveDemoActa = (actaData: Partial<Acta>): string => {
  initializeDemoData()
  const data = localStorage.getItem(ACTAS_STORAGE_KEY)
  const actas = data ? (JSON.parse(data) as any[]) : []

  const newId = `demo-acta-${Date.now()}`

  const newActa = serializeActaForStorage({
    ...actaData,
    id: newId,
    createdAt: { toDate: () => new Date() },
    updatedAt: { toDate: () => new Date() },
  })

  actas.push(newActa)
  localStorage.setItem(ACTAS_STORAGE_KEY, JSON.stringify(actas))
  console.log('Demo acta saved:', newId)

  return newId
}

// Update existing acta
export const updateDemoActa = (id: string, actaData: Partial<Acta>): void => {
  initializeDemoData()
  const data = localStorage.getItem(ACTAS_STORAGE_KEY)
  if (!data) return

  try {
    const actas = JSON.parse(data) as any[]
    const index = actas.findIndex(a => a.id === id)

    if (index !== -1) {
      // Deserialize, merge, then serialize again
      const existingActa = deserializeActaFromStorage(actas[index])
      const updatedActa = {
        ...existingActa,
        ...actaData,
        updatedAt: { toDate: () => new Date() },
      }
      actas[index] = serializeActaForStorage(updatedActa)
      localStorage.setItem(ACTAS_STORAGE_KEY, JSON.stringify(actas))
      console.log('Demo acta updated:', id)
    }
  } catch (error) {
    console.error('Error updating demo acta:', error)
  }
}

// Generate mock content (simulates AI generation)
export const generateDemoContent = (
  title: string,
  date: string,
  location: string,
  modality: string,
  attendees: { name: string; role: string }[],
  agenda: string[],
  rawContent: string
): GeneratedContent => {
  const attendeesList = attendees.map(a => a.name).join(', ')
  const agendaText = agenda.length > 0 ? agenda.join(', ') : 'temas varios'

  return {
    introduction: `El dia ${date}, se llevo a cabo la reunion "${title}" en ${location} bajo modalidad ${modality}. Asistieron: ${attendeesList}.`,
    development: `Durante la sesion se abordaron los siguientes temas: ${agendaText}. ${rawContent.length > 50 ? 'Se discutieron diversos puntos relevantes para el avance del proyecto.' : 'Los participantes intercambiaron ideas y propuestas.'}`,
    agreements: [
      'Se aprobo continuar con el plan propuesto',
      'Se establecio fecha para la proxima reunion de seguimiento',
    ],
    commitments: [
      {
        description: 'Enviar resumen ejecutivo a los participantes',
        responsible: attendees[0]?.name || 'Responsable asignado',
      },
    ],
    closure: `Sin mas asuntos que tratar, se dio por finalizada la reunion, comprometiendose los asistentes a dar seguimiento a los acuerdos establecidos.`,
  }
}
