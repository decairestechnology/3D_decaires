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

  if (req.method === 'GET') {
    const pedidos = await sql`
      SELECT p.id, p.cliente_id, c.nome as cliente_nome, p.peca, p.material, p.valor, p.prazo, p.status
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      ORDER BY p.criado_em DESC
    `
    return res.status(200).json(pedidos)
  }

  if (req.method === 'POST') {
    const { cliente_id, peca, material, valor, prazo, status } = req.body
    const [novo] = await sql`
      INSERT INTO pedidos (cliente_id, peca, material, valor, prazo, status)
      VALUES (${cliente_id}, ${peca}, ${material}, ${valor}, ${prazo}, ${status})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const { status, valor, prazo, peca, material, cliente_id } = req.body
    const [atualizado] = await sql`
      UPDATE pedidos SET
        status = COALESCE(${status}, status), valor = COALESCE(${valor}, valor),
        prazo = COALESCE(${prazo}, prazo), peca = COALESCE(${peca}, peca),
        material = COALESCE(${material}, material), cliente_id = COALESCE(${cliente_id}, cliente_id)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Pedido não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM pedidos WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
