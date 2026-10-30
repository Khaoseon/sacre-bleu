/** Plural forms use Intl.PluralRules; both supported languages use one/other. */
export const plurals = {
  packages: {
    fr: { one: '{0} emballage', other: '{0} emballages' },
    en: { one: '{0} package', other: '{0} packages' },
  },
  productLabel: {
    fr: { one: 'produit', other: 'produits' },
    en: { one: 'product', other: 'products' },
  },
  stockLabel: {
    fr: { one: 'emballage en stock', other: 'emballages en stock' },
    en: { one: 'package in stock', other: 'packages in stock' },
  },
  restock: {
    fr: { one: '{0} produit à réapprovisionner', other: '{0} produits à réapprovisionner' },
    en: { one: '{0} product to restock', other: '{0} products to restock' },
  },
  shopping: {
    fr: {
      one: '{0} article pour remplir les étagères.',
      other: '{0} articles pour remplir les étagères.',
    },
    en: { one: '{0} item to fill the shelves.', other: '{0} items to fill the shelves.' },
  },
  scanAdded: {
    fr: { one: 'emballage ajouté · {0} en stock', other: 'emballages ajoutés · {0} en stock' },
    en: { one: 'package added · {0} in stock', other: 'packages added · {0} in stock' },
  },
  scanRemoved: {
    fr: { one: 'emballage retiré · {0} en stock', other: 'emballages retirés · {0} en stock' },
    en: { one: 'package removed · {0} in stock', other: 'packages removed · {0} in stock' },
  },
} as const;
