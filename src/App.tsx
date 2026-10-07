import './App.css'
import LoginPage from './components/LoginPage'
import { AuthProvider } from './providers/AuthProvider'

function App() {
  return (
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  )
}

export default App
