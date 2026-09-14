const fs = require('fs');
let file = fs.readFileSync('src/components/CautionForm.tsx', 'utf8');

const target = `  const handleItemChange = (index: number, field: keyof CautionItem, value: any) => {`;
const replacement = `  const [uploadingImage, setUploadingImage] = useState<number | null>(null);

  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingImage(index);
    try {
      const url = await uploadAvariaImage(file, 'avaria_' + Date.now());
      const newItems = [...items];
      const existingPhotos = newItems[index].photosWithdrawal || [];
      newItems[index] = { ...newItems[index], photosWithdrawal: [...existingPhotos, url] };
      setItems(newItems);
    } catch (err) {
      console.error("Erro ao fazer upload da imagem", err);
      alert("Erro ao enviar a foto. Tente novamente.");
    } finally {
      setUploadingImage(null);
    }
  };

  const handleItemChange = (index: number, field: keyof CautionItem, value: any) => {`;

file = file.replace(target, replacement);
fs.writeFileSync('src/components/CautionForm.tsx', file, 'utf8');
