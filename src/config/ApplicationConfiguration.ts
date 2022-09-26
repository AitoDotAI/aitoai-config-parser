import path from 'path'
import fs from 'fs'
import AppRootPath from 'app-root-path'
import dotenv = require('dotenv-extended')

import { ConfigDeclaration, ParseFunction, NodeEnvironment, ConfigTypeOf } from './variables'

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function fileExists(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  return fs.existsSync(value)
}

function makeAbsolute(p: string): string {
  if (path.isAbsolute(p)) {
    return p
  } else {
    return path.resolve(process.cwd(), p)
  }
}

let processEnvConfig: undefined | dotenv.IEnvironmentMap

function getEnvironment(): dotenv.IEnvironmentMap {
  if (!processEnvConfig) {
    processEnvConfig = {}
    for (const key in process.env) {
      const value = process.env[key]
      if (typeof value === 'string') {
        processEnvConfig[key] = value
      }
    }
  }
  return processEnvConfig
}

function nodeEnvironment(): NodeEnvironment {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

function trim(s: string | undefined): string | undefined {
  if (s === undefined) {
    return undefined
  }

  return s.trim()
}

export function MakeApplicationConfiguration<T extends Record<string, ConfigDeclaration<any>>>(
  parse: ParseFunction<T>,
  configfilenames: string[] = [AppRootPath.resolve(`.env.${nodeEnvironment()}`), AppRootPath.resolve('.env')]
    .filter(isNonEmptyString)
    .filter(fileExists),
  defaultsFile: string | undefined = [AppRootPath.resolve(`.env.defaults.${nodeEnvironment()}`), AppRootPath.resolve('.env.defaults')]
    .filter(isNonEmptyString)
    .filter(fileExists)
    .shift(),
  parseOptions: {
    includeDefaultsOnMissingFile?: boolean
    loggerFn?: (msg: string) => void
  } = {},
): new () => ConfigTypeOf<T> {
  const { includeDefaultsOnMissingFile = true, loggerFn = (_s: string) => undefined } = parseOptions

  function loadFileConfig() {
    const defaultDotenvConfig = {
      assignToProcessEnv: false,
      includeProcessEnv: false,
      overrideProcessEnv: false,
    }

    const absoluteDefaultsFile = makeAbsolute(defaultsFile)

    const fileConfigFiles = configfilenames.map((cf) => makeAbsolute(cf)).filter((fqfn) => fs.existsSync(fqfn))

    const fileBasedConfig = fileConfigFiles
      .map((fp) => {
        // Load the config, but exclude process.env-values
        const loadedConfig = dotenv.load({
          ...defaultDotenvConfig,
          defaults: absoluteDefaultsFile,
          path: fp,
        })
        return loadedConfig
      })
      .reduceRight((acc: dotenv.IEnvironmentMap, next: dotenv.IEnvironmentMap) => {
        return { ...acc, ...next }
      }, {} as dotenv.IEnvironmentMap)

    let defaultConfig = {} as dotenv.IEnvironmentMap

    if (includeDefaultsOnMissingFile) {
      defaultConfig = dotenv.load({
        ...defaultDotenvConfig,
        defaults: absoluteDefaultsFile,
      })
    }

    loggerFn(
      `ApplicationConfiguration is parsing the following files for env variables: ${JSON.stringify([
        ...fileConfigFiles,
        absoluteDefaultsFile,
      ])}`,
    )

    return { ...defaultConfig, ...fileBasedConfig }
  }

  return class ApplicationConfiguration {
    constructor() {
      const fileBasedConfig = loadFileConfig()
      const environmentConfig = getEnvironment()
      const env = nodeEnvironment()

      const result = parse(environmentConfig, fileBasedConfig, env)

      Object.getOwnPropertyNames(result).forEach((name) => {
        Object.defineProperty(this, name, {
          enumerable: true,
          writable: false,
          value: result[name],
        })
      })
    }
  } as new () => ConfigTypeOf<T>
}
