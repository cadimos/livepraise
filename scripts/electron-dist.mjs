#!/usr/bin/env node
import { execSync } from 'node:child_process';

/**
 * @param {string} builderArgs
 */
export function runElectronBuilder(builderArgs) {
  const publish =
    process.env.LIVEPRAISE_PUBLISH === '1' ? ' --publish always' : '';
  execSync(`npx electron-builder ${builderArgs}${publish}`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    },
  });
}
