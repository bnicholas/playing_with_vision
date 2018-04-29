const dragTarget = document.getElementById('drop_zone')
const fileField = document.getElementById('photo')
const uploadURL = window.location.href + 'api/upload'
const allImagesURL = window.location.href + 'api/images'

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

const imageDataElement = document.getElementById('image_data')
let markup = []

function addImageElementToList(record) {
  let section = []
  section.push('<section>')
  section.push(`<img src="${record.fileURL}" />`)
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
  .catch(error => console.log('ERROR', error))
}

dragTarget.addEventListener('dragover', evt => {
  evt.preventDefault()
})

dragTarget.addEventListener('drop', evt => {
  evt.preventDefault()
  // console.log('DROP', evt.dataTransfer.files)
  fileField.files = evt.dataTransfer.files
  fetchVisionData()
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
  .then(json => loadAllPhotos(json))
}

fetchAllPhotos()
