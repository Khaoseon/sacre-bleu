# Repository conventions

- Read `docs/SPEC.md` for behavior and business rules, and `docs/PLAN.md` for each phase's scope and validation.
- Keep the interface and messages in French, mobile first, with keyboard- and touch-accessible controls.
- Use strict TypeScript. Keep pure business rules in `src/model.ts`, persistence in `src/storage.ts` and components under `src/`.
- Never show a successful mutation before the write actually completes. Quantities are integers and never negative; retain products at zero stock.
- Test changed business rules. Before delivery run `npm test`, `npm run typecheck`, `npm run build` and `npm run format:check`.
- Limit dependencies and lock versions with `package-lock.json`. Never commit secrets, personal data or `.env` files.
- No remote service or deployment without an explicit request corresponding to the project phase.
- For backend work, read `docs/BACKEND.md`. Every shared mutation uses an authorized RPC; preserve RLS reads, explicit privileges and an empty `search_path` on privileged functions.
- After a migration, start from a fresh local database, run pgTAP, concurrency and Auth/API tests, then regenerate `src/backend/database.generated.ts` with `npm run db:types`; never edit it by hand. Never run local fixtures on hosted services.
