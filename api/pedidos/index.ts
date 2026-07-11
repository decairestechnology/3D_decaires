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

interface MaterialUsado { material_id: string; peso_g: number }

// Pra pedidos antigos (de antes do multi-material), cai pro material único como lista de 1 item.
function listaMateriais(materiaisUsados: MaterialUsado[] | null, materialIdLegado: string | null, pesoLegado: string | number | null): MaterialUsado[] {
  if (materiaisUsados && materiaisUsados.length > 0) return materiaisUsados
  if (materialIdLegado && pesoLegado) return [{ material_id: materialIdLegado, peso_g: Number(pesoLegado) }]
  return []
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const id = pegarId(req)

  if (req.method === 'GET') {
    const pedidos = await sql`
      SELECT p.id, p.numero, p.cliente_id, c.nome as cliente_nome, p.peca, p.material, p.valor, p.prazo, p.status,
        p.material_id, m.nome as material_nome, p.peso_filamento_g, p.link_arquivo, p.observacoes,
        p.catalogo_produto_id, p.materiais_usados
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      LEFT JOIN materiais m ON m.id = p.material_id
      ORDER BY p.criado_em DESC
    `
    return res.status(200).json(pedidos)
  }

  if (req.method === 'POST') {
    const { cliente_id, peca, material, valor, prazo, status, material_id, peso_filamento_g, link_arquivo, observacoes, catalogo_produto_id, materiais_usados } = req.body
    const [novo] = await sql`
      INSERT INTO pedidos (cliente_id, peca, material, valor, prazo, status, material_id, peso_filamento_g, link_arquivo, observacoes, catalogo_produto_id, materiais_usados)
      VALUES (${cliente_id}, ${peca}, ${material}, ${valor}, ${prazo}, ${status}, ${material_id ?? null}, ${peso_filamento_g ?? null}, ${link_arquivo ?? null}, ${observacoes ?? null}, ${catalogo_produto_id ?? null}, ${JSON.stringify(materiais_usados ?? [])})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const { status, valor, prazo, peca, material, cliente_id, material_id, peso_filamento_g, link_arquivo, observacoes, catalogo_produto_id, materiais_usados } = req.body

    const [antes] = await sql`SELECT status, material_debitado, material_id, peso_filamento_g, materiais_usados FROM pedidos WHERE id = ${id}`

    const [atualizado] = await sql`
      UPDATE pedidos SET
        status = COALESCE(${status}, status), valor = COALESCE(${valor}, valor),
        prazo = COALESCE(${prazo}, prazo), peca = COALESCE(${peca}, peca),
        material = COALESCE(${material}, material), cliente_id = COALESCE(${cliente_id}, cliente_id),
        material_id = COALESCE(${material_id}, material_id),
        peso_filamento_g = COALESCE(${peso_filamento_g}, peso_filamento_g),
        link_arquivo = COALESCE(${link_arquivo}, link_arquivo),
        observacoes = COALESCE(${observacoes}, observacoes),
        catalogo_produto_id = COALESCE(${catalogo_produto_id}, catalogo_produto_id),
        materiais_usados = COALESCE(${materiais_usados ? JSON.stringify(materiais_usados) : null}, materiais_usados)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Pedido não encontrado' })

    // Estorno: se o pedido volta pra "orçamento" e o material já tinha sido debitado, devolve pro estoque
    if (status === 'orcamento' && antes?.material_debitado) {
      const lista = listaMateriais(antes.materiais_usados, antes.material_id, antes.peso_filamento_g)
      for (const item of lista) {
        await sql`UPDATE materiais SET estoque_g = estoque_g + ${item.peso_g} WHERE id = ${item.material_id}`
      }
      await sql`UPDATE pedidos SET material_debitado = false WHERE id = ${id}`
    }

    // Automação: quando o pedido entra em produção, abate cada material da lista do estoque (só uma vez)
    if (status === 'producao' && !atualizado.material_debitado) {
      const lista = listaMateriais(atualizado.materiais_usados, atualizado.material_id, atualizado.peso_filamento_g)
      if (lista.length > 0) {
        for (const item of lista) {
          await sql`UPDATE materiais SET estoque_g = estoque_g - ${item.peso_g} WHERE id = ${item.material_id}`
        }
        await sql`UPDATE pedidos SET material_debitado = true WHERE id = ${id}`
      }
    }

    // Produto pronto pra cliente "DeCaires 3D" quando entregue
    if (status === 'entregue' && !atualizado.produto_gerado) {
      const [cliente] = await sql`SELECT nome FROM clientes WHERE id = ${atualizado.cliente_id}`
      if (cliente && cliente.nome.toLowerCase().trim() === 'decaires 3d') {
        const lista = listaMateriais(atualizado.materiais_usados, atualizado.material_id, atualizado.peso_filamento_g)
        let custoUnitario = 0
        for (const item of lista) {
          const [mat] = await sql`SELECT preco_kg FROM materiais WHERE id = ${item.material_id}`
          if (mat) custoUnitario += (Number(item.peso_g) / 1000) * Number(mat.preco_kg)
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
