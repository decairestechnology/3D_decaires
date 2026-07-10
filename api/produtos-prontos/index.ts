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
    const produtos = await sql`SELECT * FROM produtos_prontos ORDER BY criado_em DESC`
    return res.status(200).json(produtos)
  }

  if (req.method === 'POST') {
    const { nome, material, quantidade, custo_unitario, preco_venda } = req.body
    const [novo] = await sql`
      INSERT INTO produtos_prontos (nome, material, quantidade, custo_unitario, preco_venda)
      VALUES (${nome}, ${material}, ${quantidade}, ${custo_unitario}, ${preco_venda})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const { nome, material, quantidade, custo_unitario, preco_venda } = req.body
    const [atualizado] = await sql`
      UPDATE produtos_prontos SET
        nome = COALESCE(${nome}, nome), material = COALESCE(${material}, material),
        quantidade = COALESCE(${quantidade}, quantidade), custo_unitario = COALESCE(${custo_unitario}, custo_unitario),
        preco_venda = COALESCE(${preco_venda}, preco_venda)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Produto não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM produtos_prontos WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
