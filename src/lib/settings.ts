// Preferências pessoais (margem padrão, custo de energia, mão de obra, manutenção)
// — não são dados do negócio, então ficam salvas no navegador (localStorage), não no banco.
export interface Preferencias {
  margemPadrao: string
  custoEnergiaPadrao: string
  /** Quanto vale sua hora de trabalho (acabamento, montagem, embalagem) */
  custoMaoObraHora: string
  /** % do custo de produção reservado pra manutenção da impressora */
  percentualManutencao: string
}

const CHAVE = 'decaires-preferencias'

const padrao: Preferencias = {
  margemPadrao: '60',
  custoEnergiaPadrao: '0,45',
  custoMaoObraHora: '0',
  percentualManutencao: '0'
}

export function carregarPreferencias(): Preferencias {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (!salvo) return padrao
    return { ...padrao, ...JSON.parse(salvo) }
  } catch {
    return padrao
  }
}

export function salvarPreferencias(prefs: Preferencias) {
  localStorage.setItem(CHAVE, JSON.stringify(prefs))
}
