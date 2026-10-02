# FORA Navigator — Product v3 Specification

Status: working specification
Branch: product-v3
Product owner / domain owner: Elena Bagaradnikova
Initial jurisdiction: Spain — Asturias
Initial pilot: families of children and young people with disabilities / special educational needs; peer consultants; later professional and institutional users.

## 1. Product definition

FORA Navigator v3 is a case-navigation platform for complex disability-related situations. It converts a person's situation, documents and verified contextual facts into an evidence-grounded, dependency-aware route across healthcare, disability recognition, education, social support, documentation and relevant services.

The product is not a general chatbot. The primary object is a Case. The LLM is a bounded component used for unstructured understanding, extraction, synthesis and explanation. Rules, provenance, jurisdiction, safety and human escalation remain explicit product layers.

## 2. Design principles

1. One Case Engine, multiple role-specific views.
2. Jurisdiction is separated from language and document origin.
3. Facts extracted from documents are not automatically treated as verified truth.
4. Administrative and procedural claims must be traceable to evidence.
5. Deterministic rules should be used for eligibility, dependencies and deadlines whenever possible.
6. High-risk, ambiguous or unsupported conclusions must escalate to a human.
7. Core Navigator does not diagnose, prescribe treatment or make autonomous clinical decisions.
8. Data minimization: send only task-relevant structured context to an external model.
9. Provider abstraction: product logic must not depend directly on one LLM provider.
10. Existing competition MVP remains preserved on main; v3 development occurs on product-v3.

## 3. Core domain model

### Case
- id
- schemaVersion
- version
- createdAt / updatedAt
- currentLocation
- currentJurisdiction
- preferredLanguages
- household
- people
- needs
- goals
- facts
- unknowns
- risks
- documents
- events
- actions
- evidence
- consents
- jurisdictionContext
- history

### Person
No unnecessary direct identifiers in the navigation core.
- id
- role
- ageRange / age when legally necessary
- supportNeeds
- relationshipToCase
- relevantStatuses

### Fact
- id
- subjectId
- type
- value
- origin: user | document | professional | authority | system
- verificationStatus: extracted | user_confirmed | professional_confirmed | authority_confirmed | disputed
- sourceDocumentId?
- capturedAt
- validFrom?
- validTo?
- jurisdictionRelevance

### Document
- id
- documentType
- originCountry
- originJurisdiction?
- language
- issuerType
- issueDate?
- expiryDate?
- extractionStatus
- extractedFacts[]
- userConfirmedFacts[]
- storageReference
- sensitivity
- provenance

A document issued in another country may provide evidence of a historical diagnosis, assessment or event without automatically creating the equivalent legal or administrative status in Spain.

### Evidence
- id
- sourceId
- jurisdiction
- authority
- title
- url
- articleOrSection?
- version?
- effectiveFrom?
- effectiveTo?
- lastReviewedAt
- nextReviewAt
- confidence
- supportsClaims[]

### Action
- id
- jurisdiction
- domain
- priority
- timeframe
- responsibleParty
- prerequisites
- documentsNeeded
- destination
- expectedResult
- blockers
- evidenceIds
- confidence
- humanReviewRequired
- status

## 4. Jurisdiction architecture

Core code must not hard-code Asturias into Case semantics.

### JurisdictionPack
A versioned package contains:
- jurisdiction id
- geographic scope
- authorities and service directories
- official sources
- deterministic rules
- procedures
- document requirements
- deadlines
- escalation conditions
- terminology
- source review metadata
- regression tests

Initial package: ES-ASTURIAS.

Future packs may include other Spanish autonomous communities and other jurisdictions without replacing the core engine.

## 5. Case pipeline

ingest
→ normalize
→ safety triage
→ extract facts
→ user confirmation
→ resolve jurisdiction
→ retrieve applicable evidence
→ apply deterministic rules
→ identify unknowns/blockers
→ construct dependency graph
→ generate route
→ validate evidence/safety
→ explain to user
→ human escalation when required
→ audit event

## 6. Role views

### Family
- situation summary
- document checklist
- what to do now
- what can happen in parallel
- next steps and blockers
- where to go
- source-backed explanations
- editable draft communications
- deadlines/reminders later
- request peer consultant

### Peer consultant
- structured Case summary
- missing information
- unresolved questions
- proposed route
- evidence and source links
- suggested questions
- red flags
- draft response
- escalation to specialist
- consultation notes

The system explains the facts, rules and sources supporting a proposed step; it does not expose hidden model chain-of-thought.

### Professional / clinic
Initial v3 scope is case review and navigation, not autonomous clinical decision support:
- timeline
- documents
- statuses
- missing information
- route
- family questions
- evidence
- handoff / referral status

## 7. Human escalation

Self-service
→ AI Navigator
→ Peer Consultant
→ Specialist / Professional
→ Institution

The Case should travel through the workflow with explicit consent and minimum necessary data.

## 8. LLM provider boundary

Create an LLMProvider interface.

Adapters:
- OpenAIAdapter
- future alternative cloud provider
- future local/self-hosted provider

LLM tasks:
- narrative normalization
- document classification/extraction
- identifying possible missing information
- summarization
- multilingual explanation
- draft generation

LLM must not be the authoritative source of legal/administrative rules.

## 9. Document Intelligence — target alpha

Supported initial inputs:
- PDF
- JPG/PNG
- selected DOCX

Flow:
upload
→ classify document
→ extract candidate facts
→ show extracted facts to user
→ user confirms/corrects/rejects
→ confirmed facts enter Case
→ Case version increments
→ route becomes stale
→ route recalculates

No real sensitive documents should be used in the public prototype until the privacy/security architecture is approved.

## 10. Safety and privacy gates

Before real-data pilot:
- GDPR role mapping
- data-flow map
- lawful-basis analysis
- consent model where applicable
- DPIA assessment
- processor/subprocessor review
- retention/deletion policy
- encryption
- RBAC
- audit logs
- incident process
- external security review
- explicit policy for health/special-category data and external LLM processing

## 11. Alpha milestone — 14 October 2026

Demonstrate:
1. Case creation.
2. Current jurisdiction = Asturias.
3. Document origin can differ from current jurisdiction.
4. Foreign document evidence does not automatically equal Spanish administrative status.
5. Missing information is identified.
6. Initial route is dependency-aware.
7. Material steps link to evidence.
8. Peer-consultant handoff remains available.
9. No autonomous medical/legal final decisions.
10. Architecture visibly supports additional Jurisdiction Packs.

## 12. Sprint 1 — Case v3 foundation

Goal: refactor the competition-specific Case model without breaking the existing navigation flow.

Tasks:
- introduce core Case v3 types/schemas
- separate location, language, document origin and jurisdiction
- add Fact schema and verification states
- add Document metadata schema without file upload yet
- add JurisdictionContext
- preserve compatibility adapter from current UserCase
- create ES-ASTURIAS jurisdiction identifier/package boundary
- add unit tests for cross-border document semantics
- do not change production main
- do not enable real-data Live AI

Acceptance tests:
- a Case in Asturias can contain a Russian-language document issued in Russia
- that document can support an extracted historical fact
- the fact remains extracted until confirmed
- no rule converts foreign diagnostic evidence directly into Spanish disability recognition
- current competition demo can still produce a plan through compatibility layer
- lint, typecheck and unit tests pass

## 13. Sprint 2 — Document Intelligence skeleton

Only after Sprint 1 passes:
- upload UI for synthetic documents
- document classifier contract
- extraction schema
- confirmation UI
- provenance links
- route invalidation on confirmed fact changes
- synthetic test corpus

## 14. Out of scope for current alpha

- real patient medical records
- autonomous diagnosis/treatment
- medical-device clinical decision support
- direct submission to Spanish authorities
- automatic legal conclusions
- Russia production deployment
- multi-tenant institutional accounts
- billing
- full analytics
- EHR/MIS integrations

## 15. Repository migration map

Existing:
- lib/schemas.ts
- lib/ai/*
- lib/safety/*
- lib/knowledge/*
- lib/consultation/*

Target gradual structure:
- core/case
- core/documents
- core/case-graph
- core/rules
- core/routes
- core/evidence
- core/audit
- core/safety
- jurisdictions/es/asturias
- providers/llm/openai
- modules/handoff

Migration must be incremental. Do not perform a large-bang rewrite.

## 16. Definition of Done for every engineering change

- requirement mapped to this spec or an approved issue
- types/schema updated
- tests added/updated
- lint passes
- typecheck passes
- unit tests pass
- safety/evidence behavior not weakened
- no secrets or real personal data committed
- change reviewed in diff before merge
