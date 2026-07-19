import type { HeroDestinationId, IconDirection } from "../atlasIconTaxonomy";

type IconProps = {
  direction?: IconDirection;
  className?: string;
  style?: Record<string, string | number>;
  role?: string;
  "aria-label"?: string;
};

const marks: Record<HeroDestinationId, Record<IconDirection, string>> = {
  chengdu: {
    A: "M9 46h46M15 44V28h34v16M12 28h40M17 24h30M21 20h22M25 16h14M15 28l7-5m27 5-7-5M20 44V32m8 0v12m8-12v12m8-12v12M10 16c4-5 7-5 11 0m22 0c4-5 7-5 11 0",
    B: "M10 46h44M14 44V29h36v15M11 29h42M17 25h30M22 20h20M27 16h10M14 29l8-5m28 5-8-5M22 44V33m10 0v11m10-11v11M8 23c5-6 9-7 14-4m20-1c5-3 9-2 14 4",
    C: "M10 46h44M16 44V30h32v14M13 30h38M18 26h28M23 22h18M27 18h10M16 30l7-5m25 5-7-5M23 44V34m9 0v10m9-10v10M13 16c2-4 6-6 10-5m18 0c4-1 8 1 10 5",
  },
  beijing: {
    A: "M10 46h44M14 43V30h36v13M11 30h42M16 26h32M21 21h22M26 16h12M14 30l8-5m28 5-8-5M21 43V34m11 0v9m11-9v9M18 46v4m28-4v4",
    B: "M8 46h48M12 42V31h40v11M9 31h46M15 27h34M20 22h24M26 17h12M12 31l8-5m32 5-8-5M18 42V34m9 0v8m10-8v8m9-8v8M8 50h48",
    C: "M11 46h42M16 43V32h32v11M13 32h38M18 28h28M22 24h20M27 19h10M16 32l7-5m25 5-7-5M23 43V35m9 0v8m9-8v8M15 50h34",
  },
  shanghai: {
    A: "M8 47h48M19 47V31m7 16V22m10 25V17m9 30V27M16 31h6m9-9h7m-1-5h8m-4-5h6M36 17c0-5 4-8 8-8s8 3 8 8M40 9v38M8 51h48",
    B: "M8 47h48M18 47V30m7 17V24m11 23V12m10 35V28M14 30h8m9-6h8m-2-6h10m-5-6h6M40 12c0-6 4-10 8-10s8 4 8 10M44 2v45M8 51h48",
    C: "M8 47h48M17 47V31m8 16V25m10 22V19m10 28V29M13 31h8m8-6h9m-1-6h10m-5-6h7M38 19c0-5 4-9 9-9s9 4 9 9M42 10v37M8 51h48",
  },
  seoul: {
    A: "M8 46h48M12 43l12-14 7 7 9-18 12 25M28 18V9m-4 4h8m-10 5h12M12 50h44",
    B: "M8 46h48M12 43l10-12 8 7 10-20 12 25M36 18V8m-4 5h8m-10 5h12M12 50h44",
    C: "M8 46h48M11 43l13-15 7 8 8-14 13 21M28 22V11m-4 5h8m-10 5h12M12 50h44",
  },
  tokyo: {
    A: "M10 47h44M32 47V12M26 47l6-35 6 35M23 37h18M25 29h14M27 22h10M30 16h4M32 12V7M16 47c3-5 6-6 9-6m23 0c3 0 6 1 9 6",
    B: "M10 47h44M32 47V10M25 47l7-37 7 37M22 37h20M24 29h16M27 21h10M30 15h4M32 10V5M14 47h8m20 0h8",
    C: "M10 47h44M32 47V14M27 47l5-33 5 33M24 38h16M26 30h12M28 23h8M30 17h4M32 14V8M16 47c3-4 6-5 10-5m12 0c4 0 7 1 10 5",
  },
  canggu: {
    A: "M9 47h46M14 44V29h36v15M11 29h42M16 25h32M21 20h22M26 15h12M14 29l8-5m28 5-8-5M22 44V33m20 0v11M52 44c0-10 0-17-5-23m5 7c4-3 7-2 9 1m-9 4c-4-3-7-2-9 1",
    B: "M9 47h46M16 44V30h32v14M13 30h38M18 26h28M23 21h18M27 16h10M16 30l7-5m25 5-7-5M23 44V34m18 0v10M11 44c0-10 0-17 5-23m-5 7c-4-3-7-2-9 1m9 4c4-3 7-2 9 1",
    C: "M10 47h44M15 44V31h34v13M12 31h40M18 27h28M23 22h18M27 17h10M15 31l8-5m26 5-8-5M22 44V35m20 0v9M53 44c0-8 1-14-3-19m3 7c3-2 6-1 8 2",
  },
  patagonia: {
    A: "M7 46 20 25l7 10L39 12l7 20 5-7 6 21M7 51c12 3 31 3 50 0M39 12l2 21 7-10M20 25l5 18 7-5",
    B: "M7 46 18 29l8 8 12-23 8 16 6-8 5 24M7 51c13 3 31 3 50 0M38 14v25l8-13M18 29l7 17",
    C: "M7 46 19 27l7 9 13-20 6 15 7-8 5 23M7 51c14 3 31 3 50 0M39 16l1 21 8-10M19 27l5 18 8-6",
  },
  antarctica: {
    A: "M7 46 20 27l8 10 12-23 8 22 6-8 3 18M7 51c13 3 31 3 50 0M11 56c12-3 30-3 42 0M40 14l2 21 7-11M20 27l6 18 8-7M44 47c-3-4-2-11 2-14 4-3 8-2 10 2 2 4 1 10-1 12m-9-8h8m-4-6v14",
    B: "M7 46 18 31l10 7 13-26 8 24 6-6 2 16M7 51c14 3 31 3 50 0M11 56c12-3 30-3 42 0M41 12v26l8-12M18 31l8 15M44 47c-3-4-2-10 2-13 4-2 7-1 9 3 2 4 1 9-1 10m-8-8h7m-4-5v13",
    C: "M7 46 21 24l9 14 11-18 8 17 6-7 2 16M7 51c13 3 31 3 50 0M11 56c12-3 30-3 42 0M21 24l6 20 8-9M41 20l2 18 7-10M44 47c-3-4-2-11 2-14 4-3 8-2 10 2 2 4 1 10-1 12m-9-8h8m-4-6v14",
  },
  machuPicchu: {
    A: "M8 48h48v-7H12v7M12 41h40v-7H18M18 34h28v-7H24M24 27h16v-7H28M16 41v7m9-14v14m9-21v21m9-14v14m-11-28v7",
    B: "M8 48h48v-7H12v7M12 41h40v-7H18M18 34h28v-7H24M24 27h16v-7H28M16 41v7m9-14v14m9-21v21m9-14v14m-11-28v7M47 20c4-4 9-4 13 0m-7-5v11",
    C: "M8 48h48v-7H12v7M12 41h40v-7H18M18 34h28v-7H24M24 27h16v-7H28M16 41v7m9-14v14m9-21v21m9-14v14M39 20c5-7 11-7 16 0",
  },
  london: {
    A: "M19 48h26M24 48V17h16v31M22 17h20M26 12h12M29 8h6M32 8V4M27 27h10M32 20v5M28 48V34m8 0v14",
    B: "M20 48h24M25 48V16h14v32M23 16h18M27 12h10M30 8h4M32 8V4M28 27h8M32 21v4M29 48V34m6 0v14",
    C: "M18 48h28M23 48V18h18v30M21 18h22M26 14h12M29 10h6M32 10V5M27 28h10M32 21v5M27 48V35m10 0v13",
  },
  paris: {
    A: "M12 48h40M19 48 32 12l13 36M23 37h18M26 28h12M29 20h6M32 12V7",
    B: "M12 48h40M18 48 32 10l14 38M23 37h18M26 27h12M29 19h6M32 10V5",
    C: "M12 48h40M20 48 32 14l12 34M24 38h16M27 29h10M29 22h6M32 14V8",
  },
  newYork: {
    A: "M10 48h44M15 48V31h6v17m4 0V20h8v28m4 0V12h7v36m4 0V25h5v23M40 12V7M33 30h12",
    B: "M10 48h44M14 48V33h7v15m4 0V23h7v25m4 0V10h8v38m4 0V27h5v21M40 10V5M31 31h15",
    C: "M10 48h44M15 48V30h6v18m4 0V22h7v26m4 0V14h8v34m4 0V28h5v20M40 14V8M33 32h11",
  },
  bayArea: {
    A: "M8 48h48M12 47c7-18 14-18 20 0m0 0c6-18 13-18 20 0M14 38h36M18 32v16m28-16v16M24 28h16M27 28v7m10-7v7",
    B: "M8 48h48M12 47c7-16 14-16 20 0m0 0c6-16 13-16 20 0M14 39h36M18 33v15m28-15v15M24 29h16M27 29v7m10-7v7M8 52h48",
    C: "M8 48h48M13 47c6-19 13-19 19 0m0 0c6-19 13-19 19 0M14 38h36M18 31v17m28-17v17M24 27h16M27 27v8m10-8v8",
  },
  vancouver: {
    A: "M8 48h48M14 45V29h10v16m4 0V20h10v25m4 0V27h8v18M10 29h12m4-9h14m2 7h10M14 20l10-10 8 10M8 52h48",
    B: "M8 48h48M13 45V31h10v14m4 0V24h12v21m4 0V30h8v15M10 31h13m2-7h16m2 6h10M14 24l10-12 9 12M8 52h48",
    C: "M8 48h48M14 45V30h9v15m5 0V21h11v24m5 0V28h7v17M11 30h12m3-9h15m3 7h9M15 21l9-9 8 9M8 52h48",
  },
  iceland: {
    A: "M7 46 18 28l8 8 12-20 8 15 6-7 5 22M7 51c14 3 33 3 50 0M11 56c13-3 30-3 42 0M38 16l1 19 8-10M18 28l6 16 8-7",
    B: "M7 46 18 31l9 6 12-22 8 16 6-5 4 20M7 51c14 3 33 3 50 0M11 56c13-3 30-3 42 0M39 15v20l8-10M18 31l7 14",
    C: "M7 46 20 27l8 10 11-18 8 16 6-7 4 18M7 51c14 3 33 3 50 0M11 56c13-3 30-3 42 0M20 27l6 17 8-8M39 19l2 16 8-8",
  },
};

export function AtlasDestinationIcon({ destination, direction = "A", ...props }: IconProps & { destination: HeroDestinationId }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden={props["aria-label"] ? undefined : true} {...props}>
      <path d={marks[destination][direction]} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export const ChengduIcon = (props: IconProps) => <AtlasDestinationIcon destination="chengdu" {...props} />;
export const BeijingIcon = (props: IconProps) => <AtlasDestinationIcon destination="beijing" {...props} />;
export const ShanghaiIcon = (props: IconProps) => <AtlasDestinationIcon destination="shanghai" {...props} />;
export const SeoulIcon = (props: IconProps) => <AtlasDestinationIcon destination="seoul" {...props} />;
export const TokyoIcon = (props: IconProps) => <AtlasDestinationIcon destination="tokyo" {...props} />;
export const CangguIcon = (props: IconProps) => <AtlasDestinationIcon destination="canggu" {...props} />;
export const PatagoniaIcon = (props: IconProps) => <AtlasDestinationIcon destination="patagonia" {...props} />;
export const AntarcticaIcon = (props: IconProps) => <AtlasDestinationIcon destination="antarctica" {...props} />;
export const MachuPicchuIcon = (props: IconProps) => <AtlasDestinationIcon destination="machuPicchu" {...props} />;
export const LondonIcon = (props: IconProps) => <AtlasDestinationIcon destination="london" {...props} />;
export const ParisIcon = (props: IconProps) => <AtlasDestinationIcon destination="paris" {...props} />;
export const NewYorkIcon = (props: IconProps) => <AtlasDestinationIcon destination="newYork" {...props} />;
export const BayAreaIcon = (props: IconProps) => <AtlasDestinationIcon destination="bayArea" {...props} />;
export const VancouverIcon = (props: IconProps) => <AtlasDestinationIcon destination="vancouver" {...props} />;
export const IcelandIcon = (props: IconProps) => <AtlasDestinationIcon destination="iceland" {...props} />;
