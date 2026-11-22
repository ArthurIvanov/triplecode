'use strict';

const supportedLanguages = new Set([
  'javascript', 'javascriptreact', 'typescript', 'typescriptreact',
  'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'swift'
]);

function supportsComments(language) {
  return supportedLanguages.has(language);
}

function commentEdit(text, language, lineEnd, body) {
  if (!supportsComments(language)) {
    throw new Error('Open a source file that supports // comments.');
  }
  const comment = `// ${body}${lineEnd}`;
  const offset = text.startsWith('#!') ? text.indexOf('\n') + 1 : 0;
  if (text.startsWith('#!') && !offset) {
    return { offset: text.length, insertion: lineEnd + comment };
  }
  return { offset, insertion: comment };
}

function proposePatch(text, language, request, lineEnd) {
  const match = /^add a comment:\s*(.+)$/i.exec(request.trim());
  if (!match) {
    throw new Error('For this preview, enter “Add a comment: your text”.');
  }
  return commentEdit(text, language, lineEnd, match[1]);
}

module.exports = { proposePatch, commentEdit, supportsComments };
