const DESCRIPTOR_LENGTH = 128;
const DEFAULT_THRESHOLD = 0.5;

const euclideanDistance = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

const findBestMatch = (descriptor, users, threshold = DEFAULT_THRESHOLD) => {
  if (!Array.isArray(descriptor) || descriptor.length !== DESCRIPTOR_LENGTH) {
    return null;
  }

  let bestUser = null;
  let bestDistance = Infinity;

  for (const user of users) {
    if (!Array.isArray(user.faceDescriptor) || user.faceDescriptor.length !== DESCRIPTOR_LENGTH) {
      continue;
    }
    const distance = euclideanDistance(descriptor, user.faceDescriptor);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestUser = user;
    }
  }

  if (!bestUser || bestDistance > threshold) {
    return null;
  }

  return { user: bestUser, distance: bestDistance };
};

export { DESCRIPTOR_LENGTH, euclideanDistance, findBestMatch };
