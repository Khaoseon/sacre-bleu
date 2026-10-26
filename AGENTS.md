# Conventions du dépôt

- Lire `docs/SPEC.md` pour les comportements et règles métier, `docs/PLAN.md` pour le périmètre et les validations de chaque étape.
- Interface et messages en français, mobile d’abord, contrôles accessibles au clavier et au toucher.
- TypeScript strict. Garder les règles métier pures dans `src/model.ts`, le stockage dans `src/storage.ts` et les composants dans `src/`.
- Ne jamais afficher une mutation réussie avant l’écriture effective. Quantités entières, jamais négatives ; conserver les produits à zéro.
- Tester les règles métier modifiées. Avant livraison : `npm test`, `npm run typecheck`, `npm run build`, `npm run format:check`.
- Dépendances limitées, versions verrouillées avec `package-lock.json`. Ne jamais versionner de secrets, données personnelles ou fichiers `.env`.
- Aucun service distant ni déploiement sans demande explicite correspondant à l’étape du projet.
