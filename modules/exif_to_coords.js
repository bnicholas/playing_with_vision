module.exports = function(gps) {
  let lat = gps.GPSLatitude
  let long = gps.GPSLongitude

  console.log(gps)

  try {
    const coords = {
      lat: lat[0] + (lat[1]/60) + (lat[2]/3600),
      lng: long[0] + (long[1]/60) + (long[2]/3600)
    }
    if (gps.GPSLongitudeRef === 'W') {
      coords.lng = coords.lng * -1
    }
    console.log(coords)
    return coords
  } catch (e) {
    return e
  }

  // Degrees + minutes/60 + seconds/3600
  // gps.GPSLatitude: [ 33, 10, 24.02 ],
  // gps:
  //  { GPSLatitudeRef: 'N',
  //    GPSLatitude: [ 33, 10, 24.02 ],
  //    GPSLongitudeRef: 'W',
  //    GPSLongitude: [ 117, 19, 10.3 ],
  //    GPSAltitudeRef: 0,
  //    GPSAltitude: 47.194902548725636,
  //    GPSTimeStamp: [ 23, 29, 38.99 ],
  //    GPSSpeedRef: 'K',
  //    GPSSpeed: 0,
  //    GPSImgDirectionRef: 'M',
  //    GPSImgDirection: 279.80944625407164,
  //    GPSDestBearingRef: 'M',
  //    GPSDestBearing: 279.80944625407164,
  //    GPSDateStamp: '2018:04:09',
  //    GPSHPositioningError: 5
  //  }
}
