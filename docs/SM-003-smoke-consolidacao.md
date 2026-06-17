# SM-003 — Consolidação de smokes (mapeamento final)

Data: 2026-06-17. Substitui sobreposições `smoke:cad*`.

## Pares fundidos

| Antigos | Novo | npm |
|---------|------|-----|
| cad221 + cad224 | `smoke-auth.mjs` | `smoke:auth` |
| cad188 + cad194 | `smoke-displays.mjs` | `smoke:displays` |
| cad228 + cad234 + cad238 | `smoke-backup.mjs` | `smoke:backup` |
| cad313 + cad314 + tests | `smoke-textfill.mjs` + `smoke-typography-qa.mjs` | `smoke:textfill`, `smoke:typography-qa` |
| cad288 + cad290 | `smoke-version-sync.mjs` | `smoke:version` |
| cad187–cad311 (features) | `smoke-features.mjs` | `smoke:features --only=…` |

## Suite núcleo (sem overlap)

| Script | Cobertura |
|--------|-----------|
| `smoke-fase2` | Bootstrap BD, CRUD |
| `smoke-fase8` | WS, latência, instalação limpa |
| `smoke-car40` | Pipeline vídeo/ffmpeg |

## Entrypoint agregador

`smoke-features.mjs` — domínios: locales, audit, video-watcher, musica-export, version, textfill, typography-qa, auth, displays, backup.
