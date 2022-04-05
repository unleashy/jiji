# sinos

small programming language that compiles to JS

## todo list

- [x] variables (with and without type inference)
- [x] more primitive types
  - [x] float
  - [x] string
- [x] string concatenation
- [~] conditionals (if)
- [ ] hex int literal
- [ ] block scopes
- [ ] functions
- [ ] loops (tail call elimination?)
- [ ] composite types (tuples, records, variants)
- [ ] pattern matching

## grammar

in PEG form:

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
IfExpr     ← "if" Expr BlockExpr ("else" (BlockExpr / IfExpr))?

ExprWithoutBlock ← EqExpr

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

[mit](LICENSE.txt)
