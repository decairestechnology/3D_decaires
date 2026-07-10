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
    const orcamentos = await sql`
      SELECT o.id, o.cliente_id, c.nome as cliente_nome, o.itens, o.margem,
        o.custo_energia_hora, o.valor_total, o.convertido, o.criado_em
      FROM orcamentos_salvos o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      ORDER BY o.criado_em DESC
    `
    return res.status(200).json(orcamentos)
  }

  if (req.method === 'POST') {
    const { cliente_id, itens, margem, custo_energia_hora, valor_total } = req.body
    const [novo] = await sql`
      INSERT INTO orcamentos_salvos (cliente_id, itens, margem, custo_energia_hora, valor_total)
      VALUES (${cliente_id ?? null}, ${JSON.stringify(itens)}, ${margem}, ${custo_energia_hora}, ${valor_total})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const { convertido, cliente_id } = req.body
    const [atualizado] = await sql`
      UPDATE orcamentos_salvos SET
        convertido = COALESCE(${convertido}, convertido),
        cliente_id = COALESCE(${cliente_id}, cliente_id)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Orçamento não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM orcamentos_salvos WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
