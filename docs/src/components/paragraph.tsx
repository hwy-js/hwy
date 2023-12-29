function Paragraph({ children, ...rest }: { children: any }) {
  return (
    // @ts-ignore
    <p {...rest} style={{ lineHeight: 1.75, ...rest.style }}>
      {children}
    </p>
  );
}

export { Paragraph };
