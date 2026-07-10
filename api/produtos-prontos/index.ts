import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error(
    '[api] DATABASE_URL não encontrada. Confere Vercel → Settings → Environment Variables ' +
    '(e lembra de fazer Redeploy depois de adicionar/mudar uma variável).'
  )
}

const sql = neon(process.env.DATABASE_URL ?? '')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const produtos = await sql`SELECT * FROM produtos_prontos ORDER BY criado_em DESC`
    return res.status(200).json(produtos)
  }

  if (req.method === 'POST') {
    const { nome, material, quantidade, custo_unitario, preco_venda } = req.body
    const [novo] = await sql`
      INSERT INTO produtos_prontos (nome, material, quantidade, custo_unitario, preco_venda)
      VALUES (${nome}, ${material}, ${quantidade}, ${custo_unitario}, ${preco_venda})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
