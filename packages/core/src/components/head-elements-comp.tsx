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

// Only needed if using client-side React
function getServerRenderingProps(props: RouteData) {
  if (!hwy_global.get("hwy_config").useClientSideReact) {
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

      {getMetaElementsProps(routeData).map((props, i) => (
        <meta {...props} key={i} />
      ))}

      {getRestHeadElementsProps(routeData).map((props, i) => (
        <props.tag {...props.attributes} key={i} />
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
      {hwy_global.get("hwy_config").useClientSideReact && (
        <script {...getServerRenderingProps(routeData)} />
      )}

      {getInjectedScriptsProps().map((props, i) => (
        <script {...props} key={i} />
      ))}

      <script {...getClientEntryModuleProps()} />

      {getPageSiblingsProps(routeData).map((props, i) => (
        <script {...props} key={i} />
      ))}
    </>
  );
}

function DevLiveRefreshScript() {
  return <script {...getDevRefreshScriptProps()} />;
}
