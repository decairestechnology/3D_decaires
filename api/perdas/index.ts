import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../_db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const perdas = await sql`
      SELECT pe.id, pe.peso_perdido_g, pe.motivo, pe.custo, pe.data, m.nome as material_nome
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
    return res.status(201).json(nova)
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
