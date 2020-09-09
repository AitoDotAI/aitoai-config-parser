import path from "path"
import fs from 'fs'
import dotenv = require('dotenv-extended')

import {
  ConfigDeclaration,
  ParseFunction,
  NodeEnvironment,
  ConfigTypeOf,
} from "./variables"

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function makeAbsolute(p: string): string {
  if (path.isAbsolute(p)) {
    return p
  } else {
    return path.resolve(process.cwd(), p)
  }
}

let processEnvConfig: undefined | dotenv.IEnvironmentMap

function getEnvironment(): dotenv.IEnvironmentMap  {
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

export function MakeApplicationConfiguration<T extends Record<string, ConfigDeclaration<any>>>(
  parse: ParseFunction<T>,
  configfilenames: string[] = [
    `${process.env.AITO_CONFIG_DIR}/.env.${process.env.NODE_ENV}`,
    `.env.${process.env.NODE_ENV}`,
    `${process.env.AITO_CONFIG_DIR}/.env`,
    process.env.DOTENV_CONFIG_PATH,
    '.env'
  ].filter(isNonEmptyString),
  defaultsFile: string = [
    process.env.DOTENV_CONFIG_DEFAULTS,
    `${process.env.AITO_CONFIG_DIR}/.env.defaults`,
    '.env.defaults'
  ].filter(isNonEmptyString)[0],
  includeDefaultsOnMissingFile = true,
  traceLevelLogging = false,
): (new() => ConfigTypeOf<T>) {
  function loadFileConfig() {
    const defaultDotenvConfig = {
      assignToProcessEnv: false,
      includeProcessEnv: false,
      overrideProcessEnv: false,
    }

    const fileConfigFiles = configfilenames
      .map(cf => makeAbsolute(cf))
      .filter(fqfn => fs.existsSync(fqfn))

    const fileBasedConfig = fileConfigFiles
      .map(fp => {
        // Load the config, but exclude process.env-values
        const loadedConfig = dotenv.load({
          ...defaultDotenvConfig,
          defaults: defaultsFile,
          path: fp,
        })
        return loadedConfig
      })
      .reduceRight(
        (acc: dotenv.IEnvironmentMap, next: dotenv.IEnvironmentMap) => {
          return { ...acc, ...next }
        },
        {} as dotenv.IEnvironmentMap,
      )

    let defaultConfig = {} as dotenv.IEnvironmentMap

    if (includeDefaultsOnMissingFile) {
      defaultConfig = dotenv.load({
        ...defaultDotenvConfig,
        defaults: defaultsFile,
      })
    }

    if (traceLevelLogging) {
      console.log(`EnvironmentConfig is parsing the following files for env variables: ${JSON.stringify([...fileConfigFiles, defaultsFile])}`)
    }

    return { ...defaultConfig, ...fileBasedConfig }
  }

  return class ApplicationConfiguration {
    constructor() {
      const fileBasedConfig = loadFileConfig()
      const environmentConfig = getEnvironment()
      const env = nodeEnvironment()

      const result = parse(environmentConfig, fileBasedConfig, env)

      Object.getOwnPropertyNames(result).forEach((name) => {
        Object.defineProperty(this, name, { enumerable: true, writable: false })
      })
    }
  } as new() => ConfigTypeOf<T>
}
