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
  res.setHeader('Cache-Control', 'no-store')
  const id = pegarId(req)

  if (req.method === 'GET') {
    const lancamentos = await sql`SELECT * FROM lancamentos_financeiros ORDER BY data DESC`
    return res.status(200).json(lancamentos)
  }

  if (req.method === 'POST') {
    const { data, descricao, tipo, valor, pedido_id, categoria, custo_operacional_id } = req.body
    const [novo] = await sql`
      INSERT INTO lancamentos_financeiros (data, descricao, tipo, valor, pedido_id, categoria, custo_operacional_id)
      VALUES (${data}, ${descricao}, ${tipo}, ${valor}, ${pedido_id ?? null}, ${categoria ?? 'outros'}, ${custo_operacional_id ?? null})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const { data, descricao, tipo, valor, categoria } = req.body
    const [atualizado] = await sql`
      UPDATE lancamentos_financeiros SET
        data = COALESCE(${data}, data), descricao = COALESCE(${descricao}, descricao),
        tipo = COALESCE(${tipo}, tipo), valor = COALESCE(${valor}, valor),
        categoria = COALESCE(${categoria}, categoria)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Lançamento não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM lancamentos_financeiros WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
