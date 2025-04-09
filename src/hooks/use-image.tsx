import { useState, useEffect } from 'react';

interface ImageData {
  image: HTMLImageElement | null;
  width: number;
  height: number;
}

const useImage = (url: string): ImageData => {
  const [imageData, setImageData] = useState<ImageData>({
    image: null,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setImageData({
        image: img,
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = () => console.error('Error loading image:', url);
  }, [url]);

  return imageData;
};

export default useImage;
