import { Fragment } from 'react'

/*
 * The backend returns summaries and answers as lightly formatted text:
 * "**bold**", lines starting with "- " or "1. ", and "# headings".
 * This renders just those, as React elements (no HTML injection), so users
 * do not see raw asterisks. Anything else is shown as plain text.
 */

function renderInline(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
    part.length > 4 && part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
      : <Fragment key={i}>{part}</Fragment>
  )
}

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'heading'; text: string }

function parse(text: string): Block[] {
  const blocks: Block[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const last = blocks[blocks.length - 1]
    if (!line) {
      // A blank line ends the current paragraph or list.
      if (last && !(last.kind === 'p' && last.lines.length === 0)) blocks.push({ kind: 'p', lines: [] })
      continue
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line)
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line)
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    if (bullet) {
      if (last?.kind === 'ul') last.items.push(bullet[1])
      else blocks.push({ kind: 'ul', items: [bullet[1]] })
    } else if (numbered) {
      if (last?.kind === 'ol') last.items.push(numbered[1])
      else blocks.push({ kind: 'ol', items: [numbered[1]] })
    } else if (heading) {
      blocks.push({ kind: 'heading', text: heading[1] })
    } else if (last?.kind === 'p') {
      last.lines.push(line)
    } else {
      blocks.push({ kind: 'p', lines: [line] })
    }
  }
  return blocks.filter(b => !(b.kind === 'p' && b.lines.length === 0))
}

export default function RichText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`space-y-2 break-words ${className}`}>
      {parse(text).map((block, i) => {
        if (block.kind === 'heading') {
          return <p key={i} className="font-semibold text-ink">{renderInline(block.text)}</p>
        }
        if (block.kind === 'ul') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ul>
          )
        }
        if (block.kind === 'ol') {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ol>
          )
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
