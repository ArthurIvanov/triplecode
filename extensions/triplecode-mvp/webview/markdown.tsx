import type { ReactNode } from 'react';
import { parseMarkdown, safeHref, type InlineNode, type BlockNode } from './markdown-parse';

function renderInlines(nodes: InlineNode[]): ReactNode[] {
  return (nodes || []).map((node, index) => {
    if (node.type === 'text') return <span key={index}>{node.text}</span>;
    if (node.type === 'code') return <code key={index} className="md-code">{node.text}</code>;
    if (node.type === 'strong') return <strong key={index}>{renderInlines(node.children)}</strong>;
    if (node.type === 'em') return <em key={index}>{renderInlines(node.children)}</em>;
    if (node.type === 'link') {
      const href = safeHref(node.href || '');
      if (!href) return <span key={index}>{renderInlines(node.children)}</span>;
      return <a key={index} href={href} title={href} rel="noreferrer noopener">{renderInlines(node.children)}</a>;
    }
    return null;
  });
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source) as BlockNode[];
  return (
    <div className={className ? `md ${className}` : 'md'}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Tag = (block.level === 1 ? 'h3' : block.level === 2 ? 'h4' : 'h5') as 'h3' | 'h4' | 'h5';
          return <Tag key={index} className="md-h">{renderInlines(block.children)}</Tag>;
        }
        if (block.type === 'paragraph') {
          return <p key={index} className="md-p">{renderInlines(block.children)}</p>;
        }
        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag key={index} className="md-list">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlines(item.children)}</li>
              ))}
            </ListTag>
          );
        }
        if (block.type === 'code') {
          return (
            <pre key={index} className="md-pre" data-lang={block.lang || undefined}>
              <code>{block.text}</code>
            </pre>
          );
        }
        return null;
      })}
    </div>
  );
}
