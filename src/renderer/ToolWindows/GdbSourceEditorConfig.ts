/**
 * Implements gdb source editor config behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `defaultTheme`, `editorThemes`, `defaultMode`, `editorModes`, `configureAceBasePath`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import ace from "ace-builds";
import "ace-builds/src-noconflict/mode-assembly_arm32";
import "ace-builds/src-noconflict/mode-assembly_x86";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-csharp";
import "ace-builds/src-noconflict/mode-golang";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-rust";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/theme-ambiance";
import "ace-builds/src-noconflict/theme-chaos";
import "ace-builds/src-noconflict/theme-chrome";
import "ace-builds/src-noconflict/theme-cloud9_day";
import "ace-builds/src-noconflict/theme-cloud9_night";
import "ace-builds/src-noconflict/theme-cloud9_night_low_color";
import "ace-builds/src-noconflict/theme-cloud_editor";
import "ace-builds/src-noconflict/theme-cloud_editor_dark";
import "ace-builds/src-noconflict/theme-clouds";
import "ace-builds/src-noconflict/theme-clouds_midnight";
import "ace-builds/src-noconflict/theme-cobalt";
import "ace-builds/src-noconflict/theme-crimson_editor";
import "ace-builds/src-noconflict/theme-dawn";
import "ace-builds/src-noconflict/theme-dracula";
import "ace-builds/src-noconflict/theme-dreamweaver";
import "ace-builds/src-noconflict/theme-eclipse";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-github_dark";
import "ace-builds/src-noconflict/theme-github_light_default";
import "ace-builds/src-noconflict/theme-gob";
import "ace-builds/src-noconflict/theme-gruvbox";
import "ace-builds/src-noconflict/theme-gruvbox_dark_hard";
import "ace-builds/src-noconflict/theme-gruvbox_light_hard";
import "ace-builds/src-noconflict/theme-idle_fingers";
import "ace-builds/src-noconflict/theme-iplastic";
import "ace-builds/src-noconflict/theme-katzenmilch";
import "ace-builds/src-noconflict/theme-kr_theme";
import "ace-builds/src-noconflict/theme-kuroir";
import "ace-builds/src-noconflict/theme-merbivore";
import "ace-builds/src-noconflict/theme-merbivore_soft";
import "ace-builds/src-noconflict/theme-mono_industrial";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/theme-nord_dark";
import "ace-builds/src-noconflict/theme-one_dark";
import "ace-builds/src-noconflict/theme-pastel_on_dark";
import "ace-builds/src-noconflict/theme-solarized_dark";
import "ace-builds/src-noconflict/theme-solarized_light";
import "ace-builds/src-noconflict/theme-sqlserver";
import "ace-builds/src-noconflict/theme-terminal";
import "ace-builds/src-noconflict/theme-textmate";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/theme-tomorrow_night_blue";
import "ace-builds/src-noconflict/theme-tomorrow_night_bright";
import "ace-builds/src-noconflict/theme-tomorrow_night_eighties";
import "ace-builds/src-noconflict/theme-twilight";
import "ace-builds/src-noconflict/theme-vibrant_ink";
import "ace-builds/src-noconflict/theme-xcode";

export const defaultTheme = "gruvbox";

export const editorThemes: Map<string, string> = new Map<string, string>([
  ["Ambiance", "ambiance"],
  ["Chaos", "chaos"],
  ["Chrome", "chrome"],
  ["Cloud9 Day", "cloud9_day"],
  ["Cloud9 Night", "cloud9_night"],
  ["Cloud9 Night Low Color", "cloud9_night_low_color"],
  ["Cloud Editor", "cloud_editor"],
  ["Cloud Editor Dark", "cloud_editor_dark"],
  ["Clouds", "clouds"],
  ["Clouds Midnight", "clouds_midnight"],
  ["Cobalt", "cobalt"],
  ["Crimson Editor", "crimson_editor"],
  ["Dawn", "dawn"],
  ["Dracula", "dracula"],
  ["Dreamweaver", "dreamweaver"],
  ["Eclipse", "eclipse"],
  ["Github", "github"],
  ["Github Dark", "github_dark"],
  ["Github Light Default", "github_light_default"],
  ["Gob", "gob"],
  ["Gruvbox", "gruvbox"],
  ["Gruvbox Dark Hard", "gruvbox_dark_hard"],
  ["Gruvbox Light Hard", "gruvbox_light_hard"],
  ["Idle Fingers", "idle_fingers"],
  ["iPlastic", "iplastic"],
  ["Katzenmilch", "katzenmilch"],
  ["Kr", "kr_theme"],
  ["Kuroir", "kuroir"],
  ["Merbivore", "merbivore"],
  ["Merbivore Soft", "merbivore_soft"],
  ["Mono Industrial", "mono_industrial"],
  ["Monokai", "monokai"],
  ["Nord Dark", "nord_dark"],
  ["One Dark", "one_dark"],
  ["Pastel on Dark", "pastel_on_dark"],
  ["Solarized Dark", "solarized_dark"],
  ["Solarized Light", "solarized_light"],
  ["SQL Server", "sqlserver"],
  ["Terminal", "terminal"],
  ["TextMate", "textmate"],
  ["Tomorrow", "tomorrow"],
  ["Tomorrow Night", "tomorrow_night"],
  ["Tomorrow Night Blue", "tomorrow_night_blue"],
  ["Tomorrow Night Bright", "tomorrow_night_bright"],
  ["Tomorrow Night Eighties", "tomorrow_night_eighties"],
  ["Twilight", "twilight"],
  ["Vibrant Ink", "vibrant_ink"],
  ["XCode", "xcode"],
]);

export const defaultMode = "c_cpp";
export const editorModes: Map<string, string> = new Map<string, string>([
  ["c", "c_cpp"],
  ["cpp", "c_cpp"],
  ["cxx", "c_cpp"],
  ["h", "c_cpp"],
  ["hxx", "c_cpp"],
  ["cc", "c_cpp"],
  ["rs", "rust"],
  ["asm", "assembly_x86"],
  ["cs", "csharp"],
  ["d", "d"],
  ["go", "golang"],
  ["py", "python"],
  ["java", "java"],
  ["s", "assembly_arm32"],
]);

/**
 * Performs configure ace base path as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 */
export function configureAceBasePath(): void {
  ace.config.setModuleUrl("../../node_modules", "ace-builds");
}
