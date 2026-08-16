import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Convex Auth routes (sign-in, sign-out, callback, etc.)
auth.addHttpRoutes(http);

export default http;
