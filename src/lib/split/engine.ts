import { divideEvenly, type Shillings } from '@/lib/money'
import type {
  Advance,
  Cost,
  Financing,
  Levy,
  Person,
  SaleLot,
} from '@/lib/types'

export interface SplitInput {
  people: Person[]
  lots: SaleLot[]
  levies: Levy[]
  financings: Financing[]
  costs: Cost[]
  advances: Advance[]
}

export interface LineItem {
  id: string
  label: string
  amount: Shillings
}

export interface PersonShare {
  personId: string
  name: string
  /** Their cut of the remainder, before anything personal is applied. */
  equalShare: Shillings
  /** Costs they paid out of their own pocket, returned to them. */
  reimbursed: Shillings
  reimbursements: LineItem[]
  /** Advances they drew early, taken off their own line and nobody else's. */
  advanced: Shillings
  advances: LineItem[]
  /** equalShare + reimbursed − advanced. Can be negative; see owesBack. */
  takeHome: Shillings
  /** True when they drew more early than their share turned out to be worth. */
  owesBack: boolean
}

export interface SplitResult {
  gross: Shillings
  lots: LineItem[]

  levy: Shillings
  levies: LineItem[]

  financing: Shillings
  financings: LineItem[]

  costsTotal: Shillings
  costs: LineItem[]

  /** gross − levy − financing − costs. Negative means the load lost money. */
  remainder: Shillings
  shortfall: boolean

  shareholderCount: number
  /** True when the remainder did not divide evenly and odd shillings were
   *  handed out one at a time. The screen says so rather than hiding it. */
  unevenDivision: boolean

  shares: PersonShare[]

  /** Every payout added together. Must equal remainder + total reimbursed
   *  minus total advanced. Checked in tests and asserted at the end of this
   *  function. */
  totalPaidOut: Shillings
}

/**
 * The six steps, in the order they happen at a real payout.
 *
 *   1. Gross          grams × price, every lot listed on its own
 *   2. Less levy      paid whatever the load turned out to be worth
 *   3. Less financing principal plus whatever was agreed on the day
 *   4. Less costs     every cost by name, never as one lump
 *   5. Divide equally the remainder, between shareholders only
 *   6. Advances       off each person's own line, not out of the pot
 *
 * Two things this deliberately does not do.
 *
 * It takes no owner's percentage. Nobody is paid for holding the ground —
 * the levy is the only thing that comes off before the work does.
 *
 * And it never rounds silently. Odd shillings are handed out one at a time
 * and the result says it happened, because the whole point of this screen is
 * that a man who thinks he was short-changed can check.
 *
 * Nothing here is inferred, estimated, or asked of a language model. The
 * agent's job is to get a cost into the book on the day it happened. This is
 * the ledger's job.
 */
export function computeSplit(input: SplitInput): SplitResult {
  const { people, lots, levies, financings, costs, advances } = input

  // ---- 1. gross ---------------------------------------------------------
  const lotLines: LineItem[] = lots.map((l) => ({
    id: l.id,
    label: `${l.grams} g × ${l.pricePerGram.toLocaleString('en-US')} — ${l.buyer}`,
    amount: Math.round(l.grams * l.pricePerGram),
  }))
  const gross = sum(lotLines)

  // ---- 2. levy ------------------------------------------------------------
  const levyLines: LineItem[] = levies.map((v) => ({
    id: v.id,
    label: v.paidTo,
    amount: v.amount,
  }))
  const levy = sum(levyLines)

  // ---- 3. financing -------------------------------------------------------
  const financingLines: LineItem[] = financings.map((f) => ({
    id: f.id,
    label: nameOf(people, f.financierId) + (f.note ? ` — ${f.note}` : ''),
    amount: f.principal + f.agreedReturn,
  }))
  const financing = sum(financingLines)

  // ---- 4. costs -------------------------------------------------------------
  const costLines: LineItem[] = costs.map((c) => ({
    id: c.id,
    label: c.description || c.category,
    amount: c.amount,
  }))
  const costsTotal = sum(costLines)

  // ---- 5. divide equally ---------------------------------------------------
  const remainder = gross - levy - financing - costsTotal
  const shareholders = people.filter((p) => p.shareholder)
  const n = shareholders.length

  const equalShares = divideEvenly(remainder, n)
  const unevenDivision = n > 0 && remainder % n !== 0

  // ---- 6. personal lines ----------------------------------------------------
  const shares: PersonShare[] = shareholders.map((person, i) => {
    // A cost paid from a shareholder's own pocket has already come off the
    // gross in step 4, so the money has to find its way back to them here.
    // Otherwise they have quietly funded the group.
    const reimbursements: LineItem[] = costs
      .filter((c) => c.paidById === person.id)
      .map((c) => ({
        id: c.id,
        label: c.description || c.category,
        amount: c.amount,
      }))

    const personAdvances: LineItem[] = advances
      .filter((a) => a.personId === person.id)
      .map((a) => ({
        id: a.id,
        label: a.note || 'Advance',
        amount: a.amount,
      }))

    const equalShare = equalShares[i] ?? 0
    const reimbursed = sum(reimbursements)
    const advanced = sum(personAdvances)
    const takeHome = equalShare + reimbursed - advanced

    return {
      personId: person.id,
      name: person.name,
      equalShare,
      reimbursed,
      reimbursements,
      advanced,
      advances: personAdvances,
      takeHome,
      owesBack: takeHome < 0,
    }
  })

  const totalPaidOut = shares.reduce((t, s) => t + s.takeHome, 0)

  // The books must balance exactly. If this ever fires it is a bug in this
  // file, not in the data, and it should crash here rather than show
  // several people a set of numbers that do not add up.
  const expected =
    remainder +
    shares.reduce((t, s) => t + s.reimbursed, 0) -
    shares.reduce((t, s) => t + s.advanced, 0)
  if (n > 0 && totalPaidOut !== expected) {
    throw new Error(
      `split does not balance: paid out ${totalPaidOut}, expected ${expected}`,
    )
  }

  return {
    gross,
    lots: lotLines,
    levy,
    levies: levyLines,
    financing,
    financings: financingLines,
    costsTotal,
    costs: costLines,
    remainder,
    shortfall: remainder < 0,
    shareholderCount: n,
    unevenDivision,
    shares,
    totalPaidOut,
  }
}

function sum(items: LineItem[]): Shillings {
  return items.reduce((t, i) => t + i.amount, 0)
}

function nameOf(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.name ?? 'Unknown'
}
