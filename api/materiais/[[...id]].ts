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
    const materiais = await sql`SELECT * FROM materiais ORDER BY nome`
    return res.status(200).json(materiais)
  }

  if (req.method === 'POST' && !id) {
    const { nome, preco_kg, estoque_g, capacidade_g } = req.body
    const [novo] = await sql`
      INSERT INTO materiais (nome, preco_kg, estoque_g, capacidade_g)
      VALUES (${nome}, ${preco_kg}, ${estoque_g}, ${capacidade_g ?? 1000})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const { nome, preco_kg, estoque_g, capacidade_g } = req.body
    const [atualizado] = await sql`
      UPDATE materiais SET
        nome = COALESCE(${nome}, nome), preco_kg = COALESCE(${preco_kg}, preco_kg),
        estoque_g = COALESCE(${estoque_g}, estoque_g), capacidade_g = COALESCE(${capacidade_g}, capacidade_g)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Material não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM materiais WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
