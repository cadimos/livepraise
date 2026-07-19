# TF-026 — ADR: componente `<ProjectionContent>`

**Data:** 2026-06-17  
**Estado:** Aceite — **não implementar** nesta fase

## Contexto

`PreviewOutputTile.vue` e `ProjectionTypographyPreview.vue` partilham:

- markup `.content > span` (louvor, Bíblia, notas)
- integração com `useProjectionTypographyPreview`

O runtime browser usa `createProjectionTypographyController()` com DOM equivalente.

## Opção avaliada

Componente Vue `<ProjectionContent>` que encapsula:

```html
<div class="content"><span v-html="html" /></div>
```

+ wiring mínimo ao composable.

## Decisão

**Adiar.** O composable `useProjectionTypographyPreview` (TF-006–TF-012) já unifica a lógica de tipografia/textfill. Os tiles diferem em:

| Tile | Específico |
|------|------------|
| `PreviewOutputTile` | fundo, vídeo, YouTube, footer alert, aspect ratio |
| `ProjectionTypographyPreview` | amostras i18n, `previewReady`, painel configurações |

Extrair só o wrapper `.content` pouparia ~5 linhas por ficheiro e obrigaria props slot/`v-html` extra sem reduzir duplicação real (que está no composable, não no template).

## Consequências

- Manter `useProjectionTypographyPreview` como ponto único de integração operador.
- Reavaliar se surgir terceiro consumidor com o mesmo markup ou se Playwright exigir selector estável partilhado.
- Documentação: [`projection-textfill.md`](projection-textfill.md) TF-005 conclusão permanece válida.
