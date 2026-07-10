import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../_db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const materiais = await sql`SELECT * FROM materiais ORDER BY nome`
    return res.status(200).json(materiais)
  }

  if (req.method === 'POST') {
    const { nome, preco_kg, estoque_g, capacidade_g } = req.body
    const [novo] = await sql`
      INSERT INTO materiais (nome, preco_kg, estoque_g, capacidade_g)
      VALUES (${nome}, ${preco_kg}, ${estoque_g}, ${capacidade_g ?? 1000})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
