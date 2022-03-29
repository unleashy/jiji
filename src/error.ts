import { Span } from "./span";

function errorKind<Name extends string, Other>(
  k: { name: Name } & Other
): { name: Name } & Other {
  return k;
}

export const errorKinds = Object.freeze({
  // lexer errors
  unknownChar: (char: string) => errorKind({ name: "unknownChar", char }),

  // parser errors
  expectExpr: errorKind({ name: "expectExpr" }),
  expectSemi: errorKind({ name: "expectSemi" }),
  expectCloseParen: errorKind({ name: "expectCloseParen" })
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

      case "expectSemi":
        return "Missing semicolon";

      case "expectExpr":
        return "Expected an expression";

      case "expectCloseParen":
        return "Expected a closing parenthesis";
    }
  }
}
