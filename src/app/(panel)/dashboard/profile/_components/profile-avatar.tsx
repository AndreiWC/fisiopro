"use client";
import Image from "next/image";
import { ChangeEvent, useState } from "react";
import semFoto from "../../../../../../public/profissional em branco.png";
import { Loader, Upload } from "lucide-react";
import { toast } from "sonner";
import { updateProfileAvatar } from "../_actions/update-avatar";

interface AvatarProfileProps {
  avatarUrl: string | null;
  organizationId: string;
  sizeClassName?: string;
}

export function AvatarProfile({
  avatarUrl,
  organizationId,
  sizeClassName = "w-40 h-40",
}: AvatarProfileProps) {
  const [previewImage, setPreviewImage] = useState(avatarUrl);
  const [loading, setLoading] = useState(false);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      const image = e.target.files[0];

      if (image.type !== "image/jpeg" && image.type !== "image/png") {
        toast.error("Formato de imagem inválido");
        return;
      }

      const newFilename = `${organizationId}`;
      const newFile = new File([image], newFilename, { type: image.type });

      const urlImage = await uploadImage(newFile);

      if (!urlImage || urlImage === "") {
        toast.error("Erro ao salvar imagem.");
        return;
      }

      setPreviewImage(urlImage);
      await updateProfileAvatar({ avatarUrl: urlImage });
      setLoading(false);
    }
  }

  async function uploadImage(image: File): Promise<string | null> {
    try {
      toast("Estamos enviando sua imagem...");

      const formData = new FormData();

      formData.append("file", image);
      formData.append("userId", organizationId);

      const response = await fetch(`/api/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        toast.error("Erro no servidor ao salvar imagem.");
        return null;
      }

      const data = await response.json();

      toast("Imagem alterada com sucesso!");
      return data.secure_url as string;
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-full bg-muted ${sizeClassName}`}>
      <div className="absolute inset-0 z-2 flex items-center justify-center">
        <span className="pointer-events-none absolute cursor-pointer bg-card/90 text-foreground p-2 rounded-full shadow-xl">
          {loading ? (
            <Loader size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
        </span>

        <input
          type="file"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          accept="image/*"
          onChange={handleChange}
        />
      </div>

      {previewImage ? (
        <Image
          src={previewImage}
          alt="Foto de perfil da clinica"
          fill
          className="object-cover"
          quality={100}
          priority
          sizes="(max-width: 480px) 100vw, (max-width: 1024px) 75vw, 60vw"
        />
      ) : (
        <Image
          src={semFoto}
          alt="Foto de perfil da clinica"
          fill
          className="object-cover"
          quality={100}
          priority
          sizes="(max-width: 480px) 100vw, (max-width: 1024px) 75vw, 60vw"
        />
      )}
    </div>
  );
}
