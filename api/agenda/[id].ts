import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL ?? '')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { data, titulo, descricao, tipo } = req.body
    const [atualizado] = await sql`
      UPDATE agenda_eventos SET
        data = COALESCE(${data}, data),
        titulo = COALESCE(${titulo}, titulo),
        descricao = COALESCE(${descricao}, descricao),
        tipo = COALESCE(${tipo}, tipo)
      WHERE id = ${id as string} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Compromisso não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM agenda_eventos WHERE id = ${id as string}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
