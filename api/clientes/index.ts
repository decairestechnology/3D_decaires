import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../_db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const clientes = await sql`SELECT * FROM clientes ORDER BY nome`
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
