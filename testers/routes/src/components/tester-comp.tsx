import type { PageProps } from "hwy";

async function TesterComp({ Outlet, params, splatSegments }: PageProps) {
  let pathname = new URL(import.meta.url).pathname;
  pathname = pathname.split("/dist/pages")[1];
  const is_splat = pathname.endsWith("$.js");

  return (
    <div class="outlet-wrapper">
      <div class="tester-comp-wrapper">
        <p>Pathname: {pathname}</p>

        {is_splat && <p>SPLAT! {JSON.stringify(splatSegments)}</p>}

        {!is_splat && Object.keys(params).length ? (
          <p>Params: {JSON.stringify(params)}</p>
        ) : null}

        {/* <ErrorComp /> */}

        <Outlet />
      </div>
    </div>
  );
}

export { TesterComp };

function ErrorComp() {
  throw new Error("BOB");
  return <></>;
}
