export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type WalkingRoute = {
  coordinates: [number, number][];
  distanceKm: number;
  durationSeconds: number;
  instructions: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function decodePolyline6(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let latitude = 0;
  let longitude = 0;
  let cursor = 0;

  const readDelta = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (cursor >= encoded.length) throw new Error('The walking route geometry is incomplete.');
      byte = encoded.charCodeAt(cursor++) - 63;
      if (byte < 0 || byte > 63) throw new Error('The walking route geometry is invalid.');
      result += (byte & 0x1f) * (2 ** shift);
      shift += 5;
      if (shift > 35) throw new Error('The walking route geometry is invalid.');
    } while (byte >= 0x20);
    return result % 2 ? -(Math.floor(result / 2) + 1) : result / 2;
  };

  while (cursor < encoded.length) {
    latitude += readDelta();
    longitude += readDelta();
    const lat = latitude / 1_000_000;
    const lng = longitude / 1_000_000;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('The walking route contains invalid coordinates.');
    }
    coordinates.push([lng, lat]);
  }

  if (coordinates.length < 2) throw new Error('The walking route does not contain enough points.');
  return coordinates;
}

export async function getWalkingRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
): Promise<WalkingRoute> {
  const response = await fetch('https://valhalla1.openstreetmap.de/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      locations: [
        { lat: origin.latitude, lon: origin.longitude },
        { lat: destination.latitude, lon: destination.longitude },
      ],
      costing: 'pedestrian',
      units: 'kilometers',
      shape_format: 'polyline6',
      directions_options: { units: 'kilometers' },
    }),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The walking directions service returned an unreadable response.');
  }

  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.status_message === 'string'
      ? payload.status_message
      : 'No pedestrian route is available for this sighting.';
    throw new Error(message);
  }

  if (!isRecord(payload) || !isRecord(payload.trip)) {
    const message = isRecord(payload) && typeof payload.status_message === 'string'
      ? payload.status_message
      : 'No pedestrian route is available for this sighting.';
    throw new Error(message);
  }

  const trip = payload.trip;
  const summary = isRecord(trip.summary) ? trip.summary : null;
  const legs = Array.isArray(trip.legs) ? trip.legs : [];
  const leg = isRecord(legs[0]) ? legs[0] : null;
  const encodedShape = leg?.shape;
  const distanceKm = summary?.length;
  const durationSeconds = summary?.time;
  if (
    typeof encodedShape !== 'string'
    || typeof distanceKm !== 'number'
    || !Number.isFinite(distanceKm)
    || distanceKm < 0
    || typeof durationSeconds !== 'number'
    || !Number.isFinite(durationSeconds)
    || durationSeconds < 0
  ) {
    throw new Error('The walking directions service returned an invalid route.');
  }

  const maneuvers = Array.isArray(leg?.maneuvers) ? leg.maneuvers : [];
  const instructions = maneuvers
    .filter(isRecord)
    .map((maneuver) => maneuver.instruction)
    .filter((instruction): instruction is string => typeof instruction === 'string' && instruction.trim().length > 0);

  return {
    coordinates: decodePolyline6(encodedShape),
    distanceKm,
    durationSeconds,
    instructions,
  };
}
