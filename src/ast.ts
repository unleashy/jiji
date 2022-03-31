import { Span } from "./span";

interface AstCommon<Type extends string> {
  kind: Type;
  span: Span;
}

export type Ast = AstModule | AstStmt | AstExpr;

export interface AstModule extends AstCommon<"module"> {
  stmts: AstStmt[];
}

export type AstStmt = AstLetStmt | AstExprStmt;

export interface AstLetStmt extends AstCommon<"letStmt"> {
  name: string;
  type: string | undefined;
  value: AstExpr;
}

export interface AstExprStmt extends AstCommon<"exprStmt"> {
  expr: AstExpr;
}

export type AstExpr =
  | AstBinary
  | AstUnary
  | AstGroup
  | AstName
  | AstInteger
  | AstBoolean;

export type BinaryOp =
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "+"
  | "-"
  | "*"
  | "/"
  | "%";

export interface AstBinary extends AstCommon<"binary"> {
  left: AstExpr;
  op: BinaryOp;
  right: AstExpr;
}

export type UnaryOp = "-" | "+" | "!";

export interface AstUnary extends AstCommon<"unary"> {
  op: UnaryOp;
  expr: AstExpr;
}

export interface AstGroup extends AstCommon<"group"> {
  expr: AstExpr;
}

export interface AstName extends AstCommon<"name"> {
  value: string;
}

export interface AstInteger extends AstCommon<"integer"> {
  value: number;
}

export interface AstBoolean extends AstCommon<"boolean"> {
  value: boolean;
}

export const ast = {
  module: (stmts: AstStmt[], span: Span): AstModule => ({
    kind: "module",
    stmts,
    span
  }),

  letStmt: (
    name: string,
    type: string | undefined,
    value: AstExpr,
    span: Span
  ): AstLetStmt => ({
    kind: "letStmt",
    name,
    type,
    value,
    span
  }),

  exprStmt: (expr: AstExpr, span: Span): AstExprStmt => ({
    kind: "exprStmt",
    expr,
    span
  }),

  binary: (
    left: AstExpr,
    op: BinaryOp,
    right: AstExpr,
    span: Span
  ): AstBinary => ({
    kind: "binary",
    left,
    op,
    right,
    span
  }),

  unary: (op: UnaryOp, expr: AstExpr, span: Span): AstUnary => ({
    kind: "unary",
    op,
    expr,
    span
  }),

  group: (expr: AstExpr, span: Span): AstGroup => ({
    kind: "group",
    expr,
    span
  }),

  name: (value: string, span: Span): AstName => ({
    kind: "name",
    value,
    span
  }),

  integer: (value: number, span: Span): AstInteger => ({
    kind: "integer",
    value,
    span
  }),

  boolean: (value: boolean, span: Span): AstBoolean => ({
    kind: "boolean",
    value,
    span
  })
};
