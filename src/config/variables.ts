export type ConfigSource = Record<string, string>

export type NodeEnvironment = 'development' | 'production'
export type VariableRule = 'production' | 'default'

export type VariableParser<A> = (value: string | undefined) => A
export type ConfigDeclaration<A> = [VariableRule, VariableParser<A>]

type DefinedType<A extends ConfigDeclaration<any>> =
  A extends [VariableRule, VariableParser<infer B>] ? B : never

export type ConfigTypeOf<T extends Record<string, ConfigDeclaration<any>>> =
  { readonly [key in keyof T]: DefinedType<T[key]> }

export type ParseFunction<T extends Record<string, ConfigDeclaration<any>>> =
  (environment: ConfigSource, file: ConfigSource, context?: NodeEnvironment) => ConfigTypeOf<T>

export class ParseVariableError extends Error {
  constructor(message: string) { super(message) }
}

export function maybe<A>(f: (value: string) => A): VariableParser<A | undefined> {
  return (value: string | undefined) => value === undefined ? undefined : f(value)
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

export function production<A>(f: (v: string) => A): ['production', VariableParser<A>] {
  return ['production', defined(f)]
}

export function optional<A>(f: (v: string) => A): ['default', VariableParser<A>] {
  return ['default', maybe(f)]
}

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

export function parseVariables<T extends Record<string, ConfigDeclaration<any>>>(
  definition: T,
): ParseFunction<T> {
  return (environment, file, context) => {
    const isProd = context === 'production'

    // Variable definition sources, from most to least authoritative
    const configSources = [environment, file]
    const productionSources = isProd ? [environment] : [environment, file]

    const result: any = {}
    for (const key of Object.keys(definition)) {
      const [rules, parse] = definition[key]

      const sources = rules === 'production' ? productionSources : configSources
      try {
        // Find first match of sources
        const source = sources.find(map => key in map)
        const value: string | undefined = source && source[key]
        result[key] = parse(value)
      } catch (e) {
        if (e instanceof ParseVariableError) {
          throw new ParseVariableError(`${key} is invalid: ${e.message}`)
        }
        throw e
      }
    }
    return result
  }
}
