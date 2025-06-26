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
      console.log("Événements récupérés :", dates.events)
    } else {
      console.warn("Aucun événement récupéré ou erreur dans la récupération.")
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

  // ✅ Désactive les jours de TOUS les événements (OFF + RESA)
  const offDates = dates.events.reduce((prevValue, currValue) => {
    const result = eachDayOfInterval({
      start: new Date(currValue.start),
      end: subDays(new Date(currValue.end), 1),
    })

    result.forEach((r) => {
      prevValue.add(r.toDateString()) // uniformité avec onRenderCell
    })

    return prevValue
  }, new Set<string>())

  // ✅ Affiche les périodes OFF uniquement
  const offDatesLines = dates.events.reduce((prevValue, currValue) => {
    if (currValue.type !== "OFF") return prevValue

    const result = {
      start: new Date(currValue.start),
      end: subDays(new Date(currValue.end), 1),
    }

    prevValue.add(result)
    return prevValue
  }, new Set<{ start: Date; end: Date }>())

  for (const off of offDatesLines.values()) {
    const line = document.createElement("div")
    line.innerText = `Quizas est fermé du ${formatDateString(
      off.start
    )} au ${formatDateString(off.end)}`
    datesWrapper.appendChild(line)
  }

  datepicker = new AirDatepicker("input#Dates", {
    ...configBaseDatepicker,
    autoClose: true,
    onRenderCell: ({ date, cellType }) => {
      if (cellType === "day") {
        return {
          disabled: offDates.has(date.toDateString()), // 👈 Match exact
        }
      }
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

      const datesContainsOff = eachDayOfInterval({
        start: date[0],
        end: date[1],
      }).some((d) => offDates.has(d.toDateString()))

      if (datesContainsOff) {
        createSelectedDateError("Vos dates ne sont pas disponibles")
        return
      }

      showValidateCTA()
    },
  })
}
