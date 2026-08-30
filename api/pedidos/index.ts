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
interface ItemPedido {
  id: string
  origem: 'catalogo' | 'estoque' | 'manual'
  nome: string
  quantidade: number
  valor_unitario: number
  catalogo_produto_id?: string | null
  produto_pronto_id?: string | null
  materiais?: MaterialUsado[]
  link_arquivo?: string | null
  observacoes?: string | null
}

interface PedidoDB {
  itens?: ItemPedido[] | null
  materiais_usados?: MaterialUsado[] | null
  material_id?: string | null
  peso_filamento_g?: string | number | null
  peca?: string
  valor?: string | number
}

/**
 * Devolve os itens do pedido. Pedidos antigos (de antes do multi-item) não têm
 * a lista, então montamos um item único a partir dos campos antigos.
 */
function itensDoPedido(p: PedidoDB): ItemPedido[] {
  if (p.itens && p.itens.length > 0) return p.itens
  const materiais = p.materiais_usados && p.materiais_usados.length > 0
    ? p.materiais_usados
    : (p.material_id && p.peso_filamento_g ? [{ material_id: p.material_id, peso_g: Number(p.peso_filamento_g) }] : [])
  return [{
    id: 'legado',
    origem: 'manual',
    nome: p.peca ?? 'Item',
    quantidade: 1,
    valor_unitario: Number(p.valor ?? 0),
    materiais
  }]
}

/** Soma o filamento de todos os itens que precisam ser produzidos (não vêm do estoque pronto). */
function filamentoAProduzir(itens: ItemPedido[]): MaterialUsado[] {
  const totais: Record<string, number> = {}
  for (const item of itens) {
    if (item.origem === 'estoque') continue
    for (const m of item.materiais ?? []) {
      totais[m.material_id] = (totais[m.material_id] ?? 0) + Number(m.peso_g) * Number(item.quantidade || 1)
    }
  }
  return Object.entries(totais).map(([material_id, peso_g]) => ({ material_id, peso_g }))
}

function valorTotal(itens: ItemPedido[]): number {
  return itens.reduce((s, i) => s + Number(i.valor_unitario) * Number(i.quantidade || 1), 0)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const id = pegarId(req)

  if (req.method === 'GET') {
    const pedidos = await sql`
      SELECT p.id, p.numero, p.cliente_id, c.nome as cliente_nome, p.peca, p.material, p.valor, p.prazo, p.status,
        p.material_id, m.nome as material_nome, p.peso_filamento_g, p.link_arquivo, p.observacoes,
        p.catalogo_produto_id, p.materiais_usados, p.itens,
        p.status_pagamento, p.forma_pagamento, p.valor_pago, p.data_pagamento
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      LEFT JOIN materiais m ON m.id = p.material_id
      ORDER BY p.criado_em DESC
    `
    return res.status(200).json(pedidos)
  }

  if (req.method === 'POST') {
    const {
      cliente_id, peca, material, valor, prazo, status, material_id, peso_filamento_g,
      link_arquivo, observacoes, catalogo_produto_id, materiais_usados, itens,
      status_pagamento, forma_pagamento, valor_pago, data_pagamento
    } = req.body

    const listaItens: ItemPedido[] = itens ?? []
    // Mantém os campos antigos preenchidos com o primeiro item, pra telas que ainda os leem
    const primeiro = listaItens[0]
    const primeiroMaterial = primeiro?.materiais?.[0]
    const total = listaItens.length > 0 ? valorTotal(listaItens) : Number(valor ?? 0)
    const resumoPeca = listaItens.length > 0
      ? listaItens.map(i => (i.quantidade > 1 ? `${i.nome} (x${i.quantidade})` : i.nome)).join(', ')
      : peca

    const [novo] = await sql`
      INSERT INTO pedidos (
        cliente_id, peca, material, valor, prazo, status, material_id, peso_filamento_g,
        link_arquivo, observacoes, catalogo_produto_id, materiais_usados, itens,
        status_pagamento, forma_pagamento, valor_pago, data_pagamento
      )
      VALUES (
        ${cliente_id}, ${resumoPeca}, ${material ?? null}, ${total}, ${prazo}, ${status},
        ${primeiroMaterial?.material_id ?? material_id ?? null},
        ${primeiroMaterial?.peso_g ?? peso_filamento_g ?? null},
        ${primeiro?.link_arquivo ?? link_arquivo ?? null}, ${observacoes ?? null},
        ${primeiro?.catalogo_produto_id ?? catalogo_produto_id ?? null},
        ${JSON.stringify(materiais_usados ?? primeiro?.materiais ?? [])},
        ${JSON.stringify(listaItens)},
        ${status_pagamento ?? 'pendente'}, ${forma_pagamento ?? null},
        ${valor_pago ?? 0}, ${data_pagamento ?? null}
      )
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const {
      status, valor, prazo, peca, material, cliente_id, material_id, peso_filamento_g,
      link_arquivo, observacoes, catalogo_produto_id, materiais_usados, itens,
      status_pagamento, forma_pagamento, valor_pago, data_pagamento
    } = req.body

    const [antes] = await sql`
      SELECT status, material_debitado, material_id, peso_filamento_g, materiais_usados, itens,
        peca, valor, estoque_pronto_baixado
      FROM pedidos WHERE id = ${id}
    `

    const listaItens: ItemPedido[] | null = itens ?? null
    const primeiro = listaItens?.[0]
    const primeiroMaterial = primeiro?.materiais?.[0]
    const totalCalculado = listaItens ? valorTotal(listaItens) : null
    const resumoPeca = listaItens
      ? listaItens.map(i => (i.quantidade > 1 ? `${i.nome} (x${i.quantidade})` : i.nome)).join(', ')
      : null

    const [atualizado] = await sql`
      UPDATE pedidos SET
        status = COALESCE(${status}, status),
        valor = COALESCE(${totalCalculado ?? valor}, valor),
        prazo = COALESCE(${prazo}, prazo),
        peca = COALESCE(${resumoPeca ?? peca}, peca),
        material = COALESCE(${material}, material),
        cliente_id = COALESCE(${cliente_id}, cliente_id),
        material_id = COALESCE(${primeiroMaterial?.material_id ?? material_id}, material_id),
        peso_filamento_g = COALESCE(${primeiroMaterial?.peso_g ?? peso_filamento_g}, peso_filamento_g),
        link_arquivo = COALESCE(${primeiro?.link_arquivo ?? link_arquivo}, link_arquivo),
        observacoes = COALESCE(${observacoes}, observacoes),
        catalogo_produto_id = COALESCE(${primeiro?.catalogo_produto_id ?? catalogo_produto_id}, catalogo_produto_id),
        materiais_usados = COALESCE(${materiais_usados ? JSON.stringify(materiais_usados) : null}, materiais_usados),
        itens = COALESCE(${listaItens ? JSON.stringify(listaItens) : null}, itens),
        status_pagamento = COALESCE(${status_pagamento}, status_pagamento),
        forma_pagamento = COALESCE(${forma_pagamento}, forma_pagamento),
        valor_pago = COALESCE(${valor_pago}, valor_pago),
        data_pagamento = COALESCE(${data_pagamento}, data_pagamento)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Pedido não encontrado' })

    // ---- Estorno: pedido volta pra orçamento, devolve o filamento pro estoque
    if (status === 'orcamento' && antes?.material_debitado) {
      for (const m of filamentoAProduzir(itensDoPedido(antes))) {
        await sql`UPDATE materiais SET estoque_g = estoque_g + ${m.peso_g} WHERE id = ${m.material_id}`
      }
      await sql`UPDATE pedidos SET material_debitado = false WHERE id = ${id}`
    }

    // ---- Em produção: abate o filamento de tudo que precisa ser impresso
    if (status === 'producao' && !atualizado.material_debitado) {
      const aDebitar = filamentoAProduzir(itensDoPedido(atualizado))
      if (aDebitar.length > 0) {
        for (const m of aDebitar) {
          await sql`UPDATE materiais SET estoque_g = estoque_g - ${m.peso_g} WHERE id = ${m.material_id}`
        }
        await sql`UPDATE pedidos SET material_debitado = true WHERE id = ${id}`
      }
    }

    if (status === 'entregue') {
      const listaEntrega = itensDoPedido(atualizado)

      // ---- Baixa do estoque de produtos prontos (itens de pronta entrega)
      if (!atualizado.estoque_pronto_baixado) {
        const doEstoque = listaEntrega.filter(i => i.origem === 'estoque' && i.produto_pronto_id)
        for (const item of doEstoque) {
          await sql`
            UPDATE produtos_prontos SET quantidade = GREATEST(quantidade - ${item.quantidade}, 0)
            WHERE id = ${item.produto_pronto_id}
          `
        }
        if (doEstoque.length > 0) {
          await sql`UPDATE pedidos SET estoque_pronto_baixado = true WHERE id = ${id}`
        }
      }

      // ---- Produção pro estoque próprio: cliente "DeCaires 3D" vira produto pronto
      if (!atualizado.produto_gerado) {
        const [cliente] = await sql`SELECT nome FROM clientes WHERE id = ${atualizado.cliente_id}`
        if (cliente && cliente.nome.toLowerCase().trim() === 'decaires 3d') {
          for (const item of listaEntrega) {
            if (item.origem === 'estoque') continue
            let custoUnitario = 0
            for (const m of item.materiais ?? []) {
              const [mat] = await sql`SELECT preco_kg FROM materiais WHERE id = ${m.material_id}`
              if (mat) custoUnitario += (Number(m.peso_g) / 1000) * Number(mat.preco_kg)
            }
            await sql`
              INSERT INTO produtos_prontos (nome, material, quantidade, custo_unitario, preco_venda, pedido_origem_id, catalogo_produto_id)
              VALUES (${item.nome}, ${atualizado.material ?? null}, ${item.quantidade}, ${custoUnitario}, ${item.valor_unitario}, ${id}, ${item.catalogo_produto_id ?? null})
            `
          }
          await sql`UPDATE pedidos SET produto_gerado = true WHERE id = ${id}`
        }
      }

      // ---- Receita automática no Financeiro (só uma vez, e só se não for produção interna)
      if (!atualizado.receita_lancada) {
        const [cliente] = await sql`SELECT nome FROM clientes WHERE id = ${atualizado.cliente_id}`
        const producaoInterna = cliente && cliente.nome.toLowerCase().trim() === 'decaires 3d'
        if (!producaoInterna && Number(atualizado.valor) > 0) {
          await sql`
            INSERT INTO lancamentos_financeiros (data, descricao, tipo, valor, categoria, pedido_id)
            VALUES (
              ${new Date().toISOString().slice(0, 10)},
              ${`Venda — ${cliente?.nome ?? 'cliente'} (pedido #${atualizado.numero})`},
              'receita', ${atualizado.valor}, 'vendas', ${id}
            )
          `
          await sql`UPDATE pedidos SET receita_lancada = true WHERE id = ${id}`
        }
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
