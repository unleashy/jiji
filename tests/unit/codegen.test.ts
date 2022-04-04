import { test } from "uvu";
import * as assert from "uvu/assert";
import { File } from "../../src/file";
import { Span } from "../../src/span";
import { useSpanForBuildingAst } from "../util";
import { Types } from "../../src/types";
import { Codegen } from "../../src/codegen";

function exec(code: string): string[] {
  const logs: string[] = [];

  const fn = new Function("console", code);
  fn({
    log: (arg: unknown) => {
      logs.push(String(arg));
    }
  });

  return logs;
}

const span = new Span(new File("<test>", ""), 0, 0);
const ast = useSpanForBuildingAst(span);

test("nothing happens for an effectively empty AST", () => {
  const sut = new Codegen(new Types());

  const result = sut.generate(ast.module([]));

  assert.equal(exec(result), []);
});

test("expression statements get logged", () => {
  const sut = new Codegen(new Types());

  const result = sut.generate(
    ast.module([
      ast.exprStmt(ast.integer(42)),
      ast.exprStmt(ast.float(3.1415)),
      ast.exprStmt(ast.boolean(true)),
      ast.exprStmt(ast.string("hello\nworld")),
      ast.exprStmt(ast.unary("!", ast.boolean(true))),
      ast.exprStmt(ast.unary("-", ast.integer(999))),
      ast.exprStmt(ast.unary("+", ast.integer(50))),
      ast.exprStmt(ast.binary(ast.integer(1), "+", ast.integer(2))),
      ast.exprStmt(
        ast.binary(
          ast.binary(ast.integer(50), "*", ast.integer(50)),
          "==",
          ast.integer(2500)
        )
      ),
      ast.exprStmt(
        ast.binary(
          ast.group(ast.binary(ast.integer(1), "+", ast.integer(2))),
          "*",
          ast.integer(3)
        )
      ),
      ast.exprStmt(ast.binary(ast.string("a"), "~", ast.string("b")))
    ])
  );

  assert.equal(exec(result), [
    "42",
    "3.1415",
    "true",
    "hello\nworld",
    "false",
    "-999",
    "50",
    "3",
    "true",
    "9",
    "ab"
  ]);
});

test("variables work", () => {
  const sut = new Codegen(new Types());

  const result = sut.generate(
    ast.module([
      ast.letStmt("a", undefined, ast.integer(999)),
      ast.exprStmt(ast.name("a"))
    ])
  );

  assert.equal(exec(result), ["999"]);
});

test("shadowed variables work", () => {
  const sut = new Codegen(new Types());

  const result = sut.generate(
    ast.module([
      ast.letStmt("a", undefined, ast.integer(42)),
      ast.exprStmt(ast.name("a")),
      ast.letStmt("a", undefined, ast.boolean(false)),
      ast.exprStmt(ast.name("a"))
    ])
  );

  assert.equal(exec(result), ["42", "false"]);
});

test("division of integers truncates", () => {
  const sut = new Codegen(new Types());

  const result = sut.generate(
    ast.module([ast.exprStmt(ast.binary(ast.integer(1), "/", ast.integer(2)))])
  );

  assert.equal(exec(result), ["0"]);
});

test.run();
