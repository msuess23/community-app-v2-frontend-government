import { readOpenApiDocument } from './openapi-document.mjs'

const snapshotFile = new URL('../openapi/openapi.json', import.meta.url)
const document = await readOpenApiDocument(snapshotFile)
const pathCount = Object.keys(document.paths).length

console.log(
  `Validated OpenAPI ${document.openapi} snapshot for ${document.info.title} (${pathCount} paths).`,
)
