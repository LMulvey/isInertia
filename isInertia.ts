/**
 * Updated Lethargy utility by d4nyll that tracks decay of
 * delta values during a wheel event. This is used to determine whether a wheel event
 * is an intentional action by the user, or triggered by inertia from a track pad.
 *
 * Modified to add support for horizontal scrolling as well.
 *
 * See: https://github.com/d4nyll/lethargy
 */
type LastDeltas = { down: Array<number | null>; up: Array<number | null> };

type DeltaTimestamps = Array<number | null>;

type IsInertia = (options?: {
  axis?: 'x' | 'y';
  delay?: number;
  sensitivity?: number;
  stability?: number;
  tolerance?: number;
}) => {
  check: <T extends WheelEvent>(event: T) => boolean;
  lastDeltas: LastDeltas;
  deltaTimestamps: DeltaTimestamps;
};

export const isInertia: IsInertia = (options = {}) => {
  const {
    axis = 'x',
    stability = 8,
    sensitivity = 100,
    tolerance = 1.1,
    delay = 150,
  } = options;
  const stabilitySquared = stability * 2;
  let lastDelta = 0;
  const lastDeltas: LastDeltas = {
    down: Array.from({ length: stabilitySquared }, () => null),
    up: Array.from({ length: stabilitySquared }, () => null),
  };
  const deltaTimestamps: DeltaTimestamps = Array.from(
    { length: stabilitySquared },
    () => null
  );

  const InertiaCalc = (direction: 'down' | 'up') => {
    const lastDeltaArray = direction === 'up' ? lastDeltas.up : lastDeltas.down;

    // if there is no array, assume this was a intentional wheel event
    if (lastDeltaArray[0] === null) {
      return true;
    }

    const comparingTimestamp = deltaTimestamps[stabilitySquared - 2] ?? 0;
    if (
      comparingTimestamp + delay > Date.now() &&
      lastDeltaArray[0] === lastDeltaArray[stabilitySquared - 1]
    ) {
      return false;
    }

    const lastDeltasOld = lastDeltaArray.slice(0, stability) ?? [];
    const lastDeltasNew =
      lastDeltaArray.slice(stability, stabilitySquared) ?? [];
    const oldSum =
      lastDeltasOld.reduce(
        (accumulator, value) => (accumulator ?? 0) + (value ?? 0),
        0
      ) ?? 0;
    const newSum =
      lastDeltasNew.reduce(
        (accumulator, value) => (accumulator ?? 0) + (value ?? 0),
        0
      ) ?? 0;
    const oldAverage = oldSum / lastDeltasOld.length;
    const newAverage = newSum / lastDeltasNew.length;

    if (
      Math.abs(oldAverage) < Math.abs(newAverage * tolerance) &&
      sensitivity < Math.abs(newAverage)
    ) {
      return true;
    }

    return false;
  };

  const check = (event: WheelEvent) => {
    lastDelta = axis === 'y' ? event.deltaY : event.deltaX;
    deltaTimestamps.push(Date.now());
    deltaTimestamps.shift();

    if (lastDelta === null || typeof lastDelta === 'undefined') {
      return false;
    }

    if (lastDelta > 0) {
      lastDeltas.up.push(lastDelta);
      lastDeltas.up.shift();
      return InertiaCalc('up');
    } else {
      lastDeltas.down.push(lastDelta);
      lastDeltas.down.shift();
      return InertiaCalc('down');
    }
  };

  return { check, lastDeltas, deltaTimestamps };
};
