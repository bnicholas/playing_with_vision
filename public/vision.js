let markup = []
let imageStore = {}

const dragTarget = document.getElementById('drop_zone')
const fileField = document.getElementById('photo')
const uploadURL = window.location.href + 'api/upload'
const allImagesURL = window.location.href + 'api/images'
const formElement = document.getElementById('uploader')
const searchElement = document.getElementById('search')
const imageDataElement = document.getElementById('image_data')
const uploadContainer = document.getElementById('upload_container')

function fetchAllPhotos() {
  markup = []
  imageStore = {}
  fetch(allImagesURL, { method: 'GET' })
  .then(response => response.json())
  .then(json => {
    loadAllPhotos(json.records)
    buildImageStore(json.records)
    console.log(`files: ${json.count.files}  documents: ${json.count.photos}`)
  })
}

function buildImageStore(records) {
  records.forEach(record => addImageToStore(record))
}

function addUploadIndicator() {
  uploadContainer.classList.add('uploading')
}

function removeUploadIndicator() {
  uploadContainer.classList.remove('uploading')
}

function loadAllPhotos(photos) {
  photos.forEach(record => addImageElementToList(record))
  updateHtml()
  removeUploadIndicator()
  addImageHandlers()
}

function updateHtml() {
  imageDataElement.innerHTML = markup.join('\n')
}

function addImageElementToList(record) {
  let section = []
  let classNames = ['thumbnail']
  if (record.exif && record.exif.gps) classNames.push('gps')
  section.push(`<section id="${record._id}" class="image">`)
  section.push(`<a href="" data-record="${record._id}" class="delete">x</a>`)
  section.push(`<img class="${classNames.join(' ')}" src="${record.thumbnailURL}" />`)
  section.push(`<p style="display: none">${JSON.stringify(record)}</p>`)
  section.push('</section>')
  markup = section.concat(markup)
}

function deleteImage(id) {
  let url = `http://${window.location.host}/api/image/${id}`
  fetch(url, {method: 'DELETE'})
  .then(response => response.text())
  .then(text => fetchAllPhotos())
  .catch(error => console.log(error))
}

function addImageHandlers() {
  let deleteLinks = document.querySelectorAll('a.delete')
  deleteLinks.forEach(el => {
    el.addEventListener('click', evt => {
      evt.preventDefault()
      let id = evt.target.dataset.record
      deleteImage(id)
    })
  })
}

function hasExif(record) {
  if (record.exif.gps) console.log('EXIF', record.exif.gps)
}

function addImageToStore(record) {
  if (record.exif) hasExif(record)
  let justLabels = record.labels.map(item => item.label)
  imageStore[record._id] = new Proxy({
    id: record._id,
    labels: justLabels.join(' '),
    visible: true,
    el: document.getElementById(record._id)
  }, {
    set: (obj, prop, value) => {
      if (prop === 'visible') {
        if (value === false) obj.el.classList.add('hidden')
        if (value === true) obj.el.classList.remove('hidden')
      }
    }
  })
}

function fetchVisionData() {
  addUploadIndicator()
  const form = new FormData(document.getElementById('uploader'));
  fetch(uploadURL, { method: 'POST', body: form })
  .then(response => response.json())
  .then(json => fetchAllPhotos())
  .then(() => formElement.reset())
  .catch(error => console.log('ERROR', error))
}

fileField.addEventListener('change', evt => {
  fetchVisionData()
})

searchElement.addEventListener('input', evt => {
  let searchFor = evt.target.value.toLowerCase()
  for (let [key, value] of Object.entries(imageStore)) {
    if (value.labels.includes(searchFor)) {
      imageStore[key].visible = true
    } else {
      imageStore[key].visible = false
    }
  }
})

dragTarget.addEventListener('dragover', evt => {
  evt.preventDefault()
})

dragTarget.addEventListener('drop', evt => {
  evt.preventDefault()
  fileField.files = evt.dataTransfer.files
  evt.dataTransfer.clearData()
})

fetchAllPhotos()
