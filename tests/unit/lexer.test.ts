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
    input: ";+-*/%()!<>:=~",
    output: s => [
      new Token(kinds.semi, s(0, 1)),
      new Token(kinds.plus, s(1, 1)),
      new Token(kinds.minus, s(2, 1)),
      new Token(kinds.star, s(3, 1)),
      new Token(kinds.slash, s(4, 1)),
      new Token(kinds.percent, s(5, 1)),
      new Token(kinds.parenOpen, s(6, 1)),
      new Token(kinds.parenClose, s(7, 1)),
      new Token(kinds.bang, s(8, 1)),
      new Token(kinds.less, s(9, 1)),
      new Token(kinds.greater, s(10, 1)),
      new Token(kinds.colon, s(11, 1)),
      new Token(kinds.equal, s(12, 1)),
      new Token(kinds.tilde, s(13, 1)),
      new Token(kinds.end, s(14, 0))
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
    desc: "accepts floats",
    input:
      "0.0 1234567890.1234 42_3__5_.98_7 1.0e5 52.3E9 100e10 8E4 90e-2 42E+3 70.2e-8 120.57E+3",
    output: s => [
      new Token(kinds.float(0.0), s(0, 3)),
      new Token(kinds.float(1234567890.1234), s(4, 15)),
      new Token(kinds.float(4235.987), s(20, 13)),
      new Token(kinds.float(1.0e5), s(34, 5)),
      new Token(kinds.float(52.3e9), s(40, 6)),
      new Token(kinds.float(100e10), s(47, 6)),
      new Token(kinds.float(8e4), s(54, 3)),
      new Token(kinds.float(90e-2), s(58, 5)),
      new Token(kinds.float(42e3), s(64, 5)),
      new Token(kinds.float(70.2e-8), s(70, 7)),
      new Token(kinds.float(120.57e3), s(78, 9)),
      new Token(kinds.end, s(87, 0))
    ]
  },
  {
    desc: "fails on missing fractional part",
    input: "123.",
    output: s => [new SinosError(errorKinds.missingFrac, s(0, 4))],
    expectError: true
  },
  {
    desc: "fails on missing exponent part",
    input: "456e -",
    output: s => [new SinosError(errorKinds.missingExp, s(0, 4))],
    expectError: true
  },
  {
    desc: "fails on missing exponent part",
    input: "789E-_",
    output: s => [new SinosError(errorKinds.missingExp, s(0, 5))],
    expectError: true
  },
  {
    desc: "accepts single-quoted strings",
    input: String.raw`'' 'foobar' ' \n\r\t'`,
    output: s => [
      new Token(kinds.string(""), s(0, 2)),
      new Token(kinds.string("foobar"), s(3, 8)),
      new Token(kinds.string(String.raw` \n\r\t`), s(12, 9)),
      new Token(kinds.end, s(21, 0))
    ]
  },
  {
    desc: "accepts double-quoted strings",
    input: String.raw`"" "abcd" " \b\f\n\r\t\v\'\"\\"`,
    output: s => [
      new Token(kinds.string(""), s(0, 2)),
      new Token(kinds.string("abcd"), s(3, 6)),
      new Token(kinds.string(" \b\f\n\r\t\v'\"\\"), s(10, 21)),
      new Token(kinds.end, s(31, 0))
    ]
  },
  {
    desc: "accepts unicode escapes in double-quoted strings",
    input: String.raw`"\u{A}\u{41}\u{28B}\u{5763}\u{1042d}\u{10AeCf}"`,
    output: s => [
      new Token(
        kinds.string(`\u{A}\u{41}\u{28B}\u{5763}\u{1042d}\u{10AeCf}`),
        s(0, 47)
      ),
      new Token(kinds.end, s(47, 0))
    ]
  },
  {
    desc: "fails for unclosed single-quoted string",
    input: `'aa`,
    output: s => [new SinosError(errorKinds.unclosedString, s(0, 3))],
    expectError: true
  },
  {
    desc: "fails for unclosed double-quoted string",
    input: `"  hey`,
    output: s => [new SinosError(errorKinds.unclosedString, s(0, 6))],
    expectError: true
  },
  {
    desc: "fails for unknown escape sequence",
    input: String.raw`"\m"`,
    output: s => [new SinosError(errorKinds.unknownEscape("m"), s(1, 2))],
    expectError: true
  },
  {
    desc: "fails for end after escape sequence",
    input: `"\\`,
    output: s => [new SinosError(errorKinds.unknownEscape(""), s(1, 1))],
    expectError: true
  },
  {
    desc: "fails for missing open brace in unicode escapes",
    input: `"\\u41}"`,
    output: s => [new SinosError(errorKinds.uniEscMissingOpen, s(1, 2))],
    expectError: true
  },
  {
    desc: "fails for missing close brace in unicode escapes",
    input: `"\\u{41 `,
    output: s => [new SinosError(errorKinds.uniEscMissingClose, s(1, 6))],
    expectError: true
  },
  {
    desc: "fails for non-hex characters in unicode escapes",
    input: `"\\u{abc-}"`,
    output: s => [new SinosError(errorKinds.uniEscNotHex, s(1, 8))],
    expectError: true
  },
  {
    desc: "fails for invalid code points in unicode escapes",
    input: `"\\u{FFFFFF}"`,
    output: s => [
      new SinosError(errorKinds.uniEscInvalidCodePoint("FFFFFF"), s(1, 10))
    ],
    expectError: true
  },
  {
    desc: "accepts names",
    input: "_ A B1__2C__ abcdefghijklmnopqrstuvwxyz0123456789",
    output: s => [
      new Token(kinds.name("_"), s(0, 1)),
      new Token(kinds.name("A"), s(2, 1)),
      new Token(kinds.name("B1__2C__"), s(4, 8)),
      new Token(kinds.name("abcdefghijklmnopqrstuvwxyz0123456789"), s(13, 36)),
      new Token(kinds.end, s(49, 0))
    ]
  },
  {
    desc: "accepts all keywords",
    input: "false let true",
    output: s => [
      new Token(kinds.false, s(0, 5)),
      new Token(kinds.let, s(6, 3)),
      new Token(kinds.true, s(10, 4)),
      new Token(kinds.end, s(14, 0))
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
