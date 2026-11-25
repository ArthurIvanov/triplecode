import type { Meta, StoryObj } from '@storybook/react-vite';
import { Agent, type Initial, type Patch } from '../agent';
import '../design-system/components/action-button/action-button.css';

const assets = {
  close: '/figma-assets/imgX.svg',
  plus: '/imgPlus1.svg',
  actions: '/imgEllipsis.svg',
  chevron: '/figma-assets/imgChevronRight.svg',
  context: '/figma-assets/imgShape.svg',
  attach: '/imgPaperclip.svg',
  send: '/imgPlay.svg'
};

const base: Initial = {
  target: 'index.ts',
  model: 'gpt-4o-mini',
  provider: 'OpenRouter',
  rules: false,
  draft: '',
  chats: [
    { id: 1, name: 'Fix login flow', mode: 'agent', replies: ['Done — I updated the handler.'] },
    { id: 2, mode: 'ask', replies: ['`fetchUserProfile` loads the user by email.'] }
  ],
  selected: 1,
  pending: null,
  assets
};

const patch: Patch = {
  request: 'add a greetAllUsers function in index.ts that uses greetUser from utils.ts',
  files: [
    {
      name: 'index.ts',
      lines: ['export function greetAllUsers(users) {', '  return users.map(greetUser);', '}'],
      start: 10,
      removed: 0
    },
    {
      name: 'utils.ts',
      lines: ['export function shoutUser(user) {', '  return user.name.toUpperCase();', '}'],
      start: 4,
      removed: 2
    }
  ],
  checks: [
    { command: 'npm test', code: 0, output: 'ok', target: 'working-tree' },
    { command: 'npm test', code: 1, output: 'FAIL utils.ts', target: 'proposed-patch' }
  ]
};

const meta = {
  title: 'Agent/Panel',
  component: Agent,
  parameters: { layout: 'fullscreen' }
} satisfies Meta<typeof Agent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { initial: base } };

export const EmptyFresh: Story = {
  args: {
    initial: {
      ...base,
      chats: [{ id: 1, name: 'New chat', mode: 'agent', replies: [] }],
      selected: 1,
      draft: ''
    }
  }
};

export const WithDraft: Story = {
  args: { initial: { ...base, draft: 'add a deleteUser function to index.ts' } }
};

export const WithAttachments: Story = {
  args: {
    initial: {
      ...base,
      chats: [{
        ...base.chats[0],
        attachments: [
          { kind: 'file', path: '/repo/src/index.ts' },
          { kind: 'selection', label: 'selection · index.ts', text: 'export function greetUser' }
        ]
      }],
      draft: 'refactor this @'
    }
  }
};

export const PlanReady: Story = {
  args: {
    initial: {
      ...base,
      chats: [{
        ...base.chats[0],
        plan: {
          task: 'add email validation and a deleteUser function',
          plan: '1. Add validateEmail helper in utils.ts\n2. Use it in createUser\n3. Add deleteUser export in index.ts\n4. Update tests'
        }
      }]
    }
  }
};

export const ReviewPatch: Story = {
  args: { initial: { ...base, pending: patch } }
};

export const ReviewChecking: Story = {
  args: { initial: { ...base, pending: { ...patch, checking: true, checks: [] } } }
};

export const Running: Story = {
  args: {
    initial: {
      ...base,
      draft: 'next task while agent works',
      progress: { chat: 1, text: 'Waiting for model…', startedAt: Date.now() - 4200 }
    }
  }
};

export const Queued: Story = {
  args: {
    initial: {
      ...base,
      chats: [{ ...base.chats[0], queued: 2 }],
      progress: { chat: 1, text: 'Expanding context…', startedAt: Date.now() - 8000 }
    }
  }
};

export const RulesBadge: Story = {
  args: { initial: { ...base, rules: true } }
};

export const ErrorStatus: Story = {
  args: { initial: { ...base, status: 'Model request failed (HTTP 403): Access denied' } }
};
