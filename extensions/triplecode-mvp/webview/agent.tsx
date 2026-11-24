import { useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { ActionButton, ActionButtonIcon } from './design-system/components/action-button';
import { Dropdown, DropdownItem } from './design-system/components/dropdown';
import { Accordion } from './design-system/components/accordion';
import type { TimelineItemProps } from './design-system/components/timeline';

const modes = { ask: 'Ask', plan: 'Plan', agent: 'Agent' } as const;
type Mode = keyof typeof modes;
const modeOrder: Mode[] = ['agent', 'plan', 'ask'];
const modeAsset: Record<Mode, 'crown' | 'listTodo' | 'messageSquare'> = {
  agent: 'crown', plan: 'listTodo', ask: 'messageSquare'
};
type Attachment =
  | { kind: 'selection'; label?: string; text: string }
  | { kind: 'file'; path: string };
type Chat = {
  id: number;
  name?: string;
  status?: string;
  queued?: number;
  mode?: Mode;
  replies?: (string | { type: 'timeline'; steps: TimelineItemProps[] })[];
  plan?: { id: string; task: string; plan: string } | null;
  attachments?: Attachment[];
};
type ModelChoice = { value: string; label: string };
type ChatState = { chats: Chat[]; selected: number; draft: string; model: string; modelValue?: string; models?: ModelChoice[]; provider?: string; rules?: boolean; progress?: Progress | null; status?: string };
type Patch = {
  request: string;
  files: { name: string; lines: string[]; start: number; removed: number }[];
  checking?: boolean;
  checks?: { command: string; code: number; output?: string; target: 'working-tree' | 'proposed-patch' }[];
};
type Assets = Record<'close' | 'plus' | 'actions' | 'chevron' | 'context' | 'attach' | 'send' |
  'crown' | 'listTodo' | 'messageSquare' | 'check' | 'chevronDown', string>;
type Initial = ChatState & { target: string; pending: Patch | null; assets: Assets };
type Progress = { chat: number; text: string; startedAt: number; steps?: TimelineItemProps[] };
type HostMessage =
  | { type: 'focus-composer' }
  | { type: 'target'; name: string }
  | { type: 'pending'; patch: Patch }
  | ({ type: 'progress' } & Progress)
  | { type: 'complete' | 'error'; text: string }
  | ({ type: 'chats'; focusPrompt?: boolean } & ChatState)
  | { type: 'timeline-step'; chat: number; item: TimelineItemProps };
type ViewMessage =
  | { type: 'select-chat' | 'close-chat' | 'stop' | 'attach-menu' | 'clear-queue'; id: number }
  | { type: 'draft'; id: number; value: string }
  | { type: 'mode'; id: number; mode: Mode }
  | { type: 'propose'; id: number; request: string; mode: Mode }
  | { type: 'detach-context'; index: number }
  | { type: 'discard-plan' | 'execute-plan'; id: number; planId: string }
  | { type: 'new-chat' | 'chat-actions' | 'check' | 'check-patch' | 'discard' | 'apply' | 'review' |
      'select-model' | 'refresh-models' | 'ready' | 'close-agent' }
  | { type: 'model'; value: string }
  | { type: 'apply-file' | 'discard-file'; id: number; index: number };

type VsCodeApi = { postMessage(message: ViewMessage): void };
const vscode: VsCodeApi = (globalThis as { acquireVsCodeApi?: () => VsCodeApi }).acquireVsCodeApi?.()
  ?? { postMessage: () => {} };
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
  models: ModelChoice[];
  modelValue: string;
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
      return { ...state, patch: action.patch, status: '', submitting: false, progress: null };
    case 'progress':
      return action.chat === state.selected
        ? { ...state, submitting: true, progress: { ...action, steps: state.progress?.steps || [] } }
        : state;
    case 'complete':
      return { ...state, patch: null, status: action.text, submitting: false, progress: null };
    case 'chats':
      return {
        ...state, chats: action.chats, selected: action.selected, draft: action.draft,
        model: action.model || state.model, mode: selectedMode(action), status: action.status || '',
        provider: action.provider || state.provider, rules: Boolean(action.rules),
        models: action.models ?? state.models, modelValue: action.modelValue ?? state.modelValue,
        submitting: Boolean(action.progress), progress: action.progress ? { ...action.progress, steps: state.progress?.steps || [] } : null,
        focusRequest: state.focusRequest + (action.focusPrompt ? 1 : 0)
      };
    case 'error':
      return { ...state, status: action.text, submitting: false, progress: null };
    case 'timeline-step':
      if (action.chat === state.selected && state.progress) {
        const steps = [...(state.progress.steps || []), action.item];
        return { ...state, progress: { ...state.progress, steps } };
      }
      return state;
    case 'edit':
      return { ...state, draft: action.value };
    case 'set-mode':
      return { ...state, mode: action.mode };
    case 'submit':
      return {
        ...state, submitting: true, status: '',
        progress: { chat: state.selected, text: 'Working…', startedAt: Date.now() }
      };
    default:
      return state;
  }
}

function AgentRunSteps({ steps, expandDetails = true }: { steps: TimelineItemProps[]; expandDetails?: boolean }) {
  return (
    <div className="agent-steps">
      {steps.map((step, index) => step.description ? (
        <Accordion key={index} title={step.title} defaultExpanded={expandDetails}>
          <p>{step.description}</p>
        </Accordion>
      ) : (
        <div className="agent-step" key={index}>
          <span className="agent-step__title">{step.title}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressIndicator({ progress }: { progress: Progress }) {
  return (
    <Accordion title={progress.text} defaultExpanded className="agent-run">
      {progress.steps && progress.steps.length > 0 && (
        <AgentRunSteps steps={progress.steps} />
      )}
    </Accordion>
  );
}

export type { Initial, ChatState, Chat, Patch, Progress };
export function Agent({ initial }: { initial: Initial }) {
  const [state, dispatch] = useReducer(update, {
    chats: initial.chats, selected: initial.selected, draft: initial.draft,
    model: initial.model || 'Model', target: initial.target, patch: initial.pending,
    mode: selectedMode(initial), status: initial.status || '',
    submitting: Boolean(initial.progress), progress: initial.progress ?? null, focusRequest: 0,
    provider: initial.provider || 'Auto', rules: Boolean(initial.rules),
    models: initial.models || [], modelValue: initial.modelValue || ''
  });
  const [filesOpen, setFilesOpen] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string>();
  const prompt = useRef<HTMLTextAreaElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const { patch, selected, mode } = state;
  const chat = state.chats.find(item => item.id === selected);
  const replies = chat?.replies || [];
  const attachments = chat?.attachments || [];
  const plan = chat?.plan;
  const planOpen = !!plan && expandedPlanId === plan.id;
  const progress = state.progress && state.progress.chat === selected ? state.progress : null;
  const target = state.target || 'Open a source file';
  const { assets } = initial;

  useLayoutEffect(() => {
    function receive(event: MessageEvent<HostMessage>) {
      dispatch(event.data);
      if (event.data.type === 'complete') setFilesOpen(true);
    }
    window.addEventListener('message', receive);
    send({ type: 'ready' });
    return () => {
      window.removeEventListener('message', receive);
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
      <ActionButton text={null} start={<ActionButtonIcon href={assets.plus} />} aria-label="New chat" data-action="new-chat" disabled={!!patch}
        onClick={() => send({ type: 'new-chat' })} />
      <ActionButton text={null} start={<ActionButtonIcon href={assets.actions} />} aria-label="Agent actions" data-action="chat-actions"
        onClick={() => send({ type: 'chat-actions' })} />
    </header>
    <section id="conversation" className="conversation" hidden={!replies.length && !patch && !progress} aria-label="Agent output">
      <div id="messages">
        {replies.map((reply, index) => {
          if (typeof reply === 'object' && reply.type === 'timeline') {
            return (
              <Accordion key={index} title="Timeline" className="agent-run agent-run--history">
                <AgentRunSteps steps={reply.steps} expandDetails={false} />
              </Accordion>
            );
          }
          return <p className="agent-message" key={index}>{reply as string}</p>;
        })}
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
                  <ActionButton size="base" rounding="full" text="Keep" disabled={patch.checking}
                    title="Apply only this file"
                    onClick={() => send({ type: 'apply-file', id: selected, index })} />
                  <ActionButton size="base" rounding="full" text="Drop" disabled={patch.checking}
                    title="Drop this file from the patch"
                    onClick={() => send({ type: 'discard-file', id: selected, index })} />
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
            <ActionButton rounding="full" text="Run checks" disabled={patch.checking} aria-describedby="check-target"
              onClick={() => send({ type: 'check' })} />
            <ActionButton rounding="full" text="Check patch" disabled={patch.checking}
              title="Runs the check command on a temporary copy with the proposed patch applied"
              onClick={() => send({ type: 'check-patch' })} />
            <ActionButton rounding="full" text="Undo all" disabled={patch.checking}
              onClick={() => send({ type: 'discard' })} />
            <ActionButton rounding="full" text="Keep all" disabled={patch.checking}
              onClick={() => send({ type: 'apply' })} />
            <ActionButton variant="filled" text="Review" ref={reviewButton} onClick={() => send({ type: 'review' })} />
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
            onClick={() => setExpandedPlanId(planOpen ? undefined : plan.id)}>
            <span className="plan-label" id="plan-label">
              {plan.task.length > 60 ? `${plan.task.slice(0, 60)}…` : plan.task}
            </span>
          </button>
          <div className="review-actions">
            <ActionButton rounding="full" text="Discard" disabled={state.submitting}
              onClick={() => send({ type: 'discard-plan', id: selected, planId: plan.id })} />
            <ActionButton variant="filled" text="Execute plan" disabled={state.submitting || !planOpen || !!patch}
              title="Expand the plan to review it before executing"
              onClick={() => send({ type: 'execute-plan', id: selected, planId: plan.id })} />
          </div>
        </div>
        {planOpen && (plan.plan
          ? <pre className="plan-text" id="plan-text">{plan.plan}</pre>
          : <p className="plan-text muted">Plan text unavailable — regenerate in Plan mode.</p>)}
      </div>}
      {(chat?.queued ?? 0) > 0 && <p className="queue-note">
        {chat!.queued} request{chat!.queued === 1 ? '' : 's'} queued
        <ActionButton rounding="full" text="Cancel queue" onClick={() => send({ type: 'clear-queue', id: selected })} />
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
          if (event.key === 'Escape') {
            event.preventDefault();
            if (state.submitting) send({ type: 'stop', id: selected });
            else send({ type: 'close-agent' });
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
        <div className="chat-pickers">
          <Dropdown
            aria-label="Agent mode"
            placement="top-left"
            value={{ text: modes[mode], start: <ActionButtonIcon href={assets[modeAsset[mode]]} dimension={14} /> }}
            onSelect={picked => {
              const next = modeOrder.find(option => modes[option] === picked.text);
              if (next && next !== mode) {
                dispatch({ type: 'set-mode', mode: next });
                send({ type: 'mode', id: selected, mode: next });
              }
            }}
            trigger={
              <ActionButton size="base" rounding="full" variant="ghost" text={modes[mode]}
                start={<ActionButtonIcon href={assets[modeAsset[mode]]} dimension={14} />}
                end={<ActionButtonIcon href={assets.chevronDown} dimension={14} />} />
            }
          >
            {modeOrder.map(option => (
              <DropdownItem key={option} type="text" size="small" text={modes[option]}
                selected={option === mode}
                start={<ActionButtonIcon href={assets[modeAsset[option]]} dimension={14} />}
                end={option === mode ? <ActionButtonIcon href={assets.check} dimension={14} /> : undefined}
              />
            ))}
          </Dropdown>
          <Dropdown
            aria-label="Select model"
            placement="top-left"
            value={{ text: state.model }}
            onOpen={() => send({ type: 'refresh-models' })}
            onSelect={picked => {
              if (picked.text === 'Custom model…') {
                send({ type: 'select-model' });
                return;
              }
              const choice = state.models.find(item => item.label === picked.text);
              if (choice && choice.value !== state.modelValue) send({ type: 'model', value: choice.value });
            }}
            trigger={
              <ActionButton size="base" rounding="full" variant="ghost" text={state.model}
                title={`${state.provider} · ${state.model}`}
                end={<ActionButtonIcon href={assets.chevronDown} dimension={14} />} />
            }
          >
            {state.models.map(choice => (
              <DropdownItem key={choice.value} type="text" size="small" text={choice.label}
                selected={choice.value === state.modelValue}
                end={choice.value === state.modelValue ? <ActionButtonIcon href={assets.check} dimension={14} /> : undefined}
              />
            ))}
            <DropdownItem type="divider" />
            <DropdownItem type="text" size="small" text="Custom model…" />
          </Dropdown>
        </div>
        {state.rules && <span className="rules-badge" title="Repository rules from .triplecode/rules.md are included in requests">Rules</span>}
        <span id="target" className="muted" title={target}>{target}</span>
        <ActionButton text={null} start={<ActionButtonIcon href={assets.context} />} aria-label="Attach context" title="Attach context" disabled={state.submitting}
          onClick={() => send({ type: 'attach-menu', id: selected })} />
        <ActionButton text={null} start={<ActionButtonIcon href={assets.attach} />} aria-label="Attach context" title="Attach context" disabled={state.submitting}
          onClick={() => send({ type: 'attach-menu', id: selected })} />
        <button aria-label={state.submitting ? 'Stop' : 'Send'} title={state.submitting ? 'Stop' : 'Send'}
          type={state.submitting ? 'button' : 'submit'} className="send" disabled={!!patch}
          onClick={state.submitting ? () => send({ type: 'stop', id: selected }) : undefined}>
          {state.submitting ? <span className="stop-glyph" aria-hidden="true" /> : <img src={assets.send} alt="" />}
        </button>
      </footer>
    </form>
  </main>;
}

const mount = document.getElementById('agent-root');
if (mount) {
  const initial: Initial = JSON.parse(document.getElementById('initial')!.textContent!);
  const root = createRoot(mount);
  flushSync(() => root.render(<Agent initial={initial} />));
}
