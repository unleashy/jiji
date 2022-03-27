import { test } from "uvu";
import * as assert from "uvu/assert";
import { Location, Span } from "../../src/span";
import { File } from "../../src/file";

test("Span.text grabs the content of the span", () => {
  const sut = new Span(new File("", "hello world"), 6, 5);

  assert.equal(sut.text, "world");
});

test("Span.location returns the location of the span", () => {
  const file = new File("", "abc\ndef");

  // abc is at line 1, column 1
  assert.equal(new Span(file, 0, 3).location, new Location(file, 1, 1));

  // c\nde is at line 1, column 3
  assert.equal(new Span(file, 2, 4).location, new Location(file, 1, 3));

  // e is at line 2, column 2
  assert.equal(new Span(file, 5, 1).location, new Location(file, 2, 2));

  // \n is at line 1, column 4
  assert.equal(new Span(file, 3, 1).location, new Location(file, 1, 4));
});

test("Location.path returns the path of the location", () => {
  const sut = new Location(new File("abc", ""), 1, 1);

  assert.equal(sut.path, "abc");
});

test.run();
