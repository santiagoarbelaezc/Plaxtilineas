/**
 * Utility to optimize Cloudinary image URLs.
 * Inserts quality, format, and width parameter transformations.
 */

/**
 * Optimizes a Cloudinary image URL by inserting transformation parameters.
 * If the URL is not a valid Cloudinary URL, returns the original URL.
 * 
 * @param url The original Cloudinary image URL
 * @param params Cloudinary transformation parameters (e.g., 'w_300,q_auto,f_auto')
 */
export function optimizeCloudinaryUrl(url: string, params: string): string {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // Cloudinary image upload URL pattern:
  // https://res.cloudinary.com/<cloud_name>/image/upload/<transformations>/v<version>/<public_id>
  const cloudinaryRegex = /(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/)?(.*)/;

  if (cloudinaryRegex.test(url)) {
    // If the URL already contains transformation parameters (not starting directly with version vXXXX)
    // and doesn't match a simple v<number> prefix, we have to handle it carefully.
    // However, in our system they are usually clean upload URLs or simple versioned URLs:
    // e.g. https://res.cloudinary.com/dsv1gdgya/image/upload/v1717524956/productos/imagen.jpg
    return url.replace(cloudinaryRegex, (match, prefix, version, rest) => {
      // If version is present, insert params before version.
      // Otherwise insert before rest.
      const v = version ? version : '';
      return `${prefix}${params}/${v}${rest}`;
    });
  }

  return url;
}

/**
 * Optimizes an image for a small thumbnail (e.g. 300px width, auto low quality, auto format).
 */
export function optimizeForThumbnail(url: string, width = 300): string {
  return optimizeCloudinaryUrl(url, `w_${width},q_auto:low,f_auto`);
}

/**
 * Optimizes an image for a card display (e.g. 500px width, auto quality, auto format).
 */
export function optimizeForCard(url: string, width = 500): string {
  return optimizeCloudinaryUrl(url, `w_${width},q_auto,f_auto`);
}

/**
 * Optimizes an image for a detailed page view (e.g. 800px width, auto good quality, auto format).
 */
export function optimizeForDetail(url: string, width = 800): string {
  return optimizeCloudinaryUrl(url, `w_${width},q_auto:good,f_auto`);
}
