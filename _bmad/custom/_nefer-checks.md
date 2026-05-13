# NEFER Pre-flight Checks — Executable steps before any artifact

> Appended to `activation_steps_prepend` of every code-touching BMad workflow.
> These are not suggestions — they are gates. If a check fails, **stop and
> surface the failure** rather than produce an artifact that bypasses it.

## Step C1 — Read project memory

Read **[CLAUDE.md](CLAUDE.md)** in full. It is the project root briefing.
Pay attention to the "Phase status" section — the repo state changes weekly.
You cannot reason about new features without knowing what shipped.

Then read the most recent ~5 ADRs (highest numbers in
[docs/governance/adr/](docs/governance/adr/)) to catch in-flight decisions
that haven't propagated yet into CLAUDE.md.

## Step C2 — Anti-doublon grep (mandatory before proposing any entity)

**Before** drafting a new Prisma model / service / router / page / Glory tool /
sequence / Intent kind / UI route / DS token, grep the relevant canonical map
with **synonym keywords**, not just the literal name you have in mind.

The repo has **6 canonical maps** in `docs/governance/`, each owning a slice
of the entity space. Pick the right one (or several) for what you're about
to add:

| If you're proposing a new…                              | Grep first                                                                          |
|---------------------------------------------------------|-------------------------------------------------------------------------------------|
| Prisma model / Intent kind / business concept           | [`CODE-MAP.md`](docs/governance/CODE-MAP.md) — synonym table (auto-regen pre-commit) |
| UI route / page / portal screen                         | [`PAGE-MAP.md`](docs/governance/PAGE-MAP.md) — 165 pages mapped per portal           |
| tRPC procedure / router                                 | [`ROUTER-MAP.md`](docs/governance/ROUTER-MAP.md) — 80 routers grouped by sub-system  |
| Service module (Mestor/Artemis/Seshat/Thot/…)           | [`SERVICE-MAP.md`](docs/governance/SERVICE-MAP.md) — per-Neter service inventory     |
| Component (DS primitive / Neteru kit / portal-specific) | [`COMPONENT-MAP.md`](docs/governance/COMPONENT-MAP.md)                              |
| Design token / CSS variable                             | [`DESIGN-TOKEN-MAP.md`](docs/governance/DESIGN-TOKEN-MAP.md) — Tier 0→3 cascade      |

For cross-cutting concerns (a new feature usually touches several axes —
model + service + router + page + component), grep **all relevant maps**
and surface every collision before proposing the entity.

Examples that have already cost us a refactor (most live in `CODE-MAP.md`):

| You might think of                      | What already exists                                          |
|-----------------------------------------|--------------------------------------------------------------|
| "vault de marque" / "asset rangé"       | `BrandAsset` (Phase 10, ADR-0012)                            |
| "SuperAsset" / "actif intellectuel"     | `BrandAsset.kind=BIG_IDEA / CREATIVE_BRIEF / MANIFESTO / …`  |
| "asset forgé" / "image générée"         | `AssetVersion` + `BrandAsset` promoted                        |
| "big idea active"                       | `Campaign.activeBigIdeaId` → `BrandAsset (kind=BIG_IDEA, state=ACTIVE)` |
| "brief créatif"                         | `BrandAsset.kind=CREATIVE_BRIEF` + `CampaignBrief` pointer    |
| "cockpit forge"                         | `/cockpit/operate/forge` — do NOT create `/cockpit/forges` (PAGE-MAP) |
| "phase residual form"                   | `/console/governance/phase-18-residuals` (PAGE-MAP)           |
| "oracle viewer / progress"              | `components/strategy-presentation/` + `use-oracle-stream` hook (COMPONENT-MAP)|

If grep returns a hit → **extend, don't double**. If grep returns nothing AND
the need is real → **ADR required** in `docs/governance/adr/` with explicit
"why not extension" justification. No ADR, no entity.

If `CODE-MAP.md` was edited manually, re-run `npx tsx scripts/gen-code-map.ts`
before trusting it. The other 5 maps are hand-maintained — if you touch
something they catalog, update them in the same PR (see Step P4 in the
commit protocol).

## Step C3 — Reformulate with LEXICON

Before producing any PRD / story / architecture text, re-read
[docs/governance/LEXICON.md](docs/governance/LEXICON.md) and re-write
the user's request using canonical terms. Common drift signals:

- "platform" / "OS" → **Industry OS**
- "client" / "founder" → distinguish (founder = Cockpit, client = depends)
- "tool" → distinguish Glory tool vs sequence vs framework
- "asset" → always specify `BrandAsset.kind`
- "brand" → product / service / character-IP / festival-IP / media-IP /
  retail-space / platform / institution / personal (9 archetypes, ADR-0059)

If your reformulation introduces a new term not in LEXICON, that's a
drift signal — either the term belongs in LEXICON (propose addition) or
your reformulation is wrong.

## Step C4 — APOGEE 3-Laws drift test

For every proposal, mentally test against the three Laws of Trajectory
([docs/governance/APOGEE.md](docs/governance/APOGEE.md)):

1. **Conservation of altitude** — does this risk silent regression of a
   brand's tier? Will the hash-chained intent log catch it?
2. **Stage sequencing** — A→D→V→E→R→T→I→S cascade is unidirectional.
   Does your change try to short-circuit (e.g., generate `S` before `A`
   is locked)?
3. **Fuel conservation** — Thot tracks propellant. Will this Intent flame
   out the mission budget?

A "no" to all three is not pass — it's "you haven't asked yet."

## Step C5 — Phase 18 residual check (only for brand/tree-touching work)

If your artifact touches Brand Tree, archetypes, or Strategy resolution:
query the `phase18ResidualEntry` model (or read
`/console/governance/phase-18-residuals` if accessible) for pending entries.
NEFER must not duplicate residual cleanup that's already calendar-locked.

## Step C6 — Variable-bible cross-check (only for editable fields)

If your artifact proposes a new editable field on `Strategy` /
`BrandContextNode` / pillar payload: cross-check
[src/lib/types/variable-bible.ts](src/lib/types/variable-bible.ts).
~300 entries are canonical. New editable fields must be classified
(domain-business vs domain-tech) and have `editableMode` set explicitly.

## Output guarantee

After these checks, your artifact must explicitly state, in its header
or summary section:

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ [C5 if applicable] [C6 if applicable]
Phase label: phase/X
Mission link: <how this contributes to superfans × Overton>
CODE-MAP grep: <terms searched, hits found, extension chosen / ADR-XXXX>
```

If any check is `✗`, stop and surface — do not ship the artifact.
