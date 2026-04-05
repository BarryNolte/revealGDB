/**
 * @file WSL-Utilities
 * @description Provides helper utilities for Windows Subsystem for Linux (WSL) integration.
 * This module contains functionality for discovering and listing WSL distributions and
 * serial ports available within WSL environments. Used for configuring GDB connections
 * to targets running in WSL instances.
 *
 * @author revealGDB
 * @version 1.0.0
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
   * Retrieves a list of available WSL distributions installed on the system.
   * Executes 'wsl.exe -l -v' command and parses the output to extract distribution names.
   *
   * @returns {WslDistro[]} Array of WSL distribution objects containing name, version, state, and default status.
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
   * Discovers and returns a list of serial ports available within the WSL environment.
   * Executes a command within the default WSL distribution to list TTY devices and their drivers.
   *
   * @returns {string[]} Array of available serial port names (e.g., 'ttyS0', 'ttyUSB0')
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
   * Converts a Buffer containing raw bytes into an ASCII string representation.
   * Filters characters to include only printable ASCII (0x20-0x7E) and control characters CR/LF.
   * This ensures deterministic parsing of command output.
   *
   * @param {Buffer} buffer - The buffer to convert
   * @returns {string} ASCII-filtered string representation of the buffer
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
