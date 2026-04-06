/**
 * Provides wsl utilities utilities used by main-process platform and integration workflows.
 *
 * @remarks
 * Exported symbols include `WslDistro`, `WslUtilities`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { Buffer } from "node:buffer";
import { execSync } from "node:child_process";

export type WslDistro = {
  name: string;
  version: string;
  state: string;
  default: boolean;
};

export class WslUtilities {
  /**
   * Returns wsl distrobutions from current state.
   *
   * @returns The resulting collection produced by this operation.
   */
  static getWslDistrobutions(): WslDistro[] {
    const wslDistroRegex =
      /(?<default>[*\s]*)(?<distro>[0-9a-zA-Z-.]*)\s*(?<status>[\S]*)\s*(?<version>[\S]*)/;

    const buf = execSync("wsl.exe -l -v", { encoding: "buffer" });
    const stdoutString = WslUtilities.bufferToAsciiString(buf);
    const distros = stdoutString.split("\r\n");
    distros.shift();
    distros.pop();

    const wslDistros: WslDistro[] = [];
    for (const distro of distros) {
      const match = wslDistroRegex.exec(distro);
      if (match && match.groups) {
        wslDistros.push({
          name: match.groups.distro,
          version: match.groups.version,
          state: match.groups.status,
          default: match.groups.default === "*",
        });
      }
    }

    return wslDistros;
  }

  /**
   * Returns wsl serial ports from current state.
   *
   * @returns The resulting collection produced by this operation.
   */
  static getWslSerialPorts(): string[] {
    const buf = execSync('wsl -e sh -c "ls -l /sys/class/tty/*/device/driver"', {
      encoding: "buffer",
    });
    const stdoutString = WslUtilities.bufferToAsciiString(buf);
    const ports = stdoutString.matchAll(/\/sys\/class\/tty\/(?<port>[^/]*)\/device\/driver/gm);

    const distros: string[] = [];
    ports.forEach((port) => {
      const distro = port.groups?.port;
      if (distro) {
        distros.push(distro);
      }
    });

    return distros;
  }

  /**
   * Performs buffer to ascii string as part of this module's public API.
   *
   * @param buffer - Value for `buffer` consumed by this operation.
   * @returns The resulting string value produced by this operation.
   */
  private static bufferToAsciiString(buffer: Buffer): string {
    let asciiString = "";

    for (let i = 0; i < buffer.length; i++) {
      const charCode = buffer[i];

      // Filter to printable ASCII plus CR/LF for deterministic parsing.
      if (charCode >= 0x20 && charCode < 0x7f) {
        asciiString += String.fromCharCode(charCode);
        continue;
      }

      if (charCode === 0x0a) {
        asciiString += "\n";
      } else if (charCode === 0x0d) {
        asciiString += "\r";
      }
    }

    return asciiString;
  }
}
