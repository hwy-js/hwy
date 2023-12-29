import { expect, test } from "vitest";
import { HWY_PREFIX, get_hwy_global } from "../../../common/index.mjs";
import { getMatchingPathData } from "./get-matching-path-data.js";

const hwy_global = get_hwy_global();

const test_paths = await import(
  "../../../../testers/routes/dist/paths.js" as any
).then((m) => m[HWY_PREFIX + "paths"]);

hwy_global.set("paths", test_paths);
hwy_global.set("test_dirname", "testers/routes/dist");
hwy_global.set("hwy_config", { useDotServerFiles: false } as any);

type ExpectedOutput = {
  params: Record<string, string>;
  splatSegments: Array<string>;
  matchingPaths: Array<{
    pathType: NonNullable<
      Awaited<ReturnType<typeof getMatchingPathData>>["matchingPaths"]
    >[number]["pathType"];
    filePath: string;
  }>;
};

function gmpd_tester({
  path,
  expected_output,
}: {
  path: string;
  expected_output: ExpectedOutput;
}) {
  test(`getMatchingPathData: ${path}`, async () => {
    const raw = await getMatchingPathData({
      c: {
        req: {
          method: "GET",
          path,
          raw: {
            headers: new Map(),
          },
          query: () => ({}),
        },
      } as any,
    });

    const simplified = {
      params: raw.params || {},
      splatSegments: raw.splatSegments || [],
      matchingPaths:
        raw.matchingPaths?.map((path) => {
          return {
            pathType: path.pathType,
            filePath: path.importPath.replace(".js", ".tsx"),
          };
        }) || [],
    } satisfies ExpectedOutput;

    expect(simplified).toEqual(expected_output);
  });
}

type IndividualMatch = ExpectedOutput["matchingPaths"][number];

const ultimate_catch = {
  pathType: "ultimate-catch",
  filePath: "pages/$.page.tsx",
} as const satisfies IndividualMatch;

/******************
ULTIMATE CATCH
******************/

// does not exist

gmpd_tester({
  path: "/does-not-exist",
  expected_output: {
    matchingPaths: [ultimate_catch],
    params: {},
    splatSegments: ["does-not-exist"],
  },
});

// ".page." not in file name, otherwise a valid component

gmpd_tester({
  path: "/this-should-be-ignored",
  expected_output: {
    matchingPaths: [ultimate_catch],
    params: {},
    splatSegments: ["this-should-be-ignored"],
  },
});

/******************
ULTIMATE INDEX
******************/

gmpd_tester({
  path: "/",
  expected_output: {
    matchingPaths: [
      {
        pathType: "index",
        filePath: "pages/_index.page.tsx",
      },
    ],
    params: {},
    splatSegments: [],
  },
});

/******************
LIONS
******************/

// "/lion"
// should render "lion.page.tsx" (LAYOUT)
// and "lion/_index.page.tsx" (INDEX)

gmpd_tester({
  path: "/lion",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/lion.page.tsx", // LAYOUT
      },
      {
        pathType: "index",
        filePath: "pages/lion/_index.page.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/lion/123"
// should render "lion.page.tsx" (LAYOUT)
// and "lion/$.page.tsx" (SPLAT)

gmpd_tester({
  path: "/lion/123",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/lion.page.tsx", // LAYOUT
      },
      {
        pathType: "non-ultimate-splat",
        filePath: "pages/lion/$.page.tsx", // SPLAT
      },
    ],
    params: {},
    splatSegments: ["123"],
  },
});

// "/lion/123/456"
// same as above but with two splat segments

gmpd_tester({
  path: "/lion/123/456",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/lion.page.tsx", // LAYOUT
      },
      {
        pathType: "non-ultimate-splat",
        filePath: "pages/lion/$.page.tsx", // SPLAT
      },
    ],
    params: {},
    splatSegments: ["123", "456"],
  },
});

// "/lion/123/456/789"
// same as above but with three splat segments

gmpd_tester({
  path: "/lion/123/456/789",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/lion.page.tsx", // LAYOUT
      },
      {
        pathType: "non-ultimate-splat",
        filePath: "pages/lion/$.page.tsx", // SPLAT
      },
    ],
    params: {},
    splatSegments: ["123", "456", "789"],
  },
});

/******************
AND TIGERS
******************/

// "/tiger"
// should render "tiger.page.tsx" (LAYOUT)
// and "tiger/_index.page.tsx" (INDEX)

gmpd_tester({
  path: "/tiger",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/tiger.page.tsx", // LAYOUT
      },
      {
        pathType: "index",
        filePath: "pages/tiger/_index.page.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/tiger/123"
// should render "tiger.page.tsx" (LAYOUT)
// and "tiger/$tiger_id.page.tsx" ($tiger_id LAYOUT)
// and "tiger/$tiger_id/_index.page.tsx" ($tiger_id INDEX)

gmpd_tester({
  path: "/tiger/123",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/tiger.page.tsx", // LAYOUT
      },
      {
        pathType: "dynamic-layout",
        filePath: "pages/tiger/$tiger_id.page.tsx", // $tiger_id LAYOUT
      },
      {
        pathType: "index",
        filePath: "pages/tiger/$tiger_id/_index.page.tsx", // $tiger_id INDEX
      },
    ],
    params: { tiger_id: "123" },
    splatSegments: [],
  },
});

// "/tiger/123/456"
// should render "tiger.page.tsx" (LAYOUT)
// and "tiger/$tiger_id.page.tsx" ($tiger_id LAYOUT)
// and "tiger/$tiger_id/$tiger_cub_id.page.tsx" ($tiger_cub_id LAYOUT)

gmpd_tester({
  path: "/tiger/123/456",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/tiger.page.tsx", // LAYOUT
      },
      {
        pathType: "dynamic-layout",
        filePath: "pages/tiger/$tiger_id.page.tsx", // $tiger_id LAYOUT
      },
      {
        pathType: "dynamic-layout",
        filePath: "pages/tiger/$tiger_id/$tiger_cub_id.page.tsx", // $tiger_id LAYOUT
      },
    ],
    params: { tiger_id: "123", tiger_cub_id: "456" },
    splatSegments: [],
  },
});

// "/tiger/123/456/789"
// should render "tiger.page.tsx" (LAYOUT)
// and "tiger/$tiger_id.page.tsx" ($tiger_id LAYOUT)
// and "tiger/$tiger_id/$.page.tsx" (CATCH)

gmpd_tester({
  path: "/tiger/123/456/789",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/tiger.page.tsx", // LAYOUT
      },
      {
        pathType: "dynamic-layout",
        filePath: "pages/tiger/$tiger_id.page.tsx", // $tiger_id LAYOUT
      },
      {
        pathType: "non-ultimate-splat",
        filePath: "pages/tiger/$tiger_id/$.page.tsx", // CATCH
      },
    ],
    params: { tiger_id: "123" },
    splatSegments: ["456", "789"],
  },
});

/******************
AND BEARS
******************/

gmpd_tester({
  path: "/bear",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/bear.page.tsx", // LAYOUT
      },

      {
        pathType: "index",
        filePath: "pages/bear/_index.page.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/bear/123"

gmpd_tester({
  path: "/bear/123",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/bear.page.tsx", // LAYOUT ("bear")
      },
      {
        pathType: "dynamic-layout",
        filePath: "pages/bear/$bear_id.page.tsx", // LAYOUT ("$bear_id")
      },
    ],
    params: { bear_id: "123" },
    splatSegments: [],
  },
});

// "/bear/123/456"
// should render bear.page.tsx (bear layout), and bear/$bear_id.page.tsx (123 layout), and bear/$bear_id/$.page.tsx (456 catch)
// params should be { bear_id: "123" } and splatSegments should be ["456"]

gmpd_tester({
  path: "/bear/123/456",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/bear.page.tsx", // LAYOUT ("bear")
      },
      {
        pathType: "dynamic-layout",
        filePath: "pages/bear/$bear_id.page.tsx", // LAYOUT ("$bear_id")
      },
      {
        pathType: "non-ultimate-splat",
        filePath: "pages/bear/$bear_id/$.page.tsx", // CATCH ("456")
      },
    ],
    params: { bear_id: "123" },
    splatSegments: ["456"],
  },
});

// "/bear/123/456/789"
// same as above but with two splat segments

gmpd_tester({
  path: "/bear/123/456/789",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/bear.page.tsx", // LAYOUT ("bear")
      },
      {
        pathType: "dynamic-layout",
        filePath: "pages/bear/$bear_id.page.tsx", // LAYOUT ("$bear_id")
      },
      {
        pathType: "non-ultimate-splat",
        filePath: "pages/bear/$bear_id/$.page.tsx", // CATCH ("456" & "789")
      },
    ],
    params: { bear_id: "123" },
    splatSegments: ["456", "789"],
  },
});

/******************
OH MY!
******************/

/******************
DASHBOARD
******************/

// "/dashboard"
// should render "/dashboard.page.tsx" (LAYOUT)
// and "/dashboard/_index.page.tsx" (INDEX)

gmpd_tester({
  path: "/dashboard",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/dashboard.page.tsx", // LAYOUT
      },
      {
        pathType: "index",
        filePath: "pages/dashboard/_index.page.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/dashboard/asdf"
// should render "/dashboard.page.tsx" (LAYOUT)
// and "/dashboard/$.page.tsx" (CATCH)

gmpd_tester({
  path: "/dashboard/asdf",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/dashboard.page.tsx", // LAYOUT
      },
      {
        pathType: "non-ultimate-splat",
        filePath: "pages/dashboard/$.page.tsx", // CATCH
      },
    ],
    params: {},
    splatSegments: ["asdf"],
  },
});

// "/dashboard/customers"
// should render "/dashboard.page.tsx" (LAYOUT)
// and "/dashboard/customers.page.tsx" (customers LAYOUT)
// and "/dashboard/customers/_index.page.tsx" (customers INDEX)

gmpd_tester({
  path: "/dashboard/customers",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/dashboard.page.tsx", // LAYOUT
      },
      {
        pathType: "static-layout",
        filePath: "pages/dashboard/customers.page.tsx", // customers LAYOUT
      },
      {
        pathType: "index",
        filePath: "pages/dashboard/customers/_index.page.tsx", // customers INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/dashboard/customers/123"
// should render "/dashboard.page.tsx" (LAYOUT)
// and "/dashboard/customers.page.tsx" (customers LAYOUT)
// and "/dashboard/customers/$customer_id.page.tsx" ($customer_id LAYOUT)
// and "/dashboard/customers/$customer_id/_index.page.tsx" ($customer_id INDEX)

gmpd_tester({
  path: "/dashboard/customers/123",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/dashboard.page.tsx", // LAYOUT
      },
      {
        pathType: "static-layout",
        filePath: "pages/dashboard/customers.page.tsx", // customers LAYOUT
      },
      {
        pathType: "dynamic-layout",
        filePath: "pages/dashboard/customers/$customer_id.page.tsx", // $customer_id LAYOUT
      },
      {
        pathType: "index",
        filePath: "pages/dashboard/customers/$customer_id/_index.page.tsx", // $customer_id INDEX
      },
    ],
    params: {
      customer_id: "123",
    },
    splatSegments: [],
  },
});

// "/dashboard/customers/123/orders"
// should render "/dashboard.page.tsx" (LAYOUT)
// and "/dashboard/customers.page.tsx" (customers LAYOUT)
// and "/dashboard/customers/$customer_id.page.tsx" ($customer_id LAYOUT)
// and "/dashboard/customers/$customer_id/orders.page.tsx" (orders LAYOUT)
// and "/dashboard/customers/$customer_id/orders/_index.page.tsx" (orders INDEX)

gmpd_tester({
  path: "/dashboard/customers/123/orders",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/dashboard.page.tsx", // LAYOUT
      },
      {
        pathType: "static-layout",
        filePath: "pages/dashboard/customers.page.tsx", // customers LAYOUT
      },
      {
        pathType: "dynamic-layout",
        filePath: "pages/dashboard/customers/$customer_id.page.tsx", // $customer_id LAYOUT
      },
      {
        pathType: "static-layout",
        filePath: "pages/dashboard/customers/$customer_id/orders.page.tsx", // orders LAYOUT
      },
      {
        pathType: "index",
        filePath:
          "pages/dashboard/customers/$customer_id/orders/_index.page.tsx", // orders INDEX
      },
    ],
    params: {
      customer_id: "123",
    },
    splatSegments: [],
  },
});

// "/dashboard/customers/123/orders/456"
// should render "/dashboard.page.tsx" (LAYOUT)
// and "/dashboard/customers.page.tsx" (customers LAYOUT)
// and "/dashboard/customers/$customer_id.page.tsx" ($customer_id LAYOUT)
// and "/dashboard/customers/$customer_id/orders.page.tsx" (orders LAYOUT)
// and "/dashboard/customers/$customer_id/orders/$order_id.page.tsx" ($order_id LAYOUT)

gmpd_tester({
  path: "/dashboard/customers/123/orders/456",
  expected_output: {
    matchingPaths: [
      {
        pathType: "static-layout",
        filePath: "pages/dashboard.page.tsx", // LAYOUT
      },
      {
        pathType: "static-layout",
        filePath: "pages/dashboard/customers.page.tsx", // customers LAYOUT
      },
      {
        pathType: "dynamic-layout",
        filePath: "pages/dashboard/customers/$customer_id.page.tsx", // $customer_id LAYOUT
      },
      {
        pathType: "static-layout",
        filePath: "pages/dashboard/customers/$customer_id/orders.page.tsx", // orders LAYOUT
      },
      {
        pathType: "dynamic-layout",
        filePath:
          "pages/dashboard/customers/$customer_id/orders/$order_id.page.tsx", // $order_id LAYOUT
      },
    ],
    params: {
      customer_id: "123",
      order_id: "456",
    },
    splatSegments: [],
  },
});

// "/articles"
// should render "/articles/_index.page.tsx" (INDEX)

gmpd_tester({
  path: "/articles",
  expected_output: {
    matchingPaths: [
      {
        pathType: "index",
        filePath: "pages/articles/_index.page.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/articles/bob"
// should render ultimate catch
gmpd_tester({
  path: "/articles/bob",
  expected_output: {
    matchingPaths: [ultimate_catch],
    params: {},
    splatSegments: ["articles", "bob"],
  },
});

// "/articles/test"
// should render ultimate catch (even though "test" directory exists)

gmpd_tester({
  path: "/articles/test",
  expected_output: {
    matchingPaths: [ultimate_catch],
    params: {},
    splatSegments: ["articles", "test"],
  },
});

// "/articles/test/articles"
// should render "/articles/test/articles/_index.page.tsx" (articles-test-articles INDEX)

gmpd_tester({
  path: "/articles/test/articles",
  expected_output: {
    matchingPaths: [
      {
        pathType: "index",
        filePath: "pages/articles/test/articles/_index.page.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});
