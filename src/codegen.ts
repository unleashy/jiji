import { AstExpr, AstModule, AstStmt } from "./ast";
import { Types } from "./types";
import { Int } from "./types/primitives";

export class Codegen {
  private types: Types;
  private bindings = new Set<string>();

  constructor(types: Types) {
    this.types = types;
  }

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
        const expr = this.genExpr(stmt.value);
        if (this.bindings.has(stmt.name)) {
          return `${stmt.name} = ${expr};`;
        } else {
          this.bindings.add(stmt.name);
          return `let ${stmt.name} = ${expr};`;
        }
      }

      case "exprStmt":
        return `console.log(${this.genExpr(stmt.expr)});`;
    }
  }

  private genExpr(expr: AstExpr): string {
    switch (expr.kind) {
      case "block":
      case "if":
        throw new Error("todo");

      case "binary": {
        const left = this.genExpr(expr.left);
        const right = this.genExpr(expr.right);
        const op = (() => {
          // prettier-ignore
          switch (expr.op) {
            case "==": return "===";
            case "!=": return "!==";
            case "~": return "+";
            default: return expr.op;
          }
        })();

        const result = `${left} ${op} ${right}`;
        if (op === "/" && this.types.typeOf(expr) instanceof Int) {
          return `(${result}) | 0`;
        } else {
          return result;
        }
      }

      case "unary":
        return expr.op + this.genExpr(expr.expr);

      case "group":
        return `(${this.genExpr(expr.expr)})`;

      case "name":
      case "integer":
      case "float":
      case "boolean":
        return String(expr.value);

      case "string":
        return JSON.stringify(expr.value);
    }
  }
}
