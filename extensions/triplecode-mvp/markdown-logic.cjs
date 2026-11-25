'use strict';

/**
 * Safe Markdown subset → block AST (no raw HTML).
 * Blocks: heading | paragraph | list | code | blank
 * Inlines: text | code | strong | em | link
 */

function escapeText(value) {
  return String(value ?? '');
}

function safeHref(href) {
  const raw = String(href || '').trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^mailto:/i.test(raw) && !/[\s<>]/.test(raw)) return raw;
  return null;
}

function parseInlines(input) {
  const text = escapeText(input);
  const nodes = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i) {
        nodes.push({ type: 'code', text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end > i) {
        nodes.push({ type: 'strong', children: parseInlines(text.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end > i) {
        nodes.push({ type: 'em', children: parseInlines(text.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    if (text[i] === '[') {
      const close = text.indexOf(']', i + 1);
      const openParen = close >= 0 ? text.indexOf('(', close + 1) : -1;
      const closeParen = openParen === close + 1 ? text.indexOf(')', openParen + 1) : -1;
      if (close > i && openParen === close + 1 && closeParen > openParen) {
        const label = text.slice(i + 1, close);
        const href = safeHref(text.slice(openParen + 1, closeParen));
        if (href) {
          nodes.push({ type: 'link', href, children: parseInlines(label) });
          i = closeParen + 1;
          continue;
        }
      }
    }
    let next = text.length;
    for (const marker of ['`', '*', '[', '\n']) {
      const at = text.indexOf(marker, i + 1);
      if (at >= 0 && at < next) next = at;
    }
    if (text.startsWith('**', i + 1)) next = Math.min(next, i + 1);
    nodes.push({ type: 'text', text: text.slice(i, next) });
    i = next;
  }
  return nodes.filter(node => node.type !== 'text' || node.text);
}

function parseMarkdown(source) {
  const text = String(source ?? '').replace(/\r\n/g, '\n');
  const blocks = [];
  const lines = text.split('\n');
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const fence = line.match(/^```([\w-]*)\s*$/);
    if (fence) {
      const lang = fence[1] || '';
      const body = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', lang, text: body.join('\n') });
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        children: parseInlines(heading[2].trim())
      });
      index += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const items = [];
      while (index < lines.length && (ordered ? /^\d+\.\s+/.test(lines[index]) : /^[-*]\s+/.test(lines[index]))) {
        items.push({
          children: parseInlines(lines[index].replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ''))
        });
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    const para = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() &&
      !/^```/.test(lines[index]) &&
      !/^#{1,3}\s+/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index])) {
      para.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: 'paragraph', children: parseInlines(para.join(' ')) });
  }
  return blocks;
}

/** Strip dangerous protocols for tests / host-side checks. */
function assertSafeMarkdownAst(blocks) {
  const issues = [];
  function walk(nodes) {
    for (const node of nodes || []) {
      if (node.type === 'link' && !safeHref(node.href)) issues.push(`bad-href:${node.href}`);
      if (node.type === 'text' && /<\/?[a-z]/i.test(node.text)) {
        /* literal angle brackets OK as text — never promoted to HTML */
      }
      if (node.children) walk(node.children);
      if (node.items) for (const item of node.items) walk(item.children);
    }
  }
  walk(blocks);
  return issues;
}

module.exports = {
  parseMarkdown,
  parseInlines,
  safeHref,
  assertSafeMarkdownAst
};
