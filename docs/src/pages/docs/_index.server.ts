export async function loader() {
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });

  return "Larry";
}
