import type { CategoryFilter, Place } from "../types";

const filters: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lived", label: "Lived" },
  { value: "worked", label: "Worked" },
  { value: "stayed", label: "Stayed" },
  { value: "visited", label: "Visited" },
  { value: "still-mapping", label: "Still Mapping" },
];

type FilterBarProps = {
  activeFilter: CategoryFilter;
  places: Place[];
  onChange: (filter: CategoryFilter) => void;
};

export function FilterBar({ activeFilter, places, onChange }: FilterBarProps) {
  const getCount = (filter: CategoryFilter) => {
    if (filter === "all") return places.length;
    return places.filter((place) => place.category === filter).length;
  };

  return (
    <nav className="filter-bar" aria-label="Filter places by category">
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          className={activeFilter === filter.value ? "filter active" : "filter"}
          onClick={() => onChange(filter.value)}
        >
          <span>{filter.label}</span>
          <small>{getCount(filter.value)}</small>
        </button>
      ))}
    </nav>
  );
}
