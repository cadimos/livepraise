# Traduções do operador (i18n)

## Idioma padrão

**`pt-BR`** é e permanece o idioma padrão da aplicação (fallback vue-i18n, `GET /locales`, preferências iniciais).

## Fonte canónica de chaves

`locales/pt-BR.json` — qualquer locale novo deve ter **a mesma árvore de chaves**; apenas os **valores** são traduzidos.

## Adicionar um idioma

1. Copiar `pt-BR.json` → `locales/{code}.json` (ex.: `en-US.json`).
2. Traduzir valores; não renomear chaves.
3. Copiar o ficheiro para `install/locales/{code}.json` (primeira instalação).
4. Adicionar rótulo legível em `locales.meta.{code}` nos ficheiros `pt-BR.json` e do novo idioma.
5. Correr `npm run smoke:locales` antes do merge.

### Regenerar locales derivados após mudanças em `pt-BR`

```bash
npm run sync:locales
```

| Idioma | Script | Mapa de tradução |
|--------|--------|------------------|
| `en-US` | `scripts/build-en-us-locale.mjs` | `scripts/build-en-us-locale.mjs` (inline) |
| `pt-PT` | `scripts/build-pt-pt-locale.mjs` | regras PT-PT + `OVERRIDES` |
| `es-ES` | `scripts/build-es-es-locale.mjs` | `scripts/locale-maps/en-to-es.mjs` (via `en-US`) |

Revise traduções novas nos mapas quando adicionar chaves.

## Não alterar sem decisão de produto

- `DEFAULT_LOCALE` em `apps/operator/src/i18n.ts`
- `default: 'pt-BR'` em `server/routes/locales.ts`
- Preferência inicial em `usePreferences.ts`
