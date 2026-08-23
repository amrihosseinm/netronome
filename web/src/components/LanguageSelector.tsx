import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/Button';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

export function LanguageSelector() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          aria-label={t('common.changeLanguage', 'Change language')}
        >
          <GlobeAltIcon className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage('en')}>
          <span className={i18n.language === 'en' ? 'font-bold' : ''}>{t('common.english')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('fa')}>
          <span className={i18n.language === 'fa' ? 'font-bold' : ''}>{t('common.persian')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}