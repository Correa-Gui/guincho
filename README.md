# GuinchoFin

SaaS de gestão de custos e operação para empresas de guincho/reboque. Multi-tenant
desde o início (toda tabela de negócio tem `empresa_id`, isolamento via RLS no Postgres).

## Stack

- Next.js (App Router, TypeScript) + Tailwind v4 + shadcn/ui
- Supabase: Postgres, Auth, Storage, RLS
- Evolution API (WhatsApp não-oficial) — Fase 5
- API da Anthropic (visão de comprovantes + estruturação de áudio) — Fase 5

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente. Copie `.env.example` para `.env.local` e
   preencha com os dados do seu projeto Supabase (Project Settings > API):

   ```bash
   cp .env.example .env.local
   ```

   - `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto (`https://<project-id>.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: publishable key do projeto

3. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

4. Aplique as migrations e o seed no seu projeto Supabase (SQL Editor ou
   `supabase db push`):

   - `supabase/migrations/0001_init.sql` — tabelas, índices e políticas RLS
   - `supabase/seed.sql` — dados de exemplo (siga as instruções no final do
     arquivo para vincular seu usuário à empresa de exemplo)

5. Abra [http://localhost:3000](http://localhost:3000). Você será redirecionado para
   `/login`. Crie um usuário em **Authentication > Users** no painel do Supabase
   e vincule-o à empresa via `usuarios` (passo final do `seed.sql`) para
   conseguir entrar (cadastro de usuários pelo app vem em fase futura).

## Estrutura

```
app/
  (auth)/login/     # tela de login
  (dashboard)/      # área autenticada (sidebar + topbar)
lib/supabase/       # clients browser/server + helper de sessão do middleware
proxy.ts            # middleware: protege rotas e renova sessão Supabase
components/layout/  # sidebar do app
reference/          # mockup de referência de design (GuinchoFin.dc.html)
supabase/migrations/ # migrations SQL (a partir da Fase 1)
```

## Próximas fases

- Fase 2: módulo de Viagens + Ordem de Serviço
- Fase 3: Financeiro + Dashboard
- Fase 4: Frota, Pátio e Alertas
- Fase 5: integração WhatsApp via Evolution API
