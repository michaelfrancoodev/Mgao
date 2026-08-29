import { db } from './schema'
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
 * The load a visitor walks into: three weeks old, sixteen costs in, two men
 * already drawn advances, gold not yet sold.
 *
 * Deliberately not tidy. There are two men called Msafiri, because that is
 * how the name-resolution question happens honestly rather than being
 * staged. One cost has no payer recorded. One note was never resolved. A
 * clean seed would make the app look like it has nothing to do.
 */

const LOAD_ID = 'load-2026-08'

const people: Person[] = [
  { id: 'p1', name: 'Juma Masanja',        phone: '0754 118 402', shareholder: true },
  { id: 'p2', name: 'Msafiri Chacha',      phone: '0742 551 083', shareholder: true },
  { id: 'p3', name: 'Baraka Elias',        phone: '0765 330 118', shareholder: true },
  { id: 'p4', name: 'Selemani Ndaki',      phone: '0713 907 655', shareholder: true },
  // Same first name as p2. This is why record_advance has to ask instead of
  // guessing, and it is the moment the demo turns on.
  { id: 'p5', name: 'Msafiri Ng\u2019wanza', phone: '0788 214 019', shareholder: false },
  { id: 'p6', name: 'Mzee Kulwa',          phone: '0754 660 231', shareholder: false },
]

const load: Load = {
  id: LOAD_ID,
  name: 'Load 12 — Nyamalembo',
  openedAt: '2026-08-06T06:30:00+03:00',
  status: 'open',
  settledAt: null,
}

const financings: Financing[] = [
  {
    id: 'f1',
    at: '2026-08-06T09:15:00+03:00',
    financierId: 'p6',
    principal: 400_000,
    agreedReturn: 60_000,
    note: 'milling and first fuel',
    origin: 'human',
  },
]

const costs: Cost[] = [
  { id: 'c01', at: '2026-08-07T11:20:00+03:00', category: 'transport', amount: 25_000, description: 'Ore to mill',          paidById: null, method: 'cash',  origin: 'human' },
  { id: 'c02', at: '2026-08-07T16:05:00+03:00', category: 'food',      amount: 12_000, description: 'Food for the gang',    paidById: 'p1', method: 'cash',  origin: 'agent' },
  { id: 'c03', at: '2026-08-08T08:40:00+03:00', category: 'fuel',      amount: 30_000, description: 'Diesel for pump',      paidById: null, method: 'cash',  origin: 'agent' },
  { id: 'c04', at: '2026-08-09T10:10:00+03:00', category: 'milling',   amount: 45_000, description: 'Milling',              paidById: null, method: 'mpesa', origin: 'agent' },
  { id: 'c05', at: '2026-08-10T13:55:00+03:00', category: 'food',      amount: 9_000,  description: 'Food',                 paidById: 'p1', method: 'cash',  origin: 'agent' },
  { id: 'c06', at: '2026-08-11T09:00:00+03:00', category: 'repair',    amount: 18_000, description: 'Pump seal',            paidById: null, method: 'cash',  origin: 'human' },
  { id: 'c07', at: '2026-08-12T17:30:00+03:00', category: 'fuel',      amount: 28_000, description: 'Diesel',               paidById: null, method: 'cash',  origin: 'agent' },
  { id: 'c08', at: '2026-08-13T12:15:00+03:00', category: 'labour',    amount: 40_000, description: 'Two extra hands',      paidById: null, method: 'cash',  origin: 'human' },
  { id: 'c09', at: '2026-08-14T08:20:00+03:00', category: 'food',      amount: 11_000, description: 'Food',                 paidById: 'p3', method: 'cash',  origin: 'agent' },
  { id: 'c10', at: '2026-08-15T15:45:00+03:00', category: 'transport', amount: 15_000, description: 'Boda, spare part',     paidById: null, method: 'cash',  origin: 'agent' },
  { id: 'c11', at: '2026-08-17T10:30:00+03:00', category: 'milling',   amount: 45_000, description: 'Milling, second run',  paidById: null, method: 'mpesa', origin: 'agent' },
  { id: 'c12', at: '2026-08-18T14:00:00+03:00', category: 'fuel',      amount: 30_000, description: 'Diesel',               paidById: null, method: 'cash',  origin: 'agent' },
  { id: 'c13', at: '2026-08-20T09:50:00+03:00', category: 'food',      amount: 12_000, description: 'Food',                 paidById: 'p1', method: 'cash',  origin: 'agent' },
  { id: 'c14', at: '2026-08-21T16:20:00+03:00', category: 'repair',    amount: 22_000, description: 'Generator belt',       paidById: null, method: 'cash',  origin: 'human' },
  // Nobody wrote down who paid. The Load page flags it in orange rather than
  // quietly assuming, because assuming is how a man loses 8,000 shillings.
  { id: 'c15', at: '2026-08-23T11:05:00+03:00', category: 'other',     amount: 8_000,  description: 'Water',                paidById: null, method: 'cash',  origin: 'agent' },
  { id: 'c16', at: '2026-08-25T13:40:00+03:00', category: 'transport', amount: 20_000, description: 'Concentrate to buyer', paidById: null, method: 'cash',  origin: 'human' },
]

const advances: Advance[] = [
  { id: 'a1', at: '2026-08-12T18:00:00+03:00', personId: 'p2', amount: 50_000, note: 'Advance — hospital', origin: 'human' },
  { id: 'a2', at: '2026-08-19T07:45:00+03:00', personId: 'p3', amount: 15_000, note: 'Advance',            origin: 'agent' },
]

const levies: Levy[] = [
  { id: 'v1', at: '2026-08-24T10:00:00+03:00', amount: 120_000, paidTo: 'Levy', origin: 'human' },
]

// Not sold yet. The demo ends by recording the sale and running the split.
const lots: SaleLot[] = []

const notes: Note[] = [
  {
    id: 'n1',
    at: '2026-08-16T19:20:00+03:00',
    text: 'Yule wa kwenye mill anasema tumbaki na deni la wiki iliyopita, angalia',
    origin: 'agent',
    resolved: false,
  },
]

export async function seedIfEmpty() {
  const existing = await db.loads.count()
  if (existing > 0) return

  await db.transaction(
    'rw',
    [db.loads, db.people, db.costs, db.advances, db.financings, db.lots, db.levies, db.notes],
    async () => {
      await db.loads.add(load)
      await db.people.bulkAdd(people)
      await db.costs.bulkAdd(costs)
      await db.advances.bulkAdd(advances)
      await db.financings.bulkAdd(financings)
      await db.lots.bulkAdd(lots)
      await db.levies.bulkAdd(levies)
      await db.notes.bulkAdd(notes)
    },
  )
}

/** Anyone exploring for ten minutes needs one click back to the start. */
export async function resetToSeed() {
  await db.delete()
  await db.open()
  await seedIfEmpty()
}
