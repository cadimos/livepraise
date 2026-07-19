# QA manual — textfill (TF-016–TF-018)

Checklist para validação visual antes de release. Automatizado: `npm run smoke:textfill` + `npm run smoke:typography-qa`.

## Pré-requisitos

```bash
npm run dev          # ou dev:server + abrir operador e projetor
```

## TF-016 — Louvor longo (14+ versos)

1. Importar ou criar louvor com **14 ou mais versos** (linhas longas).
2. Adicionar à fila e projectar no **projetor**.
3. Abrir **pré-visualização** do projetor no operador (tile correspondente).
4. Verificar:
   - [ ] Texto cabe na área útil (sem corte abrupto no meio do verso).
   - [ ] Tamanho relativo prévia ≈ projetor (mesma ordem de grandeza; não prévia minúscula com projetor grande).
   - [ ] **Não** fica preso em 24px no projetor quando textfill está activo (salvo verso extremamente longo — ajustar mínimo em Tipografia se necessário).

## TF-017 — Bíblia (versículo longo)

1. Projectar passagem com **versículo longo** (ex.: Salmo ou narrativa).
2. Repetir comparação prévia vs projetor (TF-016).
3. Verificar:
   - [ ] Texto legível e contido na área.
   - [ ] Quebras de linha naturais preservadas.

## TF-018 — Flash ao trocar verso

1. Com louvor na fila, avançar **verso a verso** no operador.
2. Observar **projetor público** (não só prévia):
   - [ ] Sem flash branco ou texto a «piscar» entre versos.
   - [ ] Transição suave (opacity/visibility).
3. Regressão automática: `tests/projection-textfill-visibility.test.mjs` (incluído em `smoke:textfill`).

## Registo

| Data | Tester | TF-016 | TF-017 | TF-018 | Notas |
|------|--------|--------|--------|--------|-------|
| | | | | | |

## Referências

- [`docs/projection-textfill.md`](projection-textfill.md)
- `npm run smoke:typography-qa` — CA-1–14 algoritmo + API
