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
} from 'docx'
import { saveAs } from 'file-saver'
import type { Acta } from '../types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const getBlobFromUrl = async (url: string) => {
  const response = await fetch(url)
  return await response.blob()
}

export const generateActaWord = async (acta: Acta) => {
  const meetingDate = acta.meetingInfo.date.toDate()

  const sections = []

  // Title
  sections.push(
    new Paragraph({
      text: 'ACTA DE REUNIÓN',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: acta.meetingInfo.title,
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  // Information Table
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Fecha:', bold: true })] })],
          }),
          new TableCell({ children: [new Paragraph(format(meetingDate, 'PPPP', { locale: es }))] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Hora:', bold: true })] })],
          }),
          new TableCell({
            children: [
              new Paragraph(`${acta.meetingInfo.startTime} - ${acta.meetingInfo.endTime || 'N/A'}`),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Lugar:', bold: true })] })],
          }),
          new TableCell({ children: [new Paragraph(acta.meetingInfo.location)] }),
        ],
      }),
    ],
  })

  sections.push(infoTable, new Paragraph({ text: '', spacing: { before: 400 } }))

  // Introduction
  sections.push(
    new Paragraph({
      text: '1. PREÁMBULO',
      heading: HeadingLevel.HEADING_3,
      spacing: { after: 120 },
    }),
    new Paragraph({ text: acta.generatedContent?.introduction || '', spacing: { after: 300 } })
  )

  // Development
  sections.push(
    new Paragraph({
      text: '2. DESARROLLO DE LA REUNIÓN',
      heading: HeadingLevel.HEADING_3,
      spacing: { after: 120 },
    }),
    new Paragraph({ text: acta.generatedContent?.development || '', spacing: { after: 300 } })
  )

  // Agreements
  if (acta.generatedContent?.agreements.length) {
    sections.push(
      new Paragraph({
        text: '3. ACUERDOS Y DECISIONES',
        heading: HeadingLevel.HEADING_3,
        spacing: { after: 120 },
      })
    )
    acta.generatedContent.agreements.forEach((agreement, i) => {
      sections.push(
        new Paragraph({
          text: `${i + 1}. ${agreement}`,
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      )
    })
    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }))
  }

  // Commitments
  if (acta.generatedContent?.commitments.length) {
    sections.push(
      new Paragraph({
        text: '4. COMPROMISOS',
        heading: HeadingLevel.HEADING_3,
        spacing: { after: 120 },
      })
    )

    const commitmentRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Compromiso', bold: true })] }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Responsable', bold: true })] }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Vencimiento', bold: true })] }),
            ],
          }),
        ],
      }),
    ]

    acta.generatedContent.commitments.forEach(c => {
      commitmentRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(c.description)] }),
            new TableCell({ children: [new Paragraph(c.responsible)] }),
            new TableCell({
              children: [
                new Paragraph(c.dueDate ? format((c.dueDate as any).toDate(), 'dd/MM/yyyy') : '-'),
              ],
            }),
          ],
        })
      )
    })

    sections.push(
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: commitmentRows }),
      new Paragraph({ text: '', spacing: { before: 400 } })
    )
  }

  // Signatures
  sections.push(
    new Paragraph({
      text: 'FIRMAS ELECTRÓNICAS',
      heading: HeadingLevel.HEADING_3,
      spacing: { after: 200 },
    })
  )

  const signedAttendees = acta.attendees.filter(a => a.signatureUrl)

  for (const attendee of signedAttendees) {
    try {
      const blob = await getBlobFromUrl(attendee.signatureUrl!)
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
        }),
        new Paragraph({
          children: [new TextRun({ text: attendee.name, bold: true })],
        }),
        new Paragraph({ text: attendee.role }),
        new Paragraph({
          text: `Firmado el: ${format((attendee.signedAt as any).toDate(), 'dd/MM/yyyy HH:mm')}`,
          spacing: { after: 400 },
        })
      )
    } catch (e) {
      sections.push(
        new Paragraph({ text: '__________________________', spacing: { before: 200 } }),
        new Paragraph({ children: [new TextRun({ text: attendee.name, bold: true })] }),
        new Paragraph({ text: attendee.role, spacing: { after: 400 } })
      )
    }
  }

  const doc = new Document({
    sections: [
      {
        children: sections,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `Acta_${acta.meetingInfo.title.replace(/\s+/g, '_')}.docx`)
}
