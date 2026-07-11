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
    const eventos = await sql`SELECT * FROM agenda_eventos ORDER BY data, horario NULLS LAST`
    return res.status(200).json(eventos)
  }

  if (req.method === 'POST') {
    const { data, titulo, descricao, tipo, pedido_id, equipamento_id, horario } = req.body
    const [novo] = await sql`
      INSERT INTO agenda_eventos (data, titulo, descricao, tipo, pedido_id, equipamento_id, horario)
      VALUES (${data}, ${titulo}, ${descricao}, ${tipo}, ${pedido_id ?? null}, ${equipamento_id ?? null}, ${horario || null})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const { data, titulo, descricao, tipo, horario } = req.body
    const [atualizado] = await sql`
      UPDATE agenda_eventos SET
        data = COALESCE(${data}, data), titulo = COALESCE(${titulo}, titulo),
        descricao = COALESCE(${descricao}, descricao), tipo = COALESCE(${tipo}, tipo),
        horario = COALESCE(${horario}, horario)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Compromisso não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM agenda_eventos WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
