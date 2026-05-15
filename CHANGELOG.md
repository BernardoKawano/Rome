# Changelog

## 0.2.0 — 2026-05-15

- Removidos Clerk, Vercel KV e login por utilizador/senha.
- Login Google OAuth; tabuleiro em `demandas-kanban.json` no Google Drive do utilizador.
- Cópia local no browser como fallback.

## 0.1.3 — 2026-05-15

- Login com Google via Clerk (`/sign-in`); APIs `/api/board` e `/api/auth/me` com sessão.
- Cópia local do tabuleiro em `localStorage` + sincronização ao servidor; flush ao sair.

## 0.1.2 — 2026-05-15

- Persistência local em `.data/boards/` quando `KV_*` não está configurado (substitui memória volátil do servidor).
- Guardar do tabuleiro valida resposta da API e envia alterações pendentes ao fechar a página.

## 0.1.1 — 2026-05-15

- Next.js e `eslint-config-next` atualizados para 15.3.8 (CVE-2025-66478 e advisory 2025-12-11) — corrige bloqueio de deploy na Vercel.

## 0.1.0 — 2026-05-14

- Kanban com colunas A fazer / Em curso / Feito, arraste com @dnd-kit, persistência em Vercel KV por utilizador (fallback em memória sem env KV).
- Autenticação Clerk e rotas API GET/PUT `/api/board`.
- Cartões com notas, prazo, etiquetas, até 10 sub-itens; registo de conclusões com data (`completedLog`).
- Testes Vitest para schema, `safeParse` e lógica de conclusão.
