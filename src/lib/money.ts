/**
 * Tanzanian shillings have no subunit in practice. Every amount in this app
 * is a whole number of shillings, stored as an integer, and never a float.
 *
 * This is not fussiness. The split divides one number between several people
 * and the parts have to add back up to the whole. Floats do not guarantee
 * that, and a ledger that is off by one shilling is a ledger somebody argues
 * about — which is the exact thing this app exists to stop.
 */
export type Shillings = number

export function formatMoney(value: Shillings): string {
  const sign = value < 0 ? '-' : ''
  return `${sign}${Math.abs(Math.round(value)).toLocaleString('en-US')}/=`
}

/** Accepts "45,000", "45000/=", "45 000". Returns null if it is not a number. */
export function parseMoney(input: string): Shillings | null {
  const cleaned = input.replace(/[,\s/=]/g, '')
  if (!/^-?\d+$/.test(cleaned)) return null
  return Number(cleaned)
}

export function formatGrams(value: number): string {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} g`
}

/**
 * Divide an amount between n people so the parts always sum back to the
 * original, to the shilling.
 *
 * 1,870,000 between 4 is clean. 1,870,001 is not, and somebody has to get the
 * extra shilling. Rather than let it vanish into rounding, the remainder is
 * handed out one shilling at a time in a fixed order, and the split screen
 * says so out loud. Silent rounding is how ledgers lose trust.
 */
export function divideEvenly(total: Shillings, parts: number): Shillings[] {
  if (parts <= 0) return []
  const base = Math.trunc(total / parts)
  let remainder = total - base * parts // keeps its sign for a loss
  const step = remainder >= 0 ? 1 : -1

  const out = new Array<Shillings>(parts).fill(base)
  for (let i = 0; remainder !== 0; i = (i + 1) % parts) {
    out[i] += step
    remainder -= step
  }
  return out
}
