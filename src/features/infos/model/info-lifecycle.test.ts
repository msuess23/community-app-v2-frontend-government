import { describe, expect, it } from 'vitest'

import {
  createInfoStatusUpdateValues,
  getInfoDeletionConsequences,
  infoStatusUpdateSchema,
  toInfoStatusCreateRequest,
} from '@/features/infos/model/info-lifecycle'

describe('Info lifecycle model', () => {
  it('allows repeating the current status and normalizes an optional public message', () => {
    const values = createInfoStatusUpdateValues('ACTIVE')

    expect(infoStatusUpdateSchema.parse(values)).toEqual({
      message: '',
      status: 'ACTIVE',
    })
    expect(
      toInfoStatusCreateRequest({
        message: '  Weiterhin   wie geplant.  ',
        status: 'ACTIVE',
      }),
    ).toEqual({
      message: 'Weiterhin wie geplant.',
      status: 'ACTIVE',
    })
    expect(toInfoStatusCreateRequest(values)).toEqual({
      message: null,
      status: 'ACTIVE',
    })
  })

  it('rejects public messages longer than the backend contract permits', () => {
    const result = infoStatusUpdateSchema.safeParse({
      message: 'a'.repeat(1001),
      status: 'DONE',
    })

    expect(result.success).toBe(false)
  })

  it('describes the complete destructive delete scope', () => {
    expect(getInfoDeletionConsequences()).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Statusverlauf/),
        expect.stringMatching(/Bilder/),
        expect.stringMatching(/Wiederherstellung/),
      ]),
    )
  })
})
