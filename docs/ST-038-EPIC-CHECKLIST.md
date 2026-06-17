# Epic estrutura — checklist final (ST-038)

Revisão de fecho do epic «Estrutura, padrões e fluxos» (ST-001–ST-037).  
Inclui reviews cruzados **ST-036** (epic TS + estrutura) e **ST-037** (textfill + contrast).  
Data: 2026-06-17

---

## ST-036 — Review cruzado epic 1 (TS) + epic 4 (estrutura)

| Critério | Estado | Evidência |
|----------|--------|-----------|
| Epic TS fechado (TS-045) | ✅ | [`TS-045-EPIC-CHECKLIST.md`](TS-045-EPIC-CHECKLIST.md) |
| `projection-contrast` único em `shared/` (ST-001) | ✅ | `shared/projection-contrast.ts`; imports `/shared/projection-contrast.js` |
| Emits browser apps (ST-009) | ✅ | `dist/apps/{projector,stage-return,operator}`; `dist/web/*` documentado |
| Zero `.js` fonte produto | ✅ | `npm run check:js-in-src` |
| Lint + typecheck | ✅ | `npm run lint` (0 warnings); CI job `typecheck` |
| BUILD + ARCHITECTURE | ✅ | [`BUILD.md`](BUILD.md), [`ARCHITECTURE.md`](ARCHITECTURE.md) |

**Nota ST-009:** web apps permanecem em `dist/web/*` (não `dist/apps/`) — decisão documentada em ARCHITECTURE; apps Electron-adjacentes em `dist/apps/*`.

---

## ST-037 — Review cruzado epic 2 (textfill) + epic 4

| Critério | Estado | Evidência |
|----------|--------|-----------|
| Epic textfill fechado (TF-028) | ✅ | [`TF-028-EPIC-CHECKLIST.md`](TF-028-EPIC-CHECKLIST.md) |
| Contrast partilhado (ST-003) | ✅ | projector + external-display → `/shared/projection-contrast.js` |
| Operador via composable (TF-012) | ✅ | sem `@shared/projection-textfill` em `.vue` |
| WS tipografia todas saídas (ST-021) | ✅ | `attachProjectionTypographyWs` em projector, stage-return, live, external-display |
| Smokes textfill | ✅ | `npm run smoke:textfill` |
| QA visual manual | ⏳ | [`textfill-manual-qa.md`](textfill-manual-qa.md) — executar pelo operador |

---

## ST-038 — Critérios gerais epic estrutura

| ID | Critério | Estado |
|----|----------|--------|
| ST-007–013 | BUILD, ARCHITECTURE, mounts Express | ✅ |
| ST-011 | CSS shared em `dist/shared/` | ✅ `smoke:surfaces` / `copy-shared-assets.mjs` |
| ST-014 | Health reporta superfícies | ✅ `server/health.ts` → `modules[]` |
| ST-020 | Fluxo WS documentado | ✅ ARCHITECTURE.md secção WebSocket |
| ST-021–025 | WS tipografia, README, CI typecheck | ✅ |
| ST-023 | Workflows CI/release alinhados | ✅ `ci.yml`, `release.yml` — sem `smoke:cad*` |
| ST-033 | `tests/security/*` no gate | ✅ `npm run test:unit` (+ CI) |
| ST-034 | Apps não importam `server/` | ✅ grep limpo |
| ST-036–037 | Reviews cruzados | ✅ secções acima |

## Backlog (não bloqueia ST-038)

| ID | Título |
|----|--------|
| ST-004–006 | Duplicados web vs apps (stripChords, wsUrl) |
| ST-010 | `npm run clean` |
| ST-015–019 | Cache headers, operator-patterns, DRY tipos |
| ST-022 | display-debug-overlay paridade |
| ST-026–032 | CHANGELOG meta, dívidas registadas, OpenAPI CI |
| ST-035 | Auditoria paths `.js` imports NodeNext |

## Verificação automática

```bash
npm run check:js-in-src
npm run lint
npm run typecheck
npm run test:unit
npm run smoke:release    # núcleo CI smokes
npm run smoke:textfill   # ST-037
rg 'from .*/server/' apps/ web/ electron/   # ST-034 — vazio
rg 'attachProjectionTypographyWs' apps/projector apps/stage-return web
```

## Sign-off

Epic estrutura **fechado para alpha** com backlog P2/P3 documentado. QA visual textfill (TF-016–018) permanece checklist manual.
