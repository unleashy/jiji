import { test } from "uvu";
import * as assert from "uvu/assert";
import { File } from "../../src/file";
import { Span } from "../../src/span";
import { SinosError, errorKinds } from "../../src/error";

test("SinosError.message works for unknownChar", () => {
  const sut = new SinosError(
    errorKinds.unknownChar("\f"),
    new Span(new File("abc", "\f"), 0, 1)
  );

  assert.snapshot(sut.message, String.raw`abc:1:1  Unknown character "\f"`);
});

test.run();
