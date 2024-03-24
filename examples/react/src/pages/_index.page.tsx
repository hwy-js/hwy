import { useState } from "react";

export default Clicker;

export function Clicker() {
  const [count, setCount] = useState(0);

  return (
    <button
      style={{ padding: "1rem", background: "indigo" }}
      onClick={() => setCount((count) => count + 1)}
    >
      {count}
    </button>
  );
}
