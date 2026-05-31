#!/usr/bin/env node
/** CA-10 — redacção de URL em logs de import-url. */
import assert from 'node:assert/strict';
import { redactMediaImportUrl } from '../../dist/core/error-log/redact-url.js';

assert.equal(
  redactMediaImportUrl('https://cdn/x.png?token=secret'),
  'https://cdn/x.png?token=%5BREDACTED%5D',
);

assert.equal(
  redactMediaImportUrl('https://cdn/x.png?X-Amz-Signature=abc'),
  'https://cdn/x.png?X-Amz-Signature=%5BREDACTED%5D',
);

assert.equal(
  redactMediaImportUrl('https://cdn.example.org/fila/slide.png'),
  'https://cdn.example.org/fila/slide.png',
);

console.log('OK — redactMediaImportUrl');
