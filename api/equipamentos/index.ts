import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../_db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const equipamentos = await sql`SELECT * FROM equipamentos ORDER BY tipo, nome`
    return res.status(200).json(equipamentos)
  }

  if (req.method === 'POST') {
    const { nome, tipo, valor, aquisicao, status } = req.body
    const [novo] = await sql`
      INSERT INTO equipamentos (nome, tipo, valor, aquisicao, status)
      VALUES (${nome}, ${tipo}, ${valor}, ${aquisicao}, ${status ?? 'OK'})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
