import mountDemandePage from "./pages/ask"
import mountResaPage from "./pages/resa"

const currentPath = window.location.pathname

if (currentPath === "/reserver") {
  mountResaPage()
}

if (currentPath === "/demande") {
  mountDemandePage()
}
