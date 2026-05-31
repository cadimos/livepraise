#!/usr/bin/env node
/**
 * CA-5 — Content-Type rejeitado (text/html, JSON, etc.) sem fetch externo.
 */
import assert from 'node:assert/strict';
import {
  RemoteFetchError,
  assertAllowedContentType,
} from '../../dist/core/security/remote-fetch.js';

function expectUnsupported(contentType, fileName) {
  assert.throws(
    () => assertAllowedContentType(contentType, fileName),
    (err) => err instanceof RemoteFetchError && err.code === 'unsupported_type',
    `${contentType} / ${fileName}`,
  );
}

expectUnsupported('text/html', 'page.html');
expectUnsupported('text/html; charset=utf-8', 'x.png');
expectUnsupported('application/json', 'data.png');
expectUnsupported('multipart/form-data', 'upload.png');

assert.equal(assertAllowedContentType('image/png', 'x.png'), 'imagens');
assert.equal(assertAllowedContentType('video/mp4', 'clip.mp4'), 'videos');
assert.equal(assertAllowedContentType('application/octet-stream', 'slide.png'), 'imagens');

console.log('OK — remote-fetch content-type (CA-5)');
