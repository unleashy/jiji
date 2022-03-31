import * as fs from "fs/promises";
import { File } from "./file";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Types } from "./types";
import { Codegen } from "./codegen";

export function compile(code: string): string {
  const file = new File("<code>", code);
  return compileImpl(file);
}

export async function compileFile(path: string): Promise<string> {
  const file = new File(path, await fs.readFile(path, "utf-8"));
  return compileImpl(file);
}

function compileImpl(file: File): string {
  const lexer = new Lexer(file);
  const parser = new Parser(lexer);

  const ast = parser.parse();

  new Types().compute(ast);

  return new Codegen().generate(ast);
}
