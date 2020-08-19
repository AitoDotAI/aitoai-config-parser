import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import {
  ApplicationConfiguration,
  string,
  boolean,
  number,
} from '../../src/config/ApplicationConfiguration'
import { v4 as uuid } from 'uuid'

describe('ApplicationConfiguration', () => {
  let nodeEnv: string
  let appConfig: ApplicationConfiguration
  let appConfigWithDefaults: ApplicationConfiguration
  let missingAppConfig: ApplicationConfiguration

  const testConfigFile = resolve(__dirname, '.env.appconfig.test')
  const testDefaultsFile = resolve(__dirname, '.env.test.appconfig.defaults')

  const createConfigFromMissingFile = (): ApplicationConfiguration => {
    const temp = uuid()
    const missingFile = resolve(__dirname, temp)
    expect(existsSync(missingFile)).toBeFalsy()

    return new ApplicationConfiguration([missingFile], testDefaultsFile)
  }

  beforeEach(async () => {
    nodeEnv = process.env.NODE_ENV || 'test'
    appConfig = new ApplicationConfiguration([testConfigFile])
    appConfigWithDefaults = new ApplicationConfiguration([testConfigFile], testDefaultsFile)
    missingAppConfig = createConfigFromMissingFile()
  })

  afterEach(async () => {
    (process.env as any).NODE_ENV = nodeEnv
  })

  it('should load the config from the specified file', () => {
    expect(appConfig.getOptionalEnv('A_STRING_VALUE', string)).toEqual(
      'A_CONFIG_VALUE',
    )
    expect(appConfig.getOptionalEnv('A_BOOLEAN_VALUE', boolean)).toEqual(true)
    expect(appConfig.getOptionalEnv('A_NUMBER_VALUE', number)).toEqual(123)
  })

  it('should return undefined for missing optional values ', () => {
    expect(appConfig.getOptionalEnv('NON_EXISTING', string)).toBeUndefined()
  })

  it('should throw error for missing required variable', () => {
    function call() {
      appConfig.getRequiredEnv('NON_EXISTING', string)
    }

    expect(call).toThrowError(/Required environment variable NON_EXISTING/)
  })

  it('should fail for production values coming from config file when in production', () => {
    (process.env as any).NODE_ENV = 'production'

    function call() {
      appConfig.getProductionEnv('A_STRING_VALUE', string)
    }

    expect(call).toThrowError(/Required environment variable A_STRING_VALUE/)
  })

  it('should accept defaults for ProductionEnv when not in production', () => {
    expect(appConfig.getProductionEnv('A_STRING_VALUE', string)).toEqual(
      'A_CONFIG_VALUE',
    )
  })

  it('should throw exception if casting wrong type to boolean', () => {
    function call() {
      appConfig.getOptionalEnv('A_NUMBER_VALUE', boolean)
    }

    expect(call).toThrowError(/Non-boolean value found/)
  })

  it('should throw exception if casting wrong type to number', () => {
    function call() {
      appConfig.getOptionalEnv('A_STRING_VALUE', number)
    }

    expect(call).toThrowError(/Non-number value found/)
  })

  it('should allow empty value for config', () => {
    expect(appConfig.getOptionalEnv('AN_EMPTY_VALUE', string)).toEqual(
      ''
    )
  })

  it('should be true that there is a defaults file', () => {
    expect(existsSync(testDefaultsFile)).toBeTruthy()
    expect(readFileSync(testDefaultsFile, { encoding: 'utf8' }).match(/PORT=\d+/))
  })

  it('should use defaults for keys not find in config', () => {
    expect(missingAppConfig.getRequiredEnv('PORT', number)).toBeGreaterThan(0)
  })

  it('should by default load defaults even in case the actual file is not found', () => {
    expect(missingAppConfig.getRequiredEnv('PORT', number)).toBeGreaterThan(0)
    expect(missingAppConfig.getRequiredEnv('A_STRING_VALUE', string)).toEqual('OVERRIDE_OF_THE_ACTUAL_VALUES_IN_ENV_DEFAULTS')
  })

  it('should allow not to load defaults on config when the actual file is not found', () => {
    const temp = uuid()
    const missingFile = resolve(__dirname, temp)
    expect(existsSync(missingFile)).toBeFalsy()

    appConfig = new ApplicationConfiguration([missingFile], testDefaultsFile, false)

    expect(appConfig.getOptionalEnv('PORT', number)).toBeUndefined()
  })

  it('should not override config values with defaults', () => {
    expect(appConfigWithDefaults.getRequiredEnv('A_STRING_VALUE', string)).toEqual(
      'A_CONFIG_VALUE',
    )

    expect(missingAppConfig.getRequiredEnv('A_STRING_VALUE', string)).toEqual(
      'OVERRIDE_OF_THE_ACTUAL_VALUES_IN_ENV_DEFAULTS',
    )
  })

  it('should leave keys empty if defaults file not found', () => {
    const temp = uuid()
    const missingFile = resolve(__dirname, temp)
    expect(existsSync(missingFile)).toBeFalsy()

    appConfig = new ApplicationConfiguration([missingFile], missingFile, false)

    expect(appConfig.getOptionalEnv('PORT', number)).toBeUndefined()
  })



})
