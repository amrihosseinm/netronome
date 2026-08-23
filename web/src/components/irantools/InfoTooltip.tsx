/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import * as Tooltip from "@radix-ui/react-tooltip";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

export function InfoTooltip({ text }: { text: string }) {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center text-gray-400 hover:text-gray-500 mx-1 focus:outline-none"
          >
            <InformationCircleIcon className="w-4 h-4" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-[10000] max-w-xs px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg"
            sideOffset={5}
            dir={isRtl ? "rtl" : "ltr"}
          >
            {text}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
