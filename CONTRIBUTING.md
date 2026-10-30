# Contributing

Issues and focused pull requests are welcome. Sacré bleu is a small personal project maintained voluntarily: there is no support deadline, roadmap commitment or obligation to accept a contribution. Discuss substantial changes in an issue first. English is preferred for repository documentation and discussion; application labels and user-facing errors support French (default) and English. See [localization conventions](docs/I18N.md) before adding interface text.

## Work locally

Read [the product rules](docs/SPEC.md), [scope](docs/PLAN.md) and [installation guide](docs/INSTALL.md). Use Node.js 24+, `npm ci` and `npm run dev -- --strictPort` for the isolated demo. For the shared path, start Docker with Linux containers, then `npm run db:start` and `npm run env:local`. Mailpit captures local email at http://127.0.0.1:55324. Use fictitious accounts and disposable pantry data.

Keep a full-history clone: shared integration tests load an earlier installed client from Git. Work on a branch, keep changes focused, and describe the problem, resulting behavior, checks and limitations in the PR. Screenshots are not currently requested while a UI redesign is deferred.

## Preserve the contracts

- Strict TypeScript; pure business rules in `src/model.ts`, persistence in `src/storage.ts`, components under `src/`. Mobile first, keyboard and touch accessible.
- Whole quantities, never negative; keep zero-stock products. Show success only after effective storage; shared mutations also require a current snapshot.
- Shared writes use authorized RPCs. Preserve RLS reads, explicit privileges, request idempotency, empty privileged-function `search_path` and generated database types. Read [BACKEND.md](docs/BACKEND.md) before changing SQL.
- Keep dependencies limited and exact versions in `package-lock.json`. Update [redistribution notices](THIRD_PARTY_NOTICES.md) when bundled packages change.
- Do not commit secrets, `.env` files, personal inventories, email addresses, private JSON exports, invitation fragments or production logs. Do not run local fixtures on hosted services.

## Before submitting

```sh
npm test
npm run typecheck
npm run build
npm run format:check
npm run notices:check
```

Test changed business rules and relevant failures. For a migration, use a disposable local stack: `npm run db:reset` **erases its data**. Run pgTAP, concurrency and Auth/API, then `npm run db:types`; never edit `src/backend/database.generated.ts` by hand. Follow [TESTING.md](docs/TESTING.md) for shared/browser checks. Record checks you could not run rather than claiming CI proves device compatibility.

No deployment, remote migration, repository setting change or merge is part of a contribution. The original `main` deploys automatically after merge; maintainers must review deployment impact even for documentation/metadata PRs.

Submit only material you have permission to contribute under MIT. Third-party assets and data must retain their licenses and attribution; the [mascot credit and MIT notice](assets/branding/README.md) must be preserved. For a security concern, use [SECURITY.md](SECURITY.md), not a public issue or PR.
