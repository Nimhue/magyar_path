/** Netlify Function entry: everything under /api/* is handled by netlify/shared/api.ts. */
import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { handle, type GetStore } from "../shared/api";

const stores: GetStore = (name) => getStore({ name: `magyar-${name}`, consistency: "strong" }) as never;

export default async (req: Request) => handle(req, stores);

export const config: Config = { path: "/api/*" };
