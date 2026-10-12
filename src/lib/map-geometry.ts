import type { GeoFeature } from "@/services/queries";

/** One projection for drawing and hit testing; no geographic values are inferred. */
export function projectMunicipalities(features: readonly GeoFeature[]) {
  const rings = (f: GeoFeature) => f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.coordinates.flat();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const feature of features) for (const ring of rings(feature)) for (const [x = 0, y = 0] of ring) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const correction = Math.cos((minY + maxY) * Math.PI / 360);
  const scale = 1000 / Math.max((maxX - minX) * correction, maxY - minY);
  return {
    width: (maxX - minX) * correction * scale, height: (maxY - minY) * scale,
    paths: features.map((feature) => ({
      code: feature.properties.codarea,
      path: rings(feature).map((ring) => ring.map(([x = 0, y = 0], index) =>
        `${index ? "L" : "M"}${((x - minX) * correction * scale).toFixed(2)},${((maxY - y) * scale).toFixed(2)}`,
      ).join("") + "Z").join(""),
    })),
  };
}