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
    const produtos = await sql`
      SELECT cp.*, m.nome as material_nome
      FROM catalogo_produtos cp
      LEFT JOIN materiais m ON m.id = cp.material_id
      ORDER BY cp.codigo
    `
    return res.status(200).json(produtos)
  }

  if (req.method === 'POST') {
    const { codigo, nome, material_id, peso_padrao_g, tempo_impressao_h, preco_padrao, descricao, imagem_url } = req.body
    try {
      const [novo] = await sql`
        INSERT INTO catalogo_produtos (codigo, nome, material_id, peso_padrao_g, tempo_impressao_h, preco_padrao, descricao, imagem_url)
        VALUES (${codigo}, ${nome}, ${material_id ?? null}, ${peso_padrao_g ?? null}, ${tempo_impressao_h ?? null}, ${preco_padrao ?? null}, ${descricao ?? null}, ${imagem_url ?? null})
        RETURNING *
      `
      return res.status(201).json(novo)
    } catch {
      return res.status(409).json({ error: 'Esse código já existe no catálogo' })
    }
  }

  if (req.method === 'PATCH' && id) {
    const { codigo, nome, material_id, peso_padrao_g, tempo_impressao_h, preco_padrao, descricao, ativo, imagem_url } = req.body
    const [atualizado] = await sql`
      UPDATE catalogo_produtos SET
        codigo = COALESCE(${codigo}, codigo), nome = COALESCE(${nome}, nome),
        material_id = COALESCE(${material_id}, material_id), peso_padrao_g = COALESCE(${peso_padrao_g}, peso_padrao_g),
        tempo_impressao_h = COALESCE(${tempo_impressao_h}, tempo_impressao_h),
        preco_padrao = COALESCE(${preco_padrao}, preco_padrao), descricao = COALESCE(${descricao}, descricao),
        ativo = COALESCE(${ativo}, ativo), imagem_url = COALESCE(${imagem_url}, imagem_url)
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
