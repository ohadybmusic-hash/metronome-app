import './App.css'
import Metronome from './components/Metronome.jsx'
import Tuner from './components/Tuner.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import AuthBar from './components/AuthBar.jsx'
import AuthGate from './components/AuthGate.jsx'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth'

function App() {
  const { user, loading } = useAuth()

  return (
    <BrowserRouter>
      <nav className="app__nav">
        <Link className="app__navLink" to="/">
          Home
        </Link>
        <Link className="app__navLink" to="/admin">
          Admin
        </Link>
        {user ? <AuthBar /> : null}
      </nav>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center' }}>Loading…</div>
      ) : !user ? (
        <AuthGate />
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Metronome />
                <Tuner />
              </>
            }
          />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      )}
    </BrowserRouter>
  )
}

export default App
