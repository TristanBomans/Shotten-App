/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as mutations_core from "../mutations/core.js";
import type * as mutations_lzv from "../mutations/lzv.js";
import type * as mutations_reset from "../mutations/reset.js";
import type * as queries_core from "../queries/core.js";
import type * as queries_lzv from "../queries/lzv.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "mutations/core": typeof mutations_core;
  "mutations/lzv": typeof mutations_lzv;
  "mutations/reset": typeof mutations_reset;
  "queries/core": typeof queries_core;
  "queries/lzv": typeof queries_lzv;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
