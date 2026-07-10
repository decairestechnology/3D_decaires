import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { ValuesVisibilityProvider } from './context/ValuesVisibilityContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ValuesVisibilityProvider>
          <App />
        </ValuesVisibilityProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
