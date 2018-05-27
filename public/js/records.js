console.log('photos.js')

let photos

const image_holder = document.getElementById('image_holder')

function fullSize(id) {
  let img_tag = `<img src="/image/${id}" class="big_image" />`
  image_holder.innerHTML = img_tag
  $('#imgModal').foundation('open')
}

function initMap(photos) {
  const map_all = document.getElementById('map_all')
  const map = new google.maps.Map(document.getElementById('map'))
  let bounds = new google.maps.LatLngBounds
  photos.forEach(photo => {
    if (photo.coords) {
      let marker_position = new google.maps.LatLng(photo.coords)
      let marker = new google.maps.Marker({ map: map, position: marker_position })
      let info_window = new google.maps.InfoWindow({ content: photo.thumbnailTag })
      info_window.open(map, marker)
      marker.addListener('click', () => info_window.open(map, marker))
      bounds.extend(marker_position)
    }
  })

  map_all.addEventListener('click', evt => {
    evt.preventDefault()
    $('#mapModal').foundation('open')
    map.fitBounds(bounds)
  })
  
}

fetch('/api/images', {method: 'GET'})
.then(response => response.json())
.then(json => {
  console.log(json)
  photos = json
  initMap(photos)
})
.catch(err => console.log({error: err}))

$(document).foundation()
