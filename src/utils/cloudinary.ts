// ATENÇÃO: Substitua pelos valores reais do seu Cloudinary
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "SEU_CLOUD_NAME";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "SEU_UPLOAD_PRESET";

export async function uploadToCloudinary(file: File): Promise<string> {
  if (CLOUDINARY_CLOUD_NAME === "SEU_CLOUD_NAME" || CLOUDINARY_UPLOAD_PRESET === "SEU_UPLOAD_PRESET") {
    throw new Error("Configure as variáveis de ambiente do Cloudinary corretamente.");
  }
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(url, { method: "POST", body: formData });
  const data = await res.json();
  if (!data.secure_url) throw new Error("Erro ao fazer upload no Cloudinary: " + (data.error?.message || JSON.stringify(data)));
  return data.secure_url;
}

// Instruções:
// 1. Crie um arquivo .env na raiz do projeto (ou use .env.local)
// 2. Adicione:
// VITE_CLOUDINARY_CLOUD_NAME=seu_cloud_name
// VITE_CLOUDINARY_UPLOAD_PRESET=seu_upload_preset
// 3. Reinicie o servidor Vite após salvar o .env
