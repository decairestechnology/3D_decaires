import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error('[api] DATABASE_URL não encontrada. Confere Vercel → Settings → Environment Variables.')
}

const sql = neon(process.env.DATABASE_URL ?? '')

function pegarId(req: VercelRequest): string | undefined {
  const id = req.query.id
  return Array.isArray(id) ? id[0] : id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = pegarId(req)

  if (req.method === 'GET' && !id) {
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

  if (req.method === 'POST' && !id) {
    const { nome, contato } = req.body
    const [novo] = await sql`
      INSERT INTO clientes (nome, contato) VALUES (${nome}, ${contato}) RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const { nome, contato } = req.body
    const [atualizado] = await sql`
      UPDATE clientes SET nome = COALESCE(${nome}, nome), contato = COALESCE(${contato}, contato)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Cliente não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM clientes WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
