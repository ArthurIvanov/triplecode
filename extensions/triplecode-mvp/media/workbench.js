'use strict';

const vscode = acquireVsCodeApi();
const initial = JSON.parse(document.querySelector('#initial').textContent);

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (button) vscode.postMessage({ type: button.dataset.action, index: Number(button.dataset.index), id: Number(button.dataset.id) });
});

if (document.body.dataset.screen === 'welcome') {
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
} else {
  const status = document.querySelector('#status');
  const target = document.querySelector('#target');
  const review = document.querySelector('#review');
  const conversation = document.querySelector('#conversation');
  const request = document.querySelector('#request');
  const prompt = document.querySelector('#prompt');
  const send = request.querySelector('button[type="submit"]');
  const chats = document.querySelector('#chats');
  let selectedChat;

  function renderChats(state) {
    selectedChat = state.selected;
    const tabs = state.chats.map(id => {
      const tab = document.createElement('div');
      tab.className = 'chat-tab';
      const select = document.createElement('button');
      select.type = 'button';
      select.dataset.action = 'select-chat';
      select.dataset.id = id;
      select.setAttribute('aria-pressed', String(id === selectedChat));
      select.textContent = `Chat ${id}`;
      const close = document.createElement('button');
      close.type = 'button';
      close.dataset.action = 'close-chat';
      close.dataset.id = id;
      close.setAttribute('aria-label', `Close Chat ${id}`);
      close.textContent = '×';
      tab.append(select, close);
      return tab;
    });
    chats.replaceChildren(...tabs);
    prompt.value = state.draft;
    if (state.focusPrompt) prompt.focus();
  }

  function updateTarget(name) {
    target.textContent = name || 'Open a source file';
    target.title = target.textContent;
  }

  function showStatus(text) {
    status.textContent = text;
    status.hidden = !text;
  }

  function updateReview(patch) {
    document.body.classList.toggle('has-patch', Boolean(patch));
    review.hidden = !patch;
    conversation.hidden = !patch;
    prompt.disabled = send.disabled = Boolean(patch);
    for (const button of document.querySelectorAll('#chats button, .chat-header [data-action="new-chat"]')) {
      button.disabled = Boolean(patch);
    }
    if (!patch) return;
    document.querySelector('#change').textContent = patch.name;
    document.querySelector('#task').textContent = patch.request;
    document.querySelector('#additions').textContent = `+${patch.lines.length}`;
    const lines = patch.lines.map((line, index) => `${patch.start + index}  +  ${line}`);
    document.querySelector('#patch-lines').textContent = lines.join('\n');
    prompt.value = '';
  }

  renderChats(initial);
  updateTarget(initial.target);
  updateReview(initial.pending);
  prompt.addEventListener('input', () => vscode.postMessage({ type: 'draft', id: selectedChat, value: prompt.value }));
  request.addEventListener('submit', event => {
    event.preventDefault();
    if (send.disabled) return;
    showStatus('');
    send.disabled = true;
    vscode.postMessage({ type: 'propose', id: selectedChat, request: prompt.value });
  });
  window.addEventListener('message', ({ data }) => {
    switch (data.type) {
      case 'target':
        updateTarget(data.name);
        break;
      case 'pending':
        showStatus('');
        updateReview(data.patch);
        break;
      case 'complete':
        updateReview(null);
        showStatus(data.text);
        break;
      case 'chats':
        renderChats(data);
        showStatus('');
        break;
      case 'error':
        send.disabled = !review.hidden;
        showStatus(data.text);
        break;
    }
  });
}
