# sinos

small programming language

## grammar

in PEG form:

```text
Module ← Expr End
Expr ← CmpExpr

CmpExpr ← AddExpr (("==" / "!=" / "<" / "<=" / ">" / ">=") AddExpr)*
AddExpr ← MulExpr (("+" / "-") MulExpr)*
MulExpr ← UnaryExpr (("*" / "/" / "%") UnaryExpr)*
UnaryExpr ← ("-" / "+" / "!")? UnaryExpr
          / Primary

Primary ← "true"
        / "false"
        / Integer
        / ParenOpen Expr ParenClose

Integer ← [0-9]+ [_0-9]*

# Space and Comment are always ignored
Space ← [ \t\r\n]+
Comment ← "--" (!"\n" .)* "\n" 

End ← !.
```

## licence

[mit](LICENSE.txt)
