import mountBookingDates from "./pages/bookingDates"
import mountBookingRequest from "./pages/bookingRequest"

const currentPath = window.location.pathname

if (currentPath === "/reserver") {
  mountBookingDates()
}

if (currentPath === "/demande") {
  mountBookingRequest()
}

const GA_ID = "UA-238028753-1"
const head = document.getElementsByTagName("head")[0]

function loadGA() {
  let script = document.createElement("script")
  script.type = "text/javascript"
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID
  head.appendChild(script)
  script = document.createElement("script")
  script.type = "text/javascript"
  script.textContent =
    "window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '" +
    GA_ID +
    "' );"
  head.appendChild(script)
}

setTimeout(loadGA, 1000)
