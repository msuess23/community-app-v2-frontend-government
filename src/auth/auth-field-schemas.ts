import { z } from 'zod'

export const authEmailSchema = z
  .string()
  .trim()
  .min(1, 'Bitte gib deine E-Mail-Adresse ein.')
  .email('Bitte gib eine gültige E-Mail-Adresse ein.')

export const authPasswordSchema = z
  .string()
  .min(8, 'Das Passwort muss mindestens acht Zeichen haben.')
  .max(128, 'Das Passwort darf höchstens 128 Zeichen haben.')
  .refine(
    (password) => new TextEncoder().encode(password).length <= 72,
    'Das Passwort darf in UTF-8 höchstens 72 Byte lang sein.',
  )
