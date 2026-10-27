import type { ReactNode } from 'react';

/**
 * Renders policy text written with light markdown: "## " headings, "- " bullets and blank-line
 * paragraphs. Everything is output as React text nodes (never HTML), so admin-entered content
 * cannot inject markup.
 */
export const PolicyText = ({ content }: { content: string }) => {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) {
      blocks.push(<p key={`p${blocks.length}`}>{paragraph.join(' ')}</p>);
      paragraph = [];
    }
    if (bullets.length) {
      blocks.push(
        <ul key={`u${blocks.length}`} className="list-disc space-y-1.5 pl-5">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  for (const raw of content.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push(
        <h2 key={`h${blocks.length}`} className="pt-4 font-display text-2xl font-semibold text-charcoal-900 first:pt-0">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith('- ')) {
      if (paragraph.length) flush();
      bullets.push(line.slice(2));
    } else {
      if (bullets.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return <div className="space-y-3 text-sm leading-relaxed text-charcoal-700 sm:text-base">{blocks}</div>;
};
