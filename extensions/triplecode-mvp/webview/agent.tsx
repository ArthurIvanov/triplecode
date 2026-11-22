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
  name?: string;
  status?: string;
  queued?: number;
  mode?: Mode;
  replies?: string[];
  plan?: { task: string; plan?: string } | null;
  attachments?: Attachment[];
};
type ChatState = { chats: Chat[]; selected: number; draft: string; model: string; provider?: string; rules?: boolean; progress?: Progress | null; status?: string };
type Patch = {
  request: string;
  files: { name: string; lines: string[]; start: number; removed: number }[];
  checking?: boolean;
  checks?: { command: string; code: number; output?: string; target: 'working-tree' | 'proposed-patch' }[];
};
type Assets = Record<'close' | 'plus' | 'actions' | 'chevron' | 'context' | 'attach' | 'send', string>;
type Initial = ChatState & { target: string; pending: Patch | null; assets: Assets };
type Progress = { chat: number; text: string; startedAt: number };
type HostMessage =
  | { type: 'focus-composer' }
  | { type: 'target'; name: string }
  | { type: 'pending'; patch: Patch }
  | ({ type: 'progress' } & Progress)
  | { type: 'complete' | 'error'; text: string }
  | ({ type: 'chats'; focusPrompt?: boolean } & ChatState);
type ViewMessage =
  | { type: 'select-chat' | 'close-chat' | 'stop' | 'attach-menu' | 'clear-queue'; id: number }
  | { type: 'draft'; id: number; value: string }
  | { type: 'mode'; id: number; mode: Mode }
  | { type: 'propose'; id: number; request: string; mode: Mode }
  | { type: 'detach-context'; index: number }
  | { type: 'new-chat' | 'chat-actions' | 'check' | 'check-patch' | 'discard' | 'apply' | 'review' |
      'discard-plan' | 'execute-plan' | 'select-model' | 'ready' }
  | { type: 'apply-file' | 'discard-file'; id: number; index: number };

declare function acquireVsCodeApi(): { postMessage(message: ViewMessage): void };
const vscode = acquireVsCodeApi();
const send = (message: ViewMessage) => vscode.postMessage(message);

type State = ChatState & {
  target: string;
  patch: Patch | null;
  mode: Mode;
  status: string;
  submitting: boolean;
  progress: Progress | null;
  focusRequest: number;
  provider: string;
  rules: boolean;
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
    case 'focus-composer':
      return { ...state, focusRequest: state.focusRequest + 1 };
    case 'target':
      return { ...state, target: action.name };
    case 'pending':
      return { ...state, patch: action.patch, status: '', draft: '', submitting: false, progress: null };
    case 'progress':
      return action.chat === state.selected
        ? { ...state, submitting: true, progress: action }
        : state;
    case 'complete':
      return { ...state, patch: null, status: action.text, draft: '', submitting: false, progress: null };
    case 'chats':
      return {
        ...state, chats: action.chats, selected: action.selected, draft: action.draft,
        model: action.model || state.model, mode: selectedMode(action), status: action.status || '',
        provider: action.provider || state.provider, rules: Boolean(action.rules),
        submitting: Boolean(action.progress), progress: action.progress ?? null,
        focusRequest: state.focusRequest + (action.focusPrompt ? 1 : 0)
      };
    case 'error':
      return { ...state, status: action.text, submitting: false, progress: null };
    case 'edit':
      return { ...state, draft: action.value };
    case 'set-mode':
      return { ...state, mode: action.mode };
    case 'submit':
      return {
        ...state, submitting: true, status: '',
        progress: { chat: state.selected, text: 'Working…', startedAt: Date.now() }
      };
  }
}

function ProgressIndicator({ progress }: { progress: Progress }) {
  const [elapsed, setElapsed] = useState(0);
  useLayoutEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - progress.startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [progress.startedAt]);
  return <p className="agent-message progress" role="status">
    <span className="progress-spinner" aria-hidden="true" />
    <span className="progress-text">{progress.text}</span>
    <span className="progress-time">{elapsed}s</span>
  </p>;
}

function Agent({ initial }: { initial: Initial }) {
  const [state, dispatch] = useReducer(update, {
    chats: initial.chats, selected: initial.selected, draft: initial.draft,
    model: initial.model || 'Model', target: initial.target, patch: initial.pending,
    mode: selectedMode(initial), status: initial.status || '',
    submitting: Boolean(initial.progress), progress: initial.progress ?? null, focusRequest: 0,
    provider: initial.provider || 'Auto', rules: Boolean(initial.rules)
  });
  const [modeOpen, setModeOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(true);
  const [planOpen, setPlanOpen] = useState(false);
  const prompt = useRef<HTMLTextAreaElement>(null);
  const modePicker = useRef<HTMLDivElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const { patch, selected, mode } = state;
  const chat = state.chats.find(item => item.id === selected);
  const replies = chat?.replies || [];
  const attachments = chat?.attachments || [];
  const plan = chat?.plan;
  const progress = state.progress && state.progress.chat === selected ? state.progress : null;
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
    send({ type: 'ready' });
    document.addEventListener('click', closeModeMenu);
    return () => {
      window.removeEventListener('message', receive);
      document.removeEventListener('click', closeModeMenu);
    };
  }, []);

  useLayoutEffect(() => {
    if (state.focusRequest) {
      if (prompt.current?.disabled) reviewButton.current?.focus();
      else prompt.current?.focus();
    }
  }, [state.focusRequest]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (patch) return;
    if (!state.submitting) dispatch({ type: 'submit' });
    send({ type: 'propose', id: selected, request: state.draft, mode });
  }

  return <main className={patch ? 'agent has-patch' : 'agent'}>
    <header className="chat-header">
      <div id="chats" role="group" aria-label="Chats">
        {state.chats.map(item => <div className="chat-tab" key={item.id}>
          <button type="button" disabled={!!patch} aria-pressed={item.id === selected}
            title={item.status || item.name || `Chat ${item.id}`}
            onClick={() => send({ type: 'select-chat', id: item.id })}>{item.name || `Chat ${item.id}`}</button>
          <button type="button" disabled={!!patch} aria-label={`Close Chat ${item.id}`}
            onClick={() => send({ type: 'close-chat', id: item.id })}><img src={assets.close} alt="" /></button>
        </div>)}
      </div>
      <button type="button" className="icon-button" aria-label="New chat" data-action="new-chat" disabled={!!patch}
        onClick={() => send({ type: 'new-chat' })}><img src={assets.plus} alt="" /></button>
      <button type="button" className="icon-button" aria-label="Agent actions" data-action="chat-actions"
        onClick={() => send({ type: 'chat-actions' })}><img src={assets.actions} alt="" /></button>
    </header>
    <section id="conversation" className="conversation" hidden={!replies.length && !patch && !progress} aria-label="Agent output">
      <div id="messages">
        {replies.map((reply, index) => <p className="agent-message" key={index}>{reply}</p>)}
        {progress && <ProgressIndicator progress={progress} />}
      </div>
      {patch && <>
        <p id="task" className="agent-message request">{patch.request}</p>
        <div id="patch" className="patch" hidden={!filesOpen}>
          <div id="patch-files">
            {patch.files.map((file, index) => <div className="patch" key={file.name}>
              <div className="patch-file">
                <span>{file.name}</span>
                <span className="patch-file-actions">
                  <span>+{file.lines.length}{file.removed ? ` -${file.removed}` : ''}</span>
                  <button type="button" className="pill-action" disabled={patch.checking}
                    title="Apply only this file"
                    onClick={() => send({ type: 'apply-file', id: selected, index })}>Keep</button>
                  <button type="button" className="pill-action" disabled={patch.checking}
                    title="Drop this file from the patch"
                    onClick={() => send({ type: 'discard-file', id: selected, index })}>Drop</button>
                </span>
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
            <button type="button" className="pill-action" disabled={patch.checking} aria-describedby="check-target"
              onClick={() => send({ type: 'check' })}>Run checks</button>
            <button type="button" className="pill-action" disabled={patch.checking}
              title="Runs the check command on a temporary copy with the proposed patch applied"
              onClick={() => send({ type: 'check-patch' })}>Check patch</button>
            <button type="button" className="pill-action" disabled={patch.checking}
              onClick={() => send({ type: 'discard' })}>Undo all</button>
            <button type="button" className="pill-action" disabled={patch.checking}
              onClick={() => send({ type: 'apply' })}>Keep all</button>
            <button type="button" className="review-btn" ref={reviewButton} onClick={() => send({ type: 'review' })}>Review</button>
          </div>
        </div>
        <div id="checks" className="checks" aria-live="polite">
          <p id="check-target" className="check-scope">
            {patch.checking
              ? 'Running check…'
              : patch.checks?.some(check => check.target === 'proposed-patch')
                ? 'Check patch ran on an isolated copy with the proposal applied.'
                : 'Run checks tests the current working tree. Check patch tests the proposal in an isolated copy.'}
          </p>
          {patch.checks?.map((check, index) => <div className="check-row" key={index}>
            <span title={check.output || ''}>
              {check.target === 'working-tree' ? 'Current working tree'
                : check.target === 'proposed-patch' ? 'Proposed patch · isolated copy'
                : 'Check target not recorded'}
              {' · '}{check.command} — exit {check.code}
            </span>
          </div>)}
        </div>
      </div>}
      {plan && <div id="plan-bar" className="composer-header plan-bar">
        <div className="review-row">
          <button type="button" className="plan-toggle" aria-expanded={planOpen}
            title={plan.plan || plan.task}
            onClick={() => setPlanOpen(open => !open)}>
            <span className="plan-label" id="plan-label">
              {plan.task.length > 60 ? `${plan.task.slice(0, 60)}…` : plan.task}
            </span>
          </button>
          <div className="review-actions">
            <button type="button" className="pill-action" disabled={state.submitting}
              onClick={() => send({ type: 'discard-plan' })}>Discard</button>
            <button type="button" className="review-btn" disabled={state.submitting}
              title="Executes the plan shown above"
              onClick={() => send({ type: 'execute-plan' })}>Execute plan</button>
          </div>
        </div>
        {planOpen && (plan.plan
          ? <pre className="plan-text" id="plan-text">{plan.plan}</pre>
          : <p className="plan-text muted">Plan text unavailable — regenerate in Plan mode.</p>)}
      </div>}
      {(chat?.queued ?? 0) > 0 && <p className="queue-note">
        {chat!.queued} request{chat!.queued === 1 ? '' : 's'} queued
        <button type="button" className="pill-action" onClick={() => send({ type: 'clear-queue', id: selected })}>Cancel queue</button>
      </p>}
      <div id="attachments" className="attachments" hidden={!attachments.length}>
        {attachments.map((attachment, index) => {
          const selection = attachment.kind === 'selection';
          const label = selection ? attachment.label || 'selection' : attachment.path.split('/').pop() || attachment.path;
          return <span className="attachment-chip" key={index}>
            <span className="attachment-label" title={selection ? attachment.text : attachment.path}>{label}</span>
            <button type="button" className="chip-remove" aria-label={`Remove attachment: ${label}`} disabled={state.submitting}
              onClick={() => {
                send({ type: 'detach-context', index });
                prompt.current?.focus();
              }}>×</button>
          </span>;
        })}
      </div>
      <label className="sr-only" htmlFor="prompt">Agent task</label>
      <textarea id="prompt" ref={prompt} maxLength={500} aria-describedby="target"
        placeholder="Describe a task. Type @ for context." required disabled={!!patch}
        value={state.draft}
        onChange={event => {
          const value = event.currentTarget.value;
          dispatch({ type: 'edit', value });
          send({ type: 'draft', id: selected, value });
        }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Escape' && state.submitting) {
            event.preventDefault();
            send({ type: 'stop', id: selected });
            return;
          }
          const field = event.currentTarget;
          if (event.key === '@' && !state.submitting && field.selectionStart === field.selectionEnd &&
              (field.selectionStart === 0 || /\s/.test(field.value[field.selectionStart - 1]))) {
            event.preventDefault();
            send({ type: 'attach-menu', id: selected });
            return;
          }
          if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            if (!state.submitting) field.form?.requestSubmit();
          }
        }} />
      <footer className="chat-actions">
        <div className="mode-picker" ref={modePicker}>
          <button type="button" className="pill mode" id="mode-button" aria-haspopup="listbox" aria-expanded={modeOpen}
            onClick={() => setModeOpen(open => !open)}>{modes[mode]}</button>
          <div className="mode-menu" id="mode-menu" role="listbox" hidden={!modeOpen}
            onKeyDown={event => {
              if (event.key !== 'Escape') return;
              event.preventDefault();
              setModeOpen(false);
              modePicker.current?.querySelector('button')?.focus();
            }}>
            {(Object.keys(modes) as Mode[]).map(option => <button key={option} type="button" role="option"
              data-mode={option} aria-selected={option === mode} onClick={() => {
                dispatch({ type: 'set-mode', mode: option });
                send({ type: 'mode', id: selected, mode: option });
                setModeOpen(false);
              }}>{modes[option]}</button>)}
          </div>
        </div>
        <button type="button" className="pill model-pill" id="model-pill"
          title={`${state.provider} · ${state.model}`}
          onClick={() => send({ type: 'select-model' })}>{state.model}</button>
        {state.rules && <span className="rules-badge" title="Repository rules from .triplecode/rules.md are included in requests">Rules</span>}
        <span id="target" className="muted" title={target}>{target}</span>
        <button type="button" className="icon-button context-btn" aria-label="Attach context" title="Attach context" disabled={state.submitting}
          onClick={() => send({ type: 'attach-menu', id: selected })}><img src={assets.context} alt="" /></button>
        <button type="button" className="icon-button attachment" aria-label="Attach context" title="Attach context" disabled={state.submitting}
          onClick={() => send({ type: 'attach-menu', id: selected })}><img src={assets.attach} alt="" /></button>
        <button aria-label={state.submitting ? 'Stop' : 'Send'} title={state.submitting ? 'Stop' : 'Send'}
          type={state.submitting ? 'button' : 'submit'} className="send" disabled={!!patch}
          onClick={state.submitting ? () => send({ type: 'stop', id: selected }) : undefined}>
          {state.submitting ? <span className="stop-glyph" aria-hidden="true" /> : <img src={assets.send} alt="" />}
        </button>
      </footer>
    </form>
  </main>;
}

const initial: Initial = JSON.parse(document.getElementById('initial')!.textContent!);
const root = createRoot(document.getElementById('agent-root')!);
flushSync(() => root.render(<Agent initial={initial} />));
