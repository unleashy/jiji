import { strict as assert } from "assert";
import { Span } from "./span";
import { File } from "./file";
import { kinds, Token } from "./token";

export class Lexer {
  private readonly source: Source;

  constructor(file: File) {
    this.source = new Source(file);
  }

  next(): Token {
    this.skipWhitespace();

    this.source.startSpan();

    const c = this.source.next();

    const kind = (() => {
      // prettier-ignore
      switch (c) {
        case "+": return kinds.plus;
        case "-": return kinds.minus;
        case "*": return kinds.star;
        case "/": return kinds.slash;
        case "%": return kinds.percent;
        case "(": return kinds.parenOpen;
        case ")": return kinds.parenClose;

        case "=":
          return this.source.match("=") ? kinds.equals : kinds.end;

        case "!":
          return this.source.match("=") ? kinds.bangEquals : kinds.bang;

        case "<":
          return this.source.match("=") ? kinds.lessEqual : kinds.less;

        case ">":
          return this.source.match("=") ? kinds.greaterEqual : kinds.greater;

        case undefined: return kinds.end;

        default: return kinds.end;
      }
    })();

    return new Token(kind, this.source.endSpan());
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

  nextWhile(f: (c: string) => boolean): boolean {
    while (true) {
      const c = this.file.at(this.currentIndex);
      if (c === undefined) {
        return false;
      }

      if (f(c)) {
        this.currentIndex++;
      } else {
        return true;
      }
    }
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
