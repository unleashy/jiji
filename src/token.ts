import { Span } from "./span";

function kind<Name extends string, Other>(
  k: { name: Name } & Other
): { name: Name } & Other {
  return k;
}

export const kinds = Object.freeze({
  end: kind({ name: "end" }),

  plus: kind({ name: "plus" }),
  minus: kind({ name: "minus" }),
  star: kind({ name: "star" }),
  slash: kind({ name: "slash" }),
  percent: kind({ name: "percent" }),
  parenOpen: kind({ name: "parenOpen" }),
  parenClose: kind({ name: "parenClose" }),
  bang: kind({ name: "bang" }),
  less: kind({ name: "less" }),
  greater: kind({ name: "greater" })
});

export type Kinds = typeof kinds;

type KindType<K> = K extends (...args: never[]) => unknown ? ReturnType<K> : K;
export type Kind = KindType<Kinds[keyof Kinds]>;

export class Token<K extends Kind = Kind> {
  constructor(readonly kind: K, readonly span: Span) {}

  get isEnd(): boolean {
    return this.kind === kinds.end;
  }
}
