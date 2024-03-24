import { startTransition, useEffect } from "react";
import { useHtmlDialog } from "use-html-dialog";
import { useMediaQuery } from "usehooks-ts";
import { RootLayoutProps } from "../../../packages/common/index.mjs";
import { CloseIcon, HamburgerIcon } from "../components/icons.js";
import { ClientOnly } from "../components/utilities.js";

type SidebarNavItem = {
  name: string;
  url: string;
};

const sidebarNavItems: SidebarNavItem[] = [
  {
    name: "Getting Started",
    url: "/getting-started",
  },
  {
    name: "Using Bun",
    url: "/guides/node-to-bun",
  },
  {
    name: "Goals",
    url: "/goals",
  },
  {
    name: "From Scratch",
    url: "/guides/from-scratch",
  },
];

export function RootLayout({
  children,
  splatSegments,
  adHocData,
}: RootLayoutProps) {
  const {
    showModal,
    props: htmlDialogProps,
    close,
    isOpen: open,
  } = useHtmlDialog({});
  const isMobile = useMediaQuery("(max-width: 800px)");
  const buttonLabel = `${open ? "Close" : "Open"} menu`;

  useEffect(() => startTransition(close), [splatSegments]);

  return (
    <>
      <nav>
        <div className="logo-wrapper">
          <a href="/" id="logo" data-boost>
            <h1>Hwy</h1>
          </a>

          <button
            aria-roledescription={buttonLabel}
            title={buttonLabel}
            onClick={open ? close : showModal}
            className="mobile-only menu-icon"
          >
            {open ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>

        <ClientOnly>
          {isMobile ? (
            <dialog {...htmlDialogProps}>
              <Sidebar />
            </dialog>
          ) : (
            <Sidebar />
          )}
        </ClientOnly>
      </nav>

      <main>{children}</main>
    </>
  );
}

function Sidebar() {
  return (
    <ul id="sidebar">
      {sidebarNavItems.map((item) => (
        <li key={item.url}>
          <a href={item.url} data-boost>
            {item.name}
          </a>
        </li>
      ))}
    </ul>
  );
}
