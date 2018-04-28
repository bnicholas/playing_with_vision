const dragTarget = document.getElementById('drop_zone')
const fileField = document.getElementById('photo')
const uploadURL = window.location.href + 'api/upload'

function displayUploadResult(record) {
  const imageDataElement = document.getElementById('image_data')
  let markup = [ `<img src="${record.fileURL}" />`, '<ul>' ]
  record.labels.forEach(label => markup.push(`<li>${label}</li>`))
  imageDataElement.innerHTML = markup.join('\n')
}

function fetchVisionData() {
  const form = new FormData(document.getElementById('uploader'));
  fetch(uploadURL, { method: 'POST', body: form })
  .then(response => {
    response.json()
    .then(res => displayUploadResult(res))
    .catch(error => console.log('ERROR', error))
  }).catch(error => {
    console.log(error)
  })
}

dragTarget.addEventListener('dragover', evt => {
  evt.preventDefault()
})

dragTarget.addEventListener('drop', evt => {
  evt.preventDefault()
  fileField.files = evt.dataTransfer.files
  fetchVisionData()
  evt.dataTransfer.clearData()
})
