'use client'

import { useMemo, useState } from 'react'
import { Button, Money, Page, Section } from '@/components/ui'
import { formatMoney } from '@/lib/money'
import { addPerson, newId, useLoad } from '@/lib/store'
import { useTools } from '@/lib/webmcp/use-tools'
import { peopleTools } from '@/lib/webmcp/tools-people'

export default function PeoplePage() {
  const s = useLoad()
  useTools(() => peopleTools(), [])

  const rows = useMemo(() => {
    return s.people.map((p) => {
      const advances = s.advances.filter((a) => a.personId === p.id)
      const paid = s.costs.filter((c) => c.paidById === p.id)
      const financed = s.financings.filter((f) => f.financierId === p.id)

      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        shareholder: p.shareholder,
        advanced: advances.reduce((t, a) => t + a.amount, 0),
        advanceCount: advances.length,
        paidOut: paid.reduce((t, c) => t + c.amount, 0),
        paidItems: paid,
        financed: financed.reduce((t, f) => t + f.principal + f.agreedReturn, 0),
      }
    })
  }, [s])

  const shareholders = rows.filter((r) => r.shareholder)
  const others = rows.filter((r) => !r.shareholder)

  if (!s.ready) return <Page><p className="text-fg-faint">Opening the book…</p></Page>

  if (!s.load) {
    return (
      <Page>
        <Section>
          <p className="text-[20px]">No load open yet.</p>
          <p className="mt-3 text-[15px] text-fg-muted">
            Start a load on the load page first, then people can be added
            here.
          </p>
        </Section>
      </Page>
    )
  }

  return (
    <Page>
      <Section>
        <p className="text-[13px] text-fg-faint">{s.load.name}</p>
        <p className="mt-2 text-[32px] leading-none tnum">{shareholders.length}</p>
        <p className="mt-2 text-[15px] text-fg-muted">
          people hold a share in this load
        </p>
        <p className="mt-3 text-[13px] text-fg-faint">
          Each share is an equal cut of whatever is left after the levy, the
          financing and every cost.
        </p>
      </Section>

      <Section title="Shareholders">
        {shareholders.length === 0 && (
          <p className="py-4 text-[15px] text-fg-muted">
            Nobody added yet. Add the first person below.
          </p>
        )}
        {shareholders.map((r) => (
          <PersonRow key={r.id} row={r} />
        ))}
      </Section>

      {others.length > 0 && (
        <Section title="Also on this load">
          {others.map((r) => (
            <PersonRow key={r.id} row={r} />
          ))}
        </Section>
      )}

      <Section title="Add someone">
        <AddPersonForm />
      </Section>
    </Page>
  )
}

function AddPersonForm() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [shareholder, setShareholder] = useState(true)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] font-medium text-fg-muted hover:text-fg"
      >
        + Add a person by hand
      </button>
    )
  }

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    await addPerson({
      id: newId('p'),
      name: trimmed,
      phone: phone.trim() || null,
      shareholder,
    })
    setName('')
    setPhone('')
    setOpen(false)
  }

  return (
    <div className="rounded-md border border-border p-4">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[12px] text-fg-faint">Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-md border border-border px-3 text-[14px] outline-none"
            placeholder="Full name"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-fg-faint">Phone (optional)</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 w-full rounded-md border border-border px-3 text-[14px] outline-none tnum"
            placeholder="07XX XXX XXX"
          />
        </label>
        <label className="flex items-center gap-2 text-[14px]">
          <input
            type="checkbox"
            checked={shareholder}
            onChange={(e) => setShareholder(e.target.checked)}
          />
          Holds a share in this load
        </label>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={() => setOpen(false)} className="text-[13px] text-fg-faint">
          Cancel
        </button>
        <Button variant="confirm" disabled={!name.trim()} onClick={submit}>
          Save person
        </Button>
      </div>
    </div>
  )
}

function PersonRow({
  row,
}: {
  row: {
    name: string
    phone: string | null
    shareholder: boolean
    advanced: number
    advanceCount: number
    paidOut: number
    paidItems: Array<{ id: string; description: string; amount: number }>
    financed: number
  }
}) {
  // Everything about a person that changes what they are paid, on one line,
  // in the order it hits their share. No expanding, no drilling in — someone
  // asking about their money should not have to tap anything.
  const notes: string[] = []
  if (row.financed > 0) notes.push(`fronted ${formatMoney(row.financed)}, returned first`)
  if (row.paidOut > 0) notes.push(`paid ${formatMoney(row.paidOut)} of their own, comes back`)
  if (row.advanced > 0)
    notes.push(`drew ${formatMoney(row.advanced)} early, off their own share`)
  if (notes.length === 0) notes.push(row.shareholder ? 'nothing drawn, nothing owed' : 'no share')

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px]">{row.name}</span>
          {row.phone && (
            <span className="mt-0.5 block text-[13px] text-fg-faint tnum">{row.phone}</span>
          )}
        </span>
        {row.advanced > 0 ? (
          <span className="shrink-0 text-[15px]" style={{ color: 'var(--color-attention)' }}>
            −<Money value={row.advanced} />
          </span>
        ) : (
          <span className="shrink-0 text-[15px] text-fg-faint">—</span>
        )}
      </div>
      <p className="mt-1.5 text-[13px] text-fg-muted">{notes.join(' · ')}</p>
    </div>
  )
}
