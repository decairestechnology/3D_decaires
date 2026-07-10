import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../_db'

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
