import type { getMatchingPathData } from "../router/get-matching-path-data.js";
import { getPublicUrl } from "../utils/hashed-public-url.js";
import { utils } from "../utils/hwy-utils.js";

function ClientScripts({
  entryStrategy = "defer",
  pageStrategy = "defer",
  activePathData,
}: {
  entryStrategy?: "defer" | "async";
  pageStrategy?: "defer" | "async";
  activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
}) {
  return (
    <>
      <script src={utils.getClientEntryUrl()} {...{ [entryStrategy]: true }} />

      {activePathData.matchingPaths
        ?.filter((x) => {
          return x.hasSiblingClientFile;
        })
        .map((x) => {
          return (
            <script
              src={getPublicUrl(
                "dist/pages/" + x.importPath.replace("pages/", ""),
              )}
              {...{ [pageStrategy]: true }}
            />
          );
        })}
    </>
  );
}

export { ClientScripts };
