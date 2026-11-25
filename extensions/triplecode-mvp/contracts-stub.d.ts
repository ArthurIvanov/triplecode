/**
 * Stub shapes mirroring triplecode-web/packages/contracts (desktop + usage).
 * Canonical docs: ../triplecode-web/packages/contracts/README.md
 */

export type DesktopExchangeRequest = {
  code: string;
  verifier: string;
  label?: string;
};

export type DesktopSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  email: string;
  session_id: string;
};

export type UsageEvent = {
  feature: 'agent' | 'plan' | 'ask' | 'rewrite' | 'inline' | 'other';
  provider: string;
  model: string;
  duration_ms: number;
  outcome: 'ok' | 'error' | 'stopped' | 'accepted' | 'rejected';
};

export type SoftPlan = {
  id: 'pilot-byok';
  title: string;
  blurb: string;
};

export type ReleaseArtifact = {
  os: 'darwin' | 'win32' | 'linux';
  arch: 'arm64' | 'x64';
  name: string;
  url: string;
  sha512: string;
};

export type ReleaseManifest = {
  version: string;
  channel: 'stable' | 'preview';
  publishedAt: string;
  artifacts: ReleaseArtifact[];
};
