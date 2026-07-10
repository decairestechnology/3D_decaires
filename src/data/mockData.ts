import { Cliente, Material, Pedido, ProdutoPronto, Lancamento, Equipamento, EventoAgenda } from '@/types'

// Isso só aparece se a conexão com o banco falhar de verdade (não mais quando o banco
// está vazio — isso agora mostra uma tela vazia real). Fica vazio de propósito.

export const clientes: Cliente[] = []
export const materiais: Material[] = []
export const pedidos: Pedido[] = []
export const produtosProntos: ProdutoPronto[] = []
export const lancamentos: Lancamento[] = []
export const equipamentos: Equipamento[] = []
export const eventosAgenda: EventoAgenda[] = []
