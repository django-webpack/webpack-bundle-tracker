/* eslint-env jest */
'use strict';

const stripAnsi = require('../stripAnsi');

describe('stripAnsi tests', () => {
  it('It should handle an empty string', () => {
    const output = stripAnsi('');
    expect(output).toBe('');
  });

  it('It should return the same string if there are no ANSI codes', () => {
    const input = 'Hello';
    const output = stripAnsi(input);
    expect(output).toBe('Hello');
  });

  it('It should remove ANSI codes from a string', () => {
    const input = '\u001B[4mHello\u001B[0m';
    const output = stripAnsi(input);
    expect(output).toBe('Hello');
  });

  it('It should strip color from string', () => {
    const input = '\u001B[0m\u001B[4m\u001B[42m\u001B[31mHe\u001B[39m\u001B[49m\u001B[24mllo\u001B[0m';
    const output = stripAnsi(input);
    expect(output).toBe('Hello');
  });

  it('It should strip color from ls command', () => {
    const input =
      '\u001B[00m\u001B[01;34mHello\u001B[00m';
    const output = stripAnsi(input);
    expect(output).toBe('Hello');
  });

  it('It should reset;setfg;setbg;italics;strike;underline sequence from string', () => {
    const input = '\u001B[0;33;49;3;9;4mHello\u001B[0m';
    const output = stripAnsi(input);
    expect(output).toBe('Hello');
  });

  it('It should strip link from terminal link', () => {
    const input = '\u001B]8;;https://github.com\u0007click\u001B]8;;\u0007';
    const output = stripAnsi(input);
    expect(output).toBe('click');
  });
});
