export default function () {
  return (
    <>
      <p>
        This is the about page's "index route". Index routes are rendered from a
        layout route's "outlet" if no other child routes are matched. This is
        coming from <code>src/pages/about/_index.page.tsx</code>.
      </p>

      <a href="/about/learn-more">Go to explicit child route</a>
    </>
  );
}
