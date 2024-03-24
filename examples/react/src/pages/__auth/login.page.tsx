import { PageProps } from "hwy";
import { ActionType } from "./login.server.js";

const thisRoute = "/login";

export default function ({ actionData }: PageProps<never, ActionType>) {
  const colStyles = {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  } as const;
  const labelStyles = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    fontSize: "0.9rem",
  } as const;

  return (
    <div style={colStyles}>
      <h1 style={{ fontSize: "1.5rem" }}>Login</h1>

      <p>
        <b>NOTE:</b> This is a fake login form. It does not log you into
        anything or send your input data anywhere. Further, it is not
        implemented in a secure way. If you use it as a base, make sure to do
        all the right things, such as password hashing, secure session
        management, etc. This is only intended to show how "route actions" work.
      </p>

      <p>
        This is coming from <code>src/pages/__auth/login.page.tsx</code>. The{" "}
        "__auth" part is a folder that is ignored because it is preceded by two
        underscores (i.e., "__"). This can help you to add arbitrary
        organization to your pages if you'd like.
      </p>

      {!actionData?.success && (
        <form action={thisRoute} method="POST" style={colStyles} data-boost>
          <label style={labelStyles}>
            Email
            <input
              name="email"
              type="email"
              id="email"
              placeholder="you@example.com"
            />
          </label>

          <label style={labelStyles}>
            Password
            <input
              id="password"
              name="password"
              type="password"
              placeholder="P@$5W0&D"
            />
          </label>

          <button className="btn" type="submit">
            Login
          </button>
        </form>
      )}

      {actionData?.message && (
        <div
          style={
            actionData.error
              ? { color: "lightcoral" }
              : {
                  color: "lightgreen",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                }
          }
        >
          {actionData.message}
        </div>
      )}
    </div>
  );
}
