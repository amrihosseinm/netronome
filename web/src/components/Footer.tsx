/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReadme, faDiscord } from "@fortawesome/free-brands-svg-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

export const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="mt-4">
      <div className="flex justify-end gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="https://discord.gg/WQ2eUycxyT"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 transition-colors"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <FontAwesomeIcon icon={faDiscord} className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("footer.discordCommunity", "Discord Community")}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="https://netrono.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 transition-colors"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <FontAwesomeIcon icon={faReadme} className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("footer.documentation", "Documentation")}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </footer>
  );
};
