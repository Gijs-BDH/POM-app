import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ProjectProvider } from "./context/ProjectContext"
import LandingPage from "./pages/LandingPage"
import NieuwProjectStap1 from "./pages/NieuwProjectStap1"
import NieuwProjectStap2 from "./pages/NieuwProjectStap2"
import NieuwProjectStap3 from "./pages/NieuwProjectStap3"
import ProjectOverzicht from "./pages/ProjectOverzicht"
import PVEStap1 from "./pages/pve/PVEStap1"
import PVEStap2 from "./pages/pve/PVEStap2"
import PVEStap3 from "./pages/pve/PVEStap3"
import PVEStap4 from "./pages/pve/PVEStap4"
import PVEStap4Begeleid from "./pages/pve/PVEStap4Begeleid"
import PVEStap4Vlekkenplan from "./pages/pve/PVEStap4Vlekkenplan"
import PVEStap5 from "./pages/pve/PVEStap5"
import GebiedStap1 from "./pages/GebiedStap1"
import GebouwStap1 from "./pages/GebouwStap1"
import BesluitOverzicht from "./pages/BesluitOverzicht"

export default function App() {
  return (
    <ProjectProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/nieuw-project/stap-1" element={<NieuwProjectStap1 />} />
          <Route path="/nieuw-project/stap-2" element={<NieuwProjectStap2 />} />
          <Route path="/nieuw-project/stap-3" element={<NieuwProjectStap3 />} />
          <Route path="/project/:id" element={<ProjectOverzicht />} />
          <Route path="/project/:id/pve/stap-1" element={<PVEStap1 />} />
          <Route path="/project/:id/pve/stap-2" element={<PVEStap2 />} />
          <Route path="/project/:id/pve/stap-3" element={<PVEStap3 />} />
          <Route path="/project/:id/pve/stap-4" element={<PVEStap4 />} />
          <Route path="/project/:id/pve/stap-4/begeleid" element={<PVEStap4Begeleid />} />
          <Route path="/project/:id/pve/stap-4/vlekkenplan" element={<PVEStap4Vlekkenplan />} />
          <Route path="/project/:id/pve/stap-5" element={<PVEStap5 />} />
          <Route path="/project/:id/gebied/stap-1" element={<GebiedStap1 />} />
          <Route path="/project/:id/gebouw" element={<GebouwStap1 />} />
          <Route path="/project/:id/besluit" element={<BesluitOverzicht />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ProjectProvider>
  )
}
