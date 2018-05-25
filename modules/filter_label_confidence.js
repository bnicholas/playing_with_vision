// label_confidence.js


// GIVE IT AN ARRAY OF VISION LABEL OBJECTS
// IT RESOLVES WITH THOSE THAT ARE ABOVE THE MINIMUM CONFIDENCE LEVEL
module.exports = function (vision_labels) {
  return new Promise((resolve, reject) => {
    if (!vision_labels) reject(new Error('no array of label results was provided'))
    let minScore = 0.8
    let labelsArray = []
    vision_labels.forEach(item => {
      if (item.score > minScore) labelsArray.push(item)
    })
    resolve(labelsArray)
  })
}
