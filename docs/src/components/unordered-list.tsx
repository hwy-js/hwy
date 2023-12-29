import { cx } from "../utils/utils.js";

function UnorderedList({
  children,
  ...rest
}: {
  children: any;
  style?: Record<string, any>;
}) {
  return (
    // @ts-ignore
    <ul {...rest} class={cx("flex-col-wrapper-bigger", rest.class)}>
      {children}
    </ul>
  );
}

function ListItem({
  children,
  ...rest
}: {
  children: any;
  style?: Record<string, any>;
}) {
  return (
    // @ts-ignore
    <li {...rest} class={cx("list-item", rest.class)}>
      {children}
    </li>
  );
}

export { ListItem, UnorderedList };
