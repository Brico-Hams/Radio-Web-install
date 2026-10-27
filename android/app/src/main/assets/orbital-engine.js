"use strict";
var BricohamsOrbit = (function () {
    function create() {
        var record, epoch, observer;
        function prepare(line1, line2, latitude, longitude, height) {
            record = satellite.twoline2satrec(line1, line2);
            epoch = (record.jdsatepoch - 2440587.5) * 86400000;
            observer = { latitude: latitude * Math.PI / 180, longitude: longitude * Math.PI / 180, height: height };
            if (record.error !== 0 || !isFinite(epoch)) throw new Error("TLE no propagable.");
            return epoch;
        }
        function position(time) {
            var state = satellite.sgp4(record, (time - epoch) / 60000);
            if (!state || !state.position || record.error !== 0) throw new Error("Error SGP4: " + record.error);
            return state.position;
        }
        function look(time) {
            var ecf = satellite.eciToEcf(position(time), satellite.gstime(time / 86400000 + 2440587.5));
            var angles = satellite.ecfToLookAngles(observer, ecf);
            return [angles.azimuth * 180 / Math.PI, angles.elevation * 180 / Math.PI, angles.rangeSat];
        }
        function geo(time) {
            var point = satellite.eciToGeodetic(position(time), satellite.gstime(time / 86400000 + 2440587.5));
            return [point.latitude * 180 / Math.PI, point.longitude * 180 / Math.PI, point.height];
        }
        return { prepare: prepare, look: look, geo: geo };
    }
    return { create: create };
}());
