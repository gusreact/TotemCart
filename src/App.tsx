import './App.css'
import LoginPage from './components/LoginPage'
import { AuthProvider } from './providers/AuthProvider'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Storefront from './features/storefront/Storefront'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/admin/*" element={<AuthProvider><LoginPage /></AuthProvider>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
