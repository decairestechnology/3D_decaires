// Preferências pessoais — não são dados do negócio, então ficam salvas no
// navegador (localStorage), não no banco.
export interface Preferencias {
  margemPadrao: string
  /** Tarifa da sua conta de luz, em R$ por kWh (não por hora!) */
  tarifaKwh: string
  /** Potência média da impressora em watts, usada quando nenhuma impressora é escolhida */
  potenciaPadraoW: string
  /** Quanto vale sua hora de trabalho (acabamento, montagem, embalagem) */
  custoMaoObraHora: string
  /** % do custo de produção reservado pra manutenção da impressora */
  percentualManutencao: string
  /** @deprecated Campo antigo (R$/hora). Mantido só pra migrar quem já tinha valor salvo. */
  custoEnergiaPadrao?: string
}

const CHAVE = 'decaires-preferencias'

const padrao: Preferencias = {
  margemPadrao: '60',
  tarifaKwh: '0,90',
  potenciaPadraoW: '120',
  custoMaoObraHora: '0',
  percentualManutencao: '0'
}

export function carregarPreferencias(): Preferencias {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (!salvo) return padrao
    const prefs: Preferencias = { ...padrao, ...JSON.parse(salvo) }
    // Quem já usava o sistema tinha "custo por hora" salvo. Não dá pra converter
    // isso em tarifa sem saber a potência, então mantemos o padrão e a pessoa
    // ajusta uma vez em Configurações.
    return prefs
  } catch {
    return padrao
  }
}

export function salvarPreferencias(prefs: Preferencias) {
  localStorage.setItem(CHAVE, JSON.stringify(prefs))
}

/** Custo de energia de uma impressão: potência × tempo ÷ 1000 × tarifa. */
export function calcularCustoEnergia(potenciaW: number, horas: number, tarifaKwh: number): number {
  return (potenciaW / 1000) * horas * tarifaKwh
}
