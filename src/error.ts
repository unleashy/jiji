import { Span } from "./span";
import { BinaryOp, UnaryOp } from "./ast";
import { Type } from "./types";

function errorKind<Name extends string, Other>(
  k: { name: Name } & Other
): { name: Name } & Other {
  return k;
}

export const errorKinds = Object.freeze({
  // lexer errors
  unknownChar: (char: string) => errorKind({ name: "unknownChar", char }),
  missingFrac: errorKind({ name: "missingFrac" }),
  missingExp: errorKind({ name: "missingExp" }),
  unclosedString: errorKind({ name: "unclosedString" }),
  unknownEscape: (escape: string) =>
    errorKind({ name: "unknownEscape", escape }),
  uniEscMissingOpen: errorKind({ name: "uniEscMissingOpen" }),
  uniEscMissingClose: errorKind({ name: "uniEscMissingClose" }),
  uniEscNotHex: errorKind({ name: "uniEscNotHex" }),
  uniEscInvalidCodePoint: (codept: string) =>
    errorKind({ name: "uniEscInvalidCodePoint", codept }),

  // parser errors
  expectExpr: errorKind({ name: "expectExpr" }),
  expectSemi: errorKind({ name: "expectSemi" }),
  expectParenClose: errorKind({ name: "expectParenClose" }),
  expectBraceClose: errorKind({ name: "expectBraceClose" }),
  expectName: errorKind({ name: "expectName" }),
  expectEqual: errorKind({ name: "expectEqual" }),
  eqChain: errorKind({ name: "eqChain" }),
  cmpChain: errorKind({ name: "cmpChain" }),
  expectBlock: errorKind({ name: "expectBlock" }),

  // type errors
  unaryTypeMismatch: (op: UnaryOp, actualType: Type) =>
    errorKind({ name: "unaryTypeMismatch", op, actualType }),
  binaryTypeMismatch: (leftType: Type, op: BinaryOp, rightType: Type) =>
    errorKind({ name: "binaryTypeMismatch", leftType, op, rightType }),
  letTypeMismatch: (declared: Type, inferred: Type) =>
    errorKind({ name: "letTypeMismatch", declared, inferred }),
  unknownType: (typeName: string) =>
    errorKind({ name: "unknownType", typeName }),
  unknownBinding: (bindingName: string) =>
    errorKind({ name: "unknownBinding", bindingName })
});

type KindType<K> = K extends (...args: never[]) => unknown ? ReturnType<K> : K;
export type ErrorKind = KindType<typeof errorKinds[keyof typeof errorKinds]>;

export class SinosError extends Error {
  constructor(readonly errorKind: ErrorKind, readonly span: Span) {
    super();
  }

  override get message(): string {
    const loc = this.span.location;
    return `${loc.path}:${loc.line}:${loc.column}  ${this.kindMessage()}`;
  }

  private kindMessage(): string {
    switch (this.errorKind.name) {
      case "unknownChar": {
        const char = JSON.stringify(this.errorKind.char);
        return `Unknown character ${char}`;
      }

      case "missingFrac":
        return `Expected digits after "." for float literal`;

      case "missingExp":
        return `Expected digits for the exponent of a float literal`;

      case "unclosedString":
        return `Unclosed string literal`;

      case "unknownEscape":
        return `Unknown escape sequence "\\${this.errorKind.escape}"`;

      case "uniEscMissingOpen":
        return `Expected an open brace "{" after '\\u' to start Unicode escape`;

      case "uniEscMissingClose":
        return `Expected a close brace "}" to finish Unicode escape`;

      case "uniEscNotHex":
        return `Invalid character in Unicode escape; only hexadecimal is allowed`;

      case "uniEscInvalidCodePoint":
        return `0x${this.errorKind.codept} is not a valid Unicode code point`;

      case "expectSemi":
        return "Expected a semicolon";

      case "expectExpr":
        return "Expected an expression";

      case "expectParenClose":
        return "Expected a closing parenthesis";

      case "expectBraceClose":
        return "Expected a closing brace";

      case "expectName":
        return "Expected a name";

      case "expectEqual":
        return "Expected an equal sign";

      case "eqChain":
        return (
          "Equality operators are not chainable. If you really meant to " +
          "do this, wrap this in parentheses"
        );

      case "cmpChain":
        return (
          "Comparison operators are not chainable. If you really meant to " +
          "do this, wrap this in parentheses"
        );

      case "expectBlock":
        return `Expected a block`;

      case "unaryTypeMismatch":
        return (
          `Unary operator "${this.errorKind.op}" cannot be applied to a ` +
          `value of type ${this.errorKind.actualType.name}`
        );

      case "binaryTypeMismatch":
        return (
          `Binary operator "${this.errorKind.op}" cannot be applied to ` +
          `values of type ${this.errorKind.leftType.name} and ` +
          this.errorKind.rightType.name
        );

      case "letTypeMismatch":
        return (
          `Declared type ${this.errorKind.declared.name} for declaration ` +
          `doesn't match inferred type ${this.errorKind.inferred.name}`
        );

      case "unknownType":
        return `Cannot find type "${this.errorKind.typeName}"`;

      case "unknownBinding":
        return `Cannot find name "${this.errorKind.bindingName}"`;
    }
  }
}
