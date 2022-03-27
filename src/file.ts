export class File {
  constructor(readonly path: string, readonly contents: string) {}

  at(index: number): string | undefined {
    return this.contents[index];
  }

  slice(start: number, end: number): string {
    return this.contents.slice(start, end);
  }

  matchAt(index: number, s: string): boolean {
    return this.contents.startsWith(s, index);
  }

  get length(): number {
    return this.contents.length;
  }
}
