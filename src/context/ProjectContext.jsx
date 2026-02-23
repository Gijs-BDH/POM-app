import { createContext, useContext, useState, useEffect, useCallback } from "react"

const ProjectContext = createContext(null)

const STORAGE_KEY = "pom_projects"
const DRAFT_KEY = "pom_draft"

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  } catch { return [] }
}

function saveDraft(draft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null")
  } catch { return null }
}

const defaultSliders = {
  betereSchool: 3,
  functioneleSchool: 3,
  aantrekkelijkeSchool: 3,
  inclusieveSchool: 3,
  gezondSchool: 3,
  duurzameSchool: 3,
  veiligSchool: 3,
  digitaleSchool: 3,
  onderhoudsvriendelijkeSchool: 3,
}

const defaultAmbities = {
  gezondSchool: { geluid: "B", temperatuur: "B", licht: "B", lucht: "B", kwaliteitsborging: "B", comfortNietOnderwijs: "B" },
  duurzameSchool: { energiegebruik: "Beter", materiaalgebruik: "Beter", watergebruik: "Beter", natuurInclusiviteit: "Beter", klimaatAdaptie: "Beter" },
  adaptieveSchool: { adaptievePlattegrond: "Beter", adaptieveTechniek: "Beter" },
  veiligSchool: { bouwkundigInbraak: "Beter", technischInbraak: "Beter", bouwkundigVandalisme: "Beter", technischVandalisme: "Beter" },
  digitaleSchool: { technischeIntegratie: "Beter" },
}

const defaultVoorzieningen = {
  primairOnderwijs: { actief: false, leerlingen: 400, bvoHandmatig: null, kleuterpleinHandmatig: null, kinderpleinHandmatig: null, fietsenstallingHandmatig: null },
  voorschoolseOpvang: { actief: false, groepen: 2, bvoHandmatig: null, pleinHandmatig: null, fietsenstallingHandmatig: null },
  sport: { actief: false, type: "gymzaal", bvoHandmatig: null },
}

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState(loadProjects)
  const [draft, setDraft] = useState(loadDraft)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  useEffect(() => {
    if (draft) saveDraft(draft)
  }, [draft])

  const startNewProject = useCallback(() => {
    const newDraft = {
      id: crypto.randomUUID(),
      naam: "",
      huidigeStap: "",
      rol: "",
      ervaring: "",
      stakeholders: [],
      sliders: { ...defaultSliders },
      pve: null,
      gebiedVarianten: [],
      gebouwVarianten: [],
      createdAt: Date.now(),
    }
    setDraft(newDraft)
    return newDraft
  }, [])

  const updateDraft = useCallback((updates) => {
    setDraft(prev => ({ ...prev, ...updates }))
  }, [])

  const saveProject = useCallback((projectData) => {
    const project = projectData || draft
    setProjects(prev => {
      const exists = prev.find(p => p.id === project.id)
      if (exists) return prev.map(p => p.id === project.id ? project : p)
      return [...prev, project]
    })
    localStorage.removeItem(DRAFT_KEY)
    setDraft(null)
    return project
  }, [draft])

  const updateProject = useCallback((id, updates) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }, [])

  const updateProjectPVE = useCallback((id, pveUpdates) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p
      const currentPVE = p.pve || {
        voorzieningen: { ...defaultVoorzieningen },
        ambities: { ...defaultAmbities },
        ruimtestaat: null,
        planning: {},
      }
      return { ...p, pve: { ...currentPVE, ...pveUpdates } }
    }))
  }, [])

  const getProject = useCallback((id) => {
    return projects.find(p => p.id === id) || null
  }, [projects])

  return (
    <ProjectContext.Provider value={{
      projects,
      draft,
      startNewProject,
      updateDraft,
      saveProject,
      updateProject,
      updateProjectPVE,
      getProject,
      defaultAmbities,
      defaultVoorzieningen,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error("useProject must be used within ProjectProvider")
  return ctx
}
