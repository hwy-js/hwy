export async function loader() {
  const ld = Math.random();
  console.log("random number from loader", ld);
  return ld;
}
