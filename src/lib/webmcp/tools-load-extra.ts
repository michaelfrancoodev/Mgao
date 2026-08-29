'use client'

import { addFinancing, addLevy, addLot, newId, read } from '@/lib/store'
import { askUser } from './confirm'
import type { ToolDefinition } from './model-context'
import type { Uncertainty } from '@/lib/types'

/**
 * The three tools that move large, one-off numbers.
 *
 * All three always go past a person, even when every field was heard
 * perfectly. That is not caution for its own sake — a sale sets the gross
 * that every share in the split descends from, financing comes off before
 * anybody is paid, and a levy is money already gone. Getting one of these
 * wrong is not a typo, it is several people being paid the wrong amount
 * weeks later with no way to tell.
 */
export function loadExtraTools(): ToolDefinition[] {
  return [
    {
      name: 'record_sale',
      description:
        'Record a lot of gold sold: grams, price per gram, and who bought it. A load can be sold in several lots on different days.',
      inputSchema: {
        type: 'object',
        properties: {
          grams: { type: 'number', minimum: 0, description: 'Weight sold. Omit if unsure.' },
          gramsHeard: { type: 'array', items: { type: 'number' }, maxItems: 3 },
          pricePerGram: { type: 'number', minimum: 0, description: 'Whole shillings per gram. Omit if unsure.' },
          priceHeard: { type: 'array', items: { type: 'number' }, maxItems: 3 },
          buyer: { type: 'string', maxLength: 60 },
          transcript: { type: 'string', maxLength: 500 },
        },
        required: [],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
      execute: async (input, client) => {
        const uncertainties: Uncertainty[] = []
        const settled: Array<{ label: string; value: string }> = []

        if (typeof input.grams !== 'number') {
          uncertainties.push({
            field: 'grams',
            label: 'How many grams?',
            confidence: 'needs_number',
            heard: (input.gramsHeard as number[] | undefined)?.map(String) ?? [],
          })
        } else {
          settled.push({ label: 'Weight', value: `${input.grams} g` })
        }

        if (typeof input.pricePerGram !== 'number') {
          uncertainties.push({
            field: 'pricePerGram',
            label: 'What price per gram?',
            confidence: 'needs_number',
            heard: (input.priceHeard as number[] | undefined)?.map(String) ?? [],
          })
        } else {
          settled.push({
            label: 'Price per gram',
            value: `${input.pricePerGram.toLocaleString('en-US')}/=`,
          })
        }

        if (input.buyer) settled.push({ label: 'Buyer', value: String(input.buyer) })

        const answer = await client.requestUserInteraction(() =>
          askUser({
            title: 'Gold sold',
            transcript: String(input.transcript ?? ''),
            settled,
            uncertainties,
          }),
        )

        if (!answer.approved) return { saved: false, reason: 'discarded by the person' }

        const grams =
          typeof input.grams === 'number' ? input.grams : Number(answer.answers.grams)
        const pricePerGram =
          typeof input.pricePerGram === 'number'
            ? input.pricePerGram
            : Number(answer.answers.pricePerGram)

        const lot = {
          id: newId('s'),
          at: new Date().toISOString(),
          grams,
          pricePerGram,
          buyer: String(input.buyer ?? 'Buyer'),
          origin: answer.corrected.length > 0 ? ('human' as const) : ('agent' as const),
        }
        await addLot(lot)

        return {
          saved: true,
          id: lot.id,
          gross: Math.round(grams * pricePerGram),
          correctedFields: answer.corrected,
          next: 'The load can now be split. Open the split page to work it through.',
        }
      },
    },

    {
      name: 'record_financing',
      description:
        'Record money fronted against this load, with whatever return was agreed on the day. Returned in full before anyone is paid.',
      inputSchema: {
        type: 'object',
        properties: {
          financierName: { type: 'string', maxLength: 60 },
          principal: { type: 'number', minimum: 0 },
          principalHeard: { type: 'array', items: { type: 'number' }, maxItems: 3 },
          agreedReturn: {
            type: 'number',
            minimum: 0,
            description: 'Agreed on top of the principal. Zero is normal and common.',
          },
          note: { type: 'string', maxLength: 80, description: 'What the money was for.' },
          transcript: { type: 'string', maxLength: 500 },
        },
        required: ['financierName'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
      execute: async (input, client) => {
        const s = read()
        const needle = String(input.financierName).toLowerCase()
        const matches = s.people.filter((p) => p.name.toLowerCase().includes(needle))

        if (matches.length === 0) {
          return {
            saved: false,
            reason: `Nobody called ${input.financierName} is on this load. Add them on the people page first.`,
          }
        }

        const uncertainties: Uncertainty[] = []
        const settled: Array<{ label: string; value: string }> = []

        if (matches.length > 1) {
          uncertainties.push({
            field: 'financierId',
            label: `Which ${input.financierName}?`,
            confidence: 'needs_choice',
            options: matches.map((m) => ({ id: m.id, label: m.name })),
          })
        } else {
          settled.push({ label: 'Financier', value: matches[0].name })
        }

        if (typeof input.principal !== 'number') {
          uncertainties.push({
            field: 'principal',
            label: 'How much was fronted?',
            confidence: 'needs_number',
            heard: (input.principalHeard as number[] | undefined)?.map(String) ?? [],
          })
        } else {
          settled.push({
            label: 'Principal',
            value: `${input.principal.toLocaleString('en-US')}/=`,
          })
        }

        const agreedReturn = Number(input.agreedReturn ?? 0)
        settled.push({
          label: 'Agreed on top',
          value: agreedReturn === 0 ? 'nothing' : `${agreedReturn.toLocaleString('en-US')}/=`,
        })

        const answer = await client.requestUserInteraction(() =>
          askUser({
            title: 'Money fronted against this load',
            transcript: String(input.transcript ?? ''),
            settled,
            uncertainties,
          }),
        )

        if (!answer.approved) return { saved: false, reason: 'discarded by the person' }

        const financing = {
          id: newId('f'),
          at: new Date().toISOString(),
          financierId: answer.answers.financierId ?? matches[0].id,
          principal:
            typeof input.principal === 'number'
              ? input.principal
              : Number(answer.answers.principal),
          agreedReturn,
          note: String(input.note ?? ''),
          origin: answer.corrected.length > 0 ? ('human' as const) : ('agent' as const),
        }
        await addFinancing(financing)

        return { saved: true, id: financing.id, correctedFields: answer.corrected }
      },
    },

    {
      name: 'record_levy',
      description:
        'Record a levy paid on this load. It comes off the gross before anything else, whatever the load turns out to be worth.',
      inputSchema: {
        type: 'object',
        properties: {
          amount: { type: 'number', minimum: 0 },
          amountHeard: { type: 'array', items: { type: 'number' }, maxItems: 3 },
          paidTo: { type: 'string', maxLength: 60 },
          transcript: { type: 'string', maxLength: 500 },
        },
        required: [],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
      execute: async (input, client) => {
        const uncertainties: Uncertainty[] = []
        const settled: Array<{ label: string; value: string }> = []

        if (typeof input.amount !== 'number') {
          uncertainties.push({
            field: 'amount',
            label: 'How much was the levy?',
            confidence: 'needs_number',
            heard: (input.amountHeard as number[] | undefined)?.map(String) ?? [],
          })
        } else {
          settled.push({ label: 'Amount', value: `${input.amount.toLocaleString('en-US')}/=` })
        }

        settled.push({ label: 'Paid to', value: String(input.paidTo ?? 'Levy') })

        const answer = await client.requestUserInteraction(() =>
          askUser({
            title: 'Levy',
            transcript: String(input.transcript ?? ''),
            settled,
            uncertainties,
          }),
        )

        if (!answer.approved) return { saved: false, reason: 'discarded by the person' }

        const levy = {
          id: newId('v'),
          at: new Date().toISOString(),
          amount:
            typeof input.amount === 'number' ? input.amount : Number(answer.answers.amount),
          paidTo: String(input.paidTo ?? 'Levy'),
          origin: answer.corrected.length > 0 ? ('human' as const) : ('agent' as const),
        }
        await addLevy(levy)

        return { saved: true, id: levy.id, correctedFields: answer.corrected }
      },
    },
  ]
}
