import { useMemo, useState } from 'react'
import { Send, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label, Input, Select } from '@/components/ui/Input'
import { formatMoney } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { materiais as materiaisMock } from '@/data/mockData'
import { carregarPreferencias } from '@/lib/settings'

interface MaterialApiRow { id: string; nome: string; preco_kg: string }

interface ItemOrcamento {
  id: string
  nome: string
  peso: string
  materialIdx: number
  horas: string
  quantidade: string
}

function novoItem(): ItemOrcamento {
  return { id: crypto.randomUUID(), nome: '', peso: '80', materialIdx: 0, horas: '6', quantidade: '1' }
}

export function Orcamento() {
  const { data, loading, error } = useApi<MaterialApiRow[]>('/api/materiais', [])
  const usandoMock = !loading && !!error
  const vazio = !loading && !error && data.length === 0
  const materiais = usandoMock
    ? materiaisMock.map(m => ({ id: m.id, nome: m.nome, precoKg: m.precoKg }))
    : data.map(m => ({ id: m.id, nome: m.nome, precoKg: Number(m.preco_kg) }))

  const prefs = carregarPreferencias()

  const [clienteNome, setClienteNome] = useState('')
  const [custoEnergiaHora, setCustoEnergiaHora] = useState(prefs.custoEnergiaPadrao)
  const [margem, setMargem] = useState(prefs.margemPadrao)
  const [itens, setItens] = useState<ItemOrcamento[]>([novoItem()])

  function atualizarItem(id: string, campo: keyof ItemOrcamento, valor: string | number) {
    setItens(lista => lista.map(it => (it.id === id ? { ...it, [campo]: valor } : it)))
  }
  function removerItem(id: string) {
    setItens(lista => (lista.length > 1 ? lista.filter(it => it.id !== id) : lista))
  }

  const calculo = useMemo(() => {
    const margemNum = (parseFloat(margem.replace(',', '.')) || 0) / 100
    const custoEnergiaHoraNum = parseFloat(custoEnergiaHora.replace(',', '.')) || 0

    const linhas = itens.map(it => {
      const pesoG = parseFloat(it.peso.replace(',', '.')) || 0
      const precoKg = materiais[it.materialIdx]?.precoKg ?? 0
      const custoMaterial = (pesoG / 1000) * precoKg
      const custoEnergia = (parseFloat(it.horas.replace(',', '.')) || 0) * custoEnergiaHoraNum
      const custoTotal = custoMaterial + custoEnergia
      const precoUnitario = custoTotal * (1 + margemNum)
      const qtd = parseFloat(it.quantidade.replace(',', '.')) || 1
      return { item: it, custoMaterial, custoEnergia, precoUnitario, precoLinha: precoUnitario * qtd, qtd }
    })

    return { linhas, total: linhas.reduce((s, l) => s + l.precoLinha, 0) }
  }, [itens, materiais, margem, custoEnergiaHora])

  function enviarWhatsApp() {
    const listaTexto = calculo.linhas.map(l => `• ${l.item.nome || 'Peça'} (x${l.qtd}) — ${formatMoney(l.precoLinha)}`).join('\n')
    const texto = `Olá!${clienteNome ? ' ' + clienteNome + ',' : ''} segue o orçamento:\n${listaTexto}\n\nTotal: ${formatMoney(calculo.total)}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  function gerarPdf() {
    const janela = window.open('', '_blank', 'width=650,height=800')
    if (!janela) return
    const linhasHtml = calculo.linhas
      .map(l => `<tr><td>${l.item.nome || 'Peça personalizada'}</td><td>${l.qtd}</td><td>${formatMoney(l.precoLinha)}</td></tr>`)
      .join('')
    janela.document.write(`
      <html>
        <head>
          <title>Orçamento</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #0F172A; }
            .logo { width: 56px; height: 56px; margin-bottom: 8px; }
            h1 { font-size: 20px; margin: 0 0 2px 0; }
            .sub { color: #64748B; font-size: 13px; margin-bottom: 28px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { text-align: left; font-size: 11px; color: #64748B; padding: 6px 0; border-bottom: 1px solid #E2E8F0; }
            td { padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
            .total { background: #E0F9FF; border-radius: 10px; padding: 16px 20px; margin-top: 8px; }
            .total .label { font-size: 12px; color: #64748B; font-weight: 600; }
            .total .valor { font-size: 26px; font-weight: 800; color: #7C3AED; }
            .footer { margin-top: 40px; font-size: 11px; color: #94A3B8; }
          </style>
        </head>
        <body>
          <img class="logo" src="${window.location.origin}/logo.png" />
          <h1>DeCaires 3D — Orçamento</h1>
          <div class="sub">${new Date().toLocaleDateString('pt-BR')}${clienteNome ? ' · ' + clienteNome : ''}</div>
          <table>
            <tr><th>Peça</th><th>Qtd</th><th>Valor</th></tr>
            ${linhasHtml}
          </table>
          <div class="total">
            <div class="label">VALOR TOTAL</div>
            <div class="valor">${formatMoney(calculo.total)}</div>
          </div>
          <div class="footer">Orçamento gerado por DeCaires 3D. Válido por 7 dias — sujeito a alteração conforme detalhes finais da peça.</div>
        </body>
      </html>
    `)
    janela.document.close()
    janela.focus()
    setTimeout(() => janela.print(), 300)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold m-0">Orçamento</h1>
      <p className="text-[var(--muted-foreground)] text-sm mt-0.5 mb-5">Monta orçamentos com uma ou várias peças {usandoMock && '(materiais de exemplo)'}</p>

      {vazio ? (
        <Card>
          <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">
            Você ainda não cadastrou nenhum material. Vai em <b>Estoque → Novo material</b> primeiro — o orçamento precisa saber o preço do filamento pra calcular.
          </div>
        </Card>
      ) : (
      <>
      <Card className="mb-4">
        <div className="grid grid-cols-3 gap-x-4">
          <div><Label>Cliente (opcional)</Label><Input placeholder="Nome do cliente" value={clienteNome} onChange={e => setClienteNome(e.target.value)} /></div>
          <div><Label>Margem de lucro (%)</Label><Input value={margem} onChange={e => setMargem(e.target.value)} /></div>
          <div><Label>Custo energia (R$/h)</Label><Input value={custoEnergiaHora} onChange={e => setCustoEnergiaHora(e.target.value)} /></div>
        </div>
      </Card>

      <div className="flex gap-4 flex-wrap items-start">
        <div className="flex-1 min-w-[340px] flex flex-col gap-3">
          {itens.map((it, idx) => {
            const linha = calculo.linhas[idx]
            return (
              <Card key={it.id}>
                <div className="flex justify-between items-center mb-2">
                  <b className="text-sm">Peça {idx + 1}</b>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[var(--secondary)]">{formatMoney(linha?.precoLinha ?? 0)}</span>
                    {itens.length > 1 && (
                      <button onClick={() => removerItem(it.id)} className="text-[var(--muted-foreground)] hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <Label>Nome da peça</Label>
                <Input placeholder="Ex: Suporte de celular" value={it.nome} onChange={e => atualizarItem(it.id, 'nome', e.target.value)} />
                <div className="grid grid-cols-2 gap-x-4">
                  <div><Label>Peso (gramas)</Label><Input value={it.peso} onChange={e => atualizarItem(it.id, 'peso', e.target.value)} /></div>
                  <div>
                    <Label>Material</Label>
                    <Select value={it.materialIdx} onChange={e => atualizarItem(it.id, 'materialIdx', Number(e.target.value))}>
                      {materiais.map((m, i) => <option key={m.id} value={i}>{m.nome} — {formatMoney(m.precoKg)}/kg</option>)}
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4">
                  <div><Label>Tempo de impressão (h)</Label><Input value={it.horas} onChange={e => atualizarItem(it.id, 'horas', e.target.value)} /></div>
                  <div><Label>Quantidade</Label><Input value={it.quantidade} onChange={e => atualizarItem(it.id, 'quantidade', e.target.value)} /></div>
                </div>
                <div className="flex justify-between text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded-lg px-3 py-2 mt-1">
                  <span>Custo material: {formatMoney(linha?.custoMaterial ?? 0)}</span>
                  <span>Custo energia: {formatMoney(linha?.custoEnergia ?? 0)}</span>
                  <span>Preço/un.: {formatMoney(linha?.precoUnitario ?? 0)}</span>
                </div>
              </Card>
            )
          })}
          <Button variant="ghost" onClick={() => setItens(l => [...l, novoItem()])}><Plus size={15} />Adicionar outra peça</Button>
        </div>

        <Card className="flex-1 min-w-[280px] sticky top-4">
          <div className="font-bold mb-2.5">Resumo do orçamento (sua visão)</div>
          {calculo.linhas.map((l, i) => (
            <div key={l.item.id} className="text-[13px] py-1.5 border-b border-[var(--border)]">
              <div className="flex justify-between font-semibold">
                <span>{l.item.nome || `Peça ${i + 1}`} {l.qtd > 1 ? `(x${l.qtd})` : ''}</span>
                <span>{formatMoney(l.precoLinha)}</span>
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                custo: {formatMoney((l.custoMaterial + l.custoEnergia) * l.qtd)} · lucro: {formatMoney(l.precoLinha - (l.custoMaterial + l.custoEnergia) * l.qtd)}
              </div>
            </div>
          ))}
          <div className="bg-[var(--accent)] rounded-xl p-4 mt-3">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Valor total do orçamento</div>
            <div className="text-2xl font-extrabold text-[var(--secondary)]">{formatMoney(calculo.total)}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              Custo total: {formatMoney(calculo.linhas.reduce((s, l) => s + (l.custoMaterial + l.custoEnergia) * l.qtd, 0))}
              {' · '}Lucro estimado: {formatMoney(calculo.total - calculo.linhas.reduce((s, l) => s + (l.custoMaterial + l.custoEnergia) * l.qtd, 0))}
            </div>
          </div>
          <Button variant="gradient" className="w-full mt-3.5" onClick={gerarPdf}><Send size={15} />Gerar orçamento PDF</Button>
          <Button variant="whatsapp" className="w-full mt-2" onClick={enviarWhatsApp}>Enviar por WhatsApp</Button>
        </Card>
      </div>
      </>
      )}
    </div>
  )
}
