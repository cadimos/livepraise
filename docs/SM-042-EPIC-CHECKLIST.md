# Epic smokes — checklist final (SM-042)

Revisão de fecho do epic «Limpeza e consolidação de smokes» (SM-001–SM-041).  
Data: 2026-06-15

## Meta original vs estado actual

| Meta | Estado |
|------|--------|
| Remover `smoke-cad*` | ✅ 18 ficheiros removidos (SM-030) |
| Entrypoint único features | ✅ `smoke:features` + `--only=` |
| Suite núcleo CI | ✅ fase2 + fase8 + car40 |
| ≤8 scripts `smoke-*.mjs` | ⚠️ **17** scripts — meta aspiracional; domínios separados + `smoke-features` como agregador |

## Scripts vivos (`scripts/smoke-*.mjs`)

| Categoria | Ficheiros | npm |
|-----------|-----------|-----|
| **CI núcleo** | `smoke-fase2`, `smoke-fase8`, `smoke-car40` | `smoke:bootstrap`, `smoke:fase8`, `smoke:car40` |
| **Agregador** | `smoke-features` | `smoke:features` |
| **Domínio** | `smoke-textfill`, `smoke-typography-qa`, `smoke-auth`, `smoke-displays`, `smoke-backup` | scripts individuais |
| **Feature manual** | `smoke-locales-i18n`, `smoke-audit-retention`, `smoke-video-watcher`, `smoke-musica-export`, `smoke-version-sync` | aliases + `--only=` |
| **Especial** | `smoke-legacy-upgrade`, `smoke-build-surfaces`, `smoke-win-installer` | manual / pós-build / Windows |

Libs reutilizáveis: `scripts/lib/smoke-helpers.mjs`, `smoke-textfill.mjs`, `smoke-auth.mjs`, `smoke-displays.mjs`, `smoke-backup.mjs`.

## Critérios SM-001–SM-041

| ID | Critério | Estado |
|----|----------|--------|
| SM-001–002 | Inventário + mapeamento CAD | ✅ `scripts/README.md` |
| SM-005 | Suite núcleo formalizada | ✅ |
| SM-007–008 | Helpers partilhados | ✅ |
| SM-009–013 | Consolidação auth/displays/backup + features | ✅ |
| SM-014 | `smoke:legacy-upgrade` isolado | ✅ |
| SM-016–030 | cad* deprecados e removidos | ✅ |
| SM-031–032 | README + package.json actualizados | ✅ |
| SM-037 | CHANGELOG limpeza | ✅ |
| SM-041 | `npm run test:unit` — `scripts/run-unit-tests.mjs` | ✅ |

## Verificação automática

```bash
# Contagem (esperado: 17 em 2026-06-15)
ls scripts/smoke-*.mjs | wc -l

# Zero cad*
ls scripts/smoke-cad*.mjs 2>/dev/null && exit 1 || true

# CI núcleo (GitHub Actions ci.yml)
npm run smoke:bootstrap
npm run test:video-pipeline
npm run smoke:fase8
```

## Quando correr

| Momento | Comando |
|---------|---------|
| Dev diário | `npm run typecheck`, `npm run lint` |
| Pré-release | `npm run smoke:release` |
| Features | `npm run smoke:features` ou `--only=auth,displays,backup,textfill` |
| Migração legado | `npm run smoke:legacy-upgrade` |

## Sign-off

Epic smokes **fechado para alpha**: cad* eliminados, consolidação por domínio feita, CI núcleo verde, `test:unit` disponível. Contagem ≤8 remanece backlog de simplificação futura.
