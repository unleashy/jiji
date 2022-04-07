import { AssertionError } from "assert";
import { suite } from "uvu";
import * as assert from "uvu/assert";
import { File } from "../../src/file";
import { Span } from "../../src/span";
import { SinosError, errorKinds } from "../../src/error";
import { types } from "../../src/types";
import { Environment, Resolver, Scope } from "../../src/scope";
import { useSpanForBuildingAst } from "../util";

const span = new Span(new File("<test>", ""), 0, 0);
const ast = useSpanForBuildingAst(span);

// Scope
const scopeTest = suite("Scope");

scopeTest("manages bindings", () => {
  const sut = new Scope();

  assert.not.ok(sut.hasBinding("foo"));
  assert.not.ok(sut.getBinding("foo"));

  sut.addUntypedBinding("foo");

  assert.ok(sut.hasBinding("foo"));
  assert.equal(sut.getBinding("foo"), { type: undefined });
});

scopeTest("assigns types to bindings", () => {
  const sut = new Scope();

  sut.addUntypedBinding("typed");

  assert.equal(sut.getBinding("typed"), { type: undefined });

  sut.assignTypeToBinding("typed", types.Bool);

  assert.equal(sut.getBinding("typed"), { type: types.Bool });
});

scopeTest("looks at the parent when searching for bindings", () => {
  const parent = new Scope();
  const sut = new Scope(parent);

  assert.not.ok(sut.hasBinding("inParent"));

  parent.addUntypedBinding("inParent");

  assert.ok(sut.hasBinding("inParent"));
});

// Environment
const envTest = suite("Environment");

envTest("gets and sets scopes on Asts", () => {
  const sut = new Environment();
  const theAst = ast.integer(1);
  const theScope = new Scope();

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

resolverTest("bindings at the module level are in the global scope", () => {
  const sut = new Resolver();

  const theAst = ast.module([ast.letStmt("a", undefined, ast.integer(1))]);
  const env = sut.resolve(theAst);

  const scope = env.getScope(theAst);
  assert.equal(scope.getBinding("a"), { type: undefined });
});

resolverTest("bindings are resolved", () => {
  const sut = new Resolver();

  const theAst = ast.module([
    ast.letStmt("binding", undefined, ast.integer(1)),
    ast.exprStmt(ast.name("binding"))
  ]);
  const env = sut.resolve(theAst);

  const scope = env.getScope(theAst.stmts[1]);
  assert.equal(scope.getBinding("binding"), { type: undefined });
});

resolverTest("errors on unknown names", () => {
  const sut = new Resolver();

  const theAst = ast.module([ast.exprStmt(ast.name("woops"))]);

  try {
    sut.resolve(theAst);
    assert.unreachable("did not throw");
  } catch (e) {
    assert.equal(e, new SinosError(errorKinds.unknownBinding("woops"), span));
  }
});

resolverTest("blocks declare a new scope", () => {
  const sut = new Resolver();

  const theAst = ast.module([
    ast.exprStmt(
      ast.block(
        [
          ast.letStmt("scoped", undefined, ast.boolean(true)),
          ast.exprStmt(ast.name("scoped"))
        ],
        undefined
      )
    )
  ]);

  // Mustn't throw because "scoped" *is* within scope ...
  const env = sut.resolve(theAst);

  // ... but it goes out of scope outside the block
  assert.not(env.getScope(theAst).hasBinding("scoped"));
});

resolverTest("shadowing let statements create a new scope", () => {
  const sut = new Resolver();
  const theAst = ast.module([
    ast.letStmt("shadowed", undefined, ast.integer(1)),
    ast.letStmt("shadowed", undefined, ast.boolean(true)),
    ast.exprStmt(ast.name("shadowed"))
  ]);
  const env = sut.resolve(theAst);

  const firstLetScope = env.getScope(theAst.stmts[0]);
  const secondLetScope = env.getScope(theAst.stmts[1]);

  assert.ok(firstLetScope.hasBinding("shadowed"));
  assert.ok(secondLetScope.hasBinding("shadowed"));
  assert.is(secondLetScope.parent, firstLetScope);
});

scopeTest.run();
envTest.run();
resolverTest.run();
