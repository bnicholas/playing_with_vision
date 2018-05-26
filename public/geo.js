const request_url = window.location.origin + '/api/image'
const message = document.getElementById('message')
const photo = photoJSON
const geoIp = photo.geoIp
const geoBrowser = photo.geoBrowser
const geoExif = photo.geoExif

var geoCoords

console.log('geoBrowser', geoBrowser)
console.log('geoIp', geoIp)
console.log('geoExif', geoExif)

if (geoIp) {
  geoCoords = geoIp
  message.innerHTML = "Location from web browser location"
}
if (geoBrowser) {
  geoCoords = geoBrowser
  message.innerHTML = "Location from web browser location"
}
if (geoExif) {
  geoCoords = geoExif
  message.innerHTML = "Location from photo metadata"
}

console.log(geoCoords)

const map = new google.maps.Map(document.getElementById('map'), { center: geoCoords, zoom: 10 })
const marker = new google.maps.Marker({ map: map, position: geoCoords })

// map.setCenter(geoCoords)
// marker.setPosition(geoCoords)

if (!geoExif && !geoBrowser && "geolocation" in navigator) {
  console.log('NOOOOO')
  navigator.geolocation.getCurrentPosition(pos => {
    const updated = {
      _id: photo._id,
      geoBrowser: {lat: pos.coords.latitude, lng: pos.coords.longitude}
    }
    const newGeoCoords = updated.geoBrowser

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
