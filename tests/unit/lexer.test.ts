import { test } from "uvu";
import * as assert from "uvu/assert";
import { File } from "../../src/file";
import { Span } from "../../src/span";
import { SinosError, errorKinds } from "../../src/error";
import { Token, kinds } from "../../src/token";
import { Lexer } from "../../src/lexer";

interface TestCase {
  desc: string;
  input: string;
  output: (
    makeSpan: (index: number, length: number) => Span
  ) => (Token | SinosError)[];
  expectError?: boolean;
}

const testCases: TestCase[] = [
  {
    desc: "accepts an empty string",
    input: "",
    output: s => [new Token(kinds.end, s(0, 0))]
  },
  {
    desc: "ignores whitespace",
    input: " \t\n\r\n  ",
    output: s => [new Token(kinds.end, s(7, 0))]
  },
  {
    desc: "ignores comments",
    input: "--foo--bar\n     -- -- hello c:",
    output: s => [new Token(kinds.end, s(30, 0))]
  },
  {
    desc: "fails on unknown character",
    input: "#",
    output: s => [new SinosError(errorKinds.unknownChar("#"), s(0, 1))],
    expectError: true
  },
  {
    desc: "accepts all single-character symbols",
    input: "+-*/%()!<>",
    output: s => [
      new Token(kinds.plus, s(0, 1)),
      new Token(kinds.minus, s(1, 1)),
      new Token(kinds.star, s(2, 1)),
      new Token(kinds.slash, s(3, 1)),
      new Token(kinds.percent, s(4, 1)),
      new Token(kinds.parenOpen, s(5, 1)),
      new Token(kinds.parenClose, s(6, 1)),
      new Token(kinds.bang, s(7, 1)),
      new Token(kinds.less, s(8, 1)),
      new Token(kinds.greater, s(9, 1)),
      new Token(kinds.end, s(10, 0))
    ]
  },
  {
    desc: "accepts all multi-character symbols",
    input: "== != <= >=",
    output: s => [
      new Token(kinds.equals, s(0, 2)),
      new Token(kinds.bangEquals, s(3, 2)),
      new Token(kinds.lessEqual, s(6, 2)),
      new Token(kinds.greaterEqual, s(9, 2)),
      new Token(kinds.end, s(11, 0))
    ]
  },
  {
    desc: "accepts integers",
    input: "0 0987654321 45_6__778___9_",
    output: s => [
      new Token(kinds.integer(0), s(0, 1)),
      new Token(kinds.integer(987654321), s(2, 10)),
      new Token(kinds.integer(4567789), s(13, 14)),
      new Token(kinds.end, s(27, 0))
    ]
  },
  {
    desc: "accepts all keywords",
    input: "true false",
    output: s => [
      new Token(kinds.true, s(0, 4)),
      new Token(kinds.false, s(5, 5)),
      new Token(kinds.end, s(10, 0))
    ]
  }
];

for (const testCase of testCases) {
  test(`lexer ${testCase.desc}`, () => {
    const file = new File("<test>", testCase.input);
    const sut = new Lexer(file);

    const actual = [];
    while (true) {
      try {
        const token = sut.next();
        actual.push(token);
        if (token.isEnd) break;
      } catch (e) {
        if (testCase.expectError && e instanceof SinosError) {
          actual.push(e);
          break;
        } else {
          throw e;
        }
      }
    }

    assert.snapshot(
      JSON.stringify(actual, undefined, "  "),
      JSON.stringify(
        testCase.output((index, length) => new Span(file, index, length)),
        undefined,
        "  "
      )
    );
  });
}

test.run();
