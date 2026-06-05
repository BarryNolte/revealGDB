/**
 * Implements SectionsView for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { forwardRef, JSX, useImperativeHandle } from "react";
import { SectionsViewView } from "./SectionsViewView";
import { useSectionsViewController } from "./useSectionsViewController";

export type SectionsViewHandle = {
  ShowDialog: () => void;
};

export const SectionsView = forwardRef<SectionsViewHandle>((_props, ref): JSX.Element => {
  const { visible, symbolFiles, options, showDialog, hideDialog, onOptionsChange } =
    useSectionsViewController();

  useImperativeHandle(ref, () => ({
    ShowDialog: showDialog,
  }));

  return (
    <SectionsViewView
      visible={visible}
      symbolFiles={symbolFiles}
      hideDialog={hideDialog}
      options={options}
      onOptionsChange={onOptionsChange}
    />
  );
});

SectionsView.displayName = "Section View";
