import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';

type Resolver = {
  name: string;
  ip: string;
};

type BenchmarkResult = {
  resolver: Resolver;
  latency_ms: number;
  success_rate: number;
  status: string;
};

export function DnsTab() {
  const { t, i18n } = useTranslation();
  const [isStarted, setIsStarted] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<BenchmarkResult[]> ({
    queryKey: ['dns-benchmark'],
    queryFn: async () => {
      const url = getApiUrl('/dns/benchmark');
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch benchmark');
      }
      return res.json();
    },
    enabled: isStarted,
    staleTime: 0
  });

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fa' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleRun = () => {
    setIsStarted(true);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <GlobeAltIcon className="w-6 h-6" />
          {t('dns_benchmark.title')}
        </h2>
        <Button onClick={toggleLanguage} variant="outline">
          {t(`common.${i18n.language === 'fa' ? 'en' : 'fa'}`)}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>{t('dns_benchmark.title')}</CardTitle>
          <Button onClick={handleRun} disabled={isFetching || isLoading}>
            {(isFetching || isLoading) ? t('common.loading') : t('common.run_benchmark')}
          </Button>
        </CardHeader>
        <CardContent>
          {isError && <p className="text-red-500">{t('common.error')}</p>}
          
          {!isStarted && !data && (
            <div className="py-12 text-center text-gray-500">
              {t('dns_benchmark.no_data')}
            </div>
          )}

          {data && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left rtl:text-right">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">{t('dns_benchmark.resolver')}</th>
                    <th className="px-6 py-3">{t('dns_benchmark.latency')}</th>
                    <th className="px-6 py-3">{t('dns_benchmark.success_rate')}</th>
                    <th className="px-6 py-3">{t('dns_benchmark.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className="border-b dark:border-gray-700 bg-white dark:bg-gray-900">
                      <td className="px-6 py-4 font-medium">
                        {row.resolver.name} <span className="text-gray-400 block text-xs">{row.resolver.ip}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${
                          row.latency_ms < 50 ? 'text-green-500' : row.latency_ms < 150 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {row.latency_ms.toFixed(2)} ms
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {row.success_rate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4">
                        {row.status === 'Recommended' && <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{t('dns_benchmark.recommended')}</span>}
                        {row.status === 'Good' && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">{t('dns_benchmark.good')}</span>}
                        {row.status === 'Slow' && <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">{t('dns_benchmark.slow')}</span>}
                        {row.status === 'Timeout' && <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">{t('dns_benchmark.timeout')}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}