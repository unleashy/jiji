import { AssertionError } from "assert";
import { suite } from "uvu";
import * as assert from "uvu/assert";
import { File } from "../../src/file";
import { Span } from "../../src/span";
import { JijiError, errorKinds } from "../../src/error";
import { types } from "../../src/types";
import { Environment, Resolver, Scope } from "../../src/scope";
import { useSpanForBuildingAst } from "../util";

const span = new Span(new File("<test>", ""), 0, 0);
const ast = useSpanForBuildingAst(span);

// Scope
const scopeTest = suite("Scope");

scopeTest("manages bindings", () => {
  const sut = new Scope("");

  assert.not.ok(sut.hasBinding("foo"));
  assert.not.ok(sut.getBinding("foo"));

  const sut2 = new Scope("foo");

  assert.ok(sut2.hasBinding("foo"));
  assert.equal(sut2.getBinding("foo"), { name: "foo", type: undefined });
});

scopeTest("assigns types to bindings", () => {
  const sut = new Scope("typed");

  assert.equal(sut.getBinding("typed"), { name: "typed", type: undefined });

  sut.assignType(types.Bool);

  assert.equal(sut.getBinding("typed"), { name: "typed", type: types.Bool });
});

scopeTest("looks at the parent when searching for bindings", () => {
  const parent = new Scope("inParent");
  const sut = new Scope("other", parent);

  assert.ok(sut.hasBinding("inParent"));
});

// Environment
const envTest = suite("Environment");

envTest("gets and sets scopes on Asts", () => {
  const sut = new Environment();
  const theAst = ast.integer(1);
  const theScope = new Scope("");

  sut.setScope(theAst, theScope);
  assert.is(sut.getScope(theAst), theScope);
});

envTest("errors if no scope exists for a given ast", () => {
  const sut = new Environment();

  assert.throws(
    () => sut.getScope(ast.integer(1)),
    (err: unknown) => err instanceof AssertionError
  );
});

// Resolver
const resolverTest = suite("Resolver");

resolverTest("let statements declare new scopes", () => {
  const sut = new Resolver();

  const theAst = ast.module([
    ast.exprStmt(ast.string("before let")),
    ast.letStmt("a", undefined, ast.integer(1)),
    ast.exprStmt(ast.string("after let"))
  ]);
  const env = sut.resolve(theAst);

  const beforeLetScope = env.getScope(theAst.stmts[0]);
  const afterLetScope = env.getScope(theAst.stmts[2]);
  assert.equal(beforeLetScope.getBinding("a"), undefined);
  assert.equal(afterLetScope.getBinding("a"), { name: "a", type: undefined });
});

resolverTest("bindings are resolved", () => {
  const sut = new Resolver();

  const theAst = ast.module([
    ast.letStmt("binding", undefined, ast.integer(1)),
    ast.exprStmt(ast.name("binding"))
  ]);
  const env = sut.resolve(theAst);

  const scope = env.getScope(theAst.stmts[1]);
  assert.equal(scope.getBinding("binding"), {
    name: "binding",
    type: undefined
  });
});

resolverTest("errors on unknown names", () => {
  const sut = new Resolver();

  const theAst = ast.module([ast.exprStmt(ast.name("woops"))]);

  try {
    sut.resolve(theAst);
    assert.unreachable("did not throw");
  } catch (e) {
    assert.equal(e, new JijiError(errorKinds.unknownBinding("woops"), span));
  }
});

resolverTest("blocks do not declare a new scope", () => {
  const sut = new Resolver();

  const theAst = ast.module([
    ast.exprStmt(ast.block([ast.exprStmt(ast.integer(1))], undefined))
  ]);
  const env = sut.resolve(theAst);

  assert.is(env.getScope(theAst), env.getScope(theAst.stmts[0]));
});

scopeTest.run();
envTest.run();
resolverTest.run();
