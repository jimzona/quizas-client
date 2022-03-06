import { z } from "zod"

export const phoneSchema = z
  .string()
  .nonempty()
  .refine(
    (data) => data.match(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/gim),
    {
      message: "Invalid phone number",
      path: ["phone"],
    }
  )

export const emailSchema = z.string().email().nonempty()

export type PhoneSchema = z.infer<typeof phoneSchema>

export type EmailSchema = z.infer<typeof emailSchema>
