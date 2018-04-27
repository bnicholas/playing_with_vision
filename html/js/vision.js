const dragTarget = document.getElementById('drop_zone')
// const uploader = document.getElementById('uploader')
const fileField = document.getElementById('photo')
const productionURL = 'https://ford-vision.herokuapp.com/upload'
const devURL = 'http://localhost:5000/upload'
const uploadURL = devURL

function removeDragData(ev) {
  console.log('Removing drag data')
  if (ev.dataTransfer.items)
    ev.dataTransfer.items.clear()
  } else {
    ev.dataTransfer.clearData()
  }
}

function fetchVisionData() {
  const form = new FormData(document.getElementById('uploader'));
  fetch(uploadURL, { method: 'POST', body: form })
  .then(response => {
    response.json().then(res => console.log(res))
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
  // removeDragData(evt)
  ev.dataTransfer.clearData()
})
