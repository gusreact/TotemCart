import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const API_BASE_URL = env.VITE_RENDER_API_DOMAIN
  const RENDER_API_URL = `${API_BASE_URL}/api/categorias`

  return {
    plugins: [react()],
    define: {
      'import.meta.env.LOCAL_PAYMENT_SIMULATION': JSON.stringify(env.LOCAL_PAYMENT_SIMULATION === 'true'),
    },
    server: {
      proxy: {
        '/api': {
          target: RENDER_API_URL,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
