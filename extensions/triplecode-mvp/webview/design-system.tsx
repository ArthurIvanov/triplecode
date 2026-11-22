import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ActionButton, type ActionButtonSize, type ActionButtonState, type ActionButtonVariant } from './action-button';
import { componentCatalog, reactSupport, type ComponentPreview } from './component-catalog';

const media: string = JSON.parse(document.getElementById('initial')!.textContent!);
const asset = (name: string) => `${media}/${name}`;
const designUrl = 'https://www.figma.com/design/H0WMYGGclEWe3lbjUabY3h/Triplecode-app';

function CatalogPreview({ name, preview }: { name: string; preview: ComponentPreview }) {
  const parts = preview.content.split('|');
  return <div className={`catalog-preview catalog-preview--${preview.kind}`} role="img" aria-label={`${name} preview`}>
    {preview.kind === 'logo' ? <img src={asset('imgLogo1.png')} alt="" />
      : parts.map((part, index) => <span key={index}>{part}</span>)}
  </div>;
}

function Catalog() {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const visibleGroups = componentCatalog.map(group => ({
    ...group,
    components: group.components.filter(([name, usage, source, preview, node]) =>
      [group.title, group.implementation, name, usage, source, reactSupport[preview.react].label, node]
        .join(' ').toLowerCase().includes(query))
  })).filter(group => group.components.length);
  const count = visibleGroups.reduce((total, group) => total + group.components.length, 0);

  return <>
    <h2>Component catalog</h2>
    <p className="muted">Previews illustrate the current UI. Figma links open the mapped design.</p>
    <div className="catalog-toolbar">
      <label>Search components
        <input type="search" value={search} onChange={event => setSearch(event.currentTarget.value)}
          placeholder="Name, usage, or source" />
      </label>
      <span role="status">{count} {count === 1 ? 'component' : 'components'}</span>
    </div>
    {!count && <p>No components match the search.</p>}
    {visibleGroups.map(group => (
      <section className="catalog-group" key={group.title} aria-label={group.title}>
        <h3>{group.title}</h3>
        <p className="catalog-source">{group.implementation}</p>
        <div className="catalog-table">
          <table aria-label={`${group.title} components`}>
            <thead><tr><th scope="col">Component</th><th scope="col">Preview</th><th scope="col">Used in</th><th scope="col">Code</th><th scope="col">React</th><th scope="col">Figma</th></tr></thead>
            <tbody>
              {group.components.map(([name, usage, entryPoint, preview, figmaNode]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td><CatalogPreview name={name} preview={preview} /></td>
                  <td>{usage}</td>
                  <td><code>{entryPoint}</code></td>
                  <td className="catalog-react"><strong>{reactSupport[preview.react].label}</strong>
                    <span>{reactSupport[preview.react].detail}</span></td>
                  <td>{figmaNode
                    ? <a href={`${designUrl}?node-id=${figmaNode.replace(':', '-')}`}>View node</a>
                    : <span className="muted">Unmapped</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    ))}
  </>;
}

function FigmaWelcome() {
  return <>
    <h2>Figma Welcome Screen (Synced)</h2>
    <div className="component-preview" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="window-buttons">
            <img src={asset('figma-assets/imgWindowButtons.svg')} alt="Window controls" />
          </div>
          <div style={{ display: 'flex', gap: 'var(--triplecode-gap-dependent)', alignItems: 'center' }}>
            <button className="action-button">
              <img src={asset('figma-assets/imgChevronLeft.svg')} alt="Back" />
            </button>
            <button className="action-button">
              <img src={asset('figma-assets/imgChevronRight.svg')} alt="Forward" />
            </button>
          </div>
        </div>
        <div className="top-bar-center">
          <button className="action-button" style={{ padding: '0 var(--triplecode-padding-s)' }}>
            <span className="action-button-text">TripleCode</span>
          </button>
        </div>
        <div className="top-bar-right" />
      </div>
      <div className="welcome-content" style={{ height: '600px' }}>
        <div className="welcome-container">
          <img className="welcome-logo" src={asset('imgLogo1.png')} alt="TripleCode" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span className="tag"><span className="tag-text">Free</span></span>
            <a href="#" className="link">Settings</a>
          </div>
          <div className="card-grid">
            <button className="card">
              <div className="card-content">
                <img className="card-icon" src={asset('figma-assets/imgFolder.svg')} alt="Folder" />
                <span className="card-text">Open project</span>
              </div>
            </button>
            <button className="card">
              <div className="card-content">
                <img className="card-icon" src={asset('figma-assets/imgFolderGit2.svg')} alt="Folder Git" />
                <span className="card-text">Clone repo</span>
              </div>
            </button>
            <button className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-content">
                <img className="card-icon" src={asset('figma-assets/imgSquareTerminal.svg')} alt="Terminal" />
                <span className="card-text">Connect via SSH</span>
              </div>
            </button>
          </div>
          <div className="stack">
            <div className="stack-center">
              <p>Projects you open will appear here.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="bottom-bar">
        <div className="bottom-bar-left">
          <button className="icon-button">
            <img src={asset('figma-assets/imgChevronsRightLeftAngle.svg')} alt="Layout" />
          </button>
          <button className="button">
            <img src={asset('figma-assets/imgGitBranch.svg')} alt="Git" />
            <span className="button-text">Local workspace</span>
          </button>
        </div>
        <div className="bottom-bar-right">
          <span className="status-text">TripleCode IDE</span>
        </div>
      </div>
    </div>
  </>;
}

function LegacyWelcome() {
  return <>
    <h2>Welcome Screen (Legacy)</h2>
    <div className="component-preview">
      <main className="welcome" style={{ width: '362px', margin: 0 }}>
        <img className="logo" src={asset('imgLogo1.png')} alt="TripleCode" />
        <div className="welcome-meta"><span className="tag">Free</span><button className="link">Settings</button></div>
        <div className="card-grid">
          <button className="card"><img src={asset('imgFolder.svg')} alt="" /><span>Open project</span></button>
          <button className="card"><img src={asset('imgFolderGit2.svg')} alt="" /><span>Clone repo</span></button>
          <button className="card"><img src={asset('imgSquareTerminal.svg')} alt="" /><span>Connect via SSH</span></button>
        </div>
        <div className="stack"><div className="stack-center"><p>Projects you open will appear here.</p></div></div>
      </main>
    </div>
  </>;
}

function AgentPreview() {
  return <>
    <h2>Agent Panel</h2>
    <div className="component-preview" style={{ height: '400px' }}>
      <main className="agent">
        <header className="chat-header">
          <div id="chats" style={{ display: 'flex', gap: '4px' }}>
            <div className="chat-tab" style={{ borderColor: 'var(--vscode-editorGroup-border)', background: 'var(--vscode-sideBar-background)', color: 'var(--vscode-foreground)' }}>
              <button style={{ padding: '0 2px', border: 0, background: 'transparent', color: 'inherit' }}>Chat 1</button>
              <button style={{ padding: '0 2px', border: 0, background: 'transparent', color: 'inherit' }}>×</button>
            </div>
          </div>
          <button className="icon-button"><img src={asset('imgPlus1.svg')} style={{ width: '16px', height: '16px' }} alt="" /></button>
          <button className="icon-button"><img src={asset('imgEllipsis.svg')} style={{ width: '16px', height: '16px' }} alt="" /></button>
        </header>
        <section className="conversation" style={{ flex: 1, overflow: 'auto' }}>
          <p className="agent-message">Add a comment: MVP preview</p>
        </section>
        <form className="composer">
          <div className="composer-header">
            <div className="review-row">
              <button type="button" className="files-toggle" aria-expanded="true">
                <img src={asset('figma-assets/imgChevronRight.svg')} alt="" />
                <span>1 file</span>
              </button>
              <div className="review-actions">
                <button type="button" className="pill-action">Run checks</button>
                <button type="button" className="pill-action">Undo all</button>
                <button type="button" className="pill-action">Keep all</button>
                <button type="button" className="review-btn">Review</button>
              </div>
            </div>
          </div>
          <textarea placeholder="Press / for skills, @ for context" disabled style={{ minHeight: '30px' }}></textarea>
          <footer className="chat-actions">
            <div className="mode-picker">
              <button type="button" className="pill mode" aria-expanded="false">Agent</button>
              <div className="mode-menu" role="listbox" hidden>
                <button type="button" role="option">Ask</button>
                <button type="button" role="option">Plan</button>
                <button type="button" role="option" aria-selected="true">Agent</button>
              </div>
            </div>
            <button type="button" className="pill model-pill" id="model-pill" data-action="select-model" title="Select model">Model</button>
            <span id="target" className="muted">src/index.ts</span>
            <button type="button" className="icon-button context-btn" disabled aria-label="Attach context"><img src={asset('figma-assets/imgShape.svg')} alt="" /></button>
            <button type="button" className="icon-button attachment" disabled aria-label="Attach context"><img src={asset('imgPaperclip.svg')} alt="" /></button>
            <button type="button" className="send" disabled><img src={asset('imgPlay.svg')} alt="" /></button>
          </footer>
        </form>
      </main>
    </div>
  </>;
}

const actionButtonSizes = ['large', 'base', 'small'] as const;
const actionButtonVariants = ['ghost', 'filled'] as const;
const actionButtonStates = ['enabled', 'hover', 'active', 'focus', 'disabled'] as const;

// Figma exports a separate SVG for each size and color of the sample X instance.
const actionButtonSampleIcons: Record<ActionButtonVariant, Record<ActionButtonSize, Record<ActionButtonState, number>>> = {
  ghost: {
    large: { enabled: 14, hover: 13, active: 14, focus: 13, disabled: 7 },
    base: { enabled: 12, hover: 12, active: 12, focus: 12, disabled: 3 },
    small: { enabled: 11, hover: 11, active: 11, focus: 11, disabled: 0 }
  },
  filled: {
    large: { enabled: 8, hover: 10, active: 9, focus: 8, disabled: 7 },
    base: { enabled: 5, hover: 6, active: 5, focus: 4, disabled: 3 },
    small: { enabled: 1, hover: 2, active: 1, focus: 1, disabled: 0 }
  }
};

function ActionButtonPreview() {
  const [pressed, setPressed] = useState(false);

  return <section className="action-button-preview">
    <h3><a href={`${designUrl}?node-id=181-1367`}>ActionButton</a></h3>
    <ActionButton rounding="full" start={false} text="Toggle action" aria-pressed={pressed} onClick={() => setPressed(!pressed)} />
    {[false, true].map(iconOnly => (
      <div className="action-button-matrix-scroll" key={String(iconOnly)}>
        <table className="action-button-matrix">
          <caption>{iconOnly ? 'Icon only' : 'Icon and label'}</caption>
          <thead>
            <tr>
              <th scope="col">State</th>
              {(['default', 'full'] as const).flatMap(rounding =>
                actionButtonVariants.map(variant => <th key={`${rounding}-${variant}`} scope="colgroup" colSpan={3}>{variant} · {rounding}</th>)
              )}
            </tr>
          </thead>
          <tbody>
            {actionButtonStates.map(state => <tr key={state}>
              <th scope="row">{state}</th>
              {(['default', 'full'] as const).flatMap(rounding =>
                actionButtonVariants.flatMap(variant => actionButtonSizes.map(size => {
                  const reference = actionButtonSampleIcons[variant][size][state];
                  const icon = <img src={asset(`figma-assets/action-button/x${reference ? `-${reference}` : ''}.svg`)} alt="" />;
                  const props = { icon, rounding, size, state, variant, tabIndex: -1 };
                  const label = `${variant}, ${rounding}, ${size}, ${state}`;
                  return <td key={`${rounding}-${variant}-${size}`}>
                    {iconOnly
                      ? <ActionButton {...props} iconOnly aria-label={label} />
                      : <ActionButton {...props} aria-label={`Action, ${label}`} />}
                  </td>;
                }))
              )}
            </tr>)}
          </tbody>
        </table>
      </div>
    ))}
  </section>;
}

function ButtonsPreview() {
  return <>
    <h2>Buttons</h2>
    <ActionButtonPreview />
    <div className="component-preview">
      <div className="component-row">
        <div className="component-item">
          <button>Default</button>
          <h3>Default</h3>
        </div>
        <div className="component-item">
          <button className="primary">Primary</button>
          <h3>Primary</h3>
        </div>
        <div className="component-item">
          <button className="secondary">Secondary</button>
          <h3>Secondary</h3>
        </div>
        <div className="component-item">
          <button disabled>Disabled</button>
          <h3>Disabled</h3>
        </div>
      </div>
      <div className="component-row" style={{ marginTop: '20px' }}>
        <div className="component-item">
          <button className="link">Link button</button>
          <h3>Link</h3>
        </div>
        <div className="component-item">
          <button className="icon-button"><img src={asset('imgCog.svg')} style={{ width: '16px', height: '16px' }} alt="" /></button>
          <h3>Icon button</h3>
        </div>
      </div>
    </div>
  </>;
}

function FormsPreview() {
  return <>
    <h2>Forms</h2>
    <div className="component-preview">
      <div className="component-row">
        <div className="component-item" style={{ width: '100%' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>Text input</label>
          <input type="text" style={{ width: '100%', padding: '8px', border: '1px solid var(--vscode-input-border)', borderRadius: '4px', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }} placeholder="Enter text..." />
        </div>
      </div>
      <div className="component-row" style={{ marginTop: '20px' }}>
        <div className="component-item">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" defaultChecked />
            <span>Checkbox option</span>
          </label>
        </div>
      </div>
      <div className="component-row" style={{ marginTop: '20px' }}>
        <div className="component-item">
          <textarea style={{ width: '300px', minHeight: '80px', padding: '8px', border: '1px solid var(--vscode-input-border)', borderRadius: '4px', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', resize: 'vertical' }} placeholder="Textarea..."></textarea>
        </div>
      </div>
    </div>
  </>;
}

type TabExample = { label: string; icon?: string };

const fileTabs = ['index.ts', 'app.tsx', 'styles.css'].map(label => ({ label }));
const iconTabs = [
  { label: 'Explorer', icon: 'imgFiles.svg' },
  { label: 'Search', icon: 'imgSearch.svg' },
  { label: 'Git', icon: 'imgGitBranch.svg' }
];
const tabGroups = [
  { title: 'Default Tabs', tabs: fileTabs },
  { title: 'Tabs with Icons', tabs: iconTabs },
  { title: 'Single Tab', tabs: [{ label: 'README.md' }] },
  {
    title: 'Many Tabs (scrollable)',
    tabs: [...fileTabs, ...['utils.ts', 'config.json', 'package.json', 'README.md', 'CHANGELOG.md'].map(label => ({ label }))]
  }
];

function TabSamples({ tabs }: { tabs: TabExample[] }) {
  const [items, setItems] = useState(tabs);
  const [active, setActive] = useState(tabs[0]?.label);

  function close(label: string) {
    const remaining = items.filter(tab => tab.label !== label);
    setItems(remaining);
    if (active === label) setActive(remaining[0]?.label);
  }

  return items.map(({ label, icon }) => (
    <div key={label} className={active === label ? 'tc-design-tab active' : 'tc-design-tab'}>
      <button type="button" aria-pressed={active === label} onClick={() => setActive(label)}>
        {icon && <img src={asset(`figma-assets/${icon}`)} alt="" />}
        <span>{label}</span>
      </button>
      <button type="button" className="tc-design-tab-close" aria-label={`Close ${label}`} onClick={() => close(label)}>
        <img src={asset('figma-assets/imgX.svg')} alt="" />
      </button>
    </div>
  ));
}

function TabsPreview() {
  return <>
    <h2>Tabs</h2>
    <div className="component-preview">
      {tabGroups.map(({ title, tabs }, index) => (
        <div className="component-row" key={title} style={index ? { marginTop: 30 } : undefined}>
          <div className="component-item" style={{ width: '100%' }}>
            <h3>{title}</h3>
            <div className="tc-design-tabs">
              <TabSamples tabs={tabs} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </>;
}

const sections = [
  { id: 'catalog', label: 'Catalog', Preview: Catalog },
  { id: 'figma-welcome', label: 'Figma Welcome', Preview: FigmaWelcome },
  { id: 'welcome', label: 'Legacy Welcome', Preview: LegacyWelcome },
  { id: 'agent', label: 'Agent Panel', Preview: AgentPreview },
  { id: 'buttons', label: 'Buttons', Preview: ButtonsPreview },
  { id: 'forms', label: 'Forms', Preview: FormsPreview },
  { id: 'tabs', label: 'Tabs', Preview: TabsPreview }
] as const;

function DesignSystem() {
  const [active, setActive] = useState<typeof sections[number]['id']>('catalog');

  return <>
    <h1>TripleCode Design System</h1>
    <nav className="nav">
      {sections.map(({ id, label }) => (
        <button type="button" key={id} data-component={id} className={id === active ? 'active' : undefined}
          onClick={() => setActive(id)}>{label}</button>
      ))}
    </nav>
    <div id="components">
      {sections.map(({ id, Preview }) => (
        <div key={id} className="section" data-section={id} hidden={id !== active}>
          <Preview />
        </div>
      ))}
    </div>
  </>;
}

createRoot(document.getElementById('design-system-root')!).render(<DesignSystem />);
