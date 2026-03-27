declare module "write-excel-file" {
  type CellValue = string | number | boolean | Date | null | undefined;

  interface Cell {
    value?: CellValue;
    type?: NumberConstructor | StringConstructor | BooleanConstructor | DateConstructor;
    fontWeight?: "bold";
    align?: "left" | "center" | "right";
    span?: number;
    rowSpan?: number;
    wrap?: boolean;
    height?: number;
  }

  interface Column {
    width?: number;
  }

  interface WriteOptions {
    fileName?: string;
    sheet?: string;
    columns?: Column[];
    headerStyle?: Record<string, unknown>;
    stickyColumnsCount?: number;
    stickyRowsCount?: number;
  }

  function writeXlsxFile(
    data: Cell[][],
    options?: WriteOptions
  ): Promise<void>;

  export default writeXlsxFile;
}

declare module "read-excel-file" {
  type CellValue = string | number | boolean | Date | null;

  function readXlsxFile(
    input: File | Blob | ArrayBuffer,
    options?: {
      sheet?: number | string;
      dateFormat?: string;
      trim?: boolean;
      transformData?: (data: CellValue[][]) => CellValue[][];
    }
  ): Promise<CellValue[][]>;

  export default readXlsxFile;
}
