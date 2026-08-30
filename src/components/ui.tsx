import type { ReactNode } from 'react'
import { formatMoney, type Shillings } from '@/lib/money'
import type { Origin } from '@/lib/types'

/** The single container. One column, centred, nothing beside it. Side
 *  padding matches the header exactly so content never feels wider or
 *  narrower than the nav above it, on any screen size. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[680px] px-4 pb-32 pt-8 sm:px-5 sm:pt-10">
      {children}
    </main>
  )
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mt-12 first:mt-0">
      {title && (
        <h2 className="mb-4 text-[13px] font-medium uppercase tracking-[0.06em] text-fg-faint">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

/**
 * The provenance dot. Blue means it arrived by voice through the agent,
 * green means a person typed or corrected it. Six pixels, and it is the only
 * decoration in the whole app — because it is not decoration.
 */
export function OriginDot({ origin }: { origin: Origin }) {
  return (
    <span
      aria-label={origin === 'agent' ? 'Recorded by voice' : 'Entered by a person'}
      title={origin === 'agent' ? 'Recorded by voice' : 'Entered by a person'}
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: origin === 'agent' ? 'var(--color-agent)' : 'var(--color-human)' }}
    />
  )
}

export function Money({ value, className = '' }: { value: Shillings; className?: string }) {
  return <span className={`tnum ${className}`}>{formatMoney(value)}</span>
}

export function Row({
  left, right, sub, onClick, flagged = false,
}: {
  left: ReactNode
  right: ReactNode
  sub?: ReactNode
  onClick?: () => void
  flagged?: boolean
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`flex w-full items-baseline gap-3 border-b border-border py-3 text-left last:border-b-0 ${
        onClick ? 'transition-colors hover:bg-bg-subtle' : ''
      }`}
      style={flagged ? { background: 'var(--color-attention-tint)' } : undefined}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] text-fg">{left}</span>
        {sub && <span className="mt-0.5 block text-[13px] text-fg-muted">{sub}</span>}
      </span>
      <span className="shrink-0 text-[15px] text-fg">{right}</span>
    </Tag>
  )
}

export function Button({
  children, onClick, variant = 'secondary', disabled, type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'confirm'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const styles: Record<string, string> = {
    primary: 'bg-fg text-white hover:opacity-90',
    secondary: 'border border-border bg-white text-fg hover:bg-bg-subtle',
    confirm: 'text-white hover:opacity-90',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`h-10 shrink-0 whitespace-nowrap rounded-md px-4 text-[14px] font-medium transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${styles[variant]}`}
      style={variant === 'confirm' ? { background: 'var(--color-human)' } : undefined}
    >
      {children}
    </button>
  )
}

/** Shown when a name could not be resolved or a number was not heard. */
export function NeedsYou({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-md border px-4 py-3 text-[14px]"
      style={{
        borderColor: 'var(--color-attention)',
        background: 'var(--color-attention-tint)',
        color: 'var(--color-fg)',
      }}
    >
      {children}
    </div>
  )
}
