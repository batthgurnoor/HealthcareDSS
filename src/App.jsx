import { NavLink, Routes, Route } from 'react-router-dom'
import Home from './pages/home'
import Staffing from './pages/Staffing'
import ROI from './pages/ROI'
import Flow from './pages/Flow'
import Inventory from './pages/Inventory'
import StaffingResults from './pages/StaffingResults'


function App() {
  

  return (
    <div>
      <div className="nav">
        <div className='nav-inner'>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/staffing">Staffing</NavLink>
        <NavLink to="/roi">ROI</NavLink>
        <NavLink to="/flow">Flow</NavLink>
        <NavLink to="/inventory">Inventory</NavLink>
        <NavLink to="/staffing-results" >
            Staffing Results
          </NavLink>
        </div>
      </div>

      <div className="container-outer my-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/staffing" element={<Staffing />} />
          <Route path="/roi" element={<ROI />} />
          <Route path="/flow" element={<Flow />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/staffing-results" element={<StaffingResults />} />
        </Routes>
        <div className='small my-4'>Healthcare DSS — React + Tailwind CSS </div>
      </div>


    </div>
  )
}

export default App
