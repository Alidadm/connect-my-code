import { Globe, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import type { LanguageCode } from '@/lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'icon' | 'full';
  className?: string;
}

export const LanguageSwitcher = ({ variant = 'icon', className }: LanguageSwitcherProps) => {
  const { currentLanguage, currentCode, changeLanguage, supportedLanguages } = useLanguage();

  const handleChangeLanguage = async (langCode: LanguageCode) => {
    await changeLanguage(langCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'icon' ? (
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("text-muted-foreground hover:text-foreground hover:bg-secondary h-9 w-9 sm:h-10 sm:w-10", className)}
          >
            <Globe className="h-5 w-5" />
          </Button>
        ) : (
          <Button 
            variant="outline" 
            className={cn("gap-2", className)}
          >
            <img 
              src={`https://flagcdn.com/w20/${currentLanguage.flag}.png`}
              alt={currentLanguage.name}
              className="w-5 h-auto rounded-sm"
            />
            <span>{currentLanguage.nativeName}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChangeLanguage(lang.code)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <img 
              src={`https://flagcdn.com/w20/${lang.flag}.png`}
              alt={lang.name}
              className="w-5 h-auto rounded-sm"
            />
            <div className="flex-1">
              <span className="font-medium">{lang.nativeName}</span>
              <span className="text-muted-foreground ml-2 text-sm">({lang.name})</span>
            </div>
            {currentCode === lang.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
