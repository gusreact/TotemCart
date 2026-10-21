import './App.css'
import LoginPage from './components/LoginPage'
import { AuthProvider } from './providers/AuthProvider'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import Storefront from './features/storefront/Storefront'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/success" element={<CheckoutResult status="success" />} />
        <Route path="/failure" element={<CheckoutResult status="failure" />} />
        <Route path="/pending" element={<CheckoutResult status="pending" />} />
        <Route path="/admin/*" element={<AuthProvider><LoginPage /></AuthProvider>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

function CheckoutResult({ status }: { status: 'success' | 'failure' | 'pending' }) {
  const content = {
    success: {
      eyebrow: 'Checkout',
      title: 'Payment submitted / Pago enviado',
      message: 'Mercado Pago returned you to the success page. Final payment confirmation is handled by the server.',
      spanishMessage: 'Mercado Pago te devolvió a la página de éxito. La confirmación final del pago la realiza el servidor.',
    },
    failure: {
      eyebrow: 'Checkout',
      title: 'Payment not completed / Pago no completado',
      message: 'Your payment was not completed. You can return to the menu and try again.',
      spanishMessage: 'El pago no se completó. Puedes volver al menú e intentarlo de nuevo.',
    },
    pending: {
      eyebrow: 'Checkout',
      title: 'Payment pending / Pago pendiente',
      message: 'Your payment is still being processed. The server will confirm the final status.',
      spanishMessage: 'Tu pago todavía se está procesando. El servidor confirmará el estado final.',
    },
  }[status]

  return (
    <main className="storefront checkout-result-page">
      <section className="checkout-result-card" aria-live="polite">
        <p className="storefront-kicker">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p>{content.message}</p>
        <p>{content.spanishMessage}</p>
        <Link className="checkout-return-link" to="/">Return to menu / Volver al menú</Link>
      </section>
    </main>
  )
}
