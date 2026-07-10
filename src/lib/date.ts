// O Postgres às vezes devolve colunas DATE como timestamp ISO completo
// (ex: "2026-07-12T00:00:00.000Z") em vez de só "2026-07-12". Essas funções
// sempre cortam pros 10 primeiros caracteres antes de formatar, então funcionam
// nos dois casos.
export function soData(valor: string): string {
  return valor.slice(0, 10)
}

export function formatarDataBR(valor: string): string {
  return soData(valor).split('-').reverse().join('/')
}

export function formatarDataCurta(valor: string): string {
  // "12/07" — dia e mês, sem ano
  const partes = soData(valor).split('-')
  return `${partes[2]}/${partes[1]}`
}

export function diaDoMes(valor: string): number {
  return Number(soData(valor).split('-')[2])
}

export function mesAno(valor: string): string {
  return soData(valor).slice(0, 7)
}
