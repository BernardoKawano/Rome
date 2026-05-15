# Demandas — Kanban minimalista

Next.js, TypeScript, Tailwind CSS v4. **Login com Google** e tabuleiro guardado no ficheiro `demandas-kanban.json` no **Google Drive** de cada utilizador (sem Clerk, sem base de dados).

## Como funciona

1. Entra com Google → a app pede acesso ao Drive (só ficheiros que ela criar).
2. Cria ou atualiza `demandas-kanban.json` na sua conta.
3. Ao voltar (mesmo noutro PC), os dados vêm desse ficheiro.
4. Cópia de segurança no browser (`localStorage`) se o Drive falhar temporariamente.

## Configurar Google Cloud

1. [Google Cloud Console](https://console.cloud.google.com/) → novo projeto.
2. **APIs e serviços → Biblioteca** → ativar **Google Drive API**.
3. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicação Web**
   - URIs de redirecionamento autorizados:
     - `http://localhost:3000/api/auth/google/callback` (dev)
     - `https://SEU-DOMINIO.vercel.app/api/auth/google/callback` (produção)
4. **Ecrã de consentimento OAuth** → adicionar utilizadores de teste (modo teste) ou publicar a app.
5. Copie **Client ID** e **Client Secret**.

## Variáveis de ambiente

Copie `.env.example` para `.env.local`:

| Variável | Descrição |
|----------|-----------|
| `GOOGLE_CLIENT_ID` | Client ID OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret |
| `GOOGLE_REDIRECT_URI` | Callback (ex.: `http://localhost:3000/api/auth/google/callback`) |
| `AUTH_SESSION_SECRET` | String aleatória longa (cookies de sessão) |

Remova variáveis antigas (`CLERK_*`, `APP_AUTH_*`, `KV_*`) se ainda existirem.

## Comandos

```bash
npm install
npm run dev
```

Abra http://localhost:3000 → **Entrar com Google**.

```bash
npm run test
npm run build
```

## Deploy na Vercel

1. Push para Git e importar na Vercel.
2. Environment Variables: as quatro variáveis acima (redirect URI com o domínio Vercel).
3. No Google Cloud, adicione o redirect URI de produção.
4. Deploy.

## Changelog

Ver `CHANGELOG.md`.
