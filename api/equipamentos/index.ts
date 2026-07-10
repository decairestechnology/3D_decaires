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

  if (req.method === 'PATCH' && id) {
    const { nome, tipo, valor, aquisicao, status } = req.body
    const [atualizado] = await sql`
      UPDATE equipamentos SET
        nome = COALESCE(${nome}, nome), tipo = COALESCE(${tipo}, tipo),
        valor = COALESCE(${valor}, valor), aquisicao = COALESCE(${aquisicao}, aquisicao),
        status = COALESCE(${status}, status)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Equipamento não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM equipamentos WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
