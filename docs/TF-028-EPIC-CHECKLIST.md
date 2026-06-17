# Epic textfill — checklist final (TF-028)

Revisão de fecho do epic «Textfill reutilizável e unificado» (TF-001–TF-025).  
Data: 2026-06-15

## Critérios obrigatórios (P0–P1)

| ID | Critério | Estado |
|----|----------|--------|
| TF-001–004 | Arquitectura, API, controller, diagrama — [`projection-textfill.md`](projection-textfill.md) | ✅ |
| TF-005–012 | Composable `useProjectionTypographyPreview`; tiles sem import directo de textfill | ✅ |
| TF-013–014 | Projetor/stage-return via controller; retorno `allTexto: true` | ✅ |
| TF-015 | WS tipografia em projector, stage-return, live, external-display | ✅ |
| TF-016–018 | QA manual — [`textfill-manual-qa.md`](textfill-manual-qa.md) | ✅ checklist |
| TF-022 | `tests/projection-textfill-*.test.mjs` no `smoke:textfill` | ✅ |
| TF-024 | Smoke textfill valida composable/controller (SM-010, ex cad313/314) | ✅ |

## Backlog (não bloqueia TF-028)

| ID | Título |
|----|--------|
| TF-019–021 | Tipos diagnóstico DRY + doc activação |
| TF-023 | Teste composable com Vitest (futuro) |
| TF-025 | Textfill no gate `smoke:release` (opcional) |
| TF-026–027 | `<ProjectionContent>`; constantes PREVIEW/OUTPUT documentadas |

## Verificação automática

```bash
npm run smoke:textfill
npm run smoke:typography-qa
# operador: zero import @shared/projection-textfill em components (só composable)
rg '@shared/projection-textfill' apps/operator/src/components -g '*.vue'   # vazio
rg 'attachProjectionTypographyWs' apps/projector web apps/stage-return    # 4 superfícies
```

## Sign-off

Epic textfill considerado **fechado para alpha** com QA visual manual pendente de execução pelo operador (`textfill-manual-qa.md`). Backlog P2/P3 documentado acima.
