# CBIEV QUIZ POP!
A lightweight, mobile-first booth quiz for IIPC 2026. HTML, CSS and vanilla JavaScript; no dependencies, build step, participant storage, analytics or external services. The only participant network request is the same-site published question bank. The published bank contains the 10 official CBIEV questions supplied by the booth team.

## Run locally
From this directory, run `python3 -m http.server 8000`. Open http://localhost:8000 for the quiz and http://localhost:8000/admin.html for the editor. Do not open the HTML via file://; browsers may block JSON fetching. Stop the server with Ctrl+C.

## Edit and publish questions
1. Open admin.html through the HTTP server. The tool restores this browser's local draft, or loads the published bank if no draft exists.
2. Click New question, enter question text and four distinct answers, choose the correct answer, and optionally add an explanation. Toggle Enabled as needed. Click **Save to local draft**. Use Edit or Delete for existing questions; deletion requires confirmation.
3. Set questions per round (1–100, default 3). Rounds use all active questions when fewer than the configured number are available.
4. To import, select an existing questions.json file and confirm replacement. Invalid files leave the draft unchanged. Reset Draft reloads the published bank after confirmation.
5. Save any open form edits, then click **Export questions.json**. Export validates the full bank, including disabled questions. It downloads settings and questions; it does not update the live website.
6. Replace `data/questions.json` in this project with the downloaded file (rename it if the browser added a suffix). Commit and upload that file to your hosted website. Preview published quiz opens the actual published JSON, never the local draft.
7. Reload the hosted quiz and verify content before generating or printing its QR code.

Draft storage is browser-specific and may be cleared or unavailable. Keep exported backups. Only admin drafts use localStorage. The admin page has no authentication and is not a secure dashboard; visitors cannot publish through it. Hosting/repository access controls who can publish.

## Data format
The root object contains `settings: { "questionsPerRound": 3 }` and a `questions` array. Every question has a unique nonempty string `id`, nonempty `question`, exactly four distinct nonempty string `options`, integer `correctAnswer` from 0 to 3 (original option order), string `explanation` (empty allowed), and boolean `enabled`. The quiz shuffles option objects with their original indexes so correctness stays intact. Empty banks or banks with no active questions show a friendly unavailable screen. Any malformed question rejects the bank rather than silently publishing bad content.

## Branding
The header uses centered CBIEV QUIZ POP! text branding. No logo assets are included.

## GitHub Pages
1. Create a GitHub repository and upload index.html, admin.html, css/, js/, data/, assets/ (if used), and README.md at its root.
2. In repository Settings → Pages, select deployment from a branch, choose your branch (usually main) and `/ (root)`, then save.
3. Wait for the Pages deployment to finish and open the URL GitHub provides, typically `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.
4. Verify the quiz and admin page at that URL. All paths are relative and support repository subdirectories. Create the booth QR code using the participant URL, not admin.html.
5. Publish future content by replacing data/questions.json and committing to the selected branch. Wait for deployment and reload to verify.

## Manual test checklist
- On iPhone Safari and Android Chrome: check 320px and larger widths, portrait/landscape, readable text, no horizontal scrolling, and comfortable tap targets.
- Start: three distinct questions appear by default; repeat rounds to observe different order/subsets.
- Compare each answer to JSON after options shuffle. Correct answer stays correct regardless of letter.
- Tap correct and incorrect answers: all options lock, correct answer and explanation appear, and continuation remains available. Rapid double taps must not skip a question.
- Complete: verify exact gift message, count, confetti, and Play Again. No score, personal information or login is requested.
- Keyboard: Tab through buttons and editor fields; verify visible focus and Enter/Space operation. Enable reduced motion and confirm confetti is absent.
- Admin: add, edit, disable and delete; cancel deletion; reload and verify draft restoration and counts.
- Export then import: verify settings, IDs, options, correctness and enabled flags survive the round trip. Preview must still show published content until the file is replaced.
- Import malformed JSON, duplicate IDs, missing fields, invalid indexes and duplicate options: clear errors, existing draft preserved.
- Test missing JSON, invalid published JSON, empty bank and all disabled questions: friendly message, retry available. Test one active question with round length three.
- Reset Draft: cancel preserves edits; confirm restores published bank. With JSON unavailable, reset preserves draft.
- Check browser storage: no participant data is saved. With storage blocked, editor warns and export still works.

## Automatic progression
The editor’s Auto-Advance Delay setting accepts whole seconds from 2–10 (default 3), saved as `settings.autoAdvanceDelay`. Older JSON files and drafts default to 3 when this field is absent. Export and publish as usual. Answering locks all options and starts the visible countdown; Next Now advances immediately. The last answer opens completion, which stays until Play Again. Timers pause while the page is hidden. Reduced motion disables decorative animation, not the countdown.

Verify three-question rounds with both correct and incorrect answers, countdown expiry, repeated answer taps, repeated Next Now taps, background/return during countdown and transition, and restart from completion. Test delays 2 and 10, reject 1/11/fractions, and import an older bank. On phones check the fixed feedback panel and long explanations; very long imported text may scroll within the panel.

If the editor restores an older sample draft, use Reset Draft and confirm to load the current official bank, or import data/questions.json. Existing local drafts are preserved until you explicitly replace them.
