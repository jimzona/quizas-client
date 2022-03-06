import { DateStringSchema } from "../types/events"
import isDevMode from "./isDevMode"

export default async function fetchEvents(body?: DateStringSchema) {
  try {
    const res = await fetch(
      isDevMode()
        ? "http://localhost:8001/api/events"
        : "https://quizas.vercel.app/api/events",
      {
        body: body ? JSON.stringify(body) : null,
        method: body ? "POST" : "GET",
      }
    )

    if (res.status !== 200 || !res.ok) {
      throw new Error("Failed fetching event")
    }

    return res.json()
  } catch (error) {
    throw error
  }
}
