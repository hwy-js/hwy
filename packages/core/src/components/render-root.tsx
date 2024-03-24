import { H3Event } from "h3";
import { ReactElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { AdHocData, HeadBlock, RouteData } from "../../../common/index.mjs";
import { getIsJSONRequest, getRouteData } from "../utils/get-route-data.js";

export async function renderRoot({
  event,
  defaultHeadBlocks,
  root: Root,
  adHocData,
}: {
  event: H3Event;
  defaultHeadBlocks: HeadBlock[];
  root: (props: RouteData) => ReactElement;
  adHocData?: AdHocData;
}) {
  const maybeRootData = await getRouteData({
    event,
    defaultHeadBlocks,
    adHocData,
  });
  if (!maybeRootData) {
    return;
  }
  if (!isRouteDataType(maybeRootData, event)) {
    return maybeRootData;
  }
  return renderToPipeableStream(<Root {...maybeRootData} />);
}

function isRouteDataType(x: any, event: H3Event): x is RouteData {
  return !(x instanceof Response) && !getIsJSONRequest(event);
}
