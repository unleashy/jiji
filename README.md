# Jiji

Small programming language that compiles to JS

## To-do list

- [x] variables (with and without type inference)
- [x] more primitive types
  - [x] float
  - [x] string
- [x] string concatenation
- [x] block scopes
- [x] conditionals (if)
- [x] && and ||
- [ ] hex int literal
- [ ] functions
- [ ] loops (tail call elimination?)
- [ ] composite types (tuples, records, variants)
- [ ] pattern matching

## Grammar

In PEG form:

```text
Module ← Stmt* End

Stmt ← LetStmt
     / ExprStmt

LetStmt  ← "let" Name (":" Name)? "=" Expr ";"
ExprStmt ← ExprWithBlock ";"?
         / ExprWithoutBlock ";"

Expr ← ExprWithBlock
     / ExprWithoutBlock

ExprWithBlock ← BlockExpr
              / IfExpr

BlockExpr  ← "{" Stmt* ExprWithoutBlock? "}"
IfExpr     ← "if" ExprWithoutBlock BlockExpr ("else" (BlockExpr / IfExpr))?

ExprWithoutBlock ← OrExpr

OrExpr    ← AndExpr ("||" AndExpr)*
AndExpr   ← EqExpr ("&&" EqExpr)*
EqExpr    ← CmpExpr (("==" / "!=") CmpExpr)?
CmpExpr   ← CatExpr (("<" / "<=" / ">" / ">=") CatExpr)?
CatExpr   ← AddExpr ("~" AddExpr)*
AddExpr   ← MulExpr (("+" / "-") MulExpr)*
MulExpr   ← UnaryExpr (("*" / "/" / "%") UnaryExpr)*
UnaryExpr ← ("-" / "+" / "!")? UnaryExpr
          / Primary

Primary ← "true"
        / "false"
        / Name
        / Integer
        / Float
        / String
        / ParenOpen Expr ParenClose

Name      ← NameStart NameCont*
NameStart ← [A-Za-z_]
NameCont  ← NameStart
          / [0-9]

Integer ← [0-9]+ [0-9_]*

Float    ← Integer FracPart? ExpPart
         / Integer FracPart
FracPart ← "." Integer
ExpPart  ← [Ee] [+-]? Integer

String    ← "'" (!"'" .)* "'"
          / '"' (EscapeSeq / !'"' .)* '"'
EscapeSeq ← '\' [bfnrtv'"\\]
          / '\u{' Hex{1,6} '}'
Hex       ← [0-9A-Fa-f]

# Space and Comment are always ignored
Space   ← [ \t\r\n]+
Comment ← "--" (!"\n" .)* "\n" 

End ← !.
```

## licence

[MIT.](LICENSE.txt)
