import { test } from "uvu";
import * as assert from "uvu/assert";
import { Location, Span } from "../../src/span";
import { File } from "../../src/file";

test("Span.join creates a new span containing two distinct spans", () => {
  const file = new File("", "");
  const span1 = new Span(file, 0, 2);
  const span2 = new Span(file, 5, 1);

  assert.equal(span1.join(span2), new Span(file, 0, 6));
  assert.equal(span2.join(span1), new Span(file, 0, 6));
});

test("Span.join creates a new span containing two overlapping spans", () => {
  const file = new File("", "");
  const span1 = new Span(file, 1, 5);
  const span2 = new Span(file, 2, 1);

  assert.equal(span1.join(span2), new Span(file, 1, 5));
  assert.equal(span2.join(span1), new Span(file, 1, 5));
});

test("Span.join asserts that the file of both spans match", () => {
  const span1 = new Span(new File("a", "1234"), 0, 1);
  const span2 = new Span(new File("b", "1234"), 0, 1);

  assert.throws(() => span1.join(span2));
});

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
