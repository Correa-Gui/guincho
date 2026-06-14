"use client";

import { createContext, useContext } from "react";

export const ModalCloseContext = createContext<(() => void) | null>(null);

export function useModalClose() {
  return useContext(ModalCloseContext);
}
