import { differenceInDays } from "date-fns"

import { Events, _Bedroom } from "../types/events"
import { emailSchema, phoneSchema } from "../utils/formValidation"
import { formatPrice } from "../utils/format"
import fetchEvents from "../utils/getEvents"
import isDevMode from "../utils/isDevMode"
import removeWebflowFormBehaviour from "../utils/webflow"

const select = document.querySelector("select#people") as HTMLSelectElement
const roomsWrapper = document.querySelector(
  ".resa-form_rooms_wrapper"
) as HTMLDivElement
const loader = document.querySelector(".loader") as HTMLDivElement

function createOptions(amount: number) {
  select.innerHTML = ""
  for (let index = 0; index < amount; index++) {
    const value = (index + 1).toString()
    const option = document.createElement("option")
    option.value = value
    option.innerText = value
    select.appendChild(option)
  }
}

const price = document.querySelector("label.price") as HTMLLabelElement

const BASE_PRICE: Record<
  string,
  { base: number; base2: number; supp: number }[]
> = {
  "LADY CHATTERLEY": [
    { base: 120, base2: 240, supp: 108 },
    { base: 135, base2: 270, supp: 122 },
    { base: 157.5, base2: 315, supp: 141 },
  ],
  "HENRY DE MONFREID": [
    { base: 120, base2: 240, supp: 108 },
    { base: 135, base2: 270, supp: 122 },
  ],
  NAPOLÉON: [
    { base: 110, base2: 220, supp: 99 },
    { base: 125, base2: 250, supp: 113 },
  ],
}

function changePrice(room: _Bedroom, nights: number, people: number) {
  const r = BASE_PRICE[room]?.[people - 1]
  if (!r) return 0
  let total
  if (nights === 1) total = r.base
  else if (nights === 2) total = r.base2
  else total = r.base2 + (nights - 2) * r.supp
  price.innerText = `PRIX : ${formatPrice(total)}`
  return total
}

function toIsoString(date: Date) {
  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  ).toISOString()
}

async function mountDemandePage() {
  removeWebflowFormBehaviour()

  const URLdates = new URL(window.location.href).searchParams
  const arrival = URLdates.get("arrival")
  const departure = URLdates.get("departure")

  if (!arrival || !departure) {
    window.location.href = window.location.origin + "/reserver"
    return
  }

  const dateArrival = new Date(arrival)
  const dateDeparture = new Date(departure)
  const inputDate = document.querySelector("input#Dates") as HTMLInputElement
  inputDate.readOnly = true
  inputDate.value = `Du ${dateArrival.toLocaleDateString(
    "fr-FR"
  )} au ${dateDeparture.toLocaleDateString("fr-FR")}`

  const testDates = await fetchEvents()
  console.log("✅ Tous les événements disponibles :", testDates.events)

  const disabledRooms = new Set(
    (testDates?.events || [])
      .filter((e: Events[number]) => {
        if (e.type !== "RESA" || typeof e.summary !== "string") return false

        const eventStart = new Date(e.start)
        const eventEnd = new Date(e.end)

        return eventStart < dateDeparture && eventEnd > dateArrival
      })
      .map((e: Events[number]) => {
        const summary = e.summary.toUpperCase().replace(/\s+/g, " ").trim()
        if (summary.includes("R - LC")) return "LADY CHATTERLEY"
        if (summary.includes("R - NP")) return "NAPOLÉON"
        if (summary.includes("R - HM")) return "HENRY DE MONFREID"
        return null
      })
      .filter(Boolean)
  )

  const rooms = [
    ...document.querySelectorAll<HTMLDivElement>(".resa-form_room"),
  ]
  const validRooms = rooms.filter((room) => {
    const roomAttr = room.getAttribute("data-room") as _Bedroom
    if (disabledRooms.has(roomAttr)) {
      room.classList.add("disabled")
      room.ariaDisabled = "true"
      return false
    }
    return true
  })

  const days = differenceInDays(dateDeparture, dateArrival)
  let selectedRoom: _Bedroom
  let totalPrice = 0

  validRooms.forEach((validRoom) => {
    const ctaText = validRoom.querySelector<HTMLDivElement>(
      ".cta .cta_text"
    ) as HTMLDivElement
    const roomName = validRoom.getAttribute("data-room") as _Bedroom

    validRoom.addEventListener("click", () => {
      validRooms.forEach((r) => {
        const t = r.querySelector<HTMLDivElement>(
          ".cta .cta_text"
        ) as HTMLDivElement
        r.classList.remove("selected")
        t.innerText = "Sélectionner cette chambre"
      })
      validRoom.classList.add("selected")
      ctaText.innerText = "Chambre sélectionnée"
      selectedRoom = roomName
      totalPrice = changePrice(roomName, days, 1)
      createOptions(roomName === "LADY CHATTERLEY" ? 3 : 2)
    })
  })

  loader.remove()
  roomsWrapper.classList.remove("none")

  select.addEventListener("change", () => {
    totalPrice = changePrice(selectedRoom, days, Number(select.value))
  })

  const errorTag = document.querySelector(".date_input_error") as HTMLDivElement
  const errorText = errorTag.querySelector(".error") as HTMLDivElement

  const form = document.querySelector("form[data-name=resa]") as HTMLFormElement
  const phoneInput = form.querySelector("input[type=tel]") as HTMLInputElement
  const emailInput = form.querySelector("input[type=email]") as HTMLInputElement

  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    if (!selectedRoom) {
      errorTag.style.display = "block"
      errorText.innerText = "Veuillez sélectionner une chambre"
      return
    }
    errorTag.style.display = "none"

    const rawFormData = new FormData(form)
    const formData = {
      ...Object.fromEntries(rawFormData.entries()),
      room: selectedRoom,
      dates: {
        arrival: toIsoString(dateArrival),
        departure: toIsoString(dateDeparture),
      },
      price: totalPrice,
    }

    try {
      phoneSchema.parse(phoneInput.value)
      emailSchema.parse(emailInput.value)
    } catch (error) {
      errorTag.style.display = "block"
      errorText.innerText = "Email ou téléphone non valide"
      return
    }

    const cta = form.querySelector(".cta") as HTMLInputElement
    try {
      cta.value = "Envoi en cours..."

      const res = await fetch(
        isDevMode()
          ? "http://localhost:8001/api/bookingRequest"
          : "https://quizas.vercel.app/api/bookingRequest",
        {
          body: JSON.stringify(formData),
          method: "POST",
        }
      )

      if (!res.ok) throw new Error("Échec de l'envoi")

      const success = document.querySelector(
        ".resa-form_success"
      ) as HTMLDivElement
      const formWrapper = document.querySelector(
        ".resa-form_wrapper"
      ) as HTMLDivElement
      formWrapper.remove()
      success.style.display = "block"
    } catch (error) {
      console.error("Erreur lors de l'envoi du formulaire", error)
    }
  })
}

export default mountDemandePage
