/** Represents one image after a feature adapter crossed its transport boundary. */
export type MediaAsset = Readonly<{
  altText: string | null
  height: number | null
  id: string
  isCover: boolean
  mimeType: string
  originalFilename: string
  sizeBytes: number
  uploadedAt: string
  url: string
  width: number | null
}>
