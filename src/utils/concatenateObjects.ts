export const fusion = (objectA: object, objectB: object) => {
  const newObject: { [k: string]: any } = {};
  if (
    objectA &&
    Object.keys(objectA).length !== 0 &&
    objectB &&
    Object.keys(objectB).length !== 0
  ) {
    for (const [keyA, valueA] of Object.entries(objectA)) {
      for (const [keyB, valueB] of Object.entries(objectB)) {
        if (keyA === keyB) {
          if (typeof valueA === "object" && typeof valueB === "object") {
            newObject[keyA] = fusion(valueA, valueB);
          } else {
            newObject[keyA] = valueA;
          }
        } else {
          newObject[keyA] = valueA;
          newObject[keyB] = valueB;
        }
      }
    }
    return newObject;
  } else {
    return Object.assign({}, objectB, objectA);
  }
};
