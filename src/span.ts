import { strict as assert } from "assert";
import { File } from "./file";

export class Span {
  constructor(
    readonly file: File,
    readonly index: number,
    readonly length: number
  ) {}

  join(other: Span): Span {
    assert.equal(this.file, other.file, "mismatched files");

    const earliestIndex = Math.min(this.index, other.index);
    const latestIndex = Math.max(
      this.index + this.length,
      other.index + other.length
    );
    return new Span(this.file, earliestIndex, latestIndex - earliestIndex);
  }

  get text(): string {
    return this.file.slice(this.index, this.index + this.length);
  }

  get location(): Location {
    const before = this.file.slice(0, this.index);

    // The amount of newlines before the span's text is its line.
    //   "ab\ncd\nef"
    //    1   2   3
    let line = 1;
    let lastNewlineIndex = 0;
    for (let i = 0; i < before.length; ++i) {
      if (before[i] === "\n") {
        line++;
        lastNewlineIndex = i;
      }
    }

    // The column is the offset between the last newline before the span and
    // the start of the span. New line characters themselves count as part of
    // the same line as the characters before them.
    //   "abcd\nef\nghijkl"
    //    12345 123 123456
    let column = before.length - lastNewlineIndex;
    if (line === 1) {
      ++column;
    }

    return new Location(this.file, line, column);
  }
}

export class Location {
  constructor(
    readonly file: File,
    readonly line: number,
    readonly column: number
  ) {}

  get path(): string {
    return this.file.path;
  }
}
