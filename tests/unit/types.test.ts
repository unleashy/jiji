import { test } from "uvu";
import * as assert from "uvu/assert";
import { File } from "../../src/file";
import { Span } from "../../src/span";
import { JijiError, errorKinds } from "../../src/error";
import { Ast, AstModule, BasicOp, BinaryOp, OrderingOp } from "../../src/ast";
import { Environment, Resolver } from "../../src/scope";
import { Types, types } from "../../src/types";
import { useSpanForBuildingAst } from "../util";

function catchErr<T>(fn: () => T): T | JijiError {
  try {
    return fn();
  } catch (e) {
    if (e instanceof JijiError) {
      return e;
    } else {
      throw e;
    }
  }
}

const span = new Span(new File("<test>", ""), 0, 0);
const ast = useSpanForBuildingAst(span);

interface SetupResult<A extends Ast> {
  sut: Types;
  env?: Environment;
  theAst?: A;
}

function setup<A extends Ast>(): SetupResult<A>;
function setup<A extends Ast>(theAst: A): Required<SetupResult<A>>;
function setup<A extends Ast>(theAst?: A) {
  if (theAst) {
    const astModule: AstModule = (() => {
      switch (theAst.kind) {
        case "module":
          return theAst;

        case "letStmt":
        case "exprStmt":
          return ast.module([theAst]);

        default:
          return ast.module([ast.exprStmt(theAst)]);
      }
    })();
    const env = new Resolver().resolve(astModule);
    const sut = new Types(env);

    return { sut, env, theAst };
  } else {
    return { sut: new Types(new Environment()) };
  }
}

test("the type of a module is Unit", () => {
  const { sut } = setup();

  const type = sut.typeOf(ast.module([]));

  assert.equal(type, types.Unit);
});

test("the type of a statement is Unit", () => {
  const { sut } = setup();

  const type = sut.typeOf(ast.exprStmt(ast.integer(0)));

  assert.equal(type, types.Unit);
});

test("the type of an integer is Int", () => {
  const { sut } = setup();

  const type = sut.typeOf(ast.integer(123));

  assert.equal(type, types.Int);
});

test("the type of a float is Float", () => {
  const { sut } = setup();

  const type = sut.typeOf(ast.float(3.14));

  assert.equal(type, types.Float);
});

test("the type of a string is String", () => {
  const { sut } = setup();

  const type = sut.typeOf(ast.string("abc"));

  assert.equal(type, types.String);
});

test("the type of a boolean is Bool", () => {
  const { sut } = setup();

  const trueType = sut.typeOf(ast.boolean(true));
  const falseType = sut.typeOf(ast.boolean(false));

  assert.equal(trueType, types.Bool);
  assert.equal(falseType, types.Bool);
});

test("the type of a group is the type of its expression", () => {
  const { sut } = setup();

  const type = sut.typeOf(ast.group(ast.integer(1)));

  assert.equal(type, types.Int);
});

test("negating works for Ints and Floats", () => {
  const { sut } = setup();
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
        return new JijiError(errorKinds.unaryTypeMismatch("-", ty), span);
      }
    })
  );
});

test("plussing works for Ints and Floats", () => {
  const { sut } = setup();
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
        return new JijiError(errorKinds.unaryTypeMismatch("+", ty), span);
      }
    })
  );
});

test("not-ing works for Bools", () => {
  const { sut } = setup();
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
        return new JijiError(errorKinds.unaryTypeMismatch("!", ty), span);
      }
    })
  );
});

test("the type of arithmetic with two integers is Int", () => {
  const { sut } = setup();

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
  const { sut } = setup();

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
  const { sut } = setup();

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
        new JijiError(
          errorKinds.binaryTypeMismatch(types.Bool, op, types.Bool),
          span
        )
    )
  );
});

test("the type of concatenating two strings is String", () => {
  const { sut } = setup();

  const type = sut.typeOf(ast.binary(ast.string("a"), "~", ast.string("b")));

  assert.equal(type, types.String);
});

test("concatenating non-Strings is an error", () => {
  const { sut } = setup();

  const err = catchErr(() =>
    sut.typeOf(ast.binary(ast.integer(1), "~", ast.boolean(false)))
  );

  assert.equal(
    err,
    new JijiError(
      errorKinds.binaryTypeMismatch(types.Int, "~", types.Bool),
      span
    )
  );
});

test("the type of comparing ints is Bool", () => {
  const { sut } = setup();

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
  const { sut } = setup();

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
  const { sut } = setup();

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
        new JijiError(
          errorKinds.binaryTypeMismatch(types.Int, op, types.Bool),
          span
        )
    )
  );
});

test("comparing non-Ints/Floats for order is an error", () => {
  const { sut } = setup();

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
        new JijiError(
          errorKinds.binaryTypeMismatch(types.Bool, op, types.Bool),
          span
        )
    )
  );
});

test("typechecking is done as deeply as possible", () => {
  const { sut } = setup();

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
    new JijiError(
      errorKinds.binaryTypeMismatch(types.Int, "+", types.Bool),
      span
    )
  );
});

test("the type of a let statement is inferred", () => {
  const { sut, env, theAst } = setup(
    ast.module([ast.letStmt("a", undefined, ast.integer(1))])
  );

  const letAst = theAst.stmts[0];

  sut.typeOf(letAst);

  assert.equal(env.getScope(letAst).getBinding("a")?.type, types.Int);
});

test("the ascribed type of a let statement is checked against its inferred type", () => {
  const { sut, theAst } = setup(
    ast.module([ast.letStmt("a", "Int", ast.boolean(true))])
  );

  const letAst = theAst.stmts[0];
  const error = catchErr(() => sut.typeOf(letAst));

  assert.equal(
    error,
    new JijiError(errorKinds.letTypeMismatch(types.Int, types.Bool), span)
  );
});

test("the ascribed type of a let statement must exist", () => {
  const { sut } = setup();

  const error = catchErr(() =>
    sut.typeOf(ast.letStmt("a", "Unpossible", ast.boolean(true)))
  );

  assert.equal(
    error,
    new JijiError(errorKinds.unknownType("Unpossible"), span)
  );
});

test("the type of a binding is its previously declared type", () => {
  const { sut, env, theAst } = setup(
    ast.module([
      ast.letStmt("a", "Int", ast.integer(1)),
      ast.exprStmt(ast.binary(ast.name("a"), "==", ast.integer(1)))
    ])
  );

  const result = catchErr(() => sut.typeOf(theAst));

  assert.equal(result, types.Unit);
  assert.equal(env.getScope(theAst.stmts[1]).getBinding("a")?.type, types.Int);
});

test("bindings are allowed to shadow", () => {
  const { sut, env, theAst } = setup(
    ast.module([
      ast.letStmt("a", undefined, ast.boolean(true)),
      ast.letStmt("a", undefined, ast.integer(123)),
      ast.exprStmt(ast.name("a"))
    ])
  );

  sut.typeOf(theAst);

  const firstLetScope = env.getScope(theAst.stmts[0]);
  const secondLetScope = env.getScope(theAst.stmts[1]);

  assert.equal(firstLetScope.getBinding("a")?.type, types.Bool);
  assert.equal(secondLetScope.getBinding("a")?.type, types.Int);
});

test("the type of a block without a last expression is Unit", () => {
  const { sut } = setup();

  const result = sut.typeOf(
    ast.block([ast.exprStmt(ast.integer(1))], undefined)
  );

  assert.equal(result, types.Unit);
});

test("the type of a block with a last expression is the last expression's type", () => {
  const { sut } = setup();

  const result = sut.typeOf(ast.block([], ast.integer(1)));

  assert.equal(result, types.Int);
});

test("blocks typecheck all of their contents", () => {
  const { sut } = setup();

  // must throw because block typechecks its contents and you can't negate
  // a boolean
  const err = catchErr(() =>
    sut.typeOf(
      ast.block([ast.exprStmt(ast.unary("-", ast.boolean(true)))], undefined)
    )
  );

  assert.not.equal(err, types.Unit);
});

test("the type of an if is the type of all its blocks", () => {
  const { sut } = setup();

  const type = sut.typeOf(
    ast.if(
      [
        [ast.boolean(true), ast.block([], ast.integer(5))],
        [ast.boolean(false), ast.block([], ast.integer(42))]
      ],
      ast.block([], ast.integer(100))
    )
  );

  assert.equal(type, types.Int);
});

test("errors if the type of an if condition isn't bool", () => {
  const { sut } = setup();

  const err = catchErr(() =>
    sut.typeOf(ast.if([[ast.integer(1), ast.block([], undefined)]], undefined))
  );

  assert.equal(err, new JijiError(errorKinds.ifCondNotBool(types.Int), span));
});

test("the expected type of an if without an else is Unit", () => {
  const { sut } = setup();

  const err = catchErr(() =>
    sut.typeOf(
      ast.if([[ast.boolean(true), ast.block([], ast.integer(1))]], undefined)
    )
  );

  assert.equal(
    err,
    new JijiError(errorKinds.ifTypeMismatch(types.Int, types.Unit), span)
  );
});

test("errors if some branch of an if has a different type", () => {
  const { sut } = setup();

  const err = catchErr(() =>
    sut.typeOf(
      ast.if(
        [
          [ast.boolean(true), ast.block([], ast.string("if"))],
          [ast.boolean(true), ast.block([], ast.boolean(false))]
        ],
        ast.block([], ast.string("else"))
      )
    )
  );

  assert.equal(
    err,
    new JijiError(errorKinds.ifTypeMismatch(types.Bool, types.String), span)
  );
});

test.run();
