import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import {
  MakeApplicationConfiguration,
  string,
  boolean,
  number,
  variable,
  optional,
  parseVariables,
  required,
  productionVariable,
} from '../../src/config'
import { v4 as uuid } from 'uuid'

const parseTestVariables = parseVariables({
  A_STRING_VALUE: variable(optional(string)),
  A_BOOLEAN_VALUE: variable(optional(boolean)),
  A_NUMBER_VALUE: variable(optional(number)),
  AN_EMPTY_VALUE: variable(optional(string)),
  PORT: variable(optional(number)),
})

const parseRequiredVariables = parseVariables({
  A_REQUIRED_STRING_VALUE: variable(required(string)),
})

const parseProductionVariables = parseVariables({
  A_STRING_VALUE: productionVariable(required(string)),
})

type TestConfig = ReturnType<typeof parseTestVariables>

describe('ApplicationConfiguration', () => {
  let nodeEnv: string
  let appConfig: TestConfig
  let appConfigWithDefaults: TestConfig
  let missingAppConfig: TestConfig

  const testConfigFile = resolve(__dirname, '.env.appconfig.test')
  const testDefaultsFile = resolve(__dirname, '.env.test.appconfig.defaults')

  const createConfigFromMissingFile = (): TestConfig => {
    const temp = uuid()
    const missingFile = resolve(__dirname, temp)
    expect(existsSync(missingFile)).toBeFalsy()

    return new (MakeApplicationConfiguration(parseTestVariables, [missingFile], testDefaultsFile))
  }

  beforeEach(async () => {
    nodeEnv = process.env.NODE_ENV || 'test'
    appConfig = new (MakeApplicationConfiguration(parseTestVariables, [testConfigFile]))
    appConfigWithDefaults = new (MakeApplicationConfiguration(parseTestVariables, [testConfigFile], testDefaultsFile))
    missingAppConfig = createConfigFromMissingFile()
  })

  afterEach(async () => {
    (process.env as any).NODE_ENV = nodeEnv
  })

  it('should load the config from the specified file', () => {
    expect(appConfig.A_STRING_VALUE).toEqual('A_CONFIG_VALUE')
    expect(appConfig.A_BOOLEAN_VALUE).toEqual(true)
    expect(appConfig.A_NUMBER_VALUE).toEqual(123)
  })

  it('should throw error for missing required variable', () => {
    function call() {
      new (MakeApplicationConfiguration(parseRequiredVariables, [testConfigFile], testDefaultsFile))
    }

    expect(call).toThrowError(/A_REQUIRED_STRING_VALUE is invalid: environment variable is not set properly/)
  })

  it('should fail for production values coming from config file when in production', () => {
    (process.env as any).NODE_ENV = 'production'

    function call() {
      new (MakeApplicationConfiguration(parseProductionVariables, [testConfigFile], testDefaultsFile))
    }

    expect(call).toThrowError(/A_STRING_VALUE is invalid: environment variable is not set properly/)
  })

  it('should accept defaults for ProductionEnv when not in production', () => {
    const config = new (MakeApplicationConfiguration(parseProductionVariables, [testConfigFile], testDefaultsFile))

    expect(config.A_STRING_VALUE).toEqual('A_CONFIG_VALUE')
  })

  it('should allow empty value for config', () => {
    expect(appConfig.AN_EMPTY_VALUE).toEqual('')
  })

  it('should be true that there is a defaults file', () => {
    expect(existsSync(testDefaultsFile)).toBeTruthy()
    expect(readFileSync(testDefaultsFile, { encoding: 'utf8' }).match(/PORT=\d+/))
  })

  it('should use defaults for keys not find in config', () => {
    expect(missingAppConfig.PORT).toBeGreaterThan(0)
  })

  it('should by default load defaults even in case the actual file is not found', () => {
    expect(missingAppConfig.PORT).toBeGreaterThan(0)
    expect(missingAppConfig.A_STRING_VALUE).toEqual('OVERRIDE_OF_THE_ACTUAL_VALUES_IN_ENV_DEFAULTS')
  })

  it('should allow not to load defaults on config when the actual file is not found', () => {
    const temp = uuid()
    const missingFile = resolve(__dirname, temp)
    expect(existsSync(missingFile)).toBeFalsy()

    appConfig = new (MakeApplicationConfiguration(parseTestVariables, [missingFile], testDefaultsFile, false))

    expect(appConfig.PORT).toBeUndefined()
  })

  it('should not override config values with defaults', () => {
    expect(appConfigWithDefaults.A_STRING_VALUE).toEqual('A_CONFIG_VALUE')
    expect(missingAppConfig.A_STRING_VALUE).toEqual('OVERRIDE_OF_THE_ACTUAL_VALUES_IN_ENV_DEFAULTS')
  })

  it('should leave keys empty if defaults file not found', () => {
    const temp = uuid()
    const missingFile = resolve(__dirname, temp)
    expect(existsSync(missingFile)).toBeFalsy()

    appConfig = new (MakeApplicationConfiguration(parseTestVariables, [missingFile], missingFile, false))

    expect(appConfig.PORT).toBeUndefined()
  })
})
