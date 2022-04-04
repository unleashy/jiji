import { Type } from "./common";
import { BasicOp, UnaryOp } from "../ast";

export class Unit extends Type {
  name = "Unit";
}

export class Int extends Type {
  name = "Int";

  override applyUnaryOp(op: UnaryOp): Type | undefined {
    if (op !== "!") {
      return this;
    }
  }

  override applyBinaryOp(op: BasicOp, rhs: Type): Type | undefined {
    if (op !== "~" && rhs instanceof Int) {
      return this;
    }
  }

  override isOrderableAgainst(rhs: Type): boolean {
    return rhs instanceof Int;
  }
}

export class Float extends Type {
  name = "Float";

  override applyUnaryOp(op: UnaryOp): Type | undefined {
    if (op !== "!") {
      return this;
    }
  }

  override applyBinaryOp(op: BasicOp, rhs: Type): Type | undefined {
    if (op !== "~" && rhs instanceof Float) {
      return this;
    }
  }

  override isOrderableAgainst(rhs: Type): boolean {
    return rhs instanceof Float;
  }
}

export class Bool extends Type {
  name = "Bool";

  override applyUnaryOp(op: UnaryOp): Type | undefined {
    if (op === "!") {
      return this;
    }
  }
}

export class TyString extends Type {
  name = "String";

  override applyBinaryOp(op: BasicOp, rhs: Type): Type | undefined {
    if (op === "~" && rhs instanceof TyString) {
      return this;
    }
  }
}
