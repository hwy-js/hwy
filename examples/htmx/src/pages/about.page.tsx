import { PageProps } from "hwy";

export default function ({ Outlet }: PageProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <p>
        This is the about page. This is coming from{" "}
        <code>src/pages/about.page.tsx</code> This is functioning as a "layout
        route" because it is rendering an <code>{`<Outlet />`}</code> (see
        below).
      </p>

      <div style={{ textTransform: "uppercase", fontWeight: "bold" }}>
        Outlet:
      </div>

      <div className="outlet-wrapper">
        <Outlet />
      </div>
    </div>
  );
}
