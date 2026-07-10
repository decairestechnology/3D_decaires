import { Cliente, Material, Pedido, ProdutoPronto, Lancamento, Equipamento, EventoAgenda } from '@/types'

// Dados de exemplo — troque pelas chamadas reais à API (Neon) quando o backend estiver plugado.

export const clientes: Cliente[] = [
  { id: '1', nome: 'Marcos Silva', contato: '(16) 99123-4567', pedidos: 4, totalGasto: 380 },
  { id: '2', nome: 'Ateliê Flora', contato: '(16) 98877-2211', pedidos: 2, totalGasto: 290 },
  { id: '3', nome: 'João Petri', contato: '(16) 99654-1122', pedidos: 6, totalGasto: 610 },
  { id: '4', nome: 'Carla Nunes', contato: '(16) 99321-8890', pedidos: 3, totalGasto: 540 }
]

export const materiais: Material[] = [
  { id: '1', nome: 'PLA Branco', precoKg: 79.9, estoqueG: 180, capacidadeG: 1000 },
  { id: '2', nome: 'PETG Preto', precoKg: 94.9, estoqueG: 120, capacidadeG: 1000 },
  { id: '3', nome: 'PLA Vermelho', precoKg: 79.9, estoqueG: 820, capacidadeG: 1000 },
  { id: '4', nome: 'ABS Cinza', precoKg: 84.9, estoqueG: 450, capacidadeG: 1000 }
]

export const pedidos: Pedido[] = [
  { id: '1', clienteNome: 'Marcos Silva', peca: 'Suporte celular (x3)', material: 'PETG', valor: 90, prazo: '2026-07-12', status: 'producao' },
  { id: '2', clienteNome: 'Ateliê Flora', peca: 'Vaso decorativo', material: 'PLA', valor: 145, prazo: '2026-07-18', status: 'orcamento' },
  { id: '3', clienteNome: 'João Petri', peca: 'Peça reposição drone', material: 'PLA', valor: 60, prazo: '2026-07-10', status: 'pronto' },
  { id: '4', clienteNome: 'Carla Nunes', peca: 'Miniatura personalizada', material: 'PLA', valor: 210, prazo: '2026-07-05', status: 'entregue' },
  { id: '5', clienteNome: 'Rafael Costa', peca: 'Case Raspberry Pi', material: 'ABS', valor: 55, prazo: '2026-07-08', status: 'orcamento' }
]

export const produtosProntos: ProdutoPronto[] = [
  { id: '1', nome: 'Suporte de celular', material: 'PETG Preto', quantidade: 6, custoUnitario: 8.5, precoVenda: 22 },
  { id: '2', nome: 'Vaso decorativo P', material: 'PLA Vermelho', quantidade: 3, custoUnitario: 14.2, precoVenda: 39.9 },
  { id: '3', nome: 'Case Raspberry Pi', material: 'ABS Cinza', quantidade: 4, custoUnitario: 9.8, precoVenda: 28 },
  { id: '4', nome: 'Miniatura personalizada', material: 'PLA Vermelho', quantidade: 1, custoUnitario: 11, precoVenda: 45 }
]

export const lancamentos: Lancamento[] = [
  { id: '1', data: '2026-07-08', descricao: 'Venda — Marcos Silva', tipo: 'receita', valor: 90 },
  { id: '2', data: '2026-07-07', descricao: 'Compra filamento PETG', tipo: 'despesa', valor: 189.8 },
  { id: '3', data: '2026-07-05', descricao: 'Venda — Carla Nunes', tipo: 'receita', valor: 210 },
  { id: '4', data: '2026-07-02', descricao: 'Energia elétrica (rateio)', tipo: 'despesa', valor: 65 }
]

export const equipamentos: Equipamento[] = [
  { id: '1', nome: 'Bambu Lab A1', tipo: 'impressora', valor: 2899, aquisicao: '2026-03-12', status: 'Funcionando' },
  { id: '2', nome: 'Ender 3 V2', tipo: 'impressora', valor: 1150, aquisicao: '2025-11-05', status: 'Manutenção pendente' },
  { id: '3', nome: 'Espátula removedora', tipo: 'ferramenta', valor: 25, aquisicao: '2026-03-01', status: 'OK' },
  { id: '4', nome: 'Kit chaves allen', tipo: 'ferramenta', valor: 45, aquisicao: '2026-03-01', status: 'OK' },
  { id: '5', nome: 'Paquímetro digital', tipo: 'ferramenta', valor: 89, aquisicao: '2026-04-01', status: 'OK' },
  { id: '6', nome: 'Alicate de corte', tipo: 'ferramenta', valor: 32, aquisicao: '2026-03-01', status: 'Desgastado' }
]

export const eventosAgenda: EventoAgenda[] = [
  { id: '1', data: '2026-07-08', titulo: 'Entrega — Rafael Costa', descricao: 'Case Raspberry Pi', tipo: 'entrega' },
  { id: '2', data: '2026-07-10', titulo: 'Entrega — João Petri', descricao: 'Peça reposição drone', tipo: 'entrega' },
  { id: '3', data: '2026-07-12', titulo: 'Entrega — Marcos Silva', descricao: 'Suporte celular (x3)', tipo: 'entrega' },
  { id: '4', data: '2026-07-18', titulo: 'Entrega — Ateliê Flora', descricao: 'Vaso decorativo', tipo: 'entrega' },
  { id: '5', data: '2026-07-20', titulo: 'Manutenção — Bambu Lab A1', descricao: 'Limpeza de bicos', tipo: 'manutencao' }
]
