import { render, screen } from '@testing-library/react'
import Home from '../app/page'

describe('Home', () => {
  it('renders a heading', () => {
    render(<Home />)
    
    // Looks for an element that has "Vidhived" or similar text
    // The exact text will depend on the actual page structure, this is a generic smoke test
    const targetElement = screen.getByText(/Vidhived.ai/i, { exact: false })
    expect(targetElement).toBeInTheDocument()
  })
})
