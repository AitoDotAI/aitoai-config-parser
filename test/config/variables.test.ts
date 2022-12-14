/**
 * Licensed under the Apache License, Version 2.0.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import dotenv from 'dotenv-extended'
import {
  optional,
  required,
  string,
  boolean,
  number,
  url,
  urlstring,
  defined,
  production,
  parseVariables,
  CombinedParseVariableError,
  NodeEnvironment,
} from '../../src/config/variables'

describe('parseVariables', () => {
  describe('boolean', () => {
    it('cast type to boolean', () => {
      expect(boolean('true')).toEqual(true)
      expect(boolean('false')).toEqual(false)
    })

    it('should throw exception for js-weird booleans', () => {
      expect(() => boolean('1')).toThrowError(/Non-boolean value found/)
      expect(() => boolean('0')).toThrowError(/Non-boolean value found/)
      expect(() => boolean('')).toThrowError(/Non-boolean value found/)
    })

    it('should throw exception if casting wrong type to boolean', () => {
      expect(() => boolean('1234')).toThrowError(/Non-boolean value found/)
    })
  })

  describe('number', () => {
    it('should cast value to number', () => {
      expect(number('123')).toEqual(123)
    })

    it('should throw exception if casting wrong type to number', () => {
      expect(() => number('a string value')).toThrowError(/Non-number value found/)
    })

    it('should not accept positive infinite as a number', () => {
      expect(() => number(`${Number.POSITIVE_INFINITY}`)).toThrowError(/Non-number value found/)
    })

    it('should not accept negative infinite as a number', () => {
      expect(() => number(`${Number.NEGATIVE_INFINITY}`)).toThrowError(/Non-number value found/)
    })
  })

  describe('url', () => {
    it('should return the qualified URL', () => {
      expect(url('https://aito.ai')).toEqual(new URL('https://aito.ai'))
    })

    it('should throw exception if not a fully qualified URL', () => {
      expect(() => url('a string value')).toThrowError(/Value is not a valid URL/)
    })
  })

  describe('urlstring', () => {
    it('should return the qualified URL as a string', () => {
      expect(urlstring('https://aito.ai')).toEqual('https://aito.ai/')
    })

    it('should throw exception if not a fully qualified URL', () => {
      expect(() => urlstring('a string value')).toThrowError(/Value is not a valid URL/)
    })
  })

  describe('required', () => {
    it('should throw exception if casting wrong type to number', () => {
      expect(() => defined(number)(undefined)).toThrowError(/environment variable is not set properly/)
    })
  })

  describe('production', () => {
    const withValues = { A_PROD_NUMBER: '123' }
    const noValues = {}
    const sillyDefault = { A_PROD_NUMBER: Number.MAX_SAFE_INTEGER.toString() }

    const declaration = {
      A_PROD_NUMBER: production(number),
    }

    it('should parse the value normally in production mode', () => {
      expect(parseVariables(declaration)(withValues, noValues, 'production').A_PROD_NUMBER).toEqual(123)
    })

    describe('missing but set in defaults', () => {
      it('should use default when not in production mode', () => {
        expect(parseVariables(declaration)(noValues, withValues, 'development').A_PROD_NUMBER).toEqual(123)
      })

      it('should not allow erroneous when in production mode', () => {
        expect(() => parseVariables(declaration)(noValues, sillyDefault, 'production')).toThrowError()
      })
    })
  })

  describe('optional', () => {
    it('should should allow set filter for enum if value exists', () => {
      const [rules, parse] = optional((v) => ['one', 'of', 'expected'].find((s) => s === v))

      expect(parse('one')).toEqual('one')
      expect(parse(undefined)).toEqual(undefined)
    })

    it('should should to map value if exists', () => {
      const [rules, parse] = optional((v) => v.toUpperCase())

      expect(parse('moro')).toEqual('MORO')
      expect(parse(undefined)).toEqual(undefined)
    })
  })

  describe('multiple validations', () => {
    const declaration = {
      A_STRING_VALUE: required(string),
      A_BOOLEAN_VALUE: optional(boolean),
      A_NUMBER_VALUE: optional(number),
      PORT: optional(number),
    }

    const emptyConfig: dotenv.IEnvironmentMap = {}
    const invalidConfig: dotenv.IEnvironmentMap = {
      A_STRING_VALUE: undefined as any as string,
      A_BOOLEAN_VALUE: 'Not a boolean',
      A_NUMBER_VALUE: `${Number.POSITIVE_INFINITY}`,
      PORT: 'Hex, maybe?',
    }

    function call() {
      parseVariables(declaration)(invalidConfig, emptyConfig, 'production')
    }

    it('should throw exception when errors', () => {
      expect(call).toThrowError()
    })

    it('should list the number of errors in the exception', () => {
      try {
        call()
      } catch (err) {
        if (err instanceof CombinedParseVariableError) {
          expect(err.message).toContain('There were 4 errors while parsing')
        } else {
          throw err
        }
      }
    })

    it('should contain an array of all causing errors in the top-level exception', () => {
      try {
        call()
      } catch (err) {
        if (err instanceof CombinedParseVariableError) {
          expect(err.cause).toHaveLength(4)
        } else {
          throw err
        }
      }
    })
  })
})
