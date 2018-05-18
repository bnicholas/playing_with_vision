let img = document.getElementById('image')
const photo = photoJSON
let url = window.location.origin + '/api/image'
let message = document.getElementById('message')
let geo

function updatePhotoData(photo) {
  let opts = {
    method: 'PUT',
    body: JSON.stringify(photo),
    headers: { 'content-type': 'application/json' }
  }
  return new Promise((resolve, reject) => {
    const req = new Request(url, opts)
    fetch(req)
    .then(response => response.json())
    .then(record => resolve(record))
    .catch(err => reject(err))
  })
}

function getGeoLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(position => {
      const updated_photo = {
        _id: photo._id,
        geo: {
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed,
        }
      }
      updatePhotoData(updated_photo)
      .then(data => {
        console.log(data)
        message.innerHTML = "We successfully tracked your location"
      })
      .catch(err => {
        console.error(err)
        message.innerHTML = "We had trouble tracking your location"
      })
    })
  } else {
    message.innerHTML = "Enable Location in your browser"
  }
}

getGeoLocation()
