module.exports = function(photo) {
  let slim = {}
  const props = [
    '_id',
    'coords',
    'created',
    'created',
    'createdAt',
    'geo_from',
    'imageTag',
    'imageURL',
    'ip',
    'labels',
    'parsedCoords',
    'phone',
    'prettyGeo',
    'scores',
    'thumbnailTag',
    'thumbnailURL',
  ]

  props.forEach(prop => slim[prop] = photo[prop])

  return slim

}
