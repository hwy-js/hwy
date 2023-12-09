function Nav() {
  return (
    <nav>
      <a class="logo" href="/">
        <h1>Hwy</h1>
      </a>

      <div style={{ display: "flex" }}>
        <a href="/jeff" class="nav-item" title="Hwy Documentation">
          Jeff
        </a>

        <a href="/docs" class="nav-item" title="Hwy Documentation">
          Docs
        </a>

        <a
          href="https://github.com/hwy-js/hwy"
          target="_blank"
          title="Star on GitHub"
          class="nav-item"
        >
          ⭐ GitHub
        </a>

        <a
          href="https://github.com/hwy-js/hwy"
          title="Star on GitHub"
          class="nav-item"
        >
          ⭐ GitHub Not New Tab
        </a>
      </div>
    </nav>
  );
}

export { Nav };
