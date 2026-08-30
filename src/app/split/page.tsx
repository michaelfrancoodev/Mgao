'use client'

import { useMemo, useState } from 'react'
import { Money, Page, Section } from '@/components/ui'
import { formatMoney } from '@/lib/money'
import { computeSplit, type SplitResult } from '@/lib/split/engine'
import { useLoad } from '@/lib/store'
import { useTools } from '@/lib/webmcp/use-tools'
import { splitTools } from '@/lib/webmcp/tools-split'

export default function SplitPage() {
  const s = useLoad()

  // Both split tools are read-only, and they only exist while this page is
  // open. Looking at a division must never perform one.
  useTools(() => splitTools(), [])

  const result: SplitResult | null = useMemo(() => {
    if (s.lots.length === 0) return null
    return computeSplit({
      people: s.people,
      lots: s.lots,
      levies: s.levies,
      financings: s.financings,
      costs: s.costs,
      advances: s.advances,
    })
  }, [s])

  if (!s.ready) return <Page><p className="text-fg-faint">Opening the book…</p></Page>

  if (!s.load) {
    return (
      <Page>
        <Section>
          <p className="text-[20px]">No load open yet.</p>
          <p className="mt-3 text-[15px] text-fg-muted">
            Start a load on the load page. Once it has sold, the division
            will work itself out here, step by step.
          </p>
        </Section>
      </Page>
    )
  }

  if (!result) {
    return (
      <Page>
        <Section>
          <p className="text-[20px]">The load has not been sold yet.</p>
          <p className="mt-3 text-[15px] text-fg-muted">
            Record the sale on the load page and the division will work itself
            out here, step by step.
          </p>
        </Section>
      </Page>
    )
  }

  return (
    <Page>
      <Section>
        <p className="text-[13px] text-fg-faint">{s.load?.name}</p>
        <p className="mt-2 text-[32px] leading-none tnum">{formatMoney(result.remainder)}</p>
        <p className="mt-2 text-[15px] text-fg-muted">
          left to divide between {result.shareholderCount} people
        </p>
      </Section>

      {result.shortfall && (
        <div
          className="mt-6 rounded-md py-3.5 pl-4 pr-4 text-[14px]"
          style={{
            background: 'var(--color-attention-tint)',
            borderLeft: '2px solid var(--color-attention)',
          }}
        >
          This load did not cover what it cost. Everyone carries an equal part of
          the shortfall.
        </div>
      )}

      {/* The six steps, in the order they happen at a real payout. Nothing is
          summarised into a single figure, because a summary is exactly what
          a paper notebook already gives you and exactly what nobody trusts. */}
      <Section title="How it was worked out">
        <Step n={1} label="Sold" total={result.gross} items={result.lots} sign="+" />
        <Step n={2} label="Less the levy" total={result.levy} items={result.levies} sign="−" />
        <Step n={3} label="Less what was fronted" total={result.financing} items={result.financings} sign="−" />
        <Step n={4} label={`Less ${result.costs.length} costs`} total={result.costsTotal} items={result.costs} sign="−" />

        <div className="mt-5 flex items-baseline justify-between border-t-2 border-fg pt-4">
          <span className="text-[15px] font-medium">Left over</span>
          <Money value={result.remainder} className="text-[20px] font-medium" />
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-[15px] text-fg-muted">
            Divided equally, {result.shareholderCount} ways
          </span>
          <Money value={result.shares[0]?.equalShare ?? 0} className="text-[15px]" />
        </div>

        {result.unevenDivision && (
          <p className="mt-3 text-[13px] text-fg-faint">
            It did not divide evenly. The odd shillings were handed out one at a
            time so that nothing was lost to rounding.
          </p>
        )}
      </Section>

      <Section title="What each person takes">
        {result.shares.map((p) => (
          <ShareCard key={p.personId} share={p} equalShare={p.equalShare} />
        ))}
      </Section>

      <p className="mt-10 text-[13px] text-fg-faint">
        Every figure above comes from something recorded on the load. Nothing
        here was estimated, and nothing was worked out by the agent.
      </p>
    </Page>
  )
}

function Step({
  n, label, total, items, sign,
}: {
  n: number
  label: string
  total: number
  items: Array<{ id: string; label: string; amount: number }>
  sign: '+' | '−'
}) {
  const [open, setOpen] = useState(n === 4) // costs open by default; it is the contested one

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-baseline gap-3 text-left"
      >
        <span className="w-4 shrink-0 text-[13px] text-fg-faint tnum">{n}</span>
        <span className="flex-1 text-[15px]">{label}</span>
        <span className="shrink-0 text-[15px]">
          {sign}
          <Money value={total} />
        </span>
      </button>

      {open && items.length > 0 && (
        <div className="mt-2 pl-7">
          {items.map((i) => (
            <div key={i.id} className="flex items-baseline justify-between py-1.5">
              <span className="min-w-0 flex-1 truncate text-[13px] text-fg-muted">{i.label}</span>
              <Money value={i.amount} className="shrink-0 text-[13px] text-fg-muted" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ShareCard({
  share,
}: {
  share: {
    name: string
    equalShare: number
    reimbursed: number
    reimbursements: Array<{ id: string; label: string; amount: number }>
    advanced: number
    advances: Array<{ id: string; label: string; amount: number }>
    takeHome: number
    owesBack: boolean
  }
  equalShare: number
}) {
  return (
    <div className="border-b border-border py-5 last:border-b-0">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-medium">{share.name}</span>
        <span
          className="text-[20px] font-medium tnum"
          style={share.owesBack ? { color: 'var(--color-danger)' } : undefined}
        >
          {share.owesBack
            ? `owes ${formatMoney(Math.abs(share.takeHome))}`
            : formatMoney(share.takeHome)}
        </span>
      </div>

      {/* Their whole line, not a total. This is the answer to "why is mine
          different from theirs", and it is on screen before anybody asks. */}
      <div className="mt-3 pl-0">
        <Line label="Equal share" amount={share.equalShare} />

        {share.reimbursements.map((r) => (
          <Line key={r.id} label={`Paid for ${r.label.toLowerCase()}, back to them`} amount={r.amount} />
        ))}

        {share.advances.map((a) => (
          <Line key={a.id} label="Drew early, off their own share" amount={-a.amount} />
        ))}
      </div>
    </div>
  )
}

function Line({ label, amount }: { label: string; amount: number }) {
  const negative = amount < 0
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-[13px] text-fg-muted">{label}</span>
      <span
        className="text-[13px] tnum"
        style={{ color: negative ? 'var(--color-attention)' : 'var(--color-fg-muted)' }}
      >
        {negative ? '−' : ''}
        {formatMoney(Math.abs(amount))}
      </span>
    </div>
  )
}
