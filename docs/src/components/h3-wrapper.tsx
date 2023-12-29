function H3Wrapper({ heading, children }: { heading: string; children: any }) {
  return (
    <div>
      <h3 class="h3">{heading}</h3>
      {children}
    </div>
  );
}

export { H3Wrapper };
