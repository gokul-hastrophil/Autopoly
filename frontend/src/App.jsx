import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Proof from './pages/Proof'
import Dashboard from './pages/Dashboard'
import Demo from './pages/Demo'
import Trading from './pages/Trading'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/proof" element={<Proof />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/trading" element={<Trading />} />
      </Routes>
    </BrowserRouter>
  )
}
