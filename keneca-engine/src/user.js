import * as h3_lib from "h3-js";

// H3 Resolution 9 (~0.1 km² hexagon area for campus/neighborhood scale)
const H3_RESOLUTION = 9;

function userLocToCell(user) {
  if (!user) {
    throw new Error("Invalid user object provided to userLocToCell");
  }

  // Safely extract latitude and longitude regardless of property key naming
  const lat = user.lat !== undefined ? user.lat : user.latitude;
  const lng = user.lng !== undefined ? user.lng : user.longitude;

  if (lat === undefined || lng === undefined) {
    throw new Error("User object must contain lat/lng or latitude/longitude");
  }

  return h3_lib.latLngToCell(
    parseFloat(lat),
    parseFloat(lng),
    H3_RESOLUTION
  );
}

export { userLocToCell };