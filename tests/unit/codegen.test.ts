import { test } from "uvu";
import * as assert from "uvu/assert";
import { File } from "../../src/file";
import { Span } from "../../src/span";
import { BinaryOp, ast } from "../../src/ast";
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

test("nothing happens for an effectively empty AST", () => {
  const sut = new Codegen();

  const result = sut.generate(ast.module([], span));

  assert.equal(exec(result), []);
});

test("expression statements get logged", () => {
  const sut = new Codegen();

  const result = sut.generate(
    ast.module(
      [
        ast.exprStmt(ast.integer(42, span), span),
        ast.exprStmt(ast.boolean(true, span), span),
        ast.exprStmt(ast.unary("!", ast.boolean(true, span), span), span),
        ast.exprStmt(ast.unary("-", ast.integer(999, span), span), span),
        ast.exprStmt(ast.unary("+", ast.integer(50, span), span), span),
        ast.exprStmt(
          ast.binary(ast.integer(1, span), "+", ast.integer(2, span), span),
          span
        ),
        ast.exprStmt(
          ast.binary(
            ast.binary(ast.integer(50, span), "*", ast.integer(50, span), span),
            "==",
            ast.integer(2500, span),
            span
          ),
          span
        ),
        ast.exprStmt(
          ast.binary(
            ast.group(
              ast.binary(ast.integer(1, span), "+", ast.integer(2, span), span),
              span
            ),
            "*",
            ast.integer(3, span),
            span
          ),
          span
        )
      ],
      span
    )
  );

  assert.equal(exec(result), [
    "42",
    "true",
    "false",
    "-999",
    "50",
    "3",
    "true",
    "9"
  ]);
});

test.run();
