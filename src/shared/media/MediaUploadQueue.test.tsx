import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MediaUploadQueue,
  type MediaUploadQueueHandle,
} from '@/shared/media/MediaUploadQueue'

const createObjectURL = vi.fn((file: File) => `blob:${file.name}`)
const revokeObjectURL = vi.fn()

beforeEach(() => {
  createObjectURL.mockClear()
  revokeObjectURL.mockClear()
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: createObjectURL,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectURL,
  })
})

describe('MediaUploadQueue', () => {
  it('uploads selected images sequentially with normalized required descriptions', async () => {
    const user = userEvent.setup()
    const calls: Array<{ description: string | null; file: File }> = []
    let activeUploads = 0
    let maximumConcurrentUploads = 0
    const onUpload = vi.fn(
      async (request: { description: string | null; file: File }) => {
        activeUploads += 1
        maximumConcurrentUploads = Math.max(
          maximumConcurrentUploads,
          activeUploads,
        )
        await Promise.resolve()
        calls.push(request)
        activeUploads -= 1
      },
    )

    render(
      <MediaUploadQueue
        accept="image/jpeg,image/png,image/webp"
        allowedMimeTypes={['image/jpeg', 'image/png', 'image/webp']}
        descriptionField={{
          label: 'Alternativtext',
          maxLength: 500,
          required: true,
        }}
        maxBytes={5 * 1024 * 1024}
        onUpload={onUpload}
      />,
    )

    const firstFile = new File(['first-image'], 'erste-datei.png', {
      type: 'image/png',
    })
    const secondFile = new File(['second-image'], 'zweite-datei.webp', {
      type: 'image/webp',
    })
    await user.upload(
      screen.getByLabelText('Bilddateien auswählen'),
      [firstFile, secondFile],
    )

    await user.type(
      screen.getByRole('textbox', {
        name: 'Alternativtext für erste-datei.png',
      }),
      '  Gesperrte   Parkstraße mit Umleitung  ',
    )
    await user.type(
      screen.getByRole('textbox', {
        name: 'Alternativtext für zweite-datei.webp',
      }),
      'Bühne auf dem Marktplatz',
    )
    await user.click(screen.getByRole('button', { name: 'Bilder hochladen' }))

    expect(await screen.findAllByText('Hochgeladen')).toHaveLength(2)
    expect(maximumConcurrentUploads).toBe(1)
    expect(calls).toEqual([
      {
        description: 'Gesperrte Parkstraße mit Umleitung',
        file: firstFile,
      },
      {
        description: 'Bühne auf dem Marktplatz',
        file: secondFile,
      },
    ])
  })

  it('blocks missing or overlong required descriptions before upload', async () => {
    const user = userEvent.setup()
    const onUpload = vi.fn(async () => undefined)

    render(
      <MediaUploadQueue
        accept="image/png"
        allowedMimeTypes={['image/png']}
        descriptionField={{
          label: 'Alternativtext',
          maxLength: 10,
          required: true,
        }}
        onUpload={onUpload}
      />,
    )

    const file = new File(['image'], 'plan.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Bilddateien auswählen'), file)
    await user.click(screen.getByRole('button', { name: 'Bilder hochladen' }))

    expect(screen.getByText('Alternativtext ist erforderlich.')).toBeVisible()
    expect(onUpload).not.toHaveBeenCalled()

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Alternativtext für plan.png' }),
      { target: { value: '12345678901' } },
    )
    await user.click(screen.getByRole('button', { name: 'Bilder hochladen' }))

    expect(
      screen.getByText('Alternativtext darf höchstens 10 Zeichen enthalten.'),
    ).toBeVisible()
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('keeps a failed image retryable and revokes its preview when removed', async () => {
    const user = userEvent.setup()
    const onUpload = vi
      .fn<(request: { description: string | null; file: File }) => Promise<void>>()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(undefined)

    render(
      <MediaUploadQueue
        accept="image/png"
        allowedMimeTypes={['image/png']}
        descriptionField={{ label: 'Alternativtext', required: true }}
        formatUploadError={() => 'Serverseitiger Uploadfehler'}
        onUpload={onUpload}
      />,
    )

    const file = new File(['image'], 'plan.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Bilddateien auswählen'), file)
    await user.type(
      screen.getByRole('textbox', { name: 'Alternativtext für plan.png' }),
      'Umleitungsplan',
    )
    await user.click(screen.getByRole('button', { name: 'Bilder hochladen' }))

    const queue = screen.getByRole('list', { name: 'Upload-Warteschlange' })
    expect(
      await within(queue).findByText('Serverseitiger Uploadfehler'),
    ).toBeVisible()
    await user.click(
      within(queue).getByRole('button', { name: 'Erneut versuchen: plan.png' }),
    )
    expect(await within(queue).findByText('Hochgeladen')).toBeVisible()

    await user.click(
      within(queue).getByRole('button', {
        name: 'Erledigten Eintrag entfernen: plan.png',
      }),
    )
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:plan.png')
    expect(
      screen.queryByRole('list', { name: 'Upload-Warteschlange' }),
    ).not.toBeInTheDocument()
  })

  it('reports pending local files and clears them through the imperative handle', async () => {
    const user = userEvent.setup()
    const queueRef = createRef<MediaUploadQueueHandle>()
    const onPendingChange = vi.fn()

    render(
      <MediaUploadQueue
        accept="image/png"
        allowedMimeTypes={['image/png']}
        onPendingChange={onPendingChange}
        onUpload={vi.fn(async () => undefined)}
        ref={queueRef}
      />,
    )

    await user.upload(
      screen.getByLabelText('Bilddateien auswählen'),
      new File(['image'], 'plan.png', { type: 'image/png' }),
    )

    expect(queueRef.current?.hasPendingItems()).toBe(true)
    expect(onPendingChange).toHaveBeenLastCalledWith(true)

    act(() => queueRef.current?.clearAll())

    expect(queueRef.current?.hasPendingItems()).toBe(false)
    expect(onPendingChange).toHaveBeenLastCalledWith(false)
    expect(
      screen.queryByRole('list', { name: 'Upload-Warteschlange' }),
    ).not.toBeInTheDocument()
  })

  it('supports deferred validation and prioritizes a selected primary image', async () => {
    const user = userEvent.setup()
    const queueRef = createRef<MediaUploadQueueHandle>()
    const calls: string[] = []
    const onUpload = vi.fn(async ({ file }: { file: File }) => {
      calls.push(file.name)
    })

    render(
      <MediaUploadQueue
        accept="image/png"
        allowedMimeTypes={['image/png']}
        descriptionField={{ label: 'Alternativtext', required: true }}
        onUpload={onUpload}
        primarySelection={{
          actionLabel: 'Als Titelbild vormerken',
          selectedLabel: 'Vorgemerktes Titelbild',
        }}
        ref={queueRef}
        showUploadAction={false}
      />,
    )

    const firstFile = new File(['first'], 'erstes.png', { type: 'image/png' })
    const secondFile = new File(['second'], 'zweites.png', {
      type: 'image/png',
    })
    await user.upload(
      screen.getByLabelText('Bilddateien auswählen'),
      [firstFile, secondFile],
    )
    let isValid = true
    act(() => {
      isValid = queueRef.current?.validateAll() ?? true
    })
    expect(isValid).toBe(false)
    expect(
      screen.getAllByText('Alternativtext ist erforderlich.'),
    ).toHaveLength(2)

    await user.type(
      screen.getByRole('textbox', { name: 'Alternativtext für erstes.png' }),
      'Erstes Bild',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Alternativtext für zweites.png' }),
      'Zweites Bild',
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Als Titelbild vormerken: zweites.png',
      }),
    )
    act(() => {
      isValid = queueRef.current?.validateAll() ?? false
    })
    expect(isValid).toBe(true)
    expect(
      screen.queryByRole('button', { name: 'Bilder hochladen' }),
    ).not.toBeInTheDocument()

    await act(async () => {
      await expect(queueRef.current?.uploadAll()).resolves.toEqual({
        attemptedCount: 2,
        failedCount: 0,
        uploadedCount: 2,
      })
    })
    expect(calls).toEqual(['zweites.png', 'erstes.png'])
  })
})
