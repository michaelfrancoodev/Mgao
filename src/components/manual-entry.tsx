'use client'

import { useState } from 'react'
import { Button } from './ui'
import { formatMoney, parseMoney } from '@/lib/money'
import { addAdvance, addCost, addLevy, addLot, newId, resolveNote } from '@/lib/store'
import type { CostCategory, Person } from '@/lib/types'

const CATEGORIES: CostCategory[] = [
  'milling', 'fuel', 'food', 'transport', 'repair', 'labour', 'other',
]

type Kind = 'cost' | 'advance' | 'sale' | 'levy'

const KIND_LABEL: Record<Kind, string> = {
  cost: 'Cost',
  advance: 'Advance',
  sale: 'Sale',
  levy: 'Levy',
}

/**
 * The by-hand path. Nothing in this app is pre-filled or invented — if a
 * load is empty, it stays empty until a real person records something real,
 * whether that's spoken to an agent or typed here directly.
 */
export function ManualEntryPanel({
  people,
  prefillDescription,
  noteIdToResolve,
  onSaved,
}: {
  people: Person[]
  prefillDescription?: string
  noteIdToResolve?: string
  onSaved?: () => void
}) {
  const [open, setOpen] = useState(Boolean(prefillDescription))
  const [kind, setKind] = useState<Kind>('cost')

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] font-medium text-fg-muted hover:text-fg"
      >
        + Add an entry by hand
      </button>
    )
  }

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className="h-9 shrink-0 rounded-md border px-3 text-[13px] transition-colors"
            style={
              kind === k
                ? { borderColor: 'var(--color-fg)', background: 'var(--color-fg)', color: '#fff' }
                : { borderColor: 'var(--color-border)', background: '#fff', color: 'var(--color-fg-muted)' }
            }
          >
            {KIND_LABEL[k]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto shrink-0 px-2 py-2 text-[13px] text-fg-faint transition-colors hover:text-fg"
        >
          Cancel
        </button>
      </div>

      <div className="mt-4">
        {kind === 'cost' && (
          <CostForm
            people={people}
            prefillDescription={prefillDescription}
            noteIdToResolve={noteIdToResolve}
            onSaved={() => { setOpen(false); onSaved?.() }}
          />
        )}
        {kind === 'advance' && (
          <AdvanceForm people={people} onSaved={() => { setOpen(false); onSaved?.() }} />
        )}
        {kind === 'sale' && (
          <SaleForm onSaved={() => { setOpen(false); onSaved?.() }} />
        )}
        {kind === 'levy' && (
          <LevyForm onSaved={() => { setOpen(false); onSaved?.() }} />
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-fg-faint">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'h-10 w-full rounded-md border border-border px-3 text-[14px] outline-none'

function CostForm({
  people, prefillDescription, noteIdToResolve, onSaved,
}: {
  people: Person[]
  prefillDescription?: string
  noteIdToResolve?: string
  onSaved: () => void
}) {
  const [category, setCategory] = useState<CostCategory>('other')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState(prefillDescription ?? '')
  const [paidById, setPaidById] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const value = parseMoney(amount)
    if (value === null || value <= 0) return setError('Enter a real amount.')
    if (!description.trim()) return setError('Say what it was for.')

    await addCost({
      id: newId('c'),
      at: new Date().toISOString(),
      category,
      amount: value,
      description: description.trim(),
      paidById: paidById || null,
      method: 'cash',
      origin: 'human',
    })
    if (noteIdToResolve) await resolveNote(noteIdToResolve)
    onSaved()
  }

  return (
    <div className="space-y-3">
      <Field label="What for">
        <input
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Diesel for the pump"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Category">
          <select
            className={inputClass}
            value={category}
            onChange={(e) => setCategory(e.target.value as CostCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Amount">
          <input
            className={`${inputClass} tnum`}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </Field>
      </div>
      {people.length > 0 && (
        <Field label="Paid by (only if a shareholder used their own money)">
          <select
            className={inputClass}
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
          >
            <option value="">Nobody in particular</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
      )}
      {error && <p className="text-[13px]" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      <Button variant="confirm" onClick={submit}>Save cost</Button>
    </div>
  )
}

function AdvanceForm({ people, onSaved }: { people: Person[]; onSaved: () => void }) {
  const [personId, setPersonId] = useState(people[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (people.length === 0) {
    return (
      <p className="text-[13px] text-fg-muted">
        Add someone on the People page first — an advance has to belong to a
        named person.
      </p>
    )
  }

  const submit = async () => {
    const value = parseMoney(amount)
    if (value === null || value <= 0) return setError('Enter a real amount.')
    if (!personId) return setError('Choose who drew it.')

    await addAdvance({
      id: newId('a'),
      at: new Date().toISOString(),
      personId,
      amount: value,
      note: note.trim() || 'Advance',
      origin: 'human',
    })
    onSaved()
  }

  return (
    <div className="space-y-3">
      <Field label="Who">
        <select className={inputClass} value={personId} onChange={(e) => setPersonId(e.target.value)}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Amount">
        <input
          className={`${inputClass} tnum`}
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </Field>
      <Field label="Note (optional)">
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What it was for" />
      </Field>
      {error && <p className="text-[13px]" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      <Button variant="confirm" onClick={submit}>Save advance</Button>
    </div>
  )
}

function SaleForm({ onSaved }: { onSaved: () => void }) {
  const [grams, setGrams] = useState('')
  const [pricePerGram, setPricePerGram] = useState('')
  const [buyer, setBuyer] = useState('')
  const [error, setError] = useState<string | null>(null)

  const g = Number(grams)
  const p = Number(pricePerGram)
  const gross = g > 0 && p > 0 ? Math.round(g * p) : null

  const submit = async () => {
    if (!(g > 0)) return setError('Enter the weight sold.')
    if (!(p > 0)) return setError('Enter the price per gram.')
    if (!buyer.trim()) return setError('Say who bought it.')

    await addLot({
      id: newId('s'),
      at: new Date().toISOString(),
      grams: g,
      pricePerGram: p,
      buyer: buyer.trim(),
      origin: 'human',
    })
    onSaved()
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Grams">
          <input className={`${inputClass} tnum`} inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Price per gram">
          <input className={`${inputClass} tnum`} inputMode="numeric" value={pricePerGram} onChange={(e) => setPricePerGram(e.target.value)} placeholder="0" />
        </Field>
      </div>
      <Field label="Buyer">
        <input className={inputClass} value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Who bought it" />
      </Field>
      {gross !== null && (
        <p className="text-[13px] text-fg-muted">Gross: <span className="tnum">{formatMoney(gross)}</span></p>
      )}
      {error && <p className="text-[13px]" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      <Button variant="confirm" onClick={submit}>Save sale</Button>
    </div>
  )
}

function LevyForm({ onSaved }: { onSaved: () => void }) {
  const [amount, setAmount] = useState('')
  const [paidTo, setPaidTo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const value = parseMoney(amount)
    if (value === null || value <= 0) return setError('Enter a real amount.')

    await addLevy({
      id: newId('v'),
      at: new Date().toISOString(),
      amount: value,
      paidTo: paidTo.trim() || 'Levy',
      origin: 'human',
    })
    onSaved()
  }

  return (
    <div className="space-y-3">
      <Field label="Amount">
        <input className={`${inputClass} tnum`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Paid to (optional)">
        <input className={inputClass} value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="Levy" />
      </Field>
      {error && <p className="text-[13px]" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      <Button variant="confirm" onClick={submit}>Save levy</Button>
    </div>
  )
}
