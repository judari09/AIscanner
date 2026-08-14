import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ExplorerPage } from './pages/ExplorerPage'
import { SettingsPage } from './pages/SettingsPage'
import { UploadPage } from './pages/UploadPage'

/**
 * Raíz de la aplicación: define las rutas `/` y `/explorer` ya existentes
 * desde la feature 001 (sin cambiar sus direcciones -- Assumptions de
 * spec.md), más `/settings` (US1/US2 de 003-ui-polish-model-switch),
 * envueltas en el layout compartido.
 */
function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/explorer" element={<ExplorerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
