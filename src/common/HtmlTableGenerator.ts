import { GdbAny } from "./gdb-common";

export interface TableData<Row extends Record<string, GdbAny>> {
  header: string[];
  content: Row[];
  title?: string;
}

export interface TableOptions {
  titleHeaderBgColor: string;
  titleTextColor: string;
  headerBgColor: string;
  headerTextColor: string;
  tdPadding: string;
  tdFontWeight: string;
  tdColor: string;
  tableWidth: string;
  showTableHeader?: boolean;
}

export interface ConditionalStyle<Row> {
  targetColumn: string;
  dependsOnColumn: string;
  rule: (value: GdbAny, row: Row) => boolean;
  style: string;
}

export class HTMLTableGenerator<Row extends Record<string, GdbAny> & Record<string, GdbAny>> {
  private data: TableData<Row>;
  private options: TableOptions;
  private conditionalStyles: ConditionalStyle<Row>[];

  constructor(
    data: TableData<Row>,
    options: TableOptions,
    conditionalStyles: ConditionalStyle<Row>[] = [],
  ) {
    if (!data || !options) {
      throw new Error("Data and options are required");
    }

    this.validateInput(data, options);

    this.data = data;
    this.options = options;
    this.conditionalStyles = conditionalStyles;
  }

  private validateInput(data: TableData<Row>, options: TableOptions): void {
    if (typeof data !== "object" || !Array.isArray(data.header) || !Array.isArray(data.content)) {
      throw new Error('Data must be an object with "header" and "content" arrays');
    }

    if (typeof options !== "object") {
      throw new Error("Options must be an object");
    }
  }

  createTableHTML(): string {
    const {
      titleHeaderBgColor,
      titleTextColor,
      headerBgColor,
      headerTextColor,
      tdPadding,
      tdFontWeight,
      tdColor,
      tableWidth,
      showTableHeader,
    } = this.options;

    const { header, content, title } = this.data;
    let theader = "";
    if (showTableHeader) {
      theader = /*html*/ `
        <tr style="background-color: ${headerBgColor}; text-align: left;">
          ${header
            .map(
              (text) =>
                /*html*/ `<th style="border: 2px solid ${headerBgColor}; padding: ${tdPadding}; color: ${headerTextColor}; text-align: left;">${text}</th>`,
            )
            .join("")}
        </tr>`;
    }

    const tableTitle = /*html*/ `
        <tr>
          <th style="font-weight: bold; text-align: center; background-color: ${titleHeaderBgColor}; color: ${titleTextColor}; padding: 3px; border: 2px solid ${titleHeaderBgColor};" colspan="${header.length}">${title ?? ""}</th>
        </tr>`;

    const tableRows = content
      .map((row) => {
        const conditionalStylesForRow: Record<string, string> = {};

        for (const { targetColumn, dependsOnColumn, rule, style } of this.conditionalStyles) {
          if (rule(row[dependsOnColumn], row)) {
            conditionalStylesForRow[targetColumn] = style;
          }
        }

        return /*html*/ `
          <tr style="background-color: #fff; text-align: left;">
            ${header
              .map((col) => {
                const cellValue = row[col];
                const extraStyle = conditionalStylesForRow[col] ?? "";
                return /*html*/ `<td style="border: 2px solid ${headerBgColor}; padding: ${tdPadding}; font-weight: ${tdFontWeight}; color: ${tdColor}; ${extraStyle};">${cellValue}</td>`;
              })
              .join("")}
          </tr>`;
      })
      .join("");

    return (
      /*html*/ `<table style="margin: 1px; width: ${tableWidth}; background-color: #f5f5f5; border-collapse: collapse; border: 2px solid ${headerBgColor};">` +
      "<thead>" +
      tableTitle +
      theader +
      "</thead>" +
      "<tbody>" +
      tableRows +
      "</tbody>" +
      "</table>"
    );
  }

  sortRows(column: string, order: "asc" | "desc" = "asc"): void {
    if (!this.data.header.includes(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }

    this.data.content.sort((a, b) => {
      if (order === "asc") {
        return a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0;
      } else {
        return a[column] > b[column] ? -1 : a[column] < b[column] ? 1 : 0;
      }
    });
  }

  filterRows(column: string, value: GdbAny): void {
    if (!this.data.header.includes(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }
    this.data.content = this.data.content.filter((row) => row[column] === value);
  }

  addColumn(columnName: string, valueFunction: (row: Row) => GdbAny): void {
    if (typeof columnName !== "string") {
      throw new Error("Column name must be a string");
    }
    if (typeof valueFunction !== "function") {
      throw new Error("Value function must be a function");
    }

    this.data.header.push(columnName);

    for (let i = 0; i < this.data.content.length; i++) {
      const row = this.data.content[i];
      this.data.content[i] = Object.assign({}, row, { [columnName]: valueFunction(row) });
    }
  }
}
