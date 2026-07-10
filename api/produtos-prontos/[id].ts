import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL ?? '')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { nome, material, quantidade, custo_unitario, preco_venda } = req.body
    const [atualizado] = await sql`
      UPDATE produtos_prontos SET
        nome = COALESCE(${nome}, nome),
        material = COALESCE(${material}, material),
        quantidade = COALESCE(${quantidade}, quantidade),
        custo_unitario = COALESCE(${custo_unitario}, custo_unitario),
        preco_venda = COALESCE(${preco_venda}, preco_venda)
      WHERE id = ${id as string} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Produto não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM produtos_prontos WHERE id = ${id as string}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
