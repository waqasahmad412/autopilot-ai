import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  FlaskConical,
  Zap,
  Check
} from 'lucide-react';
import { AppNotification } from '../types.ts';

interface TopNavProps {
  onToggleSidebar: () => void;
  globalExecutionMode: 'real' | 'test';
  onToggleExecutionMode: (mode: 'real' | 'test') => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigateToView: (view: string, params?: any) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleSidebar,
  globalExecutionMode,
  onToggleExecutionMode,
  notifications,
  onMarkNotificationRead,
  onMarkAllRead,
  onNavigateToView,
  searchQuery,
  onSearchChange
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'approval_needed':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile hamburger & Global search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search agents, automations, customers, logs..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Right controls: Execution Mode Toggle + Notifications + User Avatar */}
      <div className="flex items-center gap-3">
        {/* Safe Execution Mode Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => onToggleExecutionMode('real')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              globalExecutionMode === 'real'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Real live execution mode with side effects"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Real Mode</span>
          </button>
          <button
            onClick={() => onToggleExecutionMode('test')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              globalExecutionMode === 'test'
                ? 'bg-amber-600/90 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Safe test mode: no real external changes"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Test Mode</span>
          </button>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-slate-950" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No notifications right now
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        onMarkNotificationRead(notif.id);
                        if (notif.actionUrl) {
                          if (notif.actionUrl.includes('runs') || notif.actionUrl.includes('automations')) {
                            onNavigateToView('automations');
                          } else if (notif.actionUrl.includes('conversations')) {
                            onNavigateToView('conversations');
                          } else if (notif.actionUrl.includes('leads')) {
                            onNavigateToView('leads');
                          }
                          setShowNotifications(false);
                        }
                      }}
                      className={`p-3 text-left transition-colors cursor-pointer hover:bg-slate-800/50 flex items-start gap-3 ${
                        !notif.read ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <div className="p-1 rounded-md bg-slate-800 border border-slate-700 mt-0.5">
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-medium text-slate-200 truncate">{notif.title}</p>
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">
                            <Clock className="w-2.5 h-2.5 inline mr-1" />
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center text-white text-xs font-bold ring-2 ring-indigo-500/20">
            BW
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-200 leading-none">Bahi W.</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
};
