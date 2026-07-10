import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Agenda } from '@/pages/Agenda'
import { Pedidos } from '@/pages/Pedidos'
import { Orcamento } from '@/pages/Orcamento'
import { Clientes } from '@/pages/Clientes'
import { Estoque } from '@/pages/Estoque'
import { Financeiro } from '@/pages/Financeiro'
import { Relatorios } from '@/pages/Relatorios'
import { Maquinario } from '@/pages/Maquinario'
import { Configuracoes } from '@/pages/Configuracoes'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/orcamento" element={<Orcamento />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/maquinario" element={<Maquinario />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>
    </Routes>
  )
}
