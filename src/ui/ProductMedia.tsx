import { useState, type ReactNode } from 'react';

type ProductMediaProps = {
  src?: string;
  /** Empty when adjacent product text already names the image. */
  alt: string;
  fallback: ReactNode;
  className?: string;
};

/** Presentation only. The caller validates sources and retains provenance/credits. */
export function ProductMedia({ src, ...props }: ProductMediaProps) {
  // A new source gets fresh error state, including A → B → A retries.
  return <MediaSource key={src ?? ''} src={src} {...props} />;
}

function MediaSource({ src, alt, fallback, className = '' }: ProductMediaProps) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`sb-product-media ${className}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={!alt}>
          {fallback}
        </span>
      )}
    </span>
  );
}
