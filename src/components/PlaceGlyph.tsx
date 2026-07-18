import { getPlaceAccent, getPlaceIconType } from "../placePresentation";
import type { Place } from "../types";

type PlaceGlyphProps = {
  place: Place;
  className?: string;
};

const paths = {
  home: <><path d="M5 13 12 7l7 6v7H7v-7z" /><path d="M10 20v-5h4v5" /></>,
  city: <><path d="M6 20V8h5v12M13 20V5h6v15" /><path d="M8 11h1.5M8 15h1.5M15 9h2M15 13h2M15 17h2" /></>,
  academic: <><path d="M4 11h16L12 6z" /><path d="M6 13v7M10 13v7M14 13v7M18 13v7M5 20h14" /></>,
  temple: <><path d="M5 10h14l-7-5z" /><path d="M7 12v8M12 12v8M17 12v8M5 20h14" /></>,
  palace: <><path d="M4 10h16l-2-3H6z" /><path d="M6 13v7M12 13v7M18 13v7M5 20h14" /></>,
  pagoda: <><path d="M5 8h14l-7-4zM7 14h10l-5-3z" /><path d="M9 15v5M15 15v5M7 20h10" /></>,
  tower: <><path d="M12 4c2.5 4 3.5 9 3.5 16h-7C8.5 13 9.5 8 12 4z" /><path d="M8.5 11h7M8 16h8M12 3v3" /></>,
  bridge: <><path d="M4 18h16M5.5 17c3-6 10-6 13 0M7 9v11M17 9v11M6 12h12" /></>,
  mountain: <><path d="M3 20 10 6l4 7 2-4 5 11z" /><path d="m10 6 2 8 2-2" /></>,
  fitzRoy: <><path d="M3 20 8.5 6l3 7 3-10L21 20z" /><path d="m14.5 3 .5 11 2-3M8.5 6l2 8 1.5-2" /></>,
  machuPicchu: <><path d="M4 19h16M6 16h4M9 13h5M13 10h5M6 16v3M12 13v6M17 10v9" /></>,
  iceberg: <><path d="M3 19 10 5l4 8 2-4 5 10z" /><path d="M5 20c4 2 10 2 14 0M10 5l1 9 3-1" /></>,
  snow: <><path d="M12 3v18M5 7l14 10M19 7 5 17M5 12h14" /><circle cx="12" cy="12" r="2" /></>,
  forest: <><path d="M9 17h6L12 5zM5 20h6L8 11z" /><path d="M12 17v4M8 20v2" /></>,
  cypress: <><path d="M8 19c-2-5 1-12 5-15 4 5 5 10 2 15z" /><path d="M13 6c-.8 5-1.2 10-.7 16M6 20h12" /></>,
  coast: <><path d="M5 18c4-5 9-7 15-6v6z" /><path d="M4 9c4 2 7 2 11 0M5 13c3 1.5 6 1.5 9 0" /></>,
  tropical: <><path d="M12 21c2-6 2-11 0-17" /><path d="M12 7c-5-2-8 0-10 4 4 .5 7-.5 10-4zM13 7c5-2 8 0 10 4-4 .5-7-.5-10-4z" /></>,
  palm: <><path d="M12 21c2-6 2-11 0-17" /><path d="M12 7c-5-2-8 0-10 4 4 .5 7-.5 10-4zM13 7c5-2 8 0 10 4-4 .5-7-.5-10-4z" /></>,
  splitGate: <><path d="M5 20V9l5-3v14M19 20V9l-5-3v14" /><path d="M5 9h5M14 9h5M11 20h2" /></>,
  desert: <><path d="M10 20V7a2.5 2.5 0 0 1 5 0v13" /><path d="M10 13H7.5A2.5 2.5 0 0 1 5 10.5M15 14h2.5A2.5 2.5 0 0 0 20 11.5" /></>,
  cactus: <><path d="M10 20V7a2.5 2.5 0 0 1 5 0v13" /><path d="M10 13H7.5A2.5 2.5 0 0 1 5 10.5M15 14h2.5A2.5 2.5 0 0 0 20 11.5" /></>,
  waterfall: <><path d="M5 6h14l-3 14H8z" /><path d="M9 9v8M12 9v9M15 9v8" /></>,
  eiffel: <><path d="M12 4 6 20M12 4l6 16M8 13h8M7 17h10M10 9h4" /></>,
  bigBen: <><path d="M9 20V8h6v12" /><path d="M8 8h8M12 4v4M10 12h4M12 10v3" /></>,
  cnTower: <><path d="M12 4v17M8 13h8M9 16h6M10 7h4" /><circle cx="12" cy="12" r="3" /></>,
  spaceNeedle: <><path d="M12 4v16M6 10h12M8 8h8M9 20h6M9 14l6 6M15 14l-6 6" /></>,
  neon: <><path d="M5 8h14v8H5z" /><path d="M8 12h8M9 16v4M15 16v4" /></>,
  landmark: <><path d="M7 20h10l-2-9H9z" /><path d="M12 5v15M9 5h6M8 11h8" /></>,
  chengdu: <><path d="M4 20h16M6.5 20v-6.5h11V20M8 13.5l4-3.5 4 3.5M6 11.5l6-4.5 6 4.5M4 10l2-3M20 10l-2-3" /></>,
  beijing: <><path d="M4 20h16M6 20v-6.5h12V20M5 13.5h14M6.5 11.5h11M5.5 10h13M8 8.5h8M10 7h4" /></>,
  shanghai: <><path d="M4 20h16M6 20v-5h2v5M9 20v-8h3v8M13.5 20V8h2v12M17 20v-4h2v4M14.5 8V5M13 11h4M13 14h5" /></>,
  seoul: <><path d="M3 20h18M5 18.5l4-4 2 2 2.5-6 5.5 8M11.5 10.5V5M10 7h3M9.5 9h4" /></>,
  tokyo: <><path d="M5 20h14M12 20V7M10 20l2-13 2 13M8.5 15h7M9.5 12h5M12 7V4" /></>,
  bali: <><path d="M3.5 20h17M6 20v-6h12v6M5 14h14M7 12h10M8.5 10h7M10 8h4M19.5 19c-1.5-4-1.5-8 0-11" /></>,
  antarctica: <><path d="M3 20h18M5 18l4-8 3 5 2-8 5 11M7 20c3 1 9 1 12 0M16 16c1-2 2-2.5 3-1" /></>,
  lima: <><path d="M4 20h16M6 20v-7h12v7M4.5 13h15M6.5 11h11M8 9h8M10 7h4M8 15v4M11 15v4M14 15v4" /></>,
  newYork: <><path d="M4 20h16M6 20v-6h2v6M9 20V9h3v11M13 20V6h2v14M16 20v-5h2v5M14 6V4M12.5 12h3" /></>,
  bayArea: <><path d="M3 20h18M4.5 19.5c2.5-6 5-6 7.5 0M12 19.5c2.5-6 5-6 7.5 0M5.5 16h13M6.5 14v6M17.5 14v6" /></>,
  vancouver: <><path d="M3 20h18M5 20v-5h4v5M10.5 20v-7h3.5v7M15.5 20v-4h3v4M7 15V5M5.5 7h3M5 9h4M17 16v-7M15.5 11h3" /></>,
  iceland: <><path d="M3 20h18M4.5 18.5l4-7 2.5 4 3-8 6 11M6 20c3 1 8 1 12 0M8.5 11.5l1 4M14 7.5l.5 8" /></>,
  default: <><path d="M12 4c4 0 7 3 7 7 0 5-7 10-7 10S5 16 5 11c0-4 3-7 7-7z" /><circle cx="12" cy="11" r="2" /></>,
};

export function PlaceGlyph({ place, className = "" }: PlaceGlyphProps) {
  const iconType = getPlaceIconType(place);
  const accent = getPlaceAccent(place);

  return (
    <svg
      className={`place-glyph ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ "--place-accent": accent.primary, "--place-accent-pale": accent.pale } as Record<string, string>}
    >
      <g fill="var(--place-accent-pale)" stroke="var(--place-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[iconType] ?? paths.default}
      </g>
    </svg>
  );
}
