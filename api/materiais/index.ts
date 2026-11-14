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
    const materiais = await sql`SELECT * FROM materiais ORDER BY nome`
    return res.status(200).json(materiais)
  }

  if (req.method === 'POST') {
    const { nome, preco_kg, estoque_g, capacidade_g, alerta_estoque_g, marca, codigo } = req.body
    const cod = typeof codigo === 'string' && codigo.trim() ? codigo.trim().toUpperCase() : null
    if (cod) {
      const [dup] = await sql`SELECT nome FROM materiais WHERE codigo = ${cod}`
      if (dup) return res.status(409).json({ error: `O código ${cod} já está em uso no material "${dup.nome}".` })
    }
    const [novo] = await sql`
      INSERT INTO materiais (nome, preco_kg, estoque_g, capacidade_g, alerta_estoque_g, marca, codigo)
      VALUES (${nome}, ${preco_kg}, ${estoque_g}, ${capacidade_g ?? 1000}, ${alerta_estoque_g ?? null}, ${marca ?? null}, ${cod})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const { nome, preco_kg, estoque_g, capacidade_g, alerta_estoque_g, marca, codigo } = req.body
    const cod = typeof codigo === 'string' && codigo.trim() ? codigo.trim().toUpperCase() : null
    if (cod) {
      const [dup] = await sql`SELECT nome FROM materiais WHERE codigo = ${cod} AND id <> ${id}`
      if (dup) return res.status(409).json({ error: `O código ${cod} já está em uso no material "${dup.nome}".` })
    }
    const [atualizado] = await sql`
      UPDATE materiais SET
        nome = COALESCE(${nome}, nome), preco_kg = COALESCE(${preco_kg}, preco_kg),
        estoque_g = COALESCE(${estoque_g}, estoque_g), capacidade_g = COALESCE(${capacidade_g}, capacidade_g),
        alerta_estoque_g = COALESCE(${alerta_estoque_g}, alerta_estoque_g), marca = COALESCE(${marca}, marca),
        codigo = COALESCE(${cod}, codigo)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Material não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    try {
      await sql`DELETE FROM materiais WHERE id = ${id}`
      return res.status(204).end()
    } catch (err: any) {
      const msg = String(err?.message ?? err)
      if (msg.includes('foreign key')) {
        return res.status(409).json({ error: 'Esse material está sendo usado em pedidos, perdas ou catálogo. Roda a migração 024 no Neon pra liberar a exclusão.' })
      }
      return res.status(500).json({ error: msg.slice(0, 300) })
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
