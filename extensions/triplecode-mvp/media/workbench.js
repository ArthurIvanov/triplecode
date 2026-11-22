'use strict';

const vscode = acquireVsCodeApi();
const initial = JSON.parse(document.querySelector('#initial').textContent);

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  vscode.postMessage({ type: button.dataset.action, index: Number(button.dataset.index), id: Number(button.dataset.id) });
});

const recent = document.querySelector('#recent');
if (!initial.recent.length) {
  const empty = document.createElement('p');
  empty.textContent = 'Projects you open will appear here.';
  empty.className = 'muted empty';
  recent.append(empty);
} else {
  const heading = document.createElement('h2');
  heading.textContent = 'Recent projects';
  recent.append(heading);
  initial.recent.forEach((path, index) => {
    const button = document.createElement('button');
    button.className = 'recent-item';
    button.dataset.action = 'recent';
    button.dataset.index = index;
    const name = document.createElement('strong');
    name.textContent = path.split('/').filter(Boolean).at(-1) || path;
    const detail = document.createElement('span');
    detail.textContent = path;
    detail.className = 'muted';
    button.append(name, detail);
    recent.append(button);
  });
}
