import { test } from "uvu";
import * as assert from "uvu/assert";
import { File } from "../../src/file";
import { Span } from "../../src/span";
import { kinds, Token } from "../../src/token";
import { Lexer } from "../../src/lexer";

interface TestCase {
  desc: string;
  input: string;
  output: (makeSpan: (index: number, length: number) => Span) => Token[];
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
  }
];

for (const testCase of testCases) {
  test(`lexer ${testCase.desc}`, () => {
    const file = new File("<test>", testCase.input);
    const sut = new Lexer(file);

    const result = [];
    while (true) {
      const token = sut.next();
      result.push(token);
      if (token.isEnd) break;
    }

    assert.equal(
      result,
      testCase.output((index, length) => new Span(file, index, length))
    );
  });
}

test.run();
