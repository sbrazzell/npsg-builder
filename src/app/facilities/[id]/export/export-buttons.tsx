'use client'

import { Button } from '@/components/ui/button'
import { Printer, Download } from 'lucide-react'

export function ExportButtons({ facilityId, facilityName }: { facilityId: string; facilityName: string }) {
  function handlePrint() {
    window.print()
  }

  function handleMarkdownExport() {
    const content = document.getElementById('export-content')
    if (!content) return

    // Extract text content in a formatted way
    const sections = content.querySelectorAll('section')
    let markdown = `# NSGP Application — ${facilityName}\n\n`

    sections.forEach((section) => {
      const heading = section.querySelector('h2')
      if (heading) {
        markdown += `## ${heading.textContent?.trim()}\n\n`
      }

      const paragraphs = section.querySelectorAll('p:not(h2 + p)')
      paragraphs.forEach((p) => {
        const text = p.textContent?.trim()
        if (text) markdown += `${text}\n\n`
      })

      const tables = section.querySelectorAll('table')
      tables.forEach((table) => {
        const rows = table.querySelectorAll('tr')
        let tableMarkdown = ''
        rows.forEach((row, rowIndex) => {
          const cells = row.querySelectorAll('th, td')
          const rowText = Array.from(cells).map((c) => c.textContent?.trim() || '').join(' | ')
          tableMarkdown += `| ${rowText} |\n`
          if (rowIndex === 0) {
            tableMarkdown += `| ${Array.from(cells).map(() => '---').join(' | ')} |\n`
          }
        })
        markdown += tableMarkdown + '\n'
      })
    })

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${facilityName.replace(/\s+/g, '-')}-NSGP-Application.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleMarkdownExport}>
        <Download className="h-4 w-4 mr-1" /> Download Markdown
      </Button>
      <Button size="sm" onClick={handlePrint}>
        <Printer className="h-4 w-4 mr-1" /> Print / Save PDF
      </Button>
    </div>
  )
}
