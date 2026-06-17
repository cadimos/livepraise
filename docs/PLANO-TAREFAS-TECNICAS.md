# Plano de tarefas técnicas — Live Praise

Documento de backlog derivado da análise de arquitetura (TypeScript, textfill, smokes, estrutura).  
Cada tarefa tem **ID único** para ser solicitada isoladamente, por exemplo: *«Execute TS-014»* ou *«Faça SM-003 a SM-008»*.

**Legenda de prioridade:** P0 (bloqueia consistência) · P1 (alto valor) · P2 (melhoria) · P3 (opcional / pós-beta)

**Legenda de esforço:** S (~1–2 h) · M (~ meio dia) · L (~ 1–2 dias) · XL (> 2 dias)

---

## Índice

1. [Tópico 1 — TypeScript 100%](#tópico-1--typescript-100) (TS-001 … TS-045)
2. [Tópico 2 — Textfill reutilizável e unificado](#tópico-2--textfill-reutilizável-e-unificado) (TF-001 … TF-028)
3. [Tópico 3 — Limpeza e consolidação de smokes](#tópico-3--limpeza-e-consolidação-de-smokes) (SM-001 … SM-042)
4. [Tópico 4 — Estrutura, padrões e fluxos](#tópico-4--estrutura-padrões-e-fluxos) (ST-001 … ST-038)

**Total:** 153 tarefas

---

## Tópico 1 — TypeScript 100%

Objetivo: código de produto tipado, uma única fonte por módulo, build previsível, `typecheck` cobrindo todas as superfícies.

### 1.1 Inventário e política

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| TS-001 | ✅ Inventariar ficheiros `.js` de produto | Listar todos os `.js` versionados fora de `scripts/` e `tests/`; classificar como *fonte*, *build commitado* ou *config*. | Lista documentada em comentário no PR ou secção deste doc actualizada. | — | P0 | S |
| TS-002 | ✅ Definir política «fonte vs artefacto» | Documentar regra: `.ts`/`.vue` = fonte; `dist/` e pastas de emit = artefacto; nunca commitar output de `tsc` excepto se explicitamente necessário para runtime. | Parágrafo em `README.md` ou `docs/BUILD.md`. | TS-001 | P0 | S |
| TS-003 | ✅ Actualizar `.gitignore` para outputs | Ignorar `apps/projector/*.js` (excepto se mover emit), `apps/stage-return/*.js`, `core/displays/*.js` gerados, mantendo excepções explícitas se preciso. | `git status` limpo após build sem ficheiros novos indesejados. | TS-002 | P0 | S |
| TS-004 | ✅ Remover `core/displays/config-file.js` do git | Apagar cópia compilada; garantir imports resolvem via `dist/core/` em runtime ou via path TS em dev. | Ficheiro removido; servidor arranca e testes passam. | TS-003 | P0 | S |
| TS-005 | ✅ Remover `core/displays/merge-assignments.js` do git | Idem TS-004 para merge-assignments. | Idem TS-004. | TS-003 | P0 | S |
| TS-006 | ✅ Verificar imports `electron/displays/merge-assignments` | Confirmar que `electron/displays/config.ts` importa de `./merge-assignments.js` (emit em `dist/electron/`) e não da cópia em `core/`. | Build electron OK. | TS-005 | P1 | S |

### 1.2 Build projector / stage-return

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| TS-007 | ✅ Decidir destino do emit projector | Opções: (A) manter emit em `apps/projector/` ou (B) mover para `dist/apps/projector/`. Documentar decisão. | ADR curto em `docs/` ou secção README. | TS-002 | P0 | S |
| TS-008 | ✅ Ajustar `tsconfig.projector.json` se emit → `dist/` | Alterar `outDir`, `rootDir`, paths de import `/shared/*.js`. | `npm run build:projector` gera em local correcto. | TS-007 | P0 | M |
| TS-009 | ✅ Actualizar `server/index.ts` static mount projector | Se emit mudou, actualizar `express.static` do projetor. | `/projector` carrega no browser. | TS-008 | P0 | S |
| TS-010 | ✅ Remover `.js` commitados antigos do projector | Retirar do git `projector.js`, `youtube-iframe-player.js`, `projection-contrast.js` após emit estável. | Só fonte `.ts` em `apps/projector/src/`. | TS-008 | P0 | S |
| TS-011 | ✅ Repetir TS-007–TS-010 para stage-return | Mesmo fluxo para `apps/stage-return/`. | `/stage-return` funcional. | TS-010 | P0 | M |
| TS-012 | ✅ Incluir projector no `typecheck` | Adicionar `tsc -p tsconfig.projector.json --noEmit` ao script `typecheck`. | `npm run typecheck` falha se projector tiver erro TS. | TS-008 | P1 | S |
| TS-013 | ✅ Incluir stage-return no `typecheck` | Idem para `tsconfig.stage-return.json`. | Idem TS-012. | TS-011 | P1 | S |

### 1.3 Migração `web/` → TypeScript

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| TS-014 | ✅ Criar `tsconfig.web.json` | Config mínima: DOM, ES2022, emit para `web/` ou `dist/web/`, paths `/shared/*.js` como projector. | Config válida; `tsc -p tsconfig.web.json` compila. | TS-007 | P0 | M |
| TS-015 | ✅ Migrar `web/live/live.js` → `src/live.ts` | Converter para TS; tipar WS, handlers, imports shared. | `/live` funciona; sem regressão textfill. | TS-014 | P0 | L |
| TS-016 | ✅ Migrar `web/external-display/external-display.js` | Idem para external-display (live, vocal, stage, player). | Todas as rotas `/live`, `/vocal`, etc. OK. | TS-014 | P0 | L |
| TS-017 | ✅ Extrair `projection-contrast` partilhado (ver ST-001) | Durante TS-016, importar módulo único em vez de `web/.../projection-contrast.js`. | Sem duplicação de ficheiro JS em web. | ST-001 | P0 | M |
| TS-018 | ✅ Migrar `web/portal/portal.js` | Portal estático + lógica mínima em TS. | `/portal` OK. | TS-014 | P1 | M |
| TS-019 | ✅ Migrar `web/remote/remote.js` | Controlo remoto web em TS. | `/remote` OK; auth/WS intactos. | TS-014 | P1 | L |
| TS-020 | ✅ Actualizar `index.html` de cada web app | Scripts apontam para `.js` emitido (ou bundler único). | HTML carrega módulo correcto. | TS-015–019 | P0 | S |
| TS-021 | ✅ Adicionar `build:web` ao `package.json` | Script encadeado no `build` principal. | `npm run build` inclui web. | TS-020 | P0 | S |
| TS-022 | ✅ Incluir web no `typecheck` | `tsc -p tsconfig.web.json --noEmit`. | CI local typecheck cobre web. | TS-021 | P1 | S |
| TS-023 | ✅ Remover `.js` fonte antigos de `web/` | Apagar `live.js`, `portal.js`, etc. após migração. | Só `.ts` (+ emit se aplicável) em web. | TS-021 | P0 | S |

### 1.4 Tooling e configs

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| TS-024 | ✅ Migrar `tailwind.config.js` → `.ts` | Se Vite/Tailwind suportam config TS no projecto. | Build operator inalterado. | — | P3 | S |
| TS-025 | ✅ Migrar `postcss.config.js` → `.ts` | Idem. | Build CSS OK. | — | P3 | S |
| TS-026 | ✅ Unificar `paths` `@shared` / `@core` | Garantir mesmos aliases em tsconfigs (root, server, vite, web, projector). | Imports consistentes. | TS-014 | P2 | M |
| TS-027 | ✅ Script `check:js-in-src` | Node script que falha se existir `.js` em pastas de fonte (allowlist scripts/tests/config). | npm script + opcional CI. | TS-023 | P1 | M |
| TS-028 | ✅ Documentar fluxo de build completo | `docs/BUILD.md`: ordem build:server → shared → apps → operator → web. | Dev novo consegue buildar só lendo doc. | TS-021 | P1 | M |

### 1.5 Validação e CI

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| TS-029 | ✅ Correr `typecheck` no CI | Job ou step em `.github/workflows/ci.yml`. | PR falha com erro TS. | TS-012, TS-013, TS-022 | P1 | S |
| TS-030 | ✅ Smoke pós-migração web | `npm run smoke:surfaces` — artefactos em `dist/web/*`. | Sem erros; ficheiros emit presentes. | TS-023 | P0 | S |
| TS-031 | ✅ Smoke pós-remoção JS projector | Idem para `dist/apps/projector` e `stage-return`. | Build surfaces OK. | TS-010 | P0 | S |
| TS-032 | ✅ Actualizar `INVENTARIO-FUNCOES.md` | Nota «TypeScript 100%» como meta/concluído parcial. | Doc sincronizado. | TS-023 | P2 | S |

### 1.6 Hardening (pós-migração)

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| TS-033 | ✅ `strict` audit em `web/` migrado | Corrigir `any` implícitos, null checks. | Sem `@ts-ignore` novos. | TS-023 | P2 | M |
| TS-034 | ✅ Tipar payloads WebSocket em web | Reutilizar `shared/types/live.ts`. | Tipos alinhados server ↔ client. | TS-015 | P1 | M |
| TS-035 | ✅ Tipar `portal.js` forms/API | Endpoints usados pelo portal. | Sem `any` em handlers principais. | TS-018 | P2 | M |
| TS-036 | ✅ Tipar `remote.js` session/actions | Paridade com routes remote server. | Typecheck remote OK. | TS-019 | P2 | M |
| TS-037 | ✅ Avaliar bundler único para web apps | Vite lib mode vs tsc puro — reduzir número de `.js` soltos. | ADR se adoptar bundler. | TS-021 | P3 | L |
| TS-038 | ✅ Source maps em dev para web/projector | Facilitar debug Electron/browser. | Maps gerados em dev only. | TS-021 | P3 | M |
| TS-039 | ✅ ESLint TypeScript | `@typescript-eslint` regras mínimas; `npm run lint` no CI. | lint script no package.json. | TS-029 | P1 | L |
| TS-040 | ✅ Pre-commit hook typecheck (opcional) | Só se equipa quiser; documentar opt-in. | Hook documentado, não obrigatório. | TS-029 | P3 | S |
| TS-041 | ✅ Remover referências a «paridade v0.0.8» obsoletas | Comentários que já não aplicam após TS. | grep limpo ou comentários actualizados. | — | P3 | S |
| TS-042 | ✅ Verificar `depcheck` / paths `@shared/types` | Item `skipMissing` no package.json ainda necessário? | depcheck limpo ou justificado. | TS-026 | P3 | S |
| TS-043 | ✅ Garantir `shared/**/*.js` nunca commitado | Reforçar regra `.gitignore` + TS-027. | Nenhum JS em shared/ no git. | TS-003 | P1 | S |
| TS-044 | ✅ Teste: build limpo clone fresh | `git clone` → `npm ci` → `npm run build` sem passos manuais. | README quickstart válido. | TS-028 | P1 | S |
| TS-045 | ✅ Fechar epic TS — checklist final | TS-001–044 concluídos; web/projector/stage-return/core sem JS fonte. | Revisão CTO; tag interna opcional. | TS-030–044 | P0 | S |

---

## Tópico 2 — Textfill reutilizável e unificado

Objetivo: um único caminho de integração (controller/composable), motor em `shared/projection-textfill.ts`, sem duplicação no operador.

### 2.1 Documentação e contrato

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| TF-001 | ✅ Documentar arquitectura textfill | Criar `docs/projection-textfill.md`: camadas (motor, runtime, UI), modos preview/output, stage-return `allTexto`. | Doc lida standalone. | — | P1 | M |
| TF-002 | ✅ Documentar API pública do motor | Listar exports: `applyPreviewTextfill`, `refreshOutputTextfill`, `refreshOutputTextfillAll`, opções. | Tabela na doc TF-001. | TF-001 | P1 | S |
| TF-003 | ✅ Documentar `createProjectionTypographyController` | Quando usar controller vs motor directo (regra: **sempre controller** excepto testes unitários). | Secção «quando usar o quê». | TF-001 | P1 | S |
| TF-004 | ✅ Diagrama de fluxo operador → projetor | Mermaid: prefs → WS → runtime → textfill → DOM. | Diagrama em TF-001. | TF-001 | P2 | S |

### 2.2 Unificar operador (eliminar caminho paralelo)

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| TF-005 | ✅ Auditar duplicação PreviewOutputTile vs runtime | Diff lógica: font-face, shadow, resize, debounce, textfill. | Lista de linhas/comportamentos duplicados. | TF-001 | P0 | M |
| TF-006 | ✅ Criar composable `useProjectionTypographyPreview` | Vue composable que encapsula controller em modo `preview` para root HTMLElement ref. | Export testável; sem DOM global. | TF-005 | P0 | L |
| TF-007 | ✅ Refactor `PreviewOutputTile.vue` | Substituir chamada directa `refreshPreviewTextfill` por composable/controller. | Prévia multi-saída idêntica visualmente. | TF-006 | P0 | M |
| TF-008 | ✅ Refactor `ProjectionTypographyPreview.vue` | Idem TF-007 para painel Configurações → Tipografia. | Slider min/max/textfill reflecte na prévia. | TF-006 | P0 | M |
| TF-009 | ✅ Paridade `fitSlackPx` / text-shadow | Garantir composable usa `projectionTextShadowSlackPx` como runtime. | Sem corte de sombra na prévia. | TF-007 | P1 | S |
| TF-010 | ✅ Paridade debounce resize | Alinhar timings (32 ms / 120 ms) com runtime ou extrair constantes partilhadas. | Redimensionar janela não regredir. | TF-007 | P1 | S |
| TF-011 | ✅ `diagnosticSurface` consistente | Prefixos `operator-preview:` mantidos via opção do controller. | Logs JSONL identificam superfície. | TF-007 | P2 | S |
| TF-012 | ✅ Remover imports directos `@shared/projection-textfill` do operador | grep operador só via composable/runtime (excepto testes). | Zero imports directos em components. | TF-008 | P1 | S |

### 2.3 Superfícies de saída (validação)

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| TF-013 | ✅ Validar projetor usa só controller | `apps/projector/src/projector.ts` — sem textfill directo. | grep confirma. | — | P1 | S |
| TF-014 | ✅ Validar stage-return `allTexto: true` | Retorno acoplado `.atual`/`.proximo` via `refreshOutputTextfillAll`. | Dois blocos `.texto` escalam. | — | P1 | S |
| TF-015 | ✅ Validar `/live` e external-display | Após TS-015/016, controller com perfis correctos. | Perfis live/vocal/stage/player. | TS-015 | P1 | M |
| TF-016 | ✅ Teste manual louvor longo 14+ versos | Projetor + prévia operador mesmo tamanho relativo. | Sem fonte 24px mínima incorrecta. | TF-007 | P0 | S |
| TF-017 | ✅ Teste manual Bíblia versículo longo | Idem. | Texto cabe na área. | TF-016 | P1 | S |
| TF-018 | ✅ Teste flash ao trocar verso | visibility/opacity — sem flash público. | `tests/projection-textfill-visibility.test.mjs` passa. | — | P0 | S |

### 2.4 Diagnóstico textfill

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| TF-019 | Revisar `useTextfillDiagnostics` vs server types | Duplicação `TextfillDiagnosticEntry` em composable vs `core/textfill-diagnostics/types.ts`. | Tipo único importado. | — | P2 | M |
| TF-020 | Unificar tipos diagnóstico | Operador importa de `@core/textfill-diagnostics/types` ou shared re-export. | DRY tipos. | TF-019 | P2 | S |
| TF-021 | Documentar activação diagnóstico | TF-001: toggle Configurações → Logs; ficheiro `~/livepraise/textfill-diagnostics.jsonl`. | Suporte consegue reproduzir. | TF-001 | P2 | S |

### 2.5 Testes e regressão

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| TF-022 | ✅ Manter testes `tests/projection-textfill-*.test.mjs` | Integrar no smoke consolidado (SM-015), não apagar cobertura. | 3 testes passam após refactors. | TF-007 | P0 | S |
| TF-023 | Teste composable preview (futuro Vitest) | Se Vitest adoptado: mount composable com jsdom. | Backlog ou implementação mínima. | TF-006 | P3 | M |
| TF-024 | ✅ Actualizar smoke CAD-313/314 ou sucessor | Asserções sobre composable/controller, não imports directos tile. | Smoke verde. | TF-012, SM-015 | P1 | M |
| TF-025 | Caso agregado «textfill» no smoke release | Opcional: 1 teste rápido no gate release (SM-010). | release smoke inclui textfill. | SM-010 | P2 | M |

### 2.6 Melhorias opcionais (não bloqueiam unificação)

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| TF-026 | Avaliar componente Vue `<ProjectionContent>` | Wrapper template `.content` + controller — só se reduzir HTML duplicado nos tiles. | ADR; implementação opcional. | TF-007 | P3 | L |
| TF-027 | Extrair constantes PREVIEW vs OUTPUT floors | `PREVIEW_TEXTFILL_MIN_PX`, `STAGE_RETURN_OUTPUT_FLOOR_PX` documentadas na API. | TF-002 actualizado. | TF-002 | P3 | S |
| TF-028 | ✅ Fechar epic textfill — checklist | TF-001–025 concluídos; operador unificado. | Revisão visual QA. | TF-016–024 | P0 | S |

---

## Tópico 3 — Limpeza e consolidação de smokes

Objetivo: gate de release claro (3–5 scripts), smokes por ticket arquivados ou fundidos, CI alinhado, menos ruído no repo.

### 3.1 Inventário

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| SM-001 | ✅ Inventariar 28 ficheiros `smoke-*.mjs` | Tabela: ficheiro, npm script, última feature, corre no CI?, dependências build. | Tabela em `scripts/README.md`. | — | P0 | M |
| SM-002 | ✅ Mapear smoke → critérios de aceite originais | CAD-187…314: o que cada um valida ainda relevante? | Coluna «ainda necessário?» sim/não/parcial. | SM-001 | P0 | M |
| SM-003 | Identificar sobreposição entre smokes | Pares redundantes (ex.: cad288+cad290, cad221+cad224). | Lista de merge candidatos. | SM-002 | P1 | M |
| SM-004 | Identificar testes órfãos em `tests/` | Quais só correm via smoke-cad* e não via release. | Lista + proposta destino. | SM-001 | P1 | S |

### 3.2 Suite núcleo (manter)

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| SM-005 | ✅ Formalizar «smoke core» | Núcleo = `smoke-fase2`, `smoke-fase8`, `smoke-car40`. | Documentado como contrato release. | SM-001 | P0 | S |
| SM-006 | Renomear scripts core (opcional) | Ex.: `smoke:core:bootstrap`, `smoke:core:ws`, `smoke:core:video` — aliases antigos mantidos. | Sem breaking change ou changelog. | SM-005 | P3 | S |
| SM-007 | ✅ Extrair helpers partilhados smokes | `scripts/lib/smoke-helpers.mjs`: assert, fetchJson, tempHome, startServer. | 3+ smokes usam helper. | SM-001 | P1 | M |
| SM-008 | ✅ Reduzir duplicação bootstrap em smokes | Usar helper SM-007 nos cad*. | Menos copy-paste start/stop server. | SM-007 | P2 | M |

### 3.3 Consolidação por domínio

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| SM-009 | ✅ Criar `smoke-features.mjs` (opcional) | Agrupa: locales, audit, video-watcher, musica-export, version-sync — flags `--only=locales`. | Um entrypoint; domínios isolados. | SM-003 | P1 | L |
| SM-010 | ✅ Integrar textfill/tipografia no core ou features | Incorporar asserções de cad313/314 + tests/projection-textfill-* num módulo importável. | Cobertura textfill no gate. | SM-009, TF-022 | P1 | M |
| SM-011 | ✅ Consolidar auth/roles (cad221+cad224) | Um script `smoke-auth.mjs` se ambos ainda relevantes. | npm script único; antigos deprecated. | SM-003 | P2 | M |
| SM-012 | ✅ Consolidar displays (cad188+cad194) | Projetor + displays config num smoke. | Um script; build projector incluído. | SM-003 | P2 | M |
| SM-013 | ✅ Consolidar backup/restore smokes | cad228, cad234, cad238 se sobrepostos. | Avaliar merge vs manter um. | SM-003 | P2 | L |
| SM-014 | Manter `smoke-legacy-upgrade` isolado | Migração v0.0.8 — não misturar com fase2. | Script + npm; doc quando correr. | SM-005 | P1 | S |
| SM-015 | Manter testes unitários em `tests/` | Mover lógica pesada de cad313 para imports de `tests/*.mjs`. | Smokes finos, testes grossos. | SM-010 | P1 | M |

### 3.4 Remoção / deprecação cad*

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| SM-016 | ✅ Deprecar `smoke:cad187` | Remover ou redireccionar para core/features se coberto. | package.json + ficheiro removido ou stub. | SM-009 | P2 | S |
| SM-017 | ✅ Deprecar `smoke:cad188` | Idem; merge SM-012. | Idem. | SM-012 | P2 | S |
| SM-018 | ✅ Deprecar `smoke:cad189` | Idem. | Idem. | SM-009 | P2 | S |
| SM-019 | ✅ Deprecar `smoke:cad190` | Idem. | Idem. | SM-009 | P2 | S |
| SM-020 | ✅ Deprecar `smoke:cad193` | Idem. | Idem. | SM-009 | P2 | S |
| SM-021 | ✅ Deprecar `smoke:cad194` | Idem; merge SM-012. | Idem. | SM-012 | P2 | S |
| SM-022 | ✅ Deprecar `smoke:cad221` + `cad224` | Idem; merge SM-011. | Idem. | SM-011 | P2 | S |
| SM-023 | ✅ Deprecar `smoke:cad228` | Idem; merge SM-013. | Idem. | SM-013 | P2 | S |
| SM-024 | ✅ Deprecar `smoke:cad234` | Idem. | Idem. | SM-013 | P2 | S |
| SM-025 | ✅ Deprecar `smoke:cad238` | Idem. | Idem. | SM-013 | P2 | S |
| SM-026 | ✅ Deprecar `smoke:cad288` + `cad290` | Version sync / release — avaliar merge em `smoke-version`. | Idem. | SM-009 | P2 | S |
| SM-027 | ✅ Deprecar `smoke:cad300` | Idem. | Idem. | SM-009 | P2 | S |
| SM-028 | ✅ Deprecar `smoke:cad311` | Fonts — mover para features ou tests. | Idem. | SM-009 | P2 | S |
| SM-029 | ✅ Deprecar `smoke:cad313` + `cad314` | Substituídos por SM-010 + tests/. | Idem. | SM-010 | P1 | S |
| SM-030 | ✅ Remover ficheiros cad* após 1 release | Apagar `.mjs` deprecated se CHANGELOG avisa. | −~3500 linhas scripts. | SM-016–029 | P1 | M |

### 3.5 CI e release

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| SM-031 | ✅ Actualizar `scripts/README.md` | Remover refs `car40-macos.yml`; listar só smokes vivos. | Doc = realidade CI. | SM-030 | P0 | S |
| SM-032 | ✅ Actualizar `package.json` scripts | Remover entradas cad* mortas; manter aliases deprecated 1 versão se needed. | npm run smoke:release intacto. | SM-030 | P0 | S |
| SM-033 | Adicionar `smoke:fase8` no job Windows release | Alinhar com Linux/macOS (INVENTARIO lacuna). | release.yml Windows corre fase8. | SM-005 | P2 | S |
| SM-034 | Opcional: `smoke:legacy-upgrade` no CI PR | Só se runtime aceitável; senão manter manual pre-release. | Decisão documentada. | SM-014 | P3 | M |
| SM-035 | Opcional: `smoke-win-installer` no CI | Integrar no job build-windows. | Installer validado automaticamente. | — | P3 | L |
| SM-036 | Documentar «quando correr smokes» | Dev diário: typecheck; pre-release: smoke:release + legacy + features. | README secção QA. | SM-031 | P1 | S |
| SM-037 | ✅ CHANGELOG entrada limpeza smokes | Utilizadores/devs sabem scripts removidos. | Entrada alpha.x. | SM-030 | P1 | S |
| SM-038 | Actualizar `INVENTARIO-FUNCOES.md` secção testes | Refletir suite consolidada. | Links correctos. | SM-031 | P2 | S |

### 3.6 Preparação Vitest (backlog smoke → testes)

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| SM-039 | Listar asserções cad* migráveis para Vitest | core/, shared/ funções puras. | Backlog Vitest. | SM-002 | P3 | M |
| SM-040 | Manter runner Node nativo para integração | Smokes HTTP/WS continuam .mjs até Playwright. | Decisão INVENTARIO respeitada. | — | P2 | S |
| SM-041 | ✅ Criar `npm run test:unit` placeholder | Corre tests/*.mjs seleccionados. | Script existe pre-Vitest. | SM-015 | P2 | S |
| SM-042 | ✅ Fechar epic smokes — checklist | ≤8 scripts smoke + tests/; CI verde. | Contagem ficheiros scripts/smoke-*.mjs. | SM-030–041 | P0 | S |

---

## Tópico 4 — Estrutura, padrões e fluxos

Objetivo: menos duplicação, build previsível, fluxos documentados, lacunas CI/endereçadas.

### 4.1 Módulos partilhados

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| ST-001 | ✅ Mover `projection-contrast` para `shared/` | Fonte única TS; projector + web importam `/shared/projection-contrast.js`. | Ficheiro duplicado web removido. | — | P0 | M |
| ST-002 | ✅ Actualizar imports projector | `from '/shared/projection-contrast.js'`. | Build projector OK. | ST-001 | P0 | S |
| ST-003 | ✅ Actualizar imports external-display | Idem após TS-016. | Contraste scrim OK em live/vocal. | ST-001, TS-016 | P0 | S |
| ST-004 | Auditar outros duplicados web vs apps | grep lógica copiada (stripChords, wsUrl, etc.). | Lista ST-004 anexa ou issues. | TS-015 | P1 | M |
| ST-005 | Extrair `stripChordsForProjection` para shared | Se duplicado em projector/live/operator. | Função única testável. | ST-004 | P2 | M |
| ST-006 | Centralizar `wsUrl` helpers por perfil | Padrão `location.host` + path WS. | Menos copy-paste web apps. | ST-004 | P2 | M |

### 4.2 Build e deploy

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| ST-007 | ✅ Criar `docs/BUILD.md` | Ordem builds, env vars (`LIVEPRAISE_HOME`, `APP_ROOT`), artefactos. | Referenciado no README. | TS-028 | P1 | M |
| ST-008 | ✅ Diagrama arquitectura runtime | Electron + server + static mounts + WS. | Mermaid em docs/ARCHITECTURE.md. | — | P2 | M |
| ST-009 | Unificar destino emits apps | Meta: tudo relevante sob `dist/apps/*` (projector, stage-return, operator, web). | ADR + migração TS-007. | TS-007 | P1 | L |
| ST-010 | Script `npm run clean` | Remove dist/, emits apps, caches. | Rebuild determinístico. | ST-009 | P2 | S |
| ST-011 | Validar `copy-shared-assets.mjs` | CSS shared sempre em dist/shared após build. | projection-layout.css servido. | — | P1 | S |
| ST-012 | ✅ Verificar ordem `build` no package.json | sync:version → server (inclui shared) → projector → stage-return → electron → operator → web. | Uma linha documentada. | TS-021 | P1 | S |

### 4.3 Server / static / routing

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| ST-013 | ✅ Documentar mounts Express | Tabela path → pasta (`/shared`, `/projector`, `/live`, …). | docs/ARCHITECTURE.md | — | P1 | S |
| ST-014 | Health check cobre todas superfícies | `server/health.ts` — web/live, portal, remote. | GET /health reporta activo. | — | P2 | S |
| ST-015 | Revisar cache headers static | Projector vs operator vs shared — evitar stale em dev. | Comportamento documentado. | — | P3 | M |

### 4.4 Operador Vue — padrões

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| ST-016 | Guia `docs/operator-patterns.md` | Composables vs components; `@shared` imports; i18n. | Novos painéis seguem guia. | — | P2 | M |
| ST-017 | Padronizar imports `@shared` vs paths relativos | grep operador; corrigir outliers. | Consistência. | — | P2 | M |
| ST-018 | Padronizar chamadas API via `useApi` | Evitar fetch disperso. | Auditoria routes. | — | P3 | M |
| ST-019 | Revisar tipos duplicados operador vs shared | Ex.: preview-groups, projection types. | DRY. | TF-019 | P2 | M |

### 4.5 WebSocket e live state

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| ST-020 | Documentar fluxo WS operador ↔ hub ↔ outputs | `shared/types/live.ts` como contrato. | ARCHITECTURE.md secção WS. | ST-008 | P1 | M |
| ST-021 | Verificar paridade eventos tipografia WS | Controller attachProjectionTypographyWs em todas saídas. | grep attachProjectionTypographyWs. | TF-015 | P1 | S |
| ST-022 | Verificar paridade `display-debug-overlay` | Projector/live/external usam mesmo overlay debug. | Comportamento consistente. | — | P3 | S |

### 4.6 CI/CD e documentação

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| ST-023 | Revisar `.github/workflows/*.yml` | Nomes, smokes, alinhamento README/INVENTARIO. | Sem referências mortas. | SM-031 | P1 | M |
| ST-024 | ✅ Adicionar job typecheck CI | Ver TS-029. | ci.yml typecheck. | TS-029 | P1 | S |
| ST-025 | ✅ Actualizar README estrutura repositório | web/ TS, dist/, smokes consolidados. | Árvore actualizada. | TS-045, SM-042 | P1 | S |
| ST-026 | Actualizar CHANGELOG meta técnica | Epics TS, TF, SM, ST concluídos. | Entrada por release. | — | P2 | S |

### 4.7 Qualidade e dívida conhecida

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| ST-027 | Registar dívida «portal/remote i18n» | INVENTARIO — fora MVP; link doc. | Não perder no backlog. | — | P3 | S |
| ST-028 | Registar dívida «Vitest/Playwright» | Secção backlog com deps SM-039. | Roadmap claro. | SM-039 | P3 | S |
| ST-029 | Registar dívida «busca online louvores» | INVENTARIO secção 6. | — | — | P3 | S |
| ST-030 | Registar dívida «editor temas visual» | INVENTARIO secção 7. | — | — | P3 | S |
| ST-031 | Revisar pasta `v0.0.8/` no repo | Arquivo legado — manter ignorado ou remover do clone. | Política documentada. | — | P3 | S |
| ST-032 | OpenAPI coverage script | `verify-openapi-coverage.mjs` — integrar CI opcional. | verify:openapi no PR? | — | P3 | S |

### 4.8 Segurança e consistência core

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| ST-033 | Manter `tests/security/*` no gate | Incluir em SM-041 ou smoke:release. | remote-fetch tests passam. | SM-041 | P1 | S |
| ST-034 | Revisar `core/` boundaries | server importa core; apps não importam server. | grep violations. | — | P2 | M |
| ST-035 | Revisar paths `.js` em imports TS | NodeNext — consistente em server/electron/shared. | typecheck + runtime OK. | TS-026 | P2 | M |

### 4.9 Fecho estrutural

| ID | Título | Descrição | Critério de aceite | Dep. | P | Esf. |
|----|--------|-----------|---------------------|------|---|------|
| ST-036 | Review cruzado epic 1+4 | TS completo + ST-001/009 feitos. | Sem JS fonte produto. | TS-045, ST-009 | P0 | S |
| ST-037 | Review cruzado epic 2+4 | Textfill unificado + contrast shared. | QA visual completo. | TF-028, ST-003 | P0 | S |
| ST-038 | Fechar epic estrutura — checklist | Docs BUILD+ARCHITECTURE; CI alinhado; duplicações críticas zero. | Sign-off. | ST-023–037 | P0 | S |

---

## Ordem sugerida de execução (waves)

Pedidos eficientes por **lote** — copiar o bloco de IDs para solicitar ao agente.

### Wave A — Fundação (sem breaking)
`TS-001`, `TS-002`, `TS-003`, `TS-004`, `TS-005`, `SM-001`, `SM-002`, `TF-001`, `TF-005`, `ST-001`, `ST-008`, `ST-013`

### Wave B — Build higiénico
`TS-007`, `TS-008`, `TS-009`, `TS-010`, `TS-011`, `TS-012`, `TS-013`, `TS-027`, `TS-028`, `ST-007`, `ST-010`, `ST-011`, `ST-012`

### Wave C — Web TypeScript
`TS-014`, `TS-015`, `TS-016`, `TS-017`, `TS-018`, `TS-019`, `TS-020`, `TS-021`, `TS-022`, `TS-023`, `ST-002`, `ST-003`, `ST-004`

### Wave D — Textfill unificado
`TF-006`, `TF-007`, `TF-008`, `TF-009`, `TF-010`, `TF-011`, `TF-012`, `TF-016`, `TF-018`, `TF-019`, `TF-020`, `TF-022`, `TF-028`

### Wave E — Smokes consolidados
`SM-007`, `SM-009`, `SM-010`, `SM-011`, `SM-014`, `SM-015`, `SM-016`–`SM-030`, `SM-031`, `SM-032`, `SM-036`, `SM-037`, `SM-041`, `SM-042`

### Wave F — CI e docs finais
`TS-029`, `TS-030`, `TS-031`, `TS-044`, `TS-045`, `ST-023`, `ST-024`, `ST-025`, `SM-033`, `ST-036`, `ST-037`, `ST-038`

### Wave G — Opcionais / pós-beta
Todo ID com **P3** ou secções TS-043, TF-023/026/027, SM-033–035/039, ST-015/018/027–032

**Nota:** TS-039 (ESLint) foi promovida a **P1 obrigatória** — ver fila activa abaixo.

---

## Como solicitar tarefas

Exemplos de pedidos ao agente:

- *«Execute a tarefa TS-014»* — uma tarefa isolada.
- *«Execute Wave C completa»* — lote coeso.
- *«Execute SM-016 a SM-030, deprecando smokes cad*»* — intervalo.
- *«Execute TF-006 e TF-007 — unificar PreviewOutputTile»* — tarefa com contexto.

Após cada tarefa concluída, marcar `[x]` na secção «Concluídas» e **✅** na coluna Título da tabela do ID correspondente.

---

## Concluídas

### Wave A + TS-001–TS-013 (2026-06-15)

- [x] **TS-001** — Inventário `.js` documentado em `docs/BUILD.md`
- [x] **TS-002** — Política fonte vs artefacto em `docs/BUILD.md`
- [x] **TS-003** — `.gitignore` actualizado (apps/*.js, core/**/*.js)
- [x] **TS-004** — Removido `core/displays/config-file.js`
- [x] **TS-005** — Removido `core/displays/merge-assignments.js`
- [x] **TS-006** — Electron importa `electron/displays/merge-assignments.ts` (não core/)
- [x] **TS-007** — Decisão emit → `dist/apps/*` em `docs/BUILD.md`
- [x] **TS-008** — `tsconfig.projector.json` → `dist/apps/projector`
- [x] **TS-009** — `server/index.ts` serve `dist/apps/projector`
- [x] **TS-010** — Removidos `.js` commitados do projector
- [x] **TS-011** — stage-return emit → `dist/apps/stage-return` + copy static
- [x] **TS-012** — projector no script `typecheck`
- [x] **TS-013** — stage-return no script `typecheck`
- [x] **SM-001** — Inventário smokes em `scripts/README.md`
- [x] **SM-002** — Coluna «ainda necessário» no inventário
- [x] **TF-001** — `docs/projection-textfill.md`
- [x] **TF-002** — API pública documentada
- [x] **TF-003** — Secção «quando usar o quê»
- [x] **TF-004** — Diagrama Mermaid operador → projetor
- [x] **TF-005** — Auditoria duplicação operador vs controller
- [x] **ST-001** — `shared/projection-contrast.ts`; web + projector unificados
- [x] **ST-008** — `docs/ARCHITECTURE.md`
- [x] **ST-013** — Tabela mounts Express em ARCHITECTURE.md

- [x] **TS-016** — `web/external-display/src/external-display.ts`
- [x] **TS-017** — projection-contrast via `/shared/` (ST-001)
- [x] **TS-018** — `web/portal/src/portal.ts`
- [x] **TS-019** — `web/remote/src/remote.ts`
- [x] **TS-020** — HTML/CSS copiados para `dist/web/*`
- [x] **TS-021** — `build:web` completo (live + external + portal + remote)
- [x] **TS-022** — web nos tsconfigs de `typecheck`
- [x] **TS-023** — removidos `.js` fonte de `web/`
- [x] **TF-006** — `useProjectionTypographyPreview.ts`
- [x] **TF-007** — `PreviewOutputTile.vue` refactor
- [x] **TF-008** — `ProjectionTypographyPreview.vue` refactor
- [x] **TF-009** — `fitSlackPx` no composable
- [x] **TF-010** — debounce 32/120 ms no composable
- [x] **TF-011** — `diagnosticSurface` no composable
- [x] **TF-012** — operador sem import directo de textfill (só composable)
- [x] **TS-027** — `npm run check:js-in-src`
- [x] **TS-028** — fluxo de build em `docs/BUILD.md`
- [x] **TS-029** — job `typecheck` no CI (`.github/workflows/ci.yml`)
- [x] **SM-007** — `scripts/lib/smoke-helpers.mjs`
- [x] **SM-008** — fase2, fase8, car40 usam helpers
- [x] **TF-013** — projetor/live/external só via controller (grep)
- [x] **TF-014** — retorno palco `allTexto: true` em external-display

### TS-024–032 (2026-06-15)

- [x] **TS-024** — `tailwind.config.ts` (removido `.js`)
- [x] **TS-025** — `postcss.config.ts` (removido `.js`)
- [x] **TS-030** — `scripts/smoke-build-surfaces.mjs` + `npm run smoke:surfaces`
- [x] **TS-031** — projector + stage-return no smoke de surfaces
- [x] **TS-032** — nota TypeScript em `INVENTARIO-FUNCOES.md`

### TS-026 + itens implícitos (2026-06-15)

- [x] **TS-014** — `tsconfig.web.json` (project references)
- [x] **TS-015** — `web/live/src/live.ts`
- [x] **ST-002** — projector importa `/shared/projection-contrast.js`
- [x] **ST-003** — external-display importa contrast partilhado
- [x] **ST-007** — `docs/BUILD.md` (ordem build + aliases)
- [x] **ST-012** — ordem build documentada
- [x] **ST-024** — typecheck no CI (paridade TS-029)
- [x] **SM-005** — suite núcleo formalizada em `scripts/README.md`
- [x] **TS-026** — `tsconfig.browser-paths.json` + extends unificados

### SM-009 + TS-033–036, TS-043 (2026-06-15)

- [x] **SM-009** — `scripts/smoke-features.mjs` + `npm run smoke:features` (`--only=`, `--list`)
- [x] **TS-033** — web sem `any`/`unknown` soltos; `byId` com null-check
- [x] **TS-034** — WS tipado com `@shared/types/live` em live + external-display
- [x] **TS-035** — portal usa `@shared/auth-session` + `@shared/types/auth-api`
- [x] **TS-036** — remote usa tipos partilhados auth + `@shared/types/remote-api`
- [x] **TS-043** — regra `shared/**/*.js` documentada (já no `.gitignore`)

### SM-010 + TS-037 + TS-044 (2026-06-15)

- [x] **SM-010** — `scripts/lib/smoke-textfill.mjs` + `smoke:textfill` + domínio `textfill` em `smoke:features`
- [x] **TF-022** — testes `tests/projection-textfill-*` no smoke textfill
- [x] **TS-037** — ADR: manter `tsc` (`docs/ADR-037-web-bundler.md`)
- [x] **TS-044** — quickstart README + `npm run verify:build`

**Fila:** SM-030 (remover ficheiros cad* após release) → TF-016–018 (QA manual textfill) → SM-011/012/013 (consolidar auth/displays/backup).

### TS-038 + TS-045 + SM-016–029 (2026-06-15)

- [x] **TS-038** — `build:browser:dev` com source maps; `strip-browser-sourcemaps.mjs` em builds produção; `dev` usa browser dev
- [x] **TS-045** — `docs/TS-045-EPIC-CHECKLIST.md` (epic TS fechado para alpha)
- [x] **SM-016–SM-029** — `smoke:cad*` deprecados via `scripts/smoke-deprecated.mjs` (cad313 → `smoke:textfill`)

### SM-030–032 + TS-038 verify + TF-016–018 (2026-06-15)

- [x] **TS-038** — `verify:sourcemaps` + documentação completa (BUILD, README, TS-045)
- [x] **SM-030** — removidos 18× `scripts/smoke-cad*.mjs`; `smoke-typography-qa.mjs` (ex cad314)
- [x] **SM-031** — `scripts/README.md` actualizado (sem cad*)
- [x] **SM-032** — `package.json` sem entradas `smoke:cad*`
- [x] **SM-037** — CHANGELOG [Unreleased] limpeza smokes
- [x] **TF-016–018** — checklist manual em `docs/textfill-manual-qa.md`

### SM-011 + TS-039 (2026-06-15)

- [x] **SM-011** — `scripts/lib/smoke-auth.mjs` + `npm run smoke:auth` + domínio `auth` em `smoke:features`
- [x] **TS-039** — `eslint.config.js`, `npm run lint`, job CI; **promovida P3 opcional → P1 obrigatória**
- Correcção: `dragOverIndex` ref em `ChromeTabPanel.vue` (detectado pelo ESLint)

### SM-012/013 (2026-06-15)

- [x] **SM-012** — `scripts/lib/smoke-displays.mjs` + `npm run smoke:displays` (cad188 + cad194)
- [x] **SM-013** — `scripts/lib/smoke-backup.mjs` + `npm run smoke:backup` (cad228 + cad234 + cad238)

**Fila:** ST-036/037 → TS-043 (opcional).

### TS-040/042 + SM-041 + ST-025 (2026-06-15)

- [x] **TS-040** — `scripts/git-hooks/pre-commit` + `npm run install:git-hooks` (opt-in)
- [x] **TS-042** — `depcheck` devDep, `verify:depcheck`, `skipMissing` documentado
- [x] **SM-041** — `npm run test:unit` (`scripts/run-unit-tests.mjs`, 7 testes)
- [x] **ST-025** — README: árvore com `dist/`, `scripts/`, `tests/`, `docs/`

### TF-028 + SM-042 + TS-041 (2026-06-15)

- [x] **TF-028** — `docs/TF-028-EPIC-CHECKLIST.md` (epic textfill fechado para alpha)
- [x] **SM-042** — `docs/SM-042-EPIC-CHECKLIST.md` (17 scripts; cad* zero; CI núcleo)
- [x] **TS-041** — comentários «paridade v0.0.8» actualizados em fonte TS/Vue (mantidos em `legacy-upgrade.ts`)

