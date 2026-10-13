# Next Best Email

One coordinated email layer for every SupportNow app. Each app stops running its
own onboarding drip on a timer. Instead, every app offers candidate emails, every
app reports what people do, and one nightly job picks the single best email to
send each person, or decides to send nothing.

**Prototype:** https://morganjlopes.github.io/supportnow-next-best-email/

This README scopes the whole project: the problem, what gets built, how a
decision is made, how it fits the existing Rails app, the phases to ship it, and
the questions still open. The last section covers the clickable prototype in
this repo.

## The problem

SupportNow is a family of apps: Support Page, Grants, Emergency Contact, Funding
Coach, Advocacy, Clicklists, the Podcast, and Support Languages. Each one onboards
people with its own email sequence on its own clock.

That breaks down in three ways:

- **People who use more than one app get stacked sequences.** Someone who signs up
  for Grants and Emergency Contact in the same week gets two drips that know
  nothing about each other.
- **Timers ignore what people just did.** A drip sends day three's email whether
  the person shared their registry yesterday or has not opened anything in a week.
- **The step that matters most competes with everything else.** The registry is
  the goal, and the 2026 funnel shows how few people get there: roughly 10% of
  creators reach five or more people, and roughly 8% receive a first gift. App
  emails crowd out the nudge that would move someone forward.

## What we are building

Four pieces, each with an admin screen.

| Piece | What it does |
| --- | --- |
| **Contacts** | One record per person across every app, so the system knows it is the same person in Grants and on a Support Page. |
| **Activity** | A stream of signals from every app onto that person: signed up, created a registry, shared it, people joined, a gift came in, came back to an app, clicked an email. |
| **Content library** | Candidate emails that each app authors, each with rules for who it is for, a tier, a cooldown, and the content itself. |
| **Orchestrator** | A nightly job that reads each person's activity, finds every candidate they match, scores them, and sends at most one. Every decision is saved with its reasons. |

### Goals

- Send each person at most one email a day and at most three budgeted emails a week.
- Move people up the registry ladder, measured against a holdout group that keeps today's drips.
- Let each app keep authoring its own emails without coordinating with the others.
- Explain every send and every hold in plain language, per person, per day.

### Not in scope for the first release

- SMS, push, or in-app messages. Email only.
- Real-time triggers. Transactional and time-critical emails keep sending the way they do today.
- Machine-learned scoring. The scoring formula is hand-tuned and readable.
- Per-person send-time optimization.

## Core concepts

### The ladder

Every person sits on one rung, computed from their activity. Rungs only move up.

| Rung | Name | Reached when |
| --- | --- | --- |
| S0 | Touched an app | Signed up for any app, no registry yet |
| S1 | Registry created | Has a registry |
| S2 | Shared | Shared the registry at least once |
| S3 | 5+ people | Five or more people joined the registry |
| S4 | First gift | At least one charged gift |
| S5 | $500+ raised | Raised $500 or more |

S3 is the only rung people can skip, since a first gift can land before five
people join.

### Tiers

Tier sets priority. The orchestrator always prefers a lower tier number, then the
higher score within that tier.

| Tier | Name | Counts toward the weekly budget | Example |
| --- | --- | --- | --- |
| T1 | Transactional | No, sends outside the orchestrator | Receipts, password resets |
| T2 | Time critical | No, sends outside the orchestrator | A meal drop-off tomorrow |
| T3 | Rung nudge | Yes | "Your page is ready. Send it to one person." |
| T4 | App engagement | Yes | "Two fields left on your fridge sheet" |
| T5 | Cross-app upsell | Yes | "Someone who knows the hospital system" |
| T6 | Broadcast | Yes | "This week on the podcast" |

### Candidates

A candidate is one email an app offers. It has:

- **Owning app** and an admin-only **name**.
- **Subject line** and **content** built in the email editor.
- **Tier**, from the table above.
- **Nudges people on** a rung, or any rung. A rung nudge is only eligible for people on exactly that rung.
- **Cooldown** in days before the same person can get it again.
- **Status**: live, draft, or paused. Only live candidates are considered.
- **Rules** for who it is for. Every rule must match.

### Rules

Rules are data, not code, so the library, the "who matches today" preview, and
the nightly job all use one evaluator. The field list is small on purpose: each
field is a column we already have or a single aggregate over activity.

| Field | Type | Operators |
| --- | --- | --- |
| Current rung | Rung | is, is not |
| Has a registry | Yes or no | is |
| Registry has a photo | Yes or no | is |
| Has shared | Yes or no | is |
| People on registry | Number | under, at least |
| Charged gifts | Number | under, at least |
| Days since any activity | Number | under, at least |
| Apps touched | App | includes, excludes |
| Situation | Disability, pediatric, cancer, other | is, is not |

## How a nightly decision works

For each person in orchestration, once a night:

1. **Collect eligible candidates.** Keep a candidate only if it is live, all its
   rules match, its rung matches the person's rung (for rung nudges), and its
   cooldown has passed for this person.
2. **Suppress cross-app upsells after a nudge.** If a rung nudge went out this
   week, skip T5 upsells. The exception: the person ignored their last two nudges,
   so the upsell gets a turn.
3. **Score what is left.**

   ```
   score     = tier_base × rung_value × (0.45 + 0.55 × freshness) − fatigue
   freshness = 0.5 ^ (days_quiet / 3)
   fatigue   = 0.06 × budgeted sends in the last 7 days + 0.07 × unopened streak
   ```

   | Tier | tier_base |   | Rung | rung_value |
   | --- | --- | --- | --- | --- |
   | T3 | 1.00 |   | S0 | 0.70 |
   | T4 | 0.62 |   | S1 | 0.95 |
   | T5 | 0.50 |   | S2 | 1.00 |
   | T6 | 0.30 |   | S3 | 0.80 |
   |   |   |   | S4 | 0.55 |
   |   |   |   | S5 | 0.30 |

   These are the prototype's starting weights. They are meant to be tuned once
   real sends come back.
4. **Rank** by tier, then by score.
5. **Hold or send.** Send nothing if any of these is true:
   - The person got their first gift in the last 48 hours.
   - Something already went out today.
   - Three budgeted emails went out in the last seven days.
   - The best score is under the 0.16 floor.
6. **Record the decision** whether it sent or held: the rung, every scored
   candidate with its score parts, every suppressed candidate with its reason,
   and the winner or the hold reason.

### Attribution

When a person moves up a rung, the move is credited to the last email they
clicked within the two days before it. Moves with no recent click are credited
to nobody.

### Holdout

One in ten people stay on today's per-app drips and never enter orchestration.
Their drips fire on days 0, 1, 2, 3, 4, 7, and 10 after they join each app.
Comparing the two groups is how we prove the orchestrator helps. Assignment is
sticky for the life of the person.

## Admin screens

The real build ships the same five screens the prototype demonstrates, inside
the existing admin.

| Screen | What it answers |
| --- | --- |
| **Overview** | How far people get on the ladder, orchestrated against holdout. Which emails preceded each rung move. Sends per day. The latest decisions. |
| **Candidate library** | Every app's candidates, filterable by app, tier, and status, with sent, open, click, and credited counts. A rule builder that previews who matches right now. |
| **Email editor** | Drag-and-drop editor for a candidate's content: pick a template, drag in blocks, write the copy, preview it for a real person on desktop and mobile. |
| **Journeys** | Every person with a strip of their rung by day, filterable by rung, app, and orchestrated or holdout. |
| **Journey** | One person's full path: emails, clicks, app activity, held days, and the reasoning behind each night's decision. |

### Editor blocks

Most blocks render through shortcodes the platform already has. Three need a new
shortcode in the platform email shortcodes before they can send.

| Block | Renders through | Status |
| --- | --- | --- |
| Hero | The email's hero title and subtitle | Works today |
| Heading, Text | Markdown in the email body | Works today |
| Button | `[btn]`, with the optional magic sign-in link | Works today |
| Callout | `[callout]` | Works today |
| Divider | `[divider]` | Works today |
| Registry card | `[registry_card]` | Works today |
| Needs list | `[needs_list]` | Works today |
| Quote | `[quote]` | New |
| Registry preview | `[registry_preview]`, with progress bar and follower count | New |
| Collection | `[collection]`, pulling live blog posts, registries, grants, or advocates | New |

### Templates

Five starting templates, each picked by default from the candidate's tier:

- **Simple note** for app engagement. A short personal message and one button.
- **Rung nudge** for T3. Headline, why it matters, their registry, one clear ask.
- **Feature spotlight** for T5. Introduces another app with a callout and a button.
- **Digest** for T6. Blog posts and families to follow, pulled in automatically.
- **Milestone** for the first-gift thank-you. Registry preview and a "say thank you" button.

### Merge tags

`first_name`, `registry_name`, `registry_url`, `organizer_name`,
`beneficiary_name`, and `needs_count`. These match the tags declared on the
models today. An undeclared tag is flagged in the editor and rejected by the
content validator, never sent blank.

## How it fits the existing app

The Rails app at supportnow-org/supportnow already has most of the sending side.
The project adds the signal, library, and decision layers on top.

### Already there

- **Contact** records with a matched user, a source, and a canonical email for de-duplication.
- **EmailTemplate** with a platform provider alongside Customer.io, and audiences such as organizers, followers, and donors.
- **EmailEvent** and the platform email fanout and recipient jobs for delivery and counts.
- **EmailSubscription** for unsubscribes, bounces, and complaints.
- **The PlatformEmail renderer**, shortcodes, theme, and content validator the editor mirrors.
- **Registry onboard paths, steps, and progress**, which already track part of the ladder.
- **Ahoy email messages** with sent, opened, and clicked times, and click tracking already on the platform mailer.

### New

| Table | Holds |
| --- | --- |
| `activity_signals` | One row per thing a person did: person, app, signal name, detail, and when it happened. Every app writes here. |
| `email_candidates` | The library: owning app, name, tier, rung it nudges, cooldown, status, rules as JSON, and a link to its email template. |
| `email_decisions` | One row per person per night: rung, scored candidates, suppressed candidates, winner or hold reason. Sends link back to their decision. |
| Orchestration cohort | A sticky orchestrated or holdout flag per person. |

Rung, days quiet, apps touched, and the other rule fields are computed from
these tables and existing columns. Whether to store the rung or compute it each
night is a build decision.

## Phases

| Phase | Ships | Done when |
| --- | --- | --- |
| **0. Prototype** | This repo. Simulated people, the decision model, every admin screen. | Complete. |
| **1. Signals and identity** | `activity_signals`, every app writing to it, one person per human across apps, rung computed nightly. Read-only Journeys screen. | Journeys shows real people with real activity. No emails change. |
| **2. Library and shadow mode** | `email_candidates`, the rule evaluator, the library screen, and the nightly job recording decisions without sending. | A week of shadow decisions reviewed next to what the drips actually sent. |
| **3. Send to a cohort** | Orchestrator sends for a slice of new people, with caps, mutes, unsubscribes, and the holdout. Drips turned off for the orchestrated slice. | Overview compares orchestrated against holdout on real sends. |
| **4. Editor and new blocks** | The drag-and-drop editor in admin. Quote, registry preview, and collection shortcodes. | Each app's team authors and ships a candidate without a developer. |
| **5. Tune and widen** | Adjust weights from real results, add rule fields that earn their place, widen the cohort. | The holdout comparison is large enough to read. |

## How we measure it

Each one is compared between the orchestrated group and the holdout.

- Share in the first week, the S1 to S2 move.
- Reaching five or more people.
- First gift.
- Budgeted emails per person per week.
- Unsubscribe and complaint rate.

## Open questions

- **Identity without accounts.** Some apps, like Emergency Contact and Clicklists, can be used without a SupportNow account. How do we join those people to one record, and is a canonical email enough?
- **Customer.io.** Do the per-app drips live there today? Does the orchestrator replace Customer.io for onboarding, or send through it?
- **Who owns candidates.** Does each app's team publish its own, or does someone review every candidate before it goes live?
- **Run time and time zones.** The job runs nightly, but sends should land at a good local hour.
- **Do transactional sends count?** Today T1 and T2 skip the budget entirely. A person who just got five receipts may still not want a nudge.
- **Holdout size.** How many people, for how long, before the comparison is readable?
- **Language.** The Spanish Support Page candidate is a draft. Should a person's language pick the content version rather than be a separate candidate?
- **Collection rules.** Which posts, registries, grants, and advocates does a collection block pick for a given person?

## The prototype in this repo

A clickable prototype for discussion, not production code. Static HTML, CSS,
and JavaScript with no build step and no backend. Nothing here sends an email.

| Page | What it shows |
| --- | --- |
| `index.html` | Overview: ladder progress, credited emails, sends per day, latest decisions |
| `library.html` | Candidate library with the rule builder and live match preview |
| `editor.html` | Drag-and-drop email editor with templates, blocks, and merge tags |
| `journeys.html` | 48 simulated people, each with a strip of their rung across 60 days |
| `journey.html` | One person's full path and every night's decision |

| File | Holds |
| --- | --- |
| `js/library.js` | Apps, rungs, tiers, rule fields, the rule evaluator, and the default candidates |
| `js/sim.js` | The seeded 60-day simulation and the decision logic described above |
| `js/content.js` | Editor blocks, templates, merge tags, sample collections, and the email renderer |
| `js/shell.js` | Admin sidebar, header, and shared render helpers |

### Everything here is simulated

The 48 people, their registries, and every email result come from a seeded
model, not real users. The model is tuned so its outcomes land near the real
2026 funnel. The holdout is 5 people, far too few to read any lift from. It is
there to show the comparison a real dashboard would make.

Blog posts, registries, grants, and advocates shown in collection blocks are
sample content. Names and quotes are invented.

### Running it locally

Any static file server works:

```bash
python3 -m http.server 5204
```

Then open http://localhost:5204.

Edits in the candidate library and the email editor save to your own browser's
local storage. They do not follow you to another machine, and other people see
the defaults. "Reset to defaults" in the library clears them.
