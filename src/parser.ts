import { strict as assert } from "assert";
import { errorKinds, SinosError } from "./error";
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
  cmp,
  cat,
  add,
  mul,
  unary,
  primary
}

interface ParseRule<K extends Kind> {
  prefix?: (token: Token<K>) => AstExpr;
  infix?: (left: AstExpr, token: Token) => AstExpr;
  prec?: Precedence;
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
    greaterEqual: ">="
  });

const kindToUnaryOp: Readonly<Partial<Record<keyof Kinds, UnaryOp>>> =
  Object.freeze({
    minus: "-",
    plus: "+",
    bang: "!"
  });

class ExprParser {
  private readonly lexer: PeekableLexer;
  private readonly rules = new Map<keyof Kinds, ParseRule<Kind>>();

  // prettier-ignore
  constructor(lexer: PeekableLexer) {
    this.lexer = lexer;

    this.addRule("equals",       { infix: this.binary, prec: Precedence.cmp });
    this.addRule("bangEquals",   { infix: this.binary, prec: Precedence.cmp });
    this.addRule("less",         { infix: this.binary, prec: Precedence.cmp });
    this.addRule("lessEqual",    { infix: this.binary, prec: Precedence.cmp });
    this.addRule("greater",      { infix: this.binary, prec: Precedence.cmp });
    this.addRule("greaterEqual", { infix: this.binary, prec: Precedence.cmp });
    this.addRule("plus",         { prefix: this.unary, infix: this.binary, prec: Precedence.add });
    this.addRule("minus",        { prefix: this.unary, infix: this.binary, prec: Precedence.add });
    this.addRule("star",         { infix: this.binary, prec: Precedence.mul });
    this.addRule("slash",        { infix: this.binary, prec: Precedence.mul });
    this.addRule("percent",      { infix: this.binary, prec: Precedence.mul });

    this.addRule("bang", { prefix: this.unary });

    this.addRule("name",      { prefix: this.primary });
    this.addRule("true",      { prefix: this.primary });
    this.addRule("false",     { prefix: this.primary });
    this.addRule("integer",   { prefix: this.primary });
    this.addRule("float",     { prefix: this.primary });
    this.addRule("parenOpen", { prefix: this.primary });
  }

  parseExpr(): AstExpr {
    return this.parsePrecedence(Precedence.cmp);
  }

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
    const prefix = this.rules.get(token.kind.name)?.prefix;
    if (prefix === undefined) {
      throw new SinosError(errorKinds.expectExpr, token.span);
    }

    let left = prefix.call(this, token);
    while (prec <= this.currentPrecedence) {
      const token = this.lexer.next();

      const infix = this.rules.get(token.kind.name)?.infix;
      assert.ok(infix, `Missing infix function for kind ${token.kind.name}`);

      left = infix.call(this, left, token);
    }

    return left;
  }

  private precedenceOf(kind: keyof Kinds): Precedence {
    return this.rules.get(kind)?.prec ?? Precedence.none;
  }

  private get currentPrecedence(): Precedence {
    const token = this.lexer.peek();
    return this.precedenceOf(token.kind.name);
  }

  private addRule<K extends Kind>(kind: K["name"], rule: ParseRule<K>): void {
    this.rules.set(kind, rule as ParseRule<Kind>);
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
