import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../_db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const pedidos = await sql`
      SELECT p.id, c.nome as cliente_nome, p.peca, p.material, p.valor, p.prazo, p.status
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      ORDER BY p.criado_em DESC
    `
    return res.status(200).json(pedidos)
  }

  if (req.method === 'POST') {
    const { cliente_id, peca, material, valor, prazo, status } = req.body
    const [novo] = await sql`
      INSERT INTO pedidos (cliente_id, peca, material, valor, prazo, status)
      VALUES (${cliente_id}, ${peca}, ${material}, ${valor}, ${prazo}, ${status})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
