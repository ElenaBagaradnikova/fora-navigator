# OpenAI Build Week — FORA Navigator submission readiness

## Official requirements snapshot

- **Deadline:** July 21, 2026 at 5:00 PM PDT — July 22 at 02:00 CEST in Spain.
- **Track:** Apps for Your Life.
- **Language:** English submission materials, or an English translation.
- **Demo video:** public YouTube, under three minutes, with audio explaining the product, Codex use and GPT-5.6 use.
- **Repository:** public with relevant licensing, or private and shared with `testing@devpost.com` and `build-week-event@openai.com`.
- **Codex evidence:** `/feedback` Session ID from the primary build thread.
- **Testing access:** free, unrestricted working demo during judging.

Official references:

- https://openai.com/build-week/
- https://openai.devpost.com/
- https://openai.devpost.com/rules
- https://openai.devpost.com/details/faqs

## Ready

- [x] Working public project: https://fora-navigator-source.vercel.app
- [x] Category selected: Apps for Your Life
- [x] Final English Devpost copy: `docs/DEVPOST.md`
- [x] Final English voiceover and shot list: `docs/DEMO_SCRIPT.md`
- [x] Timed English captions: `docs/FORA_NAVIGATOR_CAPTIONS_EN.srt`
- [x] Four publication-ready English screenshots: `docs/assets/`
- [x] README with setup, testing, Codex and GPT-5.6 sections
- [x] Fictional sample data and no-login testing path
- [x] 58 unit/integration tests
- [x] 16 local desktop/mobile Playwright checks
- [x] Production Vercel smoke from intake to consultation receipt
- [x] Public demo fails closed: `mode: demo`, `acceptsRealData: false`

## Required before submission

- [ ] Record and edit the demo video to under 3:00.
- [ ] Upload it publicly to YouTube and add the URL to `docs/DEVPOST.md`.
- [x] Publish the public code repository: https://github.com/ElenaBagaradnikova/fora-navigator
- [x] Add the MIT open-source licence.
- [ ] Run `/feedback` in the primary Codex build thread and copy the Session ID.
- [x] Add the repository URL to `docs/DEVPOST.md`.
- [ ] Add the Session ID to `docs/DEVPOST.md`.
- [ ] Register/join the challenge on Devpost if not already done.
- [ ] Save a draft submission early; do not wait for the deadline.
- [ ] Verify every link in a private browser window.
- [ ] Submit before July 21, 2026 at 5:00 PM PDT.

## Recommended repository choice

A public repository is easiest for judges, but it requires confirming that all included assets, source excerpts and dependencies can be redistributed and adding a licence. A private repository avoids premature publication but must be shared with both judging addresses and kept accessible through the judging period.

Do not upload `.env.local`, API keys, mailbox credentials, `.next`, `node_modules`, `.pnpm-store`, local test results or Codex logs.

## Submission-day final pass

1. Open the Devpost draft and compare every required field with `docs/DEVPOST.md`.
2. Play the YouTube video while signed out; confirm audio and captions.
3. Open the repository while signed out, or verify both judging accounts have access.
4. Open the Vercel demo in a private window and submit one fictional consultation request.
5. Confirm the receipt says nothing was sent.
6. Confirm `/api/consultation` returns `mode: demo`.
7. Add `/feedback` Session ID.
8. Submit, then save the submission confirmation URL and a screenshot.
