import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/client/api-error'

import {
  createInfoStatusUpdateValues,
  getInfoDeletionConsequences,
  getInfoLifecycleErrorPresentation,
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

  it('translates a missing current status into an actionable domain message', () => {
    const presentation = getInfoLifecycleErrorPresentation(
      new ApiError({
        errorCode: 'INFO_STATUS_NOT_FOUND',
        message: 'Info status not found',
        status: 404,
      }),
      'status',
    )

    expect(presentation).toEqual({
      description:
        'Für diese Mitteilung fehlt der aktuelle Status. Der Datenbestand muss administrativ geprüft werden.',
      title: 'Status der Mitteilung nicht verfügbar',
    })
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
