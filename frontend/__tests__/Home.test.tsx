import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Home from '../app/page'
import { uploadPDF } from '../lib/api'

// The page calls useRouter(), which only works inside a running Next.js app.
// In tests we replace it with a fake router and watch what it is asked to do.
const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

// No real network in tests: uploadPDF is replaced with a controllable fake.
jest.mock('../lib/api', () => ({
  uploadPDF: jest.fn(),
}))
const mockUpload = uploadPDF as jest.Mock

const pdf = () => new File(['%PDF-1.4 test'], 'contract.pdf', { type: 'application/pdf' })
const chooseFile = (file: File) =>
  fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } })

describe('Home', () => {
  beforeEach(() => {
    push.mockClear()
    mockUpload.mockReset()
  })

  it('renders the brand and the headline', () => {
    render(<Home />)

    expect(screen.getByText('Vidhived.ai')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Intelligence for\s*Legal Documents/)
  })

  it('keeps a space between "with" and "AI-powered" in the intro', () => {
    render(<Home />)

    expect(screen.getByText(/insights with/)).toHaveTextContent('insights with AI-powered risk scoring')
  })

  it('offers a real button to choose a PDF', () => {
    render(<Home />)

    expect(screen.getByRole('button', { name: 'Choose a PDF' })).toBeEnabled()
  })

  it('rejects a file that is not a PDF', () => {
    render(<Home />)

    chooseFile(new File(['hello'], 'notes.txt', { type: 'text/plain' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Please select a PDF file.')
    expect(screen.queryByRole('button', { name: 'Analyze document' })).not.toBeInTheDocument()
  })

  it('shows the chosen file name, uploads it and opens the document page', async () => {
    mockUpload.mockResolvedValue({ documentId: 'abc-123', pdfUrl: '/pdf/abc-123', message: 'ok' })
    render(<Home />)

    chooseFile(pdf())
    expect(screen.getByText('contract.pdf')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Analyze document' }))

    expect(screen.getByRole('button', { name: /Uploading/ })).toBeDisabled()
    await waitFor(() => expect(push).toHaveBeenCalledWith('/document/abc-123'))
    expect(mockUpload).toHaveBeenCalledTimes(1)
  })

  it('shows the error and lets the user try again when the upload fails', async () => {
    mockUpload.mockRejectedValue(new Error('File does not appear to be a valid PDF'))
    render(<Home />)

    chooseFile(pdf())
    fireEvent.click(screen.getByRole('button', { name: 'Analyze document' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('File does not appear to be a valid PDF')
    expect(screen.getByRole('button', { name: 'Analyze document' })).toBeEnabled()
    expect(push).not.toHaveBeenCalled()
  })
})
