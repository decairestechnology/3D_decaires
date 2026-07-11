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

function pegarId(req: VercelRequest): string | undefined {
  const id = req.query.id
  return Array.isArray(id) ? id[0] : id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const id = pegarId(req)

  if (req.method === 'GET') {
    const perdas = await sql`
      SELECT pe.id, pe.peso_perdido_g, pe.motivo, pe.custo, pe.data, pe.material_id, m.nome as material_nome
      FROM perdas_material pe
      LEFT JOIN materiais m ON m.id = pe.material_id
      ORDER BY pe.data DESC
    `
    return res.status(200).json(perdas)
  }

  if (req.method === 'POST') {
    const { material_id, peso_perdido_g, motivo, custo, data } = req.body
    const [nova] = await sql`
      INSERT INTO perdas_material (material_id, peso_perdido_g, motivo, custo, data)
      VALUES (${material_id}, ${peso_perdido_g}, ${motivo}, ${custo}, ${data ?? new Date().toISOString().slice(0, 10)})
      RETURNING *
    `
    if (material_id && peso_perdido_g) {
      await sql`UPDATE materiais SET estoque_g = estoque_g - ${peso_perdido_g} WHERE id = ${material_id}`
    }
    return res.status(201).json(nova)
  }

  if (req.method === 'PATCH' && id) {
    const { material_id, peso_perdido_g, motivo, custo, data } = req.body
    const [antes] = await sql`SELECT material_id, peso_perdido_g FROM perdas_material WHERE id = ${id}`

    const [atualizada] = await sql`
      UPDATE perdas_material SET
        material_id = COALESCE(${material_id}, material_id),
        peso_perdido_g = COALESCE(${peso_perdido_g}, peso_perdido_g),
        motivo = COALESCE(${motivo}, motivo), custo = COALESCE(${custo}, custo),
        data = COALESCE(${data}, data)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizada) return res.status(404).json({ error: 'Perda não encontrada' })

    // Ajusta o estoque pela diferença: devolve o peso antigo e debita o peso novo
    if (antes?.material_id && antes.peso_perdido_g) {
      await sql`UPDATE materiais SET estoque_g = estoque_g + ${antes.peso_perdido_g} WHERE id = ${antes.material_id}`
    }
    if (atualizada.material_id && atualizada.peso_perdido_g) {
      await sql`UPDATE materiais SET estoque_g = estoque_g - ${atualizada.peso_perdido_g} WHERE id = ${atualizada.material_id}`
    }

    return res.status(200).json(atualizada)
  }

  if (req.method === 'DELETE' && id) {
    const [perda] = await sql`SELECT material_id, peso_perdido_g FROM perdas_material WHERE id = ${id}`
    await sql`DELETE FROM perdas_material WHERE id = ${id}`
    if (perda?.material_id && perda.peso_perdido_g) {
      await sql`UPDATE materiais SET estoque_g = estoque_g + ${perda.peso_perdido_g} WHERE id = ${perda.material_id}`
    }
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
