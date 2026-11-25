'use strict';

const RECENT_LIMIT = 8;

/** Empty workspace → show TripleCode Welcome (no account required). */
function shouldShowWelcome(workspaceFolderCount) {
  return !workspaceFolderCount;
}

/** MRU list for Welcome; newest first, unique, capped. */
function updateRecentFolders(existing, nextPath, limit = RECENT_LIMIT) {
  if (typeof nextPath !== 'string' || !nextPath.trim()) return (existing || []).slice(0, limit);
  const path = nextPath.trim();
  const rest = (existing || []).filter(item => item !== path);
  return [path, ...rest].slice(0, limit);
}

/** Drop missing paths from recent list (sync predicate). */
function filterExistingRecent(paths, existsSync) {
  return (paths || []).filter(path => {
    try {
      return existsSync(path);
    } catch {
      return false;
    }
  });
}

/** Product defaults that keep first launch free of Microsoft/Copilot AI login. */
function assertFirstLaunchDefaults(defaults) {
  const issues = [];
  if (defaults?.['chat.disableAIFeatures'] !== true) {
    issues.push('chat.disableAIFeatures must be true');
  }
  if (defaults?.['workbench.startupEditor'] !== 'none') {
    issues.push('workbench.startupEditor must be none (TripleCode Welcome owns empty window)');
  }
  return issues;
}

module.exports = {
  RECENT_LIMIT,
  shouldShowWelcome,
  updateRecentFolders,
  filterExistingRecent,
  assertFirstLaunchDefaults
};
