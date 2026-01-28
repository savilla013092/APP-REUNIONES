import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Acta } from '../types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const getBase64ImageFromUrl = async (imageUrl: string) => {
  const res = await fetch(imageUrl)
  const blob = await res.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string), false)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export const generateActaPDF = async (acta: Acta) => {
  const doc = new jsPDF()
  const meetingDate = acta.meetingInfo.date.toDate()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(22)
  doc.setTextColor(40, 40, 40)
  doc.text('ACTA DE REUNIÓN', pageWidth / 2, 20, { align: 'center' })

  doc.setFontSize(14)
  doc.text(acta.meetingInfo.title, pageWidth / 2, 30, { align: 'center' })

  // Meeting Info Table
  autoTable(doc, {
    startY: 40,
    head: [['Información General', '']],
    body: [
      ['Fecha:', format(meetingDate, 'PPPP', { locale: es })],
      ['Hora:', `${acta.meetingInfo.startTime} - ${acta.meetingInfo.endTime || 'N/A'}`],
      ['Lugar/Link:', acta.meetingInfo.location],
      ['Modalidad:', acta.meetingInfo.modality],
    ],
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
  })

  let finalY = (doc as any).lastAutoTable.finalY + 15

  // Introduction
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('1. PREÁMBULO', 14, finalY)
  doc.setFont('helvetica', 'normal')
  finalY += 7
  const introLines = doc.splitTextToSize(acta.generatedContent?.introduction || '', pageWidth - 28)
  doc.text(introLines, 14, finalY)
  finalY += introLines.length * 7 + 10

  // Development
  if (finalY > 260) {
    doc.addPage()
    finalY = 20
  }
  doc.setFont('helvetica', 'bold')
  doc.text('2. DESARROLLO DE LA REUNIÓN', 14, finalY)
  doc.setFont('helvetica', 'normal')
  finalY += 7
  const devLines = doc.splitTextToSize(acta.generatedContent?.development || '', pageWidth - 28)
  doc.text(devLines, 14, finalY)
  finalY += devLines.length * 7 + 10

  // Agreements
  if (acta.generatedContent?.agreements.length) {
    if (finalY > 240) {
      doc.addPage()
      finalY = 20
    }
    autoTable(doc, {
      startY: finalY,
      head: [['3. ACUERDOS Y DECISIONES']],
      body: acta.generatedContent.agreements.map(a => [a]),
      theme: 'grid',
    })
    finalY = (doc as any).lastAutoTable.finalY + 10
  }

  // Commitments
  if (acta.generatedContent?.commitments.length) {
    if (finalY > 240) {
      doc.addPage()
      finalY = 20
    }
    autoTable(doc, {
      startY: finalY,
      head: [['4. COMPROMISOS', 'RESPONSABLE', 'VENCIMIENTO']],
      body: acta.generatedContent.commitments.map(c => [
        c.description,
        c.responsible,
        c.dueDate
          ? (c.dueDate as any).toDate
            ? format((c.dueDate as any).toDate(), 'dd/MM/yyyy')
            : c.dueDate.toString()
          : '-',
      ]),
      theme: 'grid',
    })
    finalY = (doc as any).lastAutoTable.finalY + 15
  }

  // Closure
  if (finalY > 260) {
    doc.addPage()
    finalY = 20
  }
  doc.setFont('helvetica', 'bold')
  doc.text('5. CIERRE', 14, finalY)
  doc.setFont('helvetica', 'normal')
  finalY += 7
  const closureLines = doc.splitTextToSize(acta.generatedContent?.closure || '', pageWidth - 28)
  doc.text(closureLines, 14, finalY)
  finalY += closureLines.length * 7 + 20

  // Signatures Section
  doc.setFont('helvetica', 'bold')
  doc.text('FIRMAS DE LOS ASISTENTES', 14, finalY)
  finalY += 10

  const signedAttendees = acta.attendees.filter(a => a.signatureUrl)

  if (signedAttendees.length > 0) {
    for (let i = 0; i < signedAttendees.length; i++) {
      const a = signedAttendees[i]
      if (finalY > 250) {
        doc.addPage()
        finalY = 20
      }

      try {
        const base64 = await getBase64ImageFromUrl(a.signatureUrl!)
        doc.addImage(base64, 'PNG', 14, finalY, 40, 15)
      } catch (e) {
        doc.line(14, finalY + 15, 64, finalY + 15) // Fallback line
      }

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(a.name, 14, finalY + 20)
      doc.setFont('helvetica', 'normal')
      doc.text(a.role, 14, finalY + 24)
      doc.setFontSize(8)
      doc.setTextColor(150)
      if (a.signedAt) {
        const sAt = (a.signedAt as any).toDate ? (a.signedAt as any).toDate() : a.signedAt
        doc.text(`Firmado el: ${format(sAt, 'dd/MM/yyyy HH:mm')}`, 14, finalY + 28)
      }
      doc.setTextColor(0)

      finalY += 40
    }
  } else {
    doc.setFont('helvetica', 'italic')
    doc.text('No se han registrado firmas digitales todavía.', 14, finalY)
  }

  doc.save(
    `Acta_${acta.meetingInfo.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`
  )
}
