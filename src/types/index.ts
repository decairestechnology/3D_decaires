export type StatusPedido = 'orcamento' | 'producao' | 'pronto' | 'entregue'

export interface Cliente {
  id: string
  nome: string
  contato: string
  pedidos: number
  totalGasto: number
}

export interface Material {
  id: string
  nome: string
  precoKg: number
  estoqueG: number
  capacidadeG: number
}

export interface Pedido {
  id: string
  clienteNome: string
  peca: string
  material: string
  valor: number
  prazo: string | null
  status: StatusPedido
}

export interface ProdutoPronto {
  id: string
  nome: string
  material: string
  quantidade: number
  custoUnitario: number
  precoVenda: number
}

export interface Lancamento {
  id: string
  data: string
  descricao: string
  tipo: 'receita' | 'despesa'
  valor: number
}

export interface Equipamento {
  id: string
  nome: string
  tipo: 'impressora' | 'ferramenta'
  valor: number
  aquisicao: string
  status: string
}

export interface EventoAgenda {
  id: string
  data: string
  titulo: string
  descricao: string
  tipo: 'entrega' | 'manutencao'
}
