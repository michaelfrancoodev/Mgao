import { describe, expect, it } from 'vitest'
import { computeSplit, type SplitInput } from './engine'

const people = [
  { id: 'p1', name: 'Juma', phone: null, shareholder: true },
  { id: 'p2', name: 'Msafiri Chacha', phone: null, shareholder: true },
  { id: 'p3', name: 'Baraka', phone: null, shareholder: true },
  { id: 'p4', name: 'Selemani', phone: null, shareholder: true },
  { id: 'p5', name: 'Mzee Kulwa', phone: null, shareholder: false }, // financier
]

function base(): SplitInput {
  return {
    people,
    lots: [
      {
        id: 's1',
        at: '2026-08-26T10:00:00Z',
        grams: 14,
        pricePerGram: 180_000,
        buyer: 'Geita buyer',
        origin: 'human',
      },
    ],
    levies: [
      { id: 'v1', at: '2026-08-26T11:00:00Z', amount: 120_000, paidTo: 'Levy', origin: 'human' },
    ],
    financings: [
      {
        id: 'f1',
        at: '2026-08-10T08:00:00Z',
        financierId: 'p5',
        principal: 400_000,
        agreedReturn: 0,
        note: 'milling',
        origin: 'human',
      },
    ],
    costs: [
      { id: 'c1', at: '', category: 'milling',   amount: 45_000, description: 'Mill',      paidById: null, method: 'cash', origin: 'agent' },
      { id: 'c2', at: '', category: 'fuel',      amount: 30_000, description: 'Diesel',    paidById: null, method: 'cash', origin: 'agent' },
      { id: 'c3', at: '', category: 'food',      amount: 12_000, description: 'Food',      paidById: 'p1', method: 'cash', origin: 'agent' },
      { id: 'c4', at: '', category: 'transport', amount: 25_000, description: 'Transport', paidById: null, method: 'cash', origin: 'human' },
      { id: 'c5', at: '', category: 'repair',    amount: 18_000, description: 'Pump part', paidById: null, method: 'cash', origin: 'human' },
    ],
    advances: [
      { id: 'a1', at: '', personId: 'p2', amount: 50_000, note: 'Advance', origin: 'human' },
      { id: 'a2', at: '', personId: 'p3', amount: 15_000, note: 'Advance', origin: 'human' },
    ],
  }
}

describe('computeSplit', () => {
  it('works the six steps in order', () => {
    const r = computeSplit(base())

    expect(r.gross).toBe(2_520_000)      // 14 × 180,000
    expect(r.levy).toBe(120_000)
    expect(r.financing).toBe(400_000)
    expect(r.costsTotal).toBe(130_000)   // 45 + 30 + 12 + 25 + 18
    expect(r.remainder).toBe(1_870_000)
    expect(r.shortfall).toBe(false)
  })

  it('divides the remainder equally between shareholders only', () => {
    const r = computeSplit(base())
    expect(r.shareholderCount).toBe(4)   // the financier is not one
    for (const s of r.shares) expect(s.equalShare).toBe(467_500)
  })

  it('pays a man back for what he bought out of his own pocket', () => {
    const r = computeSplit(base())
    const juma = r.shares.find((s) => s.name === 'Juma')!
    expect(juma.reimbursed).toBe(12_000)
    expect(juma.takeHome).toBe(479_500)  // 467,500 + 12,000
  })

  it('takes each advance off that man and nobody else', () => {
    const r = computeSplit(base())
    const msafiri = r.shares.find((s) => s.name === 'Msafiri Chacha')!
    const selemani = r.shares.find((s) => s.name === 'Selemani')!

    expect(msafiri.takeHome).toBe(417_500)  // 467,500 − 50,000
    expect(selemani.takeHome).toBe(467_500) // untouched by anyone else's advance
  })

  it('never loses a shilling to rounding', () => {
    const input = base()
    input.lots[0].pricePerGram = 180_001 // makes the remainder indivisible by 4

    const r = computeSplit(input)
    expect(r.unevenDivision).toBe(true)

    const shareSum = r.shares.reduce((t, s) => t + s.equalShare, 0)
    expect(shareSum).toBe(r.remainder) // to the shilling
  })

  it('handles a load that did not cover its costs', () => {
    const input = base()
    input.lots[0].grams = 3 // small gross against the same obligations

    const r = computeSplit(input)
    expect(r.shortfall).toBe(true)
    expect(r.remainder).toBeLessThan(0)

    const shareSum = r.shares.reduce((t, s) => t + s.equalShare, 0)
    expect(shareSum).toBe(r.remainder)
  })

  it('flags a man who drew more than his share was worth', () => {
    const input = base()
    input.advances.push({
      id: 'a3', at: '', personId: 'p4', amount: 600_000, note: 'Advance', origin: 'human',
    })

    const r = computeSplit(input)
    const selemani = r.shares.find((s) => s.name === 'Selemani')!
    expect(selemani.owesBack).toBe(true)
    expect(selemani.takeHome).toBeLessThan(0)
  })

  it('lists every lot separately when a load sells in parts', () => {
    const input = base()
    input.lots.push({
      id: 's2', at: '', grams: 6, pricePerGram: 175_000, buyer: 'Second buyer', origin: 'human',
    })

    const r = computeSplit(input)
    expect(r.lots).toHaveLength(2)
    expect(r.gross).toBe(2_520_000 + 1_050_000)
  })

  it('handles a load with no shareholders without dividing by zero', () => {
    const input = base()
    input.people = input.people.map((p) => ({ ...p, shareholder: false }))

    const r = computeSplit(input)
    expect(r.shareholderCount).toBe(0)
    expect(r.shares).toHaveLength(0)
  })
})
