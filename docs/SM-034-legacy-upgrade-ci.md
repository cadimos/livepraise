# SM-034 — `smoke:legacy-upgrade` no CI de PR

## Decisão (2026-06-17)

**Não incluir** `npm run smoke:legacy-upgrade` no job `smoke` de `.github/workflows/ci.yml`.

## Motivos

1. **Fixtures legadas** — cria BD SQLite v0.0.8 sintética e corre upgrade completo; overlap parcial com `smoke:bootstrap` (migrations limpas).
2. **Runtime** — soma ~30–60s ao job smoke em cada PR; benefício marginal face à frequência de alterações em `legacy-upgrade.ts`.
3. **Isolamento** — migração é caminho de upgrade único; já documentada como gate **manual pré-release**.

## Quando correr

```bash
npm run smoke:legacy-upgrade   # após alterações em server/db/legacy-upgrade.ts
```

Antes de publicar release quando houver mudanças em migrations ou upgrade legado. Ver também [`scripts/README.md`](../scripts/README.md).

## Reavaliação

Incluir no CI se:

- regressões em `legacy-upgrade.ts` voltarem a ocorrer sem detecção em PR, ou
- o smoke for refactorizado para ser mais rápido e sem side-effects pesados.
