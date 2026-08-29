import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error('[api] DATABASE_URL não encontrada. Confere Vercel → Settings → Environment Variables.')
}

const sql = neon(process.env.DATABASE_URL ?? '')

function pegarParam(req: VercelRequest, nome: string): string | undefined {
  const v = req.query[nome]
  return Array.isArray(v) ? v[0] : v
}

// Rota combinada: ?tipo=extras (materiais extras) ou ?tipo=operacionais (custos fixos)
// Feito assim pra não estourar o limite de 12 funções serverless do plano Hobby da Vercel.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const id = pegarParam(req, 'id')
  const tipo = pegarParam(req, 'tipo') ?? 'extras'

  if (tipo !== 'extras' && tipo !== 'operacionais') {
    return res.status(400).json({ error: 'tipo inválido — use "extras" ou "operacionais"' })
  }

  try {
    if (tipo === 'extras') {
      if (req.method === 'GET') {
        const linhas = await sql`SELECT * FROM materiais_extras ORDER BY nome`
        return res.status(200).json(linhas)
      }
      if (req.method === 'POST') {
        const { nome, unidade, quantidade, quantidade_usada, custo_total, alerta_estoque_baixo, observacoes } = req.body
        const [novo] = await sql`
          INSERT INTO materiais_extras (nome, unidade, quantidade, quantidade_usada, custo_total, alerta_estoque_baixo, observacoes)
          VALUES (${nome}, ${unidade ?? 'un'}, ${quantidade ?? 0}, ${quantidade_usada ?? 0}, ${custo_total ?? 0}, ${alerta_estoque_baixo ?? 0}, ${observacoes ?? null})
          RETURNING *
        `
        return res.status(201).json(novo)
      }
      if (req.method === 'PATCH' && id) {
        const { nome, unidade, quantidade, quantidade_usada, custo_total, alerta_estoque_baixo, observacoes } = req.body
        const [atualizado] = await sql`
          UPDATE materiais_extras SET
            nome = COALESCE(${nome}, nome), unidade = COALESCE(${unidade}, unidade),
            quantidade = COALESCE(${quantidade}, quantidade),
            quantidade_usada = COALESCE(${quantidade_usada}, quantidade_usada),
            custo_total = COALESCE(${custo_total}, custo_total),
            alerta_estoque_baixo = COALESCE(${alerta_estoque_baixo}, alerta_estoque_baixo),
            observacoes = COALESCE(${observacoes}, observacoes)
          WHERE id = ${id} RETURNING *
        `
        if (!atualizado) return res.status(404).json({ error: 'Material extra não encontrado' })
        return res.status(200).json(atualizado)
      }
      if (req.method === 'DELETE' && id) {
        await sql`DELETE FROM materiais_extras WHERE id = ${id}`
        return res.status(204).end()
      }
    }

    if (tipo === 'operacionais') {
      if (req.method === 'GET') {
        const linhas = await sql`SELECT * FROM custos_operacionais ORDER BY descricao`
        return res.status(200).json(linhas)
      }
      if (req.method === 'POST') {
        const { descricao, categoria, valor, frequencia, observacoes } = req.body
        const [novo] = await sql`
          INSERT INTO custos_operacionais (descricao, categoria, valor, frequencia, observacoes)
          VALUES (${descricao}, ${categoria ?? 'outros'}, ${valor ?? 0}, ${frequencia ?? 'mensal'}, ${observacoes ?? null})
          RETURNING *
        `
        return res.status(201).json(novo)
      }
      if (req.method === 'PATCH' && id) {
        const { descricao, categoria, valor, frequencia, observacoes } = req.body
        const [atualizado] = await sql`
          UPDATE custos_operacionais SET
            descricao = COALESCE(${descricao}, descricao), categoria = COALESCE(${categoria}, categoria),
            valor = COALESCE(${valor}, valor), frequencia = COALESCE(${frequencia}, frequencia),
            observacoes = COALESCE(${observacoes}, observacoes)
          WHERE id = ${id} RETURNING *
        `
        if (!atualizado) return res.status(404).json({ error: 'Custo operacional não encontrado' })
        return res.status(200).json(atualizado)
      }
      if (req.method === 'DELETE' && id) {
        await sql`DELETE FROM custos_operacionais WHERE id = ${id}`
        return res.status(204).end()
      }
    }

    return res.status(405).json({ error: 'Método não permitido' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[custos] erro:', err)
    const msg = err instanceof Error ? err.message : 'erro desconhecido'
    return res.status(500).json({ error: msg })
  }
}
