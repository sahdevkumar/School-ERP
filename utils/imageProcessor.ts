

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation)

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

/**
 * Compresses an image file directly without cropping.
 * Resizes large images and applies JPEG compression iteratively to reach < 150KB.
 */
export async function compressImageFile(file: File): Promise<File> {
  // If it's not an image (e.g. PDF), return original
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const imageSrc = URL.createObjectURL(file);
  const image = await createImage(imageSrc);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    URL.revokeObjectURL(imageSrc);
    return file;
  }

  // Max dimension rule - drastically reduced for documents to ensure low size
  const MAX_WIDTH = 1000;
  const MAX_HEIGHT = 1000;
  let width = image.width;
  let height = image.height;

  if (width > height) {
    if (width > MAX_WIDTH) {
      height *= MAX_WIDTH / width;
      width = MAX_WIDTH;
    }
  } else {
    if (height > MAX_HEIGHT) {
      width *= MAX_HEIGHT / height;
      height = MAX_HEIGHT;
    }
  }

  canvas.width = width;
  canvas.height = height;

  // Draw white background (for transparent PNGs converted to JPEG)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  
  URL.revokeObjectURL(imageSrc); // Cleanup

  // Target size: 150KB
  const TARGET_SIZE = 150 * 1024;
  let quality = 0.7;
  let blob: Blob | null = null;

  // Iterative compression loop
  while (quality >= 0.1) {
    blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    
    // If we reached target size or quality is too low, stop
    if (blob && blob.size <= TARGET_SIZE) {
      break;
    }
    
    // Reduce quality for next iteration
    // If we are way over (2x), reduce faster
    if (blob && blob.size > TARGET_SIZE * 2) {
       quality -= 0.2;
    } else {
       quality -= 0.1;
    }
    
    // Safety clamp
    if (quality < 0.1) quality = 0.1;
  }

  if (!blob) return file;

  return new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

/**
 * This function was adapted from the one in the Readme of https://github.com/DominicTobias/react-image-crop
 */
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  const rotRad = getRadianAngle(rotation)

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  )

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
  ctx.translate(-image.width / 2, -image.height / 2)

  // draw rotated image
  ctx.drawImage(image, 0, 0)

  // croppedAreaPixels values are bounding box relative
  // extract the cropped image using these values
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  )

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // paste generated rotate image with correct offsets for x,y crop values.
  ctx.putImageData(data, 0, 0)

  // COMPRESSION & RESIZING
  // Max Dimensions: 500x500 (Good for profiles, low data)
  const maxDimension = 500;
  
  let finalCanvas = canvas;

  // Create a new canvas for resizing if needed
  if (canvas.width > maxDimension || canvas.height > maxDimension || true) {
      // Logic: Always enter here to ensure consistent output format
      const scale = Math.min(maxDimension / canvas.width, maxDimension / canvas.height, 1);
      const outputWidth = canvas.width * scale;
      const outputHeight = canvas.height * scale;

      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = outputWidth;
      outputCanvas.height = outputHeight;
      const outputCtx = outputCanvas.getContext('2d');

      if (outputCtx) {
          // 1. Fill Background White (Important for JPEG transparency issues)
          outputCtx.fillStyle = '#ffffff';
          outputCtx.fillRect(0, 0, outputWidth, outputHeight);
          
          // 2. Draw Image (Resized) over the background
          outputCtx.drawImage(canvas, 0, 0, outputWidth, outputHeight);
          finalCanvas = outputCanvas;
      }
  }

  // As Blob - JPEG 0.8 Quality (High Compression)
  return new Promise((resolve, reject) => {
    finalCanvas.toBlob((file) => {
      if (file) resolve(file)
      else reject(new Error('Canvas is empty'))
    }, 'image/jpeg', 0.8)
  })
}
