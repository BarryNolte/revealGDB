import { Buffer } from "node:buffer";
import { execSync } from "node:child_process";

export class WslUtilities {
  static getWslDistributions(): string[] {
    const buf = execSync("wsl.exe -l -v", { encoding: "buffer" });
    const stdoutString = WslUtilities.bufferToAsciiString(buf);
    const distros = stdoutString.split("\r\n");
    distros.shift();
    distros.pop();

    return distros;
  }

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

  private static bufferToAsciiString(buffer: Buffer): string {
    let asciiString = "";

    for (let i = 0; i < buffer.length; i++) {
      const charCode = buffer[i];

      // Check if the character is within the ASCII range
      if (charCode < 0x7f && charCode >= 0x20) {
        asciiString += String.fromCharCode(charCode);
      } else {
        if (charCode === 0x0a) {
          asciiString += "\n";
        } else if (charCode === 0x0d) {
          asciiString += "\r";
        }
      }
    }

    return asciiString;
  }
}
