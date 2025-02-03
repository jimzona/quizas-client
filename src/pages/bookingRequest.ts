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
  "LADY CHATTERLEY": [
    { base1: 120, base2: 240, supp: 108 }, // 1 personne
    { base1: 135, base2: 270, supp: 122 }, // 2 personnes
    { base1: 157.5, base2: 315, supp: 141 }, // 3 personnes
  ],
  "HENRY DE MONFREID": [
    { base1: 120, base2: 240, supp: 108 }, // 1 personne
    { base1: 135, base2: 270, supp: 122 }, // 2 personnes
  ],
  NAPOLÉON: [
    { base1: 110, base2: 220, supp: 99 }, // 1 personne
    { base1: 125, base2: 250, supp: 113 }, // 2 personnes
  ],
}

function changePrice(room: _Bedroom, nights: number, people: number) {
  const r = BASE_PRICE[room][people - 1] // Sélectionne la bonne ligne selon le nombre de personnes

  let total = 0

  if (nights === 1) {
    total = r.base1
  } else if (nights === 2) {
    total = r.base2
  } else {
    total = r.base2 + (nights - 2) * r.supp
  }

  price.innerText = `PRIX : ${formatPrice(total)}`
  return total
}

/*
function changePrice(room: _Bedroom, nights: number, people: number) {
  const r = BASE_PRICE[room][people - 1]

  //const suppNights = nights - 2
  // réajuste suppnights avec la possibilité de reserver 1 nuit
  const suppNights = nights > 2 ? nights - 2 : 0

  const total = r.base + suppNights * r.supp
  price.innerText = `PRIX : ${formatPrice(total)}`

  return total
}*/

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

  /*const disabledRooms = dates?.events
    .filter((e) => e.type === "RESA")
    .map((e) => e.bedroom)*/
  const roomMappings = {
    "lady chatterley": "LC",
    napoléon: "NP",
    "henry de monfreid": "HM",
  }

  const disabledRooms = dates?.events
    .filter((e) => {
      if (e.type !== "RESA") return false

      // Ignorer les événements ne commençant pas par "R -"
      if (!e.summary?.startsWith("R -")) {
        // eslint-disable-next-line no-console
        console.log("⚠️ Ignoré car ne commence pas par 'R -' :", e.summary)
        return false
      }

      // Extraire la chambre depuis `summary`, `e.bedroom` ou `data-room`
      let extractedBedroom = e.bedroom ?? e["data-room"]

      if (!extractedBedroom) {
        const parts = e.summary.split(" - ")

        if (parts.length >= 3) {
          const [, extracted] = parts // Déstructuration
          extractedBedroom = extracted
        } else if (parts.length === 2) {
          const [, extracted] = parts
          extractedBedroom = extracted
        }
      }

      // Normalisation : suppression des majuscules et des espaces pour correspondance
      const normalizedBedroom = extractedBedroom?.toLowerCase().trim()

      // Vérifier si `data-room` ou autre correspond dans `roomMappings`
      extractedBedroom = roomMappings[normalizedBedroom] || extractedBedroom

      // eslint-disable-next-line no-console
      console.log(
        `📌 Réservation détectée : ${extractedBedroom}, Dates : ${e.start} → ${e.end}`
      )

      const resArrival = new Date(e.start)
      const resDeparture = new Date(e.end)

      // Vérifie le chevauchement des dates
      const isDateConflict =
        (dateArrival >= resArrival && dateArrival < resDeparture) ||
        (dateDeparture > resArrival && dateDeparture <= resDeparture) ||
        (dateArrival <= resArrival && dateDeparture >= resDeparture)

      return extractedBedroom && isDateConflict
    })
    .map((e) => {
      const room = e.bedroom ?? e["data-room"] ?? e.summary?.split(" - ")[1]

      // Normalisation pour la correspondance
      const normalizedRoom = room?.toLowerCase().trim()

      return roomMappings[normalizedRoom] || room // Assurer la conversion des noms en initiales
    })

  console.log("🚫 Chambres bloquées :", disabledRooms)

  const rooms = [
    ...document.querySelectorAll<HTMLDivElement>(".resa-form_room"),
  ]

  /* const validRooms = rooms.filter((room) => {
    const roomAttr = room.getAttribute("data-room") as _Bedroom
    if (disabledRooms?.includes(roomAttr)) {
      room.classList.add("disabled")
      room.ariaDisabled = "true"

      return false
    }
    return true
  })*/

  // Normaliser `disabledRooms` pour s'assurer qu'il contient uniquement les initiales en majuscules
  const normalizedDisabledRooms = disabledRooms.map((room) => {
    const normalizedRoom = room.toLowerCase().trim()
    return roomMappings[normalizedRoom] || normalizedRoom.toUpperCase() // Convertir en initiales si possible
  })

  console.log("🚫 Chambres bloquées normalisées :", normalizedDisabledRooms)

  const validRooms = rooms.filter((room) => {
    // Récupérer la valeur de `data-room`, la normaliser et la convertir en majuscules
    const roomAttr = room.getAttribute("data-room")?.trim().toUpperCase()

    console.log("🔍 Chambre détectée dans data-room :", roomAttr)

    // Vérifier si `roomAttr` est une initiale connue ou un nom complet
    const mappedRoom = roomMappings[roomAttr.toLowerCase()] || roomAttr

    console.log("🔍 Correspondance après mapping :", mappedRoom)

    // Vérifier si la chambre est dans `normalizedDisabledRooms`
    if (mappedRoom && normalizedDisabledRooms.includes(mappedRoom)) {
      console.log(`❌ Désactivation de la chambre : ${mappedRoom}`)
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
