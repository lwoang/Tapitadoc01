import React, { createContext, useContext } from "react";
import { createApp } from "@shopify/app-bridge";

const AppBridgeContext = createContext(null);

export function AppBridgeProvider({ config, children }) {
  const app = React.useMemo(() => createApp(config), [config]);
  return (
    <AppBridgeContext.Provider value={app}>
      {children}
    </AppBridgeContext.Provider>
  );
}

export function useAppBridge() {
  return useContext(AppBridgeContext);
}
