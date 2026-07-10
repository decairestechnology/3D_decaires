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

Repita esse padrão criando as rotas que faltam em `/api` (clientes já tem, pedidos já tem —
falta materiais, produtos_prontos, lancamentos_financeiros, equipamentos, agenda_eventos,
seguindo o mesmo modelo dos dois arquivos existentes).
