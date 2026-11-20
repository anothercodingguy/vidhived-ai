/*
 * The isometric hero illustration on the landing page.
 *
 * It is decoration only: aria-hidden, no focusable elements, no pointer
 * events. The real upload form lives in app/page.tsx, outside this drawing.
 *
 * The tiles are white in both themes, so their icons use fixed palette
 * colours instead of theme tokens (a token would change while the tile does not).
 *
 * Every size is in em. The .hero-art class (app/globals.css) sets a
 * font-size that follows the viewport width, so the drawing scales as a
 * whole and is never clipped on a phone.
 */

type NodeStyle = React.CSSProperties & Record<'--z' | '--float-duration' | '--float-delay', string>

const node = (z: string, duration: string, delay: string): NodeStyle => ({
  '--z': z,
  '--float-duration': duration,
  '--float-delay': delay,
})

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export default function HeroArt() {
  return (
    <div className="hero-art mt-6 sm:mt-10" aria-hidden="true">
      <div className="hero-art-glow" />

      <div className="hero-art-stage">
        {/* Dashed connectors */}
        <svg
          className="absolute inset-0 h-full w-full overflow-visible text-primary/60 [transform:translateZ(-1px)]"
          viewBox="0 0 900 700"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 6"
        >
          <path d="M 400 300 Q 200 300 100 500" />
          <path d="M 400 300 Q 400 100 600 50" />
          <path d="M 100 500 Q 50 600 -50 650" />
          <path d="M 400 300 Q 500 500 700 600" />
          <path d="M 700 600 Q 800 650 900 600" />
        </svg>

        {/* Central hub */}
        <div className="hero-art-hub left-[18.75em] top-[12.5em] h-[16em] w-[16em]">
          <div className="flex h-[14em] w-[14em] items-center justify-center rounded-full border-[0.25em] border-blue-400">
            <div className="flex h-[10em] w-[10em] items-center justify-center rounded-full bg-primary-solid">
              <div className="flex h-[6em] w-[6em] items-center justify-center rounded-full border-[0.25em] border-white">
                <div className="h-[2.5em] w-[2.5em] rounded-full bg-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Floating tiles */}
        <div className="hero-art-node left-[3.125em] top-[28.125em] h-[4em] w-[4em] rounded-[1em]" style={node('1.9em', '6s', '0s')}>
          <svg {...iconProps} className="h-[2em] w-[2em] text-blue-600">
            <path d="M12 3v18" /><path d="M7 21h10" /><path d="M5 7h14" /><path d="M5 7l-3 7a3 3 0 0 0 6 0z" /><path d="M19 7l-3 7a3 3 0 0 0 6 0z" />
          </svg>
        </div>

        <div className="hero-art-node left-[9.375em] top-[21.875em] h-[3.5em] w-[3.5em] rounded-[0.75em]" style={node('2.5em', '5s', '1s')}>
          <span className="rounded-[0.25em] border-[0.125em] border-red-500 px-[0.2em] text-[1.1em] font-bold leading-tight text-red-500">PDF</span>
        </div>

        <div className="hero-art-node left-[15.625em] top-[17.5em] h-[3em] w-[3em] rounded-[0.5em]" style={node('1.25em', '4s', '0.5s')}>
          <svg {...iconProps} className="h-[1.5em] w-[1.5em] text-emerald-600">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /><line x1="12" y1="22" x2="12" y2="15.5" /><polyline points="22 8.5 12 15.5 2 8.5" /><polyline points="2 15.5 12 8.5 22 15.5" /><line x1="12" y1="2" x2="12" y2="8.5" />
          </svg>
        </div>

        <div className="hero-art-node left-[17.5em] top-[30em] h-[3.5em] w-[3.5em] rounded-[0.75em]" style={node('2.2em', '6s', '1.5s')}>
          <svg {...iconProps} className="h-[1.75em] w-[1.75em] text-blue-600">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        <div className="hero-art-node left-[12.5em] top-[37.5em] h-[3.5em] w-[3.5em] rounded-[0.75em]" style={node('1.6em', '5s', '2s')}>
          <svg {...iconProps} className="h-[1.75em] w-[1.75em] text-amber-600">
            <path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>

        <div className="hero-art-node left-[28.125em] top-[28.125em] h-[3em] w-[3em] rounded-[0.5em]" style={node('0.6em', '4.5s', '0.8s')}>
          <svg {...iconProps} className="h-[1.5em] w-[1.5em] text-slate-500">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
          </svg>
        </div>

        {/* A stylised analysed document: three clauses with a risk marker each */}
        <div className="hero-art-card left-[34.375em] top-[12.5em] h-[17.5em] w-[20em]">
          <div className="absolute inset-x-[1.5em] top-[1.5em] flex flex-col gap-[1.1em]">
            {(['bg-risk-high', 'bg-risk-medium', 'bg-risk-low'] as const).map(color => (
              <div key={color} className="flex items-start gap-[0.75em] rounded-[0.6em] border border-line bg-surface p-[0.75em]">
                <span className={`mt-[0.15em] h-[0.7em] w-[0.7em] shrink-0 rounded-full ${color}`} />
                <span className="flex flex-1 flex-col gap-[0.45em]">
                  <span className="h-[0.5em] w-4/5 rounded-full bg-ink/25" />
                  <span className="h-[0.5em] w-3/5 rounded-full bg-ink/10" />
                </span>
              </div>
            ))}
          </div>
          <div className="absolute inset-x-[1.5em] bottom-[1.5em] h-[2.5em] rounded-[0.6em] bg-primary-solid" />
        </div>

        {/* Arrow from the hub to the document */}
        <svg
          className="absolute left-[31.375em] top-[21.25em] h-[5em] w-[8em] overflow-visible text-primary [transform:translateZ(3.7em)]"
          viewBox="0 0 128 80"
          fill="none"
        >
          <defs>
            <marker id="hero-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          <path d="M 0 0 C 20 10, 80 10, 100 -20" stroke="currentColor" strokeDasharray="4 4" strokeWidth="2" markerEnd="url(#hero-arrow)" />
        </svg>
      </div>
    </div>
  )
}
