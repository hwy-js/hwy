import { RouteData, get_hwy_global } from "../../../common/index.mjs";
import { utils } from "../utils/hwy-utils.js";

const hwy_global = get_hwy_global();

function getCriticalInlinedCssProps() {
  return {
    id: utils.getCriticalCssElementId(),
    dangerouslySetInnerHTML: {
      __html: utils.getCriticalCss(),
    },
  };
}

function getMetaElementsProps(baseProps: RouteData) {
  const arr = [
    { attributes: { "data-hwy": "meta-start" } },
    ...baseProps.metaHeadBlocks,
    { attributes: { "data-hwy": "meta-end" } },
  ];
  return arr.map((block) => {
    return block.attributes;
  });
}

// Only needed if using client-side Preact
function getServerRenderingProps(props: RouteData) {
  if (!hwy_global.get("hwy_config").useClientSidePreact) {
    return;
  }

  return {
    type: "module",
    dangerouslySetInnerHTML: {
      __html: utils.getSsrInnerHtml(props),
    },
  };
}

function getInjectedScriptsProps() {
  return (hwy_global.get("injected_scripts") ?? []).map((script) => {
    return {
      src: utils.getPublicUrl(script),
      defer: true,
    };
  });
}

function getClientEntryModuleProps() {
  return {
    type: "module",
    src: utils.getClientEntryUrl(),
  };
}

function getRestHeadElementsProps(baseProps: RouteData) {
  return [
    { tag: "meta", attributes: { "data-hwy": "rest-start" } },
    ...baseProps.restHeadBlocks,
    { tag: "meta", attributes: { "data-hwy": "rest-end" } },
  ];
}

function getBundledStylesheetProps() {
  return {
    rel: "stylesheet",
    href: utils.getBundledCssUrl(),
  };
}

function getDevRefreshScriptProps(timeoutInMs?: number) {
  const dev_refresh_script = utils.getRefreshScript(timeoutInMs);
  return {
    type: "module",
    dangerouslySetInnerHTML: {
      __html: dev_refresh_script,
    },
  };
}

function getPageSiblingsProps(baseProps: RouteData) {
  return utils.getSiblingClientHeadBlocks(baseProps).map((block) => {
    return block.attributes;
  });
}

function getHeadElementProps(baseProps: RouteData) {
  return {
    criticalInlinedCssProps: getCriticalInlinedCssProps(),
    metaElementsProps: getMetaElementsProps(baseProps),
    serverRenderingProps: getServerRenderingProps(baseProps),
    injectedScriptsProps: getInjectedScriptsProps(),
    clientEntryModuleProps: getClientEntryModuleProps(),
    restHeadElementsProps: getRestHeadElementsProps(baseProps),
    pageSiblingsProps: getPageSiblingsProps(baseProps),
    bundledStylesheetProps: getBundledStylesheetProps(),
    devRefreshScriptProps: getDevRefreshScriptProps(),
  } as const;
}

export {
  ClientScripts,
  CssImports,
  DevLiveRefreshScript,
  HeadElements,
  getHeadElementProps,
};

/////////////////////////////////////////////////////////////////////
///////////////////// EXISTING HEAD ELEMENTS ///////////////////////
/////////////////////////////////////////////////////////////////////

function HeadElements(routeData: RouteData) {
  return (
    <>
      <title>{routeData.title}</title>

      {getMetaElementsProps(routeData).map((props) => (
        <meta {...props} />
      ))}

      {getRestHeadElementsProps(routeData).map((props) => (
        /* @ts-ignore */
        <props.tag {...props.attributes} />
      ))}
    </>
  );
}

function CssImports() {
  return (
    <>
      <style {...getCriticalInlinedCssProps()} />
      <link {...getBundledStylesheetProps()} />
    </>
  );
}

function ClientScripts(routeData: RouteData) {
  return (
    <>
      <script
        type="importmap"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            imports: {
              "@preact/signals": utils.getPublicUrl("dist/client-signals.js"),
              preact: utils.getPublicUrl("dist/client-signals.js"),
              "preact/hooks": utils.getPublicUrl("dist/client-signals.js"),
              "preact/jsx-runtime": utils.getPublicUrl(
                "dist/client-signals.js",
              ),

              // TO-DO make this conditional on preact/compat flag?
              "preact/compat": utils.getPublicUrl(
                "dist/preact-compat/compat.module.js",
              ),
              "@preact/compat": utils.getPublicUrl(
                "dist/preact-compat/compat.module.js",
              ),
              react: utils.getPublicUrl("dist/preact-compat/compat.module.js"),
              "react-dom": utils.getPublicUrl(
                "dist/preact-compat/compat.module.js",
              ),

              ...(hwy_global.get("is_dev")
                ? {
                    "preact/debug": utils.getPublicUrl(
                      "dist/client-signals.js",
                    ),
                  }
                : {}),
            },
          }),
        }}
      />

      {hwy_global.get("hwy_config").useClientSidePreact && (
        <script {...getServerRenderingProps(routeData)} />
      )}

      {getInjectedScriptsProps().map((props) => (
        <script {...props} />
      ))}

      <script {...getClientEntryModuleProps()} />

      {getPageSiblingsProps(routeData).map((props) => (
        <script {...props} />
      ))}
    </>
  );
}

function DevLiveRefreshScript() {
  return <script {...getDevRefreshScriptProps()} />;
}
