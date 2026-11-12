import Svg, { Circle, ClipPath, Defs, G, Path, Polygon, Rect } from 'react-native-svg';
import { composeRegionalBadgeAccessibilityLabel, type PhilippineRegionCode, type RegionalBadgeIdentity } from '../data/philippineRegions';
import { universalRegionalRankDefinitions } from '../services/regionalRanks';
import { colors } from '../theme';

function RegionalHabitatArt({ identity }: { identity: RegionalBadgeIdentity }) {
  const { motif, landscape, water, accent } = identity;
  switch (motif) {
    case 'urban-wetlands':
      return (
        <>
          <G fill={landscape}>
            <Rect x={7} y={24} width={8} height={13} rx={1} />
            <Rect x={16} y={18} width={8} height={19} rx={1} />
            <Rect x={35} y={21} width={8} height={16} rx={1} />
            <Rect x={44} y={26} width={5} height={11} rx={1} />
          </G>
          <Path d="M7 38 Q15 35 23 38 T39 38 T49 38 M9 41 H47" stroke={water} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M11 37 L9 33 M12 38 L15 33 M46 38 L44 33" stroke={accent} strokeWidth={2.2} strokeLinecap="round" />
          <Path d="M28 15 L31 16 L28 17 L25 16 Z" fill={colors.inkSoft} />
        </>
      );
    case 'mountain-pine':
      return (
        <>
          <Polygon points="6,39 15,28 20,30 31,9 39,23 45,20 52,39" fill={landscape} />
          <Polygon points="25,21 31,9 37,22 32,19 29,22" fill={colors.paper} />
          <Path d="M7 42 H51" stroke={water} strokeWidth={3} />
          <Path d="M9 40 L13 29 L17 40 Z M40 40 L44 27 L49 40 Z M21 40 L24 33 L27 40 Z" fill={colors.inkSoft} />
        </>
      );
    case 'sea-cliffs':
      return (
        <>
          <Polygon points="5,15 18,21 21,31 17,37 5,37" fill={landscape} />
          <Polygon points="51,20 43,24 40,33 44,37 51,37" fill={accent} />
          <Path d="M7 38 Q13 35 19 38 T31 38 T43 38 T51 38 M9 42 Q15 39 21 42 T33 42 T45 42" stroke={water} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M32 17 Q35 14 38 17 M37 21 Q40 18 43 21" stroke={colors.inkSoft} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </>
      );
    case 'river-ridges':
      return (
        <>
          <Path d="M4 35 L14 18 L23 30 L31 13 L52 35 L52 41 H4 Z" fill={landscape} />
          <Path d="M25 29 C17 32 37 34 28 38 C21 41 34 42 29 45" stroke={water} strokeWidth={5} fill="none" strokeLinecap="round" />
          <Path d="M5 42 H17 M38 42 H51" stroke={colors.leafDeep} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      );
    case 'rice-marsh':
      return (
        <>
          <Path d="M5 31 Q16 25 27 31 T51 31 L51 37 Q39 33 27 37 T5 37 Z" fill={landscape} />
          <Path d="M5 40 Q16 36 27 40 T51 40" stroke={water} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M9 39 L8 32 M15 38 L18 31 M42 38 L40 31 M48 39 L51 32" stroke={accent} strokeWidth={2.2} strokeLinecap="round" />
        </>
      );
    case 'volcanic-lake':
      return (
        <>
          <Path d="M5 31 C11 24 18 24 24 31 C30 38 37 38 43 31 C47 27 50 28 52 31 L52 40 H5 Z" fill={landscape} />
          <Path d="M9 34 C16 29 22 30 28 35 C34 40 41 39 48 34" stroke={water} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Polygon points="25,35 29,26 34,35" fill={accent} />
          <Path d="M28 27 L29 23" stroke={colors.inkSoft} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    case 'karst-mangrove':
      return (
        <>
          <Polygon points="7,35 11,20 15,26 20,13 25,35" fill={landscape} />
          <Polygon points="31,35 35,17 40,24 44,11 49,35" fill={accent} />
          <Path d="M7 39 Q16 35 25 39 T43 39 T51 39 M9 42 H47 M13 36 L11 42 M16 36 L19 42 M42 36 L39 42 M45 36 L48 42" stroke={water} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </>
      );
    case 'rainforest-volcano':
      return (
        <>
          <Polygon points="13,40 20,29 28,15 34,8 40,20 49,40" fill={landscape} />
          <Polygon points="31,15 34,8 37,15 34,14" fill={colors.paper} />
          <Path d="M7 40 Q13 32 19 40 M37 40 Q44 31 51 40" stroke={accent} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d="M7 43 H50" stroke={water} strokeWidth={3} />
        </>
      );
    case 'forest-mangrove':
      return (
        <>
          <Path d="M8 36 L8 22 M8 25 Q2 21 5 17 Q11 15 13 21 Q17 16 21 20 Q20 26 12 27 Z M43 36 L43 21 M43 24 Q37 20 40 16 Q46 14 48 20 Q52 16 54 21 Q52 26 46 27 Z" fill={landscape} stroke={colors.inkSoft} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M6 39 Q15 36 24 39 T42 39 T51 39 M9 42 L8 37 M12 37 L15 42 M45 37 L42 42 M48 37 L50 42" stroke={water} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M21 39 L21 34 M24 39 L26 34 M32 39 L31 34" stroke={accent} strokeWidth={2.2} />
        </>
      );
    case 'negros-highlands':
      return (
        <>
          <Path d="M3 39 C5 30 12 27 20 29 C24 20 32 19 38 26 C46 24 52 30 53 39 Z" fill={landscape} />
          <Path d="M8 38 C12 33 17 33 22 38 M34 37 C39 31 45 31 49 37" stroke={accent} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d="M6 43 Q15 39 24 43 T48 43" stroke={water} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      );
    case 'limestone-islands':
      return (
        <>
          <Path d="M5 39 Q14 35 23 39 T41 39 T52 39" stroke={water} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M6 38 C6 28 11 24 17 28 C21 20 28 20 32 28 C39 23 46 27 48 38 Z" fill={landscape} />
          <Path d="M7 37 C9 31 14 29 19 34 M23 36 C26 28 33 27 37 35 M39 36 C41 31 45 31 48 36" stroke={accent} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M8 43 Q16 40 24 43 T40 43 T50 43" stroke={water} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </>
      );
    case 'pacific-rainforest':
      return (
        <>
          <Path d="M14 40 C17 34 15 26 12 19 M14 29 C8 26 7 22 8 19 C14 20 17 23 16 28 M14 32 C20 28 23 25 23 21 C17 22 14 26 14 32" stroke={landscape} strokeWidth={3.5} fill="none" strokeLinecap="round" />
          <Path d="M6 37 Q14 32 22 37 T38 37 T52 37 M7 43 Q15 39 23 43 T39 43 T51 43" stroke={water} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M31 34 C36 29 42 29 48 34 L48 38 H31 Z" fill={accent} />
        </>
      );
    case 'mangrove-shore':
      return (
        <>
          <Path d="M18 37 L18 18 M18 24 C10 20 11 14 16 13 C21 12 24 16 24 21 C31 17 36 20 34 25 C30 31 23 30 18 26 Z" fill={landscape} />
          <Path d="M17 33 L11 42 M19 34 L24 43 M18 32 L18 43" stroke={accent} strokeWidth={3} strokeLinecap="round" />
          <Path d="M6 41 Q14 38 22 41 T38 41 T52 41" stroke={water} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      );
    case 'mountain-lake':
      return (
        <>
          <Polygon points="5,37 14,12 22,33 29,18 38,37" fill={landscape} />
          <Polygon points="34,37 43,15 52,37" fill={accent} />
          <Path d="M9 40 C17 36 24 37 29 40 C35 44 43 43 49 39" stroke={water} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d="M10 39 L10 31 M46 39 L46 30" stroke={colors.inkSoft} strokeWidth={3} />
        </>
      );
    case 'cloud-forest':
      return (
        <>
          <Polygon points="9,42 15,33 21,36 36,8 49,42" fill={landscape} />
          <Path d="M31 17 Q36 12 41 17 Q38 21 33 20 Z M27 24 Q33 20 39 24" fill={colors.paper} />
          <Path d="M8 43 Q15 39 22 43 M42 43 Q47 40 52 43" stroke={accent} strokeWidth={4} fill="none" strokeLinecap="round" />
        </>
      );
    case 'lake-wetlands':
      return (
        <>
          <Path d="M7 38 Q16 35 25 38 T43 38 T51 38 M9 42 Q17 39 25 42 T41 42 T49 42" stroke={water} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Polygon points="17,36 22,29 28,25 34,29 38,36" fill={landscape} />
          <Path d="M10 39 L10 25 M10 30 L7 26 M10 32 L13 28 M45 39 L45 24 M45 29 L42 25 M45 31 L48 27 M14 39 L14 33 M42 39 L42 33" stroke={accent} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Path d="M21 29 L28 25 L35 29" stroke={colors.leafDeep} strokeWidth={2.2} fill="none" />
        </>
      );
    case 'marsh-rainforest':
      return (
        <>
          <Path d="M6 38 C7 27 11 19 18 14 C25 19 27 27 25 38 Z M31 38 C31 26 36 17 44 12 C51 18 53 28 50 38 Z" fill={landscape} />
          <Path d="M9 38 L9 27 M22 38 L21 27 M35 38 L36 26 M48 38 L47 25" stroke={accent} strokeWidth={3.5} />
          <Path d="M6 42 Q14 38 22 42 T38 42 T52 42" stroke={water} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      );
    case 'southern-archipelago':
      return (
        <>
          <Path d="M5 40 Q13 36 21 40 T37 40 T52 40 M7 44 Q15 41 23 44 T39 44 T51 44" stroke={water} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M8 35 Q12 30 17 35 Z M23 37 Q28 31 34 37 Z M39 34 Q44 28 49 34 Z" fill={landscape} />
          <Circle cx={13} cy={34} r={4} fill={accent} />
          <Circle cx={28} cy={34} r={3.2} fill={accent} />
          <Circle cx={44} cy={33} r={4.5} fill={accent} />
        </>
      );
  }
}

export function RegionalBadgeMark({
  variant,
  identity,
  regionCode,
  regionName,
  size = 64,
}: {
  variant: number;
  identity: RegionalBadgeIdentity;
  regionCode: PhilippineRegionCode | null;
  regionName: string;
  size?: number;
}) {
  const { accent } = identity;
  let birdArt;
  switch (variant) {
    case 0:
      birdArt = (
        <>
          <Path d="M28 15 C21 18 17 24 19 30 C20 35 23 39 27 41 C33 37 38 30 37 23 C36 19 32 16 28 15 Z" fill={accent} />
          <Path d="M26 39 C28 32 30 25 34 18" stroke={colors.ink} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M27 35 L21 31 M28 31 L21 27 M30 27 L23 23 M32 23 L27 19 M28 35 L34 31 M30 30 L36 26 M32 25 L37 22" stroke={colors.paper} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </>
      );
      break;
    case 1:
      birdArt = (
        <>
          <Circle cx={28} cy={27} r={17} fill="none" stroke={accent} strokeWidth={1.8} opacity={0.65} />
          <Path d="M28 9 L28 14 M46 27 L41 27 M28 45 L28 40 M10 27 L15 27 M15 14 L18 17 M41 14 L38 17" stroke={accent} strokeWidth={2} strokeLinecap="round" />
          <Polygon points="28,12 30,25 28,23 26,25" fill={colors.yellow} />
          <Polygon points="28,42 26,29 28,31 30,29" fill={colors.inkSoft} opacity={0.8} />
          <Path d="M20 36 C18 29 21 20 35 16 C36 27 31 36 22 39 Z" fill={accent} />
          <Path d="M21 38 C26 31 30 25 34 18 M25 32 L22 27 M28 28 L24 23 M30 25 L28 21 M27 31 L33 27 M29 27 L34 24" stroke={colors.paper} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </>
      );
      break;
    case 2:
      birdArt = (
        <>
          <Path d="M14 37 C22 35 32 36 41 37" stroke={colors.inkSoft} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M18 35 C17 31 18 27 21 25 C23 22 28 22 31 25 C34 27 34 31 32 34 C28 37 22 37 18 35 Z" fill={accent} />
          <Path d="M21 29 C23 24 29 22 32 26 L29 30 C26 28 24 28 21 29 Z" fill={colors.paper} />
          <Circle cx={30} cy={26} r={1} fill={colors.ink} />
          <Polygon points="33,27 38,29 33,30" fill={colors.yellow} />
          <Path d="M15 34 C12 31 13 28 16 27 C18 29 18 32 15 34 Z M38 35 C36 31 38 28 42 28 C43 32 41 34 38 35 Z M22 22 C20 18 22 16 26 16 C28 19 26 21 22 22 Z" fill={colors.leafDeep} stroke={colors.inkSoft} strokeWidth={1.8} />
        </>
      );
      break;
    case 3:
      birdArt = (
        <>
          <Path d="M28 28 C22 24 17 18 10 17 C13 23 17 27 21 29 C17 28 13 30 11 34 C18 35 23 33 27 31 L28 35 L29 31 C33 33 38 35 45 34 C43 30 39 28 35 29 C39 27 43 23 46 17 C39 18 34 24 28 28 Z" fill={accent} />
          <Path d="M28 27 C25 25 24 22 25 20 C26 18 30 18 31 21 C32 23 30 26 28 27 Z M28 26 L28 34" fill={colors.inkSoft} stroke={colors.inkSoft} strokeWidth={1.8} strokeLinecap="round" />
          <Circle cx={29} cy={21} r={1.3} fill={colors.paper} />
          <Path d="M30 22 L34 23 L30 24" fill={colors.yellow} stroke={colors.yellow} strokeWidth={1} />
          <Path d="M14 22 L20 27 M42 22 L36 27 M15 31 L22 31 M41 31 L34 31" stroke={colors.paper} strokeWidth={1.8} strokeLinecap="round" opacity={0.9} />
        </>
      );
      break;
    case 4:
      birdArt = (
        <>
          <Path d="M28 13 L40 18 L39 30 C38 37 33 40 28 43 C23 40 18 37 17 30 L16 18 Z" fill={accent} opacity={0.7} />
          <Path d="M20 27 C23 23 26 22 28 24 C30 22 33 23 36 27 C33 29 31 30 28 30 C25 30 23 29 20 27 Z" fill={colors.paper} />
          <Path d="M28 24 C26 25 26 29 28 32 C30 29 30 25 28 24 Z" fill={colors.yellow} />
          <Circle cx={31} cy={25} r={1.3} fill={colors.ink} />
          <Path d="M22 32 C25 34 31 34 34 32" stroke={colors.paper} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </>
      );
      break;
    default:
      birdArt = (
        <>
          <Path d="M28 15 L24 11 L22 15 L18 12 L20 18 M28 15 L28 8 L31 13 L35 10 L34 17 M16 17 L12 14 M40 17 L44 14 M28 7 L28 5" stroke={colors.yellow} strokeWidth={2.1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M28 27 C22 23 17 18 9 16 C12 22 16 27 21 30 C17 28 12 29 10 33 C17 35 23 33 27 31 L28 37 L29 31 C33 33 39 35 46 33 C44 29 39 28 35 30 C40 27 44 22 47 16 C39 18 34 23 28 27 Z" fill={colors.yellow} />
          <Path d="M28 19 C25 19 24 22 25 25 C26 27 26 30 28 33 C30 30 30 27 31 25 C32 22 31 19 28 19 Z" fill={colors.yellow} stroke={colors.inkSoft} strokeWidth={1.8} />
          <Circle cx={29} cy={22} r={1.3} fill={colors.ink} />
          <Polygon points="31,23 35,24 31,25" fill={colors.coral} />
          <Path d="M14 21 L21 27 M42 21 L35 27 M14 31 L22 31 M42 31 L34 31" stroke={colors.coral} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </>
      );
  }

  const badgeLabel = universalRegionalRankDefinitions[variant]?.title ?? 'Regional rank';
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      accessibilityLabel={composeRegionalBadgeAccessibilityLabel(regionCode, regionName, badgeLabel)}
      accessible
    >
      <Circle cx={28} cy={28} r={25} fill={colors.paper} stroke={accent} strokeWidth={2.4} />
      <Defs>
        <ClipPath id="regional-badge-art">
          <Circle cx={28} cy={28} r={23} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#regional-badge-art)">
        <RegionalHabitatArt identity={identity} />
        <G transform="translate(9 2) scale(0.68)">
          {birdArt}
        </G>
      </G>
    </Svg>
  );
}

