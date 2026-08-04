import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import {
  getInfoImageErrorPresentation,
  getInfoImageUploadErrorMessage,
} from '@/features/infos/model/info-image-errors'

describe('Info image error presentation', () => {
  it('translates validation and lifecycle failures into specific messages', () => {
    expect(
      getInfoImageErrorPresentation(
        new ApiError({
          errorCode: 'INFO_IMAGE_TOO_LARGE',
          message: 'too large',
          status: 413,
        }),
      ),
    ).toEqual({
      description: 'Ein Info-Bild darf höchstens 5 MiB groß sein.',
      title: 'Bilddatei zu groß',
    })

    expect(
      getInfoImageUploadErrorMessage(
        new ApiError({
          errorCode: 'UNSUPPORTED_INFO_IMAGE_TYPE',
          message: 'unsupported',
          status: 415,
        }),
      ),
    ).toContain('JPEG-, PNG- und WebP-Bilder')
  })
})
