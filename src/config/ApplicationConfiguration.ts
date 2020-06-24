import * as path from 'path'
import * as fs from 'fs'
import { inspect } from 'util'
import * as _ from 'lodash'
import dotenv = require('dotenv-extended')

/* tslint:disable:no-console */
const PRODUCTION_NODE_ENV = 'production'
const DEVELOPMENT_NODE_ENV = 'development'

export function string(val: any): string {
  return String(val)
}

export function boolean(val: any, name: string): boolean {
  if (val !== 'true' && val !== 'false') {
    throw new Error(
      `${name} is invalid. Non-boolean value found: ${inspect(val)}`,
    )
  }
  return val === 'true'
}

export function number(val: any, name: string): number {
  const num = Number(val)
  if (!_.isFinite(num)) {
    throw new Error(
      `${name} is invalid. Non-number value found: ${inspect(val)}`,
    )
  }
  return num
}

/**
 * Handles the application configuration by separating the values coming from config files
 * and from shell variables, rather than simply writing the values directly to process.env
 */
export class ApplicationConfiguration {
  private readonly fileConfig: dotenv.IEnvironmentMap
  private readonly processEnvConfig: dotenv.IEnvironmentMap

  private readonly defaultDotenvConfig = {
    assignToProcessEnv: false,
    includeProcessEnv: false,
    overrideProcessEnv: false,
  }

  /**
   * Create the configuration map by reading the files from left to right. Order is MSV, so
   * values are set on first encounter, and treated as immutable
   *
   * @param configfilenames array of config files to parse. '.env.default' is implicit and does not need to be specified
   */
  constructor(
    configfilenames: string[] = [`.env.${process.env.NODE_ENV}`, '.env'],
    defaultsFile: string = '.env.defaults',
    includeDefaultsOnMissingFile: boolean = true,
    traceLevelLogging: boolean = false,
  ) {
    const makeAbsolute = (p: string): string => {
      if (path.isAbsolute(p)) {
        return p
      } else {
        return path.resolve(process.cwd(), p)
      }
    }

    const fileBasedConfig = configfilenames
      .map(cf => makeAbsolute(cf))
      .filter(fqfn => fs.existsSync(fqfn))
      .map(fp => {
        // Load the config, but exclude process.env-values
        const loadedConfig = dotenv.load({
          ...this.defaultDotenvConfig,
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

    const defaultConfig = this.getDefaultConfig(
      defaultsFile,
      includeDefaultsOnMissingFile,
    )
    this.fileConfig = { ...defaultConfig, ...fileBasedConfig }
    this.processEnvConfig = process.env
  }

  private static getValue<A>(
    from: dotenv.IEnvironmentMap[],
    name: string,
    castType: (val: any, name: string) => A,
    assertValueExist: boolean = false,
  ): A {
    const envMap: dotenv.IEnvironmentMap = from.find(
      iem => !_.isUndefined(iem[name]),
    )
    let typedValue: A

    if (envMap) {
      typedValue = castType(envMap[name], name)
    }

    if (assertValueExist && _.isUndefined(typedValue)) {
      throw new Error(
        `Required environment variable ${name} is not set properly`,
      )
    }

    return typedValue
  }

  private getDefaultConfig(
    defaultsFile: string,
    loadFile: boolean = true,
  ): dotenv.IEnvironmentMap {
    let defaultValues = {} as dotenv.IEnvironmentMap

    if (loadFile) {
      defaultValues = dotenv.load({
        defaults: defaultsFile,
        ...this.defaultDotenvConfig,
      })
    }

    return defaultValues
  }

  public getRequiredEnv<A>(
    name: string,
    castType: (val: any, name: string) => A,
  ): A {
    return ApplicationConfiguration.getValue(
      [this.processEnvConfig, this.fileConfig],
      name,
      castType,
      true,
    )
  }

  public getOptionalEnv<A>(
    name: string,
    castType: (val: any, name: string) => A,
  ): A {
    return ApplicationConfiguration.getValue(
      [this.processEnvConfig, this.fileConfig],
      name,
      castType,
      false,
    )
  }

  /**
   * In production the values must come from process.env[key], not the .env-files, as we're
   * assuming the server should not contain the values written in (version controlled) files
   *
   * @param name
   * @param castType
   */
  public getProductionEnv<A>(
    name: string,
    castType: (val: any, name: string) => A,
  ): A {
    const acceptedConfig = [this.processEnvConfig]
    if (process.env.NODE_ENV !== PRODUCTION_NODE_ENV) {
      acceptedConfig.push(this.fileConfig)
    }
    return ApplicationConfiguration.getValue(
      acceptedConfig,
      name,
      castType,
      true,
    )
  }
}
