import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ExplorerPage } from './pages/ExplorerPage'
import { UploadPage } from './pages/UploadPage'

/**
 * Raíz de la aplicación: define las dos rutas ya existentes en la feature
 * 001 (`/` y `/explorer`, sin cambiar sus direcciones -- Assumptions de
 * spec.md) envueltas en el layout compartido.
 */
function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/explorer" element={<ExplorerPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
