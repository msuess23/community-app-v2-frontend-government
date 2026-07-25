import { mkdir, writeFile } from 'node:fs/promises'

const openApiUrl =
  process.env.OPENAPI_URL ?? 'http://localhost:8000/api/v1/openapi.json'

const targetFile = new URL('../openapi/openapi.json', import.meta.url)

const response = await fetch(openApiUrl)

if (!response.ok) {
  throw new Error(
    `OpenAPI download failed: ${response.status} ${response.statusText}`,
  )
}

const document = await response.json()

await mkdir(new URL('../openapi', import.meta.url), {
  recursive: true,
})

await writeFile(targetFile, `${JSON.stringify(document, null, 2)}\n`, 'utf8')

console.log(`OpenAPI specification written to ${targetFile.pathname}`)
