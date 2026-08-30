'use client'

import { useMemo, useState } from 'react'
import { Button, Money, OriginDot, Page, Section } from '@/components/ui'
import { RecordButton } from '@/components/record-button'
import { ManualEntryPanel } from '@/components/manual-entry'
import { formatMoney } from '@/lib/money'
import { addNote, createLoad, newId, updateCost, useLoad } from '@/lib/store'
import { useTools, useWebMCPAvailable } from '@/lib/webmcp/use-tools'
import { loadTools } from '@/lib/webmcp/tools-load'
import { loadExtraTools } from '@/lib/webmcp/tools-load-extra'
import type { Origin } from '@/lib/types'

type Line = {
  id: string
  at: string
  title: string
  sub: string
  amount: number
  origin: Origin
}

export default function LoadPage() {
  const s = useLoad()
  const webmcp = useWebMCPAvailable()

  // Registered for as long as this page is mounted, and aborted when it is
  // not. An agent looking at the split cannot record a cost, and that is
  // enforced by the lifecycle rather than by a check somebody forgets.
  useTools(() => [...loadTools(), ...loadExtraTools()], [])

  const lines: Line[] = useMemo(() => {
    const all: Line[] = [
      ...s.costs.map((c) => ({
        id: c.id,
        at: c.at,
        title: c.description || c.category,
        sub: [
          shortDate(c.at),
          c.paidById ? `paid by ${nameOf(s.people, c.paidById)}` : c.category,
        ].join(' · '),
        amount: c.amount,
        origin: c.origin,
      })),
      ...s.advances.map((a) => ({
        id: a.id,
        at: a.at,
        title: `Advance — ${nameOf(s.people, a.personId)}`,
        sub: `${shortDate(a.at)} · comes off their own share`,
        amount: a.amount,
        origin: a.origin,
      })),
      ...s.levies.map((v) => ({
        id: v.id,
        at: v.at,
        title: `Levy — ${v.paidTo}`,
        sub: `${shortDate(v.at)} · paid on the load`,
        amount: v.amount,
        origin: v.origin,
      })),
      ...s.lots.map((l) => ({
        id: l.id,
        at: l.at,
        title: `Sold — ${l.buyer}`,
        sub: `${shortDate(l.at)} · ${l.grams} g at ${l.pricePerGram.toLocaleString('en-US')}`,
        amount: Math.round(l.grams * l.pricePerGram),
        origin: l.origin,
      })),
    ]
    return all.sort((a, b) => b.at.localeCompare(a.at))
  }, [s])

  const spent = s.costs.reduce((t, c) => t + c.amount, 0)
  const unpaidUnknown = s.costs.filter((c) => c.paidById === null && c.amount >= 5000)
  const openNotes = s.notes.filter((n) => !n.resolved)

  if (!s.ready) return <Page><p className="text-fg-faint">Opening the book…</p></Page>

  // Genuinely empty. No load has been started yet — nothing is invented to
  // fill the screen. A person names their own load and everything from here
  // is real.
  if (!s.load) {
    return (
      <Page>
        <Section>
          <StartLoad />
        </Section>
      </Page>
    )
  }

  return (
    <>
      <Page>
        {webmcp === false && (
          <div className="mb-6 rounded-md border border-border bg-bg-subtle px-4 py-3 text-[13px] text-fg-muted">
            This browser has no WebMCP. Everything still works by hand. To let an
            agent use it, open Chrome and enable{' '}
            <code className="font-mono text-[12px]">chrome://flags/#enable-webmcp-testing</code>.
          </div>
        )}

        <Section>
          <p className="text-[13px] text-fg-faint">
            {s.load.name} · opened {longDate(s.load.openedAt)}
          </p>
          <p className="mt-2 text-[32px] leading-none tnum">{formatMoney(spent)}</p>
          <p className="mt-2 text-[15px] text-fg-muted">
            spent so far, across {s.costs.length} costs
          </p>
          <p className="mt-3 text-[13px] text-fg-faint">
            {s.lots.length === 0 ? 'Not sold yet' : `${s.lots.length} lot sold`} ·{' '}
            {s.people.filter((p) => p.shareholder).length} shareholders ·{' '}
            {s.advances.length} advances drawn
          </p>
        </Section>

        {/* The only colour on the page, aside from the provenance dots.
            Something is waiting on a person. */}
        {unpaidUnknown.map((c) => (
          <div
            key={c.id}
            className="mt-8 flex items-center gap-3 rounded-md py-3.5 pl-4 pr-4"
            style={{
              background: 'var(--color-attention-tint)',
              borderLeft: '2px solid var(--color-attention)',
            }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--color-attention)' }}
            />
            <span className="flex-1 text-[14px]">
              {c.description}, <span className="tnum">{formatMoney(c.amount)}</span> — nobody
              recorded who paid
            </span>
            <button
              type="button"
              onClick={() => {
                const who = window.prompt('Who paid for this?')
                const match = s.people.find(
                  (p) => who && p.name.toLowerCase().includes(who.toLowerCase()),
                )
                if (match) updateCost(c.id, { paidById: match.id, origin: 'human' })
              }}
              className="shrink-0 text-[13px] font-medium"
            >
              Say who
            </button>
          </div>
        ))}

        <Section title="This load">
          {lines.length === 0 && (
            <p className="py-6 text-[15px] text-fg-muted">
              Nothing recorded yet. Hold the button and say what you spent, or
              add the first entry by hand below.
            </p>
          )}

          <div>
            {lines.map((line) => (
              <div
                key={line.id}
                className="flex items-baseline gap-3 border-b border-border py-3.5 last:border-b-0"
              >
                <OriginDot origin={line.origin} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">{line.title}</span>
                  <span className="mt-0.5 block text-[13px] text-fg-muted">{line.sub}</span>
                </span>
                <Money value={line.amount} className="shrink-0 text-[15px]" />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <ManualEntryPanel people={s.people} />
          </div>
        </Section>

        {openNotes.length > 0 && (
          <Section title="Kept as said">
            {openNotes.map((n) => (
              <NoteCard key={n.id} id={n.id} text={n.text} at={n.at} people={s.people} />
            ))}
          </Section>
        )}
      </Page>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white">
        <div className="mx-auto max-w-[680px] px-5 py-4">
          <RecordButton
            onText={async (text) => {
              // With no agent listening, speech still has to go somewhere.
              // It becomes a note, verbatim, and the rule holds either way:
              // nothing spoken is ever discarded. It can be turned into a
              // real entry from the "Kept as said" section below.
              await addNote({
                id: newId('n'),
                at: new Date().toISOString(),
                text,
                origin: 'human',
                resolved: false,
              })
            }}
          />
        </div>
      </div>
    </>
  )
}

function StartLoad() {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    await createLoad(trimmed)
  }

  return (
    <div>
      <p className="text-[20px]">No load open yet.</p>
      <p className="mt-3 text-[15px] text-fg-muted">
        Name the load to start the book. Nothing is pre-filled — costs,
        people, and sales are only ever what actually gets recorded.
      </p>
      <div className="mt-6 flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="e.g. Load 1 — Nyamalembo"
          className="h-[52px] flex-1 rounded-md border border-border px-4 text-[15px] outline-none"
        />
        <Button variant="primary" disabled={busy || !name.trim()} onClick={submit}>
          Start
        </Button>
      </div>
    </div>
  )
}

function NoteCard({
  id, text, at, people,
}: {
  id: string
  text: string
  at: string
  people: { id: string; name: string; phone: string | null; shareholder: boolean }[]
}) {
  const [converting, setConverting] = useState(false)

  return (
    <div className="mt-3 rounded-md bg-bg-subtle p-4 first:mt-0">
      <p className="text-[14px] italic text-fg-muted">{text}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[13px] text-fg-faint">
          {shortDate(at)} — nothing was thrown away
        </p>
        {!converting && (
          <button
            type="button"
            onClick={() => setConverting(true)}
            className="text-[13px] font-medium text-fg-muted hover:text-fg"
          >
            Turn into a cost
          </button>
        )}
      </div>
      {converting && (
        <div className="mt-3">
          <ManualEntryPanel
            people={people}
            prefillDescription={text.slice(0, 80)}
            noteIdToResolve={id}
          />
        </div>
      )}
    </div>
  )
}

function nameOf(people: { id: string; name: string }[], id: string) {
  return people.find((p) => p.id === id)?.name ?? 'someone'
}

function shortDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function longDate(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}
