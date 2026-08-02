import { mkdir, writeFile } from 'node:fs/promises'

import { assertOpenApiDocument } from './openapi-document.mjs'

const openApiUrl =
  process.env.OPENAPI_URL ?? 'http://localhost:8000/api/v1/openapi.json'
const targetFile = new URL('../openapi/openapi.json', import.meta.url)

const response = await fetch(openApiUrl)

if (!response.ok) {
  throw new Error(
    `OpenAPI download failed: ${response.status} ${response.statusText}`,
  )
}

const document = assertOpenApiDocument(
  await response.json(),
  `OpenAPI response from ${openApiUrl}`,
)

await mkdir(new URL('../openapi', import.meta.url), {
  recursive: true,
})
await writeFile(targetFile, `${JSON.stringify(document, null, 2)}\n`, 'utf8')

console.log(`OpenAPI specification written to ${targetFile.pathname}`)
