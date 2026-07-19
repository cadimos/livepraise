# ST-004 — Auditoria duplicados web vs apps

Data: 2026-06-17

## Resolvido (ST-005 / ST-006)

| Lógica | Antes | Depois |
|--------|-------|--------|
| `stripChordsForProjection` / `stripChordsFromHtml` | Cópias em `web/live`, `web/external-display`, `apps/operator/utils/projection.ts`, `core/projection/chords.ts` | `shared/projection-chords.ts` |
| `wsUrl()` | 5× idêntico (projector, stage-return, live, external-display, operator) | `shared/ws-live-url.ts` → `wsLiveUrl()` |

## Já unificado (ST-001)

| Módulo | Local |
|--------|-------|
| `projection-contrast` | `shared/projection-contrast.ts` |

## Backlog (ST-004 restante)

| Área | Notas |
|------|-------|
| `stage-return` vs `/stage/` | Retorno de palco em runtime usa `web/external-display` — ver ARCHITECTURE.md |
| Helpers de join WS (`deviceId`, roles) | Padrão similar mas payloads diferem por perfil — não extrair sem ADR |
| `projection.ts` operador | `buildMusicHtml` / `buildBibleHtml` específicos do operador — OK manter |

## Verificação

```bash
rg 'function stripChordsForProjection' web/ apps/   # vazio
rg 'function wsUrl' web/ apps/ electron/            # vazio (usa wsLiveUrl)
```
