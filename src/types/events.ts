export type _EventType = "OFF" | "RESA"

export type _Bedroom = "LADY CHATTERLEY" | "HENRY DE MONFREID" | "NAPOLÉON"

export interface _Event {
  start: string
  end: string
  description?: string | null
  summary: string
  type: _EventType
  bedroom: _Bedroom | null
}

export type Events = Array<_Event>

export type DateSchema = {
  from: Date
  to: Date
}

export type DateStringSchema = {
  from: string
  to: string
}
