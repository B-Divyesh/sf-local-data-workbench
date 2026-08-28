# Visual thesis — The Data Ledger

## Direction and rationale

Local Data Workbench is a **monochrome typographic broadsheet**: part financial newspaper, part lab ledger, part typesetter's proof. Data work is treated as publishing a reproducible edition, not as decorating a spreadsheet. Heavy rules, numbered folios, narrow annotations, and an editorial serif make the lineage of every result feel inspectable. Chrome stays quiet so columns and transformations remain the news.

The single-mode warm-paper treatment is deliberate. It reduces visual noise during long inspection sessions and gives the workbench an identity that does not resemble a generic dark developer dashboard. Dark ink and oxblood are both accessible against paper.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#F2EFE6` | primary background |
| Newsprint | `#E5E0D3` | recessed surfaces and alternating rows |
| Ink | `#171715` | text and structural rules |
| Faded ink | `#625F57` | secondary copy (7.0:1 on paper) |
| Oxblood | `#8D211E` | primary action and active marks |
| Oxblood dark | `#671512` | hover/focus contrast |
| Moss | `#315A42` | success with text labels |
| Ochre | `#825B16` | warnings with text labels |
| Fault | `#9B2823` | errors with text labels |

## Type

- Display/editorial: Georgia, `Times New Roman`, serif. No remote font file; familiar newspaper forms and zero font payload.
- Utility/data: `Arial Narrow`, `Roboto Condensed`, Arial, sans-serif. Tabular figures are enabled for data and counters.
- Scale: 12 / 14 / 16 / 20 / 32 / clamp(48–84) px. Body never drops below 16 px on reading surfaces.
- Labels use compact uppercase tracking; prose uses a 62–72 character measure and 1.55 leading.

## Spacing and layout

An 8 px base rhythm with 4 px hairline exceptions. Desktop is a three-column editorial desk: 248 px source/recipe rail, fluid data sheet, 288 px inspector. At ≤900 px the inspector moves below the sheet; at 390 px all regions stack and nonessential folio metadata drops. Controls remain ≥44 px. Structural rules replace generic cards; rounded rectangles are reserved for pills and input affordances.

## Interaction grammar

- Opening a file creates a new numbered edition.
- Recipe steps read vertically like a printing docket and can be removed or reordered by keyboard buttons.
- The preview is a ruled galley with sticky headers, visible sample/full-row disclosure, and horizontal scrolling rather than compressed text.
- Every operation reports a concise status in a live region. Errors include a next action.
- Primary actions are solid ink/oxblood; secondary actions are paper with a rule. Focus is a 3 px oxblood outline with offset.

## Motion policy

State changes use 180–240 ms opacity/translate transitions, anchored to the panel where the change originates. A newly added recipe step receives one brief oxblood rule sweep. Nothing loops. Under `prefers-reduced-motion: reduce`, scrolling is instant and all transforms/animations are removed; state remains legible through weight, rules, and labels.

## Original asset plan and prompt sheet

The landing hero uses one original editorial still life: a long folded strip of off-white punched paper crossing a black typesetter's table, marked only by abstract grid cells, crop marks, and one oxblood thread that connects input to output. It explains local transformation and durable lineage without pretending to show the interface.

**Prompt sheet**

- Subject: folded continuous-feed paper carrying abstract rows and columns through a compact mechanical typesetter.
- World/materials: archival newsprint, blackened steel, graphite, deckled paper, one cotton thread.
- Light/lens: raking side light, high-contrast editorial still life, 50 mm, shallow but readable depth.
- Palette words: warm paper, carbon black, faded graphite, restrained oxblood.
- Composition: wide 3:2 crop, machine at right, generous paper field at left for page typography.
- Negative list: people, hands, screens, legible words, letters, logos, brands, watermarks, glossy 3D, neon, gradients, blue light, fantasy machinery.

Asset generation spec: `stylized-concept`, landing-page hero illustration, no text, no watermark, no logos. Generated with the factory Azure image deployment (`factory-image`) on 2026-08-28 using `/opt/fleet/lib/gen-image.sh`. The selected source and its JSON prompt sidecar live in `assets/src/`; optimized WebP/AVIF derivatives ship in the site. Generated imagery is original for this product.

## Accessibility and performance intent

Ink/paper contrast is 15.4:1; faded ink/paper is above 6:1; oxblood/paper is above 7:1. Color never carries status alone. The hero has explicit dimensions and meaningful alt text. No runtime font or image CDN is used. The mobile WebP target is ≤120 KB and desktop ≤300 KB.
