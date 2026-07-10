import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error(
    '[api] DATABASE_URL não encontrada. Confere Vercel → Settings → Environment Variables ' +
    '(e lembra de fazer Redeploy depois de adicionar/mudar uma variável).'
  )
}

const sql = neon(process.env.DATABASE_URL ?? '')

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  return res.status(405).json({ error: 'Método não permitido' })
}
