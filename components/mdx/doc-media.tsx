import { DOCS_MEDIA_ORIGIN } from '@/lib/site';

type MediaProps = {
  src?: string;
  srcLight?: string;
  srcDark?: string;
  width?: number | string;
  height?: number | string;
  alt?: string;
  caption?: string;
  /** remark-docs가 번역 파일에서 찾아 넣어 준다. */
  altKo?: string;
  captionKo?: string;
};

/** 원문의 미디어 경로(`/docs/light/x.png`)를 nextjs.org가 쓰는 저장소 주소로 바꾼다. */
export function mediaUrl(path: string) {
  if (/^https?:/.test(path)) return path;
  return `${DOCS_MEDIA_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** 설명 안의 `코드` 표기를 코드 서식으로 바꾼다. */
function withCode(text: string) {
  return text
    .split(/(`[^`]+`)/)
    .map((part, index) => (/^`[^`]+`$/.test(part) ? <code key={index}>{part.slice(1, -1)}</code> : part));
}

/** caption이 있으면 caption을, 없으면 alt를 원문 아래 번역 형태로 보여 준다. */
function MediaCaption({ alt, altKo, caption, captionKo }: MediaProps) {
  const en = caption ?? alt;
  const ko = caption ? captionKo : altKo;
  if (!en) return null;
  return (
    <figcaption className="doc-media__caption">
      <span className={ko ? 'en has-ko' : 'en'}>{withCode(en)}</span>
      {ko ? <span className="ko">{withCode(ko)}</span> : null}
    </figcaption>
  );
}

export function DocImage(props: MediaProps) {
  const { src, srcLight, srcDark, width, height, alt, altKo } = props;
  const light = srcLight ?? src;
  const sources = [
    { path: light, className: srcDark ? 'doc-media__light' : undefined },
    { path: srcDark, className: light ? 'doc-media__dark' : undefined },
  ].filter((source): source is { path: string; className: string | undefined } => Boolean(source.path));
  if (!sources.length) return null;

  return (
    <figure className="doc-media">
      {sources.map(({ path, className }) => (
        // eslint-disable-next-line @next/next/no-img-element -- 외부 저장소 이미지를 최적화 없이 그대로 쓴다
        <img
          key={path}
          src={mediaUrl(path)}
          alt={(altKo ?? alt ?? '').replaceAll('`', '')}
          width={width}
          height={height}
          className={className}
          loading="lazy"
          decoding="async"
        />
      ))}
      <MediaCaption {...props} />
    </figure>
  );
}

export function DocVideo(props: MediaProps) {
  const { src, width, height, alt, altKo, caption, captionKo } = props;
  if (!src) return null;

  return (
    <figure className="doc-media">
      <video
        src={mediaUrl(src)}
        width={width}
        height={height}
        aria-label={captionKo ?? caption ?? altKo ?? alt}
        controls
        playsInline
        preload="metadata"
      />
      <MediaCaption {...props} />
    </figure>
  );
}
