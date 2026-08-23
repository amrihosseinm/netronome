import * as Tooltip from '@radix-ui/react-tooltip';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

export const PersianTooltip = ({ text }: { text: string }) => (
  <Tooltip.Provider delayDuration={200}>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button type="button" className="inline-flex items-center text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mx-1 focus:outline-none">
          <InformationCircleIcon className="w-[22px] h-[22px]" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="z-[10000] px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg"
          sideOffset={5}
          style={{ fontFamily: 'Vazirmatn, Tahoma, Arial, sans-serif' }}
          dir="rtl"
        >
          {text}
          <Tooltip.Arrow className="fill-gray-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);