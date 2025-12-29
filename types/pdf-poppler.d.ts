declare module "pdf-poppler" {
  interface ConvertOptions {
    format?: "png" | "jpeg" | "tiff" | "ppm";
    out_dir?: string;
    out_prefix?: string;
    page?: number | null;
    scale?: number;
    resolution?: number;
  }

  export function convert(
    file: string,
    opts?: ConvertOptions
  ): Promise<void>;

  export function info(file: string): Promise<{
    pages: number;
    [key: string]: unknown;
  }>;
}
