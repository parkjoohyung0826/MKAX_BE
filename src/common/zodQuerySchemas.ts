import { z } from "zod";

export const csvStringArrayQuerySchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    const values = Array.isArray(value) ? value : value ? [value] : [];

    return values.flatMap((item) =>
      String(item)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    );
  });

export const booleanLikeQuerySchema = z
  .union([z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((value) => value === true || value === "true");
