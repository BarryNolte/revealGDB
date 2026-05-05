/**
 * Shared connection types used across main and renderer processes.
 *
 * @remarks
 * Pure data type — safe to import from any layer.
 */

export type NormalizedConnection = {
  name: string;
  shell: string;
  commands: string[];
  wslDistribution?: string;
};
