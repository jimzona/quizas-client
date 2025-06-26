import AirDatepicker from "air-datepicker"
import "air-datepicker/air-datepicker.css"
import "clickout-event"
import { subDays, differenceInDays, eachDayOfInterval } from "date-fns"

import { Events } from "../types/events"
import { configBaseDatepicker } from "../utils/datepicker"
import { createSelectedDateError, hideSelectedDateError } from "../utils/errors"
import { formatDateString } from "../utils/format"
import fetchEvents from "../utils/getEvents"
import removeWebflowFormBehaviour from "../utils/webflow"

const inputWrapper = document.querySelector(
  ".date_input_wrapper"
) as HTMLDivElement
const loader = document.querySelector(".loader") as HTMLDivElement
const datesWrapper = document.querySelector(
  "div.resa_date_title"
) as HTMLDivElement

export default async function mountResaPage() {
  removeWebflowFormBehaviour()

  const helpButton = document.querySelector<HTMLDivElement>(".resa_date_help")
  const helpModal = document.querySelector<HTMLDivElement>(
    ".resa_date_help_modal"
  )

  helpButton?.addEventListener("click", () => {
    if (helpModal) helpModal.style.display = "block"
  })

  helpModal?.addEventListener("clickout", () => {
    if (helpModal) helpModal.style.display = "none"
  })

  let datepicker: AirDatepicker | null

  const validateDatesCTA = document.querySelector("form .cta") as HTMLDivElement

  function showValidateCTA() {
    validateDatesCTA.style.display = "inline-block"
  }

  function hideValidateCTA() {
    validateDatesCTA.style.display = "none"
  }

  validateDatesCTA.addEventListener("click", (ev) => {
    ev.preventDefault()

    const dates = datepicker?.selectedDates
    if (!dates) return

    const q = new URLSearchParams()
    q.append("arrival", dates[0].toDateString())
    q.append("departure", dates[1].toDateString())

    window.location.href = window.location.origin + "/demande?" + q.toString()
  })

  let dates: {
    success: boolean
    events: Events
    getFromCatch: boolean
  } | null = null

  try {
    dates = await fetchEvents()
    if (dates?.events) {
      console.log("✅ Événements récupérés :", dates.events)
    } else {
      console.warn("Aucun événement récupéré.")
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des événements :", error)
  }

  loader.remove()
  inputWrapper.style.display = "block"

  if (!dates || !dates.events) {
    datepicker = new AirDatepicker("input#Dates", configBaseDatepicker)
    return
  }

  // ========== LOGIQUE BLOQUANTE ==========

  const blockedDates = new Set<string>()
  const bookingMap = new Map<string, Set<string>>() // date -> chambres réservées

  dates.events.forEach((event) => {
    const start = new Date(event.start)
    const end = subDays(new Date(event.end), 1)
    const days = eachDayOfInterval({ start, end })

    if (event.type === "OFF") {
      days.forEach((d) => blockedDates.add(d.toDateString()))
    }

    if (event.type === "RESA" && typeof event.summary === "string") {
      const summary = event.summary.toUpperCase().trim()
      let room: string | null = null
      if (summary.includes("R - LC")) room = "LADY CHATTERLEY"
      else if (summary.includes("R - NP")) room = "NAPOLÉON"
      else if (summary.includes("R - HM")) room = "HENRY DE MONFREID"
      if (!room) return

      days.forEach((d) => {
        const key = d.toDateString()
        const rooms = bookingMap.get(key) || new Set<string>()
        rooms.add(room!)
        bookingMap.set(key, rooms)
      })
    }
  })

  // Si les 3 chambres sont prises sur une date, on la bloque
  bookingMap.forEach((rooms, dateStr) => {
    if (rooms.size >= 3) {
      blockedDates.add(dateStr)
    }
  })

  // ========== AFFICHAGE DES LIGNES OFF ==========

  const offPeriods = dates.events.filter((e) => e.type === "OFF")
  for (const period of offPeriods) {
    const line = document.createElement("div")
    line.innerText = `Quizas est fermé du ${formatDateString(
      new Date(period.start)
    )} au ${formatDateString(subDays(new Date(period.end), 1))}`
    datesWrapper.appendChild(line)
  }

  // ========== INITIALISATION DU DATEPICKER ==========

  datepicker = new AirDatepicker("input#Dates", {
    ...configBaseDatepicker,
    autoClose: true,
    onRenderCell: ({ date, cellType }) => {
      if (cellType === "day") {
        return {
          disabled: blockedDates.has(date.toDateString()),
        }
      }
      return {}
    },
    onSelect: ({ date }) => {
      hideSelectedDateError()
      hideValidateCTA()

      if (!Array.isArray(date) || date.length < 2) return

      const startMonth = date[0].getMonth() + 1
      const endMonth = date[1].getMonth() + 1
      const isSummerBooking =
        [7, 8].includes(startMonth) || [7, 8].includes(endMonth)
      const minNights = isSummerBooking ? 2 : 1
      const diff = differenceInDays(date[1], date[0])

      if (diff < minNights) {
        createSelectedDateError(
          `Veuillez sélectionner au moins ${minNights} nuit${
            minNights > 1 ? "s" : ""
          }`
        )
        return
      }

      const rangeHasBlocked = eachDayOfInterval({
        start: date[0],
        end: date[1],
      }).some((d) => blockedDates.has(d.toDateString()))

      if (rangeHasBlocked) {
        createSelectedDateError("Vos dates ne sont pas disponibles")
        return
      }

      showValidateCTA()
    },
  })
}