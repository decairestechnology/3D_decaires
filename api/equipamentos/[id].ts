import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL ?? '')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { nome, tipo, valor, aquisicao, status } = req.body
    const [atualizado] = await sql`
      UPDATE equipamentos SET
        nome = COALESCE(${nome}, nome),
        tipo = COALESCE(${tipo}, tipo),
        valor = COALESCE(${valor}, valor),
        aquisicao = COALESCE(${aquisicao}, aquisicao),
        status = COALESCE(${status}, status)
      WHERE id = ${id as string} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Equipamento não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM equipamentos WHERE id = ${id as string}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
