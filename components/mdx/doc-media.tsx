import { ExternalIcon, ImageIcon } from './icons';

type MediaProps = { alt?: string; caption?: string; origin?: string };

/** 원문 이미지·영상은 nextjs.org에만 있으므로 설명과 원문 링크로 대신한다. */
function MediaPlaceholder({ label, text, origin }: { label: string; text?: string; origin?: string }) {
  return (
    <figure className="media-placeholder">
      <ImageIcon />
      {text ? <p className="media-placeholder__text">{text}</p> : null}
      {origin ? (
        <a href={origin} target="_blank" rel="noreferrer" className="media-placeholder__link">
          {label}은 원문 페이지에서 볼 수 있습니다 <ExternalIcon />
        </a>
      ) : null}
    </figure>
  );
}

export function DocImage({ alt, origin }: MediaProps) {
  return <MediaPlaceholder label="이미지" text={alt} origin={origin} />;
}

export function DocVideo({ caption, alt, origin }: MediaProps) {
  return <MediaPlaceholder label="영상" text={caption ?? alt} origin={origin} />;
}
