/** Valid 2x2 PNG used to exercise the real Pillow-backed upload path. */
export const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGMUqTjBwMDAxMDAwMDAAAAPZgFY4x2sBwAAAABJRU5ErkJggg==',
  'base64',
)

/** Minimal PDF accepted by the backend's signature/trailer validation. */
export const VALID_PDF = Buffer.from('%PDF-1.4\n% Full-stack test document\n%%EOF\n')
