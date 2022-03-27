import { File } from "./file";

export class Span {
  constructor(
    readonly file: File,
    readonly index: number,
    readonly length: number
  ) {}

  get text(): string {
    return this.file.slice(this.index, this.index + this.length);
  }
}
