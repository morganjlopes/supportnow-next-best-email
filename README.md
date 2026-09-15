# Next Best Email

A clickable prototype of a coordinated email layer that sits above SupportNow's
per-app onboarding sequences. Instead of each app sending its own drip on a
timer, every app offers candidate emails, and one nightly job picks the single
best one to send each person.

**Live:** https://morganjlopes.github.io/supportnow-next-best-email/

Static HTML, CSS and JavaScript. No build step, no backend.

## The four screens

| Page | What it shows |
| --- | --- |
| `index.html` | How far people get, which emails preceded each step, sends per day, latest decisions |
| `library.html` | Every app's candidate emails, who each one is for, and a rule builder that previews who matches right now |
| `journeys.html` | 48 simulated people, each with a colour strip of their stage across 60 days |
| `journey.html` | One person's full path: emails, app activity, held days, and why each decision was made |
| `editor.html` | Drag-and-drop email editor: pick a template, drag in blocks, write the copy |

## Everything here is simulated

The 48 people, their registries, and every email result come from a seeded
model, not real users. The model is tuned so its outcomes land near the real
2026 funnel: roughly 10% of creators reach five or more people, and roughly 8%
receive a first gift. The holdout group is 5 people, far too small to read any
lift from. It exists to show the comparison a real dashboard would make.

Blog posts, registries, grants and advocates shown in collection blocks are
sample content. Names and quotes are invented.

## What the editor's blocks map to

Blocks marked **New** in the palette would need a new shortcode built before
they could send. Everything else already exists in the platform:

| Block | Renders through |
| --- | --- |
| Button | `[btn]` |
| Registry card | `[registry_card]` |
| Needs list | `[needs_list]` |
| Callout | `[callout]` |
| Divider | `[divider]` |
| Hero | The email's hero title and subtitle |
| Heading, Text | Markdown in the email body |
| Collection, Registry preview, Quote | **New**, no shortcode yet |

Merge tags match the ones declared on the models today. A tag the email cannot
use is flagged in red, the way the content validator would reject it.

## Running it locally

Any static file server works:

```bash
python3 -m http.server 5204
```

Then open http://localhost:5204.

Edits made in the candidate library and the email editor are saved in your own
browser's local storage, so they do not follow you to another machine and other
people will see the defaults. "Reset to defaults" in the library clears them.

## Status

A prototype for discussion, not production code. Nothing here sends an email.
