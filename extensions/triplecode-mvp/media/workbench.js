'use strict';

const vscode = acquireVsCodeApi();
const initial = JSON.parse(document.querySelector('#initial').textContent);

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  if (button.dataset.action === 'toggle-files') {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    const patch = document.querySelector('.patch');
    if (patch) patch.hidden = open;
    return;
  }
  vscode.postMessage({ type: button.dataset.action, index: Number(button.dataset.index), id: Number(button.dataset.id) });
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
  const messages = document.querySelector('#messages');
  const task = document.querySelector('#task');
  const patchBox = document.querySelector('#patch');
  const patchFiles = document.querySelector('#patch-files');
  const checksBox = document.querySelector('#checks');
  const request = document.querySelector('#request');
  const prompt = document.querySelector('#prompt');
  const planBar = document.querySelector('#plan-bar');
  const planLabel = document.querySelector('#plan-label');
  const modelPill = document.querySelector('#model-pill');
  const send = request.querySelector('button[type="submit"]');
  const chats = document.querySelector('#chats');
  const modeButton = document.querySelector('#mode-button');
  const modeMenu = document.querySelector('#mode-menu');
  const modeOptions = [...modeMenu.querySelectorAll('[data-mode]')];
  let selectedChat;
  let currentMode = 'agent';

  function applyMode(mode, notify = false) {
    currentMode = mode;
    modeButton.textContent = mode[0].toUpperCase() + mode.slice(1);
    for (const option of modeOptions) {
      option.setAttribute('aria-selected', String(option.dataset.mode === mode));
    }
    if (notify) vscode.postMessage({ type: 'mode', id: selectedChat, mode });
  }

  function closeModeMenu() {
    modeMenu.hidden = true;
    modeButton.setAttribute('aria-expanded', 'false');
  }

  function renderMessages(replies) {
    messages.replaceChildren(...(replies || []).map(text => {
      const bubble = document.createElement('p');
      bubble.className = 'agent-message';
      bubble.textContent = text;
      return bubble;
    }));
    conversation.hidden = !(messages.children.length || !patchBox.hidden);
  }

  function renderChats(state) {
    selectedChat = state.selected;
    const selected = state.chats.find(chat => chat.id === selectedChat);
    applyMode(selected?.mode || 'agent');
    planBar.hidden = !selected?.plan;
    if (selected?.plan) {
      const task = selected.plan.task;
      planLabel.textContent = task.length > 60 ? `${task.slice(0, 60)}…` : task;
      planLabel.title = task;
    }
    if (modelPill && state.model) modelPill.textContent = state.model;
    const tabs = state.chats.map(chat => {
      const tab = document.createElement('div');
      tab.className = 'chat-tab';
      const select = document.createElement('button');
      select.type = 'button';
      select.dataset.action = 'select-chat';
      select.dataset.id = chat.id;
      select.setAttribute('aria-pressed', String(chat.id === selectedChat));
      select.textContent = `Chat ${chat.id}`;
      const close = document.createElement('button');
      close.type = 'button';
      close.dataset.action = 'close-chat';
      close.dataset.id = chat.id;
      close.setAttribute('aria-label', `Close Chat ${chat.id}`);
      const closeIcon = document.createElement('img');
      closeIcon.src = initial.assets?.x || '';
      closeIcon.alt = '';
      close.append(closeIcon);
      tab.append(select, close);
      return tab;
    });
    chats.replaceChildren(...tabs);
    prompt.value = state.draft;
    renderMessages(selected?.replies);
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
    patchBox.hidden = !patch;
    prompt.disabled = send.disabled = Boolean(patch);
    for (const button of document.querySelectorAll('#chats button, .chat-header [data-action="new-chat"]')) {
      button.disabled = Boolean(patch);
    }
    if (!patch) {
      task.hidden = true;
      task.textContent = '';
      checksBox.replaceChildren();
      patchFiles.replaceChildren();
      conversation.hidden = !messages.children.length;
      return;
    }
    task.textContent = patch.request;
    task.hidden = false;
    document.querySelector('#file-count').textContent =
      `${patch.files.length} file${patch.files.length === 1 ? '' : 's'}`;
    patchFiles.replaceChildren(...patch.files.map(file => {
      const block = document.createElement('div');
      block.className = 'patch';
      const head = document.createElement('div');
      head.className = 'patch-file';
      const name = document.createElement('span');
      name.textContent = file.name;
      const additions = document.createElement('span');
      additions.textContent = `+${file.lines.length}${file.removed ? ` -${file.removed}` : ''}`;
      head.append(name, additions);
      const pre = document.createElement('pre');
      pre.className = 'patch-lines';
      pre.textContent = file.lines.map((line, index) => `${file.start + index}  +  ${line}`).join('\n');
      block.append(head, pre);
      return block;
    }));
    checksBox.replaceChildren(...(patch.checks || []).map(check => {
      const row = document.createElement('div');
      row.className = 'check-row';
      const icon = document.createElement('span');
      icon.textContent = check.code === 0 ? '✓' : '✗';
      icon.className = check.code === 0 ? 'check-ok' : 'check-fail';
      const label = document.createElement('span');
      label.textContent = `${check.command} — exit ${check.code}`;
      label.title = check.output || '';
      row.append(icon, label);
      return row;
    }));
    conversation.hidden = false;
  }

  modeButton.addEventListener('click', () => {
    modeMenu.hidden = !modeMenu.hidden;
    modeButton.setAttribute('aria-expanded', String(!modeMenu.hidden));
  });
  for (const option of modeOptions) {
    option.addEventListener('click', () => {
      applyMode(option.dataset.mode, true);
      closeModeMenu();
    });
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('.mode-picker')) closeModeMenu();
  });

  renderChats(initial);
  updateTarget(initial.target);
  updateReview(initial.pending);
  prompt.addEventListener('input', () => vscode.postMessage({ type: 'draft', id: selectedChat, value: prompt.value }));
  prompt.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      request.requestSubmit();
    }
  });
  request.addEventListener('submit', event => {
    event.preventDefault();
    if (send.disabled) return;
    showStatus('');
    send.disabled = true;
    vscode.postMessage({ type: 'propose', id: selectedChat, request: prompt.value, mode: currentMode });
  });
  window.addEventListener('message', ({ data }) => {
    switch (data.type) {
      case 'target':
        updateTarget(data.name);
        break;
      case 'pending':
        showStatus('');
        prompt.value = '';
        updateReview(data.patch);
        break;
      case 'complete':
        updateReview(null);
        prompt.value = '';
        showStatus(data.text);
        break;
      case 'chats':
        renderChats(data);
        prompt.disabled = send.disabled = !review.hidden;
        showStatus('');
        break;
      case 'error':
        send.disabled = !review.hidden;
        showStatus(data.text);
        break;
    }
  });
}
