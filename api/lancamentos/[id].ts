import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL ?? '')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { data, descricao, tipo, valor, categoria } = req.body
    const [atualizado] = await sql`
      UPDATE lancamentos_financeiros SET
        data = COALESCE(${data}, data),
        descricao = COALESCE(${descricao}, descricao),
        tipo = COALESCE(${tipo}, tipo),
        valor = COALESCE(${valor}, valor),
        categoria = COALESCE(${categoria}, categoria)
      WHERE id = ${id as string} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Lançamento não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM lancamentos_financeiros WHERE id = ${id as string}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
