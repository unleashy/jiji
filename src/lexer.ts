import { strict as assert } from "assert";
import { Span } from "./span";
import { File } from "./file";
import { SinosError, errorKinds } from "./error";
import { kinds, Token } from "./token";

export class Lexer {
  private readonly source: Source;

  constructor(file: File) {
    this.source = new Source(file);
  }

  next(): Token {
    this.skipWhitespace();

    this.source.startSpan();

    return this.nextNameOrKeyword() || this.nextNumber() || this.nextSymbol();
  }

  private skipWhitespace(): void {
    while (true) {
      switch (this.source.peek()) {
        case " ":
        case "\t":
        case "\r":
        case "\n":
          this.source.next();
          break;

        case "-":
          if (this.source.peek(1) === "-") {
            this.source.nextWhile(c => c !== "\n");
            break;
          } else {
            return;
          }

        default:
          return;
      }
    }
  }

  private nextNameOrKeyword(): Token | undefined {
    function isNameStart(c: string): boolean {
      return /^[A-Za-z_]$/.test(c);
    }

    function isNameContinue(c: string): boolean {
      return /^[A-Za-z0-9_]$/.test(c);
    }

    const c = this.source.peek();
    if (c === undefined || !isNameStart(c)) return undefined;
    this.source.nextWhile(isNameContinue);

    const span = this.source.endSpan();
    const kind = (() => {
      // prettier-ignore
      switch (span.text) {
        case "false": return kinds.false;
        case "let": return kinds.let;
        case "true": return kinds.true;
        default: return kinds.name(span.text);
      }
    })();

    return new Token(kind, span);
  }

  private nextNumber(): Token | undefined {
    if (!this.consumeDigits()) return;

    const float = this.nextFloat();
    if (float) return float;

    const span = this.source.endSpan();
    const value = Number.parseInt(span.text.replaceAll("_", ""), 10);
    return new Token(kinds.integer(value), span);
  }

  private nextFloat(): Token | undefined {
    if (!this.isFloat()) {
      return;
    }

    if (this.source.match(".")) {
      if (!this.consumeDigits()) {
        throw new SinosError(errorKinds.missingFrac, this.source.endSpan());
      }
    }

    if (this.source.match("e") || this.source.match("E")) {
      this.source.match("-") || this.source.match("+");
      if (!this.consumeDigits()) {
        throw new SinosError(errorKinds.missingExp, this.source.endSpan());
      }
    }

    const span = this.source.endSpan();
    const value = Number.parseFloat(span.text.replaceAll("_", ""));
    return new Token(kinds.float(value), span);
  }

  private isFloat(): boolean {
    const c = this.source.peek();
    return c === "." || c === "e" || c === "E";
  }

  private consumeDigits(): boolean {
    function isDigit(c: string) {
      return c >= "0" && c <= "9";
    }

    function isDigitOrUnderscore(c: string) {
      return isDigit(c) || c === "_";
    }

    const c = this.source.peek();
    if (c === undefined || !isDigit(c)) return false;
    this.source.nextWhile(isDigitOrUnderscore);

    return true;
  }

  private nextSymbol(): Token {
    const c = this.source.next();
    const kind = (() => {
      // prettier-ignore
      switch (c) {
        case ";": return kinds.semi;
        case "+": return kinds.plus;
        case "-": return kinds.minus;
        case "*": return kinds.star;
        case "/": return kinds.slash;
        case "%": return kinds.percent;
        case "(": return kinds.parenOpen;
        case ")": return kinds.parenClose;

        case "=":
          return this.source.match("=") ? kinds.equals : kinds.equal;

        case "!":
          return this.source.match("=") ? kinds.bangEquals : kinds.bang;

        case "<":
          return this.source.match("=") ? kinds.lessEqual : kinds.less;

        case ">":
          return this.source.match("=") ? kinds.greaterEqual : kinds.greater;

        case ":":
          return kinds.colon;

        case undefined: return kinds.end;

        default:
          throw new SinosError(errorKinds.unknownChar(c), this.source.endSpan());
      }
    })();

    return new Token(kind, this.source.endSpan());
  }
}

class Source {
  private readonly file: File;
  private currentIndex = 0;
  private indexStack: number[] = [];

  constructor(file: File) {
    this.file = file;
  }

  next(): string | undefined {
    if (this.currentIndex < this.file.length) {
      return this.file.at(this.currentIndex++);
    } else {
      return undefined;
    }
  }

  peek(by = 0): string | undefined {
    const peekIndex = this.currentIndex + by;
    return this.file.at(peekIndex);
  }

  nextWhile(f: (c: string) => boolean): number {
    const start = this.currentIndex;
    while (true) {
      const c = this.file.at(this.currentIndex);
      if (c !== undefined && f(c)) {
        this.currentIndex++;
      } else {
        break;
      }
    }

    return this.currentIndex - start;
  }

  match(s: string): boolean {
    if (this.hasMatch(s)) {
      this.currentIndex += s.length;
      return true;
    } else {
      return false;
    }
  }

  hasMatch(s: string): boolean {
    return this.file.matchAt(this.currentIndex, s);
  }

  startSpan(): void {
    this.indexStack.push(this.currentIndex);
  }

  endSpan(): Span {
    const start = this.indexStack.pop();
    assert(start !== undefined, "no span to pop");

    return new Span(this.file, start, this.currentIndex - start);
  }
}
