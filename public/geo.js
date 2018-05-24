const request_url = window.location.origin + '/api/image'
const message = document.getElementById('message')
const photo = photoJSON
const ipGeo = photo.ipGeo
const browserGeo = photo.browserGeo
const exifGeo = photo.exifGeo

var geoCoords

console.log('browserGeo', browserGeo)
console.log('ipGeo', ipGeo)
console.log('exifGeo', exifGeo)

if (ipGeo) {
  geoCoords = ipGeo
  message.innerHTML = "Location from web browser location"
}
if (browserGeo) {
  geoCoords = browserGeo
  message.innerHTML = "Location from web browser location"
}
if (exifGeo) {
  geoCoords = exifGeo
  message.innerHTML = "Location from photo metadata"
}

console.log(geoCoords)

const map = new google.maps.Map(document.getElementById('map'), { center: geoCoords, zoom: 10 })
const marker = new google.maps.Marker({ map: map, position: geoCoords })

// map.setCenter(geoCoords)
// marker.setPosition(geoCoords)

if (!exifGeo && !browserGeo && "geolocation" in navigator) {
  console.log('NOOOOO')
  navigator.geolocation.getCurrentPosition(pos => {
    const updated = {
      _id: photo._id,
      browserGeo: {lat: pos.coords.latitude, lng: pos.coords.longitude}
    }
    const newGeoCoords = updated.browserGeo

    map.panTo(newGeoCoords)
    marker.setPosition(newGeoCoords)

    updatePhotoData(updated)
    .then(data => {
      console.log(data)
      message.innerHTML = "Location from web browser location"
    })
    .catch(err => {
      console.error(err)
      message.innerHTML = "We had trouble tracking your location"
    })
  })
}

function updatePhotoData(photo) {
  let opts = {
    method: 'PUT',
    body: JSON.stringify(photo),
    headers: { 'content-type': 'application/json' }
  }
  return new Promise((resolve, reject) => {
    const req = new Request(request_url, opts)
    fetch(req)
    .then(response => response.json())
    .then(record => resolve(record))
    .catch(err => reject(err))
  })
}
