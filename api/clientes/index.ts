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
    const clientes = await sql`
      SELECT c.id, c.nome, c.contato,
        COUNT(p.id)::int as pedidos,
        COALESCE(SUM(p.valor), 0) as total_gasto
      FROM clientes c
      LEFT JOIN pedidos p ON p.cliente_id = c.id
      GROUP BY c.id
      ORDER BY c.nome
    `
    return res.status(200).json(clientes)
  }

  if (req.method === 'POST') {
    const { nome, contato } = req.body
    const [novo] = await sql`
      INSERT INTO clientes (nome, contato)
      VALUES (${nome}, ${contato})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
