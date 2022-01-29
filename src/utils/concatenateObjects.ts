export const fusion = (objectA: object, obejctB: object) => {
    const newObject: { [k: string]: any } = {};
    if (objectA && obejctB) {
        for (const [keyA, valueA] of Object.entries(objectA)) {
            for (const [keyB, valueB] of Object.entries(obejctB)) {
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
    } 
    return Object.assign({}, obejctB, objectA)
    
}