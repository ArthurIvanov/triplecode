'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  shouldShowWelcome, updateRecentFolders, filterExistingRecent, assertFirstLaunchDefaults
} = require('../welcome-logic.cjs');

describe('S01 first launch welcome', () => {
  it('shows welcome only when workspace is empty', () => {
    assert.equal(shouldShowWelcome(0), true);
    assert.equal(shouldShowWelcome(1), false);
  });

  it('records recent folders MRU without account', () => {
    assert.deepEqual(updateRecentFolders([], '/Users/me/proj'), ['/Users/me/proj']);
    assert.deepEqual(
      updateRecentFolders(['/a', '/b'], '/b'),
      ['/b', '/a']
    );
    const many = updateRecentFolders(['1', '2', '3', '4', '5', '6', '7', '8'], '9');
    assert.equal(many.length, 8);
    assert.equal(many[0], '9');
  });

  it('drops missing recent paths so cancel/missing do not leave half-open UX', () => {
    const exists = path => path === '/exists';
    assert.deepEqual(
      filterExistingRecent(['/exists', '/gone'], exists),
      ['/exists']
    );
  });

  it('package defaults disable Copilot/Microsoft AI chat on first launch', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    const issues = assertFirstLaunchDefaults(pkg.contributes.configurationDefaults);
    assert.deepEqual(issues, []);
    assert.equal(pkg.contributes.configurationDefaults['chat.disableAIFeatures'], true);
  });
});
