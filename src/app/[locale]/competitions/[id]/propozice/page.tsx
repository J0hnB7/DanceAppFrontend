import { redirect } from "next/navigation";

export default function PropozicePage({ params }: { params: { id: string } }) {
  redirect(`/competitions/${params.id}`);
}
