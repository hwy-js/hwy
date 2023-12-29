import { useCallback } from "preact/hooks";
import {
  get_hwy_client_global,
  type ActivePathData,
} from "../../common/index.mjs";

type ErrorBoundaryComp<JSXElement> = () => JSXElement;

type ServerKey = keyof ActivePathData;

type JSXElement = any;

function getAdHocDataSignal(): any {
  const IS_SERVER = typeof document === "undefined";
  if (IS_SERVER) return;
  return get_hwy_client_global().get_signal("adHocData");
}

function RootOutlet(props: {
  activePathData?: ActivePathData | { fetchResponse: Response };
  index?: number;
  fallbackErrorBoundary?: ErrorBoundaryComp<JSXElement>;
  adHocData?: any;
}): JSXElement {
  const { activePathData } = props;
  if (activePathData && "fetchResponse" in activePathData) {
    return <></>;
  }

  const IS_SERVER = typeof document === "undefined";

  const context: {
    get: (str: ServerKey) => ActivePathData[ServerKey];
  } = IS_SERVER
    ? {
        get: (str: ServerKey) =>
          (props.activePathData as ActivePathData)?.[str],
      }
    : (get_hwy_client_global() as any);

  let { index } = props;
  const index_to_use = index ?? 0;
  const CurrentComponent = (context.get("activeComponents") as any)?.[
    index_to_use
  ];

  const adHocData = IS_SERVER
    ? props.adHocData
    : get_hwy_client_global().get("adHocData");

  try {
    if (!CurrentComponent) {
      return <></>;
    }

    const this_is_an_error_boundary =
      context.get("outermostErrorBoundaryIndex") === index_to_use;

    const next_outlet_is_an_error_boundary =
      context.get("outermostErrorBoundaryIndex") === index_to_use + 1;

    if (
      this_is_an_error_boundary ||
      context.get("outermostErrorBoundaryIndex") === -1
    ) {
      const ErrorBoundary: ErrorBoundaryComp<JSXElement> | undefined =
        (context.get("activeErrorBoundaries") as any)?.[index_to_use] ??
        props.fallbackErrorBoundary;

      if (!ErrorBoundary) {
        return <div>Error: No error boundary found.</div>;
      }

      return <ErrorBoundary />;
    }

    let Outlet;

    if (!next_outlet_is_an_error_boundary) {
      Outlet = (local_props: Record<string, any> | undefined) => {
        return (
          <RootOutlet
            {...local_props}
            activePathData={IS_SERVER ? props.activePathData : undefined}
            index={index_to_use + 1}
          />
        );
      };
    } else {
      Outlet =
        (context.get("activeErrorBoundaries") as any)?.[index_to_use + 1] ??
        props.fallbackErrorBoundary;

      if (!Outlet) {
        Outlet = () => <div>Error: No error boundary found.</div>;
      }
    }

    const OutletToUse = IS_SERVER
      ? Outlet
      : useCallback(Outlet, [
          (context.get("activePaths") as any)?.[index_to_use + 1],
        ]);

    return (
      <CurrentComponent
        {...props}
        params={context.get("params") ?? {}}
        splatSegments={context.get("splatSegments") ?? []}
        loaderData={(context.get("activeData") as any)?.[index_to_use]}
        actionData={(context.get("actionData") as any)?.[index_to_use]}
        Outlet={OutletToUse}
        adHocData={adHocData}
      />
    );
  } catch (error) {
    console.error(error);

    const ErrorBoundary: ErrorBoundaryComp<JSXElement> | undefined =
      (context.get("activeErrorBoundaries") as any)
        ?.splice(0, index_to_use + 1)
        ?.reverse()
        ?.find((x: any) => x) ?? props.fallbackErrorBoundary;

    if (!ErrorBoundary) {
      return <div>Error: No error boundary found.</div>;
    }

    return <ErrorBoundary />;
  }
}

export { RootOutlet, getAdHocDataSignal };
