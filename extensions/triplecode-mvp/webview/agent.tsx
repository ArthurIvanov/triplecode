import { useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

const modes = { ask: 'Ask', plan: 'Plan', agent: 'Agent' } as const;
type Mode = keyof typeof modes;
type Attachment =
  | { kind: 'selection'; label?: string; text: string }
  | { kind: 'file'; path: string };
type Chat = {
  id: number;
  mode?: Mode;
  replies?: string[];
  plan?: { task: string } | null;
  attachments?: Attachment[];
};
type ChatState = { chats: Chat[]; selected: number; draft: string; model: string };
type Patch = {
  request: string;
  files: { name: string; lines: string[]; start: number; removed: number }[];
  checks?: { command: string; code: number; output?: string }[];
};
type Assets = Record<'close' | 'plus' | 'actions' | 'chevron' | 'context' | 'attach' | 'send', string>;
type Initial = ChatState & { target: string; pending: Patch | null; assets: Assets };
type HostMessage =
  | { type: 'target'; name: string }
  | { type: 'pending'; patch: Patch }
  | { type: 'complete' | 'error'; text: string }
  | ({ type: 'chats'; focusPrompt?: boolean } & ChatState);
type ViewMessage =
  | { type: 'select-chat' | 'close-chat'; id: number }
  | { type: 'draft'; id: number; value: string }
  | { type: 'mode'; id: number; mode: Mode }
  | { type: 'propose'; id: number; request: string; mode: Mode }
  | { type: 'detach-context'; index: number }
  | { type: 'new-chat' | 'chat-actions' | 'check' | 'discard' | 'apply' | 'review' |
      'discard-plan' | 'execute-plan' | 'select-model' | 'attach-menu' };

declare function acquireVsCodeApi(): { postMessage(message: ViewMessage): void };
const vscode = acquireVsCodeApi();
const send = (message: ViewMessage) => vscode.postMessage(message);

type State = ChatState & {
  target: string;
  patch: Patch | null;
  mode: Mode;
  status: string;
  submitting: boolean;
  focusRequest: number;
};
type Action = HostMessage |
  { type: 'edit'; value: string } |
  { type: 'set-mode'; mode: Mode } |
  { type: 'submit' };

function selectedMode(state: ChatState): Mode {
  return state.chats.find(chat => chat.id === state.selected)?.mode || 'agent';
}

function update(state: State, action: Action): State {
  switch (action.type) {
    case 'target':
      return { ...state, target: action.name };
    case 'pending':
      return { ...state, patch: action.patch, status: '', draft: '', submitting: false };
    case 'complete':
      return { ...state, patch: null, status: action.text, draft: '', submitting: false };
    case 'chats':
      return {
        ...state, chats: action.chats, selected: action.selected, draft: action.draft,
        model: action.model || state.model, mode: selectedMode(action), status: '',
        submitting: false, focusRequest: state.focusRequest + (action.focusPrompt ? 1 : 0)
      };
    case 'error':
      return { ...state, status: action.text, submitting: false };
    case 'edit':
      return { ...state, draft: action.value };
    case 'set-mode':
      return { ...state, mode: action.mode };
    case 'submit':
      return { ...state, submitting: true, status: '' };
  }
}

function Agent({ initial }: { initial: Initial }) {
  const [state, dispatch] = useReducer(update, {
    chats: initial.chats, selected: initial.selected, draft: initial.draft,
    model: initial.model || 'Model', target: initial.target, patch: initial.pending,
    mode: selectedMode(initial), status: '', submitting: false, focusRequest: 0
  });
  const [modeOpen, setModeOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(true);
  const prompt = useRef<HTMLTextAreaElement>(null);
  const modePicker = useRef<HTMLDivElement>(null);
  const { patch, selected, mode } = state;
  const chat = state.chats.find(item => item.id === selected);
  const replies = chat?.replies || [];
  const attachments = chat?.attachments || [];
  const plan = chat?.plan;
  const target = state.target || 'Open a source file';
  const { assets } = initial;

  useLayoutEffect(() => {
    function receive(event: MessageEvent<HostMessage>) {
      dispatch(event.data);
      if (event.data.type === 'complete') setFilesOpen(true);
    }
    function closeModeMenu(event: MouseEvent) {
      if (event.target instanceof Node && !modePicker.current?.contains(event.target)) {
        setModeOpen(false);
      }
    }
    window.addEventListener('message', receive);
    document.addEventListener('click', closeModeMenu);
    return () => {
      window.removeEventListener('message', receive);
      document.removeEventListener('click', closeModeMenu);
    };
  }, []);

  useLayoutEffect(() => {
    if (state.focusRequest) prompt.current?.focus();
  }, [state.focusRequest]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (patch || state.submitting) return;
    dispatch({ type: 'submit' });
    send({ type: 'propose', id: selected, request: state.draft, mode });
  }

  return <main className={patch ? 'agent has-patch' : 'agent'}>
    <header className="chat-header">
      <div id="chats" role="group" aria-label="Chats">
        {state.chats.map(item => <div className="chat-tab" key={item.id}>
          <button type="button" disabled={!!patch} aria-pressed={item.id === selected}
            onClick={() => send({ type: 'select-chat', id: item.id })}>Chat {item.id}</button>
          <button type="button" disabled={!!patch} aria-label={`Close Chat ${item.id}`}
            onClick={() => send({ type: 'close-chat', id: item.id })}><img src={assets.close} alt="" /></button>
        </div>)}
      </div>
      <button type="button" className="icon-button" aria-label="New chat" data-action="new-chat" disabled={!!patch}
        onClick={() => send({ type: 'new-chat' })}><img src={assets.plus} alt="" /></button>
      <button type="button" className="icon-button" aria-label="Agent actions" data-action="chat-actions"
        onClick={() => send({ type: 'chat-actions' })}><img src={assets.actions} alt="" /></button>
    </header>
    <section id="conversation" className="conversation" hidden={!replies.length && !patch} aria-label="Agent output">
      <div id="messages">
        {replies.map((reply, index) => <p className="agent-message" key={index}>{reply}</p>)}
      </div>
      {patch && <>
        <p id="task" className="agent-message request">{patch.request}</p>
        <div id="patch" className="patch" hidden={!filesOpen}>
          <div id="patch-files">
            {patch.files.map(file => <div className="patch" key={file.name}>
              <div className="patch-file">
                <span>{file.name}</span>
                <span>+{file.lines.length}{file.removed ? ` -${file.removed}` : ''}</span>
              </div>
              <pre className="patch-lines">{file.lines.map((line, index) => `${file.start + index}  +  ${line}`).join('\n')}</pre>
            </div>)}
          </div>
        </div>
      </>}
    </section>
    <p id="status" role="status" hidden={!state.status}>{state.status}</p>
    <form id="request" className="composer" onSubmit={submit}>
      {patch && <div id="review" className="composer-header">
        <div className="review-row">
          <button type="button" className="files-toggle" aria-expanded={filesOpen}
            onClick={() => setFilesOpen(open => !open)}>
            <img src={assets.chevron} alt="" />
            <span id="file-count">{patch.files.length} {patch.files.length === 1 ? 'file' : 'files'}</span>
          </button>
          <div className="review-actions">
            <button type="button" className="pill-action" onClick={() => send({ type: 'check' })}>Run checks</button>
            <button type="button" className="pill-action" onClick={() => send({ type: 'discard' })}>Undo all</button>
            <button type="button" className="pill-action" onClick={() => send({ type: 'apply' })}>Keep all</button>
            <button type="button" className="review-btn" onClick={() => send({ type: 'review' })}>Review</button>
          </div>
        </div>
        <div id="checks" className="checks">
          {patch.checks?.map((check, index) => <div className="check-row" key={index}>
            <span className={check.code === 0 ? 'check-ok' : 'check-fail'}>{check.code === 0 ? '✓' : '✗'}</span>
            <span title={check.output || ''}>{check.command} — exit {check.code}</span>
          </div>)}
        </div>
      </div>}
      {plan && <div id="plan-bar" className="composer-header plan-bar">
        <div className="review-row">
          <span className="plan-label" id="plan-label" title={plan.task}>
            {plan.task.length > 60 ? `${plan.task.slice(0, 60)}…` : plan.task}
          </span>
          <div className="review-actions">
            <button type="button" className="pill-action" onClick={() => send({ type: 'discard-plan' })}>Discard</button>
            <button type="button" className="review-btn" onClick={() => send({ type: 'execute-plan' })}>Execute plan</button>
          </div>
        </div>
      </div>}
      <div id="attachments" className="attachments" hidden={!attachments.length}>
        {attachments.map((attachment, index) => {
          const selection = attachment.kind === 'selection';
          const label = selection ? attachment.label || 'selection' : attachment.path.split('/').pop() || attachment.path;
          return <span className="attachment-chip" key={index}>
            <span className="attachment-label" title={selection ? attachment.text : attachment.path}>{label}</span>
            <button type="button" className="chip-remove" aria-label="Remove attachment"
              onClick={() => send({ type: 'detach-context', index })}>×</button>
          </span>;
        })}
      </div>
      <label className="sr-only" htmlFor="prompt">Agent task</label>
      <textarea id="prompt" ref={prompt} maxLength={500} aria-describedby="target"
        placeholder="Press / for skills, @ for context" required disabled={!!patch} value={state.draft}
        onChange={event => {
          const value = event.currentTarget.value;
          dispatch({ type: 'edit', value });
          send({ type: 'draft', id: selected, value });
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }} />
      <footer className="chat-actions">
        <div className="mode-picker" ref={modePicker}>
          <button type="button" className="pill mode" id="mode-button" aria-haspopup="listbox" aria-expanded={modeOpen}
            onClick={() => setModeOpen(open => !open)}>{modes[mode]}</button>
          <div className="mode-menu" id="mode-menu" role="listbox" hidden={!modeOpen}>
            {(Object.keys(modes) as Mode[]).map(option => <button key={option} type="button" role="option"
              data-mode={option} aria-selected={option === mode} onClick={() => {
                dispatch({ type: 'set-mode', mode: option });
                send({ type: 'mode', id: selected, mode: option });
                setModeOpen(false);
              }}>{modes[option]}</button>)}
          </div>
        </div>
        <button type="button" className="pill model-pill" id="model-pill" title="Select model"
          onClick={() => send({ type: 'select-model' })}>{state.model}</button>
        <span id="target" className="muted" title={target}>{target}</span>
        <button type="button" className="icon-button context-btn" aria-label="Attach context" title="Attach context"
          onClick={() => send({ type: 'attach-menu' })}><img src={assets.context} alt="" /></button>
        <button type="button" className="icon-button attachment" aria-label="Attach context" title="Attach context"
          onClick={() => send({ type: 'attach-menu' })}><img src={assets.attach} alt="" /></button>
        <button aria-label="Send" title="Send" type="submit" className="send" disabled={!!patch || state.submitting}>
          <img src={assets.send} alt="" />
        </button>
      </footer>
    </form>
  </main>;
}

const initial: Initial = JSON.parse(document.getElementById('initial')!.textContent!);
const root = createRoot(document.getElementById('agent-root')!);
flushSync(() => root.render(<Agent initial={initial} />));
