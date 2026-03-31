/**
 * Tests for Local and LocalsContainer parsing behavior.
 */
import { describe, expect, it } from "vitest";
import { Local, LocalsContainer } from "../../../../../src/main/mi-interface/gdb-parsers/gdb-locals";

describe("Local class", () => {
  it("should create a Local with just a name and value", () => {
    const local = new Local("myVar", "42");
    expect(local.name).toBe("myVar");
    expect(local.value).toBe("42");
    expect(local.sublocals).toEqual([]);
    expect(local.fullpath).toBe("myVar");
  });

  it("should create a Local with a parent fullpath", () => {
    const local = new Local("child", "10", "parent");
    expect(local.name).toBe("child");
    expect(local.value).toBe("10");
    expect(local.fullpath).toBe("parent.child");
  });

  it("should add a sublocal and update its fullpath", () => {
    const parent = new Local("a", "");
    const child = new Local("b", "5");
    parent.addLocal(child);

    expect(parent.sublocals).toHaveLength(1);
    expect(parent.sublocals[0]).toBe(child);
    expect(child.fullpath).toBe("a.b");
  });

  it("should build correct fullpath for deeply nested locals", () => {
    const root = new Local("a", "");
    const level1 = new Local("b", "");
    const level2 = new Local("c", "");

    root.addLocal(level1);
    level1.addLocal(level2);

    expect(level1.fullpath).toBe("a.b");
    expect(level2.fullpath).toBe("a.b.c");
  });
});

describe("LocalsContainer class", () => {
  it("should handle empty input", () => {
    const container = new LocalsContainer("{}");
    expect(container.locals).toEqual([]);
  });

  it("should parse a simple local variable", () => {
    const input = '{name="x",value="42"}';
    const container = new LocalsContainer(input);

    expect(container.locals).toHaveLength(1);
    expect(container.locals[0].name).toBe("x");
    expect(container.locals[0].value).toBe("42");
    expect(container.locals[0].fullpath).toBe("x");
  });

  it("should parse multiple simple local variables", () => {
    const input = '{name="x",value="42"},{name="y",value="100"}';
    const container = new LocalsContainer(input);

    expect(container.locals).toHaveLength(2);
    expect(container.locals[0].name).toBe("x");
    expect(container.locals[0].value).toBe("42");
    expect(container.locals[1].name).toBe("y");
    expect(container.locals[1].value).toBe("100");
  });

  it("should parse a simple group with sublocals", () => {
    const input = '{name="point",value="{x = 0x10, y = 0x20}"}';
    const container = new LocalsContainer(input);

    expect(container.locals).toHaveLength(1);
    const point = container.locals[0];
    expect(point.name).toBe("point");
    expect(point.sublocals).toHaveLength(2);
    expect(point.sublocals[0].name).toBe("x");
    expect(point.sublocals[0].value).toBe("0x10");
    expect(point.sublocals[0].fullpath).toBe("point.x");
    expect(point.sublocals[1].name).toBe("y");
    expect(point.sublocals[1].value).toBe("0x20");
    expect(point.sublocals[1].fullpath).toBe("point.y");
  });

  it("should parse a complex group with nested structures", () => {
    const input = '{name="data",value="{a = 0x1, b = {c = 0x2, d = 0x3}}"}';
    const container = new LocalsContainer(input);

    expect(container.locals).toHaveLength(1);
    const data = container.locals[0];
    expect(data.name).toBe("data");
    expect(data.fullpath).toBe("data");

    // Check that we have nested structure
    const bNested = data.sublocals.find((s) => s.name === "b");
    expect(bNested).toBeDefined();
    if (bNested) {
      expect(bNested.fullpath).toBe("data.b");
      expect(bNested.sublocals).toHaveLength(2);
      expect(bNested.sublocals[0].name).toBe("c");
      expect(bNested.sublocals[0].fullpath).toBe("data.b.c");
      expect(bNested.sublocals[1].name).toBe("d");
      expect(bNested.sublocals[1].fullpath).toBe("data.b.d");
    }
  });

  it("should parse a complex real-world GDB MI example", () => {
    const input =
      '{name="mbs",value="{pd = 0x800e30c0, ms = {a = 0x3, b = 0x58}, arr = {0x0, 0x0, 0x3ffb3da0}}"}';
    const container = new LocalsContainer(input);

    expect(container.locals).toHaveLength(1);
    const mbs = container.locals[0];
    expect(mbs.name).toBe("mbs");
    expect(mbs.fullpath).toBe("mbs");

    // Check for 'ms' nested structure
    const ms = mbs.sublocals.find((s) => s.name === "ms");
    expect(ms).toBeDefined();
    if (ms) {
      expect(ms.fullpath).toBe("mbs.ms");
      const msA = ms.sublocals.find((s) => s.name === "a");
      expect(msA?.fullpath).toBe("mbs.ms.a");
    }
  });

  it("should parse hex values correctly", () => {
    const input = '{name="addr",value="0x3ffb3da0"}';
    const container = new LocalsContainer(input);

    expect(container.locals[0].value).toBe("0x3ffb3da0");
  });

  it("should parse string values with escape sequences", () => {
    const input = '{name="msg",value="\\"Hello World\\""}';
    const container = new LocalsContainer(input);

    expect(container.locals).toHaveLength(1);
    expect(container.locals[0].name).toBe("msg");
    // The value will contain the escape sequences as they appear
    expect(container.locals[0].value).toContain("Hello World");
  });

  it("should handle optimized out values", () => {
    const input = '{name="var",value="<optimized out>"}';
    const container = new LocalsContainer(input);

    expect(container.locals[0].value).toBe("<optimized out>");
  });

  it("should parse error messages in values", () => {
    const input =
      '{name="ptr",value="0x800e30c0 <error: Cannot access memory at address 0x800e30c0>"}';
    const container = new LocalsContainer(input);

    expect(container.locals[0].value).toContain("error");
    expect(container.locals[0].value).toContain("Cannot access memory");
  });

  it("should correctly build fullpath for a", () => {
    const input = '{name="a",value="5"}';
    const container = new LocalsContainer(input);
    expect(container.locals[0].fullpath).toBe("a");
  });

  it("should correctly build fullpath for a.b", () => {
    const input = '{name="a",value="{b = 10}"}';
    const container = new LocalsContainer(input);
    const a = container.locals[0];
    expect(a.fullpath).toBe("a");
    expect(a.sublocals[0].fullpath).toBe("a.b");
  });

  it("should correctly build fullpath for a.b.c", () => {
    const input = '{name="a",value="{b = {c = 10}}"}';
    const container = new LocalsContainer(input);
    const a = container.locals[0];
    expect(a.fullpath).toBe("a");
    const b = a.sublocals[0];
    expect(b.fullpath).toBe("a.b");
    const c = b.sublocals[0];
    expect(c.fullpath).toBe("a.b.c");
  });

  it("should handle anonymous unions/structs in the input", () => {
    // The LocalsContainer converts these to anonMarker_N format
    const input = '{name="struct",value="{a = 0x1, {b = 0x2, c = 0x3}}"}';
    const container = new LocalsContainer(input);

    expect(container.locals).toHaveLength(1);
    const struct = container.locals[0];
    expect(struct.name).toBe("struct");
    // Should have parsed the anonymous struct
    expect(struct.sublocals.length).toBeGreaterThan(0);
  });

  it("should parse multiple top-level variables with mixed types", () => {
    const input =
      '{name="x",value="42"},{name="point",value="{a = 0x10, b = 0x20}"},{name="z",value="<optimized out>"}';
    const container = new LocalsContainer(input);

    expect(container.locals).toHaveLength(3);
    expect(container.locals[0].name).toBe("x");
    expect(container.locals[0].fullpath).toBe("x");
    expect(container.locals[1].name).toBe("point");
    expect(container.locals[1].fullpath).toBe("point");
    expect(container.locals[1].sublocals).toHaveLength(2);
    expect(container.locals[2].name).toBe("z");
    expect(container.locals[2].fullpath).toBe("z");
  });

  it("should parse rust locals payload with enum and struct values", () => {
    const input =
      '{name="shapes",value="Vec(size=3) = {\\n  [0] = rustdebug::Shape::Circle{center: rustdebug::Point {x: 0, y: 0}, radius: 5},\\n  [1] = rustdebug::Shape::Rectangle{top_left: rustdebug::Point {x: 0, y: 4}, bottom_right: rustdebug::Point {x: 6, y: 0}},\\n  [2] = rustdebug::Shape::Triangle(rustdebug::Point {x: 0, y: 0}, rustdebug::Point {x: 4, y: 0}, rustdebug::Point {x: 0, y: 3})\\n}"},{name="p",value="rustdebug::Point {x: 3, y: 4}"},{name="origin",value="rustdebug::Point {x: 0, y: 0}"}';
    const container = new LocalsContainer(input);

    // This fixture captures a real-world Rust payload with nested enums and structs.
    // For now, validate that the parser accepts the input and surfaces key locals.
    expect(container.locals.length).toBeGreaterThan(0);
    expect(container.locals.some((local) => local.name === "shapes")).toBe(true);
    expect(container.locals.some((local) => local.name === "p")).toBe(true);
    expect(container.locals.some((local) => local.name === "origin")).toBe(true);
  });

  it("should preserve brace-heavy rust display values as plain strings", () => {
    const input =
      '{name="center",value="0x0"},{name="shape",value="0x66c610"},{name="iter",value="core::slice::iter::Iter<rustdebug::Shape> {ptr: core::ptr::non_null::NonNull<rustdebug::Shape> {pointer: 0x66c648}, end_or_len: 0x66c6b8, _marker: core::marker::PhantomData<&rustdebug::Shape>}"},{name="shapes",value="Vec(size=3) = {\\n  [0] = rustdebug::Shape::Circle{center: rustdebug::Point {x: 0, y: 0}, radius: 5},\\n  [1] = rustdebug::Shape::Rectangle{top_left: rustdebug::Point {x: 0, y: 4}, bottom_right: rustdebug::Point {x: 6, y: 0}},\\n  [2] = rustdebug::Shape::Triangle(rustdebug::Point {x: 0, y: 0}, rustdebug::Point {x: 4, y: 0}, rustdebug::Point {x: 0, y: 3})\\n}"},{name="p",value="rustdebug::Point {x: 3, y: 4}"},{name="origin",value="rustdebug::Point {x: 0, y: 0}"}';
    const container = new LocalsContainer(input);

    const iter = container.locals.find((local) => local.name === "iter");
    const shapes = container.locals.find((local) => local.name === "shapes");

    expect(iter).toBeDefined();
    expect(iter?.value).toContain("end_or_len: 0x66c6b8");
    expect(iter?.sublocals).toHaveLength(0);

    expect(shapes).toBeDefined();
    expect(shapes?.value).toContain("Vec(size=3)");
    expect(shapes?.value).toContain("Shape::Rectangle");
    expect(shapes?.value).toContain("\\n");
    expect(shapes?.value.endsWith(")\\n")).toBe(false);
    expect(shapes?.sublocals).toHaveLength(0);
  });

  it("should preserve numeric string values", () => {
    const input = '{name="count",value="0"}';
    const container = new LocalsContainer(input);
    expect(container.locals[0].value).toBe("0");
  });

  it("should handle deeply nested structures", () => {
    const input = '{name="level0",value="{level1 = {level2 = {level3 = {level4 = 42}}}}"}';
    const container = new LocalsContainer(input);

    expect(container.locals).toHaveLength(1);
    let current = container.locals[0];
    expect(current.fullpath).toBe("level0");

    current = current.sublocals[0];
    expect(current.fullpath).toBe("level0.level1");

    current = current.sublocals[0];
    expect(current.fullpath).toBe("level0.level1.level2");

    current = current.sublocals[0];
    expect(current.fullpath).toBe("level0.level1.level2.level3");

    current = current.sublocals[0];
    expect(current.fullpath).toBe("level0.level1.level2.level3.level4");
    expect(current.value).toBe("42");
  });

  it("should preserve sibling locals when parsing array-style nested values", () => {
    const input = '{name="wrap",value="{arr = {0x1, 0x2, 0x3}, tail = 0x9}"}';
    const container = new LocalsContainer(input);

    const wrap = container.locals[0];
    expect(wrap.fullpath).toBe("wrap");

    const arr = wrap.sublocals.find((s) => s.name === "arr");
    const tail = wrap.sublocals.find((s) => s.name === "tail");

    expect(arr).toBeDefined();
    expect(arr?.fullpath).toBe("wrap.arr");
    expect(tail).toBeDefined();
    expect(tail?.fullpath).toBe("wrap.tail");
    expect(tail?.value).toBe("0x9");
  });

  it("should parse mixed plain/simple/complex locals in one container", () => {
    const input =
      '{name="plain",value="7"},{name="simple",value="{x = 1, y = 2}"},{name="complex",value="{a = 1, b = {c = 2}}"}';
    const container = new LocalsContainer(input);

    expect(container.locals).toHaveLength(3);

    const plain = container.locals.find((l) => l.name === "plain");
    const simple = container.locals.find((l) => l.name === "simple");
    const complex = container.locals.find((l) => l.name === "complex");

    expect(plain?.value).toBe("7");
    expect(simple?.sublocals.map((s) => s.name)).toEqual(["x", "y"]);
    expect(complex?.sublocals.find((s) => s.name === "b")?.sublocals[0]?.name).toBe("c");
  });

  describe("anonymous union/struct handling", () => {
    it("should exclude anonymous markers from fullpath", () => {
      const input = '{name="struct",value="{a = 0x1, {b = 0x2, c = 0x3}}"}';
      const container = new LocalsContainer(input);

      const struct = container.locals[0];
      expect(struct.fullpath).toBe("struct");

      // Find the anonymous marker and its children
      const anon = struct.sublocals.find((s) => s.name.startsWith(LocalsContainer.anonMarker));
      expect(anon).toBeDefined();

      if (anon) {
        // Anonymous marker should have parent's fullpath, not add itself
        expect(anon.fullpath).toBe("struct");

        // Children of anonymous marker should use parent's path
        const childB = anon.sublocals.find((s) => s.name === "b");
        const childC = anon.sublocals.find((s) => s.name === "c");

        expect(childB?.fullpath).toBe("struct.b");
        expect(childC?.fullpath).toBe("struct.c");
      }
    });

    it("should handle nested anonymous unions correctly", () => {
      const input = '{name="outer",value="{x = 1, {y = 2, {z = 3}}"}';
      const container = new LocalsContainer(input);

      const outer = container.locals[0];
      expect(outer.fullpath).toBe("outer");

      // Find x (regular member)
      const x = outer.sublocals.find((s) => s.name === "x");
      expect(x?.fullpath).toBe("outer.x");

      // Find first anonymous marker
      const anon1 = outer.sublocals.find((s) => s.name.startsWith(LocalsContainer.anonMarker));
      expect(anon1?.fullpath).toBe("outer");

      if (anon1) {
        const y = anon1.sublocals.find((s) => s.name === "y");
        expect(y?.fullpath).toBe("outer.y");

        // Find nested anonymous marker
        const anon2 = anon1.sublocals.find((s) => s.name.startsWith(LocalsContainer.anonMarker));
        expect(anon2?.fullpath).toBe("outer");

        if (anon2) {
          const z = anon2.sublocals.find((s) => s.name === "z");
          expect(z?.fullpath).toBe("outer.z");
        }
      }
    });

    it("should handle anonymous marker at top level", () => {
      const parent = new Local("parent", "");
      const anonChild = new Local(LocalsContainer.anonMarker + "0", "");
      parent.addLocal(anonChild);

      expect(anonChild.fullpath).toBe("parent");

      const grandchild = new Local("field", "value");
      anonChild.addLocal(grandchild);

      expect(grandchild.fullpath).toBe("parent.field");
    });

    it("should handle anonymous marker in constructor", () => {
      const anon = new Local(LocalsContainer.anonMarker + "0", "", "parent");
      expect(anon.fullpath).toBe("parent");

      const anonNoParent = new Local(LocalsContainer.anonMarker + "0", "");
      expect(anonNoParent.fullpath).toBe(LocalsContainer.anonMarker + "0");
    });

    it("should handle complex real-world case with anonymous unions", () => {
      // Simulating: struct { int a; union { int b; int c; }; int d; }
      const input = '{name="mystruct",value="{a = 1, {b = 2, c = 3}, d = 4}"}';
      const container = new LocalsContainer(input);

      const mystruct = container.locals[0];
      expect(mystruct.fullpath).toBe("mystruct");

      // Find regular members
      const a = mystruct.sublocals.find((s) => s.name === "a");
      const d = mystruct.sublocals.find((s) => s.name === "d");

      expect(a?.fullpath).toBe("mystruct.a");
      expect(d?.fullpath).toBe("mystruct.d");

      // Find anonymous union and its members
      const anon = mystruct.sublocals.find((s) => s.name.startsWith(LocalsContainer.anonMarker));
      expect(anon?.fullpath).toBe("mystruct");

      if (anon) {
        const b = anon.sublocals.find((s) => s.name === "b");
        const c = anon.sublocals.find((s) => s.name === "c");

        // b and c should appear as if they're direct children of mystruct
        expect(b?.fullpath).toBe("mystruct.b");
        expect(c?.fullpath).toBe("mystruct.c");
      }
    });

    it("should handle multiple anonymous markers at same level", () => {
      const input = '{name="data",value="{a = 1, {b = 2}, {c = 3}, d = 4}"}';
      const container = new LocalsContainer(input);

      const data = container.locals[0];
      expect(data.fullpath).toBe("data");

      const a = data.sublocals.find((s) => s.name === "a");
      const d = data.sublocals.find((s) => s.name === "d");

      expect(a?.fullpath).toBe("data.a");
      expect(d?.fullpath).toBe("data.d");

      // Check both anonymous markers
      const anons = data.sublocals.filter((s) => s.name.startsWith(LocalsContainer.anonMarker));
      expect(anons.length).toBe(2);

      anons.forEach((anon) => {
        expect(anon.fullpath).toBe("data");
      });

      // Find b and c through their anonymous parents
      let foundB = false;
      let foundC = false;

      anons.forEach((anon) => {
        const b = anon.sublocals.find((s) => s.name === "b");
        const c = anon.sublocals.find((s) => s.name === "c");

        if (b) {
          expect(b.fullpath).toBe("data.b");
          foundB = true;
        }
        if (c) {
          expect(c.fullpath).toBe("data.c");
          foundC = true;
        }
      });

      expect(foundB).toBe(true);
      expect(foundC).toBe(true);
    });
  });
});
