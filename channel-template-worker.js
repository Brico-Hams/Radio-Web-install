"use strict";
importScripts("satellite.min.js", "radio-core.js", "planning-core.js", "channel-templates.js");
self.onmessage = event => {
  try {
    const R = self.RadioWorkspace, { satellites, observer, now, weekly } = event.data;
    R.validateSatellitesFile(satellites);
    if (weekly) {
      // Operational 7-day window for the radio's pass table; the observer is the user's own position.
      self.postMessage({ result: { format: "bricohams-weekly-passes", version: 1,
        planningOnly: false, operational: true, generatedAt: new Date(now).toISOString(), observer,
        passes: R.weeklyTemplatePasses(satellites, observer, now),
        attribution: satellites.attribution, license: satellites.license, sampleSeconds: 5, minimumElevation: 10,
        warning: "Seven days at most, limited to seven days from each TLE epoch. Recalculate with fresh TLE before loading the radio again." } });
      return;
    }
    const passes = R.monthlyTemplatePasses(satellites, observer, now);
    self.postMessage({ result: { format: "bricohams-monthly-passes", version: 1,
      planningOnly: true, operational: false, generatedAt: new Date(now).toISOString(),
      month: new Date(now).toISOString().slice(0, 7), observer, passes,
      attribution: satellites.attribution, license: satellites.license, sampleSeconds: 60, minimumElevation: 10,
      warning: "Monthly forecast only. Beyond 7 days from TLE epoch predictions are tentative. Recalculate fresh operational passes before use; no CAT." } });
  } catch (error) { self.postMessage({ error: error.message }); }
};
