/**
 * Licensed under the Apache License, Version 2.0.
 */
import { boolean, number, defined } from '../../src/config/variables'

describe('parseVariables', () => {
  describe('boolean', () => {
    it('should throw exception if casting wrong type to boolean', () => {
      expect(() => boolean('1234')).toThrowError(/Non-boolean value found/)
    })
  })

  describe('number', () => {
    it('should throw exception if casting wrong type to number', () => {
      expect(() => number('a string value')).toThrowError(/Non-number value found/)
    })
  })

  describe('required', () => {
    it('should throw exception if casting wrong type to number', () => {
      expect(() => defined(number)(undefined)).toThrowError(/environment variable is not set properly/)
    })
  })
})
