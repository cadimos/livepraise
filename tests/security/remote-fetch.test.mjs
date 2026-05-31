#!/usr/bin/env node
/**
 * CA-4 / CAD-229 — regressão SSRF para import-url (CAD-228).
 */
import assert from 'node:assert/strict';
import {
  RemoteFetchError,
  validateMediaImportUrl,
} from '../../dist/core/security/remote-fetch.js';

function expectBlocked(url) {
  assert.throws(
    () => validateMediaImportUrl(url),
    (err) => err instanceof RemoteFetchError && err.code === 'ssrf_blocked',
    url,
  );
}

expectBlocked('http://127.0.0.1/x.png');
expectBlocked('http://[::1]/x.png');
expectBlocked('http://169.254.169.254/latest/meta-data/');
expectBlocked('http://192.168.1.1/secret.mp4');
expectBlocked('http://localhost/slide.png');
expectBlocked('http://10.0.0.1/');
expectBlocked('http://2130706433/');

assert.throws(
  () => validateMediaImportUrl('ftp://example.com/x.png'),
  (err) => err instanceof RemoteFetchError && err.code === 'invalid_url',
);

assert.throws(
  () => validateMediaImportUrl('https://user:pass@cdn.example/x.png'),
  (err) => err instanceof RemoteFetchError && err.code === 'invalid_url',
);

const ok = validateMediaImportUrl('https://cdn.example.org/slide.png');
assert.equal(ok.hostname, 'cdn.example.org');

console.log('OK — remote-fetch SSRF validation');
