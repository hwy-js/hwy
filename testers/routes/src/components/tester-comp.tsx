import { PageProps } from "hwy";
import { useState } from "react";

function TesterComp({ Outlet, params, splatSegments, ...rest }: PageProps) {
  const [randomColor] = useState(
    "#" + Math.floor(Math.random() * 16777215).toString(16),
  );

  return (
    <div
      className="outlet-wrapper"
      style={{
        background: randomColor,
      }}
    >
      <div className="tester-comp-wrapper">
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
