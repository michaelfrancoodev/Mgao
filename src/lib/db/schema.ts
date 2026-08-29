import Dexie, { type Table } from 'dexie'
import type {
  Advance,
  Cost,
  Financing,
  Levy,
  Load,
  Note,
  Person,
  SaleLot,
} from '@/lib/types'

/**
 * One database, one open load at a time.
 *
 * There is no multi-load model on purpose. A man works one load, settles it,
 * and starts the next. Building for ten simultaneous loads would add a
 * selector to every screen for a case that does not happen.
 */
class MgaoDB extends Dexie {
  loads!: Table<Load, string>
  people!: Table<Person, string>
  costs!: Table<Cost, string>
  advances!: Table<Advance, string>
  financings!: Table<Financing, string>
  lots!: Table<SaleLot, string>
  levies!: Table<Levy, string>
  notes!: Table<Note, string>

  constructor() {
    super('mgao')
    this.version(1).stores({
      loads: 'id, status',
      people: 'id, name, shareholder',
      costs: 'id, at, category, paidById',
      advances: 'id, at, personId',
      financings: 'id, at, financierId',
      lots: 'id, at',
      levies: 'id, at',
      notes: 'id, at, resolved',
    })
  }
}

export const db = new MgaoDB()

/** Everything on screen at once. A load is small enough to hold in memory —
 *  a few dozen rows — so there is no pagination anywhere in this app. */
export async function readAll() {
  const [load, people, costs, advances, financings, lots, levies, notes] =
    await Promise.all([
      db.loads.where('status').equals('open').first(),
      db.people.toArray(),
      db.costs.toArray(),
      db.advances.toArray(),
      db.financings.toArray(),
      db.lots.toArray(),
      db.levies.toArray(),
      db.notes.toArray(),
    ])

  return { load, people, costs, advances, financings, lots, levies, notes }
}
