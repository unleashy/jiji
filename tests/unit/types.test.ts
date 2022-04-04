import { test } from "uvu";
import * as assert from "uvu/assert";
import { File } from "../../src/file";
import { Span } from "../../src/span";
import { SinosError, errorKinds } from "../../src/error";
import { BasicOp, Ast, AstExpr, BinaryOp, OrderingOp } from "../../src/ast";
import { useSpanForBuildingAst } from "../util";
import { Type, Types, types } from "../../src/types";

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
const ast = useSpanForBuildingAst(span);

test("the type of a module is Unit", () => {
  const sut = new Types();

  const type = sut.typeOf(ast.module([]));

  assert.equal(type, types.Unit);
});

test("the type of a statement is Unit", () => {
  const sut = new Types();

  const type = sut.typeOf(ast.exprStmt(ast.integer(0)));

  assert.equal(type, types.Unit);
});

test("the type of an integer is Int", () => {
  const sut = new Types();

  const type = sut.typeOf(ast.integer(123));

  assert.equal(type, types.Int);
});

test("the type of a float is Float", () => {
  const sut = new Types();

  const type = sut.typeOf(ast.float(3.14));

  assert.equal(type, types.Float);
});

test("the type of a string is String", () => {
  const sut = new Types();

  const type = sut.typeOf(ast.string("abc"));

  assert.equal(type, types.String);
});

test("the type of a boolean is Bool", () => {
  const sut = new Types();

  const trueType = sut.typeOf(ast.boolean(true));
  const falseType = sut.typeOf(ast.boolean(false));

  assert.equal(trueType, types.Bool);
  assert.equal(falseType, types.Bool);
});

test("the type of a group is the type of its expression", () => {
  const sut = new Types();

  const type = sut.typeOf(ast.group(ast.integer(1)));

  assert.equal(type, types.Int);
});

test("negating works for Ints and Floats", () => {
  const sut = new Types();
  const cases = [
    { node: ast.integer(123), ty: types.Int },
    { node: ast.float(3.14), ty: types.Float },
    { node: ast.boolean(true), ty: types.Bool, err: true },
    { node: ast.string("foo"), ty: types.String, err: true }
  ];

  const result = cases.map(({ node }) =>
    catchErr(() => sut.typeOf(ast.unary("-", node)))
  );

  assert.equal(
    result,
    cases.map(({ ty, err }) => {
      if (!err) {
        return ty;
      } else {
        return new SinosError(errorKinds.unaryTypeMismatch("-", ty), span);
      }
    })
  );
});

test("plussing works for Ints and Floats", () => {
  const sut = new Types();
  const cases = [
    { node: ast.integer(123), ty: types.Int },
    { node: ast.float(3.14), ty: types.Float },
    { node: ast.boolean(true), ty: types.Bool, err: true },
    { node: ast.string("foo"), ty: types.String, err: true }
  ];

  const result = cases.map(({ node }) =>
    catchErr(() => sut.typeOf(ast.unary("+", node)))
  );

  assert.equal(
    result,
    cases.map(({ ty, err }) => {
      if (!err) {
        return ty;
      } else {
        return new SinosError(errorKinds.unaryTypeMismatch("+", ty), span);
      }
    })
  );
});

test("not-ing works for Bools", () => {
  const sut = new Types();
  const cases = [
    { node: ast.boolean(true), ty: types.Bool },
    { node: ast.integer(123), ty: types.Int, err: true },
    { node: ast.float(3.14), ty: types.Float, err: true },
    { node: ast.string("foo"), ty: types.String, err: true }
  ];

  const result = cases.map(({ node }) =>
    catchErr(() => sut.typeOf(ast.unary("!", node)))
  );

  assert.equal(
    result,
    cases.map(({ ty, err }) => {
      if (!err) {
        return ty;
      } else {
        return new SinosError(errorKinds.unaryTypeMismatch("!", ty), span);
      }
    })
  );
});

test("the type of arithmetic with two integers is Int", () => {
  const sut = new Types();

  const ops: BasicOp[] = ["+", "-", "*", "/", "%"];
  const opTypes = ops.map(op =>
    sut.typeOf(ast.binary(ast.integer(123), op, ast.integer(123)))
  );

  assert.equal(
    opTypes,
    ops.map(() => types.Int)
  );
});

test("the type of arithmetic with two floats is Float", () => {
  const sut = new Types();

  const ops: BasicOp[] = ["+", "-", "*", "/", "%"];
  const opTypes = ops.map(op =>
    sut.typeOf(ast.binary(ast.float(123), op, ast.float(123)))
  );

  assert.equal(
    opTypes,
    ops.map(() => types.Float)
  );
});

test("arithmetic with non-Ints/Floats is an error", () => {
  const sut = new Types();

  const ops: BasicOp[] = ["+", "-", "*", "/", "%"];
  const errors = ops.map(op =>
    catchErr(() =>
      sut.typeOf(ast.binary(ast.boolean(true), op, ast.boolean(false)))
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

test("the type of concatenating two strings is String", () => {
  const sut = new Types();

  const type = sut.typeOf(ast.binary(ast.string("a"), "~", ast.string("b")));

  assert.equal(type, types.String);
});

test("concatenating non-Strings is an error", () => {
  const sut = new Types();

  const err = catchErr(() =>
    sut.typeOf(ast.binary(ast.integer(1), "~", ast.boolean(false)))
  );

  assert.equal(
    err,
    new SinosError(
      errorKinds.binaryTypeMismatch(types.Int, "~", types.Bool),
      span
    )
  );
});

test("the type of comparing ints is Bool", () => {
  const sut = new Types();

  const ops: BinaryOp[] = ["==", "!=", "<", "<=", ">", ">="];
  const opTypes = ops.map(op =>
    sut.typeOf(ast.binary(ast.integer(123), op, ast.integer(123)))
  );

  assert.equal(
    opTypes,
    ops.map(() => types.Bool)
  );
});

test("the type of comparing floats is Bool", () => {
  const sut = new Types();

  const ops: BinaryOp[] = ["==", "!=", "<", "<=", ">", ">="];
  const opTypes = ops.map(op =>
    sut.typeOf(ast.binary(ast.float(123), op, ast.float(123)))
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
      sut.typeOf(ast.binary(ast.integer(123), op, ast.boolean(true)))
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

test("comparing non-Ints/Floats for order is an error", () => {
  const sut = new Types();

  const ops: OrderingOp[] = ["<", "<=", ">", ">="];
  const errors = ops.map(op =>
    catchErr(() =>
      sut.typeOf(ast.binary(ast.boolean(true), op, ast.boolean(true)))
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

test("typechecking is done as deeply as possible", () => {
  const sut = new Types();

  const error = catchErr(() =>
    sut.typeOf(
      ast.module([
        ast.exprStmt(ast.unary("-", ast.integer(123))),
        ast.exprStmt(
          ast.binary(ast.integer(1), "+", ast.unary("!", ast.boolean(false)))
        )
      ])
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

test("the type of a let statement is inferred", () => {
  const sut = new Types();

  sut.typeOf(ast.letStmt("a", undefined, ast.integer(1)));

  assert.equal(sut.typeOfBinding("a"), types.Int);
});

test("there is no type for a nonexistent binding", () => {
  const sut = new Types();

  sut.typeOf(ast.letStmt("b", undefined, ast.integer(1)));

  assert.equal(sut.typeOfBinding("a"), undefined);
});

test("the ascribed type of a let statement is checked against its inferred type", () => {
  const sut = new Types();

  sut.typeOf(ast.letStmt("a", "Bool", ast.boolean(true)));

  assert.equal(sut.typeOfBinding("a"), types.Bool);

  const error = catchErr(() =>
    sut.typeOf(ast.letStmt("b", "Int", ast.boolean(false)))
  );

  assert.equal(
    error,
    new SinosError(errorKinds.letTypeMismatch(types.Int, types.Bool), span)
  );
});

test("the ascribed type of a let statement must exist", () => {
  const sut = new Types();

  const error = catchErr(() =>
    sut.typeOf(ast.letStmt("a", "Unpossible", ast.boolean(true)))
  );

  assert.equal(
    error,
    new SinosError(errorKinds.unknownType("Unpossible"), span)
  );
});

test("the type of a binding is its previously declared type", () => {
  const sut = new Types();

  // should not throw since `a` is indeed an int and can be compared against an
  // int [1]
  const result = catchErr(() =>
    sut.typeOf(
      ast.module([
        ast.letStmt("a", "Int", ast.integer(1)),
        ast.exprStmt(
          // [1]
          ast.binary(ast.name("a"), "==", ast.integer(1))
        )
      ])
    )
  );

  assert.equal(result, types.Unit);
});

test("errors on undeclared binding", () => {
  const sut = new Types();

  const error = catchErr(() =>
    sut.typeOf(
      ast.module([
        ast.exprStmt(ast.name("a")),
        ast.letStmt("a", undefined, ast.boolean(true))
      ])
    )
  );

  assert.equal(error, new SinosError(errorKinds.unknownBinding("a"), span));
});

test("bindings are allowed to shadow", () => {
  const sut = new Types();

  sut.typeOf(
    ast.module([
      ast.letStmt("a", undefined, ast.boolean(true)),
      ast.letStmt("a", undefined, ast.integer(123))
    ])
  );

  assert.equal(sut.typeOfBinding("a"), types.Int);
});

test.run();
