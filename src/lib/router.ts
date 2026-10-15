/** Tiny hash router: #/quiz/l01-abece → ["quiz", "l01-abece"]. Works on any static host. */
import { useEffect, useState } from "react";

const parse = () =>
  decodeURIComponent(location.hash.replace(/^#\/?/, ""))
    .split("/")
    .filter(Boolean);

export function useRoute(): string[] {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function go(path: string) {
  location.hash = "#/" + path.replace(/^\//, "");
}

export const href = (path: string) => "#/" + path.replace(/^\//, "");
