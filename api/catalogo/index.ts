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
    const produtos = await sql`SELECT * FROM catalogo_produtos ORDER BY criado_em DESC`
    return res.status(200).json(produtos)
  }

  if (req.method === 'POST') {
    const { nome, descricao, imagem_url, preco, material } = req.body
    const [novo] = await sql`
      INSERT INTO catalogo_produtos (nome, descricao, imagem_url, preco, material)
      VALUES (${nome}, ${descricao ?? null}, ${imagem_url ?? null}, ${preco ?? 0}, ${material ?? null})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const { nome, descricao, imagem_url, preco, material, ativo } = req.body
    const [atualizado] = await sql`
      UPDATE catalogo_produtos SET
        nome = COALESCE(${nome}, nome), descricao = COALESCE(${descricao}, descricao),
        imagem_url = COALESCE(${imagem_url}, imagem_url), preco = COALESCE(${preco}, preco),
        material = COALESCE(${material}, material), ativo = COALESCE(${ativo}, ativo)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Produto não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM catalogo_produtos WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
