import type { ReactElement } from "react";
import { memo, startTransition, useEffect, useMemo, useState } from "react";
import {
  AdHocData,
  RootLayoutComponent,
  RootLayoutProps,
  getHwyClientGlobal,
  type ActivePathData,
} from "../../../common/index.mjs";

type ErrorBoundaryComp = () => ReactElement;
type ServerKey = keyof ActivePathData;
type BaseProps = {
  activePathData?: ActivePathData | { fetchResponse: Response };
  index?: number;
  fallbackErrorBoundary?: ErrorBoundaryComp;
  adHocData?: AdHocData;
  layout?: RootLayoutComponent;
};

export const RootOutlet = memo((props: BaseProps): ReactElement => {
  const { activePathData } = props;
  if (activePathData && "fetchResponse" in activePathData) {
    return <></>;
  }
  const isServer = typeof document === "undefined";
  const context: {
    get: (sk: ServerKey) => ActivePathData[ServerKey];
  } = isServer
    ? {
        get: (sk: ServerKey) => (props.activePathData as ActivePathData)?.[sk],
      }
    : (getHwyClientGlobal() as any);
  const idx = props.index ?? 0;
  const CurrentComponent = (context.get("activeComponents") as any)?.[idx];
  const adHocData = isServer
    ? props.adHocData
    : getHwyClientGlobal().get("adHocData");
  const [params, setParams] = useState(context.get("params") ?? {});
  const [splatSegments, setSplatSegments] = useState(
    context.get("splatSegments") ?? [],
  );
  const [loaderData, setLoaderData] = useState(
    (context.get("activeData") as any)?.[idx],
  );
  const [actionData, setActionData] = useState(
    (context.get("actionData") as any)?.[idx],
  );
  useEffect(() => {
    window.addEventListener("hwy:route-change", (evt) => {
      startTransition(() => {
        setParams(context.get("params") ?? {});
        setSplatSegments(context.get("splatSegments") ?? []);
        setLoaderData((context.get("activeData") as any)?.[idx]);
        setActionData((context.get("actionData") as any)?.[idx]);
      });
    });
  }, []);

  if (!CurrentComponent) {
    return <></>;
  }

  const thisIsAnErrorBoundary =
    context.get("outermostErrorBoundaryIndex") === idx;
  const nextOutletIsAnErrorBoundary =
    context.get("outermostErrorBoundaryIndex") === idx + 1;
  const shouldRenderEB =
    thisIsAnErrorBoundary || context.get("outermostErrorBoundaryIndex") === -1;

  try {
    if (shouldRenderEB) {
      const EB = useMemo(
        () =>
          (context.get("activeErrorBoundaries") as any)?.[idx] ??
          props.fallbackErrorBoundary ?? (
            <div>Error: No error boundary found.</div>
          ),
        [idx],
      );

      if (props.layout && idx === 0) {
        return (
          <props.layout
            adHocData={props.adHocData}
            params={params as any}
            splatSegments={splatSegments as any}
          >
            {EB}
          </props.layout>
        );
      }

      return EB;
    }

    const Outlet = useMemo(() => {
      let Outlet;
      if (!nextOutletIsAnErrorBoundary) {
        Outlet = (localProps: Record<string, any> | undefined) => {
          return (
            <RootOutlet
              {...localProps}
              activePathData={isServer ? props.activePathData : undefined}
              index={idx + 1}
            />
          );
        };
      } else {
        Outlet =
          (context.get("activeErrorBoundaries") as any)?.[idx + 1] ??
          props.fallbackErrorBoundary;
        if (!Outlet) {
          Outlet = () => <div>Error: No error boundary found.</div>;
        }
      }
      return Outlet;
    }, [(context.get("activePaths") as any)?.[idx + 1]]);

    const extendedProps = useMemo(() => {
      return {
        ...props,
        params: params as any,
        splatSegments: splatSegments as any,
        loaderData,
        actionData,
        Outlet,
        adHocData,
      };
    }, [
      props,
      params,
      splatSegments,
      loaderData,
      actionData,
      Outlet,
      adHocData,
    ]);

    return (
      <MaybeWithLayout {...extendedProps}>
        <CurrentComponent {...extendedProps} />
      </MaybeWithLayout>
    );
  } catch (error) {
    console.error(error);
    return (
      <MaybeWithLayout
        {...props}
        adHocData={props.adHocData}
        params={params as any}
        splatSegments={splatSegments as any}
        children={useMemo(() => {
          return (
            (context.get("activeErrorBoundaries") as any)
              ?.splice(0, idx + 1)
              ?.reverse()
              ?.find((x: any) => x) ??
            props.fallbackErrorBoundary ?? (
              <div>Error: No error boundary found.</div>
            )
          );
        }, [idx])}
      />
    );
  }
});

function MaybeWithLayout(
  props: BaseProps & RootLayoutProps & { children: ReactElement },
): ReactElement {
  if (props.layout && !props.index) {
    return (
      <props.layout
        adHocData={props.adHocData}
        params={props.params as any}
        splatSegments={props.splatSegments as any}
      >
        {props.children}
      </props.layout>
    );
  }
  return props.children;
}

export function getAdHocData(): AdHocData | undefined {
  if (typeof document === "undefined") return;
  return getHwyClientGlobal().get("adHocData");
}
