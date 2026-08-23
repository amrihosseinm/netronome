import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Tooltip from '@radix-ui/react-tooltip';
import { InformationCircleIcon, ClipboardDocumentIcon, CheckIcon, ChevronDownIcon, ComputerDesktopIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/utils/clipboard';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const PersianTooltip = ({ text }: { text: string }) => (
  <Tooltip.Provider delayDuration={200}>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button type="button" className="inline-flex items-center text-gray-400 hover:text-gray-500 mx-1 focus:outline-none">
          <InformationCircleIcon className="w-4 h-4" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="z-[10000] px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg"
          sideOffset={5}
          dir="rtl"
        >
          {text}
          <Tooltip.Arrow className="fill-gray-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

interface DnsResolver {
  name: string;
  ip: string;
  secondary_ip?: string;
}

interface BenchmarkResult {
  resolver: DnsResolver;
  latency_ms: number;
  success_rate: number;
  status: string;
}

export function DnsTab() {
  const { t } = useTranslation();

  const { data, refetch, isFetching } = useQuery<BenchmarkResult[]>({
    queryKey: ['dns-benchmark'],
    queryFn: async () => {
      const response = await fetch('/api/dns/benchmark', {
        headers: {
            // Include authorization if needed, assuming the session handles it via cookies or we need to add tokens
        }
      });
      if (!response.ok) {
          throw new Error('Failed to fetch benchmark');
      }
      return response.json();
    },
    enabled: false, // Don't fetch on mount
  });

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return 'text-green-500';
    if (latency < 150) return 'text-yellow-500';
    return 'text-red-500';
  };

  const [settingDns, setSettingDns] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const handleCopyIp = async (ip: string) => {
    const success = await copyToClipboard(ip);
    if (success) {
      setCopiedIp(ip);
      toast.success(t('dnsTab.copiedToClipboard'), {
        description: ip,
      });
      setTimeout(() => setCopiedIp(null), 2000);
    } else {
      toast.error(t('dnsTab.copyFailed'));
    }
  };

  const handleSetDns = async (ip: string, secondaryIp?: string) => {
    setSettingDns(ip);
    try {
      const response = await fetch('/api/dns/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip, secondary_ip: secondaryIp ?? '' }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to set DNS');
      }

      toast.success(t('dnsTab.dnsUpdated'), {
        description: secondaryIp ? `${ip} / ${secondaryIp}` : ip,
      });
    } catch (error) {
      toast.error(t('dnsTab.dnsSetFailed'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSettingDns(null);
    }
  };


  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Recommended':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Good':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Slow':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t('dnsTab.title')}
        </h2>
        <div className="flex gap-4">
            <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed run-benchmark-btn"
            >
            {isFetching ? (
                <>
                <svg className="w-4 h-4 me-2 -ms-1 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('dnsTab.running')}
                </>
            ) : (
                t('dnsTab.runBenchmark')
            )}
            </button>
        </div>
      </div>

      {!data && !isFetching && (
        <div className="p-12 text-center border-2 border-gray-200 border-dashed rounded-lg dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-6">{t('dnsTab.noData')}</p>
          
          {/* Mock data for interactive tour */}
          <div className="text-start bg-white shadow sm:rounded-md dark:bg-gray-800 opacity-50">
            <div className="flex items-center px-4 py-4 sm:px-6">
              <div className="flex-1 min-w-0 sm:flex sm:items-center sm:justify-between">
                <div className="truncate">
                  <div className="flex text-sm items-center">
                    <p className="font-medium text-indigo-600 truncate dark:text-indigo-400">
                      Google (Example)
                    </p>
                    <PersianTooltip text="نام ارائه‌دهنده سرویس DNS (مثلاً گوگل یا کلودفلر)." />
                  </div>
                  <div className="flex mt-2">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 success-rate-column">
                      <span className="truncate">
                        {t('dnsTab.successRate')}: <span className="font-medium">100.0%</span>
                      </span>
                      <PersianTooltip text="درصد موفقیت در یافتن آدرس سایت‌ها. ۱۰۰٪ یعنی بهترین سازگاری." />
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 mt-4 sm:mt-0 sm:ms-5">
                  <div className="flex items-center gap-4 gap-4">
                    <div className="text-sm text-gray-900 dark:text-gray-100 flex items-center latency-column">
                      {t('dnsTab.latency')}: <span className={`font-medium ${getLatencyColor(12)} mx-1`}>12.00 ms</span>
                      <PersianTooltip text="زمان پاسخ‌دهی سرور. هرچه کمتر باشد، سایت‌ها سریع‌تر باز می‌شوند." />
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor('Recommended')} recommended-badge`}>
                        {t('dnsTab.recommended')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="overflow-hidden bg-white shadow sm:rounded-md dark:bg-gray-800">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((result, idx) => (
              <li key={`${result.resolver.ip}-${idx}`}>
                <div className="flex items-center px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex-1 min-w-0 sm:flex sm:items-center sm:justify-between">
                    <div className="truncate">
                      <div className="flex text-sm items-center">
                        <p className="font-medium text-indigo-600 truncate dark:text-indigo-400">
                          {result.resolver.name}
                        </p>
                        <PersianTooltip text="نام ارائه‌دهنده سرویس DNS (مثلاً گوگل یا کلودفلر)." />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center success-rate-column">
                          <span className="truncate">
                            {t('dnsTab.successRate')}: <span className="font-medium">{result.success_rate.toFixed(1)}%</span>
                          </span>
                          <PersianTooltip text="درصد موفقیت در یافتن آدرس سایت‌ها. ۱۰۰٪ یعنی بهترین سازگاری." />
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{t('dnsTab.preferred')}:</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">{result.resolver.ip}</span>
                          <button
                            onClick={() => handleCopyIp(result.resolver.ip)}
                            title={t('dnsTab.copyIp')}
                            className="inline-flex items-center p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                          >
                            {copiedIp === result.resolver.ip ? (
                              <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <ClipboardDocumentIcon className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                            )}
                          </button>
                        </span>
                        {result.resolver.secondary_ip && (
                          <span className="flex items-center gap-1">
                            <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{t('dnsTab.alternate')}:</span>
                            <span className="font-mono text-gray-700 dark:text-gray-300">{result.resolver.secondary_ip}</span>
                            <button
                              onClick={() => handleCopyIp(result.resolver.secondary_ip!)}
                              title={t('dnsTab.copyIp')}
                              className="inline-flex items-center p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                            >
                              {copiedIp === result.resolver.secondary_ip ? (
                                <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <ClipboardDocumentIcon className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                              )}
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-4 sm:mt-0 sm:ms-5 flex flex-col sm:items-end items-start gap-2">
                      <div className="flex items-center gap-4 gap-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100 flex items-center latency-column">
                          {t('dnsTab.latency')}: <span className={`font-medium ${getLatencyColor(result.latency_ms)} mx-1`}>{result.latency_ms.toFixed(2)} ms</span>
                          <PersianTooltip text="زمان پاسخ‌دهی سرور. هرچه کمتر باشد، سایت‌ها سریع‌تر باز می‌شوند." />
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(result.status)} ${result.status === 'Recommended' ? 'recommended-badge' : ''}`}>
                            {result.status === 'Recommended' ? t('dnsTab.recommended') : result.status}
                        </span>
                      </div>
                      <button
                        onClick={() => handleSetDns(result.resolver.ip, result.resolver.secondary_ip)}
                        disabled={settingDns === result.resolver.ip}
                        className="mt-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-50 transition-colors"
                      >
                        {settingDns === result.resolver.ip ? t('dnsTab.settingDns') : t('dnsTab.setAsActiveDns')}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* DNS Setup Guide */}
      <Collapsible className="bg-white shadow sm:rounded-md dark:bg-gray-800">
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-4 sm:px-6 text-start focus:outline-none group">
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="w-5 h-5 text-indigo-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('dnsTab.guide.title')}
            </span>
          </div>
          <ChevronDownIcon className="w-5 h-5 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-5 sm:px-6">
            <Tabs defaultValue="windows">
              <TabsList>
                <TabsTrigger value="windows">
                  <ComputerDesktopIcon className="w-4 h-4 me-1.5" />
                  {t('dnsTab.guide.windows')}
                </TabsTrigger>
                <TabsTrigger value="android">
                  <DevicePhoneMobileIcon className="w-4 h-4 me-1.5" />
                  Android
                </TabsTrigger>
                <TabsTrigger value="ios">
                  <DevicePhoneMobileIcon className="w-4 h-4 me-1.5" />
                  iOS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="windows">
                <ol className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside">
                  {(t('dnsTab.guide.windowsSteps', { returnObjects: true }) as string[]).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </TabsContent>

              <TabsContent value="android">
                <ol className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside">
                  {(t('dnsTab.guide.androidSteps', { returnObjects: true }) as string[]).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </TabsContent>

              <TabsContent value="ios">
                <ol className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside">
                  {(t('dnsTab.guide.iosSteps', { returnObjects: true }) as string[]).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}