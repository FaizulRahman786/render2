import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Phone, Mail, ArrowUp, Plus, X, Headphones } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FabAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string;
  target?: string;
  colorClass?: string;
  badge?: string;
}

export interface FloatingActionButtonProps {
  actions?: FabAction[];
  whatsappNumber?: string;
  whatsappMessage?: string;
  phone?: string;
  contactHref?: string;
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  actions: customActions,
  whatsappNumber,
  whatsappMessage,
  phone,
  contactHref = '/contact',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Monitor window scroll to show/hide scroll-to-top helper
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Assemble dynamic actions array
  const defaultActions: FabAction[] = [];

  // 1. WhatsApp Action
  const cleanWaNumber = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, '') : '';
  if (cleanWaNumber) {
    const waUrl = `https://wa.me/${cleanWaNumber}${whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ''}`;
    defaultActions.push({
      id: 'whatsapp',
      label: 'Chat on WhatsApp',
      icon: MessageCircle,
      href: waUrl,
      target: '_blank',
      colorClass: 'bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-lg shadow-green-500/20',
    });
  }

  // 2. Call Action
  const cleanPhone = phone ? phone.trim() : '';
  if (cleanPhone) {
    defaultActions.push({
      id: 'call',
      label: `Call ${cleanPhone}`,
      icon: Phone,
      href: `tel:${cleanPhone.replace(/[^0-9+]/g, '')}`,
      colorClass: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20',
    });
  }

  // 3. Contact / Enquiry Action
  defaultActions.push({
    id: 'enquiry',
    label: 'Send Enquiry',
    icon: Mail,
    href: contactHref,
    colorClass: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20',
  });

  // 4. Scroll to Top Action
  defaultActions.push({
    id: 'scroll-top',
    label: 'Scroll to Top',
    icon: ArrowUp,
    onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    colorClass: 'bg-slate-800 text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 shadow-lg shadow-slate-900/20',
  });

  const finalActions = customActions || defaultActions;

  return (
    <div
      ref={containerRef}
      className={cn('fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 print:hidden', className)}
    >
      {/* Expanded Speed Dial Action Menu */}
      <div
        className={cn(
          'flex flex-col items-end gap-3 transition-all duration-300 ease-out origin-bottom-right',
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        )}
        role="menu"
        aria-orientation="vertical"
        aria-hidden={!isOpen}
      >
        {finalActions.map((action, idx) => {
          const Icon = action.icon;
          const content = (
            <div className="flex items-center gap-3 group cursor-pointer">
              {/* Action Tooltip Label */}
              <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md backdrop-blur-sm whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity">
                {action.label}
              </span>
              {/* Action Circular Button */}
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110 active:scale-95',
                  action.colorClass || 'bg-primary text-primary-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );

          if (action.href) {
            return (
              <a
                key={action.id || idx}
                href={action.href}
                target={action.target}
                rel={action.target === '_blank' ? 'noreferrer' : undefined}
                role="menuitem"
                tabIndex={isOpen ? 0 : -1}
                onClick={() => setIsOpen(false)}
                className="outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
              >
                {content}
              </a>
            );
          }

          return (
            <button
              key={action.id || idx}
              type="button"
              role="menuitem"
              tabIndex={isOpen ? 0 : -1}
              onClick={() => {
                setIsOpen(false);
                action.onClick?.();
              }}
              className="outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full text-left"
            >
              {content}
            </button>
          );
        })}
      </div>

      {/* Primary Trigger FAB Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={isOpen ? 'Close quick actions menu' : 'Open quick actions menu'}
        className={cn(
          'relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 outline-none focus-visible:ring-4 focus-visible:ring-primary/40 active:scale-95',
          isOpen
            ? 'bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rotate-90 scale-105'
            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:scale-110 hover:shadow-2xl hover:shadow-indigo-500/30'
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <Headphones className="w-6 h-6 animate-pulse" />
            {/* Notification pulse badge */}
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900" />
            </span>
          </>
        )}
      </button>
    </div>
  );
};
