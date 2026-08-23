/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useTranslation } from "react-i18next";
import { DirectionProvider } from "@radix-ui/react-direction";

export function AppDirectionProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const dir = i18n.language === "fa" ? "rtl" : "ltr";

  return (
    <DirectionProvider dir={dir}>
      {children}
    </DirectionProvider>
  );
}
