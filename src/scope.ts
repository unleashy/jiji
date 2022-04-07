import { strict as assert } from "assert";
import { SinosError, errorKinds } from "./error";
import { Type } from "./types";
import { Ast, AstExpr, AstModule, AstStmt } from "./ast";

export interface Binding {
  type: Type | undefined;
}

export class Scope {
  readonly parent: Scope | undefined = undefined;

  private readonly bindings = new Map<string, Binding>();

  constructor(parent?: Scope) {
    this.parent = parent;
  }

  addUntypedBinding(name: string): void {
    this.bindings.set(name, { type: undefined });
  }

  assignTypeToBinding(name: string, type: Type): void {
    const binding = this.bindings.get(name);
    assert.ok(binding, "trying to assign type to a non-existent binding");

    binding.type = type;
  }

  getBinding(name: string): Readonly<Binding> | undefined {
    return this.bindings.get(name) ?? this.parent?.getBinding(name);
  }

  hasBinding(name: string): boolean {
    return this.getBinding(name) !== undefined;
  }
}

export class Environment {
  private readonly scopeMap = new WeakMap<Ast, Scope>();

  setScope(ast: Ast, scope: Scope): void {
    this.scopeMap.set(ast, scope);
  }

  getScope(ast: Ast): Scope {
    const result = this.scopeMap.get(ast);
    assert.ok(result, "no scope for given ast");

    return result;
  }
}

export class Resolver {
  resolve(ast: AstModule): Environment {
    const env = new Environment();
    const globalScope = new Scope();

    env.setScope(ast, globalScope);

    let currentScope = globalScope;
    for (const stmt of ast.stmts) {
      currentScope = this.resolveStmt(env, currentScope, stmt);
    }

    return env;
  }

  private resolveStmt(env: Environment, scope: Scope, ast: AstStmt): Scope {
    switch (ast.kind) {
      case "letStmt": {
        this.resolveExpr(env, scope, ast.value);

        const letScope = scope.hasBinding(ast.name) ? new Scope(scope) : scope;
        letScope.addUntypedBinding(ast.name);

        env.setScope(ast, letScope);

        return letScope;
      }

      case "exprStmt":
        env.setScope(ast, scope);
        this.resolveExpr(env, scope, ast.expr);
        return scope;
    }
  }

  private resolveExpr(env: Environment, scope: Scope, ast: AstExpr): void {
    env.setScope(ast, scope);

    switch (ast.kind) {
      case "block": {
        let currentScope = new Scope(scope);
        for (const stmt of ast.stmts) {
          currentScope = this.resolveStmt(env, currentScope, stmt);
        }

        break;
      }

      case "if": {
        for (const [cond, block] of ast.branches) {
          this.resolveExpr(env, scope, cond);
          this.resolveExpr(env, scope, block);
        }

        if (ast.elseBranch) {
          this.resolveExpr(env, scope, ast.elseBranch);
        }

        break;
      }

      case "binary": {
        this.resolveExpr(env, scope, ast.left);
        this.resolveExpr(env, scope, ast.right);

        break;
      }

      case "unary":
      case "group": {
        this.resolveExpr(env, scope, ast.expr);

        break;
      }

      case "name": {
        if (!scope.hasBinding(ast.value)) {
          throw new SinosError(errorKinds.unknownBinding(ast.value), ast.span);
        }
      }
    }

    // All other expr types are terminal and need no further resolving
  }
}
