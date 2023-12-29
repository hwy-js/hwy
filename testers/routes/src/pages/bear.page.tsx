import type { HeadFunction } from "hwy";
import { TesterComp } from "~/src/components/tester-comp.js";

export const head: HeadFunction = () => {
  return [
    {
      title: "bear",
    },
    {
      tag: "meta",
      attributes: {
        name: "description",
        content: "bear",
      },
    },
  ];
};

export default TesterComp;
