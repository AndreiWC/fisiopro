"use client";
import Image from "next/image";
import { ChangeEvent, useState } from "react";
import semFoto from "../../../../../../public/profissional em branco.png";
import { Loader, Upload } from "lucide-react";
import { toast } from "sonner";
import { updateProfileAvatar } from "../_actions/update-avatar";
import { useSession } from "next-auth/react";
interface AvatarProfileProps {
  avatarUrl: string | null;
  userId: string;
}

export function AvatarProfile({ avatarUrl, userId }: AvatarProfileProps) {
  const [previewImage, setPreviewImage] = useState(avatarUrl);
  const [loading, setLoading] = useState(false);
  const { update } = useSession();
  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    // (X) Criar o componente
    // (X) Receber a imagem de troca.
    // Enviar a imagem para o servidor (storage)
    // Receber a url da imagem do servidor
    // Salva a nova url da imagem no banco de dados

    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      const image = e.target.files[0];

      if (image.type !== "image/jpeg" && image.type !== "image/png") {
        toast.error("Formato de imagem inválido");
        return;
      }

      const newFilename = `${userId}`;
      const newFile = new File([image], newFilename, { type: image.type });

      const urlImage = await uploadImage(newFile);

      if (!urlImage || urlImage === "") {
        toast.error("Erro ao salvar imagem.");
        return;
      }

      setPreviewImage(urlImage);
      await updateProfileAvatar({ avatarUrl: urlImage });
      await update({
        image: urlImage,
      });
      setLoading(false);
    }
  }

  async function uploadImage(image: File): Promise<string | null> {
    try {
      toast("Estamos enviando sua imagem...");

      const formData = new FormData();

      formData.append("file", image);
      formData.append("userId", userId);

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
    <div className="relative w-40 h-40 ">
      <div className="relative flex items-center justify-center w-full h-full ">
        <span className="absolute cursor-pointer z-[2] bg-card/90 text-foreground p-2 rounded-full shadow-xl">
          {loading ? (
            <Loader size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
        </span>

        <input
          type="file"
          className="opacity-0 cursor-pointer relative z-50 w-48 h-48"
          accept="image/*"
          onChange={handleChange}
        />
      </div>

      {previewImage ? (
        <Image
          src={previewImage}
          alt="Foto de perfil da clinica"
          fill
          className="w-full h-48 object-cover rounded-full bg-muted"
          quality={100}
          priority
          sizes="(max-width: 480px) 100vw, (max-width: 1024px) 75vw, 60vw"
        />
      ) : (
        <Image
          src={semFoto}
          alt="Foto de perfil da clinica"
          fill
          className="w-full h-48 object-cover rounded-full bg-muted"
          quality={100}
          priority
          sizes="(max-width: 480px) 100vw, (max-width: 1024px) 75vw, 60vw"
        />
      )}
    </div>
  );
}
