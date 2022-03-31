import { AstExpr, AstModule, AstStmt } from "./ast";

export class Codegen {
  generate(ast: AstModule): string {
    let result = '"use strict";\n\n';

    for (const stmt of ast.stmts) {
      result += this.genStmt(stmt);
    }

    return result;
  }

  private genStmt(stmt: AstStmt): string {
    let result = "console.log(";

    switch (stmt.kind) {
      case "exprStmt":
        result += this.genExpr(stmt.expr);
        break;
    }

    return result + ");\n";
  }

  private genExpr(expr: AstExpr): string {
    switch (expr.kind) {
      case "binary": {
        const left = this.genExpr(expr.left);
        const right = this.genExpr(expr.right);
        const op = (() => {
          // prettier-ignore
          switch (expr.op) {
            case "==": return "===";
            case "!=": return "!==";
            default: return expr.op;
          }
        })();

        return left + op + right;
      }

      case "unary":
        return expr.op + this.genExpr(expr.expr);

      case "group":
        return `(${this.genExpr(expr.expr)})`;

      case "integer":
      case "boolean":
        return String(expr.value);
    }
  }
}
