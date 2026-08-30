# Mgao

A record-keeping and payout tool for small-scale gold mining — built around
Geita, Tanzania, for anyone actually in that trade: the miner working the
pit, the financier who fronted the money, the trader who buys the output,
and everyone else standing around a load when it finally sells.

Built for OpenAI's WebMCP Challenge, August 2026. MIT licensed.

*Mgao* is Swahili for the division of a thing among the people entitled to
it.

---

## Who this is for

Small-scale and artisanal gold mining in Geita — and places like it — runs
on the same handful of roles, on almost every load:

- **The miners** who hold a share of what a load produces.
- **A financier (mdhamini)** who fronts money for milling, fuel, or food,
  and expects it back before anyone's share is divided.
- **Workers** who draw advances against their own share while the work is
  still going.
- **A trader or buyer (mfanyabiashara)** who weighs the gold and pays for
  it, and whose figures every share downstream depends on.
- **Whoever is doing the dividing** — often unpaid, always the one blamed
  when the numbers don't add up.

If any of that describes you, this is built for you. It isn't specific to
one mine, one pit, or one group — it's built around how a load of ore
actually moves through small-scale mining, wherever that's happening.

## The actual problem

The record for almost all of this is a paper notebook, or nothing at all,
and it fails in the same specific ways everywhere:

1. **It's paper-based, and paper doesn't survive fieldwork.** Rain, dust, a
   torn page, a book left at the mill. When it's gone, the record of weeks
   of work goes with it.
2. **Costs are written down later, from memory, or not at all.** A small
   cost — food, a boda ride, a spare part — feels too small to note in the
   moment. Ten dropped costs is somebody's entire share.
3. **The mahesabu get disputed, and there's no way to settle it.** A
   notebook shows a total, never how the total was reached. Someone who
   thinks they were short-changed can't check, and whoever divided the
   money can't prove they didn't make a mistake — or worse, that they
   didn't cheat.
4. **Poor organization compounds all of it.** Who paid for what, who
   fronted money on what terms, who already drew an advance — when none of
   that is written down consistently, small-scale operations lose money to
   confusion, not just to bad luck.

These are not new problems and this is not a novel observation — they are
the specific, well-known reasons artisanal and small-scale mining struggles
to keep clean books, and they are the reasons this tool exists in this
shape rather than as generic bookkeeping software.

## What Mgao actually does about it

Mgao gives every load one running book and one clear division, usable by
anyone involved regardless of their role:

- Hold a button and say what happened, in whichever language you're
  speaking — or type it, or fill in a plain form. Nothing requires an
  agent or an app store; typing and forms work with zero setup.
- Every cost, advance, and financing arrangement is timestamped and kept,
  not remembered.
- When the load sells, the six-step division is computed by the app —
  never guessed, never done from memory — and shown to everyone: gross,
  levy, financing repaid, every cost by name, the equal split, and each
  person's advances coming off their own line only.
- Anyone can check any number against where it came from. That is the
  entire point: a record a financier can audit, a miner can trust, and a
  trader's sale figures feed directly and visibly into.

This is one thing done properly rather than everything done thinly. Mgao is
not a general accounting suite and not a full mining-operations platform —
it is built specifically around the load-costs-division cycle that is at
the center of almost every dispute and every lost shilling in small-scale
mining. That is the moment where the money is, where the arguments are, and
where paper fails hardest.

## Try it


**There is no seeded or sample data.** The app opens genuinely empty — no
load, no people, no costs. Nothing is invented to make the screen look
busy. The first thing you do is name a load and start adding to it, either
by hand or by voice.

1. Open the app. You'll see "No load open yet" — name one and press Start.
2. Add a person or two on the **People** page (there's a plain "Add a
   person by hand" form — no agent required).
3. Record a cost, an advance, or a sale — either hold the record button
   and speak, type into it, or use "Add an entry by hand" on the Load page.
4. Once at least one sale is recorded, open **Split** to see the division
   worked out step by step.

To use it with an agent instead of by hand, open the app in a
WebMCP-capable browser — for example the ChatGPT desktop app's in-app
browser, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`
enabled — and try things like:

- *"Start a load called Load 1"*
- *"I paid the mill forty five thousand and thirty thousand for diesel"*
- *"Give [a name] twenty thousand advance"* — if two people on the load
  share a similar name, the app will ask which one rather than guessing
- *"We sold fourteen grams at a hundred and eighty thousand"*
- Then open **Split** and ask *"explain [a name]'s share"*

Without an agent, everything still works by hand — every tool that an
agent could call has a matching plain form on the page.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run test     # split engine unit tests
npm run build    # production build
```

Nothing to configure. No API keys, no database, no backend, no seed
script. State lives in IndexedDB in the browser and starts empty.

> **Note on local development.** WebMCP requires a secure context.
> `localhost` counts as one, so `npm run dev` is fine. If the app is served
> from a plain HTTP LAN address instead, `document.modelContext` will be
> `undefined` and the banner on the load page will say so.

## How WebMCP is used

Fourteen tools, registered through `document.modelContext`, scoped per
page.

**Registration is scoped to the mounted page.** There is no
`unregisterTool` in the current specification — the signal passed at
registration is aborted instead. That turns out to be exactly right here:
the split tools only exist while the split page is open, so an agent
looking at the people list cannot settle a load. The lifecycle enforces the
rule instead of a runtime check somebody forgets to write.

```ts
const controller = new AbortController()
for (const tool of build()) {
  mc.registerTool(tool, { signal: controller.signal })
}
return () => controller.abort()
```

**Every read happens at execute time, never in a closure.** Someone is
often still talking while the agent is answering. A tool that closed over a
snapshot taken at registration would be describing a book that no longer
exists.

```ts
execute: async () => {
  const s = read()   // live, not captured
  ...
}
```

**Approval carries corrections, not a yes.** `requestUserInteraction`
returns whatever the page returns, and the callback runs inside the app's
own document with full DOM access. This app's dialog returns the resolved
person, the corrected number, and which fields were touched — so the agent
continues with the person's version rather than its own, and the entry is
recorded as human-originated because a person changed it.

```ts
const answer = await client.requestUserInteraction(() =>
  askUser({ title, transcript, settled, uncertainties }),
)
// { approved: true, answers: { personId: 'p2', amount: '30000' },
//   corrected: ['amount'] }
```

**Speech is untrusted input.** Transcription passes through third-party
systems and arrives as text nobody wrote down deliberately. Every tool that
returns a raw transcript is annotated `untrustedContentHint`, so it is
handed to the agent as data rather than instruction.

**No tool does arithmetic on money.** The six steps of the division are
computed by `lib/split/engine.ts` from recorded figures and covered by
tests. The agent is never asked for a share and cannot produce one. It
brings language; the ledger brings truth.

**Every write tool has a hand-operated equivalent on the page.** This is
not a fallback bolted on for compliance — it is the same rule the app
already follows for speech: nothing about the ledger should depend on an
agent existing at all. `record_cost`, `record_advance`, `record_sale`,
`record_levy`, and `add_person` each have a plain form doing the identical
write through the identical store functions.

Full schemas, annotations, and the reason each tool exists are on the
`/tools` page in the app.

## The split

No owner's percentage. Nobody is paid for holding the ground.

1. **Gross** — grams × price per gram, every lot listed separately
2. **Less the levy** — paid whatever the load turned out to be worth
3. **Less financing** — principal plus whatever was agreed on the day
4. **Less costs** — every cost by name, never as one lump
5. **Divide equally** — the remainder, between shareholders only
6. **Advances** — off each person's own line, not out of the pot

A cost a shareholder paid from their own pocket comes back to them before
the division, because it has already come off the gross in step 4 and
otherwise they have quietly funded the group.

Odd shillings are never rounded away. When the remainder does not divide
evenly they are handed out one at a time and the screen says so, because
the whole point is that anyone can check.

## Layout

```
src/
  lib/
    money.ts                integers only, divideEvenly loses nothing
    types.ts                 load, cost, financing, advance, sale, levy, note
    split/engine.ts           the six steps; balances or throws
    split/engine.test.ts      shortfall, uneven division, overdrawn advance
    db/schema.ts               dexie, no seed, opens empty
    store.ts                    live state, read at call time
    webmcp/
      model-context.ts         document first, navigator fallback
      use-tools.ts               registration scoped to the mounted page
      confirm.tsx                 returns answers and corrections
      registry.ts                  every tool, and why it exists
      tools-*.ts                    the fourteen tools
  components/
    ui.tsx                       shared primitives — one column, one dot
    record-button.tsx             hold-to-record with speech + typing fallback
    manual-entry.tsx               the hand-operated form for every write tool
    boot.tsx                       opens the (possibly empty) book once
  app/
    layout.tsx                   header, nav, the mark
    page.tsx                      load — empty state, ledger, manual entry
    people/page.tsx                 people — empty state, manual add-person
    split/page.tsx                    the division
    tools/page.tsx                      for reviewers
```

## Known limits

- Speech recognition uses `sw-TZ` where the browser has it. Where it does
  not, English recognition still catches the numbers, which matters most,
  and anything it mangles becomes a note rather than being lost.
- One open load at a time, on purpose. A person works one load, settles it,
  and starts the next. A load selector on every screen would be for a case
  that does not happen.
- Everything is local to the browser. There is no sync between devices,
  which means the book cannot be lost but also cannot yet be shared. That
  is the next thing to build, not something dropped for the deadline.
- There is no seed data and no demo mode. A judge or reviewer opening the
  app for the first time will see a genuinely empty book and has to add a
  load, a person, and an entry themselves to see the split work — this is
  a deliberate choice, not an oversight.

## Licence

MIT. See `LICENSE`.
