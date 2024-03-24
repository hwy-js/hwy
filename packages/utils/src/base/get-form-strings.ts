import { getRequestHeader, readBody, readFormData, type H3Event } from "h3";

async function getFormStrings<T extends string>({
  event,
  doNotTrim,
}: {
  event: H3Event;
  doNotTrim?: boolean;
}): Promise<Record<T, string> | undefined> {
  if (event.method !== "POST") {
    return;
  }

  const contentType = getRequestHeader(event, "content-type");
  const isFormUrlEncoded = contentType?.startsWith(
    "application/x-www-form-urlencoded",
  );

  if (isFormUrlEncoded) {
    const body = await readBody(event);
    const fd = new URLSearchParams(body);
    const dataObj: Partial<Record<T, string>> = {};

    for (const [key, value] of fd.entries()) {
      dataObj[key as T] = doNotTrim ? value : value.trim();
    }

    return dataObj as Record<T, string>;
  }

  const isMultipartFormData = contentType?.startsWith("multipart/form-data");

  if (isMultipartFormData) {
    const fd = await readFormData(event);
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
