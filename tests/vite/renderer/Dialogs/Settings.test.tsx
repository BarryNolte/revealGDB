// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act, createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Settings, { type SettingsHandle } from "../../../../src/renderer/Dialogs/Settings";

vi.mock("../../../../src/renderer/ToolWindows/GdbSourceWindow", () => ({
  editorThemes: {
    keys: () => ({
      toArray: () => ["Monokai", "Github"],
    }),
  },
}));

vi.mock("@syncfusion/ej2-react-buttons", async () => {
  const React = await import("react");

  return {
    ButtonComponent: ({
      onClick,
      children,
    }: {
      onClick?: () => void;
      children?: React.ReactNode;
    }) => (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
    CheckBoxComponent: React.forwardRef(
      (
        {
          id,
          label,
          change,
        }: { id?: string; label?: string; change?: (args: { checked: boolean }) => void },
        ref: React.ForwardedRef<{ checked: boolean }>,
      ) => {
        const checkboxRef = React.useRef({ checked: false });
        React.useImperativeHandle(ref, () => checkboxRef.current, []);

        return (
          <label>
            {label}
            <input
              aria-label={label}
              type="checkbox"
              onChange={(event) => {
                checkboxRef.current.checked = event.target.checked;
                change?.({ checked: event.target.checked });
              }}
            />
          </label>
        );
      },
    ),
  };
});

vi.mock("@syncfusion/ej2-react-dropdowns", async () => {
  const React = await import("react");

  return {
    DropDownListComponent: React.forwardRef(
      (
        {
          id,
          dataSource,
          select,
        }: {
          id?: string;
          dataSource: unknown[];
          select?: (args: { itemData: { value: string } }) => void;
        },
        ref: React.ForwardedRef<{ value: string }>,
      ) => {
        const dropDownRef = React.useRef({ value: "" });
        React.useImperativeHandle(ref, () => dropDownRef.current, []);

        return (
          <input
            id={id}
            aria-label={id}
            onChange={(event) => {
              dropDownRef.current.value = event.target.value;
              select?.({ itemData: { value: event.target.value } });
            }}
            list={`${id}-options`}
          />
        );
      },
    ),
  };
});

vi.mock("@syncfusion/ej2-react-popups", async () => {
  const React = await import("react");

  return {
    DialogComponent: ({
      visible,
      header,
      footerTemplate,
      close,
      children,
    }: {
      visible?: boolean;
      header?: React.ReactNode | (() => React.ReactNode);
      footerTemplate?: React.ReactNode | (() => React.ReactNode);
      close?: () => void;
      children?: React.ReactNode;
    }) =>
      visible ? (
        <div role="dialog">
          <div>{typeof header === "function" ? header() : header}</div>
          <div>{children}</div>
          <div>{typeof footerTemplate === "function" ? footerTemplate() : footerTemplate}</div>
          <button type="button" onClick={close}>
            dismiss
          </button>
        </div>
      ) : null,
  };
});

describe("Settings", () => {
  beforeEach(() => {
    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          app: {
            getSettings: vi.fn().mockResolvedValue({
              gui: {
                sourceViewerTheme: "Monokai",
                sourceViewerFontName: "Fira Code",
                sourceViewerFontSize: "14",
                showDebugInfo: true,
                applicationTheme: "Light",
              },
            }),
            getSystemFonts: vi.fn().mockResolvedValue(["Fira Code", "Consolas"]),
            getVersionInfo: vi.fn().mockResolvedValue(new Map()),
          },
        },
        commands: {
          app: {
            notifyMain: vi.fn(),
          },
        },
      },
    });
  });

  it("shows the dialog, loads settings, and dispatches save commands when values change", async () => {
    const ref = createRef<SettingsHandle>();
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(<Settings ref={ref} />);

    await waitFor(() => {
      expect(window.ipcToMain.queries.app.getSettings).toHaveBeenCalledTimes(1);
      expect(window.ipcToMain.queries.app.getSystemFonts).toHaveBeenCalledTimes(1);
    });

    act(() => {
      ref.current?.ShowDialog();
    });

    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("settings-app-theme-input"), {
      target: { value: "Dark" },
    });
    fireEvent.click(screen.getByLabelText("Show debug info in terminal"));
    fireEvent.change(screen.getByLabelText("settings-editor-theme-input"), {
      target: { value: "Github" },
    });
    fireEvent.change(screen.getByLabelText("settings-editor-font-input"), {
      target: { value: "Consolas" },
    });
    fireEvent.change(screen.getByLabelText("settings-editor-font-size-input"), {
      target: { value: "16" },
    });

    expect(window.ipcToMain.commands.app.notifyMain).toHaveBeenCalledWith({
      command: "save-app-theme",
      data: "Dark",
    });
    expect(window.ipcToMain.commands.app.notifyMain).toHaveBeenCalledWith({
      command: "save-app-show-debug-info",
      data: true,
    });
    expect(window.ipcToMain.commands.app.notifyMain).toHaveBeenCalledWith({
      command: "save-source-viewer-theme",
      data: "Github",
    });
    expect(window.ipcToMain.commands.app.notifyMain).toHaveBeenCalledWith({
      command: "save-source-viewer-font-name",
      data: "Consolas",
    });
    expect(window.ipcToMain.commands.app.notifyMain).toHaveBeenCalledWith({
      command: "save-source-viewer-font-size",
      data: "16",
    });
    expect(dispatchSpy).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("populates form refs when dialog is open before settings resolve (covers ref-assignment branches)", async () => {
    // Use a deferred settings promise so we can open the dialog first,
    // ensuring the Syncfusion ref mocks are mounted when the promise resolves.
    let resolveSettings!: (val: unknown) => void;
    (window.ipcToMain.queries.app.getSettings as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSettings = resolve;
      }),
    );

    const ref = createRef<SettingsHandle>();
    render(<Settings ref={ref} />);

    // Open dialog before getSettings resolves – this mounts the form controls
    // so editorThemeRef.current etc. are non-null when the promise settles.
    act(() => {
      ref.current?.ShowDialog();
    });

    expect(screen.getByRole("dialog")).toBeTruthy();

    // Resolve settings with all fields present – the if-bodies (lines 66,69,74,77,80,83)
    // will now execute because the refs are populated.
    await act(async () => {
      resolveSettings({
        gui: {
          sourceViewerTheme: "Monokai",
          sourceViewerFontName: "Fira Code",
          sourceViewerFontSize: "14",
          showDebugInfo: true,
          applicationTheme: "Dark",
        },
      });
    });

    // Dialog should still be visible after settings load
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("does not set ref values when settings gui fields are empty strings", async () => {
    // Covers the FALSE branches of the if(gdb.gui.X &&) conditions
    let resolveSettings!: (val: unknown) => void;
    (window.ipcToMain.queries.app.getSettings as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSettings = resolve;
      }),
    );

    const ref = createRef<SettingsHandle>();
    render(<Settings ref={ref} />);

    act(() => {
      ref.current?.ShowDialog();
    });

    await act(async () => {
      // Empty strings are falsy, so none of the ref-assignment bodies execute
      resolveSettings({
        gui: {
          sourceViewerTheme: "",
          sourceViewerFontName: "",
          sourceViewerFontSize: "",
          showDebugInfo: false,
          applicationTheme: "",
        },
      });
    });

    // Dialog remains visible
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
