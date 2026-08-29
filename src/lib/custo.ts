import { carregarPreferencias } from './settings'

export interface MaterialCalc { id: string; precoKg: number }
export interface ExtraCalc { id: string; custoUnitario: number }

export interface LinhaMaterialCusto { materialId: string; peso: string }
export interface LinhaExtraCusto { extraId: string; quantidade: string }

export interface ResultadoCusto {
  custoFilamento: number
  custoExtras: number
  custoEnergia: number
  custoMaoObra: number
  custoManutencao: number
  custoTotal: number
  precoUnitario: number
  lucroUnitario: number
}

function num(v: string): number {
  return parseFloat(String(v).replace(',', '.')) || 0
}

/**
 * Calcula o custo real de produção de uma peça, somando tudo:
 * filamento + materiais extras + energia + mão de obra + reserva de manutenção.
 * A margem de lucro é aplicada por cima do custo total.
 */
export function calcularCusto(params: {
  materiaisLinhas: LinhaMaterialCusto[]
  extrasLinhas?: LinhaExtraCusto[]
  horasImpressao: string
  materiais: MaterialCalc[]
  extras?: ExtraCalc[]
  margem: string
  custoEnergiaHora: string
  /** Horas de trabalho manual (acabamento, montagem). Se vazio, usa 0. */
  horasMaoObra?: string
}): ResultadoCusto {
  const prefs = carregarPreferencias()

  const custoFilamento = params.materiaisLinhas.reduce((s, l) => {
    const precoKg = params.materiais.find(m => m.id === l.materialId)?.precoKg ?? 0
    return s + (num(l.peso) / 1000) * precoKg
  }, 0)

  const custoExtras = (params.extrasLinhas ?? []).reduce((s, l) => {
    const custoUn = (params.extras ?? []).find(e => e.id === l.extraId)?.custoUnitario ?? 0
    return s + num(l.quantidade) * custoUn
  }, 0)

  const custoEnergia = num(params.horasImpressao) * num(params.custoEnergiaHora)
  const custoMaoObra = num(params.horasMaoObra ?? '0') * num(prefs.custoMaoObraHora)

  const subtotal = custoFilamento + custoExtras + custoEnergia + custoMaoObra
  const custoManutencao = subtotal * (num(prefs.percentualManutencao) / 100)
  const custoTotal = subtotal + custoManutencao

  const precoUnitario = custoTotal * (1 + num(params.margem) / 100)

  return {
    custoFilamento,
    custoExtras,
    custoEnergia,
    custoMaoObra,
    custoManutencao,
    custoTotal,
    precoUnitario,
    lucroUnitario: precoUnitario - custoTotal
  }
}

/** Custo unitário de um material extra (custo total pago ÷ quantidade comprada) */
export function custoUnitarioExtra(custoTotal: number, quantidade: number): number {
  return quantidade > 0 ? custoTotal / quantidade : 0
}
