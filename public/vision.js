// document.getElementById('id')
// document.getElementsByClassName('class')
// document.getElementsByTagName('div')
// document.querySelector('a.class')
// document.querySelectorAll('.class')
// document.querySelectorAll('a[target=_blank]')
// element.insertAdjacentHTML('beforeend', `<p class="comment">${commentContent}</p>`)
// element.classList.add('bold')
// element.classList.remove('bold')
// element.classList.toggle('bold')
// el.querySelectorAll('li')
// el.previousElementSibling
// el.nextElementSibling
// el.closest(selector)
// document.querySelector('#my-input').value
// el.getAttribute('foo')
// el.setAttribute('foo')

let markup = []
let imageIdCollection = []
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

function buildImageStore(records) {
  records.forEach(record => {
    let justLabels = record.labels.map(item => item.label)
    imageStore[record._id] = new Proxy({
      id: record._id,
      labels: justLabels.join(' '),
      visible: true,
      el: document.getElementById(record._id)
    }, imageStoreEvents)
  })
}

function addImageElementToList(record) {
  let section = []
  section.push(`<section id="${record._id}">`)
  section.push(`<img class="thumbnail" src="${record.fileURL}" />`)
  section.push('<ul>')
  record.labels.forEach(item => section.push(`<li>${item.label} : ${item.score}</li>`))
  section.push('</section>')
  markup = section.concat(markup)
}

function fetchVisionData() {
  const form = new FormData(document.getElementById('uploader'));
  fetch(uploadURL, { method: 'POST', body: form })
  .then(response => response.json())
  .then(json => addImageElementToList(json))
  .then(json => updateHtml())
  .then(json => formElement.reset())
  .catch(error => console.log('ERROR', error))
}

fileField.addEventListener('change', evt => {
  fetchVisionData()
})

searchElement.addEventListener('input', evt => {
  let searchFor = evt.target.value
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

function updateHtml() {
  imageDataElement.innerHTML = markup.join('\n')
}

function loadAllPhotos(photos) {
  console.log('PHOTOS: ' + photos.length)
  photos.forEach(record => addImageElementToList(record))
  updateHtml()
}

function fetchAllPhotos() {
  fetch(allImagesURL, { method: 'GET' })
  .then(response => response.json())
  .then(json => {
    loadAllPhotos(json)
    buildImageStore(json)
  })
}

fetchAllPhotos()
