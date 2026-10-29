const baselineVersions = ['20261026000100', '20261026000200', '20261026000300'];
const phase4Version = '20261028000100';
const lookupBudgetVersion = '20261029000100';
const baselineTables = [
  'auth.users',
  'auth.identities',
  'public.reserves',
  'public.reserve_members',
  'public.products',
  'public.product_stock',
  'public.shopping_items',
  'private.invitations',
  'private.requests',
  'private.scan_operations',
];

/** Only the explicit, reviewed phase-4 predeployment state may differ from local. */
export function backupPlan(rows, filenames, beforePhase4 = false, beforeLookupBudget = false) {
  if (beforePhase4 && beforeLookupBudget)
    throw new Error('Choisir un seul précontrôle de migration.');
  if (
    !Array.isArray(rows) ||
    !Array.isArray(filenames) ||
    filenames.some((name) => !/^\d{14}_[a-z0-9_]+\.sql$/.test(name))
  )
    throw new Error('Inventaire des migrations invalide.');
  const names = [...filenames].sort();
  const local = rows.map((row) => row?.local);
  if (
    names.length !== rows.length ||
    new Set(local).size !== local.length ||
    names.some((name, index) => name.slice(0, 14) !== local[index])
  )
    throw new Error('Inventaire local et sources versionnées différents.');
  const supported = [
    ...baselineVersions,
    ...(rows.length >= 4 ? [phase4Version] : []),
    ...(rows.length === 5 ? [lookupBudgetVersion] : []),
  ];
  if (
    local.length !== supported.length ||
    local.some((version, index) => version !== supported[index])
  )
    throw new Error('Historique non prévu pour cette sauvegarde : examiner avant de continuer.');
  const applied = rows.filter((row) => row.remote);
  if (applied.some((row) => row.local !== row.remote))
    throw new Error('Historique distant divergent.');
  if (beforePhase4) {
    if (
      rows.length !== 4 ||
      applied.length !== 3 ||
      rows[3].local !== phase4Version ||
      rows[3].remote ||
      rows.slice(0, 3).some((row) => row.local !== row.remote)
    )
      throw new Error(
        'Le mode avant phase 4 exige exactement les trois migrations de référence appliquées et la seule phase 4 en attente.',
      );
  } else if (beforeLookupBudget) {
    if (
      rows.length !== 5 ||
      applied.length !== 4 ||
      rows[4].local !== lookupBudgetVersion ||
      rows[4].remote ||
      rows.slice(0, 4).some((row) => row.local !== row.remote)
    )
      throw new Error(
        'Le précontrôle du budget OFF exige quatre migrations appliquées et cette seule migration en attente.',
      );
  } else if (applied.length !== rows.length) {
    throw new Error(
      'Migration en attente : utiliser le mode avant phase 4 uniquement après précontrôle.',
    );
  }
  return {
    appliedVersions: applied.map((row) => row.remote),
    pendingVersion: beforePhase4 ? phase4Version : beforeLookupBudget ? lookupBudgetVersion : null,
    files: names.filter((name) => applied.some((row) => name.startsWith(row.remote + '_'))),
    tables: [
      ...baselineTables,
      ...(applied.some((row) => row.remote === phase4Version)
        ? ['private.product_lookup_gate']
        : []),
    ].sort(),
  };
}

/** Digest-only query: no private row contents leave PostgreSQL through this audit. */
export function fingerprintSQL(tables) {
  if (
    !Array.isArray(tables) ||
    !tables.length ||
    new Set(tables).size !== tables.length ||
    tables.some((name) => ![...baselineTables, 'private.product_lookup_gate'].includes(name))
  )
    throw new Error('Table hors du périmètre de sauvegarde.');
  return `select jsonb_build_object(${tables.map((name) => `'${name}',(select encode(extensions.digest(coalesce(string_agg(to_jsonb(t)::text,E'\\n' order by to_jsonb(t)::text collate "C"),''),'sha256'),'hex') from ${name} t)`).join(',')}) as fingerprint`;
}

export function sameFingerprint(a, b, tables) {
  return (
    a &&
    b &&
    Object.keys(a).length === tables.length &&
    Object.keys(b).length === tables.length &&
    tables.every(
      (name) =>
        typeof a[name] === 'string' && /^[a-f0-9]{64}$/.test(a[name]) && a[name] === b[name],
    )
  );
}
