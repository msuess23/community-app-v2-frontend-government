import type { Page } from '@playwright/test'

export const INFO_ID = '00000000-0000-4000-8000-000000000100'
export const OFFICE_ID = '00000000-0000-4000-8000-000000000010'
export const IMAGE_ID = '00000000-0000-4000-8000-000000000130'

export async function installInfoApi(page: Page): Promise<string[]> {
  const listRequests: string[] = []

  await page.route('**/api/v1/offices**', async (route) => {
    const url = new URL(route.request().url())
    const data = [officeResponse()]

    if (url.pathname === '/api/v1/offices') {
      await route.fulfill({
        contentType: 'application/json',
        json: { data, page: 1, pages: 1, size: 20, total: 1 },
        status: 200,
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      json: officeResponse(),
      status: 200,
    })
  })

  await page.route('**/api/v1/infos**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path.endsWith(`/images/${IMAGE_ID}/content`)) {
      await route.fulfill({
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
        contentType: 'image/png',
        status: 200,
      })
      return
    }

    if (path === '/api/v1/infos') {
      listRequests.push(url.searchParams.toString())
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: [infoResponse()],
          page: 1,
          pages: 1,
          size: Number(url.searchParams.get('size') ?? 20),
          total: 1,
        },
        status: 200,
      })
      return
    }

    if (path.endsWith('/images')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [imageResponse()],
        status: 200,
      })
      return
    }

    if (path.endsWith('/status')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [infoResponse().current_status],
        status: 200,
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      json: infoResponse(),
      status: 200,
    })
  })

  return listRequests
}

function infoResponse() {
  return {
    address: {
      city: 'Leipzig',
      house_number: '12a',
      id: 'address-1',
      latitude: 51.34,
      longitude: 12.37,
      street: 'Musterstraße',
      zip_code: '04109',
    },
    category: 'EVENT',
    created_at: '2026-08-01T08:00:00Z',
    current_status: {
      created_at: '2026-08-02T08:00:00Z',
      id: 'status-active',
      message: 'Findet wie geplant statt.',
      status: 'ACTIVE',
    },
    description: 'Sommerfest mit Bühnenprogramm.',
    ends_at: '2026-08-12T20:00:00Z',
    id: INFO_ID,
    image_url: `/api/v1/infos/${INFO_ID}/images/${IMAGE_ID}/content`,
    office_id: OFFICE_ID,
    starts_at: '2026-08-12T15:00:00Z',
    title: 'Stadtteilfest',
    updated_at: '2026-08-02T08:00:00Z',
  }
}

function imageResponse(
  overrides: Readonly<{
    altText?: string
    id?: string
    isCover?: boolean
    originalFilename?: string
  }> = {},
) {
  const id = overrides.id ?? IMAGE_ID
  return {
    alt_text:
      overrides.altText ??
      'Bühne und Informationsstände auf dem Leipziger Markt',
    height: 1,
    id,
    info_id: INFO_ID,
    is_cover: overrides.isCover ?? true,
    mime_type: 'image/png',
    original_filename: overrides.originalFilename ?? 'markt.png',
    size_bytes: 68,
    uploaded_at: '2026-08-01T08:00:00Z',
    url: `/api/v1/infos/${INFO_ID}/images/${id}/content`,
    width: 1,
  }
}

function officeResponse() {
  return {
    address: null,
    contact_email: 'ordnung@example.com',
    description: null,
    id: OFFICE_ID,
    metadata: {
      created_at: '2026-01-01T08:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: 'Ordnungsamt',
    opening_hours: null,
    phone: null,
    services: [],
  }
}

export async function installInfoManagementApi(page: Page): Promise<{
  create: unknown
  requestOrder: string[]
  update: unknown
  uploadBodies: string[]
}> {
  const requests = {
    create: null as unknown,
    requestOrder: [] as string[],
    update: null as unknown,
    uploadBodies: [] as string[],
  }
  let storedInfo: Record<string, unknown> = infoResponse()
  let images: Array<ReturnType<typeof imageResponse>> = []

  await page.route('**/api/v1/offices**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/v1/offices') {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: [officeResponse()],
          page: 1,
          pages: 1,
          size: 20,
          total: 1,
        },
        status: 200,
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      json: officeResponse(),
      status: 200,
    })
  })

  await page.route('**/api/v1/infos**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path === '/api/v1/infos' && request.method() === 'POST') {
      requests.requestOrder.push('info')
      const body = request.postDataJSON() as Record<string, unknown>
      requests.create = body
      storedInfo = {
        ...storedInfo,
        ...body,
        address: body.address
          ? {
              id: 'address-1',
              latitude: null,
              longitude: null,
              ...(body.address as Record<string, unknown>),
            }
          : null,
        created_at: '2026-08-04T08:00:00Z',
        current_status: {
          created_at: '2026-08-04T08:00:00Z',
          id: 'status-created',
          message: 'Created',
          status: 'SCHEDULED',
        },
        id: INFO_ID,
        image_url: null,
        updated_at: '2026-08-04T08:00:00Z',
      }
      await route.fulfill({
        contentType: 'application/json',
        json: storedInfo,
        status: 201,
      })
      return
    }

    if (
      path === `/api/v1/infos/${INFO_ID}/images` &&
      request.method() === 'POST'
    ) {
      requests.requestOrder.push('image')
      const body = request.postDataBuffer()?.toString('utf8') ?? ''
      requests.uploadBodies.push(body)
      const imageNumber = images.length + 1
      const uploaded = imageResponse({
        altText: readMultipartValue(body, 'alt_text'),
        id: `created-image-${imageNumber}`,
        isCover: images.length === 0,
        originalFilename: readMultipartFilename(body) ?? 'upload.png',
      })
      images = [...images, uploaded]
      if (uploaded.is_cover) {
        storedInfo = { ...storedInfo, image_url: uploaded.url }
      }
      await route.fulfill({
        contentType: 'application/json',
        json: uploaded,
        status: 201,
      })
      return
    }

    if (path === `/api/v1/infos/${INFO_ID}` && request.method() === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>
      requests.update = body
      storedInfo = {
        ...storedInfo,
        ...body,
        address:
          body.address === undefined
            ? storedInfo.address
            : body.address === null
              ? null
              : {
                  ...((storedInfo.address as
                    | Record<string, unknown>
                    | null) ?? {}),
                  ...(body.address as Record<string, unknown>),
                },
        updated_at: '2026-08-04T09:00:00Z',
      }
      await route.fulfill({
        contentType: 'application/json',
        json: storedInfo,
        status: 200,
      })
      return
    }

    if (path === '/api/v1/infos') {
      await route.fulfill({
        contentType: 'application/json',
        json: { data: [], page: 1, pages: 0, size: 20, total: 0 },
        status: 200,
      })
      return
    }

    if (path.endsWith('/images')) {
      await route.fulfill({
        contentType: 'application/json',
        json: images,
        status: 200,
      })
      return
    }

    if (path.endsWith('/status')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [storedInfo.current_status],
        status: 200,
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      json: storedInfo,
      status: 200,
    })
  })

  return requests
}

export async function installInfoImageManagementApi(page: Page): Promise<{
  coverImageIds: string[]
  deletedImageIds: string[]
  maximumConcurrentUploads: number
  uploadBodies: string[]
}> {
  const state = {
    coverImageIds: [] as string[],
    deletedImageIds: [] as string[],
    maximumConcurrentUploads: 0,
    uploadBodies: [] as string[],
  }
  let activeUploads = 0
  let uploadSequence = 0
  let images: Array<ReturnType<typeof imageResponse>> = [imageResponse()]

  await page.route('**/api/v1/offices**', async (route) => {
    const url = new URL(route.request().url())
    await route.fulfill({
      contentType: 'application/json',
      json:
        url.pathname === '/api/v1/offices'
          ? {
              data: [officeResponse()],
              page: 1,
              pages: 1,
              size: 20,
              total: 1,
            }
          : officeResponse(),
      status: 200,
    })
  })

  await page.route('**/api/v1/infos**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path.endsWith('/content')) {
      await route.fulfill({
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
        contentType: 'image/png',
        status: 200,
      })
      return
    }

    if (path === `/api/v1/infos/${INFO_ID}/images` && request.method() === 'POST') {
      activeUploads += 1
      state.maximumConcurrentUploads = Math.max(
        state.maximumConcurrentUploads,
        activeUploads,
      )
      const body = request.postDataBuffer()?.toString('utf8') ?? ''
      state.uploadBodies.push(body)
      uploadSequence += 1
      await new Promise((resolve) => setTimeout(resolve, 25))
      const altText = readMultipartValue(body, 'alt_text')
      const filename = readMultipartFilename(body) ?? `upload-${uploadSequence}.png`
      const uploaded = imageResponse({
        altText,
        id: `image-upload-${uploadSequence}`,
        isCover: images.length === 0,
        originalFilename: filename,
      })
      images = [...images, uploaded]
      activeUploads -= 1
      await route.fulfill({
        contentType: 'application/json',
        json: uploaded,
        status: 201,
      })
      return
    }

    if (path === `/api/v1/infos/${INFO_ID}/images` && request.method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        json: images,
        status: 200,
      })
      return
    }

    const coverMatch = path.match(/\/images\/([^/]+)\/cover$/)
    if (coverMatch && request.method() === 'PUT') {
      const imageId = coverMatch[1]
      state.coverImageIds.push(imageId)
      images = images.map((image) => ({
        ...image,
        is_cover: image.id === imageId,
      }))
      await route.fulfill({
        contentType: 'application/json',
        json: images.find((image) => image.id === imageId),
        status: 200,
      })
      return
    }

    const deleteMatch = path.match(/\/images\/([^/]+)$/)
    if (deleteMatch && request.method() === 'DELETE') {
      const imageId = deleteMatch[1]
      state.deletedImageIds.push(imageId)
      const deletedCover = images.find((image) => image.id === imageId)?.is_cover
      images = images.filter((image) => image.id !== imageId)
      if (deletedCover && images.length > 0) {
        images = images.map((image, index) => ({
          ...image,
          is_cover: index === 0,
        }))
      }
      await route.fulfill({ status: 204 })
      return
    }

    if (path.endsWith('/status')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [infoResponse().current_status],
        status: 200,
      })
      return
    }

    const cover = images.find((image) => image.is_cover)
    await route.fulfill({
      contentType: 'application/json',
      json: {
        ...infoResponse(),
        image_url: cover?.url ?? null,
      },
      status: 200,
    })
  })

  return state
}

export async function installInfoLifecycleApi(page: Page): Promise<{
  deletedInfoIds: string[]
  statusUpdates: unknown[]
}> {
  const requests = {
    deletedInfoIds: [] as string[],
    statusUpdates: [] as unknown[],
  }
  let deleted = false
  let storedInfo: Record<string, unknown> = infoResponse()
  let statusHistory: Array<Record<string, unknown>> = [
    infoResponse().current_status,
  ]

  await page.route('**/api/v1/offices**', async (route) => {
    const url = new URL(route.request().url())

    await route.fulfill({
      contentType: 'application/json',
      json:
        url.pathname === '/api/v1/offices'
          ? {
              data: [officeResponse()],
              page: 1,
              pages: 1,
              size: 20,
              total: 1,
            }
          : officeResponse(),
      status: 200,
    })
  })

  await page.route('**/api/v1/infos**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path.endsWith('/content')) {
      await route.fulfill({
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
        contentType: 'image/png',
        status: 200,
      })
      return
    }

    if (
      path === `/api/v1/infos/${INFO_ID}/status` &&
      request.method() === 'PUT'
    ) {
      const body = request.postDataJSON() as {
        message: string | null
        status: string
      }
      requests.statusUpdates.push(body)
      const entry = {
        created_at: '2026-08-05T08:00:00Z',
        id: 'status-cancelled',
        message: body.message,
        status: body.status,
      }
      statusHistory = [entry, ...statusHistory]
      storedInfo = {
        ...storedInfo,
        current_status: entry,
        updated_at: entry.created_at,
      }
      await route.fulfill({
        contentType: 'application/json',
        json: entry,
        status: 200,
      })
      return
    }

    if (path === `/api/v1/infos/${INFO_ID}` && request.method() === 'DELETE') {
      requests.deletedInfoIds.push(INFO_ID)
      deleted = true
      await route.fulfill({ status: 204 })
      return
    }

    if (path === '/api/v1/infos') {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: deleted ? [] : [storedInfo],
          page: 1,
          pages: deleted ? 0 : 1,
          size: 20,
          total: deleted ? 0 : 1,
        },
        status: 200,
      })
      return
    }

    if (path.endsWith('/images')) {
      await route.fulfill({
        contentType: 'application/json',
        json: deleted ? [] : [imageResponse()],
        status: 200,
      })
      return
    }

    if (path.endsWith('/status')) {
      await route.fulfill({
        contentType: 'application/json',
        json: deleted ? [] : statusHistory,
        status: 200,
      })
      return
    }

    if (deleted) {
      await route.fulfill({
        contentType: 'application/json',
        json: { error_code: 'INFO_NOT_FOUND', message: 'Info not found' },
        status: 404,
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      json: storedInfo,
      status: 200,
    })
  })

  return requests
}

function readMultipartValue(body: string, fieldName: string): string {
  const pattern = new RegExp(
    `name="${fieldName}"\\r?\\n\\r?\\n([^\\r\\n]+)`,
  )
  return pattern.exec(body)?.[1] ?? ''
}

function readMultipartFilename(body: string): string | null {
  return /filename="([^"]+)"/.exec(body)?.[1] ?? null
}
