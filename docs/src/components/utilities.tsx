import { useEffect, useState } from "react";

export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => setIsMounted(true), []);
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!isVisible) {
      timeout = setTimeout(() => setIsVisible(true), 1);
    }
    return () => clearTimeout(timeout);
  }, [isVisible]);
  if (!isMounted) {
    return null;
  }
  return <div className={isVisible ? "mounted" : "unmounted"}>{children}</div>;
}
