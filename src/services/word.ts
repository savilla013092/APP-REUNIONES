import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
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

const cell = (text: string, bold = false, color = '000000', widthPct?: number) =>
  new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, color, size: 18 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 60 },
      }),
    ],
  })

const labelCell = (text: string) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: '1E3A8A', size: 18 })],
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
    children: [new TextRun({ text, bold: true, color: '1E3A8A', size: 24 })],
    spacing: { before: 320, after: 120 },
  })

const spacer = () => new Paragraph({ spacing: { after: 180 } })

// ── Main export ───────────────────────────────────────────────────────────────
export const generateActaWord = async (acta: Acta) => {
  const meetingDate = acta.meetingInfo.date.toDate()
  const modalidad =
    acta.meetingInfo.modality.charAt(0).toUpperCase() + acta.meetingInfo.modality.slice(1)
  const generatedAt = format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })

  // Load company logo (optional)
  let logoArrayBuffer: ArrayBuffer | null = null
  try {
    const blob = await getBlobFromUrl('/logo-serviciudad.png')
    logoArrayBuffer = await blob.arrayBuffer()
  } catch {
    // No logo file — continue without it
  }

  const children: any[] = []

  // ── COMPANY HEADER TABLE ───────────────────────────────────────────────────
  const logoCellContent = logoArrayBuffer
    ? new TableCell({
        width: { size: 22, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: logoArrayBuffer,
                transformation: { width: 80, height: 40 },
                type: 'png',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      })
    : new TableCell({
        width: { size: 22, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [new TextRun({ text: CO_NAME, bold: true, size: 14, color: '1E293B' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
      })

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            logoCellContent,
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: CO_NAME, bold: true, size: 28, color: '0F172A' })],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: CO_NIT, size: 16, color: '666666' })],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 40 },
                }),
              ],
            }),
            new TableCell({
              width: { size: 13, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Código', size: 14, color: '888888' })],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [new TextRun({ text: CO_CODE, bold: true, size: 18 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Versión', size: 14, color: '888888' })],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [new TextRun({ text: CO_VERSION, bold: true, size: 18 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
            }),
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: CO_DOC, size: 20, color: '333333' })],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 40 },
                }),
              ],
            }),
            new TableCell({
              columnSpan: 2,
              width: { size: 23, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Generado: ' + generatedAt, size: 14, color: '888888' })],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 40 },
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    spacer()
  )

  // ── MEETING TITLE ──────────────────────────────────────────────────────────
  children.push(
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
  children.push(
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
    children.push(sectionTitle('ORDEN DEL DÍA'))
    acta.agenda.forEach((item, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}.  `, bold: true, color: '2563EB', size: 20 }),
            new TextRun({ text: item, size: 20 }),
          ],
          spacing: { after: 100 },
        })
      )
    })
    children.push(spacer())
  }

  // ── ATTENDEES TABLE ────────────────────────────────────────────────────────
  if (acta.attendees?.length > 0) {
    children.push(sectionTitle('LISTA DE ASISTENTES'))
    const attendanceLabel: Record<string, string> = {
      present: 'Presente',
      absent: 'Ausente',
      excused: 'Justificado',
    }
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              cell('Nombre', true, 'FFFFFF', 28),
              cell('Cargo', true, 'FFFFFF', 26),
              cell('Correo', true, 'FFFFFF', 32),
              cell('Asistencia', true, 'FFFFFF', 14),
            ],
          }),
          ...acta.attendees.map(a =>
            new TableRow({
              children: [
                cell(a.name, false, '000000', 28),
                cell(a.role, false, '000000', 26),
                cell(a.email || '—', false, '000000', 32),
                cell(attendanceLabel[a.attendance] || a.attendance, false, '000000', 14),
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
    children.push(
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
    children.push(
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
    children.push(sectionTitle('3.  ACUERDOS Y DECISIONES'))
    acta.generatedContent.agreements.forEach((agreement, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}.  `, bold: true, color: '2563EB', size: 20 }),
            new TextRun({ text: agreement, size: 20 }),
          ],
          spacing: { after: 120 },
        })
      )
    })
    children.push(spacer())
  }

  // ── 4. COMPROMISOS ─────────────────────────────────────────────────────────
  if (acta.generatedContent?.commitments?.length) {
    children.push(sectionTitle('4.  COMPROMISOS Y TAREAS'))
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              cell('#', true, 'FFFFFF', 6),
              cell('Descripción del Compromiso', true, 'FFFFFF', 52),
              cell('Responsable', true, 'FFFFFF', 28),
              cell('Vencimiento', true, 'FFFFFF', 14),
            ],
          }),
          ...acta.generatedContent.commitments.map((c, i) =>
            new TableRow({
              children: [
                cell(`${i + 1}`, false, '000000', 6),
                cell(c.description, false, '000000', 52),
                cell(c.responsible, false, '000000', 28),
                cell(
                  c.dueDate
                    ? (c.dueDate as any).toDate
                      ? format((c.dueDate as any).toDate(), 'dd/MM/yyyy')
                      : String(c.dueDate)
                    : '—',
                  false,
                  '000000',
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
    children.push(
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
    children.push(
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
  children.push(sectionTitle('FIRMAS DE LOS ASISTENTES'))

  for (const attendee of acta.attendees) {
    if (attendee.signatureUrl) {
      try {
        const blob        = await getBlobFromUrl(attendee.signatureUrl)
        const arrayBuffer = await blob.arrayBuffer()
        children.push(
          new Paragraph({
            children: [
              new ImageRun({ data: arrayBuffer, transformation: { width: 150, height: 60 }, type: 'png' }),
            ],
            spacing: { before: 240 },
          })
        )
      } catch {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: '_'.repeat(28), color: 'AAAAAA' })],
            spacing: { before: 240 },
          })
        )
      }
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '_'.repeat(28), color: 'AAAAAA' })],
          spacing: { before: 240 },
        })
      )
    }

    children.push(
      new Paragraph({ children: [new TextRun({ text: attendee.name, bold: true, size: 20 })] }),
      new Paragraph({ children: [new TextRun({ text: attendee.role, color: '64748B', size: 18 })] })
    )

    if (attendee.signedAt) {
      const sAt = (attendee.signedAt as any).toDate
        ? (attendee.signedAt as any).toDate()
        : attendee.signedAt
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `✓ Firmado: ${format(sAt, 'dd/MM/yyyy HH:mm')}`, color: '16A34A', size: 16 })],
          spacing: { after: 400 },
        })
      )
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Pendiente de firma', color: 'F59E0B', italics: true, size: 16 })],
          spacing: { after: 400 },
        })
      )
    }
  }

  // ── FOOTER NOTE ────────────────────────────────────────────────────────────
  children.push(
    spacer(),
    new Paragraph({
      children: [
        new TextRun({
          text: `Documento generado por ${CO_NAME} — ${generatedAt}`,
          color: 'AAAAAA',
          italics: true,
          size: 16,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  )

  // ── BUILD & SAVE ───────────────────────────────────────────────────────────
  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  saveAs(
    blob,
    `Acta_${acta.meetingInfo.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.docx`
  )
}
