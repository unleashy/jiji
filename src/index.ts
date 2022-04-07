import * as fs from "fs/promises";
import { File } from "./file";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Resolver } from "./scope";
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
  const ast = new Parser(new Lexer(file)).parse();

  const env = new Resolver().resolve(ast);

  const types = new Types(env);
  types.typeOf(ast); // typecheck

  return new Codegen(types).generate(ast);
}
