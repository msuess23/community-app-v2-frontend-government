import { describe, expect, it } from 'vitest'

import {
  mapInfoImageResponse,
  mapInfoResponse,
} from '@/features/infos/model/info-mapper'

describe('Info DTO mapping', () => {
  it('maps current master data without exposing snake-case fields', () => {
    const mapped = mapInfoResponse({
      address: {
        city: 'Leipzig',
        house_number: '3',
        id: 'address-1',
        latitude: 51.34,
        longitude: 12.37,
        street: 'Markt',
        zip_code: '04109',
      },
      category: 'EVENT',
      created_at: '2026-08-01T08:00:00Z',
      current_status: {
        created_at: '2026-08-02T08:00:00Z',
        id: 'status-1',
        message: 'Findet wie geplant statt.',
        status: 'ACTIVE',
      },
      description: 'Sommerfest auf dem Markt.',
      ends_at: '2026-08-12T20:00:00Z',
      id: 'info-1',
      image_url: '/api/v1/infos/info-1/images/image-1/content',
      office_id: 'office-1',
      starts_at: '2026-08-12T15:00:00Z',
      title: 'Stadtteilfest',
      updated_at: '2026-08-02T08:00:00Z',
    })

    expect(mapped.address?.city).toBe('Leipzig')
    expect(mapped.currentStatus.status).toBe('ACTIVE')
    expect(mapped.imageUrl).toContain('/images/image-1/content')
  })

  it('preserves the mandatory Info-image alternative text in shared media data', () => {
    const mapped = mapInfoImageResponse({
      alt_text: 'Bühne und Stände auf dem Leipziger Markt',
      height: 800,
      id: 'image-1',
      info_id: 'info-1',
      is_cover: true,
      mime_type: 'image/webp',
      original_filename: 'markt.webp',
      size_bytes: 123456,
      uploaded_at: '2026-08-01T08:00:00Z',
      url: '/api/v1/infos/info-1/images/image-1/content',
      width: 1200,
    })

    expect(mapped.altText).toBe('Bühne und Stände auf dem Leipziger Markt')
    expect(mapped.isCover).toBe(true)
  })
})
