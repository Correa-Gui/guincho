"use client";

const fieldClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export type FilterSelect = {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
};

export type FilterSearch = {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
};

export function TableFilters({
  selects,
  search,
  hidden,
}: {
  selects?: FilterSelect[];
  search?: FilterSearch;
  hidden: Record<string, string>;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2 px-4 pb-4 sm:px-6">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {selects?.map((select) => (
        <label key={select.name} className="flex flex-col gap-1 text-xs text-muted-foreground">
          {select.label}
          <select
            name={select.name}
            defaultValue={select.value}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className={fieldClass}
          >
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {search ? (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {search.label}
          <input
            type="search"
            name={search.name}
            defaultValue={search.value}
            placeholder={search.placeholder}
            className={`${fieldClass} w-40`}
          />
        </label>
      ) : null}
      {search ? (
        <button type="submit" className="sr-only">
          Filtrar
        </button>
      ) : null}
    </form>
  );
}
