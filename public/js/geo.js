const request_url = window.location.origin + '/api/image'
const message = document.getElementById('message')
const photo = photoJSON

const map = new google.maps.Map(document.getElementById('map'), { center: photo.coords, zoom: 10 })
const marker = new google.maps.Marker({ map: map, position: photo.coords })

console.log(photo.geo_from)

if (!photo.geo_from === 'exif' && !photo.geo_from === 'browser' && "geolocation" in navigator) {
  console.log('NOOOOO')
  navigator.geolocation.getCurrentPosition(pos => {
    const updated = {
      id: photo._id,
      coords: {lat: pos.coords.latitude, lng: pos.coords.longitude},
      geo_from: 'browser'
    }
    const newGeoCoords = updated.coords

    map.panTo(newGeoCoords)
    marker.setPosition(newGeoCoords)

    updatePhotoData(updated)
    .then(data => updateMessage(data.geo_from))
    .catch(err => updateMessage('error'))
  })
}

function updateMessage(geo_from) {
  console.log(geo_from)
  message.innerHTML = "We had trouble tracking your location"
  if (geo_from === 'exif') message.innerHTML = "Location from photo gps data"
  if (geo_from === 'browser') message.innerHTML = "Location from web browser location"
  if (geo_from === 'ip') message.innerHTML = "Location from IP lookup"
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

updateMessage(photo.geo_from)
