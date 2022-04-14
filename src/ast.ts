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

export type AstExprWithBlock = AstBlock | AstIf;
export type AstExprWithoutBlock =
  | AstBinary
  | AstUnary
  | AstGroup
  | AstName
  | AstInteger
  | AstFloat
  | AstString
  | AstBoolean;

export type AstExpr = AstExprWithoutBlock | AstExprWithBlock;

export function isBlocky(expr: AstExpr): expr is AstExprWithBlock {
  return expr.kind === "block" || expr.kind === "if";
}

export interface AstBlock extends AstCommon<"block"> {
  stmts: AstStmt[];
  lastExpr: AstExpr | undefined;
}

export interface AstIf extends AstCommon<"if"> {
  condition: AstExpr;
  consequent: AstBlock;
  alternate: AstBlock | AstIf | undefined;
}

export type BasicOp = "+" | "-" | "*" | "/" | "%" | "~";
export type OrderingOp = "<" | "<=" | ">" | ">=";
export type BinaryOp = OrderingOp | BasicOp | "==" | "!=" | "||" | "&&";

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

export interface AstFloat extends AstCommon<"float"> {
  value: number;
}

export interface AstString extends AstCommon<"string"> {
  value: string;
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

  block: (
    stmts: AstStmt[],
    lastExpr: AstExpr | undefined,
    span: Span
  ): AstBlock => ({
    kind: "block",
    stmts,
    lastExpr,
    span
  }),

  if: (
    condition: AstExpr,
    consequent: AstBlock,
    alternate: AstBlock | AstIf | undefined,
    span: Span
  ): AstIf => ({
    kind: "if",
    condition,
    consequent,
    alternate,
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

  float: (value: number, span: Span): AstFloat => ({
    kind: "float",
    value,
    span
  }),

  string: (value: string, span: Span): AstString => ({
    kind: "string",
    value,
    span
  }),

  boolean: (value: boolean, span: Span): AstBoolean => ({
    kind: "boolean",
    value,
    span
  })
};
