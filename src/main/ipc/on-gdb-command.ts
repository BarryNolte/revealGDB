/**
 * Implements the GDB command handler that dispatches renderer-issued commands to the GDB interface or built-in dot-commands.
 *
 * @remarks
 * Exported symbols include `onGdbCommand`. It is responsible for routing raw command strings from the renderer, handling dot-prefixed debug utilities, and forwarding standard MI commands to the GDB interface.
 */
import { screen } from "electron";
import { HTMLTableGenerator } from "../../common/HtmlTableGenerator";
import { DebuggerCommand, DebuggerSelectStackFrameCommand } from "../../common/ipc-contracts";
import { miInterface } from "../mi-interface/mi-interface";
import { GeneralInfoSender } from "../utilities/GeneralInfoSender";
import { WslUtilities } from "../utilities/wsl-utilities";
import { IpcRegistrationContext } from "./types";

type DotCommandHandler = (gdbInterface: miInterface, subCommands?: string[]) => void;

const DEFAULT_TABLE_OPTIONS = {
  titleHeaderBgColor: "blue",
  titleTextColor: "yellow",
  headerBgColor: "green",
  headerTextColor: "yellow",
  tdPadding: "3px",
  tdFontWeight: "bold",
  tdColor: "#000000",
  tableWidth: "auto",
  showTableHeader: false,
};
/**
 * Performs handleHelp as part of this module's internal workflow.
 *
 * @param _gdbInterface - _gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleHelp(_gdbInterface: miInterface): void {
  const helpData = {
    title: "Available Debug Commands",
    header: ["command", "description"],
    content: [
      { command: ".help", description: "Show this help message" },
      { command: ".db sources", description: "Dump information about source files" },
      { command: ".db threads", description: "Dump information about threads" },
      { command: ".db stack", description: "Dump information about the stack" },
      { command: ".db breakpoints", description: "Dump information about breakpoints" },
      { command: ".db locals", description: "Dump information about local variables" },
      { command: ".db registers", description: "Dump information about registers" },
      { command: ".db features", description: "Dump information about features" },
      { command: ".db parameters", description: "Dump information about parameters" },
      { command: ".db symbols", description: "Dump information about symbols" },
      { command: ".db functions", description: "Dump information about functions" },
      { command: ".debug", description: "Break into the debugger" },
      { command: ".wsl", description: "Show WSL distro and serial port info" },
      { command: ".screen", description: "Show screen information for all displays" },
    ],
  };
  const helpOptions = { ...DEFAULT_TABLE_OPTIONS, showTableHeader: true };
  const helpTable = new HTMLTableGenerator(helpData, helpOptions);
  GeneralInfoSender.instance.sendHtmlBlock(helpTable.createTableHTML());
}

const DB_TABLE_OPTIONS = { ...DEFAULT_TABLE_OPTIONS, showTableHeader: true };
/**
 * Performs handleDbSource as part of this module's internal workflow.
 *
 * @param gdbInterface - gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleDbSource(gdbInterface: miInterface): void {
  const sourceData = {
    title: "GDB Source Files",
    header: ["fullPath"],
    content: gdbInterface.gdbDB.gdbSrcFileCache.list().map((f) => ({ fullPath: f })),
  };
  GeneralInfoSender.instance.sendHtmlBlock(
    new HTMLTableGenerator(sourceData, DB_TABLE_OPTIONS).createTableHTML(),
  );
}
/**
 * Performs handleDbThreadGroups as part of this module's internal workflow.
 *
 * @param gdbInterface - gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleDbThreadGroups(gdbInterface: miInterface): void {
  const threadGroupData = {
    title: "GDB Thread Groups",
    header: ["gid", "threads"],
    content: Array.from(gdbInterface.gdbDB.threadGroups.values()).map((t) => ({
      gid: t.gid,
      threads: Array.from(t.threads.keys()).join(", "),
    })),
  };
  GeneralInfoSender.instance.sendHtmlBlock(
    new HTMLTableGenerator(threadGroupData, DB_TABLE_OPTIONS).createTableHTML(),
  );
  const threadData = {
    title: "GDB Threads",
    header: ["active", "id", "targetId", "details", "name", "state", "frame"],
    content: Array.from(gdbInterface.gdbDB.threads.values()).map((t) => ({
      active: t.active,
      id: t.id,
      targetId: t.targetId,
      details: t.details,
      name: t.name,
      state: t.state,
      frame: t.frame.func,
    })),
  };
  GeneralInfoSender.instance.sendHtmlBlock(
    new HTMLTableGenerator(threadData, DB_TABLE_OPTIONS).createTableHTML(),
  );
}
/**
 * Performs handleDbFeatures as part of this module's internal workflow.
 *
 * @param gdbInterface - gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleDbFeatures(gdbInterface: miInterface): void {
  const featureData = {
    title: "GDB Features",
    header: ["feature", "availability"],
    content: gdbInterface.gdbDB.featureList().map((f) => ({
      feature: f.feature,
      availability: f.available ? "available" : "unavailable",
    })),
  };
  GeneralInfoSender.instance.sendHtmlBlock(
    new HTMLTableGenerator(featureData, DB_TABLE_OPTIONS).createTableHTML(),
  );
}
/**
 * Performs handleDbParameters as part of this module's internal workflow.
 *
 * @param gdbInterface - gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleDbParameters(gdbInterface: miInterface): void {
  const paramData = {
    title: "GDB Parameters",
    header: ["parameter", "value"],
    content: gdbInterface.gdbDB.paramList().map((p) => ({
      parameter: p.name,
      value: p.value,
    })),
  };
  GeneralInfoSender.instance.sendHtmlBlock(
    new HTMLTableGenerator(paramData, DB_TABLE_OPTIONS).createTableHTML(),
  );
}
/**
 * Performs handleDbStack as part of this module's internal workflow.
 *
 * @param gdbInterface - gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleDbStack(gdbInterface: miInterface): void {
  const stackData = {
    title: "GDB Stack Frames",
    header: ["active", "level", "func", "addr", "args", "file", "fullName", "line", "from", "arch"],
    content: gdbInterface.gdbDB.stackFrames.map((f) => ({
      active: f.active,
      level: f.level,
      func: f.func,
      addr: f.addr,
      args: f.args,
      file: f.file,
      fullName: f.fullName,
      line: f.line,
      from: f.from,
      arch: f.arch,
    })),
  };
  GeneralInfoSender.instance.sendHtmlBlock(
    new HTMLTableGenerator(stackData, DB_TABLE_OPTIONS).createTableHTML(),
  );
}
/**
 * Performs handleDbBreakpoints as part of this module's internal workflow.
 *
 * @param gdbInterface - gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleDbBreakpoints(gdbInterface: miInterface): void {
  const bpData = {
    title: "GDB Breakpoints",
    header: [
      "id",
      "type",
      "disp",
      "enabled",
      "addr",
      "func",
      "file",
      "fullname",
      "line",
      "tg",
      "times",
      "installed",
      "orgloc",
    ],
    content: gdbInterface.gdbDB.breakpointList().map((bp) => ({
      id: bp.number,
      type: bp.type,
      disp: bp.disp,
      enabled: bp.enabled,
      addr: bp.addr,
      func: bp.func,
      file: bp.file,
      fullname: bp.fullname,
      line: bp.line,
      tg: bp.tg,
      times: bp.times,
      installed: bp.installed,
      orgloc: bp.orgloc,
    })),
  };
  GeneralInfoSender.instance.sendHtmlBlock(
    new HTMLTableGenerator(bpData, DB_TABLE_OPTIONS).createTableHTML(),
  );
}
/**
 * Performs handleDbRegisters as part of this module's internal workflow.
 *
 * @param gdbInterface - gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */
function handleDbRegisters(gdbInterface: miInterface): void {
  const regData = {
    title: "GDB Registers",
    header: ["name", "value", "changed"],
    content: gdbInterface.gdbDB.registerList().map((r) => ({
      name: r.name,
      value: r.value,
      changed: r.changed,
    })),
  };
  GeneralInfoSender.instance.sendHtmlBlock(
    new HTMLTableGenerator(regData, DB_TABLE_OPTIONS).createTableHTML(),
  );
}
/**
 * Performs handleDbSymbols as part of this module's internal workflow.
 *
 * @param gdbInterface - gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleDbSymbols(gdbInterface: miInterface): void {
  const symData = {
    title: "GDB Symbol Files: " + gdbInterface.gdbDB.gdbSymbolFiles.mainSym,
    header: ["startAddr", "endAddr", "section", "file"],
    content: Array.from(
      gdbInterface.gdbDB.gdbSymbolFiles.sections.map((s) => ({
        startAddr: s.startAddr,
        endAddr: s.endAddr,
        section: s.section,
        file: s.file ?? "",
      })),
    ),
  };
  GeneralInfoSender.instance.sendHtmlBlock(
    new HTMLTableGenerator(symData, DB_TABLE_OPTIONS).createTableHTML(),
  );
}
/**
 * Performs handleDbFunctions as part of this module's internal workflow.
 *
 * @param gdbInterface - gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleDbFunctions(gdbInterface: miInterface): void {
  const funcData = {
    title: "GDB Functions",
    header: ["name", "line", "function"],
    content: Array.from(gdbInterface.gdbDB.gdbFunctionNames.entries()).flatMap(([name, funcs]) =>
      funcs.map((f) => ({
        name,
        line: f.line,
        function: f.function,
      })),
    ),
  };
  GeneralInfoSender.instance.sendHtmlBlock(
    new HTMLTableGenerator(funcData, DB_TABLE_OPTIONS).createTableHTML(),
  );
}
/**
 * Performs handleDbLocals as part of this module's internal workflow.
 *
 * @param _gdbInterface - _gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleDbLocals(_gdbInterface: miInterface): void {}

type DbSubCommandHandler = (gdbInterface: miInterface) => void;

const DB_SUB_COMMANDS = new Map<string, DbSubCommandHandler>([
  ["sources", handleDbSource],
  ["threads", handleDbThreadGroups],
  ["stack", handleDbStack],
  ["breakpoints", handleDbBreakpoints],
  ["locals", handleDbLocals],
  ["registers", handleDbRegisters],
  ["features", handleDbFeatures],
  ["parameters", handleDbParameters],
  ["symbols", handleDbSymbols],
  ["functions", handleDbFunctions],
]);
/**
 * Performs handleDb as part of this module's internal workflow.
 *
 * @param gdbInterface - gdbInterface parameter.
 * @param subCommands? - subCommands? parameter.
 * @returns The computed result produced by this operation.
 */

function handleDb(gdbInterface: miInterface, subCommands?: string[]): void {
  const sub = subCommands?.[0] ?? "";
  const handler = DB_SUB_COMMANDS.get(sub);
  if (handler) {
    handler(gdbInterface);
    return;
  }
  GeneralInfoSender.instance.addLine(
    "Unknown .db subcommand. Use '.help' to see available commands.",
  );
  GeneralInfoSender.instance.sendOutput();
}
/**
 * Performs handleDebug as part of this module's internal workflow.
 *
 * @param _gdbInterface - _gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleDebug(_gdbInterface: miInterface): void {
  GeneralInfoSender.instance.addHeader("Breaking into Debugger");
  GeneralInfoSender.instance.sendOutput();
  // eslint-disable-next-line no-debugger
  debugger;
}
/**
 * Performs handleWsl as part of this module's internal workflow.
 *
 * @param _gdbInterface - _gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleWsl(_gdbInterface: miInterface): void {
  const distros = WslUtilities.getWslDistributions();
  const distroData = {
    title: "WSL Distros",
    header: ["default", "name", "version", "state"],
    content: distros.map((d) => ({
      default: d.default === true ? "*" : "",
      name: d.name,
      version: d.version,
      state: d.state,
    })),
  };
  const distroOptions = { ...DEFAULT_TABLE_OPTIONS, showTableHeader: true };
  const distroTable = new HTMLTableGenerator(distroData, distroOptions);
  GeneralInfoSender.instance.sendHtmlBlock(distroTable.createTableHTML());

  const sports = WslUtilities.getWslSerialPorts();
  const spData = {
    title: "WSL Serial Ports",
    header: ["col"],
    content: sports.map((s) => ({ col: s })),
  };
  const spTable = new HTMLTableGenerator(spData, DEFAULT_TABLE_OPTIONS);
  GeneralInfoSender.instance.sendHtmlBlock(spTable.createTableHTML());
}
/**
 * Performs handleScreen as part of this module's internal workflow.
 *
 * @param _gdbInterface - _gdbInterface parameter.
 * @returns The computed result produced by this operation.
 */

function handleScreen(_gdbInterface: miInterface): void {
  const allDisplays = screen.getAllDisplays();
  GeneralInfoSender.instance.addHeader("Main Window Screen Info");
  for (const display of allDisplays) {
    GeneralInfoSender.instance.addLine(`Screen: ${display.id}`);
    GeneralInfoSender.instance.addLine(`  Bounds: ${JSON.stringify(display.bounds)}`);
    GeneralInfoSender.instance.addLine(`  Work Area: ${JSON.stringify(display.workArea)}`);
    GeneralInfoSender.instance.addLine(`  Scale Factor: ${display.scaleFactor}`);
  }
  GeneralInfoSender.instance.sendOutput();
}

const DOT_COMMANDS = new Map<string, DotCommandHandler>([
  ["help", handleHelp],
  ["db", handleDb],
  ["debug", handleDebug],
  ["wsl", handleWsl],
  ["screen", handleScreen],
]);
/**
 * Performs handleSelectStackFrame as part of this module's internal workflow.
 *
 * @param command - command parameter.
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */

function handleSelectStackFrame(
  command: DebuggerSelectStackFrameCommand,
  context: IpcRegistrationContext,
): void {
  if (!command.frameLevel) {
    return;
  }

  const gdbInterface = context.getGdbInterface();
  gdbInterface.runCommand(`frame ${command.frameLevel}`);
  gdbInterface.runCommand("-data-list-register-values x");
  gdbInterface.runCommand("-stack-list-locals 1");
}

/**
 * Performs on gdb command as part of this module's public API.
 *
 * @remarks
 * Participates in main-process IPC wiring between renderer requests and backend services.
 *
 * @param command - Debugger command text or command descriptor to execute.
 * @param context - Dependency container used to register handlers and access shared services.
 */
/**
 * Performs onGdbCommand as part of this module's internal workflow.
 *
 * @param command - command parameter.
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */
export function onGdbCommand(command: DebuggerCommand, context: IpcRegistrationContext): void {
  if (typeof command !== "string") {
    handleSelectStackFrame(command, context);
    return;
  }

  if (command.startsWith(".")) {
    const cmd = command.split(" ");
    const func = DOT_COMMANDS.get(cmd[0].substring(1));
    if (!func) {
      GeneralInfoSender.instance.addLine(
        `Unknown command: ${cmd[0]}. Use '.help' to see available commands.`,
      );
      GeneralInfoSender.instance.sendOutput();
      return;
    }
    func?.(context.getGdbInterface(), cmd.slice(1));
    return;
  }
  context.getGdbInterface().runCommand(command);
}

/**
 * Sends Ctrl+D (EOT) to the active GDB process.
 *
 * @remarks
 * Participates in main-process IPC wiring between renderer requests and backend services.
 *
 * @param context - Dependency container used to register handlers and access shared services.
 */
/**
 * Performs onGdbControlD as part of this module's internal workflow.
 *
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */
export function onGdbControlD(context: IpcRegistrationContext): void {
  context.getGdbInterface().sendControlD();
}
