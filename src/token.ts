import { Span } from "./span";

function kind<Name extends string, Other>(
  k: { name: Name } & Other
): { name: Name } & Other {
  return k;
}

export const kinds = Object.freeze({
  end: kind({ name: "end" }),

  name: (value: string) => kind({ name: "name", value }),
  integer: (value: number) => kind({ name: "integer", value }),
  float: (value: number) => kind({ name: "float", value }),
  string: (value: string) => kind({ name: "string", value }),

  false: kind({ name: "false" }),
  let: kind({ name: "let" }),
  true: kind({ name: "true" }),

  semi: kind({ name: "semi" }),
  plus: kind({ name: "plus" }),
  minus: kind({ name: "minus" }),
  star: kind({ name: "star" }),
  slash: kind({ name: "slash" }),
  percent: kind({ name: "percent" }),
  parenOpen: kind({ name: "parenOpen" }),
  parenClose: kind({ name: "parenClose" }),
  bang: kind({ name: "bang" }),
  equal: kind({ name: "equal" }),
  equals: kind({ name: "equals" }),
  bangEquals: kind({ name: "bangEquals" }),
  less: kind({ name: "less" }),
  lessEqual: kind({ name: "lessEqual" }),
  greater: kind({ name: "greater" }),
  greaterEqual: kind({ name: "greaterEqual" }),
  colon: kind({ name: "colon" })
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

export type TokenOfKind<K extends keyof Kinds> = Token<KindType<Kinds[K]>>;
