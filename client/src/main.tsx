import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeContextProvider } from './presentation/context/ThemeContext'
import { AuthProvider } from './application/context/AuthContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeContextProvider>
        <App />
      </ThemeContextProvider>
    </AuthProvider>
  </StrictMode>,
)
