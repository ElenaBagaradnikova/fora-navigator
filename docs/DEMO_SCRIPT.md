# FORA Navigator — final demo video script (2:50 maximum)

## Non-negotiable submission requirements

- Public YouTube video.
- Final runtime under 3:00; aim for 2:40–2:50.
- English voiceover or an accurate English translation.
- The voiceover must explicitly explain what was built, how Codex was used and how GPT-5.6 was used.
- No copyrighted music, third-party footage, notifications, personal mailbox or real family data.

## Recording setup

- URL: https://fora-navigator-source.vercel.app
- Desktop viewport around 1440 × 900, browser zoom 100%.
- Start in Russian, then switch to English on camera.
- Use only the built-in fictional “Teenager, age 16” case.
- Keep `demo.user@example.test` ready to paste.
- Record the browser only; hide bookmarks and desktop notifications.
- Add the ready English captions from [`FORA_NAVIGATOR_CAPTIONS_EN.srt`](./FORA_NAVIGATOR_CAPTIONS_EN.srt) after recording.

## Timed shot list and exact English narration

### 0:00–0:14 — Hook

**Screen:** Landing hero, then the three fictional case cards.

**Voiceover:**

> Moving country while supporting a child with a disability means navigating healthcare, school, social services, documents and protection status at the same time. Search gives a family links. FORA Navigator gives them a pathway.

### 0:14–0:32 — Audience and languages

**Screen:** Switch `RU → EN`; select “Teenager, age 16”.

**Voiceover:**

> This Build Week MVP is for migrant families in Asturias, Spain. It works in Russian, Ukrainian and English, and prepares official-message drafts in those languages plus Spanish. Every person and detail in this demo is fictional.

### 0:32–0:52 — Adaptive intake and emergency boundary

**Screen:** Move quickly through municipality, status, healthcare, documents and urgency. Show progress.

**Voiceover:**

> A short intake asks only questions that change the route, including the document a person actually holds. Deterministic emergency screening happens before normal navigation: immediate danger stops the administrative flow and points to verified emergency help.

### 0:52–1:08 — Review and processing choice

**Screen:** Case Summary; show Edit. Show local/GPT cards and open the GPT disclosure, then choose local.

**Voiceover:**

> Before generation, the family can correct the structured Case. They then choose local processing or a separately consented GPT-5.6 Terra route. The public preview uses the stable local path and never presents it as a live model result.

### 1:08–1:35 — Transparent Case Reasoning

**Screen:** Plan header, three priorities, dependency map; open one action.

**Voiceover:**

> Instead of a long chatbot answer, FORA Navigator shows three immediate priorities and the dependencies that unlock later actions. Each step explains what to do, why, where to go, which documents to prepare, the expected result, likely obstacles and what still needs human verification.

### 1:35–1:55 — Documents, letters and evidence

**Screen:** Documents; Letters with Spanish visible; Trust/Evidence with source dates.

**Voiceover:**

> Documents are deduplicated across the Case. Drafts are available in four languages and are never sent automatically. Official sources carry jurisdiction, confidence, the last verification date and the next scheduled human review. The model cannot invent this metadata.

### 1:55–2:17 — Human handoff

**Screen:** Consultation; toggle Peer consultant/Specialist; enter demo contact; show preview; consent; submit; hold on receipt.

**Voiceover:**

> AI is not the end of support. A person can request a peer consultant with lived experience or a specialist. This endpoint cannot access the Case. It can receive only the fields shown in this preview and needs an independent consent. In the competition build, it sends nothing and returns a clearly labelled demo receipt.

### 2:17–2:39 — Codex and GPT-5.6, explicitly

**Screen:** Brief architecture overlay or repository screenshot, then return to the product.

**Voiceover:**

> I built FORA Navigator with Codex as my product and engineering partner. Codex helped turn domain experience into a bounded specification, implement multilingual UX and typed safety contracts, repair sources, diagnose a production-only build bug, and create the test matrix. GPT-5.6 Terra powers the optional Responses API planner with Structured Outputs; deterministic code then checks sources, dependencies, personal identifiers and prohibited guarantees.

### 2:39–2:51 — Proof and close

**Screen:** Small overlay: `58 tests · 16 desktop/mobile checks · Vercel`; finish on three priorities or hero.

**Voiceover:**

> The result is live on Vercel, tested across desktop and mobile, and usable without an account or API key. FORA Navigator turns uncertainty into an actionable, checkable plan — while keeping the family in control of every data boundary.

## Edit checklist

- [ ] Runtime is 2:51 or shorter.
- [ ] Product name is visible in the first five seconds.
- [ ] Demo Mode label is visible.
- [ ] The fictional-case label is visible.
- [ ] GPT-5.6 choice and disclosure are shown, without claiming the local output is live AI.
- [ ] One dependency, a Spanish draft and one source-review date are readable.
- [ ] Consultation preview appears before consent.
- [ ] Demo receipt says nothing was sent.
- [ ] Codex and GPT-5.6 are both named in the audio.
- [ ] Captions use `GPT-5.6`, `Codex` and `FORA Navigator` consistently.
- [ ] No copyrighted music or real personal data is present.
- [ ] Video is public on YouTube.

## 60-second backup narration

> FORA Navigator helps migrant families supporting a person with a disability navigate connected healthcare, education, social-support and protection tasks. A short multilingual intake becomes a prioritised pathway, shared document checklist, four-language draft messages and evidence cards with human review dates. The safe default is local. An optional GPT-5.6 Terra route uses Responses API Structured Outputs and deterministic checks. A second independent consent lets the user share only a visible minimal preview with a peer consultant or specialist; the consultation API cannot access the Case. I used Codex to scope the product, implement the multilingual contracts and safety gates, repair sources, diagnose production issues and build the tests. This is not AI replacing a social worker. It is AI organising complexity, official sources making claims checkable, and a person remaining available when judgment or support is needed.
