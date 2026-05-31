# Papéis de conta (CAD-119)

| Papel (`role`) | Uso | Visualizações de monitor atribuíveis |
|----------------|-----|--------------------------------------|
| `admin` | Administrador local (inclui envio remoto) | `operator`, `projection`, `stage-return`, `off` |
| `operator` | Operador local | `operator`, `off` |
| `remote` | Acesso remoto / aprovações | — (não gere monitores) |

O utilizador inicial `admin` (bootstrap) recebe papel **`admin`**, não `operator`.

## API

- `POST /api/auth/login` e `GET /api/auth/me` devolvem `displayRoles` conforme o papel.
- `PUT /displays/config` com Bearer: valida que cada `assignment.role` está permitido para o papel da sessão.
- Consola Electron em loopback (`127.0.0.1`) sem token mantém bypass local (sem validação por sessão).

## Regressão

Papéis e `PUT /displays/config` entram na suite de release (`npm run smoke:release`). Durante o desenvolvimento use `npm run typecheck`.
