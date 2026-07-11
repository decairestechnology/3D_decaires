import { useMemo, useState } from 'react'
import { Send, Plus, Trash2, Save, PackageCheck, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { formatMoney } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { formatarDataBR } from '@/lib/date'
import { materiais as materiaisMock } from '@/data/mockData'
import { carregarPreferencias } from '@/lib/settings'

interface MaterialApiRow { id: string; nome: string; preco_kg: string }
interface ClienteApiRow { id: string; nome: string }
interface ItemSalvo {
  nome: string; peso: string; materialId: string; horas: string; quantidade: number
  custoUnitario: number; valor: number
}
interface OrcamentoSalvoApiRow {
  id: string; cliente_id: string | null; cliente_nome: string | null
  itens: ItemSalvo[]; margem: string; custo_energia_hora: string; valor_total: string; convertido: boolean; criado_em: string
}

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

  const { data: clientesApi } = useApi<ClienteApiRow[]>('/api/clientes', [])
  const { data: salvosApi, reload: reloadSalvos } = useApi<OrcamentoSalvoApiRow[]>('/api/orcamentos', [])

  const prefs = carregarPreferencias()

  const [clienteId, setClienteId] = useState('')
  const [custoEnergiaHora, setCustoEnergiaHora] = useState(prefs.custoEnergiaPadrao)
  const [margem, setMargem] = useState(prefs.margemPadrao)
  const [itens, setItens] = useState<ItemOrcamento[]>([novoItem()])
  const [salvando, setSalvando] = useState(false)
  const [convertendoId, setConvertendoId] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [editandoClienteDe, setEditandoClienteDe] = useState<string | null>(null)
  const [clienteSelecionadoEdicao, setClienteSelecionadoEdicao] = useState('')
  const [editandoOrcamentoId, setEditandoOrcamentoId] = useState<string | null>(null)

  const clienteNome = clientesApi.find(c => c.id === clienteId)?.nome ?? ''

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
      const precoLinha = precoUnitario * qtd
      return { item: it, custoMaterial, custoEnergia, precoUnitario, precoLinha, qtd, lucroLinha: precoLinha - custoTotal * qtd }
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

  async function salvarOrcamento() {
    setSalvando(true)
    try {
      const itensSalvos: ItemSalvo[] = calculo.linhas.map(l => ({
        nome: l.item.nome || 'Peça personalizada',
        peso: l.item.peso,
        materialId: materiais[l.item.materialIdx]?.id ?? '',
        horas: l.item.horas,
        quantidade: l.qtd,
        custoUnitario: l.custoMaterial + l.custoEnergia,
        valor: l.precoLinha
      }))
      const payload = {
        cliente_id: clienteId || null,
        itens: itensSalvos,
        margem: Number(margem.replace(',', '.')) || 0,
        custo_energia_hora: Number(custoEnergiaHora.replace(',', '.')) || 0,
        valor_total: calculo.total
      }
      if (editandoOrcamentoId) await api.patch(`/api/orcamentos?id=${editandoOrcamentoId}`, payload)
      else await api.post('/api/orcamentos', payload)
      reloadSalvos()
      setEditandoOrcamentoId(null)
      setClienteId('')
      setItens([novoItem()])
      alert(editandoOrcamentoId ? 'Orçamento atualizado!' : 'Orçamento salvo! Ele aparece na lista abaixo — dá pra transformar em pedido quando o cliente aprovar.')
    } catch (err) {
      console.error('[Salvar orçamento] erro:', err)
      alert('Não deu pra salvar o orçamento — confere a conexão com o banco.')
    } finally {
      setSalvando(false)
    }
  }

  function editarOrcamentoSalvo(o: OrcamentoSalvoApiRow) {
    setEditandoOrcamentoId(o.id)
    setClienteId(o.cliente_id ?? '')
    setMargem(o.margem)
    setCustoEnergiaHora(o.custo_energia_hora)
    setItens(
      o.itens.length > 0
        ? o.itens.map(it => ({
            id: crypto.randomUUID(),
            nome: it.nome,
            peso: it.peso ?? '80',
            materialIdx: Math.max(materiais.findIndex(m => m.id === it.materialId), 0),
            horas: it.horas ?? '6',
            quantidade: String(it.quantidade)
          }))
        : [novoItem()]
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function virarPedido(orc: OrcamentoSalvoApiRow) {
    if (!orc.cliente_id) {
      alert('Esse orçamento não tem cliente vinculado — edita ele com um cliente selecionado antes de virar pedido.')
      return
    }
    setConvertendoId(orc.id)
    try {
      for (const item of orc.itens) {
        await api.post('/api/pedidos', {
          cliente_id: orc.cliente_id,
          peca: item.quantidade > 1 ? `${item.nome} (x${item.quantidade})` : item.nome,
          material: null,
          valor: item.valor,
          prazo: null,
          status: 'orcamento'
        })
      }
      await api.patch(`/api/orcamentos?id=${orc.id}`, { convertido: true })
      reloadSalvos()
      alert('Pronto! Os itens desse orçamento agora estão em Pedidos, na coluna "Orçamento".')
    } catch (err) {
      console.error('[Virar pedido] erro:', err)
      alert('Não deu pra transformar em pedido — confere a conexão com o banco.')
    } finally {
      setConvertendoId(null)
    }
  }

  async function excluirSalvo(id: string) {
    try {
      await api.del(`/api/orcamentos?id=${id}`)
      setConfirmandoId(null)
      reloadSalvos()
    } catch (err) {
      console.error('[Excluir orçamento] erro:', err)
      alert('Não deu pra excluir.')
    }
  }

  function abrirVincularCliente(orc: OrcamentoSalvoApiRow) {
    setEditandoClienteDe(orc.id)
    setClienteSelecionadoEdicao(orc.cliente_id ?? '')
  }

  async function salvarClienteVinculado(orcId: string) {
    if (!clienteSelecionadoEdicao) return
    try {
      await api.patch(`/api/orcamentos?id=${orcId}`, { cliente_id: clienteSelecionadoEdicao })
      setEditandoClienteDe(null)
      reloadSalvos()
    } catch (err) {
      console.error('[Vincular cliente] erro:', err)
      alert('Não deu pra vincular o cliente.')
    }
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
          <div>
            <Label>Cliente (opcional)</Label>
            <Select value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">Sem cliente vinculado</option>
              {clientesApi.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
            {clientesApi.length === 0 && (
              <div className="text-xs text-[var(--muted-foreground)] -mt-2">Nenhum cliente cadastrado ainda — pode salvar sem cliente e vincular depois, ou cadastra um em Clientes.</div>
            )}
          </div>
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
                <div className="flex justify-between flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded-lg px-3 py-2 mt-1">
                  <span>Custo/un.: {formatMoney((linha?.custoMaterial ?? 0) + (linha?.custoEnergia ?? 0))}</span>
                  <span>Custo material: {formatMoney(linha?.custoMaterial ?? 0)}</span>
                  <span>Custo energia: {formatMoney(linha?.custoEnergia ?? 0)}</span>
                  <span>Preço/un.: {formatMoney(linha?.precoUnitario ?? 0)}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Lucro: {formatMoney(linha?.lucroLinha ?? 0)}</span>
                </div>
              </Card>
            )
          })}
          <Button variant="ghost" onClick={() => setItens(l => [...l, novoItem()])}><Plus size={15} />Adicionar outra peça</Button>
        </div>

        <Card className="flex-1 min-w-[280px] sticky top-4">
          <div className="font-bold mb-2.5">Resumo do orçamento</div>
          {calculo.linhas.map((l, i) => (
            <div key={l.item.id} className="flex justify-between text-[13px] py-1.5 border-b border-[var(--border)]">
              <span>{l.item.nome || `Peça ${i + 1}`} {l.qtd > 1 ? `(x${l.qtd})` : ''}</span>
              <span>{formatMoney(l.precoLinha)}</span>
            </div>
          ))}
          <div className="bg-[var(--accent)] rounded-xl p-4 mt-3">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Valor total do orçamento</div>
            <div className="text-2xl font-extrabold text-[var(--secondary)]">{formatMoney(calculo.total)}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              Custo total: {formatMoney(calculo.linhas.reduce((s, l) => s + (l.custoMaterial + l.custoEnergia) * l.qtd, 0))}
              {' · '}Lucro estimado: {formatMoney(calculo.linhas.reduce((s, l) => s + l.lucroLinha, 0))}
            </div>
          </div>
          <Button variant="primary" className="w-full mt-3.5" onClick={salvarOrcamento} disabled={salvando}>
            <Save size={15} />{salvando ? 'Salvando...' : editandoOrcamentoId ? 'Atualizar orçamento' : 'Salvar orçamento'}
          </Button>
          {editandoOrcamentoId && (
            <Button variant="ghost" className="w-full mt-2" onClick={() => { setEditandoOrcamentoId(null); setClienteId(''); setItens([novoItem()]) }}>
              Cancelar edição
            </Button>
          )}
          <Button variant="gradient" className="w-full mt-2" onClick={gerarPdf}><Send size={15} />Gerar orçamento PDF</Button>
          <Button variant="whatsapp" className="w-full mt-2" onClick={enviarWhatsApp}>Enviar por WhatsApp</Button>
        </Card>
      </div>

      {salvosApi.length > 0 && (
        <>
          <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Orçamentos salvos</h2>
          <Card className="p-0">
            {salvosApi.map((o, i) => {
              const last = i === salvosApi.length - 1
              const editando = editandoClienteDe === o.id
              return (
                <div key={o.id} className={`flex items-center gap-3 px-4 py-3 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                  <div className="flex-1">
                    {editando ? (
                      <div className="flex items-center gap-2">
                        <Select value={clienteSelecionadoEdicao} onChange={e => setClienteSelecionadoEdicao(e.target.value)}>
                          <option value="">Selecione um cliente...</option>
                          {clientesApi.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </Select>
                      </div>
                    ) : (
                      <>
                        <div className="text-[13.5px] font-bold flex items-center gap-2">
                          {o.cliente_nome ?? 'Sem cliente'}
                          {!o.cliente_nome && !o.convertido && (
                            <button onClick={() => abrirVincularCliente(o)} className="text-[11px] font-semibold text-[var(--primary)] underline underline-offset-2">
                              vincular cliente
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {o.itens.map(it => `${it.nome} (un.: ${formatMoney(it.custoUnitario ?? 0)})`).join(', ')} · {formatarDataBR(o.criado_em)}
                        </div>
                      </>
                    )}
                  </div>
                  {editando ? (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={() => setEditandoClienteDe(null)}>Cancelar</Button>
                      <Button variant="primary" onClick={() => salvarClienteVinculado(o.id)} disabled={!clienteSelecionadoEdicao}>Salvar</Button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-bold">{formatMoney(Number(o.valor_total))}</div>
                      {confirmandoId === o.id ? (
                        <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluirSalvo(o.id)} />
                      ) : o.convertido ? (
                        <Badge color="green">Virou pedido</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" onClick={() => virarPedido(o)} disabled={convertendoId === o.id}>
                            <PackageCheck size={14} />{convertendoId === o.id ? 'Convertendo...' : 'Virar pedido'}
                          </Button>
                          <button onClick={() => editarOrcamentoSalvo(o)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setConfirmandoId(o.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </Card>
        </>
      )}
      </>
      )}
    </div>
  )
}
