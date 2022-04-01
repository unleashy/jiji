import { ArithmeticOp, OrderingOp, UnaryOp } from "../ast";

export abstract class Type {
  abstract name: string;

  applyUnaryOp(op: UnaryOp): Type | undefined {
    return undefined;
  }

  applyArithmeticOp(op: ArithmeticOp, rhs: Type): Type | undefined {
    return undefined;
  }

  isOrderableAgainst(rhs: Type): boolean {
    return false;
  }
}
