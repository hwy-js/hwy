import type { Context } from "hono";

async function getFormStrings<T extends string>({
  c,
  doNotTrim,
}: {
  c: Context;
  doNotTrim?: boolean;
}): Promise<Record<T, string> | undefined> {
  if (c.req.method !== "POST") {
    return;
  }

  const isFormUrlEncoded = c.req.raw.headers
    .get("content-type")
    ?.startsWith("application/x-www-form-urlencoded");

  if (isFormUrlEncoded) {
    const body = await c.req.raw.text();
    const fd = new URLSearchParams(body);
    const dataObj: Partial<Record<T, string>> = {};

    for (const [key, value] of fd.entries()) {
      dataObj[key as T] = doNotTrim ? value : value.trim();
    }

    return dataObj as Record<T, string>;
  }

  const isMultipartFormData = c.req.raw.headers
    .get("content-type")
    ?.startsWith("multipart/form-data");

  if (isMultipartFormData) {
    const fd = await c.req.raw.formData();
    const dataObj: Partial<Record<T, string>> = {};

    for (const [key, value] of fd.entries()) {
      if (typeof value === "string") {
        dataObj[key as T] = doNotTrim ? value : value.trim();
      }
    }

    return dataObj as Record<T, string>;
  }
}

export { getFormStrings };
