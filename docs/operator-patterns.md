# Padrões do operador Vue (ST-016)

Guia para novos painéis, composables e utilitários em `apps/operator/`.

## Camadas

| Camada | Pasta | Responsabilidade |
|--------|-------|------------------|
| **Painéis** | `src/components/panels/*.vue` | UI de configuração e fluxos longos (Louvor, Bíblia, Displays, …) |
| **Componentes** | `src/components/*.vue` | Peças reutilizáveis (modais, prévia, fila, barra de estado) |
| **Composables** | `src/composables/*.ts` | Estado reactivo, WS, API, preferências — lógica sem markup |
| **Utils** | `src/utils/*.ts` | Funções puras (HTML de projeção, fila, backup) |
| **Tipos locais** | `src/types/*.ts` | Tipos só do operador (ex.: `preview-groups`) |

Regra: **painel fino** — importa composables/utils; não duplicar lógica de `shared/` nem de `core/`.

## Composables vs componentes

- **Composable** quando há estado partilhado entre vários componentes (`useLiveSocket`, `usePreferences`, `useApi`).
- **Componente** quando há markup ou interacção visual reutilizável (`BackupModal`, `PreviewOutputTile`).
- Um painel novo deve expor o mínimo de lógica inline; extrair para `useX` se crescer além de ~80 linhas de script.

## Imports

### `@shared/*` — código partilhado

No operador (Vite), usar sempre o alias `@shared/...` para módulos em `shared/`:

```ts
import type { LiveState } from '@shared/types/live';
import { summarizeLabel } from '@shared/queue-items';
```

**Não** usar `/shared/foo.js` (reservado a apps browser compiladas com `tsc` + paths em `tsconfig.browser-paths.json`).

Auditoria ST-017: zero outliers em `apps/operator` — todos os imports de `shared/` passam por `@shared`.

### Paths relativos — código do operador

Imports locais com paths relativos (`../composables/useApi`, `../../utils/projection`):

- composables ↔ utils ↔ components dentro de `apps/operator/src/`
- excepção documentada: `useProjectionFonts.ts` importa `resources/fonts/manifest.json` via path relativo ao repo (asset estático, não módulo TS)

### `@core/*`

Evitar no operador. Lógica de domínio vive em `shared/`; `core/` é para o servidor.

## API HTTP

- Usar `fetchJson`, `apiBase`, `mediaUrl` de `useApi.ts` — não `fetch` disperso nos painéis.
- **Excepções documentadas (ST-018):** `backup-restore-api.ts` e `queue-import-api.ts` usam `fetch` directo para `multipart/form-data` e uploads (corpo não-JSON). Novos endpoints de upload devem seguir o mesmo padrão nesses utils.
- Autenticação: token via `@shared/auth-session` (já integrado em `useApi`).

## WebSocket live

- Uma instância por app: `useLiveSocket()` (singleton interno).
- Tipos de acções/mensagens: `@shared/types/live`.
- URL WS: `wsLiveUrl()` de `@shared/ws-live-url` (não reimplementar `location.host`).

## i18n

- Ficheiros de locale em `apps/operator/locales/`; carregamento via `src/i18n.ts` + `useLocale`.
- Strings de UI: chaves em JSON de locale; no template usar `$t('chave')` ou equivalente do projeto.
- **Dívida conhecida:** portal (`web/portal`) e remote (`web/remote`) ainda sem i18n completo — ver [`DIVIDA-TECNICA.md`](DIVIDA-TECNICA.md).

## Projeção e prévia

- HTML de saída: `src/utils/projection.ts`, `projection-actions.ts`, `projection-background.ts`.
- Acordes: `@shared/projection-chords` (`stripChordsForProjection`).
- Tipografia/textfill: `@shared/projection-typography`, `@shared/projection-textfill`; prévia via `useProjectionTypographyPreview`.
- Tipos de prévia multi-saída: `src/types/preview-groups.ts` (operador); contrato WS em `@shared/types/live`.

## Preferências e persistência

- Estado de UI e prefs do operador: `usePreferences()` (localStorage + sync API quando aplicável).
- Não gravar prefs de projeção directamente no painel — usar APIs `/api/projection-typography` ou acções WS já existentes.

## Testes

- Lógica pesada (textfill, temas, segurança): `tests/*.test.mjs` via `npm run test:unit`.
- Smokes: asserções finas HTTP/exports; ver [`SM-015-unit-tests-split.md`](SM-015-unit-tests-split.md).

## Checklist — novo painel

1. Ficheiro em `components/panels/NomePanel.vue`.
2. API via `useApi`; WS via `useLiveSocket` se projectar ou ouvir estado live.
3. Tipos de domínio de `@shared/types/*` ou `@shared/*` — não copiar structs.
4. Strings traduzíveis nos JSON de locale.
5. Sem imports de `server/` ou `electron/`.
