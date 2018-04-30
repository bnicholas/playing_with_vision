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
  console.log('PHOTOS: ' + photos.length)
  photos.forEach(record => addImageElementToList(record))
  updateHtml()
}

function addImageElementToList(record) {
  let section = []
  section.push(`<section id="${record._id}">`)
  section.push(`<img class="thumbnail" src="${record.fileURL}" />`)
  section.push('<ul>')
  record.labels.forEach(item => section.push(`<li>${item.label} : ${item.score}</li>`))
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

function addImageToStore(record) {
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
  let searchFor = evt.target.value
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
