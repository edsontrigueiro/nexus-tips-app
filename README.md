# Nexus Tips — app

Next.js 14 + Supabase. Um único projeto serve o site público, a área logada do
usuário (`/dashboard`) e o painel administrativo (`/admin`) — cadastro, assinatura
e cancelamento aparecem no admin **em tempo real**, sem cron job e sem precisar
atualizar a página, via Supabase Realtime.

## O que já funciona (MVP)

- Landing page, cadastro e login reais (Supabase Auth).
- Dashboard do usuário: visão geral, eventos (sinais publicados pelo admin, ao
  vivo via Realtime), planos (assinar/cancelar) e suporte (abrir chamado e
  conversar).
- Painel admin (`/admin`, login separado em `/admin/login`): visão geral com
  MRR estimado/assinantes/usuários/sinais no ar/tickets, publicação manual de
  sinais, gestão de usuários, controle financeiro das assinaturas (cancelar
  qualquer assinatura) e inbox de suporte.
- Todo dado do admin atualiza sozinho: publicar um sinal aparece na hora em
  Eventos de quem está logado; um cadastro novo aparece na hora em Usuários;
  assinar/cancelar aparece na hora em Assinaturas.

## O que ainda é simulado

Assinar um plano hoje grava direto no banco (sem cobrança real) — é o que a
tela de Planos chama de "MVP funcional primeiro". A tabela já está pronta pra
cobrança de verdade entrar depois sem mexer no resto do sistema (ver seção
"Fase 2" abaixo).

---

## 1. Criar o projeto no Supabase

1. Crie uma conta e um novo projeto em [supabase.com](https://supabase.com).
2. No painel do projeto, vá em **SQL Editor** → **New query**, cole o
   conteúdo de `supabase/migrations/0001_init.sql` e rode. Isso cria as
   tabelas, o RLS e o trigger que gera o `profiles` automaticamente a cada
   cadastro.
3. Em **Project Settings → API**, copie:
   - `Project URL` → vai virar `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → vira `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → vira `SUPABASE_SERVICE_ROLE_KEY` (fica só no
     servidor, **nunca** no navegador — é usada só na fase 2, pelo webhook)
4. Crie sua própria conta pelo `/cadastro` do site depois de publicar (ou
   localmente), e então volte ao SQL Editor e rode, trocando pelo seu e-mail:

   ```sql
   update public.profiles set role = 'admin' where email = 'voce@seuemail.com';
   ```

   Essa é a única conta que vai acessar `/admin/login`. Promova outras contas
   da mesma forma quando precisar dar acesso a mais gente da equipe.

## 2. Rodar localmente

```bash
npm install
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local
npm run dev
```

Abra `http://localhost:3000`. `/admin/login` é o acesso administrativo.

## 3. Publicar (Vercel + Supabase)

1. Suba este código para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com), importe o repositório.
3. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (os mesmos do `.env.local`). Ainda não
   precisa de `SUPABASE_SERVICE_ROLE_KEY` nem das variáveis da Asaas — só
   entram na fase 2.
4. Deploy. A Vercel te dá uma URL tipo `nexus-tips.vercel.app` — em
   **Settings → Domains** dá pra apontar seu domínio próprio (ex:
   `nexustips.com.br`) quando quiser.

Pronto: cadastro, login, assinatura (simulada) e suporte já ficam no ar, e
tudo que os usuários fizerem aparece em tempo real no seu `/admin`.

---

## Fase 2: cobrança automática via Asaas (ou Pagar.me)

Hoje "assinar" só grava uma linha em `subscriptions` direto do navegador do
usuário — não existe cobrança real. Pra ligar a cobrança de verdade:

1. **Criar conta na Asaas** e pegar a API key.
2. **Trocar o botão "Assinar" em `/dashboard/planos`**: em vez de inserir
   direto no Supabase, ele deve chamar uma API route sua (ex:
   `/api/assinar`) que usa a API da Asaas pra criar o cliente e a assinatura
   recorrente (Pix ou cartão), e só então grava em `subscriptions` com
   `provider: 'asaas'` e `provider_subscription_id` preenchido com o ID que a
   Asaas devolveu. A coluna já existe no schema pra isso.
3. **Ativar o webhook**: o arquivo `src/app/api/webhooks/asaas/route.ts` já
   está pronto como stub — ele valida um token e recebe o payload, mas o
   bloco que escreve no banco está comentado. Descomente, ajuste ao formato
   exato de payload da Asaas (evento `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`
   → `status: 'ativa'`, `PAYMENT_OVERDUE` → `status: 'atrasada'`,
   `SUBSCRIPTION_DELETED` → `status: 'cancelada'`), e configure a URL
   pública (`https://seudominio.com/api/webhooks/asaas`) no painel da Asaas.
4. **Variáveis de ambiente**: preencha `ASAAS_API_KEY` e
   `ASAAS_WEBHOOK_TOKEN` no `.env.local` (e na Vercel), e adicione
   `SUPABASE_SERVICE_ROLE_KEY` na Vercel (o webhook precisa dela pra
   escrever no banco sem sessão de usuário — sem ela o RLS bloqueia a
   escrita).

Como o admin já lê essa mesma tabela `subscriptions` em tempo real, nenhuma
tela do painel precisa mudar quando isso entrar — o webhook só passa a ser
mais uma fonte gravando na mesma tabela que hoje é gravada pelo próprio app.

---

## Estrutura

```
src/
  app/
    page.tsx                    → landing page
    cadastro/, login/           → auth pública
    dashboard/                  → área do usuário (protegida)
    admin/login/                → login do admin (público)
    admin/(protected)/          → painel admin (protegido, exige role=admin)
    api/webhooks/asaas/         → stub do webhook de cobrança (fase 2)
  components/                   → sidebars do dashboard e do admin
  lib/supabase/                 → clients Supabase (browser/server)
  lib/types.ts                  → tipos + preços dos planos
  middleware.ts                 → protege /dashboard e /admin
supabase/migrations/0001_init.sql → schema completo + RLS + realtime
```

## Verificado antes da entrega

- `npm install` — ok
- `npm run typecheck` — sem erros
- `npm run build` — build de produção completo, 14 rotas geradas
  (o único aviso do build é a otimização de fonte do Google Fonts, que só
  falha porque este ambiente de build não tem acesso à internet — não afeta
  o site rodando, nem o seu build na Vercel)

## Nota sobre dependências

O projeto está travado em Next.js 14.2.35 (a última correção da série 14.x).
O `npm audit` acusa vulnerabilidades que só têm correção migrando para o
Next.js 16, uma mudança maior — vale planejar essa migração depois que o
produto estiver validado no ar, não antes do lançamento.
