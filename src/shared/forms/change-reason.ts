import { z } from 'zod'

export const changeReasonSchema = z
  .string()
  .trim()
  .min(3, 'Die Begründung muss mindestens drei Zeichen haben.')
  .max(500, 'Die Begründung darf höchstens 500 Zeichen haben.')

/** Normalizes an audit reason before it is sent to an administrative endpoint. */
export function normalizeChangeReason(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}
