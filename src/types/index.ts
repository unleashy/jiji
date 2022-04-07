import { errorKinds, SinosError } from "../error";
import { Type } from "./common";
import { Bool, Int, Float, Unit, TyString } from "./primitives";
import {
  Ast,
  AstBinary,
  AstExprStmt,
  AstLetStmt,
  AstModule,
  AstName,
  AstUnary
} from "../ast";
import { Environment } from "../scope";
import * as assert from "assert";

export * from "./common";

export const types = {
  Unit: new Unit(),
  Int: new Int(),
  Float: new Float(),
  Bool: new Bool(),
  String: new TyString()
};

export class Types {
  readonly env: Environment;
  private typeOfCache = new WeakMap<Ast, Type>();

  constructor(environment: Environment) {
    this.env = environment;
  }

  typeOf(ast: Ast): Type {
    let result = this.typeOfCache.get(ast);
    if (result === undefined) {
      result = this.typeOfImpl(ast);
      this.typeOfCache.set(ast, result);
    }

    return result;
  }

  private typeOfImpl(ast: Ast): Type {
    switch (ast.kind) {
      case "module":
        return this.typeOfModule(ast);

      case "letStmt":
        return this.typeOfLetStmt(ast);

      case "exprStmt":
        return this.typeOfExprStmt(ast);

      case "binary":
        return this.typeOfBinary(ast);

      case "unary":
        return this.typeOfUnary(ast);

      case "group":
        return this.typeOf(ast.expr);

      case "name":
        return this.typeOfName(ast);

      case "integer":
        return types.Int;

      case "float":
        return types.Float;

      case "boolean":
        return types.Bool;

      case "string":
        return types.String;

      default:
        throw new Error("todo");
    }
  }

  private typeOfModule(ast: AstModule): Type {
    for (const stmt of ast.stmts) {
      this.typeOf(stmt);
    }

    return types.Unit;
  }

  private typeOfLetStmt(ast: AstLetStmt): Type {
    const inferredType = this.typeOf(ast.value);
    if (ast.type) {
      const ascribedType = (types as Record<string, Type>)[ast.type];
      if (ascribedType === undefined) {
        throw new SinosError(errorKinds.unknownType(ast.type), ast.span);
      } else if (ascribedType !== inferredType) {
        throw new SinosError(
          errorKinds.letTypeMismatch(ascribedType, inferredType),
          ast.span
        );
      }
    }

    this.env.getScope(ast).assignTypeToBinding(ast.name, inferredType);

    return types.Unit;
  }

  private typeOfExprStmt(ast: AstExprStmt): Type {
    this.typeOf(ast.expr);

    return types.Unit;
  }

  private typeOfBinary(ast: AstBinary) {
    const leftType = this.typeOf(ast.left);
    const rightType = this.typeOf(ast.right);

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
        if (!leftType.isOrderableAgainst(rightType)) {
          throw new SinosError(
            errorKinds.binaryTypeMismatch(leftType, ast.op, rightType),
            ast.span
          );
        }

        return types.Bool;

      default:
        const result = leftType.applyBinaryOp(ast.op, rightType);
        if (result === undefined) {
          throw new SinosError(
            errorKinds.binaryTypeMismatch(leftType, ast.op, rightType),
            ast.span
          );
        }

        return result;
    }
  }

  private typeOfUnary(ast: AstUnary): Type {
    const exprType = this.typeOf(ast.expr);
    const result = exprType.applyUnaryOp(ast.op);
    if (result === undefined) {
      throw new SinosError(
        errorKinds.unaryTypeMismatch(ast.op, exprType),
        ast.span
      );
    }

    return result;
  }

  private typeOfName(ast: AstName): Type {
    const binding = this.env.getScope(ast).getBinding(ast.value);
    assert.ok(binding, `resolver should have resolved binding ${ast.value}!`);

    const type = binding.type;
    assert.ok(type, `type of ${ast.value} should have been determined!`);

    return type;
  }
}
