import { Joyride, STATUS } from 'react-joyride';
import type { EventData, Step } from 'react-joyride';

interface PersianTourProps {
  run: boolean;
  setRun: (run: boolean) => void;
  onVisitTab: (tabId: string) => void;
  onComplete: () => void;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function PersianTour({ run, setRun, onVisitTab, onComplete }: PersianTourProps) {
  const steps: Step[] = [
    // ── Welcome (always visible) ──
    {
      target: '.app-header-logo',
      content:
        'به ابزار سنجش شبکه و DNS خوش آمدید! در این برنامه می‌توانید وضعیت اینترنت خود را به طور کامل بررسی کنید.',
      skipBeacon: true,
    },

    // ── Dashboard (active by default) ──
    {
      target: '[data-tour="tab-dashboard"]',
      content:
        'داشبورد: تاریخچه تست‌های سرعت قبلی و نمودارهای عملکرد شبکه را در این بخش مشاهده می‌کنید.',
      skipBeacon: true,
    },
    {
      target: '[data-tour="dashboard-content"]',
      content:
        'اینجا آخرین نتیجه تست سرعت شامل دانلود، آپلود، پینگ و جیتر نمایش داده می‌شود. نمودار روند تغییرات هم در پایین قرار دارد.',
    },

    // ── Speed Test ──
    {
      target: '[data-tour="tab-speedtest"]',
      content:
        'تست سرعت: سرعت دانلود، آپلود و پینگ اینترنت خود را با سرورهای مختلف اندازه‌گیری کنید.',
      skipBeacon: true,
      before: async () => {
        onVisitTab('speedtest');
        await delay(350);
      },
    },
    {
      target: '[data-tour="speedtest-servers"]',
      content:
        'از اینجا سرور مورد نظر را انتخاب و دکمه شروع را بزنید. می‌توانید از Speedtest.net، LibreSpeed یا iperf3 استفاده کنید.',
    },

    // ── Traceroute ──
    {
      target: '[data-tour="tab-traceroute"]',
      content:
        'مسیریابی: مسیر شبکه تا مقصد را بررسی کنید و مشکلات قطعی یا کندی را شناسایی کنید.',
      skipBeacon: true,
      before: async () => {
        onVisitTab('traceroute');
        await delay(350);
      },
    },

    // ── DNS ──
    {
      target: '[data-tour="tab-dns"]',
      content:
        'ابزار DNS: سریع‌ترین و بدون اختلال‌ترین سرور DNS را برای شبکه خود پیدا کنید.',
      skipBeacon: true,
      before: async () => {
        onVisitTab('dns');
        await delay(350);
      },
    },
    {
      target: '.run-benchmark-btn',
      content:
        'با کلیک روی این دکمه، زمان پاسخ‌دهی و قابلیت حل دامنه سرورهای DNS معروف تست می‌شود.',
    },
    {
      target: '.latency-column',
      content:
        'زمان پاسخ‌دهی (پینگ). اعداد سبزرنگ زیر ۵۰ میلی‌ثانیه بهترین سرعت را نشان می‌دهند.',
    },
    {
      target: '.success-rate-column',
      content:
        'درصد موفقیت در پاسخ به دامنه‌ها. سرورهایی که ۱۰۰٪ هستند بهترین سازگاری را با شبکه شما دارند.',
    },
    {
      target: '.recommended-badge',
      content:
        'نشان پیشنهادی ویژه برای بهترین DNS شناسایی‌شده بر اساس سرعت و پایداری.',
    },

    // ── Trippy ──
    {
      target: '[data-tour="tab-trippy"]',
      content:
        'تریپی: مسیریابی مداوم با نمایش زمان‌بندی هر گره. مناسب برای مانیتورینگ طولانی‌مدت کیفیت مسیر شبکه.',
      skipBeacon: true,
      before: async () => {
        onVisitTab('trippy');
        await delay(350);
      },
    },

    // ── Monitor / Agents ──
    {
      target: '[data-tour="tab-monitor"]',
      content:
        'عامل‌ها: سرورها و دستگاه‌های راه‌دور را مانیتور کنید. پهنای باند، CPU، رم و اطلاعات سیستم به صورت لحظه‌ای نمایش داده می‌شود.',
      skipBeacon: true,
      before: async () => {
        onVisitTab('monitor');
        await delay(350);
      },
    },

    // ── Iran Tools ──
    {
      target: '[data-tour="tab-irantools"]',
      content:
        'ابزارهای ایران: شامل بررسی دامنه، اسکنر Edge، SNI Spoof و ویرایشگر Vless. ابزارهای کاربردی برای شرایط شبکه ایران.',
      skipBeacon: true,
      before: async () => {
        onVisitTab('irantools');
        await delay(350);
      },
    },
  ];

  const handleJoyrideCallback = (data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      onComplete();
      localStorage.setItem('persian_tour_completed', 'true');
    }
  };

  return (
    <Joyride
      onEvent={handleJoyrideCallback}
      continuous
      run={run}
      steps={steps}
      options={{
        zIndex: 10000,
        primaryColor: '#4f46e5',
        showProgress: true,
        targetWaitTimeout: 2000,
      }}
      styles={{
        tooltipContainer: {
          fontFamily: 'Vazirmatn, Tahoma, Arial, sans-serif',
          textAlign: 'right',
          direction: 'rtl',
        },
        tooltipContent: {
          padding: '20px 10px',
        },
      }}
      locale={{
        back: 'قبلی',
        close: 'بستن',
        last: 'پایان',
        next: 'بعدی',
        skip: 'رد شدن',
      }}
    />
  );
}
