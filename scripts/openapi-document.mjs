import { readFile } from 'node:fs/promises'

/** Rejects malformed documents before they reach the client generator. */
export function assertOpenApiDocument(document, sourceLabel) {
  if (!isRecord(document)) {
    throw new Error(`${sourceLabel} does not contain a JSON object.`)
  }

  if (
    typeof document.openapi !== 'string' ||
    !document.openapi.startsWith('3.')
  ) {
    throw new Error(`${sourceLabel} is not an OpenAPI 3 document.`)
  }

  if (!isRecord(document.info) || typeof document.info.title !== 'string') {
    throw new Error(`${sourceLabel} does not contain valid API information.`)
  }

  if (!isRecord(document.paths)) {
    throw new Error(`${sourceLabel} does not contain an OpenAPI paths object.`)
  }

  return document
}

/** Reads and validates a JSON OpenAPI document from the provided file URL. */
export async function readOpenApiDocument(fileUrl) {
  let contents

  try {
    contents = await readFile(fileUrl, 'utf8')
  } catch (error) {
    throw new Error(
      `Unable to read the OpenAPI snapshot at ${fileUrl.pathname}.`,
      { cause: error },
    )
  }

  let document

  try {
    document = JSON.parse(contents)
  } catch (error) {
    throw new Error(
      `The OpenAPI snapshot at ${fileUrl.pathname} is not valid JSON.`,
      { cause: error },
    )
  }

  return assertOpenApiDocument(document, fileUrl.pathname)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
