// The store's accounts API: every /api/* request. The routes are in netlify/lib/accounts.mjs.
import { handle } from "../lib/accounts.mjs";

export default (req, context) => handle(req, context);

export const config = { path: "/api/*" };
