import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from './_db'

// Assistente Scout — usa a API da Anthropic (Claude) com um retrato rápido dos
// dados do negócio, pra responder perguntas reais sobre o sistema.
// Precisa da variável ANTHROPIC_API_KEY configurada na Vercel (console.anthropic.com).

async function buscarContexto() {
  try {
    const [pedidosAtivos] = await sql`
      SELECT COUNT(*)::int as total FROM pedidos WHERE status != 'entregue'
    `
    const [financeiro] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) as receita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as despesa
      FROM lancamentos_financeiros
    `
    const materiaisBaixos = await sql`
      SELECT nome, estoque_g, capacidade_g FROM materiais WHERE estoque_g::float / capacidade_g <= 0.2
    `
    const prazos = await sql`
      SELECT c.nome as cliente, p.peca, p.prazo, p.status
      FROM pedidos p JOIN clientes c ON c.id = p.cliente_id
      WHERE p.status != 'entregue' AND p.prazo IS NOT NULL
      ORDER BY p.prazo ASC LIMIT 5
    `
    const equipamentosPendentes = await sql`
      SELECT nome, status FROM equipamentos WHERE status ILIKE '%pendente%' OR status ILIKE '%desgast%'
    `

    return {
      pedidos_ativos: pedidosAtivos?.total ?? 0,
      receita_total: Number(financeiro?.receita ?? 0),
      despesa_total: Number(financeiro?.despesa ?? 0),
      lucro: Number(financeiro?.receita ?? 0) - Number(financeiro?.despesa ?? 0),
      materiais_com_estoque_baixo: materiaisBaixos,
      proximos_prazos: prazos,
      equipamentos_com_pendencia: equipamentosPendentes
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[scout] falha ao buscar contexto do banco:', err)
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { question } = req.body as { question?: string }
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Pergunta vazia' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      reply: 'A Scout ainda não tá com a chave da IA configurada (ANTHROPIC_API_KEY na Vercel). Assim que configurar, eu já respondo de verdade.'
    })
  }

  const contexto = await buscarContexto()

  const systemPrompt = `Você é a Scout, assistente virtual do sistema de gestão DeCaires 3D — uma pequena empresa
de impressão 3D administrada por uma única pessoa. Responda de forma direta, curta (2-4 frases), em português do Brasil,
tom próximo e prático, como alguém que realmente entende do negócio. Baseie a resposta apenas nos dados fornecidos abaixo.
Se não tiver dado suficiente pra responder algo com precisão, diga isso claramente em vez de inventar números.
Nunca invente valores que não estão no contexto.

Dados atuais do negócio (JSON):
${contexto ? JSON.stringify(contexto, null, 2) : 'Não foi possível carregar os dados do banco agora — avise o usuário disso.'}`

  try {
    const resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }]
      })
    })

    if (!resposta.ok) {
      const erroTexto = await resposta.text()
      // eslint-disable-next-line no-console
      console.error('[scout] erro da API Anthropic:', resposta.status, erroTexto)
      return res.status(200).json({ reply: 'A Scout deu uma travada tentando pensar agora. Tenta de novo em instantes.' })
    }

    const dados = await resposta.json()
    const texto = dados.content?.find((c: { type: string }) => c.type === 'text')?.text ?? 'Não consegui pensar numa resposta agora.'
    return res.status(200).json({ reply: texto })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[scout] falha ao chamar a Anthropic:', err)
    return res.status(200).json({ reply: 'A Scout ficou sem conexão agora. Tenta de novo daqui a pouco.' })
  }
}
