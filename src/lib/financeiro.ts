// Tipos e funções compartilhadas pelo Financeiro (lançamentos, contas e investimentos).

export interface LancamentoApiRow {
  id: string; data: string; descricao: string
  tipo: 'receita' | 'despesa'; valor: string; categoria?: string
  forma_pagamento?: string | null
  status?: 'pago' | 'pendente' | null
  vencimento?: string | null
  parcela_num?: number | null; parcela_total?: number | null; grupo_parcela?: string | null
  pedido_id?: string | null
}

export interface Lancamento {
  id: string; data: string; descricao: string
  tipo: 'receita' | 'despesa'; valor: number; categoria: string
  formaPagamento: string
  status: 'pago' | 'pendente'
  vencimento: string
  parcelaNum: number | null; parcelaTotal: number | null; grupoParcela: string | null
}

export function normalizarLancamento(l: LancamentoApiRow): Lancamento {
  return {
    id: l.id,
    data: (l.data ?? '').slice(0, 10),
    descricao: l.descricao,
    tipo: l.tipo,
    valor: Number(l.valor),
    categoria: l.categoria ?? 'outros',
    formaPagamento: l.forma_pagamento ?? '',
    status: l.status === 'pendente' ? 'pendente' : 'pago',
    vencimento: (l.vencimento ?? l.data ?? '').slice(0, 10),
    parcelaNum: l.parcela_num ?? null,
    parcelaTotal: l.parcela_total ?? null,
    grupoParcela: l.grupo_parcela ?? null
  }
}

export interface CategoriaFinanceira {
  id: string; chave: string; nome: string
  tipo: 'receita' | 'despesa' | 'ambos'
  sistema: boolean; ordem: number; em_uso?: number
}

/** Usado só se a migração 026 ainda não foi rodada — o sistema continua funcionando. */
export const categoriasPadrao: CategoriaFinanceira[] = [
  { id: 'vendas', chave: 'vendas', nome: 'Vendas', tipo: 'receita', sistema: true, ordem: 1 },
  { id: 'materiais', chave: 'materiais', nome: 'Materiais', tipo: 'despesa', sistema: true, ordem: 10 },
  { id: 'energia', chave: 'energia', nome: 'Energia', tipo: 'despesa', sistema: false, ordem: 15 },
  { id: 'manutencao', chave: 'manutencao', nome: 'Manutenção', tipo: 'despesa', sistema: false, ordem: 16 },
  { id: 'outros', chave: 'outros', nome: 'Outros', tipo: 'ambos', sistema: true, ordem: 99 }
]

export const formasPagamento = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência', 'Boleto', 'Outro']

export interface InvestimentoApiRow {
  id: string; nome: string; banco: string | null; tipo: string; observacoes: string | null; ativo: boolean
  saldo: string; total_aplicado: string; total_resgatado: string; total_rendimento: string
  ultimo_movimento: string | null
  primeiro_movimento?: string | null
}

export interface MovimentoApiRow {
  id: string; investimento_id: string; investimento_nome: string
  tipo: 'aplicacao' | 'resgate' | 'rendimento'
  valor: string; data: string; afeta_caixa: boolean; descricao: string | null
}

export const tiposInvestimento: Record<string, string> = {
  cdb: 'CDB / RDB',
  tesouro: 'Tesouro Direto',
  poupanca: 'Poupança',
  caixinha: 'Caixinha / conta remunerada',
  fundo: 'Fundo de investimento',
  acoes: 'Ações / FII',
  outro: 'Outro'
}

/** Data de hoje no fuso do navegador (toISOString usaria UTC e viraria o dia às 21h). */
export function hojeLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Mesma regra do servidor: 31/01 + 1 mês = 28/02. */
export function somarMeses(dataIso: string, meses: number): string {
  const [a, m, d] = dataIso.slice(0, 10).split('-').map(Number)
  const alvo = new Date(a, m - 1 + meses, 1)
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  alvo.setDate(Math.min(d, ultimoDia))
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`
}

/** Dias de hoje até a data (negativo = já passou). */
export function diasAte(dataIso: string): number {
  const [a, m, d] = dataIso.slice(0, 10).split('-').map(Number)
  const alvo = new Date(a, m - 1, d)
  const h = new Date()
  const hoje = new Date(h.getFullYear(), h.getMonth(), h.getDate())
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
}

export function situacaoVencimento(dataIso: string): { texto: string; cor: 'red' | 'amber' | 'gray' | 'green' } {
  const dias = diasAte(dataIso)
  if (dias < 0) return { texto: dias === -1 ? 'Venceu ontem' : `Vencida há ${-dias} dias`, cor: 'red' }
  if (dias === 0) return { texto: 'Vence hoje', cor: 'amber' }
  if (dias <= 7) return { texto: dias === 1 ? 'Vence amanhã' : `Vence em ${dias} dias`, cor: 'amber' }
  return { texto: `Em ${dias} dias`, cor: 'gray' }
}

/** "1.234,56" ou "1234.56" → 1234.56 */
export function lerValor(texto: string): number {
  const limpo = String(texto ?? '').trim().replace(/\s|R\$/g, '')
  if (!limpo) return NaN
  const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  return Number(normal)
}

export function valorParaCampo(v: number): string {
  return Number.isFinite(v) ? v.toFixed(2).replace('.', ',') : ''
}

/** Mostra o motivo que a API devolveu, em vez de mensagem genérica. */
export function motivoErro(err: unknown): string {
  const bruto = err instanceof Error ? err.message : String(err)
  const m = bruto.match(/"error"\s*:\s*"([^"]+)"/)
  return (m ? m[1] : bruto).slice(0, 300)
}

/** Saldo de um investimento numa data (soma dos movimentos até ela). */
export function saldoAte(movs: MovimentoApiRow[], dataIso: string): number {
  return movs
    .filter(m => m.data.slice(0, 10) <= dataIso)
    .reduce((s, m) => s + (m.tipo === 'resgate' ? -Number(m.valor) : Number(m.valor)), 0)
}
