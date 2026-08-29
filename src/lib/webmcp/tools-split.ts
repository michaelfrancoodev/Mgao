'use client'

import { computeSplit } from '@/lib/split/engine'
import { formatMoney } from '@/lib/money'
import { read } from '@/lib/store'
import type { ToolDefinition } from './model-context'

/**
 * Split page tools. Both are read-only, deliberately.
 *
 * Looking at a division must never perform one. Settling is irreversible and
 * belongs to a person pressing a button on the page, not to a tool call an
 * agent can make while explaining something.
 */
export function splitTools(): ToolDefinition[] {
  return [
    {
      name: 'preview_split',
      description:
        'Work the six steps of the division and return the result without changing anything: gross, levy, financing, every cost, the equal share, and each person after their advances.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => {
        const s = read()
        if (s.lots.length === 0) {
          return { ready: false, reason: 'The load has not been sold yet, so there is nothing to divide.' }
        }

        const r = computeSplit({
          people: s.people,
          lots: s.lots,
          levies: s.levies,
          financings: s.financings,
          costs: s.costs,
          advances: s.advances,
        })

        return {
          ready: true,
          steps: {
            gross: r.gross,
            lessLevy: r.levy,
            lessFinancing: r.financing,
            lessCosts: r.costsTotal,
            remainder: r.remainder,
            equalShare: r.shares[0]?.equalShare ?? 0,
          },
          shareholders: r.shareholderCount,
          unevenDivision: r.unevenDivision,
          shortfall: r.shortfall,
          people: r.shares.map((p) => ({
            name: p.name,
            equalShare: p.equalShare,
            paidBackForCosts: p.reimbursed,
            advancesTaken: p.advanced,
            takeHome: p.takeHome,
            owesBack: p.owesBack,
          })),
        }
      },
    },

    {
      name: 'explain_share',
      description:
        "Explain one person's number in plain language: their equal share, anything they are owed back for costs they paid, what they drew early, and what is left. Meant to be read aloud to someone who cannot read the table.",
      inputSchema: {
        type: 'object',
        properties: { personName: { type: 'string', maxLength: 60 } },
        required: ['personName'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const s = read()
        if (s.lots.length === 0) {
          return { found: false, reason: 'The load has not been sold yet.' }
        }

        const r = computeSplit({
          people: s.people,
          lots: s.lots,
          levies: s.levies,
          financings: s.financings,
          costs: s.costs,
          advances: s.advances,
        })

        const needle = String(input.personName).toLowerCase()
        const matches = r.shares.filter((p) => p.name.toLowerCase().includes(needle))

        if (matches.length === 0) {
          return { found: false, reason: `${input.personName} does not hold a share in this load.` }
        }
        if (matches.length > 1) {
          return {
            found: false,
            ambiguous: matches.map((m) => m.name),
            reason: 'More than one person matches that name. Ask which.',
          }
        }

        const p = matches[0]

        // Written as sentences on purpose. This gets spoken to a person
        // standing in front of whoever is dividing the money, and a list of
        // key-value pairs read aloud is not an answer to anybody.
        const lines: string[] = [
          `The load sold for ${formatMoney(r.gross)} in total.`,
          `After the levy, the money that was fronted, and all ${r.costs.length} costs, ${formatMoney(r.remainder)} was left.`,
          `That was divided equally between ${r.shareholderCount} people, so each share is ${formatMoney(p.equalShare)}.`,
        ]

        if (p.reimbursed > 0) {
          const items = p.reimbursements.map((c) => `${c.label} ${formatMoney(c.amount)}`).join(', ')
          lines.push(`${p.name} paid for ${items} out of their own pocket, so ${formatMoney(p.reimbursed)} comes back to them.`)
        }

        if (p.advanced > 0) {
          const items = p.advances.map((a) => formatMoney(a.amount)).join(' and ')
          lines.push(`They drew ${items} early, and that comes off their own share, not off anybody else's.`)
        }

        lines.push(
          p.owesBack
            ? `They drew more than their share turned out to be worth, so they owe ${formatMoney(Math.abs(p.takeHome))} back.`
            : `They take home ${formatMoney(p.takeHome)}.`,
        )

        if (r.unevenDivision) {
          lines.push('The remainder did not divide evenly, so the odd shillings were handed out one at a time.')
        }

        return { found: true, name: p.name, takeHome: p.takeHome, explanation: lines }
      },
    },
  ]
}
