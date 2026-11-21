import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error('[api] DATABASE_URL não encontrada. Confere Vercel → Settings → Environment Variables.')
}

const sql = neon(process.env.DATABASE_URL ?? '')

function param(req: VercelRequest, nome: string): string | undefined {
  const v = req.query[nome]
  return Array.isArray(v) ? v[0] : v
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

/** Soma meses numa data AAAA-MM-DD sem pular mês (31/01 + 1 mês = 28/02). */
function somarMeses(dataIso: string, meses: number): string {
  const [a, m, d] = dataIso.slice(0, 10).split('-').map(Number)
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1))
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
  alvo.setUTCDate(Math.min(d, ultimoDia))
  return alvo.toISOString().slice(0, 10)
}

function slug(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'categoria'
}

function numero(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

// Uma rota só, com ?recurso=, pra não passar do limite de 12 funções da Vercel (plano Hobby):
//   (padrão)      lançamentos de receita/despesa
//   investimentos  cadastro dos investimentos, já com saldo calculado
//   movimentos     aplicações, resgates e rendimentos
//   categorias     categorias financeiras cadastráveis
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const id = param(req, 'id')
  const recurso = param(req, 'recurso') ?? 'lancamentos'

  try {
    if (recurso === 'investimentos') return await investimentos(req, res, id)
    if (recurso === 'movimentos') return await movimentos(req, res, id)
    if (recurso === 'categorias') return await categorias(req, res, id)
    if (recurso === 'lancamentos') return await lancamentos(req, res, id)
    return res.status(400).json({ error: 'recurso inválido' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[lancamentos] erro:', err)
    const msg = err instanceof Error ? err.message : 'erro desconhecido'
    return res.status(500).json({ error: msg.slice(0, 300) })
  }
}

// ---------------------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------------------
async function lancamentos(req: VercelRequest, res: VercelResponse, id?: string) {
  if (req.method === 'GET') {
    // Por padrão só o que já foi pago/recebido — assim Dashboard e Relatórios
    // não contam conta que ainda nem venceu. O Financeiro pede ?todos=1.
    const todos = param(req, 'todos') === '1'
    const linhas = todos
      ? await sql`SELECT * FROM lancamentos_financeiros ORDER BY data DESC, criado_em DESC`
      : await sql`SELECT * FROM lancamentos_financeiros WHERE COALESCE(status, 'pago') = 'pago' ORDER BY data DESC, criado_em DESC`
    return res.status(200).json(linhas)
  }

  if (req.method === 'POST') {
    const b = req.body ?? {}
    const tipo = b.tipo === 'despesa' ? 'despesa' : 'receita'
    const valorTotal = numero(b.valor)
    if (!String(b.descricao ?? '').trim()) return res.status(400).json({ error: 'Informe a descrição.' })
    if (!(valorTotal > 0)) return res.status(400).json({ error: 'Informe um valor maior que zero.' })

    const status = b.status === 'pendente' ? 'pendente' : 'pago'
    const forma = b.forma_pagamento ? String(b.forma_pagamento) : null
    const categoria = b.categoria ?? 'outros'
    const dataBase = String(b.vencimento || b.data || hoje()).slice(0, 10)
    const parcelas = Math.max(1, Math.min(60, Math.floor(numero(b.parcelas) || 1)))

    if (parcelas === 1) {
      const [novo] = await sql`
        INSERT INTO lancamentos_financeiros
          (data, descricao, tipo, valor, pedido_id, categoria, custo_operacional_id, forma_pagamento, status, vencimento)
        VALUES (
          ${status === 'pendente' ? dataBase : String(b.data || hoje()).slice(0, 10)},
          ${b.descricao}, ${tipo}, ${valorTotal}, ${b.pedido_id ?? null}, ${categoria},
          ${b.custo_operacional_id ?? null}, ${forma}, ${status},
          ${status === 'pendente' ? dataBase : (b.vencimento ?? null)}
        )
        RETURNING *
      `
      return res.status(201).json(novo)
    }

    // Parcelado: divide o total e joga a diferença de centavos na última parcela.
    const valorParcela = Math.floor((valorTotal / parcelas) * 100) / 100
    const ultima = Math.round((valorTotal - valorParcela * (parcelas - 1)) * 100) / 100
    const primeiraPaga = !!b.primeira_paga
    const [{ grupo }] = await sql`SELECT gen_random_uuid() AS grupo`
    const criados = []
    for (let i = 0; i < parcelas; i++) {
      const venc = somarMeses(dataBase, i)
      const paga = i === 0 && primeiraPaga
      const [linha] = await sql`
        INSERT INTO lancamentos_financeiros
          (data, descricao, tipo, valor, categoria, forma_pagamento, status, vencimento, parcela_num, parcela_total, grupo_parcela)
        VALUES (
          ${venc}, ${`${b.descricao} (${i + 1}/${parcelas})`}, ${tipo},
          ${i === parcelas - 1 ? ultima : valorParcela}, ${categoria}, ${forma},
          ${paga ? 'pago' : 'pendente'}, ${venc}, ${i + 1}, ${parcelas}, ${grupo}
        )
        RETURNING *
      `
      criados.push(linha)
    }
    return res.status(201).json({ parcelas: criados.length, grupo, itens: criados })
  }

  if (req.method === 'PATCH' && id) {
    const b = req.body ?? {}
    const status = b.status === 'pendente' || b.status === 'pago' ? b.status : null
    const [atualizado] = await sql`
      UPDATE lancamentos_financeiros SET
        data = COALESCE(${b.data ?? null}, data),
        descricao = COALESCE(${b.descricao ?? null}, descricao),
        tipo = COALESCE(${b.tipo ?? null}, tipo),
        valor = COALESCE(${b.valor ?? null}, valor),
        categoria = COALESCE(${b.categoria ?? null}, categoria),
        forma_pagamento = CASE WHEN ${b.forma_pagamento !== undefined} THEN ${b.forma_pagamento || null} ELSE forma_pagamento END,
        status = COALESCE(${status}, status),
        vencimento = CASE WHEN ${b.vencimento !== undefined} THEN ${b.vencimento || null}::date ELSE vencimento END
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Lançamento não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE') {
    const grupo = param(req, 'grupo')
    if (grupo) {
      // Apaga só as parcelas que ainda não foram pagas — as pagas são histórico.
      const apagadas = await sql`
        DELETE FROM lancamentos_financeiros WHERE grupo_parcela = ${grupo} AND status = 'pendente' RETURNING id
      `
      return res.status(200).json({ apagadas: apagadas.length })
    }
    if (id) {
      await sql`DELETE FROM lancamentos_financeiros WHERE id = ${id}`
      return res.status(204).end()
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}

// ---------------------------------------------------------------------
// Investimentos
// ---------------------------------------------------------------------
async function saldoInvestimento(investimentoId: string): Promise<number> {
  const [r] = await sql`
    SELECT COALESCE(SUM(CASE WHEN tipo = 'resgate' THEN -valor ELSE valor END), 0) AS saldo
    FROM investimento_movimentos WHERE investimento_id = ${investimentoId}
  `
  return Number(r?.saldo ?? 0)
}

async function investimentos(req: VercelRequest, res: VercelResponse, id?: string) {
  if (req.method === 'GET') {
    const linhas = await sql`
      SELECT i.*,
        COALESCE(SUM(CASE WHEN m.tipo = 'resgate' THEN -m.valor ELSE m.valor END), 0) AS saldo,
        COALESCE(SUM(CASE WHEN m.tipo = 'aplicacao' THEN m.valor ELSE 0 END), 0) AS total_aplicado,
        COALESCE(SUM(CASE WHEN m.tipo = 'resgate' THEN m.valor ELSE 0 END), 0) AS total_resgatado,
        COALESCE(SUM(CASE WHEN m.tipo = 'rendimento' THEN m.valor ELSE 0 END), 0) AS total_rendimento,
        MAX(m.data) AS ultimo_movimento
      FROM investimentos i
      LEFT JOIN investimento_movimentos m ON m.investimento_id = i.id
      GROUP BY i.id
      ORDER BY i.ativo DESC, i.nome
    `
    return res.status(200).json(linhas)
  }

  if (req.method === 'POST') {
    const b = req.body ?? {}
    if (!String(b.nome ?? '').trim()) return res.status(400).json({ error: 'Informe o nome do investimento.' })
    const [novo] = await sql`
      INSERT INTO investimentos (nome, banco, tipo, observacoes)
      VALUES (${b.nome}, ${b.banco || null}, ${b.tipo || 'outro'}, ${b.observacoes || null})
      RETURNING *
    `
    // Dinheiro que já estava investido antes do sistema: entra sem mexer no caixa.
    const inicial = numero(b.saldo_inicial)
    if (inicial > 0) {
      await sql`
        INSERT INTO investimento_movimentos (investimento_id, tipo, valor, data, afeta_caixa, descricao)
        VALUES (${novo.id}, 'aplicacao', ${inicial}, ${String(b.data || hoje()).slice(0, 10)}, false, 'Saldo inicial')
      `
    }
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const b = req.body ?? {}
    const [atualizado] = await sql`
      UPDATE investimentos SET
        nome = COALESCE(${b.nome ?? null}, nome),
        banco = CASE WHEN ${b.banco !== undefined} THEN ${b.banco || null} ELSE banco END,
        tipo = COALESCE(${b.tipo ?? null}, tipo),
        observacoes = CASE WHEN ${b.observacoes !== undefined} THEN ${b.observacoes || null} ELSE observacoes END,
        ativo = COALESCE(${typeof b.ativo === 'boolean' ? b.ativo : null}, ativo)
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Investimento não encontrado' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM investimentos WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}

async function movimentos(req: VercelRequest, res: VercelResponse, id?: string) {
  if (req.method === 'GET') {
    const linhas = await sql`
      SELECT m.*, i.nome AS investimento_nome
      FROM investimento_movimentos m
      JOIN investimentos i ON i.id = m.investimento_id
      ORDER BY m.data DESC, m.criado_em DESC
    `
    return res.status(200).json(linhas)
  }

  if (req.method === 'POST') {
    const b = req.body ?? {}
    const invId = String(b.investimento_id ?? '')
    if (!invId) return res.status(400).json({ error: 'Escolha o investimento.' })
    const data = String(b.data || hoje()).slice(0, 10)
    const saldoAtual = await saldoInvestimento(invId)

    // "Atualizar saldo": você digita o que o banco mostra e o sistema
    // lança a diferença como rendimento (positivo ou negativo).
    if (b.tipo === 'atualizar_saldo') {
      const novoSaldo = numero(b.saldo_atual)
      if (!(novoSaldo >= 0)) return res.status(400).json({ error: 'Informe o saldo que aparece no banco.' })
      const diferenca = Math.round((novoSaldo - saldoAtual) * 100) / 100
      if (diferenca === 0) return res.status(400).json({ error: 'O saldo informado é igual ao que já está no sistema.' })
      const [novo] = await sql`
        INSERT INTO investimento_movimentos (investimento_id, tipo, valor, data, afeta_caixa, descricao)
        VALUES (${invId}, 'rendimento', ${diferenca}, ${data}, false, ${b.descricao || 'Atualização de saldo'})
        RETURNING *
      `
      return res.status(201).json(novo)
    }

    const tipo = String(b.tipo)
    if (!['aplicacao', 'resgate', 'rendimento'].includes(tipo)) return res.status(400).json({ error: 'Tipo de movimento inválido.' })
    const valor = numero(b.valor)
    if (tipo === 'rendimento' ? !Number.isFinite(valor) || valor === 0 : !(valor > 0)) {
      return res.status(400).json({ error: 'Informe o valor.' })
    }
    if (tipo === 'resgate' && valor > saldoAtual + 0.001) {
      return res.status(400).json({ error: `Não dá pra resgatar mais do que o saldo (R$ ${saldoAtual.toFixed(2).replace('.', ',')}).` })
    }
    const afetaCaixa = tipo === 'rendimento' ? false : b.afeta_caixa !== false
    const [novo] = await sql`
      INSERT INTO investimento_movimentos (investimento_id, tipo, valor, data, afeta_caixa, descricao)
      VALUES (${invId}, ${tipo}, ${valor}, ${data}, ${afetaCaixa}, ${b.descricao || null})
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM investimento_movimentos WHERE id = ${id}`
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método não permitido' })
}

// ---------------------------------------------------------------------
// Categorias financeiras
// ---------------------------------------------------------------------
async function categorias(req: VercelRequest, res: VercelResponse, id?: string) {
  if (req.method === 'GET') {
    const linhas = await sql`
      SELECT c.*, (SELECT COUNT(*)::int FROM lancamentos_financeiros l WHERE l.categoria = c.chave) AS em_uso
      FROM categorias_financeiras c ORDER BY c.ordem, c.nome
    `
    return res.status(200).json(linhas)
  }

  if (req.method === 'POST') {
    const b = req.body ?? {}
    const nome = String(b.nome ?? '').trim()
    if (!nome) return res.status(400).json({ error: 'Informe o nome da categoria.' })
    const tipo = ['receita', 'despesa', 'ambos'].includes(b.tipo) ? b.tipo : 'despesa'
    const [dupNome] = await sql`SELECT nome FROM categorias_financeiras WHERE lower(nome) = lower(${nome})`
    if (dupNome) return res.status(409).json({ error: `Já existe a categoria "${dupNome.nome}".` })
    let chave = slug(nome)
    const [dupChave] = await sql`SELECT 1 FROM categorias_financeiras WHERE chave = ${chave}`
    if (dupChave) chave = `${chave}_${Date.now().toString(36).slice(-4)}`
    const [novo] = await sql`
      INSERT INTO categorias_financeiras (chave, nome, tipo, ordem) VALUES (${chave}, ${nome}, ${tipo}, 50)
      RETURNING *
    `
    return res.status(201).json(novo)
  }

  if (req.method === 'PATCH' && id) {
    const b = req.body ?? {}
    const tipo = ['receita', 'despesa', 'ambos'].includes(b.tipo) ? b.tipo : null
    const [atualizado] = await sql`
      UPDATE categorias_financeiras SET
        nome = COALESCE(${b.nome ? String(b.nome).trim() : null}, nome),
        tipo = CASE WHEN sistema THEN tipo ELSE COALESCE(${tipo}, tipo) END
      WHERE id = ${id} RETURNING *
    `
    if (!atualizado) return res.status(404).json({ error: 'Categoria não encontrada' })
    return res.status(200).json(atualizado)
  }

  if (req.method === 'DELETE' && id) {
    const [cat] = await sql`SELECT chave, nome, sistema FROM categorias_financeiras WHERE id = ${id}`
    if (!cat) return res.status(404).json({ error: 'Categoria não encontrada' })
    if (cat.sistema) return res.status(409).json({ error: `"${cat.nome}" é usada pelas automações do sistema e não pode ser excluída.` })
    // Os lançamentos que usavam essa categoria passam pra "Outros" — nada se perde.
    const movidos = await sql`UPDATE lancamentos_financeiros SET categoria = 'outros' WHERE categoria = ${cat.chave} RETURNING id`
    await sql`DELETE FROM categorias_financeiras WHERE id = ${id}`
    return res.status(200).json({ movidos: movidos.length })
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
