let markup = []
let imageStore = {}

const dragTarget = document.getElementById('drop_zone')
const fileField = document.getElementById('photo')
const uploadURL = window.location.href + 'api/upload'
const allImagesURL = window.location.href + 'api/images'
const formElement = document.getElementById('uploader')
const searchElement = document.getElementById('search')
const imageDataElement = document.getElementById('image_data')

const imageStoreEvents = {
  set: (obj, prop, value) => {
    if (prop === 'visible') {
      if (value === false) obj.el.classList.add('hide')
      if (value === true) obj.el.classList.remove('hide')
    }
  }
}

function fetchAllPhotos() {
  fetch(allImagesURL, { method: 'GET' })
  .then(response => response.json())
  .then(json => {
    loadAllPhotos(json)
    buildImageStore(json)
  })
}

function loadAllPhotos(photos) {
  photos.forEach(record => addImageElementToList(record))
  updateHtml()
}

// function addImageElementToList(record) {
//   let section = []
//   section.push(`<section id="${record._id}">`)
//   section.push(`<img class="thumbnail" src="${record.fileURL}" />`)
//   section.push('<ul>')
//   record.labels.forEach(item => section.push(`<li>${item.label} : ${item.score}</li>`))
//   section.push('</section>')
//   markup = section.concat(markup)
//   return section
// }

function addImageElementToList(record) {
  let section = []
  let classNames = ['thumbnail']
  if (record.exif && record.exif.gps) classNames.push('gps')
  section.push(`<section id="${record._id}" class="image">`)
  section.push(`<img class="${classNames.join(' ')}" src="${record.fileURL}" />`)
  section.push(`<p style="display: none">${JSON.stringify(record)}</p>`)
  section.push('</section>')
  markup = section.concat(markup)
  return section
}

// THIS IS BLOWING AWAY MY el references in the storage object
function updateHtml() {
  imageDataElement.innerHTML = markup.join('\n')
}

function appendHtml(html) {
  if (typeOf.Array(html)) {
    html = html.join('\n')
  }
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
  }, imageStoreEvents)
}

function buildImageStore(records) {
  records.forEach(record => addImageToStore(record))
}

function fetchVisionData() {
  const form = new FormData(document.getElementById('uploader'));
  fetch(uploadURL, { method: 'POST', body: form })
  .then(response => response.json())
  .then(json => {
    addImageElementToList(json)
    updateHtml()
    addImageToStore(json)
  })
  .then(() => formElement.reset())
  .catch(error => console.log('ERROR', error))
}

fileField.addEventListener('change', evt => {
  fetchVisionData()
})

searchElement.addEventListener('input', evt => {
  let searchFor = evt.target.value.toLowerCase()
  console.log(searchFor)
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
