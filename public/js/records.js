// let photos
let imageStore = {}

// ELEMENTS & LISTENERS
const map = new google.maps.Map(document.getElementById('map'))
const bounds = new google.maps.LatLngBounds
const uploadContainer = document.getElementById('upload_container')
const image_holder = document.getElementById('image_holder')
const fileField = document.getElementById('photo')
const formElement = document.getElementById('uploader')
const searchElement = document.getElementById('search')
const tableBody = document.getElementById('append_target')
const map_link = document.getElementById('map_all')

fileField.addEventListener('change', handleUpload)
searchElement.addEventListener('input', handleSearch)

map_link.addEventListener('click', evt => {
  evt.preventDefault()
  $('#mapModal').foundation('open')
  map.fitBounds(bounds)
})

function inlineSVGs() {
  let mySVGsToInject = document.querySelectorAll('img.inject-me')
  SVGInjector(mySVGsToInject)
}

function initRecordListener(el) {
  $(el)
  .on('click', '[data-delete]', handleDelete)
  .on('click', '[data-image_modal]', handleBigImage)
}

// HANDLERS
function handleDelete() {
  let id = this.getAttribute('data-id')
  let url = this.getAttribute('data-url')
  let tr = document.querySelector(`tr[data-id="${id}"]`)
  fetch(url, {method: 'DELETE'})
  .then(response => response.text())
  .then(text => tableBody.removeChild(tr))
  .catch(error => console.log(error))
  imageStore[id].deleting = true
}

function handleBigImage() {
  let id = this.getAttribute('data-id')
  let img_tag = `<img src="/image/${id}" class="big_image" />`
  image_holder.innerHTML = img_tag
  $('#imgModal').foundation('open')
}

function handleSearch(evt) {
  let searchFor = evt.target.value.toLowerCase()
  for (let [key, value] of Object.entries(imageStore)) {
    // console.log(key, value.labels)
    if (value.labels.includes(searchFor)) {
      imageStore[key].visible = true
    } else {
      imageStore[key].visible = false
    }
  }
}

function handleUpload() {
  addUploadIndicator()
  const form = new FormData(document.getElementById('uploader'));
  fetch('/api/index/upload', { method: 'POST', body: form })
  .then(response => response.json())
  .then(records => {
    records.forEach(upload => {
      tableBody.insertAdjacentHTML('afterbegin', JSON.parse(upload.markup))
      addImageToStore(upload.record)
      initRecordListener(imageStore[upload.record._id].el)
    })
  })
  .then(() => {
    inlineSVGs()
    removeUploadIndicator()
    formElement.reset()
  })
  .catch(error => console.log('ERROR', error))
}


// DOM MANIPULATION
function addUploadIndicator() {
  uploadContainer.classList.add('uploading')
}
function removeUploadIndicator() {
  uploadContainer.classList.remove('uploading')
}


// STRUCTURE DATA
function addImageToStore(record) {
  imageStore[record._id] = new Proxy({
    id: record._id,
    labels: record.labels.join(' '),
    visible: true,
    coords: record.parsedCoords,
    el: document.querySelector(`tr[data-id="${record._id}"]`),
    thumbnailTag: record.thumbnailTag,
    map: {
      position: new google.maps.LatLng(record.parsedCoords),
      marker: new google.maps.Marker({ map: map, position: new google.maps.LatLng(record.parsedCoords) }),
      info_window: new google.maps.InfoWindow({ content: record.thumbnailTag })
    }
  }, {
    set: (obj, prop, value) => {
      if (prop === 'added' && obj.coords) {
        obj.map.info_window.open(map, obj.map.marker)
        obj.map.marker.addListener('click', () => obj.map.info_window.open(map, obj.map.marker))
        bounds.extend(obj.map.position)
      }
      if (prop === 'deleting') {
        obj.el.classList.add('deleting')
        // deleteImage(obj.id)
        obj.map.info_window.close()
        obj.map.marker.setMap(null)
      }
      if (prop === 'visible') {
        if (value === false) obj.el.classList.add('hidden')
        if (value === true) obj.el.classList.remove('hidden')
      }
    }
  })
  imageStore[record._id].added = true
}

// INITIALIZE

function fetchAllPhotos() {
  return new Promise((resolve, reject) => {
    fetch('/api/images', {method: 'GET'})
    .then(response => response.json())
    .then(json => resolve(json))
    .catch(err => reject(err))
  })
}

async function init() {
  let photos = await fetchAllPhotos()
  photos.forEach(record => {
    addImageToStore(record)
    initRecordListener(imageStore[record._id].el)
  })
  inlineSVGs()
  $(document).foundation()
}

init()
