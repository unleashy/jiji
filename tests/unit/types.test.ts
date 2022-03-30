import { test } from "uvu";
import * as assert from "uvu/assert";
import { File } from "../../src/file";
import { Span } from "../../src/span";
import { SinosError, errorKinds } from "../../src/error";
import { BinaryOp, ast } from "../../src/ast";
import { Types, types } from "../../src/types";

function catchErr<T>(fn: () => T): T | SinosError {
  try {
    return fn();
  } catch (e) {
    if (e instanceof SinosError) {
      return e;
    } else {
      throw e;
    }
  }
}

const span = new Span(new File("<test>", ""), 0, 0);

test("the type of a module is unit", () => {
  const sut = new Types();

  const type = sut.compute(ast.module([], span));

  assert.equal(type, types.Unit);
});

test("the type of a statement is unit", () => {
  const sut = new Types();

  const type = sut.compute(ast.exprStmt(ast.integer(0, span), span));

  assert.equal(type, types.Unit);
});

test("the type of an integer is Int", () => {
  const sut = new Types();

  const type = sut.compute(ast.integer(123, span));

  assert.equal(type, types.Int);
});

test("the type of a boolean is Bool", () => {
  const sut = new Types();

  const trueType = sut.compute(ast.boolean(true, span));
  const falseType = sut.compute(ast.boolean(false, span));

  assert.equal(trueType, types.Bool);
  assert.equal(falseType, types.Bool);
});

test("the type of negating an integer is Int", () => {
  const sut = new Types();

  const type = sut.compute(ast.unary("-", ast.integer(123, span), span));

  assert.equal(type, types.Int);
});

test("the type of plussing an integer is Int", () => {
  const sut = new Types();

  const type = sut.compute(ast.unary("+", ast.integer(123, span), span));

  assert.equal(type, types.Int);
});

test("negating a boolean is an error", () => {
  const sut = new Types();

  const err = catchErr(() =>
    sut.compute(ast.unary("-", ast.boolean(true, span), span))
  );

  assert.equal(
    err,
    new SinosError(errorKinds.unaryTypeMismatch("-", types.Bool), span)
  );
});

test("plussing a boolean is an error", () => {
  const sut = new Types();

  const err = catchErr(() =>
    sut.compute(ast.unary("+", ast.boolean(false, span), span))
  );

  assert.equal(
    err,
    new SinosError(errorKinds.unaryTypeMismatch("+", types.Bool), span)
  );
});

test("the type of not-ing a boolean is Bool", () => {
  const sut = new Types();

  const type = sut.compute(ast.unary("!", ast.boolean(true, span), span));

  assert.equal(type, types.Bool);
});

test("not-ing an integer is an error", () => {
  const sut = new Types();

  const err = catchErr(() =>
    sut.compute(ast.unary("!", ast.integer(0, span), span))
  );

  assert.equal(
    err,
    new SinosError(errorKinds.unaryTypeMismatch("!", types.Int), span)
  );
});

test("the type of arithmetic with two integers is Int", () => {
  const sut = new Types();

  const ops: BinaryOp[] = ["+", "-", "*", "/", "%"];
  const opTypes = ops.map(op =>
    sut.compute(
      ast.binary(ast.integer(123, span), op, ast.integer(123, span), span)
    )
  );

  assert.equal(
    opTypes,
    ops.map(() => types.Int)
  );
});

test("arithmetic with non-Int is an error", () => {
  const sut = new Types();

  const ops: BinaryOp[] = ["+", "-", "*", "/", "%"];
  const errors = ops.map(op =>
    catchErr(() =>
      sut.compute(
        ast.binary(ast.boolean(true, span), op, ast.boolean(false, span), span)
      )
    )
  );

  assert.equal(
    errors,
    ops.map(
      op =>
        new SinosError(
          errorKinds.binaryTypeMismatch(types.Bool, op, types.Bool),
          span
        )
    )
  );
});

test("the type of comparisons is Bool", () => {
  const sut = new Types();

  const ops: BinaryOp[] = ["==", "!=", "<", "<=", ">", ">="];
  const opTypes = ops.map(op =>
    sut.compute(
      ast.binary(ast.integer(123, span), op, ast.integer(123, span), span)
    )
  );

  assert.equal(
    opTypes,
    ops.map(() => types.Bool)
  );
});

test("comparing different types for equality is an error", () => {
  const sut = new Types();

  const ops: BinaryOp[] = ["==", "!="];
  const errors = ops.map(op =>
    catchErr(() =>
      sut.compute(
        ast.binary(ast.integer(123, span), op, ast.boolean(true, span), span)
      )
    )
  );

  assert.equal(
    errors,
    ops.map(
      op =>
        new SinosError(
          errorKinds.binaryTypeMismatch(types.Int, op, types.Bool),
          span
        )
    )
  );
});

test("comparing non-Ints for order is an error", () => {
  const sut = new Types();

  const ops: BinaryOp[] = ["<", "<=", ">", ">="];
  const errors = ops.map(op =>
    catchErr(() =>
      sut.compute(
        ast.binary(ast.boolean(true, span), op, ast.boolean(true, span), span)
      )
    )
  );

  assert.equal(
    errors,
    ops.map(
      op =>
        new SinosError(
          errorKinds.binaryTypeMismatch(types.Bool, op, types.Bool),
          span
        )
    )
  );
});

test("typechecking is done as deep as possible", () => {
  const sut = new Types();

  const error = catchErr(() =>
    sut.compute(
      ast.module(
        [
          ast.exprStmt(ast.unary("-", ast.integer(123, span), span), span),
          ast.exprStmt(
            ast.binary(
              ast.integer(1, span),
              "+",
              ast.unary("!", ast.boolean(false, span), span),
              span
            ),
            span
          )
        ],
        span
      )
    )
  );

  assert.equal(
    error,
    new SinosError(
      errorKinds.binaryTypeMismatch(types.Int, "+", types.Bool),
      span
    )
  );
});

test.run();
