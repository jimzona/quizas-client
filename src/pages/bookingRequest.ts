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

const BASE_PRICE = {
  "HENRY DE MONFREID": [
    {
      base: 220,
      supp: 100,
    },
    {
      base: 250,
      supp: 110,
    },
  ],
  NAPOLÉON: [
    {
      base: 200,
      supp: 90,
    },
    {
      base: 230,
      supp: 100,
    },
  ],

  "LADY CHATTERLEY": [
    {
      base: 220,
      supp: 100,
    },
    {
      base: 250,
      supp: 110,
    },
    {
      base: 300,
      supp: 120,
    },
  ],
}

function changePrice(room: _Bedroom, nights: number, people: number) {
  const r = BASE_PRICE[room][people - 1]

  //const suppNights = nights - 2
  // réajuste suppnights avec la possibilité de reserver 1 nuit
  const suppNights = nights > 2 ? nights - 2 : 0

  const total = r.base + suppNights * r.supp
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
  inputDate.value = `Du ${new Date(arrival).toLocaleDateString(
    "fr-FR"
  )} au ${new Date(departure).toLocaleDateString("fr-FR")}`

  let dates: {
    success: boolean
    events: Events
    getFromCatch: boolean
  } | null = null

  try {
    dates = await fetchEvents({
      from: toIsoString(dateArrival),
      to: toIsoString(dateDeparture),
    })
  } catch (error) {
    // Silent
  }

  const disabledRooms = dates?.events
    .filter((e) => e.type === "RESA")
    .map((e) => e.bedroom)

  const rooms = [
    ...document.querySelectorAll<HTMLDivElement>(".resa-form_room"),
  ]

  const validRooms = rooms.filter((room) => {
    const roomAttr = room.getAttribute("data-room") as _Bedroom
    if (disabledRooms?.includes(roomAttr)) {
      room.classList.add("disabled")
      room.ariaDisabled = "true"

      return false
    }
    return true
  })

  const days = differenceInDays(new Date(departure), new Date(arrival))
  let selectedRoom: _Bedroom
  let totalPrice = 0

  validRooms.forEach((validRoom) => {
    const ctaText = validRoom.querySelector<HTMLDivElement>(
      ".cta .cta_text"
    ) as HTMLDivElement
    const roomName = validRoom.getAttribute("data-room") as _Bedroom

    validRoom.addEventListener("click", () => {
      validRooms.forEach((r) => {
        const ctaText = r.querySelector<HTMLDivElement>(
          ".cta .cta_text"
        ) as HTMLDivElement
        r.classList.remove("selected")
        ctaText.innerText = "Sélectionner cette chambre"
      })

      validRoom.classList.add("selected")
      ctaText.innerText = "Chambre sélectionnée"
      selectedRoom = roomName

      totalPrice = changePrice(roomName, days, 1)

      if (roomName === "LADY CHATTERLEY") {
        createOptions(3)
      } else {
        createOptions(2)
      }
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
      errorText.innerText = "Veuillez séléctionner une chambre"
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

    // Phone validation
    try {
      phoneSchema.parse(phoneInput.value)
    } catch (error) {
      errorTag.style.display = "block"
      errorText.innerText = "Numéro de téléphone non valide"
      return
    }

    // Email validation
    try {
      emailSchema.parse(emailInput.value)
    } catch (error) {
      errorTag.style.display = "block"
      errorText.innerText = "Adresse email non valide"
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

      if (res.status !== 200 || !res.ok) {
        throw new Error("Failed fetching event")
      }

      const success = document.querySelector(
        ".resa-form_success"
      ) as HTMLDivElement
      const formWrapper = document.querySelector(
        ".resa-form_wrapper"
      ) as HTMLDivElement

      formWrapper.remove()
      success.style.display = "block"
    } catch (error) {
      throw error
    }
  })
}

export default mountDemandePage
