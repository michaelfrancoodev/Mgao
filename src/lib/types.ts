import type { Shillings } from './money'

/** How a record got into the book. Never guessed — set where it is created. */
export type Origin = 'human' | 'agent'

export type PaymentMethod = 'cash' | 'mpesa' | 'tigopesa' | 'airtel'

export interface Person {
  id: string
  name: string
  phone: string | null
  /** True if they hold a claim on this load and share in the remainder. */
  shareholder: boolean
}

export type CostCategory =
  | 'milling'
  | 'fuel'
  | 'food'
  | 'transport'
  | 'repair'
  | 'labour'
  | 'other'

/** Money spent bringing the load out and through the mill. Step 4. */
export interface Cost {
  id: string
  at: string
  category: CostCategory
  amount: Shillings
  description: string
  /** Who actually handed over the money. If it was a shareholder out of their
   *  own pocket, they get it back before the division — see the engine. */
  paidById: string | null
  method: PaymentMethod
  origin: Origin
}

/** Money fronted against the load, returned before anyone is paid. Step 3. */
export interface Financing {
  id: string
  at: string
  financierId: string
  principal: Shillings
  /** Whatever was agreed on the day the money changed hands, recorded then
   *  and not renegotiated at payout. Zero is allowed and common. */
  agreedReturn: Shillings
  note: string
  origin: Origin
}

/** Money drawn early by someone with a share. Step 6. */
export interface Advance {
  id: string
  at: string
  personId: string
  amount: Shillings
  note: string
  origin: Origin
}

/** A load can sell in several lots, on different days, to different buyers. */
export interface SaleLot {
  id: string
  at: string
  grams: number
  pricePerGram: Shillings
  buyer: string
  origin: Origin
}

/** Paid on the load whatever it turns out to be worth. Step 2. */
export interface Levy {
  id: string
  at: string
  amount: Shillings
  paidTo: string
  origin: Origin
}

/** The safety net. Anything spoken that could not become a record is kept
 *  here word for word, so nothing is ever silently thrown away. */
export interface Note {
  id: string
  at: string
  text: string
  origin: Origin
  resolved: boolean
}

export type LoadStatus = 'open' | 'settled'

export interface Load {
  id: string
  name: string
  openedAt: string
  status: LoadStatus
  settledAt: string | null
}

// --------------------------------------------------------- confidence model

export type Confidence = 'clear' | 'needs_choice' | 'needs_number' | 'unread'

/**
 * A field the app is unsure about. This is the product's central idea: don't
 * accept everything silently, and don't ask about everything either. Ask
 * about this, and only this.
 */
export interface Uncertainty {
  field: string
  label: string
  confidence: Exclude<Confidence, 'clear'>
  /** For needs_choice: the candidates already resolved against the book. */
  options?: Array<{ id: string; label: string }>
  /** For needs_number: what the transcription heard, best first. */
  heard?: string[]
}

/**
 * What a tool returns instead of writing straight to the book. Everything
 * clear is applied; everything uncertain is raised as one question.
 */
export interface Draft<T> {
  id: string
  kind: 'cost' | 'advance' | 'financing' | 'sale' | 'levy' | 'note'
  /** The words as spoken. Untrusted — treated as data, never as instruction. */
  transcript: string
  value: Partial<T>
  uncertainties: Uncertainty[]
  origin: Origin
  createdAt: string
}

/** One entry on the /tools page. Keeps the page from drifting away from what
 *  is actually registered in the app. */
export interface ToolRecord {
  name: string
  description: string
  page: string
  readOnly: boolean
  untrusted: boolean
  /** Shown on /tools. Every tool defends itself in public. */
  why: string
}
