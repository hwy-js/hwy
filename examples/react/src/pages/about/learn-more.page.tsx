export default function () {
  return (
    <>
      <p>
        This is a nested route! It is coming from{" "}
        <code>src/pages/about/learn-more.page.tsx</code>.
      </p>

      <a href="/about" data-boost="true">
        Back to index route
      </a>
    </>
  );
}
