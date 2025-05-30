# Documentação de Desenvolvimento

## 1. Estrutura Atual do Projeto

### 1.1 Diretórios Principais
- `src/`: Código fonte principal
  - `frontend/`: Interface do usuário
  - `backend/`: Servidor e lógica de negócios
  - `main/`: Código principal do Electron
- `docs/`: Documentação do projeto
- `install/`: Arquivos de instalação
- `dist/`: Arquivos compilados

### 1.2 Componentes Principais
- Servidor Express
- Socket.IO para comunicação em tempo real
- Electron para interface desktop
- SQLite para banco de dados
- JWT para autenticação

### 1.3 Decisões Técnicas
- **JavaScript vs TypeScript**: Optamos por manter o projeto em JavaScript puro pelos seguintes motivos:
  - Projeto já está funcionando bem com JavaScript
  - Equipe familiarizada com JavaScript
  - Evita complexidade adicional na compilação
  - Simplifica a integração com Electron
  - Mantém o processo de build mais direto

### 1.4 Estrutura de Diretórios do Usuário
O aplicativo utiliza o diretório do usuário atual para armazenar dados e configurações:
- Windows: `C:\Users\<usuario>\livepraise\`
- Linux: `/home/<usuario>/livepraise/`
- macOS: `/Users/<usuario>/livepraise/`

Subdiretórios:
- `dsw.bd`: Banco de dados SQLite
- `backup/`: Backups do banco de dados
- `imagens/`: Imagens do usuário
- `videos/`: Vídeos do usuário
- `logs/`: Arquivos de log

## 2. Estrutura que pode ser melhorada

### 2.1 Separação mais clara entre frontend e backend ✅
- [x] Reorganização dos diretórios
- [x] Separação clara de responsabilidades
- [x] Melhor organização dos módulos

### 2.2 Organização mais modular dos componentes ✅
- [x] Reorganização dos módulos em controllers e services
- [x] Melhor separação de responsabilidades
- [x] Código mais limpo e organizado

### 2.3 Melhor gerenciamento de configurações ✅
- [x] Arquivo de configuração centralizado
- [x] Separação de configurações por ambiente
- [x] Uso de variáveis de ambiente
- [x] Documentação das configurações disponíveis

### 2.4 Documentação mais detalhada ✅
- [x] Documentação da API
- [x] Processo de instalação
- [x] Processo de build
- [x] Comentários no código
- [x] Guia de contribuição

## 3. Melhorias Implementadas

### 3.1 Performance ✅
- [x] Otimização de consultas ao banco de dados
- [x] Cache de recursos estáticos
- [x] Compressão de respostas
- [x] Lazy loading de módulos

### 3.2 Segurança ✅
- [x] Validação mais robusta de inputs
- [x] Sanitização de dados
- [x] Proteção contra ataques comuns
- [x] Auditoria de segurança

### 3.3 Melhorias de UX/UI ✅
- [x] Interface mais moderna
- [x] Melhor feedback ao usuário
- [x] Temas personalizáveis
- [x] Responsividade

### 3.4 Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes end-to-end
- [ ] Cobertura de código

## 4. Guia de Contribuição

### 4.1 Configuração do Ambiente
1. Clone o repositório
2. Instale as dependências: `npm install`
3. Copie `.env.example` para `.env` e configure as variáveis
4. Execute o projeto: `npm start`

### 4.2 Padrões de Código
- Use ESLint para linting
- Siga o guia de estilo do projeto
- Documente funções e classes
- Escreva testes para novas funcionalidades

### 4.3 Processo de Pull Request
1. Crie uma branch para sua feature
2. Faça commit das mudanças
3. Envie um pull request
4. Aguarde a revisão

## 5. Recursos Úteis

### 5.1 Documentação
- [Documentação do Electron](https://www.electronjs.org/docs)
- [Documentação do Express](https://expressjs.com/)
- [Documentação do Socket.IO](https://socket.io/docs)
- [Documentação do SQLite](https://www.sqlite.org/docs.html)

### 5.2 Ferramentas
- [Visual Studio Code](https://code.visualstudio.com/)
- [Postman](https://www.postman.com/)
- [SQLite Browser](https://sqlitebrowser.org/)
- [Git](https://git-scm.com/)

## 6. Melhorias Recentes

### 6.1 Performance
- Implementação de compressão de respostas HTTP
- Cache de recursos estáticos (24 horas)
- Lazy loading de módulos com consign
- Otimização do carregamento de arquivos

### 6.2 Segurança
- Adição do Helmet para proteção HTTP
- Validação mais robusta de tokens JWT
- Melhor tratamento de erros
- Verificação de expiração de tokens

### 6.3 UX/UI
- Feedback visual durante carregamento
- Mensagens de erro mais amigáveis
- Tratamento de erros de rede
- Verificação de atualizações automática

### 6.4 Estabilidade
- Tratamento de erros não capturados
- Melhor feedback em caso de falhas
- Reinicialização automática em caso de erro crítico
- Logs mais detalhados

### 6.5 Configurações
- Uso do diretório do usuário atual para dados
- Suporte multiplataforma para caminhos
- Remoção de variáveis de ambiente desnecessárias
- Melhor organização das configurações

## 7. Segurança de Scripts e CSP

### 7.1 Política de Segurança de Conteúdo (CSP)
O Live Praise utiliza uma política de segurança de conteúdo (CSP) restritiva para evitar ataques XSS. Por isso, **não são permitidos handlers inline** (ex: onclick, onmouseup) no HTML. Todos os eventos devem ser adicionados via JavaScript externo.

**Exemplo correto:**
```js
// No arquivo JS
botao.addEventListener('click', minhaFuncao);
```

**Exemplo incorreto:**
```html
<button onclick="minhaFuncao()">Clique</button>
```

### 7.2 Acesso em Rede Local
Por padrão, qualquer computador da rede local pode acessar as interfaces do Live Praise, desde que saiba o IP e a porta do servidor. Recomenda-se proteger rotas sensíveis com autenticação e, se necessário, restringir o acesso por firewall ou configuração de rede.