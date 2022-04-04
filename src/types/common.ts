import { BasicOp, OrderingOp, UnaryOp } from "../ast";

export abstract class Type {
  abstract name: string;

  applyUnaryOp(op: UnaryOp): Type | undefined {
    return undefined;
  }

  applyBinaryOp(op: BasicOp, rhs: Type): Type | undefined {
    return undefined;
  }

  isOrderableAgainst(rhs: Type): boolean {
    return false;
  }
}
