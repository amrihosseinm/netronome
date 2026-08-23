/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { InformationCircleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

interface GuideSectionProps {
  title: string;
  children: React.ReactNode;
}

export function GuideSection({ title, children }: GuideSectionProps) {
  return (
    <Collapsible className="bg-white shadow sm:rounded-md dark:bg-gray-800">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-4 sm:px-6 text-start focus:outline-none group">
        <div className="flex items-center gap-2">
          <InformationCircleIcon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {title}
          </span>
        </div>
        <ChevronDownIcon className="w-5 h-5 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180 flex-shrink-0" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-5 sm:px-6 text-sm text-gray-700 dark:text-gray-300 space-y-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
