'use client'

import { db } from '@/lib/db/schema'
import { newId, read, refresh } from '@/lib/store'
import { askUser } from './confirm'
import type { ToolDefinition } from './model-context'

export function peopleTools(): ToolDefinition[] {
  return [
    {
      name: 'get_person',
      description:
        'One person on this load: whether they hold a share, what they have drawn in advances, and any costs they paid from their own pocket.',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string', maxLength: 60 } },
        required: ['name'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const s = read()
        const needle = String(input.name).toLowerCase()
        const matches = s.people.filter((p) => p.name.toLowerCase().includes(needle))

        if (matches.length === 0) return { found: false }
        if (matches.length > 1) {
          return { found: false, ambiguous: matches.map((m) => m.name) }
        }

        const p = matches[0]
        const advances = s.advances.filter((a) => a.personId === p.id)
        const paid = s.costs.filter((c) => c.paidById === p.id)

        return {
          found: true,
          name: p.name,
          shareholder: p.shareholder,
          advancesDrawn: advances.reduce((t, a) => t + a.amount, 0),
          advanceCount: advances.length,
          paidFromOwnPocket: paid.reduce((t, c) => t + c.amount, 0),
          costsPaid: paid.map((c) => ({ what: c.description, amount: c.amount, at: c.at })),
        }
      },
    },

    {
      name: 'add_person',
      description:
        'Add somebody to this load. Always confirmed, because adding a shareholder changes what everyone else is paid.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 60 },
          shareholder: { type: 'boolean', description: 'True if they hold a share in this load.' },
          phone: { type: 'string', maxLength: 20 },
          transcript: { type: 'string', maxLength: 500 },
        },
        required: ['name'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
      execute: async (input, client) => {
        const s = read()
        const shareholders = s.people.filter((p) => p.shareholder).length
        const asShareholder = input.shareholder !== false

        // A new shareholder makes every existing share smaller. Nobody
        // should discover that after the fact, so it is spelled out here
        // rather than tucked into a success message.
        const settled = [
          { label: 'Name', value: String(input.name) },
          { label: 'Holds a share', value: asShareholder ? 'yes' : 'no' },
        ]
        if (asShareholder) {
          settled.push({
            label: 'Effect',
            value: `${shareholders} shares becomes ${shareholders + 1}`,
          })
        }

        const answer = await client.requestUserInteraction(() =>
          askUser({
            title: 'Add to this load',
            transcript: String(input.transcript ?? ''),
            settled,
            uncertainties: [],
          }),
        )

        if (!answer.approved) return { added: false, reason: 'discarded by the person' }

        const person = {
          id: newId('p'),
          name: String(input.name),
          phone: (input.phone as string) ?? null,
          shareholder: asShareholder,
        }
        await db.people.add(person)
        await refresh()

        return { added: true, id: person.id, shareholdersNow: shareholders + (asShareholder ? 1 : 0) }
      },
    },
  ]
}
