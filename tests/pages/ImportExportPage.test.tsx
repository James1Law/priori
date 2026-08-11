import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportExportPage from '../../src/pages/ImportExportPage'

const mockSession = {
  id: 'session-1',
  slug: 'test-session',
  name: 'Test Session',
  framework: 'rice',
}

const mockItems = [
  {
    id: 'item-1',
    session_id: 'session-1',
    title: 'CR-7083 — [dashboards] patch up dashboard to support grafana 9',
    description: null,
    position: 0,
    status: 'todo',
  },
]

const mockRefetchData = vi.fn(() => Promise.resolve())

vi.mock('../../src/contexts/SessionContext', () => ({
  useSessionContext: () => ({
    session: mockSession,
    items: mockItems,
    participantName: 'James',
    refetchData: mockRefetchData,
  }),
}))

const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: (payload: unknown) => mockInsert(payload),
    })),
  },
}))

const mockExportToCsv = vi.fn()
vi.mock('../../src/lib/exportCsv', () => ({
  exportToCsv: (opts: unknown) => mockExportToCsv(opts),
}))

const JIRA_CSV = `Issue Type,Issue key,Issue id,Summary,Creator,Status,Description
Story,CR-7489,3239502,Promotion - onBOARD Promote & rank change execution,James Law,Ready for Refinement,"*As a* vessel Captain
*I want* deliberate promotion execution"
Story,CR-7083,3229565,[dashboards] patch up dashboard to support grafana 9,Nicolas.Chagrass,Ready for Refinement,
`

function uploadCsv(content: string, name = 'jira.csv') {
  const file = new File([content], name, { type: 'text/csv' })
  const input = screen.getByTestId('csv-file-input')
  fireEvent.change(input, { target: { files: [file] } })
}

describe('ImportExportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders import and export sections', () => {
    render(<ImportExportPage />)

    expect(screen.getByText('Import from CSV')).toBeInTheDocument()
    expect(screen.getByText('Export to CSV')).toBeInTheDocument()
    expect(screen.getByTestId('import-dropzone')).toBeInTheDocument()
  })

  describe('Import flow', () => {
    it('shows a preview of parsed items after choosing a file', async () => {
      render(<ImportExportPage />)

      uploadCsv(JIRA_CSV)

      await waitFor(() => {
        expect(screen.getByTestId('import-preview')).toBeInTheDocument()
      })
      expect(screen.getByText('Jira export')).toBeInTheDocument()
      expect(screen.getByText(/CR-7489 — Promotion - onBOARD Promote & rank change execution/)).toBeInTheDocument()
    })

    it('flags duplicates and deselects them by default', async () => {
      render(<ImportExportPage />)

      uploadCsv(JIRA_CSV)

      await waitFor(() => {
        expect(screen.getByTestId('import-row-duplicate-1')).toBeInTheDocument()
      })
      expect(screen.getByTestId('import-row-checkbox-0')).toBeChecked()
      expect(screen.getByTestId('import-row-checkbox-1')).not.toBeChecked()
      expect(screen.getByTestId('import-confirm-button')).toHaveTextContent('Import 1 item')
    })

    it('imports selected items with mapped fields and refetches', async () => {
      render(<ImportExportPage />)

      uploadCsv(JIRA_CSV)
      await waitFor(() => {
        expect(screen.getByTestId('import-confirm-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('import-confirm-button'))

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledOnce()
      })
      const payload = mockInsert.mock.calls[0][0] as Record<string, unknown>[]
      expect(payload).toHaveLength(1)
      expect(payload[0]).toMatchObject({
        session_id: 'session-1',
        title: 'CR-7489 — Promotion - onBOARD Promote & rank change execution',
        status: 'todo',
        position: 1, // appended after the 1 existing item
        created_by: 'James',
      })
      expect(payload[0].description).toContain('*As a* vessel Captain')

      await waitFor(() => {
        expect(screen.getByTestId('import-success')).toHaveTextContent('Imported 1 item')
      })
      expect(mockRefetchData).toHaveBeenCalled()
      expect(screen.queryByTestId('import-preview')).not.toBeInTheDocument()
    })

    it('toggling a row changes the import count', async () => {
      render(<ImportExportPage />)

      uploadCsv(JIRA_CSV)
      await waitFor(() => {
        expect(screen.getByTestId('import-row-checkbox-1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('import-row-checkbox-1'))

      expect(screen.getByTestId('import-confirm-button')).toHaveTextContent('Import 2 items')
    })

    it('shows an error for a CSV without a title column', async () => {
      render(<ImportExportPage />)

      uploadCsv('Foo,Bar\n1,2\n')

      await waitFor(() => {
        expect(screen.getByTestId('import-error')).toHaveTextContent(/title/i)
      })
      expect(screen.queryByTestId('import-preview')).not.toBeInTheDocument()
    })

    it('rejects non-CSV files', async () => {
      render(<ImportExportPage />)

      const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })
      fireEvent.change(screen.getByTestId('csv-file-input'), { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByTestId('import-error')).toHaveTextContent(/CSV/i)
      })
    })

    it('cancel clears the preview', async () => {
      render(<ImportExportPage />)

      uploadCsv(JIRA_CSV)
      await waitFor(() => {
        expect(screen.getByTestId('import-preview')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('import-cancel-button'))

      expect(screen.queryByTestId('import-preview')).not.toBeInTheDocument()
      expect(screen.getByTestId('import-dropzone')).toBeInTheDocument()
    })

    it('shows an error when the insert fails', async () => {
      mockInsert.mockResolvedValueOnce({ error: { message: 'boom' } } as never)
      render(<ImportExportPage />)

      uploadCsv(JIRA_CSV)
      await waitFor(() => {
        expect(screen.getByTestId('import-confirm-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('import-confirm-button'))

      await waitFor(() => {
        expect(screen.getByTestId('import-error')).toHaveTextContent(/failed/i)
      })
    })
  })

  describe('Export flow', () => {
    it('exports the session items as CSV', () => {
      render(<ImportExportPage />)

      fireEvent.click(screen.getByTestId('export-csv-button'))

      expect(mockExportToCsv).toHaveBeenCalledWith({
        items: mockItems,
        framework: 'rice',
        sessionName: 'Test Session',
      })
    })
  })
})
