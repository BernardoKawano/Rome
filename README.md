# Demandas — quadro dos talentos

Next.js, TypeScript, Tailwind CSS v4. Cada talento entra com e-mail e senha, preenche o quadro da empresa em que está e fecha a semana mostrando o que mexeu o ponteiro.

A meta é **80% das horas** em trabalho que aumenta receita, reduz despesa ou economiza tempo. O resto conta como operacional.

## Como funciona

1. O gestor entra e cria o talento: nome, e-mail, senha inicial e empresa.
2. O talento usa três colunas: **A fazer**, **Em progresso**, **Realizado**.
3. Em cada cartão regista horas e o tipo de impacto.
4. O relatório da semana, do mês ou do sprint soma o que foi para Realizado.
5. Recados e reuniões ficam na mesma tela.
6. O gestor abre cada talento e vê essa mesma tela, deixa feedback e marca reuniões.

## Onde ficam os dados

Com Supabase configurado, Auth e Postgres são a fonte. O papel (`gestor` ou `talento`) está na tabela `profiles`, não no metadata editável do utilizador. Aplique [`supabase/migrations/20260923180000_talent_panel.sql`](supabase/migrations/20260923180000_talent_panel.sql).

Sem Supabase, em desenvolvimento, a app grava em `.data/app-store.json` (não vai para o git). Em produção na Vercel o Supabase é obrigatório: o disco da função não guarda dados.

## Variáveis de ambiente

Copie `.env.example` para `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (a chave antiga `NEXT_PUBLIC_SUPABASE_ANON_KEY` também é aceite)
- `SUPABASE_SECRET_KEY` (só no servidor; cria contas)
- `GESTOR_EMAIL` e `GESTOR_PASSWORD` — criam o primeiro gestor se ele ainda não existir
- `AUTH_SESSION_SECRET` — cookie de sessão no modo local

Não grave senhas no repositório.

## Comandos

```bash
npm install
npm run dev
```

Abra http://localhost:3000 e entre com o gestor. Crie um talento e entre com o e-mail dele.

```bash
npm run test
npm run build
```

## Deploy na Vercel

1. Push para Git e importar na Vercel.
2. Environment Variables: as variáveis acima, com o projeto Supabase.
3. Correr a migração SQL no projeto.
4. Deploy.

O login Google e o ficheiro `demandas-kanban.json` no Drive deixam de ser usados. Os módulos antigos continuam no repositório.

## Changelog

Ver `CHANGELOG.md`.
