'use client'

import { useState } from 'react'
import { Download, Share2, Loader2, Mail, MessageCircle } from 'lucide-react'

interface Props {
  quoteNumber: string
  clientName: string
  waUrl: string
  mailUrl: string
}

async function capturePages(setStatus: (s: string) => void) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const pages = Array.from(document.querySelectorAll<HTMLElement>('.quote-pdf-page'))
  const fallback = document.getElementById('quote-printable')
  const targets = pages.length > 0 ? pages : (fallback ? [fallback] : [])
  if (targets.length === 0) return null

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()   // 210 mm
  const pageH = pdf.internal.pageSize.getHeight()  // 297 mm

  for (let i = 0; i < targets.length; i++) {
    setStatus(`Rendering page ${i + 1} of ${targets.length}…`)

    const canvas = await html2canvas(targets[i], {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    const aspectRatio = canvas.height / canvas.width
    const imgW = pageW
    const imgH = pageW * aspectRatio

    // First page of this section — either first ever or add a new PDF page
    if (i > 0) pdf.addPage()

    // If this section is taller than one A4 page, split it
    if (imgH <= pageH) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH)
    } else {
      let posY = 0
      while (posY < imgH) {
        if (posY > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, -posY, imgW, imgH)
        posY += pageH
      }
    }
  }

  return pdf
}

export default function SharePDF({ quoteNumber, clientName, waUrl, mailUrl }: Props) {
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState('')

  const filename = `${quoteNumber}-${clientName.replace(/\s+/g, '-')}.pdf`

  async function sharePDF() {
    setGenerating(true)
    setStatus('Starting…')
    const pdf = await capturePages(setStatus)
    if (!pdf) { setGenerating(false); return }

    setStatus('Preparing…')
    const pdfBlob = pdf.output('blob')

    if (navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], filename, { type: 'application/pdf' })] })) {
      setStatus('Opening share…')
      try {
        await navigator.share({
          files: [new File([pdfBlob], filename, { type: 'application/pdf' })],
          title: `Quote ${quoteNumber}`,
          text: `Quotation from PONGS for ${clientName}`,
        })
        setStatus('')
        setGenerating(false)
        return
      } catch { /* dismissed — fall through to download */ }
    }

    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    setStatus('')
    setGenerating(false)
  }

  async function downloadPDF() {
    setGenerating(true)
    setStatus('Starting…')
    const pdf = await capturePages(setStatus)
    if (!pdf) { setGenerating(false); return }
    setStatus('Saving…')
    pdf.save(filename)
    setStatus('')
    setGenerating(false)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a href={waUrl} target="_blank" rel="noopener noreferrer"
        className="btn-secondary text-xs gap-1.5 flex items-center">
        <MessageCircle size={14} /> WhatsApp
      </a>
      <a href={mailUrl}
        className="btn-secondary text-xs gap-1.5 flex items-center">
        <Mail size={14} /> Email
      </a>
      <button onClick={sharePDF} disabled={generating}
        className="btn-primary text-xs gap-1.5 flex items-center">
        {generating
          ? <><Loader2 size={14} className="animate-spin" /> {status || 'Generating…'}</>
          : <><Share2 size={14} /> Share PDF</>}
      </button>
      <button onClick={downloadPDF} disabled={generating}
        className="btn-secondary text-xs gap-1.5 flex items-center">
        <Download size={14} /> Download PDF
      </button>
    </div>
  )
}
