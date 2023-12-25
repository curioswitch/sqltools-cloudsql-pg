/**
 * Copied from https://github.com/mtxr/vscode-sqltools/blob/dev/packages/util/query/index.ts
 * with non-parse removed.
 */

import multipleQueriesParse from "./parse";

/**
 * Parse multiple queries to an array of queries
 *
 * @export
 * @param {string} query
 * @param {('pg' | 'mysql' | 'mssql')} [driver='mysql']
 * @param {string} [delimiter=';']
 * @returns {string[]}
 */
export function parse(
  query: string,
  driver: "pg" | "mysql" | "mssql" | "cql" = "mysql",
): string[] {
  return multipleQueriesParse(query, driver);
  // return fixedQuery.split(/\s*;\s*(?=([^']*'[^']*')*[^']*$)/g).filter((v) => !!v && !!`${v}`.trim()).map(v => `${v};`);
}
