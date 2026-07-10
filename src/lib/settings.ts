// Preferências pessoais (margem padrão, custo de energia padrão) — não são dados
// do negócio, então ficam salvas no navegador (localStorage), não no banco.
export interface Preferencias {
  margemPadrao: string
  custoEnergiaPadrao: string
}

const CHAVE = 'decaires-preferencias'

const padrao: Preferencias = {
  margemPadrao: '60',
  custoEnergiaPadrao: '0,45'
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
