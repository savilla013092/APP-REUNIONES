import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Acta } from '../types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Brand palette ─────────────────────────────────────────────────────────────
const C_BRAND  = [37,  99, 235] as [number, number, number]  // blue-600
const C_DARK   = [15,  23,  42] as [number, number, number]  // slate-900
const C_TEXT   = [30,  41,  59] as [number, number, number]  // slate-800
const C_MUTED  = [100,116, 139] as [number, number, number]  // slate-500
const C_LIGHT  = [239,246, 255] as [number, number, number]  // blue-50
const C_WHITE  = [255,255, 255] as [number, number, number]
const C_BORDER = [203,213, 225] as [number, number, number]  // slate-300
const C_GREEN  = [22, 163,  74] as [number, number, number]  // green-600
const C_AMBER  = [245,158,  11] as [number, number, number]  // amber-500
const C_RED    = [239,  68,  68] as [number, number, number] // red-500
const C_STRIPE = [248,250, 252] as [number, number, number]  // slate-50

const MARGIN = 14
const LINE_H = 6

// ── Helpers ───────────────────────────────────────────────────────────────────
const getBase64ImageFromUrl = async (url: string): Promise<string> => {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string), false)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Draw footer on current page */
const drawFooter = (
  doc: jsPDF,
  page: number,
  total: number,
  pw: number,
  ph: number,
  dateStr: string
) => {
  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.25)
  doc.line(MARGIN, ph - 12, pw - MARGIN, ph - 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...C_MUTED)
  doc.text('Generado con MeetMind AI', MARGIN, ph - 7)
  doc.text(dateStr, pw / 2, ph - 7, { align: 'center' })
  doc.text(`Página ${page} / ${total}`, pw - MARGIN, ph - 7, { align: 'right' })
}

/** Draw a section heading with left accent bar and divider */
const drawSectionHeader = (doc: jsPDF, title: string, y: number, pw: number): number => {
  doc.setFillColor(...C_BRAND)
  doc.rect(MARGIN, y, 3, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...C_DARK)
  doc.text(title, MARGIN + 6, y + 5.5)
  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.2)
  doc.line(MARGIN + 6, y + 9, pw - MARGIN, y + 9)
  return y + 15
}

/** Add a page if not enough vertical space. Returns updated Y. */
const pageBreak = (doc: jsPDF, y: number, needed: number, ph: number): number => {
  if (y + needed > ph - 20) {
    doc.addPage()
    return 25
  }
  return y
}

/**
 * Print long text with automatic page breaks.
 * Returns the Y position after the last line + a small gap.
 */
const printText = (
  doc: jsPDF,
  text: string,
  startY: number,
  pw: number,
  ph: number,
  size = 9.5
): number => {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(size)
  doc.setTextColor(...C_TEXT)
  const lines = doc.splitTextToSize(text, pw - MARGIN * 2)
  let y = startY
  let idx = 0
  while (idx < lines.length) {
    const avail = Math.floor((ph - 22 - y) / LINE_H)
    if (avail <= 0) {
      doc.addPage()
      y = 25
      continue
    }
    const chunk = lines.slice(idx, idx + avail)
    doc.text(chunk, MARGIN, y)
    idx += chunk.length
    y += chunk.length * LINE_H
    if (idx < lines.length) {
      doc.addPage()
      y = 25
    }
  }
  return y + 6
}

// ── Main export ───────────────────────────────────────────────────────────────
export const generateActaPDF = async (acta: Acta) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const meetingDate = acta.meetingInfo.date.toDate()
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const cw = pw - MARGIN * 2
  const generatedAt = format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })

  // ── HEADER BAND ────────────────────────────────────────────────────────────
  // Dark background
  doc.setFillColor(...C_DARK)
  doc.rect(0, 0, pw, 34, 'F')
  // Blue accent strip at very top
  doc.setFillColor(...C_BRAND)
  doc.rect(0, 0, pw, 2.5, 'F')

  // Brand name (left)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...C_WHITE)
  doc.text('MeetMind AI', MARGIN, 15)

  // Document type (center)
  doc.setFontSize(15)
  doc.text('ACTA DE REUNIÓN', pw / 2, 15, { align: 'center' })

  // Generated date (right, muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text(`Generado: ${generatedAt}`, pw - MARGIN, 15, { align: 'right' })

  // Status chip
  const statusMap: Record<string, { label: string; color: [number, number, number] }> = {
    draft:              { label: '● BORRADOR',            color: C_AMBER },
    pending_signatures: { label: '● PENDIENTE DE FIRMAS', color: [99, 179, 237] },
    completed:          { label: '● COMPLETADO',          color: C_GREEN },
  }
  const st = statusMap[acta.status] ?? statusMap.draft
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...st.color)
  doc.text(st.label, pw - MARGIN, 24, { align: 'right' })

  // ── MEETING TITLE ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...C_DARK)
  const titleLines = doc.splitTextToSize(acta.meetingInfo.title, cw)
  doc.text(titleLines, pw / 2, 43, { align: 'center' })
  let y = 43 + titleLines.length * 7 + 2

  // Short accent underline
  doc.setDrawColor(...C_BRAND)
  doc.setLineWidth(1)
  doc.line(pw / 2 - 28, y, pw / 2 + 28, y)
  y += 10

  // ── MEETING INFO TABLE ─────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    body: [
      [
        { content: 'Fecha',     styles: { fontStyle: 'bold', fillColor: C_LIGHT, textColor: C_BRAND, cellWidth: 24 } },
        { content: format(meetingDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }), styles: { textColor: C_TEXT } },
        { content: 'Hora',      styles: { fontStyle: 'bold', fillColor: C_LIGHT, textColor: C_BRAND, cellWidth: 18 } },
        { content: `${acta.meetingInfo.startTime}${acta.meetingInfo.endTime ? ' – ' + acta.meetingInfo.endTime : ''}`, styles: { textColor: C_TEXT } },
      ],
      [
        { content: 'Lugar',     styles: { fontStyle: 'bold', fillColor: C_LIGHT, textColor: C_BRAND } },
        { content: acta.meetingInfo.location, styles: { textColor: C_TEXT } },
        { content: 'Modalidad', styles: { fontStyle: 'bold', fillColor: C_LIGHT, textColor: C_BRAND } },
        {
          content: acta.meetingInfo.modality.charAt(0).toUpperCase() + acta.meetingInfo.modality.slice(1),
          styles: { textColor: C_TEXT },
        },
      ],
    ],
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 3.5, right: 5, bottom: 3.5, left: 5 },
      lineColor: C_BORDER,
      lineWidth: 0.3,
    },
  })
  y = (doc as any).lastAutoTable.finalY + 10

  // ── AGENDA ─────────────────────────────────────────────────────────────────
  if (acta.agenda?.length > 0) {
    y = pageBreak(doc, y, 30, ph)
    y = drawSectionHeader(doc, 'ORDEN DEL DÍA', y, pw)

    acta.agenda.forEach(item => {
      y = pageBreak(doc, y, 10, ph)
      doc.setFillColor(...C_BRAND)
      doc.circle(MARGIN + 2, y + 2.5, 1.3, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...C_TEXT)
      const iLines = doc.splitTextToSize(item, cw - 8)
      doc.text(iLines, MARGIN + 6, y + 4)
      y += iLines.length * LINE_H + 2
    })
    y += 5
  }

  // ── ATTENDEES TABLE ────────────────────────────────────────────────────────
  if (acta.attendees?.length > 0) {
    y = pageBreak(doc, y, 35, ph)
    y = drawSectionHeader(doc, 'LISTA DE ASISTENTES', y, pw)

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Nombre', 'Rol / Cargo', 'Correo', 'Asistencia']],
      body: acta.attendees.map(a => [
        a.name,
        a.role,
        a.email || '—',
        a.attendance === 'present' ? 'Presente' : a.attendance === 'absent' ? 'Ausente' : 'Justificado',
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: C_BRAND,
        textColor: C_WHITE,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
        textColor: C_TEXT,
      },
      alternateRowStyles: { fillColor: C_STRIPE },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 42 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 28 },
      },
      didParseCell: data => {
        if (data.column.index === 3 && data.section === 'body') {
          const v = data.cell.raw as string
          data.cell.styles.textColor = (
            v === 'Presente' ? C_GREEN : v === 'Ausente' ? C_RED : C_AMBER
          ) as any
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ── 1. PREÁMBULO ───────────────────────────────────────────────────────────
  if (acta.generatedContent?.introduction) {
    y = pageBreak(doc, y, 40, ph)
    y = drawSectionHeader(doc, '1.  PREÁMBULO', y, pw)
    y = printText(doc, acta.generatedContent.introduction, y, pw, ph)
  }

  // ── 2. DESARROLLO ──────────────────────────────────────────────────────────
  if (acta.generatedContent?.development) {
    y = pageBreak(doc, y, 40, ph)
    y = drawSectionHeader(doc, '2.  DESARROLLO DE LA REUNIÓN', y, pw)
    y = printText(doc, acta.generatedContent.development, y, pw, ph)
  }

  // ── 3. ACUERDOS ────────────────────────────────────────────────────────────
  if (acta.generatedContent?.agreements?.length) {
    y = pageBreak(doc, y, 35, ph)
    y = drawSectionHeader(doc, '3.  ACUERDOS Y DECISIONES', y, pw)

    acta.generatedContent.agreements.forEach((agreement, i) => {
      y = pageBreak(doc, y, 12, ph)
      // Number badge
      doc.setFillColor(...C_LIGHT)
      doc.setDrawColor(...C_BRAND)
      doc.setLineWidth(0.3)
      doc.roundedRect(MARGIN, y - 0.5, 7, 6, 1, 1, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...C_BRAND)
      doc.text(`${i + 1}`, MARGIN + 3.5, y + 4, { align: 'center' })
      // Text
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...C_TEXT)
      const aLines = doc.splitTextToSize(agreement, cw - 12)
      doc.text(aLines, MARGIN + 10, y + 4)
      y += aLines.length * LINE_H + 3
    })
    y += 5
  }

  // ── 4. COMPROMISOS ─────────────────────────────────────────────────────────
  if (acta.generatedContent?.commitments?.length) {
    y = pageBreak(doc, y, 35, ph)
    y = drawSectionHeader(doc, '4.  COMPROMISOS Y TAREAS', y, pw)

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['#', 'Descripción del Compromiso', 'Responsable', 'Vencimiento']],
      body: acta.generatedContent.commitments.map((c, i) => [
        `${i + 1}`,
        c.description,
        c.responsible,
        c.dueDate
          ? (c.dueDate as any).toDate
            ? format((c.dueDate as any).toDate(), "d MMM yyyy", { locale: es })
            : String(c.dueDate)
          : '—',
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: C_BRAND,
        textColor: C_WHITE,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
        textColor: C_TEXT,
      },
      alternateRowStyles: { fillColor: C_STRIPE },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: C_BRAND },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 42 },
        3: { cellWidth: 28, halign: 'center' },
      },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ── 5. CIERRE ──────────────────────────────────────────────────────────────
  if (acta.generatedContent?.closure) {
    y = pageBreak(doc, y, 40, ph)
    y = drawSectionHeader(doc, '5.  CIERRE', y, pw)
    y = printText(doc, acta.generatedContent.closure, y, pw, ph)
  }

  // ── 6. PRÓXIMA REUNIÓN (opcional) ──────────────────────────────────────────
  if (acta.generatedContent?.nextMeeting) {
    const nm = acta.generatedContent.nextMeeting
    y = pageBreak(doc, y, 35, ph)
    y = drawSectionHeader(doc, '6.  PRÓXIMA REUNIÓN', y, pw)

    doc.setFillColor(...C_LIGHT)
    doc.setDrawColor(...C_BRAND)
    doc.setLineWidth(0.3)
    doc.roundedRect(MARGIN, y, cw, 18, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...C_BRAND)
    doc.text('Fecha:', MARGIN + 6, y + 7)
    doc.text('Lugar:', MARGIN + cw / 2 + 4, y + 7)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C_TEXT)
    const nmDate = (nm.date as any)?.toDate ? (nm.date as any).toDate() : nm.date
    doc.text(
      format(nmDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }),
      MARGIN + 20, y + 7
    )
    doc.text(nm.location, MARGIN + cw / 2 + 18, y + 7)
    y += 26
  }

  // ── FIRMAS ─────────────────────────────────────────────────────────────────
  if (acta.attendees?.length > 0) {
    y = pageBreak(doc, y, 55, ph)
    y = drawSectionHeader(doc, 'FIRMAS DE LOS ASISTENTES', y, pw)

    const colW = (cw - 6) / 2
    const boxH = 44

    for (let i = 0; i < acta.attendees.length; i += 2) {
      if (y + boxH > ph - 22) {
        doc.addPage()
        y = 25
      }

      for (let col = 0; col < 2; col++) {
        const idx = i + col
        if (idx >= acta.attendees.length) break
        const a = acta.attendees[idx]
        const x = MARGIN + col * (colW + 6)

        // Card background
        doc.setFillColor(250, 250, 252)
        doc.setDrawColor(...C_BORDER)
        doc.setLineWidth(0.3)
        doc.roundedRect(x, y, colW, boxH, 2, 2, 'FD')

        // Signature image or dashed line
        if (a.signatureUrl) {
          try {
            const b64 = await getBase64ImageFromUrl(a.signatureUrl)
            doc.addImage(b64, 'PNG', x + 4, y + 2, colW - 8, 20)
          } catch {
            doc.setLineDashPattern([2, 2], 0)
            doc.setDrawColor(...C_MUTED)
            doc.line(x + 8, y + 18, x + colW - 8, y + 18)
            doc.setLineDashPattern([], 0)
          }
        } else {
          doc.setLineDashPattern([2, 2], 0)
          doc.setDrawColor(180, 190, 210)
          doc.line(x + 8, y + 18, x + colW - 8, y + 18)
          doc.setLineDashPattern([], 0)
        }

        // Name
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...C_DARK)
        const nLines = doc.splitTextToSize(a.name, colW - 8)
        doc.text(nLines, x + 4, y + 26)

        // Role
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...C_MUTED)
        const rLines = doc.splitTextToSize(a.role, colW - 8)
        doc.text(rLines, x + 4, y + 26 + nLines.length * 4.5)

        // Status
        if (a.signedAt) {
          const sAt = (a.signedAt as any).toDate ? (a.signedAt as any).toDate() : a.signedAt
          doc.setFontSize(7)
          doc.setTextColor(...C_GREEN)
          doc.setFont('helvetica', 'bold')
          doc.text(`✓ Firmado: ${format(sAt, 'dd/MM/yyyy HH:mm')}`, x + 4, y + 39)
        } else {
          doc.setFontSize(7)
          doc.setTextColor(...C_AMBER)
          doc.setFont('helvetica', 'italic')
          doc.text('Pendiente de firma', x + 4, y + 39)
        }
      }
      y += boxH + 5
    }
  }

  // ── FOOTERS ON ALL PAGES ───────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(doc, p, totalPages, pw, ph, generatedAt)
  }

  doc.save(
    `Acta_${acta.meetingInfo.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`
  )
}
