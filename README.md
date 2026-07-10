# DeCaires 3D — Gestão

Sistema de gestão pra empresa própria de impressão 3D. React + Vite + TypeScript + Tailwind,
seguindo o guia de marca DeCaires. Backend em funções serverless na Vercel usando Neon (Postgres),
autenticação Firebase e armazenamento de arquivos no Supabase.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. Por padrão o front usa dados de exemplo em `src/data/mockData.ts`
— nenhuma configuração de banco é necessária só pra visualizar o sistema.

## Estrutura do projeto

```
src/
  components/
    layout/       Sidebar, Topbar (Scout), Layout
    ui/            Card, Badge, Button, Modal, Input, Money
  context/         Tema (claro/escuro) e visibilidade de valores
  pages/           Uma por tela (Dashboard, Agenda, Pedidos, Orçamento, Clientes,
                    Estoque, Financeiro, Relatórios, Maquinário, Configurações)
  data/            Dados de exemplo (troque pelas chamadas em src/lib/api.ts)
  lib/             firebase.ts, supabase.ts, api.ts
  types/           Tipos TypeScript compartilhados
api/               Funções serverless da Vercel (Neon)
db/schema.sql      Schema pra rodar no Neon
public/logo.png    Logo do sistema
```

## Login (Firebase)

O sistema agora exige login — sem usuário autenticado, redireciona pra `/login`.

1. No [Firebase Console](https://console.firebase.google.com) do seu projeto → Authentication → Sign-in method → ative **Email/senha**
2. Em Authentication → Users → **Add user**, cria seu usuário (o email/senha que você vai usar pra entrar no sistema)
3. Pronto — não precisa de tela de cadastro, é uso próprio

## Populando o banco com dados iniciais

Depois de rodar `db/schema.sql` no SQL Editor do Neon, rode também `db/seed.sql` — ele insere
os mesmos dados de exemplo que estavam no protótipo (clientes, materiais, pedidos etc.), assim
o sistema não abre vazio na primeira vez.

Enquanto uma tabela estiver vazia (ou a API falhar), cada tela cai automaticamente pros dados
de exemplo do `mockData.ts` e mostra um aviso discreto tipo "(dados de exemplo)" — o site nunca
quebra, só avisa que ainda não tá lendo do banco.

## Conectando o banco (Neon)

1. Crie um projeto em https://neon.tech
2. No SQL editor do Neon, rode o conteúdo de `db/schema.sql`
3. Copie a connection string e coloque em `DATABASE_URL` (veja `.env.example`)
4. As funções em `/api` (ex: `api/pedidos/index.ts`) já usam essa variável

## Conectando autenticação (Firebase)

1. Crie um projeto em https://console.firebase.google.com
2. Ative Authentication → método Email/senha (ou o que preferir)
3. Copie as credenciais do app web pras variáveis `VITE_FIREBASE_*` no `.env`
4. `src/lib/firebase.ts` já inicializa o app — falta só criar a tela de login
   quando quiser travar o acesso (hoje o sistema abre direto, já que é uso próprio)

## Conectando armazenamento (Supabase)

1. Crie um projeto em https://supabase.com
2. Crie um bucket (ex: `produtos`) pra fotos de peças
3. Copie URL e anon key pras variáveis `VITE_SUPABASE_*` no `.env`
4. `src/lib/supabase.ts` já inicializa o client

## Deploy na Vercel

1. Suba esse repositório no GitHub
2. Importe o repositório na Vercel (vercel.com/new)
3. Configure as variáveis de ambiente do `.env.example` em
   Project Settings → Environment Variables (incluindo `DATABASE_URL`)
4. Deploy — a Vercel detecta automaticamente o Vite e a pasta `/api`

## Trocando dados mock por dados reais

Cada página hoje importa de `src/data/mockData.ts`. Pra plugar o banco de verdade,
troque o import pela chamada correspondente usando `src/lib/api.ts`, por exemplo:

```tsx
// antes
import { pedidos } from '@/data/mockData'

// depois
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Pedido } from '@/types'

const [pedidos, setPedidos] = useState<Pedido[]>([])
useEffect(() => { api.get<Pedido[]>('/api/pedidos').then(setPedidos) }, [])
```

Repita esse padrão pra qualquer tela nova que você criar — as rotas de todas as entidades atuais
(clientes, pedidos, materiais, produtos-prontos, lançamentos, equipamentos, agenda) já existem em `/api`.
