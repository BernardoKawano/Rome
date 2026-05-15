# Changelog

## 0.1.1 — 2026-05-15

- Next.js e `eslint-config-next` atualizados para 15.3.8 (CVE-2025-66478 e advisory 2025-12-11) — corrige bloqueio de deploy na Vercel.

## 0.1.0 — 2026-05-14

- Kanban com colunas A fazer / Em curso / Feito, arraste com @dnd-kit, persistência em Vercel KV por utilizador (fallback em memória sem env KV).
- Autenticação Clerk e rotas API GET/PUT `/api/board`.
- Cartões com notas, prazo, etiquetas, até 10 sub-itens; registo de conclusões com data (`completedLog`).
- Testes Vitest para schema, `safeParse` e lógica de conclusão.
