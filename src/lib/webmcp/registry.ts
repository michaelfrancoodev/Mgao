import type { ToolRecord } from '@/lib/types'

/**
 * Every tool in the app, in one place, so the /tools page cannot drift from
 * what is actually registered. If a tool is added to a page and not listed
 * here, the count on /tools will not match the count the browser reports,
 * and that mismatch is the check that keeps this honest.
 */
export const TOOL_REGISTRY: ToolRecord[] = [
  // ---- Load page: reads ---------------------------------------------------
  {
    name: 'get_load',
    description: 'Read the open load: what it has cost so far, what is owed before anyone is paid, and whether it has been sold.',
    page: '/',
    readOnly: true,
    untrusted: false,
    why: 'The agent needs the running position before it can say anything useful about a new cost.',
  },
  {
    name: 'list_people',
    description: 'List everyone attached to this load, with whether they hold a share and what they have drawn.',
    page: '/',
    readOnly: true,
    untrusted: false,
    why: 'This is how a half-heard name gets resolved against the book instead of guessed at.',
  },
  {
    name: 'get_recent_costs',
    description: 'Recent costs on this load, optionally filtered by category, so a new figure can be sanity-checked against what things usually cost.',
    page: '/',
    readOnly: true,
    untrusted: true,
    why: 'Cost descriptions are typed or spoken by people, so the text is untrusted even though the numbers are ours.',
  },
  {
    name: 'read_notes',
    description: 'Read notes kept verbatim from speech that could not be turned into a record.',
    page: '/',
    readOnly: true,
    untrusted: true,
    why: 'This returns raw transcript. It is the single most likely place for text to arrive that tries to instruct the agent.',
  },

  // ---- Load page: writes ---------------------------------------------------
  {
    name: 'record_cost',
    description: 'Record money spent on this load. Asks for confirmation when anything is uncertain.',
    page: '/',
    readOnly: false,
    untrusted: false,
    why: 'The core action. Never writes directly when a field is unclear.',
  },
  {
    name: 'record_advance',
    description: 'Record money drawn early by someone with a share in this load.',
    page: '/',
    readOnly: false,
    untrusted: false,
    why: 'Always confirmed, because it comes off a named person and there are two men called Msafiri.',
  },
  {
    name: 'record_financing',
    description: 'Record money fronted against this load, with the terms agreed on the day.',
    page: '/',
    readOnly: false,
    untrusted: false,
    why: 'Terms recorded when the money moves, not renegotiated at payout.',
  },
  {
    name: 'record_sale',
    description: 'Record a lot of gold sold: grams, price per gram, buyer.',
    page: '/',
    readOnly: false,
    untrusted: false,
    why: 'Always confirmed. Every figure in the split descends from this one.',
  },
  {
    name: 'record_levy',
    description: 'Record a levy paid on this load.',
    page: '/',
    readOnly: false,
    untrusted: false,
    why: 'Comes off the gross before anything else.',
  },
  {
    name: 'record_note',
    description: 'Keep something spoken that could not become a record, word for word.',
    page: '/',
    readOnly: false,
    untrusted: false,
    why: 'The safety net. Nothing spoken is ever discarded.',
  },

  // ---- People page ----------------------------------------------------------
  {
    name: 'get_person',
    description: 'One person: their share status, advances drawn, and costs they paid from their own pocket.',
    page: '/people',
    readOnly: true,
    untrusted: false,
    why: 'Answers "what am I owed" without running the whole split.',
  },
  {
    name: 'add_person',
    description: 'Add someone to this load, as a shareholder or not.',
    page: '/people',
    readOnly: false,
    untrusted: false,
    why: 'Confirmed, because adding a shareholder changes what everybody else gets.',
  },

  // ---- Split page -------------------------------------------------------------
  {
    name: 'preview_split',
    description: 'Work the six steps and return the full division without writing anything.',
    page: '/split',
    readOnly: true,
    untrusted: false,
    why: 'Read-only on purpose. Looking at the split must never settle the load.',
  },
  {
    name: 'explain_share',
    description: "Read one person's working aloud: their equal share, what they are owed back, what they drew early, and what is left.",
    page: '/split',
    readOnly: true,
    untrusted: false,
    why: 'This is the tool for the person who cannot read the table. It is the reason the split page exists.',
  },
]

/** Registered only while the split page is mounted. Both tools are
 *  read-only — settling is irreversible and belongs to a person. */
export const SPLIT_ONLY = ['preview_split', 'explain_share'] as const

export function toolsForPage(page: string) {
  return TOOL_REGISTRY.filter((t) => t.page === page)
}
