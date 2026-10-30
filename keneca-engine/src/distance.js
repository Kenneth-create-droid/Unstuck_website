function calculateDistance(postLat, postLng, userLat, userLng) {
  const earthRadius = 6371000; // Radius in meters

  // Convert degrees to radians
  const postLatRad = postLat * (Math.PI / 180);
  const userLatRad = userLat * (Math.PI / 180);

  const deltaLat = (userLat - postLat) * (Math.PI / 180);
  const deltaLng = (userLng - postLng) * (Math.PI / 180);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(postLatRad) *
      Math.cos(userLatRad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function addDistanceToUsers(users, post) {
  const distanceWithUsers = [];

  // Standardize post coordinates to numbers
  const postLat = parseFloat(post.latitude ?? post.lat);
  const postLng = parseFloat(post.longitude ?? post.lng);

  for (const userInfo of users) {
    // Standardize user coordinates to numbers (Redis returns strings)
    const userLat = parseFloat(userInfo.latitude ?? userInfo.lat);
    const userLng = parseFloat(userInfo.longitude ?? userInfo.lng);

    const distance = calculateDistance(postLat, postLng, userLat, userLng);

    distanceWithUsers.push({
      ...userInfo,
      distance: distance
    });
  }

  return distanceWithUsers;
}

export { calculateDistance, addDistanceToUsers };