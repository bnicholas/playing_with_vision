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


function addUploadIndicator() { uploadContainer.classList.add('uploading') }

function removeUploadIndicator() { uploadContainer.classList.remove('uploading') }

async function buildImageElementAndAppend(record) {
  let el = await buildImageElement(record)
  imageDataElement.appendChild(el)
  return el
}

function buildImagesFragmentAndAppend(records) {
  console.log(records)
  let target = document.getElementById('append_here')
  let doc_fragment = document.createDocumentFragment()
  for (let record of records) {
    buildImageElement(record)
    .then(element => target.appendChild(element))
    .catch(err => console.error(err))
  }
}

function buildImageElement(record) {
  console.log(record)
  return new Promise((resolve, reject) => {
    if (!record) reject('no record provided to buildImageElement')

    let classNames = ['thumbnail']
    if (record.exif && record.exif.gps) classNames.push('gps')

    let section = document.createElement('section')
    section.className = 'image'
    section.id = record._id
    section.addEventListener('mouseenter', evt => imageStore[evt.target.id].hover = true )
    section.addEventListener('mouseleave', evt => imageStore[evt.target.id].hover = false )

    let remove = document.createElement('a')
    remove.className = 'delete'
    remove.setAttribute('href', '')
    remove.setAttribute('data-record', record._id)
    remove.innerHTML = 'x'
    remove.addEventListener('click', evt => {
      evt.preventDefault()
      imageStore[evt.target.dataset.record].deleting = true
    })

    let image = document.createElement('img')
    image.className = classNames.join(' ')
    image.setAttribute('src', record.thumbnailURL)

    let labels = document.createElement('p')
    let scored = record.scores
    labels.className = 'labels'
    labels.innerHTML = record.scores.join(' | ')


    section.appendChild(image)
    section.appendChild(remove)
    section.appendChild(labels)

    record.el = section
    resolve(section)
  })
}

function deleteImage(id) {
  let url = `http://${window.location.host}/api/image/${id}`
  let el = document.getElementById(id)
  fetch(url, {method: 'DELETE'})
  .then(response => response.text())
  .then(text => imageDataElement.removeChild(el))
  .catch(error => console.log(error))
}

function toggleClassHover(el) {
  // el.children.item(2).innerHTML = imageStore[el.id].displayLabels
  el.classList.toggle('hover')
}

function addImageToStore(record) {
  if (record.labels.length === 0) record.labels.push('no labels')
  imageStore[record._id] = new Proxy({
    id: record._id,
    displayLabels: record.scores.join(' | '),
    labels: record.labels.join(' '),
    visible: true,
    el: record.el,
    hover: false
  }, {
    set: (obj, prop, value) => {
      if (prop === 'hover') toggleClassHover(obj.el)
      if (prop === 'deleting') {
        obj.el.classList.add('deleting')
        deleteImage(obj.id)
      }
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
  .then(records => {
    records.forEach(record => {
      buildImageElementAndAppend(record)
      .then(el => {
        record.el = el
        addImageToStore(record)
      })
      .catch(err => console.error(err))
    })
  })
  .then(() => {
    removeUploadIndicator()
    formElement.reset()
  })
  .catch(error => console.log('ERROR', error))
}

fileField.addEventListener('change', evt => fetchVisionData() )

searchElement.addEventListener('input', evt => {
  let searchFor = evt.target.value.toLowerCase()
  for (let [key, value] of Object.entries(imageStore)) {
    // console.log(key, value.labels)
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

function fetchAllPhotos() {
  markup = []
  imageStore = {}
  fetch(allImagesURL, { method: 'GET' })
  .then(response => response.json())
  .then(json => {
    json.records.forEach(record => {
      buildImageElementAndAppend(record)
      .then(el => {
        record.el = el
        addImageToStore(record)
      })
      .catch(err => console.error(err))

    })
  })
}

fetchAllPhotos()
