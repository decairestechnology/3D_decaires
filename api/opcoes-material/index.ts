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
    const opcoes = await sql`SELECT * FROM opcoes_material ORDER BY categoria, nome`
    return res.status(200).json(opcoes)
  }

  if (req.method === 'POST') {
    const { categoria, nome } = req.body
    if (categoria !== 'tipo' && categoria !== 'cor') return res.status(400).json({ error: 'Categoria inválida' })
    try {
      const [novo] = await sql`INSERT INTO opcoes_material (categoria, nome) VALUES (${categoria}, ${nome}) RETURNING *`
      return res.status(201).json(novo)
    } catch {
      return res.status(409).json({ error: 'Essa opção já existe' })
    }
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM opcoes_material WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
