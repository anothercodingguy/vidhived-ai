import { render, screen } from '@testing-library/react'
import RichText from '../components/RichText'

describe('RichText', () => {
  it('turns the backend summary format into headings and lists, without raw asterisks', () => {
    const { container } = render(
      <RichText text={'**Document Statistics**\n- Pages: 2\n- Words: 220\n\n**AI Summary**\nA short summary.'} />
    )

    expect(container).not.toHaveTextContent('**')
    expect(screen.getByText('Document Statistics').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('A short summary.')).toBeInTheDocument()
  })
})
