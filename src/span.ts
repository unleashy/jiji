import { File } from "./file";

export class Span {
  constructor(
    readonly file: File,
    readonly index: number,
    readonly length: number
  ) {}
}
