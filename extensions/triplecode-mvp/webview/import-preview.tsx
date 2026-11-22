import { useState } from 'react';
import { createRoot } from 'react-dom/client';

const categories = [
  { id: 'settings', title: 'Settings', unit: 'items', label: 'Import settings' },
  { id: 'keybindings', title: 'Keyboard Shortcuts', unit: 'items', label: 'Import keyboard shortcuts' },
  { id: 'snippets', title: 'User Snippets', unit: 'files', label: 'Import snippets' },
  { id: 'extensions', title: 'Extensions', unit: 'extensions', label: 'Import extensions (from Open VSX)' }
] as const;

type Category = typeof categories[number]['id'];
type Preview = Record<Category, number> & { source: string; hasBackup: boolean };
type Selection = Record<Category, boolean>;
type Message =
  | { type: 'import'; selectedCategories: Selection }
  | { type: 'import-file' | 'rollback' | 'cancel' };

declare function acquireVsCodeApi(): { postMessage(message: Message): void };
const vscode = acquireVsCodeApi();

function ImportPreview({ preview }: { preview: Preview }) {
  const [selected, setSelected] = useState<Selection>({
    settings: true,
    keybindings: true,
    snippets: true,
    extensions: true
  });

  return <>
    <h1>Import Profile</h1>
    <p>Source: <code>{preview.source}</code></p>
    {categories.map(({ id, title, unit, label }) => (
      <div className="section" key={id}>
        <h2>{title}</h2>
        <div className="count">{preview[id]} {unit}</div>
        <div className="checkbox">
          <label>
            <input type="checkbox" id={id} checked={selected[id]} onChange={event => {
              const checked = event.currentTarget.checked;
              setSelected(previous => ({ ...previous, [id]: checked }));
            }} />
            {label}
          </label>
        </div>
        {id === 'extensions' && <p className="marketplace-note">
          Note: Not all extensions may be available in Open VSX. You may need to install some manually.
        </p>}
      </div>
    ))}
    <div className="actions">
      <button type="button" className="primary" id="import"
        onClick={() => vscode.postMessage({ type: 'import', selectedCategories: selected })}>Import</button>
      <button type="button" className="secondary" id="import-file"
        onClick={() => vscode.postMessage({ type: 'import-file' })}>Import from File…</button>
      {preview.hasBackup && <button type="button" className="secondary" id="rollback"
        onClick={() => vscode.postMessage({ type: 'rollback' })}>Rollback Last Import</button>}
      <button type="button" className="secondary" id="cancel"
        onClick={() => vscode.postMessage({ type: 'cancel' })}>Cancel</button>
    </div>
  </>;
}

const preview: Preview = JSON.parse(document.getElementById('initial')!.textContent!);
createRoot(document.getElementById('import-preview-root')!).render(<ImportPreview preview={preview} />);
