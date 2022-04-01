import { Type } from "./common";
import { ArithmeticOp, OrderingOp, UnaryOp } from "../ast";

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

  override applyArithmeticOp(op: ArithmeticOp, rhs: Type): Type | undefined {
    if (rhs instanceof Int) {
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

  override applyArithmeticOp(op: ArithmeticOp, rhs: Type): Type | undefined {
    if (rhs instanceof Float) {
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
