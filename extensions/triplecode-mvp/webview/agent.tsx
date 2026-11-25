import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { FormEvent, UIEvent as ReactUIEvent } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { ActionButton, ActionButtonIcon } from './design-system/components/action-button';
import { Dropdown, DropdownItem } from './design-system/components/dropdown';
import { Accordion } from './design-system/components/accordion';
import type { TimelineItemProps } from './design-system/components/timeline';
import { Markdown } from './markdown';

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
  replies?: Reply[];
  plan?: { id: string; task: string; plan: string } | null;
  attachments?: Attachment[];
};
type ModelChoice = { value: string; label: string };
type ChatState = {
  chats: Chat[]; selected: number; draft: string; model: string; modelValue?: string; models?: ModelChoice[];
  provider?: string; rules?: boolean; progress?: Progress | null; status?: string;
  session?: SessionInfo | null; sessions?: SessionInfo[];
};
type DiffLine = { type: 'ctx' | 'add' | 'del'; text: string; line?: number };
type PatchFile = {
  name: string;
  start: number;
  removed: number;
  added?: number;
  hunk?: DiffLine[];
  lines?: string[];
};
type Patch = {
  request: string;
  files: PatchFile[];
  checking?: boolean;
  checks?: { command: string; code: number; output?: string; target: 'working-tree' | 'proposed-patch' }[];
};
type Reply =
  | string
  | { type: 'request'; text: string }
  | { type: 'timeline'; steps: TimelineItemProps[] };
type Turn = {
  id: number;
  request: string;
  steps?: TimelineItemProps[];
  stepsIndex?: number;
  answer?: string;
  answerIndex?: number;
};
type Assets = Record<'close' | 'plus' | 'actions' | 'chevron' | 'context' | 'attach' | 'send' |
  'crown' | 'listTodo' | 'messageSquare' | 'check' | 'chevronDown', string>;
type Initial = ChatState & { target: string; pending: Patch | null; assets: Assets };
type Progress = { chat: number; text: string; startedAt: number; steps?: TimelineItemProps[] };
type AttachCandidate = {
  id: string;
  label: string;
  description?: string;
  kind: 'file' | 'selection';
  path?: string;
  attachment: Attachment;
};
type AtMention = { start: number; query: string; end: number };
type HostMessage =
  | { type: 'focus-composer' }
  | { type: 'target'; name: string }
  | { type: 'pending'; patch: Patch }
  | ({ type: 'progress' } & Progress)
  | { type: 'complete' | 'error'; text: string }
  | ({ type: 'chats'; focusPrompt?: boolean } & ChatState)
  | { type: 'timeline-step'; chat: number; item: TimelineItemProps }
  | { type: 'stream-delta'; chat: number; text: string }
  | { type: 'attach-candidates'; id: number; items: AttachCandidate[]; open?: boolean }
  | { type: 'mcp-permission'; id: string; chat: number; server: string; tool: string; argsPreview: string };
type ViewMessage =
  | { type: 'select-chat' | 'close-chat' | 'stop' | 'attach-menu' | 'clear-queue' | 'attach-query'; id: number }
  | { type: 'mcp-permission-response'; id: string; decision: 'once' | 'always' | 'deny' }
  | { type: 'draft'; id: number; value: string }
  | { type: 'mode'; id: number; mode: Mode }
  | { type: 'propose'; id: number; request: string; mode: Mode }
  | { type: 'detach-context'; index: number }
  | { type: 'attach-file'; id: number; path: string }
  | { type: 'attach-pick'; id: number; attachment: Attachment }
  | { type: 'discard-plan' | 'execute-plan'; id: number; planId: string }
  | { type: 'update-plan'; id: number; planId: string; plan: string }
  | { type: 'new-chat' | 'chat-actions' | 'check' | 'check-patch' | 'discard' | 'apply' | 'review' |
      'select-model' | 'refresh-models' | 'ready' | 'close-agent' }
  | { type: 'model'; value: string }
  | { type: 'apply-file' | 'discard-file'; id: number; index: number }
  | { type: 'session-prepare' | 'session-background' | 'session-pr' };

type SessionInfo = {
  id: string;
  title?: string;
  kind?: string;
  status?: string;
  badge?: string;
  branch?: string;
  prUrl?: string;
  worktreePath?: string;
};

/** Mirror of context-rules.parseAtQuery for the webview bundle (no CJS require). */
function parseAtQuery(text: string, cursor: number): AtMention | null {
  if (!Number.isInteger(cursor) || cursor < 0 || cursor > text.length) return null;
  const before = text.slice(0, cursor);
  const match = before.match(/(?:^|[\s])@([^\s@]*)$/);
  if (!match) return null;
  return { start: before.lastIndexOf('@'), query: match[1], end: cursor };
}

function stripAtQuery(text: string, mention: AtMention): string {
  return `${text.slice(0, mention.start)}${text.slice(mention.end)}`;
}

function filterAttachCandidates(candidates: AttachCandidate[], query: string, limit = 12): AttachCandidate[] {
  const needle = query.toLowerCase();
  const out: AttachCandidate[] = [];
  for (const item of candidates) {
    const hay = `${item.label} ${item.description || ''}`.toLowerCase();
    if (needle && !hay.includes(needle)) continue;
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

type VsCodeApi = { postMessage(message: ViewMessage): void };
const vscode: VsCodeApi = (globalThis as { acquireVsCodeApi?: () => VsCodeApi }).acquireVsCodeApi?.()
  ?? { postMessage: () => {} };
const send = (message: ViewMessage) => vscode.postMessage(message);

type McpPermissionPrompt = {
  id: string;
  chat: number;
  server: string;
  tool: string;
  argsPreview: string;
};

type State = ChatState & {
  target: string;
  patch: Patch | null;
  mode: Mode;
  status: string;
  submitting: boolean;
  progress: Progress | null;
  streamText: string;
  focusRequest: number;
  provider: string;
  rules: boolean;
  models: ModelChoice[];
  modelValue: string;
  mcpPermission: McpPermissionPrompt | null;
  session: SessionInfo | null;
  sessions: SessionInfo[];
};
type Action = HostMessage |
  { type: 'edit'; value: string } |
  { type: 'set-mode'; mode: Mode } |
  { type: 'submit' } |
  { type: 'clear-mcp-permission' };

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
      return { ...state, patch: action.patch, status: '', submitting: false, progress: null, streamText: '', mcpPermission: null };
    case 'progress':
      return action.chat === state.selected
        ? { ...state, submitting: true, progress: { ...action, steps: state.progress?.steps || [] } }
        : state;
    case 'stream-delta':
      return action.chat === state.selected
        ? { ...state, submitting: true, streamText: action.text }
        : state;
    case 'complete':
      return { ...state, patch: null, status: action.text, submitting: false, progress: null, streamText: '', mcpPermission: null };
    case 'chats':
      return {
        ...state, chats: action.chats, selected: action.selected, draft: action.draft,
        model: action.model || state.model, mode: selectedMode(action), status: action.status || '',
        provider: action.provider || state.provider, rules: Boolean(action.rules),
        models: action.models ?? state.models, modelValue: action.modelValue ?? state.modelValue,
        submitting: Boolean(action.progress), progress: action.progress ? { ...action.progress, steps: state.progress?.steps || [] } : null,
        streamText: action.progress ? state.streamText : '',
        mcpPermission: action.progress ? state.mcpPermission : null,
        session: (action as ChatState & { session?: SessionInfo | null }).session ?? state.session,
        sessions: (action as ChatState & { sessions?: SessionInfo[] }).sessions ?? state.sessions,
        focusRequest: state.focusRequest + (action.focusPrompt ? 1 : 0)
      };
    case 'error':
      return { ...state, status: action.text, submitting: false, progress: null, streamText: '', mcpPermission: null };
    case 'timeline-step':
      if (action.chat === state.selected && state.progress) {
        const steps = [...(state.progress.steps || []), action.item];
        return { ...state, progress: { ...state.progress, steps } };
      }
      return state;
    case 'mcp-permission':
      return action.chat === state.selected
        ? {
          ...state,
          mcpPermission: {
            id: action.id,
            chat: action.chat,
            server: action.server,
            tool: action.tool,
            argsPreview: action.argsPreview
          }
        }
        : state;
    case 'edit':
      return { ...state, draft: action.value };
    case 'set-mode':
      return { ...state, mode: action.mode };
    case 'submit':
      return {
        ...state, submitting: true, status: '', streamText: '', mcpPermission: null,
        progress: { chat: state.selected, text: 'Working…', startedAt: Date.now() }
      };
    case 'clear-mcp-permission':
      return { ...state, mcpPermission: null };
    default:
      return state;
  }
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10.5 5.5v-2a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

function AgentRunSteps({ steps, expandDetails = true, live = false }: { steps: TimelineItemProps[]; expandDetails?: boolean; live?: boolean }) {
  return (
    <div className="agent-steps">
      {steps.map((step, index) => {
        const running = live && index === steps.length - 1;
        const cls = `agent-step-enter${running ? ' is-running' : ''}`;
        const style = { animationDelay: `${Math.min(index, 8) * 80}ms` };
        return step.description ? (
          <div className={cls} style={style} key={index}>
            <Accordion title={step.title} defaultExpanded={expandDetails}>
              <p>{step.description}</p>
            </Accordion>
          </div>
        ) : (
          <div className={cls} style={style} key={index}>
            <div className="agent-step">
              <span className="agent-step__title">{step.title}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressIndicator({ progress }: { progress: Progress }) {
  return (
    <div className="agent-turn agent-turn--live">
      <div className="agent-turn__label">Working</div>
      <Accordion title={progress.text} defaultExpanded className="agent-run">
        {progress.steps && progress.steps.length > 0 && (
          <AgentRunSteps steps={progress.steps} live />
        )}
      </Accordion>
    </div>
  );
}

/** Group flat replies into Request → Steps → Answer turns (S12). */
function groupTurns(replies: Reply[]): Turn[] {
  const turns: Turn[] = [];
  for (let index = 0; index < replies.length; index += 1) {
    const reply = replies[index];
    if (reply && typeof reply === 'object' && reply.type === 'request') {
      const turn: Turn = { id: index, request: reply.text };
      let cursor = index + 1;
      if (cursor < replies.length) {
        const next = replies[cursor];
        if (next && typeof next === 'object' && next.type === 'timeline') {
          turn.steps = next.steps;
          turn.stepsIndex = cursor;
          cursor += 1;
        }
      }
      if (cursor < replies.length && typeof replies[cursor] === 'string') {
        turn.answer = replies[cursor] as string;
        turn.answerIndex = cursor;
      }
      turns.push(turn);
    }
  }
  return turns;
}

function DiffHunk({ hunk, legacyLines, start }: { hunk?: DiffLine[]; legacyLines?: string[]; start: number }) {
  const lines: DiffLine[] = hunk?.length
    ? hunk
    : (legacyLines || []).map(text => ({ type: 'add' as const, text }));
  return (
    <pre className="patch-lines" aria-label="Diff preview">
      {lines.map((line, index) => {
        const mark = line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' ';
        const lineNo = line.line ?? (line.type === 'add' ? undefined : start + index);
        return (
          <div key={index} className={`patch-line patch-line--${line.type}`}>
            <span className="patch-line__no">{lineNo ?? ''}</span>
            <span className="patch-line__mark">{mark}</span>
            <span className="patch-line__text">{line.text}</span>
          </div>
        );
      })}
    </pre>
  );
}

function pathsFromDrop(data: DataTransfer): string[] {
  const paths: string[] = [];
  const push = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      const uri = new URL(trimmed);
      if (uri.protocol === 'file:') paths.push(decodeURIComponent(uri.pathname));
      return;
    } catch { /* not a URL */ }
    if (trimmed.startsWith('/')) paths.push(trimmed);
  };
  for (const type of ['CodeFiles', 'text/uri-list', 'text/plain', 'DownloadURL']) {
    const raw = data.getData(type);
    if (!raw) continue;
    for (const match of raw.matchAll(/"(?:fsPath|path|uri)"\s*:\s*"((?:file:\/\/|\/)[^"]+)"/g)) push(match[1]);
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        const resource = item?.resource ?? item?.uri ?? item;
        const fs = typeof resource === 'string' ? resource : resource?.fsPath ?? resource?.path;
        if (typeof fs === 'string') push(fs);
      }
    } catch {
      for (const line of raw.split(/\r?\n/)) push(line);
    }
  }
  if (!paths.length && data.files?.length) {
    for (const file of Array.from(data.files)) {
      const fileWithPath = file as File & { path?: string };
      const webUtils = (globalThis as { webUtils?: { getPathForFile?: (f: File) => string } }).webUtils;
      const p = fileWithPath.path || webUtils?.getPathForFile?.(file);
      if (p) paths.push(p);
    }
  }
  return [...new Set(paths)];
}

export type { Initial, ChatState, Chat, Patch, Progress };
export function Agent({ initial }: { initial: Initial }) {
  const [state, dispatch] = useReducer(update, {
    chats: initial.chats, selected: initial.selected, draft: initial.draft,
    model: initial.model || 'Model', target: initial.target, patch: initial.pending,
    mode: selectedMode(initial), status: initial.status || '',
    submitting: Boolean(initial.progress), progress: initial.progress ?? null, streamText: '',
    focusRequest: 0,
    provider: initial.provider || 'Auto', rules: Boolean(initial.rules),
    models: initial.models || [], modelValue: initial.modelValue || '',
    mcpPermission: null,
    session: (initial as ChatState & { session?: SessionInfo | null }).session ?? null,
    sessions: (initial as ChatState & { sessions?: SessionInfo[] }).sessions ?? []
  });
  const [filesOpen, setFilesOpen] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string>();
  const [navOpen, setNavOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expandedTimelines, setExpandedTimelines] = useState<ReadonlySet<number>>(new Set());
  const [activeTurn, setActiveTurn] = useState<number>();
  const [attachPool, setAttachPool] = useState<AttachCandidate[]>([]);
  const [atMention, setAtMention] = useState<AtMention | null>(null);
  const [atHighlight, setAtHighlight] = useState(0);
  const prompt = useRef<HTMLTextAreaElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const selectedRef = useRef(state.selected);
  const draftRef = useRef(state.draft);
  selectedRef.current = state.selected;
  draftRef.current = state.draft;
  const atItems = atMention ? filterAttachCandidates(attachPool, atMention.query) : [];
  const { patch, selected, mode } = state;
  const chat = state.chats.find(item => item.id === selected);
  const replies = chat?.replies || [];
  const attachments = chat?.attachments || [];
  const plan = chat?.plan;
  const planOpen = !!plan && expandedPlanId === plan.id;
  const progress = state.progress && state.progress.chat === selected ? state.progress : null;
  const streamText = state.submitting ? state.streamText : '';
  const { assets } = initial;

  const turns = groupTurns(replies);
  const navTurns = turns.map(turn => ({
    index: turn.id,
    text: turn.request,
    steps: turn.steps?.length || 0
  }));
  const orphanReplies = replies
    .map((reply, index) => ({ reply, index }))
    .filter(({ reply, index }) => {
      if (typeof reply === 'object' && reply.type === 'request') return false;
      return !turns.some(turn =>
        turn.stepsIndex === index || turn.answerIndex === index
      );
    });
  const reviewBelongsToLast = Boolean(patch && turns.length && !progress);

  useEffect(() => {
    setExpandedTimelines(new Set());
    setActiveTurn(undefined);
  }, [selected]);

  function jumpToTurn(turnIndex: number) {
    document.getElementById(`msg-${turnIndex}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setActiveTurn(turnIndex);
    const turn = turns.find(item => item.id === turnIndex);
    if (turn?.stepsIndex != null) {
      setExpandedTimelines(prev => new Set(prev).add(turn.stepsIndex!));
    }
  }

  function trackScroll(event: ReactUIEvent<HTMLElement>) {
    if (!navTurns.length) return;
    const container = event.currentTarget;
    const markerTop = container.getBoundingClientRect().top + 24;
    let current: number | undefined;
    for (const turn of navTurns) {
      const element = document.getElementById(`msg-${turn.index}`);
      if (!element) continue;
      if (element.getBoundingClientRect().top <= markerTop) current = turn.index;
      else break;
    }
    setActiveTurn(current ?? navTurns[0].index);
  }

  useLayoutEffect(() => {
    function receive(event: MessageEvent<HostMessage>) {
      const data = event.data;
      if (data.type === 'attach-candidates') {
        if (data.id !== selectedRef.current) return;
        setAttachPool(Array.isArray(data.items) ? data.items : []);
        setAtHighlight(0);
        if (data.open) {
          const field = prompt.current;
          const draft = draftRef.current;
          const cursor = field?.selectionStart ?? draft.length;
          const existing = parseAtQuery(draft, cursor);
          if (!existing && field) {
            const next = `${draft.slice(0, cursor)}@${draft.slice(cursor)}`;
            dispatch({ type: 'edit', value: next });
            send({ type: 'draft', id: selectedRef.current, value: next });
            setAtMention({ start: cursor, query: '', end: cursor + 1 });
            requestAnimationFrame(() => {
              field.focus();
              field.setSelectionRange(cursor + 1, cursor + 1);
            });
          } else if (existing) {
            setAtMention(existing);
          } else {
            setAtMention({ start: cursor, query: '', end: cursor });
          }
        }
        return;
      }
      dispatch(data);
      if (data.type === 'complete') setFilesOpen(true);
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

  useEffect(() => {
    setAtMention(null);
    setAttachPool([]);
    setAtHighlight(0);
  }, [selected]);

  function syncAtMention(value: string, cursor: number) {
    const mention = parseAtQuery(value, cursor);
    setAtMention(mention);
    setAtHighlight(0);
    if (mention && !attachPool.length) send({ type: 'attach-query', id: selected });
  }

  function pickAttach(item: AttachCandidate) {
    const field = prompt.current;
    const mention = atMention || (field ? parseAtQuery(state.draft, field.selectionStart ?? state.draft.length) : null);
    const next = mention ? stripAtQuery(state.draft, mention) : state.draft;
    setAtMention(null);
    setAtHighlight(0);
    dispatch({ type: 'edit', value: next });
    send({ type: 'draft', id: selected, value: next });
    send({ type: 'attach-pick', id: selected, attachment: item.attachment });
    requestAnimationFrame(() => {
      if (!field) return;
      field.focus();
      const pos = mention ? mention.start : next.length;
      field.setSelectionRange(pos, pos);
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (patch || atMention) return;
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
      <ActionButton text={null} start={<ActionButtonIcon href={assets.listTodo} dimension={14} />} aria-label="Request history"
        aria-pressed={navOpen} disabled={!!patch || navTurns.length === 0}
        onClick={() => setNavOpen(open => !open)} />
    </header>
    <div className="conversation-wrap">
    <section id="conversation" className="conversation" hidden={!replies.length && !patch && !progress && !streamText} aria-label="Agent output" onScroll={trackScroll}>
      <div id="messages">
        {turns.map((turn, turnPos) => {
          const isLast = turnPos === turns.length - 1;
          return (
            <article className="agent-turn" key={turn.id} aria-label={`Turn ${turnPos + 1}`}>
              <p className="agent-message agent-message--request" id={`msg-${turn.id}`}>{turn.request}</p>
              {turn.steps && turn.steps.length > 0 && turn.stepsIndex != null && (
                <Accordion
                  title={`${turn.steps.length} step${turn.steps.length === 1 ? '' : 's'}`}
                  className="agent-run agent-run--history"
                  expanded={expandedTimelines.has(turn.stepsIndex)}
                  onExpandedChange={open => setExpandedTimelines(prev => {
                    const next = new Set(prev);
                    if (open) next.add(turn.stepsIndex!); else next.delete(turn.stepsIndex!);
                    return next;
                  })}>
                  <AgentRunSteps steps={turn.steps} expandDetails={false} />
                </Accordion>
              )}
              {turn.answer != null && (
                <div className="agent-bubble">
                  <Markdown source={turn.answer} className="agent-message agent-message--md" />
                  <button type="button" className="agent-copy" title="Copy response" aria-label="Copy response"
                    onClick={() => void copyText(turn.answer!)}>
                    <CopyIcon />
                  </button>
                </div>
              )}
              {isLast && reviewBelongsToLast && patch && (
                <div className="agent-turn__review">
                  <div className="agent-turn__label">Review</div>
                  <p id="task" className="agent-message request">{patch.request}</p>
                </div>
              )}
            </article>
          );
        })}
        {orphanReplies.map(({ reply, index }) => {
          if (typeof reply === 'object' && reply.type === 'timeline') {
            return (
              <Accordion key={index} title={`${reply.steps.length} step${reply.steps.length === 1 ? '' : 's'}`}
                className="agent-run agent-run--history"
                expanded={expandedTimelines.has(index)}
                onExpandedChange={open => setExpandedTimelines(prev => {
                  const next = new Set(prev);
                  if (open) next.add(index); else next.delete(index);
                  return next;
                })}>
                <AgentRunSteps steps={reply.steps} expandDetails={false} />
              </Accordion>
            );
          }
          if (typeof reply === 'string') {
            return (
              <div className="agent-bubble" key={index}>
                <Markdown source={reply} className="agent-message agent-message--md" />
                <button type="button" className="agent-copy" title="Copy response" aria-label="Copy response"
                  onClick={() => void copyText(reply)}>
                  <CopyIcon />
                </button>
              </div>
            );
          }
          return null;
        })}
        {progress && <ProgressIndicator progress={progress} />}
        {streamText && (
          <div className="agent-bubble agent-bubble--stream" aria-live="polite">
            <Markdown source={streamText} className="agent-message agent-message--md" />
            <span className="stream-cursor" aria-hidden="true" />
          </div>
        )}
        {state.mcpPermission && state.mcpPermission.chat === selected && (
          <div className="mcp-permission" role="alertdialog" aria-labelledby="mcp-permission-title">
            <div className="mcp-permission__title" id="mcp-permission-title">
              Allow MCP tool <code>{state.mcpPermission.server}/{state.mcpPermission.tool}</code>?
            </div>
            {state.mcpPermission.argsPreview && state.mcpPermission.argsPreview !== '{}' && (
              <pre className="mcp-permission__args">{state.mcpPermission.argsPreview}</pre>
            )}
            <div className="mcp-permission__actions">
              <ActionButton rounding="full" text="Deny"
                onClick={() => {
                  send({ type: 'mcp-permission-response', id: state.mcpPermission!.id, decision: 'deny' });
                  dispatch({ type: 'clear-mcp-permission' });
                }} />
              <ActionButton rounding="full" text="Allow once"
                onClick={() => {
                  send({ type: 'mcp-permission-response', id: state.mcpPermission!.id, decision: 'once' });
                  dispatch({ type: 'clear-mcp-permission' });
                }} />
              <ActionButton variant="filled" text="Always allow"
                onClick={() => {
                  send({ type: 'mcp-permission-response', id: state.mcpPermission!.id, decision: 'always' });
                  dispatch({ type: 'clear-mcp-permission' });
                }} />
            </div>
          </div>
        )}
      </div>
      {patch && <>
        {!reviewBelongsToLast && <p id="task" className="agent-message request">{patch.request}</p>}
        <div id="patch" className="patch" hidden={!filesOpen}>
          <div id="patch-files">
            {patch.files.map((file, index) => {
              const added = file.added ?? file.lines?.length ?? 0;
              const removed = file.removed || 0;
              return (
                <div className="patch" key={`${file.name}-${index}`}>
                  <div className="patch-file">
                    <button type="button" className="patch-file__name" title="Open full diff"
                      onClick={() => send({ type: 'review' })}>{file.name}</button>
                    <span className="patch-file-actions">
                      <span className="patch-stat">+{added}{removed ? ` −${removed}` : ''}</span>
                      <ActionButton size="base" rounding="full" text="Keep" disabled={patch.checking}
                        title="Apply only this file"
                        onClick={() => send({ type: 'apply-file', id: selected, index })} />
                      <ActionButton size="base" rounding="full" text="Drop" disabled={patch.checking}
                        title="Drop this file from the patch"
                        onClick={() => send({ type: 'discard-file', id: selected, index })} />
                    </span>
                  </div>
                  <DiffHunk hunk={file.hunk} legacyLines={file.lines} start={file.start} />
                </div>
              );
            })}
          </div>
        </div>
      </>}
    </section>
    {navOpen && navTurns.length > 0 && (
      <aside className="agent-nav" aria-label="Request history">
        <div className="agent-nav__title">Requests</div>
        {navTurns.map((turn, position) => (
          <button type="button" key={turn.index}
            className={activeTurn === turn.index ? 'agent-nav__item is-active' : 'agent-nav__item'}
            title={turn.text} aria-current={activeTurn === turn.index || undefined}
            onClick={() => jumpToTurn(turn.index)}>
            <span className="agent-nav__num">{position + 1}</span>
            <span className="agent-nav__text">
              {turn.text.length > 80 ? `${turn.text.slice(0, 80)}…` : turn.text}
              {turn.steps > 0 && <span className="agent-nav__steps"> · {turn.steps} step{turn.steps === 1 ? '' : 's'}</span>}
            </span>
          </button>
        ))}
      </aside>
    )}
    </div>
    <p id="status" role="status" hidden={!state.status}>{state.status}</p>
    <form id="request" className={dragOver ? 'composer drag-over' : 'composer'} onSubmit={submit}
      onDragOver={event => {
        if (patch || state.submitting) return;
        if (!event.dataTransfer.types.some(type => ['Files', 'CodeFiles', 'text/uri-list', 'text/plain'].includes(type))) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setDragOver(true);
      }}
      onDragLeave={event => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragOver(false);
      }}
      onDrop={event => {
        event.preventDefault();
        setDragOver(false);
        if (patch || state.submitting) return;
        for (const path of pathsFromDrop(event.dataTransfer)) {
          send({ type: 'attach-file', id: selected, path });
        }
      }}>
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
      <div className="session-bar" aria-label="Session handoff">
        <div className="session-bar__meta">
          <span className="session-bar__badge">{state.session?.badge || 'Local'}</span>
          <span className="session-bar__status">
            {state.session?.status || 'idle'}
            {state.session?.branch ? ` · ${state.session.branch}` : ''}
          </span>
        </div>
        <div className="session-bar__actions">
          <ActionButton rounding="full" text="Worktree" disabled={state.submitting || !!patch}
            title="Prepare an isolated git worktree for this session"
            onClick={() => send({ type: 'session-prepare' })} />
          <ActionButton rounding="full" text="Background" disabled={state.submitting || !!patch}
            title="Mark session as background (local stub until cloud runtime)"
            onClick={() => send({ type: 'session-background' })} />
          <ActionButton rounding="full" text="PR" disabled={state.submitting}
            title="Open idempotent PR create/compare URL"
            onClick={() => send({ type: 'session-pr' })} />
        </div>
      </div>
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
          ? <textarea className="plan-text" id="plan-text" aria-label="Editable plan"
              defaultValue={plan.plan} key={plan.id + plan.plan.length}
              disabled={state.submitting || !!patch}
              onBlur={event => {
                const next = event.currentTarget.value;
                if (next.trim() && next !== plan.plan) {
                  send({ type: 'update-plan', id: selected, planId: plan.id, plan: next });
                }
              }} />
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
      <div className="composer-prompt">
        {atMention && <div id="at-picker" className="at-picker" role="listbox" aria-label="Attach context">
          {atItems.length === 0
            ? <div className="at-picker__empty">No matches — keep typing or Esc</div>
            : atItems.map((item, index) => (
              <button type="button" role="option" key={item.id}
                className={index === atHighlight ? 'at-picker__item is-active' : 'at-picker__item'}
                aria-selected={index === atHighlight}
                onMouseEnter={() => setAtHighlight(index)}
                onClick={() => pickAttach(item)}>
                <span className="at-picker__label">{item.label}</span>
                {item.description && <span className="at-picker__desc">{item.description}</span>}
              </button>
            ))}
        </div>}
        <label className="sr-only" htmlFor="prompt">Agent task</label>
        <textarea id="prompt" ref={prompt} maxLength={500}
          placeholder="Describe a task. Type @ for context." required disabled={!!patch}
          value={state.draft}
          aria-expanded={Boolean(atMention)}
          aria-controls={atMention ? 'at-picker' : undefined}
          onChange={event => {
            const value = event.currentTarget.value;
            const cursor = event.currentTarget.selectionStart ?? value.length;
            dispatch({ type: 'edit', value });
            send({ type: 'draft', id: selected, value });
            if (!state.submitting) syncAtMention(value, cursor);
          }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            const field = event.currentTarget;
            if (atMention) {
              if (event.key === 'Escape') {
                event.preventDefault();
                setAtMention(null);
                return;
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setAtHighlight(i => atItems.length ? (i + 1) % atItems.length : 0);
                return;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setAtHighlight(i => atItems.length ? (i - 1 + atItems.length) % atItems.length : 0);
                return;
              }
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                const item = atItems[atHighlight] || atItems[0];
                if (item) pickAttach(item);
                return;
              }
              if (event.key === 'Tab' && atItems.length) {
                event.preventDefault();
                const item = atItems[atHighlight] || atItems[0];
                if (item) pickAttach(item);
                return;
              }
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              if (state.submitting) send({ type: 'stop', id: selected });
              else send({ type: 'close-agent' });
              return;
            }
            if (event.key === 'Backspace' && !state.submitting &&
                field.value === '' && field.selectionStart === 0 && attachments.length) {
              event.preventDefault();
              send({ type: 'detach-context', index: attachments.length - 1 });
              return;
            }
            if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
              event.preventDefault();
              if (!state.submitting && !atMention) field.form?.requestSubmit();
            }
          }} />
      </div>
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
