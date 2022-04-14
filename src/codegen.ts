import { customAlphabet } from "nanoid/non-secure";
import {
  AstBinary,
  AstBlock,
  AstExpr,
  AstGroup,
  AstIf,
  AstModule,
  AstStmt,
  AstUnary
} from "./ast";
import { Environment } from "./scope";
import { types, Types } from "./types";

export class Codegen {
  constructor(
    private readonly env: Environment,
    private readonly types: Types
  ) {}

  generate(ast: AstModule): string {
    let result = '"use strict";';

    for (const stmt of ast.stmts) {
      result += this.genStmt(stmt);
    }

    return result;
  }

  private genStmt(stmt: AstStmt): string {
    switch (stmt.kind) {
      case "letStmt": {
        const { sideEffects, result } = this.genExpr(stmt.value);
        if (this.env.getScope(stmt.value).hasBinding(stmt.name)) {
          return `${sideEffects}${stmt.name} = ${result};`;
        } else {
          return `${sideEffects}let ${stmt.name} = ${result};`;
        }
      }

      case "exprStmt": {
        const { sideEffects, result } = this.genExpr(stmt.expr);
        if (this.types.typeOf(stmt.expr) === types.Unit) {
          return `${sideEffects}${result}`;
        } else {
          return `${sideEffects}console.log(${result});`;
        }
      }
    }
  }

  private genExpr(expr: AstExpr): GenResult {
    switch (expr.kind) {
      case "block":
        return this.genBlock(expr);

      case "if":
        return this.genIf(expr);

      case "binary":
        return this.genBinary(expr);

      case "unary":
        return this.genUnary(expr);

      case "group":
        return this.genGroup(expr);

      case "name":
      case "integer":
      case "float":
      case "boolean":
        return GenResult.withoutSideEffects(String(expr.value));

      case "string":
        return GenResult.withoutSideEffects(JSON.stringify(expr.value));
    }
  }

  private genBlock(expr: AstBlock): GenResult {
    const stmts = expr.stmts.map(stmt => this.genStmt(stmt)).join("");

    if (expr.lastExpr) {
      const lastExpr = this.genExpr(expr.lastExpr);

      if (this.types.typeOf(expr.lastExpr) === types.Unit) {
        return GenResult.withoutResult(`{${stmts}${lastExpr.sideEffects}}`);
      } else {
        const tmpVar = uniqueName();
        return new GenResult(
          `let ${tmpVar};{${stmts}${lastExpr.sideEffects}${tmpVar} = ${lastExpr.result};}`,
          tmpVar
        );
      }
    } else {
      return GenResult.withoutResult(`{${stmts}}`);
    }
  }

  private genIf(expr: AstIf): GenResult {
    throw new Error("todo");
  }

  private genBinary(expr: AstBinary): GenResult {
    const left = this.genExpr(expr.left);
    const right = this.genExpr(expr.right);
    const op = (() => {
      // prettier-ignore
      switch (expr.op) {
        case "==":
          return "===";
        case "!=":
          return "!==";
        case "~":
          return "+";
        default:
          return expr.op;
      }
    })();

    let result = `${left.result} ${op} ${right.result}`;
    if (op === "/" && this.types.typeOf(expr) === types.Int) {
      result = `(${result}) | 0`;
    }

    return left.joinSideEffects(right).setResult(result);
  }

  private genGroup(expr: AstGroup): GenResult {
    const gen = this.genExpr(expr.expr);
    if (this.types.typeOf(expr.expr) === types.Unit) {
      return gen;
    } else {
      return gen.mapResult(result => `(${result})`);
    }
  }

  private genUnary(expr: AstUnary): GenResult {
    return this.genExpr(expr.expr).mapResult(result => expr.op + result);
  }
}

class GenResult {
  constructor(readonly sideEffects: string, readonly result: string) {}

  static withoutSideEffects(result: string): GenResult {
    return new GenResult("", result);
  }

  static withoutResult(sideEffects: string): GenResult {
    return new GenResult(sideEffects, "");
  }

  mapResult(f: (result: string) => string): GenResult {
    return this.setResult(f(this.result));
  }

  mapSideEffects(f: (sideEffects: string) => string): GenResult {
    return this.setSideEffect(f(this.sideEffects));
  }

  joinSideEffects(other: GenResult): GenResult {
    return this.mapSideEffects(sideEffects => sideEffects + other.sideEffects);
  }

  setResult(newResult: string): GenResult {
    return new GenResult(this.sideEffects, newResult);
  }

  setSideEffect(sideEffect: string): GenResult {
    return new GenResult(sideEffect, this.result);
  }
}

const nameGenerator = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  8
);

function uniqueName(): string {
  return `$gen_${nameGenerator()}`;
}
