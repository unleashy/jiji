import { test } from "uvu";
import * as assert from "uvu/assert";
import { File } from "../../src/file";
import { Span } from "../../src/span";
import { SinosError, errorKinds } from "../../src/error";
import { BasicOp, BinaryOp, OrderingOp } from "../../src/ast";
import { Environment, Resolver } from "../../src/scope";
import { Types, types } from "../../src/types";
import { useSpanForBuildingAst } from "../util";

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

function setup() {
  return new Types(new Environment());
}

test("the type of a module is Unit", () => {
  const sut = setup();

  const type = sut.typeOf(ast.module([]));

  assert.equal(type, types.Unit);
});

test("the type of a statement is Unit", () => {
  const sut = setup();

  const type = sut.typeOf(ast.exprStmt(ast.integer(0)));

  assert.equal(type, types.Unit);
});

test("the type of an integer is Int", () => {
  const sut = setup();

  const type = sut.typeOf(ast.integer(123));

  assert.equal(type, types.Int);
});

test("the type of a float is Float", () => {
  const sut = setup();

  const type = sut.typeOf(ast.float(3.14));

  assert.equal(type, types.Float);
});

test("the type of a string is String", () => {
  const sut = setup();

  const type = sut.typeOf(ast.string("abc"));

  assert.equal(type, types.String);
});

test("the type of a boolean is Bool", () => {
  const sut = setup();

  const trueType = sut.typeOf(ast.boolean(true));
  const falseType = sut.typeOf(ast.boolean(false));

  assert.equal(trueType, types.Bool);
  assert.equal(falseType, types.Bool);
});

test("the type of a group is the type of its expression", () => {
  const sut = setup();

  const type = sut.typeOf(ast.group(ast.integer(1)));

  assert.equal(type, types.Int);
});

test("negating works for Ints and Floats", () => {
  const sut = setup();
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
  const sut = setup();
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
  const sut = setup();
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
  const sut = setup();

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
  const sut = setup();

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
  const sut = setup();

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
  const sut = setup();

  const type = sut.typeOf(ast.binary(ast.string("a"), "~", ast.string("b")));

  assert.equal(type, types.String);
});

test("concatenating non-Strings is an error", () => {
  const sut = setup();

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
  const sut = setup();

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
  const sut = setup();

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
  const sut = setup();

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
  const sut = setup();

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
  const sut = setup();

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
  const theAst = ast.module([ast.letStmt("a", undefined, ast.integer(1))]);
  const env = new Resolver().resolve(theAst);
  const sut = new Types(env);

  const letAst = theAst.stmts[0];

  sut.typeOf(letAst);

  assert.equal(env.getScope(letAst).getBinding("a")?.type, types.Int);
});

test("the ascribed type of a let statement is checked against its inferred type", () => {
  const theAst = ast.module([ast.letStmt("a", "Int", ast.boolean(true))]);
  const env = new Resolver().resolve(theAst);
  const sut = new Types(env);

  const letAst = theAst.stmts[0];
  const error = catchErr(() => sut.typeOf(letAst));

  assert.equal(
    error,
    new SinosError(errorKinds.letTypeMismatch(types.Int, types.Bool), span)
  );
});

test("the ascribed type of a let statement must exist", () => {
  const sut = setup();

  const error = catchErr(() =>
    sut.typeOf(ast.letStmt("a", "Unpossible", ast.boolean(true)))
  );

  assert.equal(
    error,
    new SinosError(errorKinds.unknownType("Unpossible"), span)
  );
});

test("the type of a binding is its previously declared type", () => {
  const theAst = ast.module([
    ast.letStmt("a", "Int", ast.integer(1)),
    ast.exprStmt(
      // [1]
      ast.binary(ast.name("a"), "==", ast.integer(1))
    )
  ]);
  const env = new Resolver().resolve(theAst);
  const sut = new Types(env);

  const result = catchErr(() => sut.typeOf(theAst));

  assert.equal(result, types.Unit);
  assert.equal(env.getScope(theAst).getBinding("a")?.type, types.Int);
});

test("bindings are allowed to shadow", () => {
  const theAst = ast.module([
    ast.letStmt("a", undefined, ast.boolean(true)),
    ast.letStmt("a", undefined, ast.integer(123)),
    ast.exprStmt(ast.name("a"))
  ]);
  const env = new Resolver().resolve(theAst);
  const sut = new Types(env);

  sut.typeOf(theAst);

  const firstLetScope = env.getScope(theAst.stmts[0]);
  const secondLetScope = env.getScope(theAst.stmts[1]);

  assert.equal(firstLetScope.getBinding("a")?.type, types.Bool);
  assert.equal(secondLetScope.getBinding("a")?.type, types.Int);
});

test.run();
