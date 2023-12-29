import { PageProps } from "hwy";

export default function ({ loaderData }: PageProps) {
  return <div>COMPONENT: {loaderData}</div>;
}

export function Fallback() {
  return <div>Loading......................</div>;
}
