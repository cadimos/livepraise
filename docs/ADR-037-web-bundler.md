# ADR-037 — Bundler único para web apps e browser surfaces

**Estado:** Aceite (manter `tsc` puro)  
**Data:** 2026-06-15  
**Tarefa:** TS-037  
**Decisores:** equipa Live Praise  

## Contexto

O repositório tem várias superfícies browser servidas como ES modules estáticos:

| Superfície | Fonte | Emit |
|------------|-------|------|
| Operador | Vue 3 + Vite | `dist/apps/operator/` |
| Projector | TS | `dist/apps/projector/` |
| Stage-return | TS | `dist/apps/stage-return/` |
| Web (`live`, `external-display`, `portal`, `remote`) | TS | `dist/web/*/` |

Todas excepto o operador usam **`tsc`** com imports runtime absolutos `/shared/*.js` (servidos por Express). O operador já usa **Vite** com aliases `@shared` / `@core`.

Após TS-021–023, cada web app gera um ou mais `.js` soltos em `dist/web/<app>/`. A questão é se convém unificar projector + web num único bundler (Vite lib mode ou multi-page).

## Opções avaliadas

### A — Manter `tsc` por app (actual)

- **Prós:** paridade com projector/stage-return; imports `/shared/*.js` reflectem URLs reais; build rápido; sem config Vite extra por app; `smoke:surfaces` valida artefactos.
- **Contras:** vários `tsconfig` e `copy-browser-app-static.mjs`; paths de typecheck via `tsconfig.browser-paths.json`; ficheiros `.js` soltos (não bundled).

### B — Vite lib mode por app web/projector

- **Prós:** um bundler; tree-shaking; source maps nativos (TS-038); menos ficheiros emit.
- **Contras:** reconfigurar imports `/shared/*` (externals vs bundle); risco de duplicar runtime shared; 5+ configs Vite; Electron dev precisa rebuild por app; quebra alinhamento com stage-return/projector actuais.

### C — Vite multi-page único (`web/` + apps browser)

- **Prós:** um `vite.config` com entradas múltiplas; DX unificada.
- **Contras:** refactor grande; operador já tem root próprio; paths de static mount no Express teriam de mudar; esforço XL fora do epic TS actual.

## Decisão

**Manter opção A (`tsc` + cópia estática)** para projector, stage-return e `web/*`.

O operador permanece em Vite (SPA). Não adoptar bundler único nesta fase.

## Justificação

1. **Runtime contract:** browser apps importam `/shared/projection-typography-runtime.js` etc. como URLs HTTP — `tsc` preserva esse contrato sem externals Vite.
2. **Custo/benefício:** migração para Vite lib exigiria TS-007/009/020 de novo em todas as superfícies; ganho principal seria DX/maps, não funcionalidade.
3. **Gate de build:** `npm run build` + `smoke:surfaces` + `typecheck` já cobrem regressões (TS-030/031, TS-044).
4. **Partilha real:** lógica pesada vive em `shared/` (emit `dist/shared/`); apps browser são shells finos — bundling agregado pouco reduz duplicação.

## Consequências

- Continuar a manter `tsconfig.browser-paths.json` e `docs/BUILD.md` (aliases).
- TS-038 (source maps dev) pode usar `tsc --sourceMap` por app ou Vite só em dev — independente desta ADR.
- Revisitar se: (a) número de web apps > 8, (b) precisarmos de code-splitting/HMR nas superfícies de projeção, ou (c) unificar operador + web num monorepo Vite workspace.

## Próximos passos (opcional, pós-beta)

- TS-038 — source maps em dev (`tsc -p web/live/tsconfig.json --sourceMap` condicional).
- Avaliar Vite **apenas** para portal/remote (apps mínimas) se quisermos experimentar lib mode com baixo risco.

## Referências

- [`docs/BUILD.md`](BUILD.md) — ordem de build e aliases TS-026
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — mounts Express
- [`docs/PLANO-TAREFAS-TECNICAS.md`](PLANO-TAREFAS-TECNICAS.md) — TS-037, TS-038
