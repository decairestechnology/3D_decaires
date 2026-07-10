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
    const eventos = await sql`SELECT * FROM agenda_eventos ORDER BY data`
    return res.status(200).json(eventos)
  }

  if (req.method === 'POST') {
    const { data, titulo, descricao, tipo, pedido_id, equipamento_id } = req.body
    const [novo] = await sql`
      INSERT INTO agenda_eventos (data, titulo, descricao, tipo, pedido_id, equipamento_id)
      VALUES (${data}, ${titulo}, ${descricao}, ${tipo}, ${pedido_id ?? null}, ${equipamento_id ?? null})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
