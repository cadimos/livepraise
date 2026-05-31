import type { OperatorUiFilePayload } from './backup-restore-api';

const OPERATOR_UI_KEYS = [
  'livepraise.operator.prefs',
  'livepraise.operator.shortcuts',
  'livepraise.footerAlert.draft',
  'livepraise.serviceTimer.draft',
] as const;

export function collectOperatorUiFiles(): OperatorUiFilePayload[] {
  const files: OperatorUiFilePayload[] = [];
  for (const key of OPERATOR_UI_KEYS) {
    const content = localStorage.getItem(key);
    if (content === null) continue;
    files.push({
      name: `${key.replace(/\./g, '_')}.json`,
      content,
    });
  }
  return files;
}

export function applyOperatorUiFiles(files: OperatorUiFilePayload[]): void {
  const keyByFile: Record<string, string> = {
    livepraise_operator_prefs: 'livepraise.operator.prefs',
    livepraise_operator_shortcuts: 'livepraise.operator.shortcuts',
    livepraise_footerAlert_draft: 'livepraise.footerAlert.draft',
    livepraise_serviceTimer_draft: 'livepraise.serviceTimer.draft',
  };
  for (const file of files) {
    const base = file.name.replace(/\.json$/i, '');
    const storageKey = keyByFile[base];
    if (storageKey) {
      localStorage.setItem(storageKey, file.content);
    }
  }
}
