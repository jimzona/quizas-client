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
  { base1: number; base2: number; supp: number }[]
> = {
  "LADY CHATTERLEY": [
    { base1: 120, base2: 240, supp: 108 },
    { base1: 135, base2: 270, supp: 122 },
    { base1: 157.5, base2: 315, supp: 141 },
  ],
  "HENRY DE MONFREID": [
    { base1: 120, base2: 240, supp: 108 },
    { base1: 135, base2: 270, supp: 122 },
  ],
  NAPOLÉON: [
    { base1: 110, base2: 220, supp: 99 },
    { base1: 125, base2: 250, supp: 113 },
  ],
}

function changePrice(room: _Bedroom, nights: number, people: number) {
  const r = BASE_PRICE[room]?.[people - 1]
  if (!r) return 0

  const total =
    nights === 1
      ? r.base1
      : nights === 2
      ? r.base2
      : r.base2 + (nights - 2) * r.supp

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

  const roomMappings: Record<string, string> = {
    "lady chatterley": "LC",
    napoléon: "NP",
    "henry de monfreid": "HM",
  }

  const disabledRooms = (dates?.events ?? [])
    .filter((e) => {
      if (e.type !== "RESA") return false
      if (!e.summary?.startsWith("R -")) return false

      let extractedBedroom = e.bedroom ?? (e as any)["data-room"]
      if (!extractedBedroom) {
        const parts = e.summary.split(" - ")
        extractedBedroom = parts.length >= 2 ? parts[1] : extractedBedroom
      }

      const normalizedBedroom = extractedBedroom?.toLowerCase().trim()
      extractedBedroom = roomMappings[normalizedBedroom] || extractedBedroom

      const resArrival = new Date(e.start)
      const resDeparture = new Date(e.end)

      const isDateConflict =
        (dateArrival >= resArrival && dateArrival < resDeparture) ||
        (dateDeparture > resArrival && dateDeparture <= resDeparture) ||
        (dateArrival <= resArrival && dateDeparture >= resDeparture)

      return extractedBedroom && isDateConflict
    })
    .map((e) => {
      const room =
        e.bedroom ?? (e as any)["data-room"] ?? e.summary?.split(" - ")[1]
      const normalizedRoom = room?.toLowerCase().trim()
      return roomMappings[normalizedRoom] || room
    })

  console.log("🚫 Chambres bloquées :", disabledRooms)

  const rooms = [
    ...document.querySelectorAll<HTMLDivElement>(".resa-form_room"),
  ]

  const normalizedDisabledRooms = disabledRooms.map((room) => {
    const normalizedRoom = room.toLowerCase().trim()
    return roomMappings[normalizedRoom] || normalizedRoom.toUpperCase()
  })

  console.log("🚫 Chambres bloquées normalisées :", normalizedDisabledRooms)

  const validRooms = rooms.filter((room) => {
    const roomAttr = room.getAttribute("data-room")?.trim()
    if (!roomAttr) return true

    const mappedRoom =
      roomMappings[roomAttr.toLowerCase()] || roomAttr.toUpperCase()

    if (mappedRoom && normalizedDisabledRooms.includes(mappedRoom)) {
      console.log(`❌ Désactivation de la chambre : ${mappedRoom}`)
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
        r.classList.remove("selected")
        r.querySelector<HTMLDivElement>(".cta .cta_text")!.innerText =
          "Sélectionner cette chambre"
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
}

export default mountDemandePage
