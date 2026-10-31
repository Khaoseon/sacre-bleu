import { useState, type ReactNode, type Ref } from 'react';

type ProductMediaProps = {
  src?: string;
  /** Empty when adjacent product text already names the image. */
  alt: string;
  fallback: ReactNode;
  className?: string;
  mediaRef?: Ref<HTMLSpanElement>;
  title?: string;
};

/** Presentation only. The caller validates sources and retains provenance/credits. */
export function ProductMedia({ src, ...props }: ProductMediaProps) {
  // A new source gets fresh error state, including A → B → A retries.
  return (
    <span
      ref={props.mediaRef}
      title={props.title}
      className={`sb-product-media ${props.className ?? ''}`}
    >
      <MediaSource key={src ?? ''} src={src} {...props} />
    </span>
  );
}

function MediaSource({ src, alt, fallback }: ProductMediaProps) {
  const [failed, setFailed] = useState(false);
  return (
    <>
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
    </>
  );
}
