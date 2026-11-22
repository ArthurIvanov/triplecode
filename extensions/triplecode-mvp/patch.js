'use strict';

const supportedLanguages = new Set([
  'javascript', 'javascriptreact', 'typescript', 'typescriptreact',
  'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'swift'
]);

function proposePatch(text, language, request, lineEnd) {
  const match = /^add a comment:\s*(.+)$/i.exec(request.trim());
  if (!supportedLanguages.has(language)) {
    throw new Error('Open a source file that supports // comments.');
  }
  if (!match) {
    throw new Error('For this preview, enter “Add a comment: your text”.');
  }

  const comment = `// ${match[1]}${lineEnd}`;
  const offset = text.startsWith('#!') ? text.indexOf('\n') + 1 : 0;
  if (text.startsWith('#!') && !offset) {
    return { offset: text.length, insertion: lineEnd + comment };
  }
  return { offset, insertion: comment };
}

module.exports = { proposePatch };
