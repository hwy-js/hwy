// import type { Context } from "hono";
// import { setCookie } from "hono/cookie";

// type CookieEventDetail = Record<string, any>;
// type DefaultCookieEvent = Record<string, CookieEventDetail>;
// type CookieEventDetails<T extends DefaultCookieEvent = DefaultCookieEvent> = T;
// type EventName<T extends CookieEventDetails> = keyof T & string;

// function getClientCookies() {
//   const cookieArray = document.cookie.split("; ");
//   const cookies = {} as Record<string, string>;

//   cookieArray.forEach((cookieStr) => {
//     const [name, value] = cookieStr.split("=");
//     cookies[name] = decodeURIComponent(value);
//   });

//   return cookies;
// }

// function deleteClientCookie(name: string) {
//   document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
// }

// function makeCookieEventHelpers<T extends CookieEventDetails>() {
//   function triggerCookieEvent<E extends EventName<T>>({
//     c,
//     name,
//     detail,
//   }: {
//     c: Context;
//     name: E;
//     detail: T[E];
//   }) {
//     setCookie(c, name, JSON.stringify(detail), { path: "/" });
//   }

//   function setupCookieEventListeners(listeners: {
//     [K in keyof T]: (event: Event & { detail: T[K] }) => void;
//   }) {
//     (Object.keys(listeners) as Array<EventName<T>>).forEach((name) => {
//       const callback = listeners[name];
//       document.body.addEventListener(name, callback as EventListener);
//     });

//     function callback() {
//       const cookies = getClientCookies();
//       Object.keys(listeners).forEach((name) => {
//         if (name in cookies) {
//           document.body.dispatchEvent(
//             new CustomEvent(name, {
//               detail: JSON.parse(cookies[name]),
//             }),
//           );

//           deleteClientCookie(name);
//         }
//       });
//     }

//     // __TODO -- de-HTMX this
//     // Maybe just return the callback
//     document.body.addEventListener("htmx:afterSettle", callback);

//     /*
//      * This runs once as an initializer so that it works for non-htmx
//      * requests as well (such as the first page load).
//      */
//     callback();
//   }

//   return {
//     triggerCookieEvent,
//     setupCookieEventListeners,
//   };
// }

// export { makeCookieEventHelpers };
// export type { CookieEventDetails };
