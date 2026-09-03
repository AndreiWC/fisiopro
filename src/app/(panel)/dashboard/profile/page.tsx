import getSession from "@/lib/getSession";
import { redirect } from "next/navigation";
import { getUserData } from "./_data-access/get-info-user";
import { getProfileOverview } from "./_data-access/get-profile-overview";
import { ProfileContent } from "./_components/profile";

export default async function Profile() {
  //valida se a sessão esta logada
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const user = await getUserData({ userId: session.user?.id });

  if (!user) {
    redirect("/");
  }

  const overview = await getProfileOverview(user.id);

  return (
    <div>
      <ProfileContent user={user} overview={overview} />
    </div>
  );
}
