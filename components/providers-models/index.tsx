'use client';

import React, { useState, useEffect } from 'react';
import { LayoutGrid, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { configManager } from '@/lib/config/storage';
import { ModelsPane } from './models-pane';
import { ConnectionsPane } from './connections-pane';
import { TemplatesPane } from './templates-pane';

type ActivePane = 'models' | 'connections' | 'templates';

interface NavItem {
  id: ActivePane;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'models',
    label: 'Models',
    icon: <LayoutGrid className="size-4 shrink-0" />,
  },
  {
    id: 'connections',
    label: 'Connections',
    icon: <FileText className="size-4 shrink-0" />,
  },
  {
    id: 'templates',
    label: 'Templates',
    icon: <Layers className="size-4 shrink-0" />,
  },
];

interface ProvidersModelsViewProps {
  /** Which pane to open on first mount. Defaults to "models". */
  initialTab?: ActivePane;
}

export function ProvidersModelsView({ initialTab = 'models' }: ProvidersModelsViewProps = {}) {
  const [activePane, setActivePane] = useState<ActivePane>(initialTab);

  // Ensure the Default template exists before panes read config.
  useEffect(() => {
    configManager.migrateModels();
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Body: subnav (left sidebar on desktop, top tab bar on mobile) + content */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-0">
        {/* Subnav */}
        <nav className="shrink-0 flex md:flex-col gap-1.5 md:gap-0.5 overflow-x-auto md:overflow-visible border-b md:border-b-0 md:border-r border-border/60 p-3 md:py-6 md:pl-6 md:pr-3 md:w-48">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePane(item.id)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-full text-[13px] font-medium transition-colors select-none whitespace-nowrap shrink-0 md:w-full text-left',
                activePane === item.id
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6">
          {activePane === 'models' && <ModelsPane />}
          {activePane === 'connections' && <ConnectionsPane />}
          {activePane === 'templates' && <TemplatesPane />}
        </div>
      </div>
    </div>
  );
}
