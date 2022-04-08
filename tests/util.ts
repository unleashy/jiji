import { Span } from "../src/span";
import { ast } from "../src/ast";

// prettier-ignore
type OmitSpanParam<F> =
  F extends (a: infer A, span: Span) => infer R
  ? (a: A) => R
  : F extends (a: infer A, b: infer B, span: Span) => infer R
  ? (a: A, b: B) => R
  : F extends (a: infer A, b: infer B, c: infer C, span: Span) => infer R
  ? (a: A, b: B, c: C) => R
  : "Invalid AST builder, too many arguments! Update OmitSpanParam.";

type SpannedAst = {
  [p in keyof typeof ast]: OmitSpanParam<typeof ast[p]>;
};

export function useSpanForBuildingAst(span: Span): SpannedAst {
  return Object.fromEntries(
    Object.entries(ast).map(([name, fn]) => [
      name,
      (...args: any[]) => (fn as any)(...args, span)
    ])
  ) as SpannedAst;
}

export function execJiji(code: string): string[] {
  const logs: string[] = [];

  const fn = new Function("console", code);
  fn({
    log: (arg: unknown) => {
      logs.push(String(arg));
    }
  });

  return logs;
}
