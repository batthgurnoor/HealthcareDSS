/** Compute the average hourly arrival rate from patient_arrivals rows */
export function averageArrivalRate(rows) {
  if (!rows?.length) return 0;
  let total = 0;
  for (const r of rows) total += Number(r.arrivals || 0);
  return total / rows.length; // arrivals per hour
}

/** Simple factorial for small integers (server counts) */
function factorial(n) {
  let x = 1;
  for (let i = 2; i <= n; i++) x *= i;
  return x;
}

/** Erlang C components for an M/M/s system.
 * arrivalRatePerHour = λ (arrivals/hour)
 * serviceRatePerHour = μ (services/hour)
 * serverCount        = s
 * Returns { idleProbability, waitProbability, utilization }
 */
function erlangC(arrivalRatePerHour, serviceRatePerHour, serverCount) {
  const offeredLoad = arrivalRatePerHour / serviceRatePerHour;
  const utilization = offeredLoad / serverCount;               
  if (utilization >= 1) return { idleProbability: 0, waitProbability: 1, utilization };


  let sum = 0;
  for (let n = 0; n < serverCount; n++) sum += Math.pow(offeredLoad, n) / factorial(n);
  const tail = Math.pow(offeredLoad, serverCount) / (factorial(serverCount) * (1 - utilization));
  const idleProbability = 1 / (sum + tail);

  const waitProbability =
    (Math.pow(offeredLoad, serverCount) / (factorial(serverCount) * (1 - utilization))) * idleProbability;

  return { idleProbability, waitProbability, utilization };
}

/** Queue performance metrics for M/M/s (returns minutes for waits)
 * arrivalRatePerHour, serviceRatePerHour, serverCount
 */
export function computeQueueMetrics(arrivalRatePerHour, serviceRatePerHour, serverCount) {
  if (arrivalRatePerHour <= 0 || serviceRatePerHour <= 0 || serverCount < 1) {
    return {
      s: serverCount,
      utilization: 0,
      waitProbability: 0,
      queueWaitMinutes: 0,
      totalTimeMinutes: (1 / Math.max(serviceRatePerHour, 1e-9)) * 60,
    };
  }

  const { waitProbability, utilization } = erlangC(
    arrivalRatePerHour,
    serviceRatePerHour,
    serverCount
  );

  if (utilization >= 1) {
    return {
      s: serverCount,
      utilization,
      waitProbability: 1,
      queueWaitMinutes: Infinity,
      totalTimeMinutes: Infinity,
    };
  }


  const queueLength = waitProbability * (utilization / (1 - utilization));
  const queueWaitHours = queueLength / arrivalRatePerHour;
  const queueWaitMinutes = queueWaitHours * 60;
  const serviceTimeMinutes = (1 / serviceRatePerHour) * 60;
  const totalTimeMinutes = queueWaitMinutes + serviceTimeMinutes;

  return {
    s: serverCount,
    utilization: +utilization.toFixed(4),
    waitProbability: +waitProbability.toFixed(4),
    queueWaitMinutes: +queueWaitMinutes.toFixed(2),
    totalTimeMinutes: +totalTimeMinutes.toFixed(2),
  };
}

/** Pick the smallest server count that meets both targets.
 * arrivalRatePerHour: arrivals/hour
 * averageServiceTimeMinutes: minutes per patient
 * utilizationCap: e.g., 0.85
 * queueWaitTargetMinutes: e.g., 10
 * Returns { serverCount, metrics }
 */
export function pickServerCount(
  arrivalRatePerHour,
  averageServiceTimeMinutes,
  utilizationCap = 0.85,
  queueWaitTargetMinutes = 10
) {
  const serviceRatePerHour = 60 / Math.max(averageServiceTimeMinutes, 0.0001); // μ
  
  const startServers = Math.max(
    1,
    Math.ceil(arrivalRatePerHour / (serviceRatePerHour * utilizationCap))
  );


  const MAX_SERVERS = 50;
  let choice = null;
  for (let s = startServers; s <= MAX_SERVERS; s++) {
    const m = computeQueueMetrics(arrivalRatePerHour, serviceRatePerHour, s);
    if (m.utilization <= utilizationCap && m.queueWaitMinutes <= queueWaitTargetMinutes) {
      choice = { serverCount: s, metrics: m };
      break;
    }
  }
  if (!choice) {
    const m = computeQueueMetrics(arrivalRatePerHour, serviceRatePerHour, MAX_SERVERS);
    choice = { serverCount: MAX_SERVERS, metrics: m };
  }
  return choice;
}
