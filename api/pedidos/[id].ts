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
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { status, valor, prazo, peca, material } = req.body
    const [atualizado] = await sql`
      UPDATE pedidos SET
        status = COALESCE(${status}, status),
        valor = COALESCE(${valor}, valor),
        prazo = COALESCE(${prazo}, prazo),
        peca = COALESCE(${peca}, peca),
        material = COALESCE(${material}, material)
      WHERE id = ${id as string}
      RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Pedido não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM pedidos WHERE id = ${id as string}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
