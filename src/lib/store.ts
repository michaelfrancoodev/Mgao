'use client'

import { useSyncExternalStore } from 'react'
import { db, readAll } from '@/lib/db/schema'
import type {
  Advance, Cost, Financing, Levy, Load, Note, Person, SaleLot,
} from '@/lib/types'

interface Snapshot {
  ready: boolean
  load: Load | null
  people: Person[]
  costs: Cost[]
  advances: Advance[]
  financings: Financing[]
  lots: SaleLot[]
  levies: Levy[]
  notes: Note[]
}

const empty: Snapshot = {
  ready: false, load: null, people: [], costs: [],
  advances: [], financings: [], lots: [], levies: [], notes: [],
}

let snapshot: Snapshot = empty
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

/**
 * Tools call this at execute time, never at registration time.
 *
 * A man is often still talking while the agent is answering. If a tool
 * closed over a snapshot taken when it was registered, it would answer
 * about a load that no longer exists. One line of discipline per tool, and
 * it is the reason the page and the agent never disagree about what is in
 * the book.
 */
export function read(): Snapshot {
  return snapshot
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useLoad(): Snapshot {
  return useSyncExternalStore(subscribe, read, () => empty)
}

export async function refresh() {
  const data = await readAll()
  snapshot = {
    ready: true,
    load: data.load ?? null,
    people: data.people,
    costs: [...data.costs].sort((a, b) => b.at.localeCompare(a.at)),
    advances: [...data.advances].sort((a, b) => b.at.localeCompare(a.at)),
    financings: data.financings,
    lots: [...data.lots].sort((a, b) => b.at.localeCompare(a.at)),
    levies: data.levies,
    notes: [...data.notes].sort((a, b) => b.at.localeCompare(a.at)),
  }
  emit()
}

export async function boot() {
  await refresh()
}

/** Starts a brand new, genuinely empty load. Nothing is pre-filled — a
 *  person names their own load and everything from here is real. */
export async function createLoad(name: string) {
  const load: Load = {
    id: newId('load'),
    name,
    openedAt: new Date().toISOString(),
    status: 'open',
    settledAt: null,
  }
  await db.loads.add(load)
  await refresh()
}

export async function addPerson(person: Person) {
  await db.people.add(person)
  await refresh()
}

// ------------------------------------------------------------------ writes
// Every one of these refreshes afterwards, so the page and any tool reading
// state see the same book within the same tick.

export async function addCost(cost: Cost) {
  await db.costs.add(cost)
  await refresh()
}

export async function addAdvance(advance: Advance) {
  await db.advances.add(advance)
  await refresh()
}

export async function addFinancing(financing: Financing) {
  await db.financings.add(financing)
  await refresh()
}

export async function addLot(lot: SaleLot) {
  await db.lots.add(lot)
  await refresh()
}

export async function addLevy(levy: Levy) {
  await db.levies.add(levy)
  await refresh()
}

export async function addNote(note: Note) {
  await db.notes.add(note)
  await refresh()
}

export async function resolveNote(id: string) {
  await db.notes.update(id, { resolved: true })
  await refresh()
}

export async function updateCost(id: string, patch: Partial<Cost>) {
  await db.costs.update(id, patch)
  await refresh()
}

export async function removeCost(id: string) {
  await db.costs.delete(id)
  await refresh()
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
