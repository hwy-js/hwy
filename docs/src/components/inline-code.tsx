import { cx } from "../utils/utils.js";

function InlineCode({
  children,
  high_contrast,
  ...rest
}: {
  children: string;
  high_contrast?: boolean;
  style?: Record<string, any>;
}) {
  return (
    <code
      {...rest}
      // @ts-ignore
      class={cx("inline-code", high_contrast && "high-contrast", rest.class)}
    >
      {children}
    </code>
  );
}

export { InlineCode };
