import type { Context } from "hono";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import type { HtmlEscapedString } from "hono/utils/html";
import type { ErrorBoundaryProps } from "../types.js";

type ErrorBoundaryComp = (
  props: ErrorBoundaryProps,
) => Promise<HtmlEscapedString>;

async function RootOutlet(props: {
  activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
  index?: number;
  c: Context;
  fallbackErrorBoundary?: (props: {
    error: Error;
    splatSegments: string[];
    params: Record<string, string>;
    c: Context;
  }) => Promise<HtmlEscapedString> | HtmlEscapedString;
}): Promise<HtmlEscapedString> {
  const { index, activePathData: active_path_data } = props;
  const index_to_use = index ?? 0;

  try {
    const CurrentComponent = active_path_data?.activeComponents?.[index_to_use];

    if (!CurrentComponent) {
      return <></>;
    }

    const current_data = active_path_data?.activeData?.[index_to_use];

    const this_is_an_error_boundary =
      active_path_data?.outermostErrorBoundaryIndex === index_to_use;

    const ErrorBoundary: ErrorBoundaryComp | undefined =
      active_path_data?.activeErrorBoundaries?.[index_to_use] ??
      props.fallbackErrorBoundary;

    if (
      this_is_an_error_boundary ||
      active_path_data?.outermostErrorBoundaryIndex === -1
    ) {
      if (!ErrorBoundary) {
        return <div>Error: No error boundary found.</div>;
      }

      return (
        <ErrorBoundary
          error={active_path_data?.errorToRender}
          splatSegments={active_path_data?.splatSegments}
          params={active_path_data?.params}
          c={props.c}
        />
      );
    }

    return (
      <CurrentComponent
        {...props}
        c={props.c}
        params={active_path_data?.params || {}}
        splatSegments={active_path_data?.splatSegments || []}
        Outlet={async (local_props: Record<string, any> | undefined) => {
          return (
            <RootOutlet
              {...local_props}
              activePathData={active_path_data}
              index={index_to_use + 1}
              c={props.c}
            />
          );
        }}
        loaderData={current_data}
        actionData={active_path_data.actionData}
      />
    );
  } catch (error) {
    console.error(error);

    const ErrorBoundary: ErrorBoundaryComp | undefined =
      active_path_data?.activeErrorBoundaries
        ?.splice(0, index_to_use + 1)
        ?.reverse()
        ?.find((x) => x) ?? props.fallbackErrorBoundary;

    if (!ErrorBoundary) {
      return <div>Error: No error boundary found.</div>;
    }

    return (
      <ErrorBoundary
        error={error}
        splatSegments={active_path_data?.splatSegments || []}
        params={active_path_data?.params || {}}
        c={props.c}
      />
    );
  }
}

export { RootOutlet };
