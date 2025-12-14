export async function uploadToCloudinary(file: File): Promise<string> {
  const url = "https://api.cloudinary.com/v1_1/SEU_CLOUD_NAME/image/upload";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "SEU_UPLOAD_PRESET");
  const res = await fetch(url, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
}
