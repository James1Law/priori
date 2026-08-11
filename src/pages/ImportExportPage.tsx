import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSessionContext } from '../contexts/SessionContext'
import { parseImportCsv, markDuplicates, ParsedImportItem, ImportFormat } from '../lib/importCsv'
import { exportToCsv } from '../lib/exportCsv'
import { getDefaultChildDates } from '../lib/roadmap-dates'

interface PreviewRow extends ParsedImportItem {
  selected: boolean
}

interface Preview {
  format: ImportFormat
  fileName: string
  rows: PreviewRow[]
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

// FileReader rather than File.text() — the latter is missing in JSDOM
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export default function ImportExportPage() {
  const { session, items, participantName, refetchData } = useSessionContext()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)
    setSuccess(null)

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please choose a CSV file.')
      return
    }

    try {
      const text = await readFileText(file)
      const result = parseImportCsv(text)
      const marked = markDuplicates(result.items, items)
      setPreview({
        format: result.format,
        fileName: file.name,
        rows: marked.map(row => ({ ...row, selected: !row.isDuplicate })),
      })
    } catch (err) {
      setPreview(null)
      setError(err instanceof Error ? err.message : 'Could not read the file.')
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const toggleRow = (index: number) => {
    setPreview(prev => prev && {
      ...prev,
      rows: prev.rows.map((row, i) => i === index ? { ...row, selected: !row.selected } : row),
    })
  }

  const handleImport = async () => {
    if (!preview) return
    const selectedRows = preview.rows.filter(row => row.selected)
    if (selectedRows.length === 0) return

    setImporting(true)
    setError(null)

    const defaultDates = getDefaultChildDates(undefined, [])
    const payload = selectedRows.map((row, index) => ({
      session_id: session.id,
      title: row.title,
      description: row.description,
      status: row.status,
      position: items.length + index,
      created_by: participantName,
      start_date: defaultDates.start,
      end_date: defaultDates.end,
    }))

    const { error: insertError } = await supabase
      .from('items')
      .insert(payload as never[])

    setImporting(false)

    if (insertError) {
      console.error('Error importing items:', insertError)
      setError('Failed to import items. Please try again.')
      return
    }

    await refetchData()
    setPreview(null)
    setSuccess(`Imported ${selectedRows.length} item${selectedRows.length === 1 ? '' : 's'} into the backlog.`)
  }

  const selectedCount = preview?.rows.filter(row => row.selected).length ?? 0

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6" data-testid="import-export-page">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">Import / Export</h1>
          <p className="text-sm text-gray-600 mt-1">
            Bring items in from Jira or a spreadsheet, or export this session as CSV.
          </p>
        </div>

        {/* ── Import ── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Import from CSV</h2>
          <p className="text-sm text-gray-600 mb-4">
            Jira exports (List view → Export → CSV) are detected automatically — the issue key is
            kept in the title. Any CSV with a Title, Summary or Name column also works.
          </p>

          {!preview && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-colors
                ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'}
              `}
              data-testid="import-dropzone"
            >
              <p className="text-sm text-gray-600 mb-3">Drag a CSV file here, or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                data-testid="choose-file-button"
              >
                Choose file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
                data-testid="csv-file-input"
              />
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3" data-testid="import-error">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3" data-testid="import-success">
              {success}
            </div>
          )}

          {preview && (
            <div data-testid="import-preview">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{preview.fileName}</span>
                  {preview.format === 'jira' && (
                    <span className="ml-2 inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      Jira export
                    </span>
                  )}
                </p>
                <button
                  onClick={() => { setPreview(null); setError(null) }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                  data-testid="import-cancel-button"
                >
                  Cancel
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 w-10" />
                        <th className="px-3 py-2">Title</th>
                        <th className="px-3 py-2 w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.rows.map((row, index) => (
                        <tr key={index} className={row.selected ? '' : 'opacity-50'} data-testid={`import-row-${index}`}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => toggleRow(index)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              data-testid={`import-row-checkbox-${index}`}
                              aria-label={`Include ${row.title}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-gray-900">
                            <span className="line-clamp-2">{row.title}</span>
                            {row.isDuplicate && (
                              <span className="ml-1 inline-block bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full" data-testid={`import-row-duplicate-${index}`}>
                                Already in session
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{STATUS_LABELS[row.status]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={handleImport}
                disabled={selectedCount === 0 || importing}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                data-testid="import-confirm-button"
              >
                {importing
                  ? 'Importing...'
                  : `Import ${selectedCount} item${selectedCount === 1 ? '' : 's'}`}
              </button>
            </div>
          )}
        </section>

        {/* ── Export ── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Export to CSV</h2>
          <p className="text-sm text-gray-600 mb-4">
            Download this session&apos;s {items.length} item{items.length === 1 ? '' : 's'} — including
            scores, estimates and dates where present — as a CSV file.
          </p>
          <button
            onClick={() => exportToCsv({
              items,
              framework: session.framework,
              sessionName: session.name || undefined,
            })}
            disabled={items.length === 0}
            className="bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-700 font-semibold py-2 px-4 rounded-lg border border-gray-300 transition-colors"
            data-testid="export-csv-button"
          >
            Export CSV
          </button>
        </section>
      </div>
    </div>
  )
}
