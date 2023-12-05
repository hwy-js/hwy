import { get_hwy_global } from "../utils/get-hwy-global.js";
import { utils } from "../utils/hwy-utils.js";

const hwy_global = get_hwy_global();

function CriticalCss() {
  const critical_css = utils.getCriticalCss();

  if (!critical_css) {
    return <></>;
  }

  return (
    <style
      id={utils.getCriticalCssElementId()}
      dangerouslySetInnerHTML={{
        __html: critical_css,
      }}
    ></style>
  );
}

function NonCriticalCss() {
  const standard_bundled_css_exists = hwy_global.get(
    "standard_bundled_css_exists",
  );

  if (!standard_bundled_css_exists) {
    return <></>;
  }

  return <link rel="stylesheet" href={utils.getBundledCssUrl()} />;
}

function CssImports() {
  return (
    <>
      <CriticalCss />
      <NonCriticalCss />
    </>
  );
}

export { CssImports };
