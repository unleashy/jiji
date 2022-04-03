import { strict as assert } from "assert";
import { ErrorKind, errorKinds, SinosError } from "./error";
import { Kind, Kinds, Token, TokenOfKind } from "./token";
import { Lexer } from "./lexer";
import {
  AstModule,
  AstExpr,
  BinaryOp,
  UnaryOp,
  AstStmt,
  AstLetStmt,
  AstExprStmt,
  ast
} from "./ast";

export class Parser {
  private readonly lexer: PeekableLexer;
  private readonly exprParser: ExprParser;

  constructor(lexer: Lexer) {
    this.lexer = new PeekableLexer(lexer);
    this.exprParser = new ExprParser(this.lexer);
  }

  parse(): AstModule {
    return this.module();
  }

  private module(): AstModule {
    const stmts = [];
    let end;
    while (!(end = this.lexer.match("end"))) {
      stmts.push(this.stmt());
    }

    const span = stmts.length > 0 ? stmts[0].span.join(end.span) : end.span;
    return ast.module(stmts, span);
  }

  private stmt(): AstStmt {
    return this.letStmt() || this.exprStmt();
  }

  private letStmt(): AstLetStmt | undefined {
    const let_ = this.lexer.match("let");
    if (let_ === undefined) return undefined;

    const name = this.lexer.expectKind(
      "name",
      badToken => new SinosError(errorKinds.expectName, badToken.span)
    );

    let type = undefined;
    if (this.lexer.match("colon")) {
      type = this.lexer.expectKind(
        "name",
        badToken => new SinosError(errorKinds.expectName, badToken.span)
      );
    }

    this.lexer.expectKind(
      "equal",
      badToken => new SinosError(errorKinds.expectEqual, badToken.span)
    );
    const expr = this.expr();
    const semi = this.expectSemi();

    return ast.letStmt(
      name.kind.value,
      type?.kind.value,
      expr,
      let_.span.join(semi.span)
    );
  }

  private exprStmt(): AstExprStmt {
    const expr = this.expr();
    const semi = this.expectSemi();

    return ast.exprStmt(expr, expr.span.join(semi.span));
  }

  private expectSemi(): TokenOfKind<"semi"> {
    return this.lexer.expectKind(
      "semi",
      badToken => new SinosError(errorKinds.expectSemi, badToken.span)
    );
  }

  private expr(): AstExpr {
    return this.exprParser.parseExpr();
  }
}

// noinspection JSUnusedGlobalSymbols
enum Precedence {
  none,
  eq,
  cmp,
  cat,
  add,
  mul,
  unary,
  primary
}

type PrefixRule<K extends Kind> = (token: Token<K>) => AstExpr;
interface InfixRule<K extends Kind> {
  fn: (left: AstExpr, token: Token<K>) => AstExpr;
  prec: Precedence;
}

const kindToBinaryOp: Readonly<Partial<Record<keyof Kinds, BinaryOp>>> =
  Object.freeze({
    plus: "+",
    minus: "-",
    star: "*",
    slash: "/",
    percent: "%",
    equals: "==",
    bangEquals: "!=",
    less: "<",
    lessEqual: "<=",
    greater: ">",
    greaterEqual: ">=",
    tilde: "~"
  });

const kindToUnaryOp: Readonly<Partial<Record<keyof Kinds, UnaryOp>>> =
  Object.freeze({
    minus: "-",
    plus: "+",
    bang: "!"
  });

class ExprParser {
  private readonly lexer: PeekableLexer;
  private readonly prefixRules = new Map<keyof Kinds, PrefixRule<Kind>>();
  private readonly infixRules = new Map<keyof Kinds, InfixRule<Kind>>();

  // prettier-ignore
  constructor(lexer: PeekableLexer) {
    this.lexer = lexer;

    this.prefixRule("name",      this.primary);
    this.prefixRule("true",      this.primary);
    this.prefixRule("false",     this.primary);
    this.prefixRule("integer",   this.primary);
    this.prefixRule("float",     this.primary);
    this.prefixRule("string",    this.primary);
    this.prefixRule("parenOpen", this.primary);

    this.prefixRule("bang",  this.unary);
    this.prefixRule("plus",  this.unary);
    this.prefixRule("minus", this.unary);

    this.infixRule("equals",       this.eq, Precedence.eq);
    this.infixRule("bangEquals",   this.eq, Precedence.eq);
    this.infixRule("less",         this.cmp, Precedence.cmp);
    this.infixRule("lessEqual",    this.cmp, Precedence.cmp);
    this.infixRule("greater",      this.cmp, Precedence.cmp);
    this.infixRule("greaterEqual", this.cmp, Precedence.cmp);
    this.infixRule("tilde",        this.binary, Precedence.cat);
    this.infixRule("plus",         this.binary, Precedence.add);
    this.infixRule("minus",        this.binary, Precedence.add);
    this.infixRule("star",         this.binary, Precedence.mul);
    this.infixRule("slash",        this.binary, Precedence.mul);
    this.infixRule("percent",      this.binary, Precedence.mul);
  }

  parseExpr(): AstExpr {
    return this.parsePrecedence(Precedence.eq);
  }

  private binaryNoChain(
    errorKind: () => ErrorKind,
    ...ops: BinaryOp[]
  ): InfixRule<Kind>["fn"] {
    return (left, token) => {
      const op = kindToBinaryOp[token.kind.name];
      assert.ok(op, `Invalid kind ${token.kind.name} given to binaryNoChain`);

      const prec = this.precedenceOf(token.kind.name);
      const right = this.parsePrecedence(prec);
      if (right.kind === "binary" && ops.includes(right.op)) {
        throw new SinosError(errorKind(), right.span);
      }

      return ast.binary(left, op, right, left.span.join(right.span));
    };
  }

  private eq = this.binaryNoChain(() => errorKinds.eqChain, "==", "!=");

  private cmp = this.binaryNoChain(
    () => errorKinds.cmpChain,
    ">",
    ">=",
    "<",
    "<="
  );

  private binary(left: AstExpr, token: Token): AstExpr {
    const op = kindToBinaryOp[token.kind.name];
    assert.ok(op, `Invalid kind ${token.kind.name} given to binary`);

    const prec = this.precedenceOf(token.kind.name);
    const right = this.parsePrecedence(prec + 1);

    return ast.binary(left, op, right, left.span.join(right.span));
  }

  private unary(token: Token): AstExpr {
    const op = kindToUnaryOp[token.kind.name];
    assert.ok(op, `Invalid kind ${token.kind.name} given to unary`);

    const child = this.parsePrecedence(Precedence.unary);
    return ast.unary(op, child, token.span.join(child.span));
  }

  private primary(token: Token): AstExpr {
    switch (token.kind.name) {
      case "name":
        return ast.name(token.kind.value, token.span);

      case "true":
        return ast.boolean(true, token.span);

      case "false":
        return ast.boolean(false, token.span);

      case "integer":
        return ast.integer(token.kind.value, token.span);

      case "float":
        return ast.float(token.kind.value, token.span);

      case "string":
        return ast.string(token.kind.value, token.span);

      case "parenOpen":
        const expr = this.parseExpr();
        const close = this.lexer.expectKind(
          "parenClose",
          badToken => new SinosError(errorKinds.expectCloseParen, badToken.span)
        );
        return ast.group(expr, token.span.join(close.span));
    }

    assert.fail("unreachable");
  }

  private parsePrecedence(prec: Precedence): AstExpr {
    const token = this.lexer.next();
    const prefix = this.prefixRules.get(token.kind.name);
    if (prefix === undefined) {
      throw new SinosError(errorKinds.expectExpr, token.span);
    }

    let left = prefix.call(this, token);
    while (prec <= this.currentPrecedence) {
      const token = this.lexer.next();

      const infix = this.infixRules.get(token.kind.name)?.fn;
      assert.ok(infix, `Missing infix function for kind ${token.kind.name}`);

      left = infix.call(this, left, token);
    }

    return left;
  }

  private precedenceOf(kind: keyof Kinds): Precedence {
    return this.infixRules.get(kind)?.prec ?? Precedence.none;
  }

  private get currentPrecedence(): Precedence {
    const token = this.lexer.peek();
    return this.precedenceOf(token.kind.name);
  }

  private prefixRule<K extends Kind>(
    kind: K["name"],
    rule: PrefixRule<K>
  ): void {
    this.prefixRules.set(kind, rule as PrefixRule<Kind>);
  }

  private infixRule<K extends Kind>(
    kind: K["name"],
    fn: InfixRule<K>["fn"],
    prec: Precedence
  ): void {
    this.infixRules.set(kind, { fn: fn as InfixRule<Kind>["fn"], prec });
  }
}

class PeekableLexer {
  private readonly lexer: Lexer;
  private peekBuf: Token[] = [];

  constructor(lexer: Lexer) {
    this.lexer = lexer;
  }

  next(): Token {
    if (this.peekBuf.length === 0) {
      return this.lexer.next();
    } else {
      return this.peekBuf.shift()!;
    }
  }

  peek(by = 0): Token {
    this.fillPeekBufUpTo(by);
    return this.peekBuf[by];
  }

  private fillPeekBufUpTo(amount: number) {
    while (this.peekBuf.length <= amount) {
      this.peekBuf.push(this.lexer.next());
    }
  }

  match<K extends keyof Kinds>(kind: K): TokenOfKind<K> | undefined {
    const token = this.peek();
    if (token.kind.name === kind) {
      return this.next() as TokenOfKind<K>;
    }
  }

  expectKind<K extends keyof Kinds>(
    kind: K,
    makeErr: (badToken: Token) => SinosError
  ): TokenOfKind<K> {
    const token = this.next();
    if (token.kind.name === kind) {
      return token as TokenOfKind<K>;
    } else {
      throw makeErr(token);
    }
  }
}
