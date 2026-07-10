import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../_db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const lancamentos = await sql`SELECT * FROM lancamentos_financeiros ORDER BY data DESC`
    return res.status(200).json(lancamentos)
  }

  if (req.method === 'POST') {
    const { data, descricao, tipo, valor, pedido_id } = req.body
    const [novo] = await sql`
      INSERT INTO lancamentos_financeiros (data, descricao, tipo, valor, pedido_id)
      VALUES (${data}, ${descricao}, ${tipo}, ${valor}, ${pedido_id ?? null})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
