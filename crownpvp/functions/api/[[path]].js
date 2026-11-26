import { handle } from "../../server/core.js";

export const onRequest = ({ request, env, waitUntil }) => handle(request, env, { waitUntil });
