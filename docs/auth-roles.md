# Papéis de conta (CAD-119)

| Papel (`role`) | Uso | Visualizações de monitor atribuíveis |
|----------------|-----|--------------------------------------|
| `admin` | Administrador local | `operator`, `projection`, `stage-return`, `off` |
| `operator` | Operador local | `operator`, `off` |
| `remote` | Acesso remoto / aprovações | — (não gere monitores) |

O utilizador inicial `admin` (bootstrap) recebe papel **`admin`**, não `operator`.

## API

- `POST /api/auth/login` e `GET /api/auth/me` devolvem `displayRoles` conforme o papel.
- `PUT /displays/config` com Bearer: valida que cada `assignment.role` está permitido para o papel da sessão.
- Consola Electron em loopback (`127.0.0.1`) sem token mantém comportamento legado (sem validação por sessão).

## Smoke

```bash
npm run build
node scripts/smoke-cad119.mjs
```

## Legado

A pasta `v0.0.8/` é apenas referência da refatoração — **não** recebe novas funcionalidades.
