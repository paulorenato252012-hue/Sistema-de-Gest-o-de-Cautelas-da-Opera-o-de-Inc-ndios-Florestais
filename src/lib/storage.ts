import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Comprime a imagem no navegador para resolução e tamanho ideais (~40-70KB)
 * preservando a nitidez da avaria e garantindo funcionamento 100% offline
 * e instantâneo sem travamentos.
 */
export async function compressImage(file: File, maxDimension = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido ou não suportado'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Fundo branco para garantir que PNGs transparentes não fiquem com fundo preto ao salvar como JPG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Processa e faz o upload da imagem da avaria.
 * Se houver conexão com o Firebase Storage configurado, envia.
 * Caso contrário ou se estiver offline / sem bucket, utiliza o DataURL compactado
 * garantindo gravação imediata no Firestore sem travar o militar.
 */
export async function uploadAvariaImage(file: File, itemId: string): Promise<string> {
  const compressedDataUrl = await compressImage(file);

  // Tenta enviar para o Firebase Storage com timeout de 3 segundos para não prender a interface
  try {
    const storagePromise = (async () => {
      const response = await fetch(compressedDataUrl);
      const blob = await response.blob();
      const fileName = `avarias/${itemId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout Firebase Storage')), 3000)
    );

    const cloudUrl = await Promise.race([storagePromise, timeoutPromise]);
    return cloudUrl;
  } catch (error) {
    // Fallback silencioso e imediato: retorna a imagem compactada em DataURL
    // Isso garante funcionamento 100% offline e sem travamentos no Pantanal/campo
    console.info('Armazenando imagem compactada diretamente na cautela.', error);
    return compressedDataUrl;
  }
}

