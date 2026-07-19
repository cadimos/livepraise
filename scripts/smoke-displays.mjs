#!/usr/bin/env node
/**
 * SM-012 — smoke consolidado displays (ex cad188 + cad194).
 */
import { assert, pass, resolveAppRoot } from './lib/smoke-helpers.mjs';
import { runFooterAlertSmoke, runQueueMediaSmoke } from './lib/smoke-displays.mjs';

const appRoot = resolveAppRoot(import.meta.url);

await runFooterAlertSmoke({ pass, assert, appRoot });
await runQueueMediaSmoke({ pass, assert, appRoot });

console.log('smoke-displays: OK');
