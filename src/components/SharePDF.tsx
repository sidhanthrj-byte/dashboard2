'use client'

import { useState } from 'react'
import { Download, Share2, Loader2, Mail, MessageCircle } from 'lucide-react'

interface Props {
  quoteNumber: string
  clientName: string
  waUrl: string
  mailUrl: string
}

export default function SharePDF({ quoteNumber, clientName, waUrl, mailUrl }: Props) {
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState('')

  async function generatePDF() {
    setGenerating(true)
    setStatus('Rendering…')

    // Dynamically import to keep initial bundle small
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    // Grab the printable content area
    const el = document.getElementById('quote-printable')
    if (!el) { setGenerating(false); return }

    setStatus('Generating PDF…')

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgH = (canvas.height * pageW) / canvas.width

    // Multi-page support
    let posY = 0
    while (posY < imgH) {
      if (posY > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, -posY, pageW, imgH)
      posY += pageH
    }

    const filename = `${quoteNumber}-${clientName.replace(/\s+/g, '-')}.pdf`
    const pdfBlob = pdf.output('blob')

    // Try Web Share API first (works on mobile — opens WhatsApp, email, etc.)
    if (navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], filename, { type: 'application/pdf' })] })) {
      setStatus('Opening share sheet…')
      try {
        await navigator.share({
          files: [new File([pdfBlob], filename, { type: 'application/pdf' })],
          title: `Quote ${quoteNumber}`,
          text: `Quotation from PONGS for ${clientName}`,
        })
        setStatus('')
        setGenerating(false)
        return
      } catch {
        // User dismissed share sheet — fall through to download
      }
    }

    // Desktop fallback: download the file
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setStatus('')
    setGenerating(false)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* WhatsApp text share (fallback / quick share without PDF) */}
      <a href={waUrl} target="_blank" rel="noopener noreferrer"
        className="btn-secondary text-xs gap-1.5 flex items-center">
        <MessageCircle size={14} /> WhatsApp (text)
      </a>

      {/* Email text share */}
      <a href={mailUrl}
        className="btn-secondary text-xs gap-1.5 flex items-center">
        <Mail size={14} /> Email (text)
      </a>

      {/* PDF share/download */}
      <button
        onClick={generatePDF}
        disabled={generating}
        className="btn-primary text-xs gap-1.5 flex items-center"
      >
        {generating ? (
          <><Loader2 size={14} className="animate-spin" /> {status || 'Generating…'}</>
        ) : (
          <><Share2 size={14} /> Share PDF</>
        )}
      </button>

      {/* Plain download */}
      <button
        onClick={async () => {
          setGenerating(true)
          setStatus('Generating…')
          const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf'),
          ])
          const el = document.getElementById('quote-printable')
          if (!el) { setGenerating(false); return }
          const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
          const imgData = canvas.toDataURL('image/jpeg', 0.92)
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
          const pageW = pdf.internal.pageSize.getWidth()
          const pageH = pdf.internal.pageSize.getHeight()
          const imgH = (canvas.height * pageW) / canvas.width
          let posY = 0
          while (posY < imgH) {
            if (posY > 0) pdf.addPage()
            pdf.addImage(imgData, 'JPEG', 0, -posY, pageW, imgH)
            posY += pageH
          }
          pdf.save(`${quoteNumber}-${clientName.replace(/\s+/g, '-')}.pdf`)
          setStatus('')
          setGenerating(false)
        }}
        disabled={generating}
        className="btn-secondary text-xs gap-1.5 flex items-center"
      >
        <Download size={14} /> Download PDF
      </button>
    </div>
  )
}
