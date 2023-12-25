import {
  IExtension,
  IExtensionPlugin,
  IDriverExtensionApi,
} from "@sqltools/types";
import { ExtensionContext, extensions, authentication } from "vscode";
import { DRIVER_ALIASES } from "./constants";
const { publisher, name } = require("../package.json");
const driverName = "Google Cloud SQL (PostgreSQL)";
const AUTHENTICATION_PROVIDER = "sqltools-driver-credentials";
export async function activate(
  extContext: ExtensionContext,
): Promise<IDriverExtensionApi> {
  const sqltools = extensions.getExtension<IExtension>("mtxr.sqltools");
  if (!sqltools) {
    throw new Error("SQLTools not installed");
  }
  await sqltools.activate();

  const api = sqltools.exports;

  const extensionId = `${publisher}.${name}`;
  const plugin: IExtensionPlugin = {
    extensionId,
    name: `${driverName} Plugin`,
    type: "driver",
    async register(extension) {
      // register ext part here
      // postgres
      extension.resourcesMap().set(`driver/${DRIVER_ALIASES[0].value}/icons`, {
        active: extContext.asAbsolutePath("icons/pg/active.png"),
        default: extContext.asAbsolutePath("icons/pg/default.png"),
        inactive: extContext.asAbsolutePath("icons/pg/inactive.png"),
      });
      DRIVER_ALIASES.forEach(({ value }) => {
        extension
          .resourcesMap()
          .set(`driver/${value}/extension-id`, extensionId);
        extension
          .resourcesMap()
          .set(
            `driver/${value}/connection-schema`,
            extContext.asAbsolutePath("connection.schema.json"),
          );
        extension
          .resourcesMap()
          .set(
            `driver/${value}/ui-schema`,
            extContext.asAbsolutePath("ui.schema.json"),
          );
      });
      await extension.client.sendRequest("ls/RegisterPlugin", {
        path: extContext.asAbsolutePath("out/ls/plugin.js"),
      });
    },
  };
  api.registerPlugin(plugin);
  return {
    driverName,
    parseBeforeSaveConnection: ({ connInfo }) => {
      const propsToRemove = ["id", "usePassword"];
      if (connInfo.usePassword) {
        if (connInfo.usePassword.toString().toLowerCase().includes("ask")) {
          connInfo.askForPassword = true;
          propsToRemove.push("password");
        } else if (
          connInfo.usePassword.toString().toLowerCase().includes("iam")
        ) {
          connInfo.iamAuthentication = true;
          propsToRemove.push("password");
          propsToRemove.push("askForPassword");
        } else if (
          connInfo.usePassword.toString().toLowerCase().includes("empty")
        ) {
          connInfo.password = "";
          propsToRemove.push("askForPassword");
        } else if (
          connInfo.usePassword.toString().toLowerCase().includes("save")
        ) {
          propsToRemove.push("askForPassword");
        } else if (
          connInfo.usePassword.toString().toLowerCase().includes("secure")
        ) {
          propsToRemove.push("password");
          propsToRemove.push("askForPassword");
        }
      }
      propsToRemove.forEach((p) => delete connInfo[p]);

      connInfo.pgOptions = connInfo.pgOptions || {};
      if (Object.keys(connInfo.pgOptions).length === 0) {
        delete connInfo.pgOptions;
      }

      return connInfo;
    },
    parseBeforeEditConnection: ({ connInfo }) => {
      const formData: typeof connInfo = {
        ...connInfo,
      };

      if (connInfo.askForPassword) {
        formData.usePassword = "Ask on connect";
        delete formData.password;
      } else if (typeof connInfo.password === "string") {
        delete formData.askForPassword;
        formData.usePassword = connInfo.password
          ? "Save as plaintext in settings"
          : "Use empty password";
      } else if (connInfo.iamAuthentication) {
        formData.usePassword = "IAM authentication";
        delete formData.iamAuthentication;
      } else {
        formData.usePassword = "SQLTools Driver Credentials";
      }

      formData.pgOptions = formData.pgOptions || {};

      return formData;
    },
    resolveConnection: async ({ connInfo }) => {
      /**
       * This hook is called after a connection definition has been fetched
       * from settings and is about to be used to connect.
       */
      if (
        connInfo.password === undefined &&
        !connInfo.askForPassword &&
        !connInfo.iamAuthentication
      ) {
        const scopes = [connInfo.name, connInfo.username || ""];
        let session = await authentication.getSession(
          AUTHENTICATION_PROVIDER,
          scopes,
          { silent: true },
        );
        if (!session) {
          session = await authentication.getSession(
            AUTHENTICATION_PROVIDER,
            scopes,
            { createIfNone: true },
          );
        }
        if (session) {
          connInfo.password = session.accessToken;
        }
      }
      return connInfo;
    },
    driverAliases: DRIVER_ALIASES,
  };
}

export function deactivate() {}
