import mountBookingDates from "./pages/bookingDates"
import mountBookingRequest from "./pages/bookingRequest"

const currentPath = window.location.pathname

if (currentPath === "/reserver") {
  mountBookingDates()
}

if (currentPath === "/demande") {
  mountBookingRequest()
}
