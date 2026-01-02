import getSession from "@/lib/getSession";
import { redirect } from "next/navigation";
import { getUserData } from "./_data-access/get-info-user";
import { ProfileContent } from "./_components/profiles";

export default async function Profile() {
  //valida se a sessão esta logada
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const user = await getUserData({ userId: session.user?.id });

  console.log("getuer", user);
  return (
    <div>
      <ProfileContent />
    </div>
  );
}
