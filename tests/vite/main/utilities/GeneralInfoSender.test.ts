// @vitest-environment node
import { EventEmitter } from "events";
import { beforeEach, describe, expect, it } from "vitest";
import { DEBUG_STREAM, HTML_STREAM } from "../../../../src/main/mi-interface/mi-stream-events";
import { GeneralInfoSender } from "../../../../src/main/utilities/GeneralInfoSender";

describe("GeneralInfoSender", () => {
  let sender: GeneralInfoSender;

  beforeEach(() => {
    sender = new GeneralInfoSender();
  });

  describe("instance singleton", () => {
    it("exposes a static instance", () => {
      expect(GeneralInfoSender.instance).toBeInstanceOf(GeneralInfoSender);
    });
  });

  describe("addLine / sendOutput — emits to self when no relay target", () => {
    it("emits DEBUG_STREAM separator and body lines on sendOutput", () => {
      const received: string[] = [];
      sender.on(DEBUG_STREAM, (line: string) => received.push(line));

      sender.addLine("hello");
      sender.sendOutput();

      // separator (first), separator (second, no header), body line
      expect(received).toHaveLength(3);
      expect(received[0]).toMatch(/^-+$/);
      expect(received[1]).toMatch(/^-+$/);
      expect(received[2]).toBe(" hello ");
    });

    it("clears outputLines after sendOutput", () => {
      const received: string[] = [];
      sender.on(DEBUG_STREAM, (line: string) => received.push(line));

      sender.addLine("first");
      sender.sendOutput();

      received.length = 0; // reset collector
      sender.sendOutput();

      // second call has no lines → only 2 separators
      expect(received).toHaveLength(2);
    });

    it("emits multiple body lines in order", () => {
      const received: string[] = [];
      sender.on(DEBUG_STREAM, (line: string) => received.push(line));

      sender.addLine("line one");
      sender.addLine("line two");
      sender.addLine("line three");
      sender.sendOutput();

      // separator + separator (no header) + 3 body lines = 5
      expect(received).toHaveLength(5);
      expect(received[2]).toBe(" line one ");
      expect(received[3]).toBe(" line two ");
      expect(received[4]).toBe(" line three ");
    });
  });

  describe("addHeader", () => {
    it("includes header in output between separators", () => {
      const received: string[] = [];
      sender.on(DEBUG_STREAM, (line: string) => received.push(line));

      sender.addHeader("MY HEADER");
      sender.sendOutput();

      // separator, header line, separator (no body lines)
      expect(received).toHaveLength(3);
      expect(received[1]).toBe(" MY HEADER ");
    });

    it("uses longest of header/lines for separator width", () => {
      const received: string[] = [];
      sender.on(DEBUG_STREAM, (line: string) => received.push(line));

      sender.addHeader("AB"); // length 2
      sender.addLine("A longer line"); // length 13
      sender.sendOutput();

      const separatorLength = received[0].length;
      // separator = max(2, 13) + 2 = 15 dashes
      expect(separatorLength).toBe(15);
    });

    it("separator width based on header when header is longest", () => {
      const received: string[] = [];
      sender.on(DEBUG_STREAM, (line: string) => received.push(line));

      sender.addHeader("A very long header text"); // length 23
      sender.addLine("short"); // length 5
      sender.sendOutput();

      const separatorLength = received[0].length;
      expect(separatorLength).toBe(25); // 23 + 2
    });
  });

  describe("setRelayTarget", () => {
    it("relays DEBUG_STREAM emissions to the target emitter, not self", () => {
      const target = new EventEmitter();
      const selfReceived: string[] = [];
      const targetReceived: string[] = [];

      sender.on(DEBUG_STREAM, (line: string) => selfReceived.push(line));
      target.on(DEBUG_STREAM, (line: string) => targetReceived.push(line));

      sender.setRelayTarget(target);
      sender.addLine("relayed");
      sender.sendOutput();

      expect(selfReceived).toHaveLength(0);
      expect(targetReceived.length).toBeGreaterThan(0);
    });
  });

  describe("sendHtmlBlock", () => {
    it("emits HTML_STREAM on self when no relay target", () => {
      const received: string[] = [];
      sender.on(HTML_STREAM, (html: string) => received.push(html));

      sender.sendHtmlBlock("<b>hello</b>");
      expect(received).toEqual(["<b>hello</b>"]);
    });

    it("relays HTML_STREAM to target when relay target is set", () => {
      const target = new EventEmitter();
      const selfReceived: string[] = [];
      const targetReceived: string[] = [];

      sender.on(HTML_STREAM, (html: string) => selfReceived.push(html));
      target.on(HTML_STREAM, (html: string) => targetReceived.push(html));

      sender.setRelayTarget(target);
      sender.sendHtmlBlock("<p>test</p>");

      expect(selfReceived).toHaveLength(0);
      expect(targetReceived).toEqual(["<p>test</p>"]);
    });
  });

  describe("sendOutput with no lines and no header", () => {
    it("emits only two separators (no body)", () => {
      const received: string[] = [];
      sender.on(DEBUG_STREAM, (line: string) => received.push(line));
      sender.sendOutput();
      expect(received).toHaveLength(2);
      // separator length = 0 + 2 = 2
      expect(received[0]).toBe("--");
    });
  });
});
