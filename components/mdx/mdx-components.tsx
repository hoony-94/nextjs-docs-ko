import Link from 'next/link';
import type { ComponentProps, ElementType, ReactNode } from 'react';
import { CodeBlock } from './code-block';
import { CodeSwitcher } from './code-switcher';
import { DocImage, DocVideo } from './doc-media';
import { FixCard, FixCardGrid } from './fix-card';
import { Check, Cross } from './icons';

function DocLink({ href = '', children, ...rest }: ComponentProps<'a'>) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  const external = /^https?:/.test(href);
  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} {...rest}>
      {children}
    </a>
  );
}

function Table(props: ComponentProps<'table'>) {
  return (
    <div className="table-wrap">
      <table {...props} />
    </div>
  );
}

function Img({ src, alt }: ComponentProps<'img'>) {
  if (typeof src === 'string' && /^https?:/.test(src)) {
    // eslint-disable-next-line @next/next/no-img-element -- 외부 문서 이미지라 크기를 알 수 없다
    return <img src={src} alt={alt ?? ''} loading="lazy" />;
  }
  return <DocImage alt={alt} />;
}

function UnknownComponent({ children }: { name?: string; children?: ReactNode }) {
  return <div className="unknown-component">{children}</div>;
}

function Passthrough({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export const mdxComponents: Record<string, ElementType> = {
  a: DocLink,
  table: Table,
  img: Img,
  AppOnly: Passthrough,
  PagesOnly: () => null,
  Image: DocImage,
  Video: DocVideo,
  Check,
  Cross,
  FixCard,
  FixCardGrid,
  CodeBlock,
  CodeSwitcher,
  UnknownComponent,
};
