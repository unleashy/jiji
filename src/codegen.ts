import {
  AstBinary,
  AstBlock,
  AstExpr,
  AstExprWithBlock,
  AstGroup,
  AstIf,
  AstModule,
  AstStmt,
  AstUnary,
  isBlocky
} from "./ast";
import { Environment } from "./scope";
import { types, Types } from "./types";
import { Int } from "./types/primitives";

export class Codegen {
  private tmpVarCounter = 0;

  constructor(
    private readonly env: Environment,
    private readonly types: Types
  ) {}

  generate(ast: AstModule): string {
    this.tmpVarCounter = 0;

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
      const tmpVar = this.nextTmpVar();
      const lastExpr = this.genExpr(expr.lastExpr);

      return new GenResult(
        `let ${tmpVar};{${stmts}${lastExpr.sideEffects}${tmpVar} = ${lastExpr.result};}`,
        tmpVar
      );
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
    if (op === "/" && this.types.typeOf(expr) instanceof Int) {
      result = `(${result}) | 0`;
    }

    return left.useSideEffects(right).setResult(result);
  }

  private genGroup(expr: AstGroup): GenResult {
    const gen = this.genExpr(expr.expr);
    return gen.setResult(`(${gen.result})`);
  }

  private genUnary(expr: AstUnary): GenResult {
    const gen = this.genExpr(expr.expr);
    return gen.setResult(expr.op + gen.result);
  }

  private nextTmpVar(): string {
    return `$tmp${this.tmpVarCounter++}`;
  }
}

class GenResult {
  constructor(readonly sideEffects: string, readonly result: string) {}

  setResult(newResult: string): GenResult {
    return new GenResult(this.sideEffects, newResult);
  }

  useSideEffects(other: GenResult): GenResult {
    return new GenResult(this.sideEffects + other.sideEffects, this.result);
  }

  static withoutSideEffects(result: string): GenResult {
    return new GenResult("", result);
  }

  static withoutResult(sideEffects: string): GenResult {
    return new GenResult(sideEffects, "");
  }
}
