import { SinosError, errorKinds } from "../error";
import { Type } from "./common";
import { Bool, Int, Unit } from "./primitives";
import { Ast } from "../ast";
export * from "./common";

export const types = {
  Unit: new Unit(),
  Int: new Int(),
  Bool: new Bool()
};

export class Types {
  compute(ast: Ast): Type {
    switch (ast.kind) {
      case "module":
        for (const stmt of ast.stmts) {
          this.compute(stmt);
        }

        return types.Unit;

      case "exprStmt":
        this.compute(ast.expr);

        return types.Unit;

      case "binary": {
        const leftType = this.compute(ast.left);
        const rightType = this.compute(ast.right);

        switch (ast.op) {
          case "==":
          case "!=":
            if (leftType !== rightType) {
              throw new SinosError(
                errorKinds.binaryTypeMismatch(leftType, ast.op, rightType),
                ast.span
              );
            }

            return types.Bool;

          case "<":
          case "<=":
          case ">":
          case ">=":
            if (!(leftType === types.Int && rightType === types.Int)) {
              throw new SinosError(
                errorKinds.binaryTypeMismatch(leftType, ast.op, rightType),
                ast.span
              );
            }

            return types.Bool;

          default:
            if (!(leftType === types.Int && rightType === types.Int)) {
              throw new SinosError(
                errorKinds.binaryTypeMismatch(leftType, ast.op, rightType),
                ast.span
              );
            }

            return types.Int;
        }
      }

      case "unary": {
        const exprType = this.compute(ast.expr);

        switch (ast.op) {
          case "!":
            if (exprType !== types.Bool) {
              throw new SinosError(
                errorKinds.unaryTypeMismatch(ast.op, exprType),
                ast.span
              );
            }

            return types.Bool;

          default:
            if (exprType !== types.Int) {
              throw new SinosError(
                errorKinds.unaryTypeMismatch(ast.op, exprType),
                ast.span
              );
            }

            return types.Int;
        }
      }

      case "integer":
        return types.Int;

      case "boolean":
        return types.Bool;
    }
  }
}
