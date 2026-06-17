#!/usr/bin/env node
/**
 * SM-011 — smoke consolidado auth/delivery + preview groups (ex cad221 + cad224).
 */
import { assert, pass, resolveAppRoot } from './lib/smoke-helpers.mjs';
import { runAuthDeliverySmoke, runPreviewGroupsSmoke } from './lib/smoke-auth.mjs';

const appRoot = resolveAppRoot(import.meta.url);

await runPreviewGroupsSmoke({ pass, assert });
await runAuthDeliverySmoke({ pass, assert, appRoot });

console.log('smoke-auth: OK');
