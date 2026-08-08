import { spawn } from 'node:child_process'
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { loadEnv } from 'vite'

const requestedCommand = process.argv[2]
const forwardedArgs = process.argv.slice(3)
const commandDefinition = getCommandDefinition(requestedCommand)

if (commandDefinition.androidProjectRequired) {
  await requireAndroidProject()
}

const loadedEnvironment = loadEnv(commandDefinition.mode, process.cwd(), '')
const apiBaseUrl =
  process.env.VITE_API_BASE_URL?.trim() ||
  loadedEnvironment.VITE_API_BASE_URL?.trim() ||
  '/api/v1'
const apiOrigin = resolveApiOrigin(apiBaseUrl, {
  requireAbsolute: commandDefinition.requireAbsoluteApi,
})
const runtimeDirectory = path.resolve('.tauri-runtime')
const runtimeConfigPath = path.join(runtimeDirectory, 'tauri.runtime.conf.json')

await mkdir(runtimeDirectory, { recursive: true })
await writeFile(
  runtimeConfigPath,
  `${JSON.stringify(createRuntimeConfig(apiOrigin, commandDefinition.development), null, 2)}\n`,
  'utf8',
)

const executable = process.platform === 'win32' ? 'tauri.cmd' : 'tauri'
const child = spawn(
  executable,
  [...commandDefinition.tauriArguments, '--config', runtimeConfigPath, ...forwardedArgs],
  { stdio: 'inherit', env: process.env },
)

child.on('error', (error) => {
  console.error(`Unable to start the local Tauri CLI: ${error.message}`)
  console.error('Run `npm ci` and make sure the Tauri system prerequisites are installed.')
  process.exitCode = 1
})

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Tauri terminated by signal ${signal}.`)
    process.exitCode = 1
    return
  }

  process.exitCode = code ?? 1
})

function getCommandDefinition(command) {
  switch (command) {
    case 'dev':
      return {
        tauriArguments: ['dev'],
        mode: 'development',
        development: true,
        requireAbsoluteApi: false,
        androidProjectRequired: false,
      }
    case 'build':
      return {
        tauriArguments: ['build'],
        mode: 'production',
        development: false,
        requireAbsoluteApi: true,
        androidProjectRequired: false,
      }
    case 'android-dev':
      return {
        tauriArguments: ['android', 'dev'],
        mode: 'development',
        development: true,
        requireAbsoluteApi: false,
        androidProjectRequired: true,
      }
    case 'android-run':
      return {
        tauriArguments: ['android', 'run'],
        mode: 'production',
        development: false,
        requireAbsoluteApi: true,
        androidProjectRequired: true,
      }
    case 'android-build':
      return {
        tauriArguments: ['android', 'build'],
        mode: 'production',
        development: false,
        requireAbsoluteApi: true,
        androidProjectRequired: true,
      }
    default:
      throw new Error(
        'Usage: node scripts/run-tauri.mjs <dev|build|android-dev|android-run|android-build> [...tauri arguments]',
      )
  }
}

async function requireAndroidProject() {
  const androidProject = path.resolve('src-tauri/gen/android')

  try {
    await access(androidProject)
  } catch {
    throw new Error(
      'The Tauri Android target is not initialized. Run `npm run native:android:init` first.',
    )
  }
}

function resolveApiOrigin(value, { requireAbsolute }) {
  if (value.startsWith('/')) {
    if (requireAbsolute) {
      throw new Error(
        'Native release builds require an absolute VITE_API_BASE_URL (for example https://api.example.com/api/v1).',
      )
    }
    return undefined
  }

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`VITE_API_BASE_URL is not a valid URL: ${value}`)
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL must use http: or https: for a native Tauri build.')
  }

  return url.origin
}

function createRuntimeConfig(apiOrigin, development) {
  const connectSources = ["'self'", 'ipc:', 'http://ipc.localhost']
  const imageSources = ["'self'", 'asset:', 'http://asset.localhost', 'blob:', 'data:']

  if (development) {
    connectSources.push('ws:', 'http://localhost:5173', 'http://127.0.0.1:5173')
  }

  if (apiOrigin) {
    connectSources.push(apiOrigin)
    imageSources.push(apiOrigin)
  }

  return {
    app: {
      security: {
        csp: {
          'default-src': "'self'",
          'base-uri': "'self'",
          'connect-src': connectSources.join(' '),
          'font-src': "'self' data:",
          'frame-ancestors': "'none'",
          'img-src': imageSources.join(' '),
          'object-src': "'none'",
          'script-src': "'self'",
          'style-src': "'self' 'unsafe-inline'",
        },
      },
    },
  }
}
