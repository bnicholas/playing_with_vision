module.exports = function(gps) {

  const lat = gps.GPSLatitude
  const long = gps.GPSLongitude

  try {
    const coords = {
      lat: lat[0] + (lat[1]/60) + (lat[2]/3600),
      lng: long[0] + (long[1]/60) + (long[2]/3600)
    }
    if (gps.GPSLongitudeRef === 'W') {
      coords.lng = coords.lng * -1
    }
    return coords
  } catch (e) {
    return e
  }

}
