'use client';

// TabsMMD: tab row over a 2px divider, thick indicator under the active tab
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex border-b-2 border-ink" role="tablist">
      {tabs.map((tab) => {
        const selected = tab.value === active;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={`flex-1 h-12 text-lg relative ${
              selected ? 'font-bold' : ''
            } active:bg-ink active:text-paper`}
          >
            {tab.label}
            {selected && <span className="absolute bottom-0 inset-x-3 h-1 bg-ink" />}
          </button>
        );
      })}
    </div>
  );
}
