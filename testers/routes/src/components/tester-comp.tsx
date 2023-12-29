import { PageProps } from "hwy";
import { useState } from "preact/hooks";

function TesterComp({ Outlet, params, splatSegments }: PageProps) {
  let pathname = new URL(import.meta.url).pathname;
  pathname = pathname.split("/dist/pages")[1];

  const [random_color] = useState(
    "#" + Math.floor(Math.random() * 16777215).toString(16),
  );

  return (
    <div
      class="outlet-wrapper"
      style={{
        background: random_color,
      }}
    >
      <div class="tester-comp-wrapper">
        <p>Pathname: {pathname}</p>

        <p>Splat Segments:{JSON.stringify(splatSegments)}</p>

        {Object.keys(params).length ? (
          <p>Params: {JSON.stringify(params)}</p>
        ) : null}

        <Outlet />
      </div>
    </div>
  );
}

export { TesterComp };
