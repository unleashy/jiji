import { errorKinds, SinosError } from "./error";
import { Kinds, Token, TokenOfKind } from "./token";
import { Lexer } from "./lexer";
import {
  AstModule,
  AstExpr,
  BinaryOp,
  UnaryOp,
  AstStmt,
  ast,
  AstExprStmt
} from "./ast";

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

export class Parser {
  private readonly lexer: PeekableLexer;

  constructor(lexer: Lexer) {
    this.lexer = new PeekableLexer(lexer);
  }

  parse(): AstModule {
    return this.module();
  }

  private module(): AstModule {
    const stmts = [];
    let end;
    while (!(end = this.match("end"))) {
      stmts.push(this.stmt());
    }

    const span = stmts.length > 0 ? stmts[0].span.join(end.span) : end.span;
    return ast.module(stmts, span);
  }

  private stmt(): AstStmt {
    return this.exprStmt();
  }

  private exprStmt(): AstExprStmt {
    const expr = this.expr();
    const semi = this.expectKind(
      "semi",
      badToken => new SinosError(errorKinds.expectSemi, badToken.span)
    );

    return ast.exprStmt(expr, expr.span.join(semi.span));
  }

  private expr(): AstExpr {
    return this.cmpExpr();
  }

  private cmpExpr(): AstExpr {
    let left = this.addExpr();

    let token;
    if (
      (token = this.matchOneOf(
        "equals",
        "bangEquals",
        "less",
        "lessEqual",
        "greater",
        "greaterEqual"
      ))
    ) {
      const right = this.addExpr();
      left = ast.binary(
        left,
        kindToBinaryOp[token.kind.name] as BinaryOp,
        right,
        left.span.join(right.span)
      );
    }

    return left;
  }

  private addExpr(): AstExpr {
    let left = this.mulExpr();

    let token;
    while ((token = this.matchOneOf("plus", "minus"))) {
      const right = this.mulExpr();
      left = ast.binary(
        left,
        kindToBinaryOp[token.kind.name] as BinaryOp,
        right,
        left.span.join(right.span)
      );
    }

    return left;
  }

  private mulExpr(): AstExpr {
    let left = this.unaryExpr();

    let token;
    while ((token = this.matchOneOf("star", "slash", "percent"))) {
      const right = this.unaryExpr();
      left = ast.binary(
        left,
        kindToBinaryOp[token.kind.name] as BinaryOp,
        right,
        left.span.join(right.span)
      );
    }

    return left;
  }

  private unaryExpr(): AstExpr {
    let token;
    if ((token = this.matchOneOf("minus", "plus", "bang"))) {
      const child = this.unaryExpr();
      return ast.unary(
        kindToUnaryOp[token.kind.name] as UnaryOp,
        child,
        token.span.join(child.span)
      );
    } else {
      return this.primary();
    }
  }

  private primary(): AstExpr {
    const token = this.lexer.next();
    switch (token.kind.name) {
      case "true":
        return ast.boolean(true, token.span);

      case "false":
        return ast.boolean(false, token.span);

      case "integer":
        return ast.integer(token.kind.value, token.span);

      case "parenOpen":
        const expr = this.expr();
        const close = this.expectKind(
          "parenClose",
          badToken => new SinosError(errorKinds.expectCloseParen, badToken.span)
        );
        return { ...expr, span: token.span.join(close.span) };
    }

    throw new SinosError(errorKinds.expectExpr, token.span);
  }

  private match<K extends keyof Kinds>(kind: K): TokenOfKind<K> | undefined {
    const token = this.lexer.peek();
    if (token.kind.name === kind) {
      return this.lexer.next() as TokenOfKind<K>;
    }
  }

  private matchOneOf<K extends keyof Kinds>(
    ...kinds: K[]
  ): TokenOfKind<K> | undefined {
    const token = this.lexer.peek();
    if (kinds.includes(token.kind.name as K)) {
      return this.lexer.next() as TokenOfKind<K>;
    }
  }

  private expectKind<K extends keyof Kinds>(
    kind: K,
    makeErr: (badToken: Token) => SinosError
  ): TokenOfKind<K> {
    const token = this.lexer.next();
    if (token.kind.name === kind) {
      return token as TokenOfKind<K>;
    } else {
      throw makeErr(token);
    }
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
}
