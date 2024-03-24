/// <reference lib="dom" />

const el = document.getElementById("increment-button");

console.log("Hello from _index.client.ts!");

if (el) {
  let count = 0;

  el.addEventListener("click", () => {
    count++;
    el.innerHTML = count.toString();
  });
}
