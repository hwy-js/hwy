export default function () {
  return (
    <>
      <p>
        This is the home page. This is the entire site's "index route", and it
        is being rendered from <code>src/pages/_index.page.tsx</code>.
      </p>

      <p>
        The nav bar above is being rendered from <code>src/main.tsx</code>,
        which is your site's main server "entry point".
      </p>

      <p>
        Click the button below to increment the number (my click handler is in{" "}
        <code>src/pages/_index.client.ts</code>):
      </p>

      <button id="increment-button" className="btn">
        0
      </button>
    </>
  );
}
