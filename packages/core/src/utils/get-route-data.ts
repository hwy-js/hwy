import { getQuery, H3Event } from "h3";
import {
  AdHocData,
  getHwyGlobal,
  HeadBlock,
  HWY_PREFIX,
  sortHeadBlocks,
} from "../../../common/index.mjs";
import { getHeadElementProps } from "../components/head-elements-comp.js";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import { utils } from "./hwy-utils.js";

export function getIsJSONRequest(event: H3Event) {
  return Boolean(getQuery(event)[`${HWY_PREFIX}json`]);
}

async function getRouteData({
  event,
  defaultHeadBlocks,
  adHocData,
}: {
  event: H3Event;
  defaultHeadBlocks: HeadBlock[];
  adHocData: AdHocData | undefined;
}) {
  const activePathData = await getMatchingPathData(event);

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return null;
  }

  const hwyGlobal = getHwyGlobal();

  const isUsingClientSideReact = Boolean(
    hwyGlobal.get("hwyConfig").useClientSideReact,
  );

  const headBlocks = utils.getExportedHeadBlocks({
    event,
    activePathData,
    defaultHeadBlocks,
  });

  const { title, metaHeadBlocks, restHeadBlocks } = sortHeadBlocks(headBlocks);

  const buildID = hwyGlobal.get("buildID");

  if (isUsingClientSideReact && getIsJSONRequest(event)) {
    if (event.web?.request?.signal.aborted || event.handled) {
      return;
    }
    return {
      title,
      metaHeadBlocks,
      restHeadBlocks,
      activeData: activePathData.activeData,
      activePaths: activePathData.matchingPaths
        ?.filter((x) => {
          return !x.isServerFile;
        })
        .map((x) => {
          return utils.getPublicUrl("dist/" + x.importPath);
        }),
      outermostErrorBoundaryIndex: activePathData.outermostErrorBoundaryIndex,
      splatSegments: activePathData.splatSegments,
      params: activePathData.params,
      actionData: activePathData.actionData,
      adHocData,
      buildID,
    };
  }

  const baseProps = {
    event,
    activePathData,
    title,
    metaHeadBlocks,
    restHeadBlocks,
    defaultHeadBlocks,
    adHocData,
    buildID,
  };

  return {
    ...baseProps,
    ...getHeadElementProps(baseProps),
  };
}

export { getRouteData };
