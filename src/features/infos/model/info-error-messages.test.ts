import { describe, expect, it } from 'vitest'

import {
  INFO_DIRECTORY_ERROR_MESSAGES,
  INFO_READ_ERROR_MESSAGES,
} from '@/features/infos/model/info-error-messages'

describe('Info error messages', () => {
  it('covers every Info-specific read and date-range failure', () => {
    expect(Object.keys(INFO_READ_ERROR_MESSAGES).sort()).toEqual([
      'INFO_NOT_FOUND',
      'INFO_STATUS_NOT_FOUND',
    ])
    expect(Object.keys(INFO_DIRECTORY_ERROR_MESSAGES).sort()).toEqual([
      'DATE_TIMEZONE_REQUIRED',
      'INVALID_DATE_RANGE',
    ])
  })
})
