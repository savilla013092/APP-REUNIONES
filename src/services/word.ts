import {
  Document,
  Header,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  ShadingType,
  VerticalAlign,
  BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'
import type { Acta } from '../types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Company constants ─────────────────────────────────────────────────────────
const CO_NAME    = 'SERVICIUDAD E.S.P.'
const CO_NIT     = 'NIT: 816001609-1'
const CO_DOC     = 'Actas de Reunión'
const CO_CODE    = 'GGFO-02'
const CO_VERSION = '01'

// ── Helpers ───────────────────────────────────────────────────────────────────
const getBlobFromUrl = async (url: string) => {
  const response = await fetch(url)
  return await response.blob()
}

// ── Cell factory helpers ──────────────────────────────────────────────────────
const headerCell = (text: string, widthPct?: number) =>
  new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: { fill: '1E3A8A', type: ShadingType.CLEAR, color: 'auto' },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 60 },
      }),
    ],
  })

const bodyCell = (text: string, widthPct?: number) =>
  new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
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
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: '1E3A8A', size: 18 })],
        spacing: { before: 60, after: 60 },
      }),
    ],
  })

const valueCell = (text: string) =>
  new TableCell({
    verticalAlign: VerticalAlign.CENTER,
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
      bottom: { style: BorderStyle.SINGLE, size: 6, space: 4, color: '2563EB' },
    },
  })

const spacer = () => new Paragraph({ spacing: { after: 200 } })

// ── Build the company header table (used in Word's native Header) ─────────────
const buildCompanyHeaderTable = (logoArrayBuffer: ArrayBuffer | null): Table => {
  // Logo cell content
  const logoCellContent = logoArrayBuffer
    ? [
        new Paragraph({
          children: [
            new ImageRun({
              data: logoArrayBuffer,
              transformation: { width: 90, height: 48 },
              type: 'png',
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ]
    : [
        new Paragraph({
          children: [new TextRun({ text: 'SERVICIUDAD', bold: true, size: 16, color: '1E293B' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 40 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'ACUEDUCTO · ASEO', size: 11, color: '666666' })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: 'ALCANTARILLADO E.S.P.', size: 11, color: '666666' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
        }),
      ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Row 1: Logo | Company Name | Código | Versión
      new TableRow({
        children: [
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            rowSpan: 2,
            verticalAlign: VerticalAlign.CENTER,
            children: logoCellContent,
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [new TextRun({ text: CO_NAME, bold: true, size: 26, color: '0F172A' })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 60 },
              }),
              new Paragraph({
                children: [new TextRun({ text: CO_NIT, size: 16, color: '666666' })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
              }),
            ],
          }),
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Código', size: 14, color: '888888' })],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [new TextRun({ text: CO_CODE, bold: true, size: 18, color: '0F172A' })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
              }),
            ],
          }),
          new TableCell({
            width: { size: 11, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Versión', size: 14, color: '888888' })],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [new TextRun({ text: CO_VERSION, bold: true, size: 18, color: '0F172A' })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
              }),
            ],
          }),
        ],
      }),
      // Row 2: [Logo continues] | Doc type | Página
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [new TextRun({ text: CO_DOC, size: 20, color: '333333' })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60 },
              }),
            ],
          }),
          new TableCell({
            columnSpan: 2,
            width: { size: 23, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Página', size: 14, color: '888888' })],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '', size: 16, bold: true }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, bold: true }),
                  new TextRun({ text: ' de ', size: 16, color: '666666' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, bold: true }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

// ── Main export ───────────────────────────────────────────────────────────────
export const generateActaWord = async (acta: Acta) => {
  const meetingDate = acta.meetingInfo.date.toDate()
  const modalidad =
    acta.meetingInfo.modality.charAt(0).toUpperCase() + acta.meetingInfo.modality.slice(1)

  // Load company logo (optional)
  let logoArrayBuffer: ArrayBuffer | null = null
  try {
    const blob = await getBlobFromUrl('/logo-serviciudad.png')
    logoArrayBuffer = await blob.arrayBuffer()
  } catch {
    // No logo file yet
  }

  const sections: any[] = []

  // ── MEETING TITLE ──────────────────────────────────────────────────────────
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: 'ACTA DE REUNIÓN', bold: true, size: 32, color: '1E3A8A' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: acta.meetingInfo.title, bold: true, size: 26, color: '1E293B' })],
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
              headerCell('Cargo', 26),
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
          new TextRun({ text: format(nmDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }), size: 20 }),
          new TextRun({ text: '     Lugar:  ', bold: true, color: '2563EB', size: 20 }),
          new TextRun({ text: nm.location, size: 20 }),
        ],
        spacing: { after: 300 },
      })
    )
  }

  // ── FIRMAS ─────────────────────────────────────────────────────────────────
  sections.push(sectionTitle('FIRMAS DE LOS ASISTENTES'))

  for (const attendee of acta.attendees) {
    if (attendee.signatureUrl) {
      try {
        const blob        = await getBlobFromUrl(attendee.signatureUrl)
        const arrayBuffer = await blob.arrayBuffer()
        sections.push(
          new Paragraph({
            children: [
              new ImageRun({ data: arrayBuffer, transformation: { width: 150, height: 60 }, type: 'png' }),
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
      new Paragraph({ children: [new TextRun({ text: attendee.name, bold: true, size: 20 })] }),
      new Paragraph({ children: [new TextRun({ text: attendee.role, color: '64748B', size: 18 })] })
    )

    if (attendee.signedAt) {
      const sAt = (attendee.signedAt as any).toDate
        ? (attendee.signedAt as any).toDate()
        : attendee.signedAt
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `✓ Firmado: ${format(sAt, 'dd/MM/yyyy HH:mm')}`, color: '16A34A', size: 16 }),
          ],
          spacing: { after: 400 },
        })
      )
    } else {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: 'Pendiente de firma', color: 'F59E0B', italics: true, size: 16 })],
          spacing: { after: 400 },
        })
      )
    }
  }

  // ── BUILD DOCUMENT ─────────────────────────────────────────────────────────
  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [buildCompanyHeaderTable(logoArrayBuffer)],
          }),
        },
        children: sections,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(
    blob,
    `Acta_${acta.meetingInfo.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.docx`
  )
}
