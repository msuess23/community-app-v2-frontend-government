import type { ReactNode } from 'react'

export type MediaUploadRequest = Readonly<{
  description: string | null
  file: File
}>

export type MediaUploadDescriptionField = Readonly<{
  description?: ReactNode
  label: string
  maxLength?: number
  placeholder?: string
  required?: boolean
}>

export type MediaUploadSummary = Readonly<{
  attemptedCount: number
  failedCount: number
  uploadedCount: number
}>

export interface MediaUploadQueueHandle {
  clearAll: () => void
  hasItems: () => boolean
  hasPendingItems: () => boolean
  uploadAll: () => Promise<MediaUploadSummary>
  validateAll: () => boolean
}

export type MediaUploadPrimarySelection = Readonly<{
  actionLabel: string
  description?: ReactNode
  selectedLabel: string
}>

export type MediaUploadState = 'failed' | 'ready' | 'uploaded' | 'uploading'

export type MediaUploadItem = Readonly<{
  description: string
  errorMessage: string | null
  file: File
  id: string
  isPrimary: boolean
  previewUrl: string | null
  state: MediaUploadState
}>

export type MediaUploadValidationOptions = Readonly<{
  allowedMimeTypes?: readonly string[]
  descriptionField?: MediaUploadDescriptionField
  maxBytes?: number
}>
