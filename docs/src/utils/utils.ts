function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function make_emoji_data_url(emoji_str: string) {
  const prepend =
    `data:image/svg+xml,` +
    `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 16 16'>` +
    `<text x='0' y='14'>`;

  const append = `</text>` + `</svg>`;

  return prepend + emoji_str + append;
}

export { cx, make_emoji_data_url };
