import './App.css'
import LoginPage from './components/LoginPage'
import { AuthProvider } from './providers/AuthProvider'
import { BrowserRouter, Link, Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import Storefront from './features/storefront/Storefront'
import { readStoredLanguage } from './features/storefront/language'
import { CheckoutOrderStatus } from './features/orders/CheckoutOrderStatus'

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
  const [searchParams] = useSearchParams()
  const language = readStoredLanguage() ?? 'es'
  const pedidoCodigo = status === 'success' ? searchParams.get('pedido_codigo')?.trim() : undefined
  const content = {
    success: {
      es: {
        eyebrow: 'Pago',
        title: 'Pago enviado',
        message: 'Mercado Pago te devolvió a la página de éxito. La confirmación final del pago la realiza el servidor.',
      },
      en: {
        eyebrow: 'Checkout',
        title: 'Payment submitted',
        message: 'Mercado Pago returned you to the success page. Final payment confirmation is handled by the server.',
      },
    },
    failure: {
      es: {
        eyebrow: 'Pago',
        title: 'Pago no completado',
        message: 'El pago no se completó. Puedes volver al menú e intentarlo de nuevo.',
      },
      en: {
        eyebrow: 'Checkout',
        title: 'Payment not completed',
        message: 'Your payment was not completed. You can return to the menu and try again.',
      },
    },
    pending: {
      es: {
        eyebrow: 'Pago',
        title: 'Pago pendiente',
        message: 'Tu pago todavía se está procesando. El servidor confirmará el estado final.',
      },
      en: {
        eyebrow: 'Checkout',
        title: 'Payment pending',
        message: 'Your payment is still being processed. The server will confirm the final status.',
      },
    },
  }[status]
  const localizedContent = content[language]

  return (
    <main className="storefront checkout-result-page">
      <section className="checkout-result-card" aria-live="polite">
        <p className="storefront-kicker">{localizedContent.eyebrow}</p>
        <h1>{localizedContent.title}</h1>
        <p>{localizedContent.message}</p>
        {pedidoCodigo ? (
          <div className="checkout-order-code">
            <span>{language === 'es' ? 'Código de pedido' : 'Order code'}</span>
            <strong>{pedidoCodigo}</strong>
          </div>
        ) : null}
        <div className="checkout-result-actions">
          <Link className="checkout-return-link" to="/">
            {language === 'es' ? 'Volver al menú' : 'Return to menu'}
          </Link>
          {pedidoCodigo ? <CheckoutOrderStatus pedidoCodigo={pedidoCodigo} language={language} /> : null}
        </div>
      </section>
    </main>
  )
}
