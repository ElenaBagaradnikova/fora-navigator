# Safe Vercel Preview checklist

## Required competition settings

- Framework: Next.js.
- Build command: `pnpm build`.
- Install command: `pnpm install --frozen-lockfile`.
- Function region: `fra1` from `vercel.json`.
- `ENABLE_LIVE_AI=false` for Preview and Production.
- `ENABLE_CONSULTATION_HANDOFF=false` for Preview and Production.
- Do not add `OPENAI_API_KEY` or `RESEND_API_KEY` to the competition project.
- Do not connect a custom `ngo-fora.com` domain before the legal/privacy gate.

If the two feature-flag variables are absent, the application still fails closed. Setting them explicitly documents the intended deployment state and prevents a later team-level variable from changing the meaning silently.

## Before Deploy

- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] 59 unit/integration tests
- [x] 16 desktop/mobile Playwright checks
- [x] clean production build
- [x] consultation desktop/mobile visual review
- [x] selected personal Vercel team: `Bagaradnikova`
- [x] deployed endpoint fails closed: `mode: demo`, `acceptsRealData: false`

## After Deploy smoke test

1. Open the Preview URL in a private window.
2. Confirm the header says `Demo Mode`.
3. Switch RU → EN → УКР.
4. Complete the fictional “Teenager, age 16” scenario using the local pathway.
5. Confirm no request to `/api/navigate` occurs in the local path.
6. Open Consultation and confirm “Safe demonstration”.
7. Submit `demo.user@example.test` and confirm the receipt says nothing was sent.
8. Open `/api/consultation` and confirm `mode` is `demo` and `acceptsRealData` is `false`.
9. Confirm security response headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
10. Record the Preview URL in `COMPETITION_SUBMISSION.md`.

Published competition URL: [fora-navigator-source.vercel.app](https://fora-navigator-source.vercel.app)

Smoke result on 2026-07-19: homepage, fictional intake, local plan and consultation demo receipt passed in the published app. Direct read-only endpoint check returned HTTP 200 with `Cache-Control: no-store`; security headers `nosniff`, `DENY`, strict referrer policy and disabled camera/microphone/geolocation were present. A separate external Playwright process could not access the public URL because the local execution sandbox blocked outbound browser traffic; this is an environment restriction, not an application failure.

## Not part of the competition Preview

- real personal data;
- live OpenAI calls;
- real consultation email;
- analytics or custom funnel events;
- custom FORA domain;
- public promotion as an operational social-service channel.
