"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type ConnectionStatus = "online" | "weak" | "offline";

interface ConnectivityContextValue {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
  isDevSimulator: boolean;
}

const ConnectivityContext = createContext<ConnectivityContextValue>({
  status: "online",
  setStatus: () => {},
  isDevSimulator: false,
});

export function useConnectivity() {
  return useContext(ConnectivityContext);
}

export { ConnectivityContext };
export type { ConnectivityContextValue };
