import { Timestamp } from 'firebase/firestore'

export interface Organization {
  id: string
  name: string
  slug: string
  createdAt: Timestamp
  createdBy: string
  settings: {
    logoUrl?: string
    defaultTemplate?: string
    geminiApiKey?: string
  }
}

export interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
  organizationId: string
  role: 'admin' | 'member'
  createdAt: Timestamp
  lastLoginAt: Timestamp
}

export interface MeetingAttendee {
  id: string
  name: string
  email: string
  role: string
  attendance: 'present' | 'absent' | 'excused'
  signatureStatus: 'pending' | 'signed'
  signatureToken?: string
  signatureUrl?: string
  signedAt?: Timestamp
}

export interface Commitment {
  description: string
  responsible: string
  dueDate?: Timestamp
}

export interface GeneratedContent {
  introduction: string
  development: string
  agreements: string[]
  commitments: Commitment[]
  closure: string
  nextMeeting?: {
    date: Timestamp
    location: string
  }
}

export interface Acta {
  id: string
  organizationId: string
  createdBy: string
  status: 'draft' | 'pending_signatures' | 'completed'
  meetingInfo: {
    title: string
    date: Timestamp
    startTime: string
    endTime?: string
    location: string
    modality: 'presencial' | 'virtual' | 'híbrida'
  }
  attendees: MeetingAttendee[]
  agenda: string[]
  rawContent: string
  audioUrl?: string
  generatedContent?: GeneratedContent
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt?: Timestamp
  pdfUrl?: string
}
