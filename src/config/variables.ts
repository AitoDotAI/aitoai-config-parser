/**
 * Licensed under the Apache License, Version 2.0.
 */
export type ConfigSource = Record<string, string>

export type NodeEnvironment = 'development' | 'production'
export type VariableRule = 'production' | 'default'

export type VariableParser<A> = (value: string | undefined) => A
export type ConfigDeclaration<A> = [VariableRule, VariableParser<A>]

type DefinedType<A extends ConfigDeclaration<any>> = A extends [VariableRule, VariableParser<infer B>] ? B : never

export type ConfigTypeOf<T extends Record<string, ConfigDeclaration<any>>> = {
  readonly [key in keyof T]: DefinedType<T[key]>
}

export type ParseFunction<T extends Record<string, ConfigDeclaration<any>>> = (
  environment: ConfigSource,
  file: ConfigSource,
  context?: NodeEnvironment,
) => ConfigTypeOf<T>

export class ParseVariableError extends Error {}

export class CombinedParseVariableError extends Error {
  readonly cause: Array<ParseVariableError>

  constructor(arrayOfErrors: Array<ParseVariableError>) {
    super(`There were ${arrayOfErrors?.length} errors while parsing. [${arrayOfErrors?.map((e) => e.message).join(', ')}]`)
    this.cause = arrayOfErrors
  }
}

export function maybe<A>(f: (value: string) => A): VariableParser<A | undefined> {
  return (value: string | undefined) => (value === undefined ? undefined : f(value))
}

export function defined<A>(f: (value: string) => A): VariableParser<A> {
  return (value: string | undefined) => {
    if (value === undefined) {
      throw new ParseVariableError('environment variable is not set properly')
    }
    return f(value)
  }
}

export function variable<R extends VariableRule, A>(rule: R, f: VariableParser<A>): [R, VariableParser<A>] {
  return [rule, f]
}

/**
 * Mark the variable as required _in production_. This variable is optional in other
 * modes. Production is decided based on the NODE_ENV defined for the runtime.
 *
 * @param f
 * @returns
 */
export function production<A>(f: (v: string) => A): ['production', VariableParser<A>] {
  return ['production', defined(f)]
}

/**
 * Mark the variable as optional in all contexts.
 * @param f
 * @returns
 */
export function optional<A>(f: (v: string) => A): ['default', VariableParser<A | undefined>] {
  return ['default', maybe(f)]
}

/**
 * Mar the variable as required in all contexts.
 * @param f
 * @returns
 */
export function required<A>(f: (v: string) => A): ['default', VariableParser<A>] {
  return ['default', defined(f)]
}

export function string(value: string): string {
  return value
}

export function boolean(value: string): boolean {
  if (value === 'true' || value === 'false') {
    return value === 'true'
  }
  throw new ParseVariableError(`Non-boolean value found: ${value}`)
}

export function number(value: string): number {
  const n = Number(value)
  if (Number.isFinite(n)) {
    return n
  }
  throw new ParseVariableError(`Non-number value found: ${value}`)
}

export function url(value: string): URL {
  try {
    return new URL(value)
  } catch (e) {
    throw new ParseVariableError(`Value is not a valid URL: ${value}`)
  }
}

export function parseVariables<T extends Record<string, ConfigDeclaration<any>>>(definition: T): ParseFunction<T> {
  return (environment, file, context) => {
    const isProd = context === 'production'
    const errors: Array<ParseVariableError> = []

    // Variable definition sources, from most to least authoritative
    const configSources = [environment, file]
    const productionSources = isProd ? [environment] : [environment, file]

    const result: any = {}
    /* eslint-disable-next-line no-restricted-syntax */
    for (const key of Object.keys(definition)) {
      const [rules, parse] = definition[key]

      const sources = rules === 'production' ? productionSources : configSources
      try {
        // Find first match of sources
        const source = sources.find((map) => key in map)
        const value: string | undefined = source && source[key]
        result[key] = parse(value)
      } catch (e) {
        if (e instanceof ParseVariableError) {
          errors.push(new ParseVariableError(`${key} is invalid: ${e.message}`))
        } else {
          throw e
        }
      }
    }

    if (errors.length > 0) {
      throw new CombinedParseVariableError(errors)
    }

    return result
  }
}
