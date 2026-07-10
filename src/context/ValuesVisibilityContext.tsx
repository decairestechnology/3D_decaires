import { createContext, useContext, useState, ReactNode } from 'react'

interface ValuesVisibilityContextValue {
  hideValues: boolean
  toggleHideValues: () => void
}

const ValuesVisibilityContext = createContext<ValuesVisibilityContextValue | undefined>(undefined)

export function ValuesVisibilityProvider({ children }: { children: ReactNode }) {
  const [hideValues, setHideValues] = useState(false)
  return (
    <ValuesVisibilityContext.Provider value={{ hideValues, toggleHideValues: () => setHideValues(v => !v) }}>
      {children}
    </ValuesVisibilityContext.Provider>
  )
}

export function useValuesVisibility() {
  const ctx = useContext(ValuesVisibilityContext)
  if (!ctx) throw new Error('useValuesVisibility precisa estar dentro de <ValuesVisibilityProvider>')
  return ctx
}
