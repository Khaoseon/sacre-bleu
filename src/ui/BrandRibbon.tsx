/** Original vector signature, inspired by flowing 1970s print ribbons.
 * Kept outside product media and controls; no motion or external resource. */
export function BrandRibbon() {
  return (
    <svg
      className="brand-ribbon"
      viewBox="0 0 600 28"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path className="ribbon-petrol" d="M-10 26C140-38 235 66 365 12S520-8 610 15" />
      <path className="ribbon-teal" d="M-10 32C140-32 235 72 365 18S520-2 610 21" />
      <path className="ribbon-terra" d="M-10 38C140-26 235 78 365 24S520 4 610 27" />
      <path className="ribbon-saffron" d="M-10 44C140-20 235 84 365 30S520 10 610 33" />
    </svg>
  );
}
