import type { HwyConfig, Paths } from "@hwy-js/build";
import { HWY_PREFIX, type DeploymentTarget } from "../../../common/index.mjs";

type HwyGlobal = Partial<{
  deployment_target: DeploymentTarget;
  route_strategy: NonNullable<HwyConfig["routeStrategy"]>;
  is_dev: boolean;
  critical_bundled_css: string;
  standard_bundled_css_exists: boolean;
  paths: Paths;
  public_map: Record<string, string>;
  public_reverse_map: Record<string, string>;
  test_dirname?: string;
}>;

type HwyGlobalKey = keyof HwyGlobal;

function get_hwy_global() {
  const global_this = globalThis as any;

  function get<K extends HwyGlobalKey>(key: K) {
    return global_this[HWY_PREFIX + key] as HwyGlobal[K];
  }

  function set<K extends HwyGlobalKey, V extends HwyGlobal[K]>(
    key: K,
    value: V,
  ) {
    global_this[HWY_PREFIX + key] = value;
  }

  return { get, set };
}

export { get_hwy_global };
