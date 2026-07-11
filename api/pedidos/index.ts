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
    const pedidos = await sql`
      SELECT p.id, p.numero, p.cliente_id, c.nome as cliente_nome, p.peca, p.material, p.valor, p.prazo, p.status,
        p.material_id, m.nome as material_nome, p.peso_filamento_g, p.link_arquivo, p.observacoes
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      LEFT JOIN materiais m ON m.id = p.material_id
      ORDER BY p.criado_em DESC
    `
    return res.status(200).json(pedidos)
  }

  if (req.method === 'POST') {
    const { cliente_id, peca, material, valor, prazo, status, material_id, peso_filamento_g, link_arquivo, observacoes } = req.body
    const [novo] = await sql`
      INSERT INTO pedidos (cliente_id, peca, material, valor, prazo, status, material_id, peso_filamento_g, link_arquivo, observacoes)
      VALUES (${cliente_id}, ${peca}, ${material}, ${valor}, ${prazo}, ${status}, ${material_id ?? null}, ${peso_filamento_g ?? null}, ${link_arquivo ?? null}, ${observacoes ?? null})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const { status, valor, prazo, peca, material, cliente_id, material_id, peso_filamento_g, link_arquivo, observacoes } = req.body

    const [antes] = await sql`SELECT status, material_debitado, material_id, peso_filamento_g FROM pedidos WHERE id = ${id}`

    const [atualizado] = await sql`
      UPDATE pedidos SET
        status = COALESCE(${status}, status), valor = COALESCE(${valor}, valor),
        prazo = COALESCE(${prazo}, prazo), peca = COALESCE(${peca}, peca),
        material = COALESCE(${material}, material), cliente_id = COALESCE(${cliente_id}, cliente_id),
        material_id = COALESCE(${material_id}, material_id),
        peso_filamento_g = COALESCE(${peso_filamento_g}, peso_filamento_g),
        link_arquivo = COALESCE(${link_arquivo}, link_arquivo),
        observacoes = COALESCE(${observacoes}, observacoes)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Pedido não encontrado' })

    // Estorno: se o pedido volta pra "orçamento" e o material já tinha sido debitado, devolve pro estoque
    if (status === 'orcamento' && antes?.material_debitado && antes.material_id && antes.peso_filamento_g) {
      await sql`
        UPDATE materiais SET estoque_g = estoque_g + ${antes.peso_filamento_g}
        WHERE id = ${antes.material_id}
      `
      await sql`UPDATE pedidos SET material_debitado = false WHERE id = ${id}`
    }

    // Automação 1: quando o pedido entra em produção, abate o material do estoque (só uma vez)
    if (status === 'producao' && !atualizado.material_debitado && atualizado.material_id && atualizado.peso_filamento_g) {
      await sql`
        UPDATE materiais SET estoque_g = estoque_g - ${atualizado.peso_filamento_g}
        WHERE id = ${atualizado.material_id}
      `
      await sql`UPDATE pedidos SET material_debitado = true WHERE id = ${id}`
    }

    // Automação 2: quando o pedido do cliente "DeCaires 3D" é entregue, vira produto pronto em estoque
    if (status === 'entregue' && !atualizado.produto_gerado) {
      const [cliente] = await sql`SELECT nome FROM clientes WHERE id = ${atualizado.cliente_id}`
      if (cliente && cliente.nome.toLowerCase().trim() === 'decaires 3d') {
        let custoUnitario = 0
        if (atualizado.material_id && atualizado.peso_filamento_g) {
          const [mat] = await sql`SELECT preco_kg FROM materiais WHERE id = ${atualizado.material_id}`
          if (mat) custoUnitario = (Number(atualizado.peso_filamento_g) / 1000) * Number(mat.preco_kg)
        }
        await sql`
          INSERT INTO produtos_prontos (nome, material, quantidade, custo_unitario, preco_venda, pedido_origem_id)
          VALUES (${atualizado.peca}, ${atualizado.material ?? null}, 1, ${custoUnitario}, ${atualizado.valor}, ${id})
        `
        await sql`UPDATE pedidos SET produto_gerado = true WHERE id = ${id}`
      }
    }

    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM pedidos WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
