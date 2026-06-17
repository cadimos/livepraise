# Epic TypeScript — checklist final (TS-045)

Revisão de fecho do epic «TypeScript 100%» (TS-001–TS-044).  
Data: 2026-06-15

## Critérios obrigatórios (P0–P1)

| ID | Critério | Estado |
|----|----------|--------|
| TS-001–006 | Inventário, política, `.gitignore`, core/displays sem JS commitado | ✅ |
| TS-007–013 | Emit browser em `dist/`, projector/stage-return no typecheck | ✅ |
| TS-014–023 | `web/` migrado para TS, `build:web`, sem `.js` fonte | ✅ |
| TS-027–032 | `check:js-in-src`, BUILD.md, CI typecheck, smoke:surfaces, INVENTARIO | ✅ |
| TS-033–036 | Hardening web: strict, WS, portal, remote tipados | ✅ |
| TS-043–044 | `shared/**/*.js` ignorado; quickstart + `verify:build` | ✅ |
| TS-026 | Paths unificados (`tsconfig.browser-paths.json`) | ✅ |
| TS-030–031 | Smoke artefactos pós-build | ✅ |

## Opcionais concluídos

| ID | Notas |
|----|-------|
| TS-024–025 | `tailwind.config.ts`, `postcss.config.ts` |
| TS-037 | ADR: manter `tsc` — [`ADR-037-web-bundler.md`](ADR-037-web-bundler.md) |
| TS-038 | Source maps só em dev — `npm run verify:sourcemaps` |
| TS-039 | **Obrigatório (P1)** — `npm run lint` + CI |
| TS-041 | Comentários «paridade v0.0.8» limpos em fonte produto |
| TS-040 | Git hook opt-in — `npm run install:git-hooks` |
| TS-042 | `npm run verify:depcheck` — skipMissing justificado |
| TS-046 | **0 warnings** — `lint:fix` + cleanup imports |

## Opcionais em backlog (não bloqueiam TS-045)

| ID | Título |
|----|--------|
| TS-043 | Política `shared/**/*.js` gitignore (revisão) |

## Verificação automática

```bash
npm run check:js-in-src    # zero .js fonte em pastas de produto
npm run typecheck          # todos os tsconfigs
npm run build              # produção sem source maps browser
npm run smoke:surfaces     # artefactos dist/
npm run lint               # TS-039/046 (0 errors, 0 warnings)
npm run verify:build       # TS-044
npm run verify:depcheck    # TS-042
```

## Fonte vs artefacto

- **Fonte:** `.ts`, `.vue`, `.html`, `.css` em `apps/`, `web/`, `server/`, `core/`, `shared/`, `electron/`
- **Artefacto:** `dist/**` (incl. `.js.map` só após `build:browser:dev`)
- **Configs:** `.ts` na raiz (tailwind, postcss); `.mjs` em `scripts/` e `tests/`

## Sign-off

Epic TS considerado **fechado para alpha** com backlog P3 documentado acima. Revisão CTO / tag interna opcional.
