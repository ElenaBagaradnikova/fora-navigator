# FORA Navigator — OpenAI Build Week submission draft

## One-line pitch

FORA Navigator turns a migrant family’s complex disability-support situation into a safe, source-backed action pathway — then lets the person choose exactly what to share with a human peer consultant or specialist.

## 30-second pitch

Families navigating disability, migration status, healthcare, education and social support rarely have one simple question. They have a chain of dependent actions, unfamiliar documents and rules that change. FORA Navigator turns a plain-language description into a prioritised pathway for Asturias, with document checklists, multilingual draft letters and dated official sources. The family can stay entirely local in the browser, use a separately consented GPT-5.6 Terra path for a fictional competition case, or send only a reviewed minimal preview to a FORA human consultant. It is AI navigation with a clear boundary between information, official verification and human support.

## The problem

A conventional chatbot answers one question at a time. A family’s real problem is usually a system:

- healthcare access may depend on residence documents and municipal registration;
- disability recognition has its own evidence and procedure;
- school support may need to begin before other decisions are complete;
- the same document may be needed by several authorities;
- migration or protection status changes which route is relevant;
- stress makes a long list of links difficult to act on.

The failure mode is not only a wrong fact. It is also presenting too much at once, hiding dependencies, treating an uncertain rule as a guarantee, or collecting sensitive details that were not needed.

## The solution

FORA Navigator creates one structured, progressive plan:

1. deterministic emergency screening before normal navigation;
2. a short multilingual intake using document-based migration/protection statuses;
3. an editable case summary;
4. priorities for now, seven days, one month and later;
5. a deduplicated document checklist shared across actions;
6. draft messages in Russian, Ukrainian, English and Spanish;
7. source cards with jurisdiction, verification date, next review date and confidence;
8. an optional handoff to either a peer consultant or a specialist, with an exact preview and independent consent.

The competition default is a complete, non-sending Demo Mode. It works without API keys and uses only fictional cases.

## Why it is different

### It produces a pathway, not an answer

Actions have prerequisites, owners, destinations, documents, expected results and failure modes. The interface shows the nearest three priorities first and keeps the complete plan available underneath.

### Evidence is part of the product contract

Model output cannot invent source metadata. It may reference only source IDs from FORA’s reviewed allowlist; titles, URLs, jurisdiction and verification dates are reattached deterministically. Official rules carry a next-review date, and a protected monthly reminder tells the content owner what is due for human verification.

### Consent follows the action

Local use, an external AI request and a human-consultation request are separate actions with separate choices. AI consent never authorises a human handoff, and handoff consent never authorises AI processing.

### The user controls the handoff boundary

The consultation endpoint cannot receive the stored Case. It accepts only a closed DTO: peer/specialist route, category, region, preferred language, chosen contact and a user-edited note of at most 500 characters. The UI shows exactly those fields before consent. No plan, chat, files, source IDs or analytics identifier is attached.

## How OpenAI is used

The controlled API path uses GPT-5.6 Terra through the Responses API with Structured Outputs. The runtime is intentionally narrow:

- a server-side feature flag defaults to off;
- only explicitly confirmed fictional competition cases are accepted;
- consent is versioned, bound to one case, valid for 15 minutes and consumed once;
- the request uses `store:false`;
- output follows a strict Zod schema;
- one repair attempt is allowed for malformed structured output;
- a deterministic postflight checks source allowlists, document references, action dependencies, PII and prohibited guarantees;
- failure returns a clearly labelled local plan instead of displaying unchecked model output.

OpenAI helped provide the reasoning layer for turning a multidomain situation into a coherent sequence, while the application retains deterministic control over safety, evidence metadata and what can leave the browser.

## How Codex was used

Codex served as the implementation partner across product specification, multilingual UX, typed schemas, safety gates, source repair, tests and documentation. Important product and privacy decisions remained explicit owner decisions: supported languages, data controller identity, public contact, retention proposal, demo-only live gates and the exact consultation preview.

The resulting verification matrix currently includes 58 unit/integration tests and 16 Playwright checks across desktop and mobile, plus TypeScript, lint and production build checks.

## Safety and privacy by design

- no account and no server database of cases;
- browser-only Case storage with a 90-day inactivity option or session-only option;
- prominent delete-and-start-over control;
- deterministic 112 stop before AI;
- no diagnosis, treatment prescription, legal conclusion or benefit guarantee;
- detection and redaction of email, phone and NIE/DNI-like numbers before AI processing;
- official-source allowlist and preliminary-guidance labels;
- consultation Demo Mode accepts fictional details and sends nothing;
- real email delivery requires an explicit server-side flag and complete protected configuration;
- honeypot, request-size limit, strict allowlist validation and best-effort hashed-network rate limiting;
- neutral consultation email subject with no health details.

This competition MVP is not presented as a public real-data pilot. Legal notice, final privacy notice, DPIA, processor review, production platform rate limiting and operational mailbox procedures remain gates before real use.

## Languages and scope

- Interface and navigation: Russian, Ukrainian and English.
- Official draft correspondence: Russian, Ukrainian, English and Spanish.
- Current jurisdiction: Spain → Asturias, with an initial focus on Oviedo.
- Current topics: healthcare, disability recognition, education, social support, residence/protection navigation and documents.

## Architecture at a glance

```text
Browser
  ├─ local/session Case storage
  ├─ deterministic triage + local demo plan
  ├─ optional one-time fictional Case ──> GPT-5.6 Terra ──> deterministic postflight
  └─ optional minimal preview ──────────> consultation API ──> demo receipt OR protected FORA email

Reviewed source registry ──> plan evidence metadata
Monthly protected cron ────> source-review reminder (no user data)
```

There is no path from the consultation API to browser Case storage, and no path from source-review reminders to user data.

## Demonstration path for judges

1. Open the Russian landing page and switch to English to show global localisation.
2. Select the fictional “Teenager, age 16” case.
3. Complete the short intake and review the editable summary.
4. Choose the local pathway to show a zero-key, zero-network-AI result.
5. Open the pathway, document checklist, Spanish draft and evidence panel.
6. Open Consultation, compare peer consultant and specialist, enter `demo.user@example.test`, inspect the exact preview and approve the demo consent.
7. Submit and show the receipt stating that nothing was sent.
8. If time allows, return to review and open the GPT-5.6 disclosure to show that the external path stays disabled until separate consent.

## Current proof

- Competition Preview: [fora-navigator-source.vercel.app](https://fora-navigator-source.vercel.app);
- `pnpm typecheck` — pass;
- `pnpm lint` — pass;
- `pnpm test` — 58/58 pass;
- `pnpm build` — pass;
- `pnpm test:e2e` — 16/16 desktop/mobile pass;
- live OpenAI smoke — intentionally not run because no approved API key was provided;
- real consultation email — intentionally not sent; competition configuration remains Demo Mode.
- deployed smoke — pass: fictional intake, local plan and consultation demo receipt completed in the published app; `GET /api/consultation` returned `mode: demo`, `acceptsRealData: false` and `Cache-Control: no-store`.

## Roadmap

### Before a real-data pilot

- owner-approved legal and privacy notices, DPIA and processor review;
- final emergency/contact registry review;
- verified sender domain and mailbox access/deletion procedure;
- platform-level distributed rate limiting;
- production monitoring that contains no Case text or stable user identifier;
- small supervised evaluation with fictional and consented test cases.

### After funding

- expert review panel for clinical/legal content boundaries;
- protected organisation-knowledge workflow for FORA-owned chat/video material;
- additional Spanish regions and municipalities;
- accessible case-history service for users who explicitly choose an account;
- evaluation dashboard for correctness, usefulness, source freshness and human escalation outcomes.

## Submission notes to complete later

- Production demo URL: `https://fora-navigator-source.vercel.app`
- Repository URL: `[add after publication]`
- Video URL: `[add after recording]`
- Team members: `Elena Bagaradnikova — product owner, FORA domain expertise; [add others if applicable]`
