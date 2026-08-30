# Decisions

Kept because the reasoning is worth more than the conclusion, and because
half of it is things that did not work.

---

## Things considered and set aside

**A general ledger for anyone in the mining camps.** Traders, shopkeepers,
gold buyers, miners — one book that understood money, people and days. It
read well and it was too thin to be good at anything. A ledger that
handles seven kinds of business handles none of them properly, and the one
moment that actually matters — the division — would have been buried under
generality. Narrowed to one load.

**A savings-group ledger.** Set aside after finding mature products already
serving tens of thousands of groups with offline support and automatic
share-out. Building a worse version of an existing product is not worth
submitting.

**An incident triage workspace.** Good mechanics, wrong audience. It
answered a question about agent safety that nobody at this challenge had
asked, and the users would have been engineers rather than anyone who
actually needed help.

**A catalog cleanup tool.** Killed by two things: bulk editors with
propose/preview/revert already exist in abundance, and more damningly it
did not need WebMCP at all. A plain "fix" button would do the same job,
which is the first question anyone reviewing it would ask.

The test that killed all four, in the end: **remove the agent entirely — is
this still something a person would use tomorrow?** A book of costs for a
load is. Everything above was an argument about agents wearing an
interface.

---

## Money is an integer

Shillings have no subunit in practice, and the division has to add back up
to the whole. `divideEvenly` hands out the remainder one shilling at a time
in a fixed order rather than rounding, and the split page says it happened.

Silent rounding is how a ledger loses trust. Someone who is short one
shilling does not care that it is one shilling — they care that the number
moved and nobody told them.

## The split engine was written before any UI

`lib/split/engine.ts` and its tests came first, before a single component.
Everything else in the app exists to feed it or display it, and it asserts
that the books balance rather than trusting itself.

## Hold to record, not tap to start and tap to stop

Tap-twice needs you to look at the screen twice. Holding is what a
walkie-talkie does and what a voice note does, and nobody has to be told.

The failure mode of tap-to-toggle is worse than it looks: a toggle left on
records everything that happens afterward, and that is discovered much
later. Hold avoids it entirely.

## No seed data, on purpose

Every earlier draft of this app shipped with a pre-filled sample load —
sixteen costs, a financier, two people sharing a first name — so that
anyone opening it would immediately see something interesting. That was
removed deliberately.

Invented data is a lie about what the app actually does. A ledger's entire
claim is that every number on the screen came from something real that
happened. Shipping the app with fabricated costs and fabricated people
undermines that claim before a single real entry is made — and it means
the empty state, which is what most people will actually see on day one of
real use, was never designed or tested properly.

The trade-off is real: a reviewer opening the app for the first time sees
nothing until they add something themselves. That is the correct
trade-off. It costs thirty seconds of setup and it means every screen in
this app has actually been exercised with real, not invented, numbers.

## Every write tool has a hand-operated twin

`record_cost`, `record_advance`, `record_sale`, `record_levy`, and
`add_person` all have a plain HTML form doing the identical write. This
was not originally true — early drafts only had a typed-text fallback that
turned everything into an unstructured note, which meant the app quietly
depended on an agent existing to ever produce a real record from a person
without one.

That is backwards. The claim "everything still works by hand" has to be
literally true, not true in spirit. A note kept verbatim is a safety net
for what could not be captured any other way, not the primary path for
someone working entirely without an agent.

## Two people can share a name

Two people in the seed data (formerly) were both called Msafiri, and that
detail was doing real work: it is exactly the situation `record_advance`
has to handle by asking rather than guessing. With the seed data gone, the
same disambiguation logic still exists in the code — `record_advance` and
`record_cost` both check for more than one name match and raise a choice
rather than picking the first one — it will simply trigger on whatever
real names get added to a real load, the same as it would in the field.

## Only the uncertain fields are asked about

The central idea, and the hardest thing to get right.

Accepting everything silently is how wrong numbers get into a ledger.
Asking about every field is slower than writing it in a notebook, so
people stop using the tool. Every field carries a confidence, and only the
uncertain ones are raised.

## Advances always go past a person, even when everything was clear

`record_cost` writes straight through when nothing is uncertain.
`record_advance` never does.

An advance changes what one named person is paid, weeks later, and they
are not in the room when it is entered. That asymmetry is deliberate, and
it is the reason the confirm dialog is not a generic wrapper around every
write.

## Split tools are read-only

Looking at a division must never perform one. `preview_split` and
`explain_share` both read. Settling belongs to a person on the page, not
to a tool call an agent can make while explaining something.

## explain_share returns sentences, not fields

It is meant to be read aloud to someone standing in front of the person
dividing the money. A list of key-value pairs read out loud is not an
answer to anybody.

## Registration scoped with AbortController

Not tidiness. `unregisterTool` was removed from the specification, and
aborting the registration signal turns out to model the real rule better:
the tools that exist are the tools for the page in front of you.

## One open load, no selector

A person works one load, settles it, starts the next. Building for ten
simultaneous loads would put a selector on every screen for a case that
does not happen.

## English interface, local-language speech

The screen reads in English so the app is legible to any reviewer. The
microphone accepts either language, which is the honest split: a person
speaks their own language, and the record stays readable to everyone who
has to trust it.

## No component library

Everything hand written. Not purity — a component library brings another
product's default proportions with it, and this needed to look like
itself rather than like a template.

## What could not be independently verified

The split rules came from lived practice around how a load is actually
divided, and they are implemented exactly as described rather than
smoothed into something that felt more like conventional accounting. Two
things are decisions rather than confirmed universal conventions, noted
here so they can be corrected: financing returns principal plus whatever
was agreed on the day the money moved, and a shareholder who paid a cost
from their own pocket gets it back before the division.
