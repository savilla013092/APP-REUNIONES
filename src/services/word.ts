import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  ShadingType,
} from 'docx'
import { saveAs } from 'file-saver'
import type { Acta } from '../types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const getBlobFromUrl = async (url: string) => {
  const response = await fetch(url)
  return await response.blob()
}

// ── Cell helpers ──────────────────────────────────────────────────────────────
const headerCell = (text: string, widthPct?: number) =>
  new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: { fill: '1E3A8A', type: ShadingType.CLEAR, color: 'auto' },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })],
        spacing: { before: 80, after: 80 },
      }),
    ],
  })

const bodyCell = (text: string, widthPct?: number) =>
  new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 18 })],
        spacing: { before: 60, after: 60 },
      }),
    ],
  })

const labelCell = (text: string) =>
  new TableCell({
    shading: { fill: 'EFF6FF', type: ShadingType.CLEAR, color: 'auto' },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: '2563EB', size: 18 })],
        spacing: { before: 60, after: 60 },
      }),
    ],
  })

const valueCell = (text: string) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 18 })],
        spacing: { before: 60, after: 60 },
      }),
    ],
  })

const sectionTitle = (text: string) =>
  new Paragraph({
    children: [new TextRun({ text, bold: true, color: '1E3A8A', size: 22 })],
    spacing: { before: 320, after: 120 },
    border: {
      bottom: { value: 'single', size: 6, space: 4, color: '2563EB' },
    },
  })

const spacer = () => new Paragraph({ spacing: { after: 200 } })

// ── Main export ───────────────────────────────────────────────────────────────
export const generateActaWord = async (acta: Acta) => {
  const meetingDate = acta.meetingInfo.date.toDate()
  const generatedAt = format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
  const modalidad =
    acta.meetingInfo.modality.charAt(0).toUpperCase() + acta.meetingInfo.modality.slice(1)

  const sections: any[] = []

  // ── TITLE ──────────────────────────────────────────────────────────────────
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: 'MeetMind AI', size: 18, color: '2563EB' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'ACTA DE REUNIÓN', bold: true, size: 36, color: '1E3A8A' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: acta.meetingInfo.title, bold: true, size: 28, color: '1E293B' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  // ── MEETING INFO TABLE ─────────────────────────────────────────────────────
  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            labelCell('Fecha'),
            valueCell(format(meetingDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })),
            labelCell('Modalidad'),
            valueCell(modalidad),
          ],
        }),
        new TableRow({
          children: [
            labelCell('Hora'),
            valueCell(
              `${acta.meetingInfo.startTime}${acta.meetingInfo.endTime ? ' – ' + acta.meetingInfo.endTime : ''}`
            ),
            labelCell('Lugar / Enlace'),
            valueCell(acta.meetingInfo.location),
          ],
        }),
      ],
    }),
    spacer()
  )

  // ── AGENDA ─────────────────────────────────────────────────────────────────
  if (acta.agenda?.length > 0) {
    sections.push(sectionTitle('ORDEN DEL DÍA'))
    acta.agenda.forEach((item, i) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}.  `, bold: true, color: '2563EB', size: 20 }),
            new TextRun({ text: item, size: 20 }),
          ],
          spacing: { after: 100 },
        })
      )
    })
    sections.push(spacer())
  }

  // ── ATTENDEES TABLE ────────────────────────────────────────────────────────
  if (acta.attendees?.length > 0) {
    sections.push(sectionTitle('LISTA DE ASISTENTES'))

    const attendanceLabel: Record<string, string> = {
      present: 'Presente',
      absent: 'Ausente',
      excused: 'Justificado',
    }

    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              headerCell('Nombre', 28),
              headerCell('Rol / Cargo', 26),
              headerCell('Correo', 32),
              headerCell('Asistencia', 14),
            ],
          }),
          ...acta.attendees.map(
            a =>
              new TableRow({
                children: [
                  bodyCell(a.name, 28),
                  bodyCell(a.role, 26),
                  bodyCell(a.email || '—', 32),
                  bodyCell(attendanceLabel[a.attendance] || a.attendance, 14),
                ],
              })
          ),
        ],
      }),
      spacer()
    )
  }

  // ── 1. PREÁMBULO ───────────────────────────────────────────────────────────
  if (acta.generatedContent?.introduction) {
    sections.push(
      sectionTitle('1.  PREÁMBULO'),
      new Paragraph({
        children: [new TextRun({ text: acta.generatedContent.introduction, size: 20 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 300 },
      })
    )
  }

  // ── 2. DESARROLLO ──────────────────────────────────────────────────────────
  if (acta.generatedContent?.development) {
    sections.push(
      sectionTitle('2.  DESARROLLO DE LA REUNIÓN'),
      new Paragraph({
        children: [new TextRun({ text: acta.generatedContent.development, size: 20 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 300 },
      })
    )
  }

  // ── 3. ACUERDOS ────────────────────────────────────────────────────────────
  if (acta.generatedContent?.agreements?.length) {
    sections.push(sectionTitle('3.  ACUERDOS Y DECISIONES'))
    acta.generatedContent.agreements.forEach((agreement, i) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}.  `, bold: true, color: '2563EB', size: 20 }),
            new TextRun({ text: agreement, size: 20 }),
          ],
          spacing: { after: 120 },
        })
      )
    })
    sections.push(spacer())
  }

  // ── 4. COMPROMISOS ─────────────────────────────────────────────────────────
  if (acta.generatedContent?.commitments?.length) {
    sections.push(sectionTitle('4.  COMPROMISOS Y TAREAS'))
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              headerCell('#', 6),
              headerCell('Descripción del Compromiso', 52),
              headerCell('Responsable', 28),
              headerCell('Vencimiento', 14),
            ],
          }),
          ...acta.generatedContent.commitments.map((c, i) =>
            new TableRow({
              children: [
                bodyCell(`${i + 1}`, 6),
                bodyCell(c.description, 52),
                bodyCell(c.responsible, 28),
                bodyCell(
                  c.dueDate
                    ? (c.dueDate as any).toDate
                      ? format((c.dueDate as any).toDate(), 'dd/MM/yyyy')
                      : String(c.dueDate)
                    : '—',
                  14
                ),
              ],
            })
          ),
        ],
      }),
      spacer()
    )
  }

  // ── 5. CIERRE ──────────────────────────────────────────────────────────────
  if (acta.generatedContent?.closure) {
    sections.push(
      sectionTitle('5.  CIERRE'),
      new Paragraph({
        children: [new TextRun({ text: acta.generatedContent.closure, size: 20 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 300 },
      })
    )
  }

  // ── 6. PRÓXIMA REUNIÓN ─────────────────────────────────────────────────────
  if (acta.generatedContent?.nextMeeting) {
    const nm = acta.generatedContent.nextMeeting
    const nmDate = (nm.date as any)?.toDate ? (nm.date as any).toDate() : nm.date
    sections.push(
      sectionTitle('6.  PRÓXIMA REUNIÓN'),
      new Paragraph({
        children: [
          new TextRun({ text: 'Fecha:  ', bold: true, color: '2563EB', size: 20 }),
          new TextRun({
            text: format(nmDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }),
            size: 20,
          }),
          new TextRun({ text: '     Lugar:  ', bold: true, color: '2563EB', size: 20 }),
          new TextRun({ text: nm.location, size: 20 }),
        ],
        spacing: { after: 300 },
      })
    )
  }

  // ── FIRMAS ─────────────────────────────────────────────────────────────────
  sections.push(sectionTitle('FIRMAS DE LOS ASISTENTES'))

  // Show ALL attendees regardless of signature status
  for (const attendee of acta.attendees) {
    if (attendee.signatureUrl) {
      try {
        const blob = await getBlobFromUrl(attendee.signatureUrl)
        const arrayBuffer = await blob.arrayBuffer()
        sections.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: arrayBuffer,
                transformation: { width: 150, height: 60 },
                type: 'png',
              }),
            ],
            spacing: { before: 240 },
          })
        )
      } catch {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: '_'.repeat(28), color: 'AAAAAA' })],
            spacing: { before: 240 },
          })
        )
      }
    } else {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: '_'.repeat(28), color: 'AAAAAA' })],
          spacing: { before: 240 },
        })
      )
    }

    sections.push(
      new Paragraph({
        children: [new TextRun({ text: attendee.name, bold: true, size: 20 })],
      }),
      new Paragraph({
        children: [new TextRun({ text: attendee.role, color: '64748B', size: 18 })],
      })
    )

    if (attendee.signedAt) {
      const sAt = (attendee.signedAt as any).toDate
        ? (attendee.signedAt as any).toDate()
        : attendee.signedAt
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `✓ Firmado: ${format(sAt, 'dd/MM/yyyy HH:mm')}`,
              color: '16A34A',
              size: 16,
            }),
          ],
          spacing: { after: 400 },
        })
      )
    } else {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Pendiente de firma', color: 'F59E0B', italics: true, size: 16 }),
          ],
          spacing: { after: 400 },
        })
      )
    }
  }

  // ── FOOTER NOTE ────────────────────────────────────────────────────────────
  sections.push(
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Documento generado automáticamente con MeetMind AI el ${generatedAt}.`,
          color: 'AAAAAA',
          italics: true,
          size: 16,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  )

  const doc = new Document({
    sections: [{ children: sections }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(
    blob,
    `Acta_${acta.meetingInfo.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.docx`
  )
}
