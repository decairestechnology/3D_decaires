import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL ?? '')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { nome, preco_kg, estoque_g, capacidade_g } = req.body
    const [atualizado] = await sql`
      UPDATE materiais SET
        nome = COALESCE(${nome}, nome),
        preco_kg = COALESCE(${preco_kg}, preco_kg),
        estoque_g = COALESCE(${estoque_g}, estoque_g),
        capacidade_g = COALESCE(${capacidade_g}, capacidade_g)
      WHERE id = ${id as string} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Material não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM materiais WHERE id = ${id as string}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
