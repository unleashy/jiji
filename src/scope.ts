import { strict as assert } from "assert";
import { JijiError, errorKinds } from "./error";
import { Type } from "./types";
import { Ast, AstExpr, AstModule, AstStmt } from "./ast";

export interface Binding {
  name: string;
  type: Type | undefined;
}

export class Scope {
  public readonly parent: Scope | undefined;
  private readonly binding: Binding;

  constructor(name: string, parent?: Scope) {
    this.binding = { name, type: undefined };
    this.parent = parent;
  }

  assignType(type: Type): void {
    this.binding.type = type;
  }

  getBinding(name: string): Readonly<Binding> | undefined {
    return this.binding.name === name
      ? this.binding
      : this.parent?.getBinding(name);
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
    const globalScope = new Scope("");

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

        const letScope = new Scope(ast.name, scope);
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
        let currentScope = scope;
        for (const stmt of ast.stmts) {
          currentScope = this.resolveStmt(env, currentScope, stmt);
        }

        if (ast.lastExpr) {
          this.resolveExpr(env, currentScope, ast.lastExpr);
        }

        break;
      }

      case "if": {
        this.resolveExpr(env, scope, ast.condition);
        this.resolveExpr(env, scope, ast.consequent);
        if (ast.alternate) this.resolveExpr(env, scope, ast.alternate);

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
          throw new JijiError(errorKinds.unknownBinding(ast.value), ast.span);
        }
      }
    }

    // All other expr types are terminal and need no further resolving
  }
}
