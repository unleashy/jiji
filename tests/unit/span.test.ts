import { test } from "uvu";
import * as assert from "uvu/assert";
import { Span } from "../../src/span";
import { File } from "../../src/file";

test("Span.text grabs the content of the span", () => {
  const sut = new Span(new File("", "hello world"), 6, 5);

  assert.equal(sut.text, "world");
});
